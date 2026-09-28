"""Builds the mock data set for the LP analytics app. Deterministic (seeded) so the
sample files are reproducible. All names are fictional."""
import csv, random, datetime as dt
random.seed(7)
REPORT = dt.date(2025, 12, 31)
GP = "Northbrook Harbor Partners"
FUNDS = [("Northbrook Harbor Fund I", 2014, 600), ("Northbrook Harbor Fund II", 2017, 900),
         ("Northbrook Harbor Fund III", 2021, 1400)]
SECTORS = ["Industrials", "Health Care", "Information Technology", "Consumer Discretionary", "Financials", "Business Services"]
COUNTRIES = ["United States"] * 5 + ["Canada", "United Kingdom", "Germany"]
DEALS = ["Buyout"] * 4 + ["Growth Equity", "Carve-out", "Take-private"]
NAMES = iter("""Atlas Precision|Brightwater Health|Cinder Analytics|Dovetail Foods|Everline Insurance|Falcon Ridge Logistics|
Granite Payroll|Harbor Dental Group|Ironclad Controls|Juniper Software|Keystone Pet Care|Lumen Diagnostics|Meridian Freight|
Northwind Labs|Orchard Home Brands|Pinecrest Staffing|Quarry Materials|Redwood Clinics|Summit Data|Tidewater Marine|
Upland Outdoors|Vantage Payments|Westbrook Fluid Systems|Yardline Sports|Zephyr Cloud|Alder Specialty Chem|Beacon Vet|
Copperleaf Security|Driftwood Learning|Elmstone Testing""".replace("\n", "").split("|"))

def qend(d):
    m = ((d.month - 1) // 3 + 1) * 3
    nxt = dt.date(d.year + (m == 12), m % 12 + 1, 1)
    return nxt - dt.timedelta(days=1)

def add_months(d, n):
    y, m = divmod(d.month - 1 + n, 12)
    return qend(dt.date(d.year + y, m + 1, 1))

cfs, invs = [], []
for fund, vint, size in FUNDS:
    start = dt.date(vint, 3, 31)
    n = {2014: 10, 2017: 11, 2021: 9}[vint]
    deployable = size * 0.88
    weights = [random.uniform(0.6, 1.4) for _ in range(n)]
    ws = sum(weights)
    flows = {}
    def flow(d, k, a):
        if d <= REPORT: flows[(d, k)] = flows.get((d, k), 0) + a
    unreal_total = 0
    for i in range(n):
        inv = round(deployable * weights[i] / ws, 1)
        entry = add_months(start, int(i * 48 / n) + random.randint(0, 3))
        if entry > REPORT: entry = add_months(REPORT, -3)
        hold = random.randint(42, 96)
        exit_d = add_months(entry, hold)
        age = (REPORT - entry).days / 365.25
        # Outcome drawn once; realized deals exit at it, live deals mark partway there.
        moic = random.choice([0.0, 0.4, 0.9, 1.5, 1.9, 2.3, 2.7, 3.2, 4.1, 5.5]) * random.uniform(0.85, 1.15)
        realized_flag = exit_d <= REPORT
        if realized_flag:
            realized, unreal = inv * moic, 0.0
        else:
            prog = min(1, age / (hold / 12))
            mark = 1 + (moic - 1) * prog * 0.8 if moic >= 1 else 1 - (1 - moic) * prog
            partial = inv * mark * (0.25 if age > 4 and random.random() < 0.5 else 0)
            realized, unreal = partial, inv * mark - partial
        realized, unreal = round(realized, 1), round(unreal, 1)
        flow(entry, "Contribution", -inv)
        if realized:
            flow(exit_d if realized_flag else add_months(REPORT, -6), "Distribution", realized)
        unreal_total += unreal
        rev0 = round(inv * random.uniform(1.2, 3.0), 1)
        margin0 = random.uniform(0.12, 0.28)
        e0 = rev0 * margin0
        mult0 = random.uniform(8.5, 13.5)
        tev0 = e0 * mult0
        nd0 = tev0 * random.uniform(0.40, 0.60)
        eq0 = tev0 - nd0
        own = min(0.95, inv / eq0) if eq0 > 0 else 0.8
        eq0 = inv / own
        nd0 = tev0 - eq0
        tv = realized + unreal
        eq1 = max(tv / own, 0.1)
        years = max(1, (min(exit_d, REPORT) - entry).days / 365.25)
        rev1 = rev0 * (1 + random.uniform(-0.05, 0.16)) ** years
        margin1 = max(0.03, margin0 + random.uniform(-0.05, 0.06))
        e1 = rev1 * margin1
        nd1 = max(0, nd0 * random.uniform(0.35, 1.05))
        mult1 = (eq1 + nd1) / e1
        if mult1 < 3:  # deal failed: equity wiped, multiple compressed, debt stays
            mult1 = max(3.0, mult1); nd1 = mult1 * e1 - eq1
        invs.append(dict(company=next(NAMES), fund=fund, sector=random.choice(SECTORS), country=random.choice(COUNTRIES),
            deal_type=random.choice(DEALS), entry_date=entry, exit_date=exit_d if realized_flag else "",
            invested=inv, realized=realized, unrealized=unreal,
            revenue_entry=round(rev0, 1), revenue_exit=round(rev1, 1), ebitda_entry=round(e0, 1), ebitda_exit=round(e1, 1),
            tev_entry=round(tev0, 1), tev_exit=round(mult1 * e1, 1), net_debt_entry=round(nd0, 1), net_debt_exit=round(nd1, 1),
            ownership_entry=round(own, 3), ownership_exit=round(own, 3)))
    # Management fees: 2% of commitment through year 5, then 1.5% of invested.
    d = start
    last_exit = max((dt.date.fromisoformat(str(x['exit_date'])) for x in invs if x['fund'] == fund and x['exit_date']), default=REPORT)
    live = any(x['fund'] == fund and x['unrealized'] for x in invs)
    while d <= (REPORT if live else last_exit):
        yrs = (d - start).days / 365.25
        fee = size * 0.02 / 4 if yrs < 5 else deployable * 0.015 / 4 * max(0.3, 1 - (yrs - 5) / 8)
        flow(d, "Contribution", -round(fee, 2))
        d = add_months(d, 3)
    # Carry: 20% of distributions once cumulative distributions exceed paid-in.
    paid = dist = 0.0
    for (d, k) in sorted(flows):
        a = flows[(d, k)]
        if k == "Contribution": paid += -a
        else:
            gross = a
            excess = max(0, dist + gross - paid) - max(0, dist - paid)
            net = gross - 0.2 * excess
            flows[(d, k)] = round(net, 2); dist += net
    gain = max(0, dist + unreal_total - paid)
    flows[(REPORT, "NAV")] = round(unreal_total - 0.2 * min(gain, unreal_total) * 0.9, 2)
    for (d, k), a in sorted(flows.items()):
        cfs.append(dict(fund=fund, vintage=vint, fund_size=size, date=d, type=k, amount=a))

def write(name, rows):
    with open(name, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
write("cash_flows.csv", cfs)
write("investments.csv", invs)
# Illustrative quartile breakpoints by vintage (not a real data provider's figures).
bm = [dict(vintage=2014, metric="TVPI", top=2.35, median=1.85, bottom=1.45), dict(vintage=2014, metric="IRR", top=0.21, median=0.145, bottom=0.09),
      dict(vintage=2014, metric="DPI", top=1.95, median=1.40, bottom=0.95), dict(vintage=2017, metric="TVPI", top=2.20, median=1.70, bottom=1.35),
      dict(vintage=2017, metric="IRR", top=0.24, median=0.16, bottom=0.10), dict(vintage=2017, metric="DPI", top=1.20, median=0.70, bottom=0.35),
      dict(vintage=2021, metric="TVPI", top=1.45, median=1.18, bottom=1.00), dict(vintage=2021, metric="IRR", top=0.17, median=0.09, bottom=0.01),
      dict(vintage=2021, metric="DPI", top=0.25, median=0.07, bottom=0.00)]
write("benchmarks.csv", bm)
print(len(cfs), len(invs))
