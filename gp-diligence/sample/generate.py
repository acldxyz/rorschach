"""Builds the mock venture data set for the LP analytics app.

Each company is simulated round by round (valuation step-ups, dilution, the fund's follow-on
cheques, failures and exits), so valuations, ownership, milestones and the fund cash flows all
agree with one another. All names are fictional. The seed is searched once so the three funds
land in plausible ranges for their vintages; the search is deterministic.
"""
import csv, math, random, datetime as dt

REPORT = dt.date(2025, 12, 31)
GP = "Lanternfish Ventures"
FUNDS = [("Lanternfish Ventures I", 2014, 150, 20), ("Lanternfish Ventures II", 2017, 225, 24),
         ("Lanternfish Ventures III", 2021, 300, 22)]
STAGES = ["Seed", "Series A", "Series B", "Series C", "Series D", "Series E"]
ENTRY_POST = {"Seed": (8, 20), "Series A": (30, 70), "Series B": (100, 250)}
ENTRY_OWN = {"Seed": (0.08, 0.14), "Series A": (0.12, 0.20), "Series B": (0.05, 0.09)}
FAIL = [0.30, 0.22, 0.15, 0.10, 0.08, 0.06]

SECTORS = {
    "Enterprise Software": (["Relay", "Tandem", "Ledgerline", "Quorum", "Brightdesk", "Clearpath", "Keystone", "Waypoint", "Northstar", "Mosaic", "Beacon"], ["", " Software", " HQ", " Cloud"],
        ["workflow software for {who}", "a system of record for {who}", "procurement automation for {who}"], ["mid-size manufacturers", "hospital finance teams", "law firms", "logistics operators", "insurance carriers"]),
    "Fintech": (["Tally", "Coinwise", "Ferry", "Plinth", "Vault", "Kiteline", "Sable", "Cadence", "Harbor"], [" Pay", " Money", " Finance", ""],
        ["payments infrastructure for {who}", "a spend-management card for {who}", "embedded lending for {who}"], ["independent restaurants", "freelancers", "construction subcontractors", "online marketplaces"]),
    "Healthcare": (["Juniper", "Vela", "Tidewell", "Halcyon", "Meadow", "Kinetic", "Lumen", "Orchid"], [" Health", " Care", " Bio", " Clinics"],
        ["virtual care for {who}", "remote monitoring for {who}", "a care-navigation platform for {who}"], ["chronic kidney patients", "new mothers", "rural clinics", "employers' health plans"]),
    "Consumer": (["Pebble", "Marigold", "Wren", "Cobble", "Fable", "Parcel", "Saffron", "Tinker"], ["", " & Co", " Home", " Kids"],
        ["a subscription brand for {who}", "a resale marketplace for {who}", "a mobile app for {who}"], ["new parents", "home cooks", "outdoor hobbyists", "college students"]),
    "Climate": (["Verdant", "Gridwise", "Solace", "Carbonline", "Tern", "Aurora", "Windward", "Terra"], [" Energy", " Power", " Systems", " Materials"],
        ["battery management software for {who}", "low-carbon cement for {who}", "heat-pump installation for {who}"], ["utility-scale storage", "commercial builders", "homeowners", "municipal fleets"]),
    "Developer Tools": (["Forge", "Stackwise", "Pylon", "Lattice", "Nimbus", "Cobalt", "Kernel", "Glyph"], [" Labs", " AI", " Dev", " Data"],
        ["observability tooling for {who}", "a data pipeline service for {who}", "model-evaluation tooling for {who}"], ["platform engineering teams", "machine-learning teams", "mobile developers", "data engineers"]),
}
PRODUCT_MILESTONES = {
    "Enterprise Software": ["Signed first Fortune 500 customer", "Crossed $10M ARR", "Launched second product line", "Opened London office"],
    "Fintech": ["Obtained money-transmitter licences in all US states", "Processed $1B in annual volume", "Launched credit product", "Partnered with a top-10 bank"],
    "Healthcare": ["Won first health-plan contract", "Cleared FDA 510(k)", "Expanded to 20 states", "Reached 100,000 patients"],
    "Consumer": ["Reached 1M app downloads", "Launched in 400 retail doors", "Turned contribution-margin positive", "Expanded to Canada and the UK"],
    "Climate": ["Commissioned first commercial plant", "Signed offtake agreement with a utility", "Won a federal DOE grant", "Installed 10,000th system"],
    "Developer Tools": ["Open-source project passed 20,000 GitHub stars", "Launched paid cloud tier", "Crossed $5M ARR", "Signed first enterprise contract"],
}
TEAM = [
    dict(name="Rachel Moreno", title="Founding General Partner", joined=2013, focus="Enterprise Software; Developer Tools",
         prior="Founder and CEO of a data-infrastructure startup acquired in 2012; product lead at a large software company", education="BS Computer Science, Carnegie Mellon",
         boards="Chairs the investment committee"),
    dict(name="Daniel Asante", title="Founding General Partner", joined=2013, focus="Fintech; Consumer",
         prior="Partner at a multi-stage venture firm (2006-2013); investment banker covering payments", education="BA Economics, Duke; MBA, Harvard", boards=""),
    dict(name="Mei Tanaka", title="General Partner", joined=2016, focus="Healthcare",
         prior="Physician and co-founder of a digital-health company; clinical fellow at a teaching hospital", education="MD, Johns Hopkins; BS Biology, UC Berkeley", boards=""),
    dict(name="Oliver Grant", title="Partner", joined=2019, focus="Climate",
         prior="Head of strategy at a utility-scale solar developer (2012-2019)", education="MS Energy Systems, Stanford", boards=""),
    dict(name="Sofia Reyes", title="Principal", joined=2020, focus="Developer Tools; Enterprise Software", prior="", education="BS Electrical Engineering, MIT", boards=""),
]
STAFF = [("Ben Whitfield", "Principal"), ("Anika Shah", "Senior Associate"), ("Luke Porter", "Associate"), ("Zara Idris", "Associate"),
         ("Noah Kim", "Analyst"), ("Paula Jensen", "Chief Financial Officer"), ("Isaac Muller", "Fund Controller"),
         ("Hana Novak", "Head of Platform"), ("Grace Obi", "Head of Talent"), ("Victor Lang", "Operations Manager")]
TEAM += [dict(name=n, title=t, joined="", focus="", prior="", education="", boards="") for n, t in STAFF]
LEAD = {"Enterprise Software": "Rachel Moreno", "Developer Tools": "Rachel Moreno", "Fintech": "Daniel Asante", "Consumer": "Daniel Asante",
        "Healthcare": "Mei Tanaka", "Climate": "Oliver Grant"}


def qend(d):
    m = ((d.month - 1) // 3 + 1) * 3
    return dt.date(d.year + (m == 12), m % 12 + 1, 1) - dt.timedelta(days=1)


def add_months(d, n):
    y, m = divmod(d.month - 1 + n, 12)
    return qend(dt.date(d.year + y, m + 1, 1))


def money(x):
    return f"${x / 1000:.1f}B" if x >= 1000 else f"${x:.0f}M"


def simulate(seed):
    rnd = random.Random(seed)
    used, invs, cfs = set(), [], []
    for fund, vint, size, n in FUNDS:
        start = dt.date(vint, 3, 31)
        deals = []
        for i in range(n):
            sec = rnd.choice(list(SECTORS))
            pre, suf, what, who = SECTORS[sec]
            while True:
                name = rnd.choice(pre) + rnd.choice(suf)
                if name not in used: used.add(name); break
            stage = rnd.choices(["Seed", "Series A", "Series B"], [0.5, 0.35, 0.15])[0]
            entry = add_months(start, int(i * 42 / n) + rnd.randint(0, 3))
            if fund.endswith("III") and i == n - 1: entry = dt.date(2025, 6, 30)  # too recent for milestones
            post = rnd.uniform(*ENTRY_POST[stage]); own = rnd.uniform(*ENTRY_OWN[stage])
            si = STAGES.index(stage)
            founded = entry.year - (rnd.randint(0, 1) if stage == "Seed" else rnd.randint(2, 4) if stage == "Series A" else rnd.randint(4, 7))
            checks = [(entry, own * post)]
            rounds = [dict(d=entry, name=stage, post=post, raised=post * rnd.uniform(0.18, 0.28), fund=own * post, own=own)]
            ms, d, follow_ons, exit_d, exit_type, proceeds, last_round = [], entry, 0, None, "", 0.0, (entry, stage, post)
            entry_post, entry_own = post, own
            while True:
                d = add_months(d, rnd.randint(14, 30))
                if d > REPORT: break
                if rnd.random() < FAIL[min(si, 5)]:
                    exit_d = d
                    if rnd.random() < 0.6:
                        exit_type, proceeds = "Shut down", 0.0
                        ms.append((d, "Wound down; remaining assets sold"))
                    else:
                        v = post * rnd.uniform(0.1, 0.5); exit_type, proceeds = "M&A", own * v
                        ms.append((d, f"Acqui-hired by a larger competitor for {money(v)}"))
                    break
                if si >= 2 and rnd.random() < 0.18:
                    ipo = post > 1500 and rnd.random() < 0.5
                    v = post * rnd.uniform(1.1, 2.6)
                    exit_d, exit_type, proceeds = d, "IPO" if ipo else "M&A", own * v
                    ms.append((d, f"{'IPO at a' if ipo else 'Acquired by a strategic buyer at a'} {money(v)} valuation"))
                    break
                if rnd.random() < 0.35:
                    ms.append((add_months(d, -rnd.randint(4, 9)), rnd.choice(PRODUCT_MILESTONES[sec])))
                step = rnd.uniform(0.6, 0.95) if rnd.random() < 0.12 else math.exp(rnd.gauss(0.85, 0.55))
                si = min(si + 1, 5); post *= step
                dil = rnd.uniform(0.15, 0.25)
                # Follow on pro rata into companies that stepped up, at most twice: reserves go to winners.
                fund_in = 0.0
                if step >= 1.6 and follow_ons < 2 and si <= 4:
                    fund_in = own * post * dil; checks.append((d, fund_in)); follow_ons += 1
                else:
                    own *= 1 - dil
                # Raises live in the company history file now; milestones keep product and exit events.
                rounds.append(dict(d=d, name=STAGES[si] + (" (down round)" if step < 1 else ""), post=post, raised=post * dil, fund=fund_in, own=own))
                last_round = (d, STAGES[si] + (" (down round)" if step < 1 else ""), post)
            if exit_d:
                unreal, cur_post = 0.0, None
            else:
                age = (REPORT - last_round[0]).days / 365.25
                mark = 1.0 if age < 1.5 else 0.85 if age < 3 else 0.6  # stale marks get haircut
                unreal, cur_post = own * post * mark, post
            deals.append(dict(rounds=rounds, end=exit_d or REPORT, failed=exit_type == "Shut down" or (exit_type == "M&A" and proceeds < own * post * 0.6), name=name, sec=sec, stage=stage, entry=entry, founded=founded, checks=checks, exit_d=exit_d, exit_type=exit_type,
                              proceeds=proceeds, unreal=unreal, entry_post=entry_post, latest_post=post if not exit_d else None,
                              latest_round=last_round[1] if not exit_d else "", entry_own=entry_own, own=own, ms=sorted(ms),
                              pre=f"{rnd.choice(what).format(who=rnd.choice(who)).capitalize()}. " + (
                                  "Pre-revenue, founding team of three with a working prototype." if stage == "Seed" else
                                  f"About ${rnd.randint(1, 4)}M ARR and {rnd.randint(15, 60)} paying customers." if stage == "Series A" else
                                  f"About ${rnd.randint(8, 20)}M ARR, growing {rnd.randint(80, 160)}% a year.")))
        # Size cheques to the fund: ~82% of commitment invested, the rest fees and expenses.
        k = 0.82 * size / sum(c for dl in deals for _, c in dl["checks"])
        for dl in deals:
            dl["checks"] = [(d, c * k) for d, c in dl["checks"]]
            for key in ("proceeds", "unreal", "entry_own", "own"): dl[key] *= k
            for r in dl["rounds"]: r["fund"] *= k; r["own"] *= k; r["raised"] = max(r["raised"], r["fund"] * 1.25)
        flows = {}
        def flow(d, kind, a):
            if d <= REPORT: flows[(d, kind)] = flows.get((d, kind), 0) + a
        for dl in deals:
            for d, c in dl["checks"]: flow(d, "Contribution", -c)
            if dl["exit_d"] and dl["proceeds"]: flow(dl["exit_d"], "Distribution", dl["proceeds"])
        d = start
        while d <= REPORT:
            yrs = (d - start).days / 365.25
            flow(d, "Contribution", -(size * 0.025 / 4 if yrs < 5 else size * 0.015 / 4 * max(0.3, 1 - (yrs - 5) / 8)))
            d = add_months(d, 3)
        paid = dist = 0.0
        for key in sorted(flows):
            a = flows[key]
            if key[1] == "Contribution": paid -= a
            else:
                excess = max(0, dist + a - paid) - max(0, dist - paid)
                flows[key] = a - 0.2 * excess; dist += flows[key]
        unreal = sum(dl["unreal"] for dl in deals)
        flows[(REPORT, "NAV")] = unreal - 0.2 * min(max(0, dist + unreal - paid), unreal)
        for (d, kind), a in sorted(flows.items()):
            cfs.append(dict(fund=fund, vintage=vint, fund_size=size, date=d, type=kind, amount=a))
        for dl in deals: dl["fund"], dl["vint"], dl["size"] = fund, vint, size
        invs += deals
    return invs, cfs


def gross(invs, fund):
    D = [d for d in invs if d["fund"] == fund]
    inv = sum(c for d in D for _, c in d["checks"])
    return sum(d["proceeds"] + d["unreal"] for d in D) / inv


def acceptable(invs):
    t = [gross(invs, f[0]) for f in FUNDS]
    returners = sum(1 for d in invs if d["fund"] == FUNDS[0][0] and d["proceeds"] + d["unreal"] >= FUNDS[0][2])
    return 2.8 <= t[0] <= 4.5 and 1.9 <= t[1] <= 3.0 and 0.95 <= t[2] <= 1.4 and returners >= 1


seed = next(s for s in range(1, 5000) if acceptable(simulate(s)[0]))
invs, cfs = simulate(seed)

# Blank the reported history of a few long-held companies so the app's check-in flag has cases to show.
stale = [d for d in invs if not d["exit_d"] and len(d["rounds"]) == 1 and (REPORT - d["entry"]).days > 400][:3]
for d in stale: d["ms"] = []
for d in [d for d in invs if d["stage"] != "Seed"][2::9]: d["pre"] = ""  # missing descriptions

M = 1_000_000
rows = []
for d in invs:
    lead = "Sofia Reyes" if d["vint"] == 2021 and d["sec"] in ("Developer Tools", "Enterprise Software") and d["stage"] == "Seed" else LEAD[d["sec"]]
    invested = sum(c for _, c in d["checks"])
    last = min(d["exit_d"] or REPORT, REPORT)
    rows.append(dict(company=d["name"], fund=d["fund"], sector=d["sec"], country="United States", stage=d["stage"],
        entry_date=d["entry"], exit_date=d["exit_d"] or "", exit_type=d["exit_type"],
        invested=round(invested * M), initial_investment=round(d["checks"][0][1] * M),
        realized=round(d["proceeds"] * M), unrealized=round(d["unreal"] * M),
        entry_post_money=round(d["entry_post"] * M), latest_post_money=round(d["latest_post"] * M) if d["latest_post"] else "",
        latest_round=d["latest_round"], ownership_entry=round(d["entry_own"], 4), ownership_current=round(d["own"], 4) if not d["exit_d"] else "",
        founded=d["founded"], pre_investment=d["pre"],
        milestones=" | ".join(f"{m.isoformat()[:7]}: {t}" for m, t in d["ms"] if d["entry"] < m <= last),
        deal_lead=lead, board_seat="Yes" if d["entry_own"] >= 0.10 else "No"))
# Company history: every raise, plus a quarterly report of cash and burn. Burn is set per financing
# so cash runs down toward the next event: companies that later raised still had some cash left,
# companies that failed ran it to zero, and live companies sit anywhere on their runway today.
hist = []
hrnd = random.Random(seed + 1)
GM_TARGET = {"Enterprise Software": 0.76, "Developer Tools": 0.74, "Fintech": 0.52, "Healthcare": 0.48, "Consumer": 0.42, "Climate": 0.24}
for d in invs:
    rs = d["rounds"]
    for r in rs:
        hist.append(dict(company=d["name"], date=r["d"], round=r["name"], post_money=round(r["post"] * M), amount_raised=round(r["raised"] * M),
                         fund_invested=round(r["fund"] * M), ownership=round(r["own"], 4), cash_on_hand="", monthly_burn="", revenue="", gross_profit="", net_income=""))
    if d in stale: continue  # the GP has not sent reports on these; the app should notice
    cash = 0.0
    # Quarterly revenue and gross margin. Margins start below the sector's mature level and climb as
    # companies scale; companies heading for failure stall and slip instead. Seed companies are
    # pre-revenue for their first few quarters, so their early reports carry no margin.
    target = GM_TARGET[d["sec"]]
    gm = target - hrnd.uniform(0.08, 0.25)
    rev = {"Seed": 0.0, "Series A": hrnd.uniform(0.25, 1.0), "Series B": hrnd.uniform(2.0, 5.0)}[d["stage"]]
    rev_start = 0 if d["stage"] != "Seed" else hrnd.randint(2, 6)
    growth = hrnd.uniform(0.07, 0.14)
    # Profit margin (net income / revenue): deeply negative early, closing on a company-specific
    # floor. From 2022 companies cut costs to extend runway, so margins improve faster and growth slows.
    pm, pm_floor = hrnd.uniform(-1.3, -0.5), hrnd.uniform(-0.3, 0.08)
    nq = 0
    for i, r in enumerate(rs):
        nxt = rs[i + 1]["d"] if i + 1 < len(rs) else d["end"]
        cash += r["raised"]
        # Investors price rounds off revenue. If revenue is behind the 15-35x the new post-money
        # implies, grow into it over the next year rather than jumping on the day of the raise.
        if i and rev:
            implied = r["post"] / (4 * hrnd.uniform(15, 35))
            if implied > rev: growth = min(0.35, max(growth, (implied / rev) ** 0.25 - 1))
        months = max(3, (nxt.year - r["d"].year) * 12 + nxt.month - r["d"].month)
        if i + 1 < len(rs): burn = cash / (months * hrnd.uniform(1.15, 1.6))
        elif d["failed"]: burn = cash / (months * hrnd.uniform(0.9, 1.0))
        else: burn = cash / (months * 1.25 + hrnd.uniform(1, 28))  # still operating: some runway left today
        q = add_months(r["d"], 3)
        while q <= nxt and q <= REPORT:
            cash = max(0.0, cash - burn * 3)
            # Only the final financing reports on the data date itself; an earlier one would log pre-raise cash.
            if q < nxt or (nxt == REPORT and i == len(rs) - 1):
                nq += 1
                if nq == rev_start and rev == 0: rev = hrnd.uniform(0.05, 0.2)
                elif rev: rev *= 1 + (growth * hrnd.uniform(0.5, 1.3) if not d["failed"] else hrnd.uniform(-0.08, 0.03))
                growth = max(0.02, growth * (0.93 if q.year >= 2022 else 0.97))
                pm += (pm_floor - pm) * (0.13 if q.year >= 2022 else 0.04) + hrnd.gauss(0, 0.03) if not d["failed"] else -hrnd.uniform(0.0, 0.05)
                gm += (target - gm) * 0.12 + hrnd.gauss(0, 0.015) if not d["failed"] else -hrnd.uniform(0.0, 0.03)
                hist.append(dict(company=d["name"], date=q, round="", post_money="", amount_raised="", fund_invested="",
                                 ownership=round(r["own"], 4), cash_on_hand=round(cash * M), monthly_burn=round(burn * M),
                                 revenue=round(rev * M) if rev else "", gross_profit=round(rev * gm * M) if rev else "",
                                 net_income=round(rev * pm * M) if rev else ""))
            burn *= 1.03
            q = add_months(q, 3)
# Two live companies whose margins slip over the last year (discounting, or a costlier supplier),
# so the app's slipping-margin note has something to show.
live = sorted({d["name"] for d in invs if not d["exit_d"] and d not in stale})
for name in live[1::6][:2]:
    rows_ = [h for h in hist if h["company"] == name and h["revenue"]][-4:]
    for j, h in enumerate(rows_): h["gross_profit"] = round(h["gross_profit"] - h["revenue"] * 0.025 * (j + 1))
hist.sort(key=lambda h: (h["company"], h["date"], h["round"] == ""))

cf_rows = [dict(fund=r["fund"], vintage=r["vintage"], fund_size=r["fund_size"] * M, date=r["date"], type=r["type"],
                amount=round(r["amount"] * M), currency="USD") for r in cfs]


def write(name, rs):
    with open(name, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rs[0])); w.writeheader(); w.writerows(rs)


write("cash_flows.csv", cf_rows)
write("investments.csv", rows)
# Illustrative venture quartiles by vintage (made up; not any data provider's figures).
bm = []
for v, q in {2014: dict(TVPI=(3.0, 2.0, 1.3), IRR=(0.25, 0.15, 0.07), DPI=(2.0, 1.0, 0.4)),
             2017: dict(TVPI=(2.6, 1.8, 1.3), IRR=(0.28, 0.18, 0.09), DPI=(0.9, 0.35, 0.1)),
             2021: dict(TVPI=(1.3, 1.0, 0.85), IRR=(0.08, 0.0, -0.06), DPI=(0.05, 0.0, 0.0))}.items():
    for m, (top, med, bot) in q.items(): bm.append(dict(vintage=v, metric=m, top=top, median=med, bottom=bot))
write("benchmarks.csv", bm)
write("team.csv", TEAM)
write("company_history.csv", hist)
print("seed", seed, "companies", len(rows), "gross TVM", [round(gross(invs, f[0]), 2) for f in FUNDS])
