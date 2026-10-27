"""Builds the mock LP look-through data set for the exposure module.

One LP has commitments to ten funds across eight managers. Each company is simulated round by
round (price per share, shares issued, fully diluted share count), and the managers join rounds
that fit their stage, often the same rounds, so the LP ends up holding many companies through
more than one manager. Each manager then marks its shares by its own policy, so the same
security can carry different marks in different funds. All names are fictional; the seed is fixed.
"""
import csv, random, datetime as dt

random.seed(7)
AS_OF = dt.date(2026, 6, 30)
STAGES = ["Seed", "Series A", "Series B", "Series C", "Series D"]
PRE = {"Seed": (7, 16), "Series A": (25, 70), "Series B": (90, 260), "Series C": (280, 900), "Series D": (800, 3000)}
RAISE_PCT = {"Seed": (0.15, 0.25), "Series A": (0.18, 0.25), "Series B": (0.14, 0.22), "Series C": (0.10, 0.18), "Series D": (0.08, 0.14)}
GAP = (12, 30)  # months between rounds

# manager: (stages it joins, marking policy, [(fund, vintage, size $M, LP commitment $M)])
# Policies: "round" marks at the last round price; "haircut" marks down struggling companies;
# "conservative" also takes a standing discount; "stale" is "round" but reports a quarter late.
MANAGERS = {
    "Northgate Capital": (["Seed", "Series A"], "round", [("Northgate Seed III", 2017, 120, 10), ("Northgate Seed IV", 2020, 180, 12)]),
    "Juniper Hill": (["Seed"], "stale", [("Juniper Hill I", 2019, 75, 5)]),
    "Harbor Light Ventures": (["Seed", "Series A"], "haircut", [("Harbor Light II", 2018, 250, 15)]),
    "Ridgeline Partners": (["Series A", "Series B"], "haircut", [("Ridgeline V", 2016, 400, 20), ("Ridgeline VI", 2019, 550, 25)]),
    "Cobalt Street": (["Series A", "Series B"], "round", [("Cobalt Street IV", 2018, 600, 30)]),
    "Tessera Ventures": (["Series A", "Series B", "Series C"], "round", [("Tessera II", 2021, 350, 20)]),
    "Meridian Growth": (["Series B", "Series C", "Series D"], "conservative", [("Meridian Growth II", 2019, 1200, 40)]),
    "Summit Arc Capital": (["Series C", "Series D"], "haircut", [("Summit Arc III", 2020, 2000, 50)]),
}
LEAD_SHARE = {"Seed": (0.4, 0.7), "Series A": (0.4, 0.6), "Series B": (0.3, 0.5), "Series C": (0.25, 0.45), "Series D": (0.2, 0.4)}
FOLLOW_SHARE = (0.05, 0.18)

SECTORS = {
    "Enterprise Software": ["Relay", "Tandem", "Ledgerline", "Quorum", "Brightdesk", "Clearpath", "Keystone", "Waypoint", "Mosaic", "Beacon"],
    "Fintech": ["Tally", "Coinwise", "Ferry", "Plinth", "Kiteline", "Sable", "Cadence", "Harbor"],
    "Healthcare": ["Vela", "Tidewell", "Halcyon", "Meadow", "Kinetic", "Orchid"],
    "Consumer": ["Pebble", "Marigold", "Wren", "Cobble", "Parcel", "Saffron"],
    "Climate": ["Gridwise", "Solace", "Carbonline", "Tern", "Windward", "Terra"],
    "Developer Tools": ["Forge", "Stackwise", "Pylon", "Lattice", "Nimbus", "Kernel", "Glyph"],
    "AI Infrastructure": ["Vector", "Tensorline", "Axon", "Cortex", "Loom"],
}
SUFFIX = {"Enterprise Software": ["", " Software", " HQ"], "Fintech": [" Pay", " Money", " Finance"], "Healthcare": [" Health", " Care", " Bio"],
          "Consumer": ["", " & Co", " Home"], "Climate": [" Energy", " Power", " Systems"], "Developer Tools": [" Labs", " Dev", " Data"],
          "AI Infrastructure": [" AI", " Compute", " Labs"]}


def add_months(d, m):
    y, mo = divmod(d.month - 1 + m, 12)
    return dt.date(d.year + y, mo + 1, min(d.day, 28))


def quarter_end(d):
    m = ((d.month - 1) // 3 + 1) * 3
    return dt.date(d.year, m, 31 if m in (3, 12) else 30)


def fund_for(manager, when):
    """The manager's fund that was investing new money at this date (vintage to vintage + 4)."""
    funds = [f for f in MANAGERS[manager][2] if f[1] <= when.year <= f[1] + 4]
    return funds[-1] if funds else None


def simulate(name, sector):
    heat = random.random()  # hot companies raise more, faster, and draw more of the LP's managers
    start = dt.date(random.randint(2016, 2022), random.choice([3, 6, 9, 12]), 15)
    fd = 10_000_000.0
    price = None
    rounds, holders = [], {}  # holders: fund -> manager
    d = start
    for i, stage in enumerate(STAGES):
        if d > AS_OF - dt.timedelta(days=60):
            break
        if i and random.random() > 0.55 + 0.4 * heat:
            break  # did not raise again
        lo, hi = PRE[stage]
        pre = random.uniform(lo, hi) * 1e6 * (0.7 + 0.6 * heat)
        down = price and random.random() < 0.12 * (1.2 - heat)
        if price and down:
            pre = min(pre, price * fd * random.uniform(0.55, 0.85))
        elif price:
            pre = max(pre * 0.6, price * fd * random.uniform(1.15, 1.6))
        p = pre / fd
        raise_amt = pre * random.uniform(*RAISE_PCT[stage]) / (1 - random.uniform(*RAISE_PCT[stage]))
        new = raise_amt / p
        # New investors for this round: managers whose stage fits and whose fund is investing.
        takers, left = [], raise_amt
        cands = [m for m, (st, _, _) in MANAGERS.items() if stage in st]
        random.shuffle(cands)
        for m in cands:
            f = fund_for(m, d)
            if not f or f[0] in holders:
                continue
            if random.random() < 0.05 + 0.30 * heat ** 2:
                share = random.uniform(*(LEAD_SHARE[stage] if not takers else FOLLOW_SHARE))
                takers.append((m, f[0], min(left, raise_amt * share)))
                left -= takers[-1][2]
                if left < raise_amt * 0.1:
                    break
        # Existing holders take part of their pro rata.
        for f, m in holders.items():
            if random.random() < 0.55:
                takers.append((m, f, raise_amt * random.uniform(0.03, 0.10)))
        for m, f, amt in takers:
            holders.setdefault(f, m)
        rounds.append(dict(stage=stage, date=d, price=p, raise_amt=raise_amt, takers=takers))
        fd += new
        fd *= 1 + random.uniform(0.02, 0.05)  # option pool top-up after the round
        price = p
        d = add_months(d, random.randint(*GAP))
    if not any(r["takers"] for r in rounds):
        return None
    # Company health today relative to its last round price.
    last = rounds[-1]
    age = (AS_OF - last["date"]).days / 365
    r = random.random()
    health = 0.0 if r < 0.08 else random.uniform(0.3, 0.7) if r < 0.25 or age > 3 else random.uniform(0.85, 1.0) if r < 0.8 else random.uniform(1.0, 1.4)
    return dict(name=name, sector=sector, rounds=rounds, fd=round(fd), price=last["price"], health=health)


def mark(manager, co):
    policy = MANAGERS[manager][1]
    p, h = co["price"], co["health"]
    if h == 0:
        return 0.0, AS_OF
    as_of = AS_OF
    if policy == "stale":
        as_of = quarter_end(AS_OF - dt.timedelta(days=95))
    if policy in ("round", "stale"):
        v = p if h >= 0.5 else p * h
    elif policy == "haircut":
        v = p * min(h, 1.0) if h < 0.95 else p * (1.0 if h < 1.1 else 1.1)
    else:  # conservative
        v = p * min(h, 1.0) * 0.85
    return v * random.uniform(0.97, 1.03), as_of


used, companies = set(), []
while len(companies) < 60:
    sector = random.choice(list(SECTORS))
    name = random.choice(SECTORS[sector]) + random.choice(SUFFIX[sector])
    if name in used:
        continue
    used.add(name)
    co = simulate(name, sector)
    if co:
        companies.append(co)

commit_rows = []
for m, (_, _, funds) in MANAGERS.items():
    for f, vint, size, commit in funds:
        commit_rows.append(dict(manager=m, fund=f, vintage=vint, fund_size=size * 1_000_000, commitment=commit * 1_000_000, carry=0.25 if "Meridian" in m or "Northgate" in m else 0.20, currency="USD"))

hold_rows = []
for co in sorted(companies, key=lambda c: c["name"]):
    marks = {}
    for rd in co["rounds"]:
        for m, f, amt in rd["takers"]:
            marks.setdefault(f, mark(m, co))
            per_share, as_of = marks[f]
            shares = round(amt / rd["price"])
            hold_rows.append(dict(
                manager=m, fund=f, company=co["name"], sector=co["sector"], security=f"{rd['stage']} Preferred", round=rd["stage"],
                investment_date=rd["date"].isoformat(), shares=shares, cost=round(shares * rd["price"]), price_paid=round(rd["price"], 4),
                fair_value=round(shares * per_share), mark_per_share=round(per_share, 4), as_of=as_of.isoformat(), company_fd_shares=co["fd"],
                ownership=round(shares / co["fd"], 5)))

# A handful of companies are known only as an ownership figure (no share counts), as some managers report.
for r in hold_rows:
    if r["manager"] == "Summit Arc Capital":
        r["shares"] = r["company_fd_shares"] = r["mark_per_share"] = r["price_paid"] = ""

with open("lp_commitments.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=list(commit_rows[0]))
    w.writeheader(); w.writerows(commit_rows)
with open("lp_holdings.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=list(hold_rows[0]))
    w.writeheader(); w.writerows(hold_rows)

multi = sum(1 for c in companies if len({t[0] for r in c["rounds"] for t in r["takers"]}) > 1)
print(f"{len(companies)} companies, {len(hold_rows)} positions, {multi} held by 2+ managers")
