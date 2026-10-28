"""Builds securities.csv, the securities each fund holds in each company, from the committed sample.

It reads investments.csv and company_history.csv (it does not re-run generate.py) and writes one row per
fund x company x security, so every figure agrees with the files it came from:
- each funding round the fund put money into (fund_invested > 0) is one security, named after the round
  ("Series A Preferred") and dated on the round;
- prices per share come from a share count: the company's fully diluted shares at the fund's entry are set
  from a nominal price for the stage, each later round adds amount_raised / post_money of new shares, and a
  round's price is its post-money over the shares after it. The fund's shares then reproduce the history's
  ownership, and its cheque over the round price gives the shares it bought;
- the current price per share is the fund's unrealized value over its shares, so the marks (including the
  haircut on stale rounds) agree with investments.csv;
- some seed cheques are SAFEs or convertible notes. Those that met a later priced round converted at the cap
  (a note's cap allows for its accrued interest), which gives the same shares as the priced seed round; three
  held companies with no later round still hold theirs, outstanding at the as-of date;
- the sum of cost per company equals `invested`, and the sum of fair value equals `unrealized`; the odd
  dollar of rounding goes to the largest security.
Deterministic: run it from gp-diligence/sample with `python3 generate_securities.py`.
"""
import csv, random, datetime as dt
from collections import defaultdict

AS_OF = "2025-12-31"
inv = list(csv.DictReader(open("investments.csv")))
hist = list(csv.DictReader(open("company_history.csv")))
rounds = defaultdict(list)
for r in hist:
    if r["round"]: rounds[r["company"]].append(r)
rnd = random.Random(20251231)
NOMINAL = {"Seed": (0.5, 1.5), "Series A": (1.0, 3.0), "Series B": (3.0, 8.0)}
# Seed cheques still outstanding as convertibles at the as-of date: (type, interest, months to maturity).
OUTSTANDING = {"Forge Labs": ("Convertible note", 0.08, 21), "Sable": ("SAFE", None, None), "Aurora Systems": ("Convertible note", 0.06, 24)}


def months(d, n):
    y, m = divmod(d.month - 1 + n, 12)
    nxt = dt.date(d.year + y + (m == 11), (m + 1) % 12 + 1, 1)
    return nxt - dt.timedelta(days=1)


def day(s): return dt.date.fromisoformat(s)
def base(n): return n.replace(" (down round)", "").strip()


def terms(company, rd, idx, down_before):
    """Preference terms for a priced round: plain early, more investor-friendly later."""
    late = idx >= 2 or base(rd) in ("Series C", "Series D", "Series E")
    x = rnd.random()
    liq, part, cap = 1, "No", ""
    if late and x < 0.22: liq = 1.5
    elif late and x < 0.4: part, cap = "Yes", 3
    sen = "Senior" if late and rnd.random() < 0.35 else "Pari passu"
    anti = "Full ratchet" if late and down_before and rnd.random() < 0.6 else "Full ratchet" if late and rnd.random() < 0.08 else "Broad-based weighted average"
    div = 0.06 if base(rd) == "Seed" else 0.08
    cum = "Yes" if late and rnd.random() < 0.2 else "No"
    return dict(liq_pref=liq, participating=part, participation_cap=cap, seniority=sen, anti_dilution=anti, dividend_rate=div, cumulative=cum, conversion_ratio=1)


out, flip, dev = [], 0, []
for d in inv:
    co, fund = d["company"], d["fund"]
    rs = sorted(rounds[co], key=lambda r: r["date"])
    stage0 = base(rs[0]["round"])
    lo, hi = NOMINAL.get(stage0, (1.0, 3.0))
    fd = round(int(rs[0]["post_money"]) / rnd.uniform(lo, hi), -3)
    exit_d, exit_t = d["exit_date"], d["exit_type"]
    secs = []
    for i, r in enumerate(rs):
        post, raised, fi = int(r["post_money"]), int(r["amount_raised"]), int(r["fund_invested"] or 0)
        if i: fd = fd / (1 - raised / post)
        pps = post / fd
        r["_pps"], r["_fd"] = pps, fd
        if fi <= 0: continue
        secs.append(dict(r=r, i=i, cost=fi, pps=pps, shares=round(fi / pps)))
        dev.append(abs(sum(s["shares"] for s in secs) / fd - float(r["ownership"])))
    # A seed cheque made as a SAFE or a note: outstanding where named, else every other seed entry whose next
    # round was priced above the cap price (a discount would otherwise set a different conversion price).
    s0 = secs[0]
    conv = None
    if co in OUTSTANDING:
        conv = OUTSTANDING[co] + (None,)
    elif stage0 == "Seed" and len(rs) > 1 and "down" not in rs[1]["round"]:
        flip += 1
        if flip % 2:
            kind = "SAFE" if flip % 4 == 1 else "Convertible note"
            conv = (kind, 0.06 if kind != "SAFE" else None, 24 if kind != "SAFE" else None, rs[1])
    if conv:
        kind, rate, term, into = conv
        r0 = s0["r"]; issued = day(r0["date"])
        cap = int(r0["post_money"])
        if into is not None and rate:
            yrs = (day(into["date"]) - issued).days / 365.25
            cap = int(round(cap * (1 + rate * yrs), -3))   # cap price covers principal plus interest: same shares
            term = 24 if yrs <= 2 else 36
        if into is not None and s0["pps"] * cap / int(r0["post_money"]) > 0.8 * into["_pps"]:
            conv = None   # the discount would bind; keep it a priced round
    if conv:
        s0.update(type=kind, valuation_cap=cap, discount=0.2, interest_rate=rate or "", round=stage0,
                  maturity_date=months(issued, term).isoformat() if term else "", mfn="Yes" if kind == "SAFE" and rnd.random() < 0.3 else "No",
                  security=f"{issued.year} {'SAFE' if kind == 'SAFE' else 'Convertible note'}",
                  status=f"Converted into {base(into['round'])} Preferred" if into is not None else "Outstanding",
                  date_conv=into["date"] if into is not None else "")
        if into is None: s0["shares"] = ""   # not yet shares
    # Running down-round flag for anti-dilution choices.
    seen_down = False
    for s in secs:
        r = s["r"]
        if "down" in r["round"]: seen_down = True
        if "type" not in s:
            s.update(type="Preferred", security=f"{base(r['round'])} Preferred", round=base(r["round"]), status="Held" if not exit_d else "",
                     **terms(co, r["round"], s["i"], seen_down))
    # Cost reconciles to invested; fair value to unrealized.
    invested, unreal = int(d["invested"]), int(d["unrealized"] or 0)
    big = max(secs, key=lambda s: s["cost"]); big["cost"] += invested - sum(s["cost"] for s in secs)
    shares = sum(s["shares"] for s in secs if s["shares"] != "")
    cur = unreal / shares if unreal and shares else None
    for s in secs:
        s["fair_value"] = round(s["shares"] * cur) if cur and s["shares"] != "" else unreal if unreal and s["shares"] == "" else 0
    if unreal: big_v = max(secs, key=lambda s: s["fair_value"]); big_v["fair_value"] += unreal - sum(s["fair_value"] for s in secs)
    if exit_d:
        how = "Written off" if exit_t == "Shut down" else f"Sold ({exit_t})"
        for s in secs:
            if s["status"] in ("", "Held"): s["status"] = f"{how} {exit_d[:7]}"
    for s in secs:
        conv_ = s["type"] != "Preferred"
        out.append(dict(company=co, fund=fund, security=s["security"], type=s["type"], round=s["round"], date=s["r"]["date"],
            cost=s["cost"], shares=s["shares"], fair_value=s["fair_value"], as_of=AS_OF,
            price="" if conv_ else round(s["pps"], 4), current_price=round(cur, 4) if cur and s["shares"] != "" else "",
            liq_pref=s.get("liq_pref", 1 if s["shares"] != "" else ""), participating=s.get("participating", ""), participation_cap=s.get("participation_cap", ""),
            seniority=s.get("seniority", ""), anti_dilution=s.get("anti_dilution", ""), dividend_rate=s.get("dividend_rate", ""), cumulative=s.get("cumulative", ""),
            conversion_ratio=s.get("conversion_ratio", ""), valuation_cap=s.get("valuation_cap", ""), discount=s.get("discount", ""), interest_rate=s.get("interest_rate", ""),
            maturity_date=s.get("maturity_date", ""), mfn=s.get("mfn", ""), status=s["status"]))

with open("securities.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(out[0])); w.writeheader(); w.writerows(out)

# Check: cost and fair value reconcile per company, and the shares reproduce the history's ownership.
cost, fv = defaultdict(int), defaultdict(int)
for o in out: cost[o["company"]] += o["cost"]; fv[o["company"]] += o["fair_value"]
assert all(cost[d["company"]] == int(d["invested"]) and fv[d["company"]] == int(d["unrealized"] or 0) for d in inv)
print(len(out), "securities for", len(inv), "companies;", sum(o["type"] != "Preferred" for o in out), "convertible,",
      sum(o["status"] == "Outstanding" for o in out), "outstanding; ownership from shares within",
      f"{max(dev) * 100:.2f} points of company_history.csv")
