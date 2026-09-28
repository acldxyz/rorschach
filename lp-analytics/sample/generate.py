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


# Per-company profile: sector, deal type, founded year, pre-investment description, and
# milestones as (months after entry, text). Blank fields are deliberate: they exercise the
# app's fallbacks (near-inception, no description, too early, check-in flag).
P = {
 "Atlas Precision": ("Industrials", "Buyout", 1988, "Family-owned maker of aerospace fasteners in Ohio, ~$70M revenue, single plant, founder seeking succession.", [(9, "Hired first outside CEO"), (20, "Opened second plant in Texas"), (38, "Lost largest customer contract; restructured cost base")]),
 "Brightwater Health": ("Health Care", "Growth Equity", 2009, "Regional home-health provider in five states, growing ~20% a year, founder-led with minority angel investors.", [(12, "Entered three new states"), (30, "Launched value-based care contracts with two payers"), (54, "Recapitalised; firm took partial liquidity")]),
 "Cinder Analytics": ("Information Technology", "Growth Equity", 2011, "Hospital revenue-cycle analytics software, ~200 customers, break-even, seed and Series A backed.", [(10, "Moved product to subscription pricing"), (26, "Acquired a coding-audit tool"), (48, "Crossed 600 hospital customers")]),
 "Dovetail Foods": ("Consumer Discretionary", "Buyout", 1972, "Private-label snack maker supplying grocers in the Northeast, flat sales, underinvested plants.", [(8, "New CEO from a national food brand"), (24, "Automated two packaging lines"), (47, "Won national grocery private-label contract")]),
 "Everline Insurance": ("Financials", "Carve-out", 1995, "Specialty commercial insurance brokerage unit of a larger carrier, no standalone systems.", [(12, "Completed separation from parent; new IT stack"), (30, "Five bolt-on agency acquisitions"), (60, "Reached $50M EBITDA")]),
 "Falcon Ridge Logistics": ("Industrials", "Buyout", 2001, "Asset-light freight brokerage focused on refrigerated loads in the Southeast.", [(14, "Launched digital load-matching platform"), (30, "Added cross-border Mexico lane")]),
 "Granite Payroll": ("Business Services", "Carve-out", 2004, "Payroll processing division for small businesses, carved out of a regional bank.", [(10, "Standalone brand launched"), (28, "Migrated clients to cloud platform")]),
 "Harbor Dental Group": ("Health Care", "Buyout", 2008, "Dental service organisation with 18 practices in Florida.", [(12, "Grew to 45 practices through acquisitions"), (36, "Added orthodontics service line"), (56, "Reached 110 practices across four states")]),
 "Ironclad Controls": ("Industrials", "Buyout", 1981, "Maker of industrial flow-control valves sold through distributors, founder retiring.", [(15, "Built direct sales team for OEM accounts"), (40, "Acquired European valve maker"), (70, "Opened plant in Mexico")]),
 "Juniper Software": ("Information Technology", "Growth Equity", 2017, "", [(12, "Launched first commercial product"), (30, "Reached $10M ARR"), (52, "Growth stalled; sold to strategic buyer below cost")]),
 "Keystone Pet Care": ("Consumer Discretionary", "Buyout", 1999, "Chain of 40 pet grooming and boarding locations in the Mid-Atlantic.", [(12, "Opened 15 new locations"), (40, "Launched membership programme")]),
 "Lumen Diagnostics": ("Health Care", "Carve-out", 1990, "Clinical lab testing unit of a diagnostics conglomerate, 12 labs.", [(18, "Standalone operation complete"), (32, "COVID testing volumes lifted revenue 3x"), (60, "Repositioned toward specialty oncology testing")]),
 "Meridian Freight": ("Industrials", "Buyout", 1994, "Less-than-truckload carrier in the Midwest, 30 terminals.", [(20, "Terminal network rationalised to 24"), (48, "Fuel costs compressed margins")]),
 "Northwind Labs": ("Health Care", "Buyout", 2006, "Contract research organisation for early-stage biotech, ~$150M revenue.", [(12, "Added preclinical imaging capability"), (36, "Won multi-year sponsor contract with top-10 pharma"), (72, "Sold to strategic acquirer")]),
 "Orchard Home Brands": ("Consumer Discretionary", "Buyout", 1985, "Home fragrance and candle brand sold mainly through department stores.", [(10, "Shifted mix to direct-to-consumer online"), (30, "Entered mass retail with a second brand"), (66, "Sold to consumer products company")]),
 "Pinecrest Staffing": ("Business Services", "Take-private", 1998, "Publicly listed light-industrial staffing firm trading below book value.", []),
 "Quarry Materials": ("Industrials", "Take-private", 1964, "Listed aggregates and ready-mix producer with 22 quarries in the Mountain West.", [(14, "Acquired four quarries from a competitor"), (40, "Raised prices on infrastructure-bill demand")]),
 "Redwood Clinics": ("Health Care", "Take-private", 2003, "Listed urgent-care operator, 60 clinics, under activist pressure.", [(18, "Closed 12 underperforming clinics"), (48, "Partial sale of Arizona clinics returned capital")]),
 "Summit Data": ("Information Technology", "Buyout", 2012, "", [(24, "Migrated customers to new data platform")]),
 "Tidewater Marine": ("Industrials", "Carve-out", 1979, "", []),
 "Upland Outdoors": ("Consumer Discretionary", "Buyout", 2002, "Outdoor apparel brand with 30 stores and wholesale to specialty retailers.", [(9, "Pandemic demand doubled online sales"), (30, "Opened 12 stores"), (48, "Dividend recap returned part of capital")]),
 "Vantage Payments": ("Financials", "Growth Equity", 2016, "Payments processor for independent medical practices, ~$40M revenue.", [(12, "Launched patient financing product"), (36, "Processed $5B annual volume"), (51, "Sold to a larger payments company")]),
 "Westbrook Fluid Systems": ("Industrials", "Growth Equity", 2010, "Designer of water-treatment skids for municipal utilities.", [(18, "Won first federal infrastructure contract")]),
 "Yardline Sports": ("Consumer Discretionary", "Buyout", 2005, "Operator of 25 youth sports facilities in Texas and Oklahoma.", [(12, "Opened six facilities"), (30, "Launched tournament events business")]),
 "Zephyr Cloud": ("Information Technology", "Take-private", 2009, "Listed cloud backup software company with slowing growth.", [(8, "Cut 15% of workforce"), (24, "Launched ransomware protection add-on")]),
 "Alder Specialty Chem": ("Industrials", "Growth Equity", 1997, "Maker of specialty coatings additives, family-owned, growing into EV battery market.", [(10, "Opened pilot plant for battery materials")]),
 "Beacon Vet": ("Health Care", "Take-private", 2012, "Listed veterinary hospital group, 80 hospitals.", [(14, "Added 20 hospitals through acquisitions")]),
 "Copperleaf Security": ("Information Technology", "Growth Equity", 2023, "", [(9, "First enterprise customer signed")]),
 "Driftwood Learning": ("Business Services", "Buyout", 2000, "Corporate compliance training provider with 1,200 enterprise clients.", []),
 "Elmstone Testing": ("Industrials", "Buyout", 1993, "Materials testing and inspection labs serving construction and energy clients.", []),
}


# Fictional investment team. Deal leads are assigned by sector so each partner has a coherent book.
TEAM = [
 dict(name="Margaret Ellison", title="Co-Founder & Managing Partner", joined=2013, focus="Industrials; Business Services",
      prior="Partner at a mid-market buyout firm (2004-2013); operations consultant at a global strategy firm", education="BS Mechanical Engineering, Purdue; MBA, Wharton",
      boards="Chairs the firm's investment committee"),
 dict(name="David Okafor", title="Co-Founder & Managing Partner", joined=2013, focus="Health Care",
      prior="Principal at a health care growth equity fund (2006-2013); hospital system strategy lead", education="BA Economics, Howard; MBA, Kellogg",
      boards="Leads the firm's health care practice"),
 dict(name="Sarah Lindqvist", title="Partner", joined=2015, focus="Information Technology; Financials",
      prior="Vice President in a bank's technology M&A group (2008-2015)", education="BA Mathematics, Wellesley; MBA, Columbia",
      boards=""),
 dict(name="James Whitaker", title="Partner", joined=2016, focus="Consumer Discretionary",
      prior="CFO of a specialty retailer (2010-2016); audit at a Big Four firm", education="BBA Accounting, Notre Dame; CPA",
      boards=""),
 dict(name="Priya Raman", title="Principal", joined=2019, focus="Information Technology; Health Care",
      prior="", education="BS Computer Science, Georgia Tech; MBA, Stanford", boards=""),
]
# The rest of the firm: name and title only. Levels are inferred from titles by the app.
STAFF = [("Tom Castellano", "Vice President"), ("Aisha Bello", "Principal"), ("Grace Liu", "Senior Associate"),
         ("Marcus Dunn", "Associate"), ("Hannah Pruitt", "Associate"), ("Leo Fischer", "Analyst"), ("Nadia Karim", "Analyst"),
         ("Robert Haines", "Chief Financial Officer"), ("Elena Sorokina", "Controller"), ("Chris Adebayo", "Head of Investor Relations"),
         ("Maria Delgado", "Chief Compliance Officer"), ("Kevin Tran", "Fund Accountant"), ("Julia Brenner", "Office Manager")]
TEAM += [dict(name=n, title=t, joined="", focus="", prior="", education="", boards="") for n, t in STAFF]
LEAD = {"Industrials": "Margaret Ellison", "Business Services": "Margaret Ellison", "Health Care": "David Okafor",
        "Information Technology": "Sarah Lindqvist", "Financials": "Sarah Lindqvist", "Consumer Discretionary": "James Whitaker"}

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
        if fund.endswith("III") and i == n - 1: entry = dt.date(2025, 6, 30)  # a deal too recent to have milestones
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
        name = next(NAMES); sec, dtype, founded, pre, ms = P[name]; random.choice(SECTORS); random.choice(DEALS)  # draws kept so other values are unchanged
        last = min(exit_d, REPORT)
        miles = " | ".join(f"{add_months(entry, m).isoformat()[:7]}: {t}" for m, t in ms if add_months(entry, m) <= last)
        invs.append(dict(company=name, fund=fund, sector=sec, country=random.choice(COUNTRIES),
            deal_type=dtype, entry_date=entry, exit_date=exit_d if realized_flag else "",
            invested=inv, realized=realized, unrealized=unreal,
            revenue_entry=round(rev0, 1), revenue_exit=round(rev1, 1), ebitda_entry=round(e0, 1), ebitda_exit=round(e1, 1),
            tev_entry=round(tev0, 1), tev_exit=round(mult1 * e1, 1), net_debt_entry=round(nd0, 1), net_debt_exit=round(nd1, 1),
            ownership_entry=round(own, 3), ownership_exit=round(own, 3),
            founded=founded, pre_investment=pre, milestones=miles,
            # Newer tech and health deals in Fund III go to the principal, who joined in 2019.
            deal_lead="Priya Raman" if vint == 2021 and sec in ("Information Technology", "Health Care") else LEAD[sec]))
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
write("team.csv", TEAM)
print(len(cfs), len(invs))
