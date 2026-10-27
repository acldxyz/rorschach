"""Bakes the sample CSVs, and the shared brand partials (brand.css, brand.js, brand.html), into each
module's page so it runs from a single file with no server.

python3 build.py
    writes index.html (fund performance) and exposure.html (LP exposure), which open from disk.
python3 build.py --artifact OUTDIR [--perf-url URL] [--exp-url URL]
    also writes OUTDIR/performance.html and OUTDIR/exposure.html for publishing as claude.ai
    artifacts: no document skeleton (the host supplies it), and the module links point at the
    published URLs when given.
"""
import argparse, json, pathlib
here = pathlib.Path(__file__).parent
head = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n'
modules = [
    ("perf", "app.template.html", "index.html", [("cf", "cash_flows.csv"), ("inv", "investments.csv"), ("bm", "benchmarks.csv"), ("team", "team.csv"), ("hist", "company_history.csv")]),
    ("exp", "exposure.template.html", "exposure.html", [("commit", "lp_commitments.csv"), ("hold", "lp_holdings.csv")]),
]
ap = argparse.ArgumentParser()
ap.add_argument("--artifact"); ap.add_argument("--perf-url"); ap.add_argument("--exp-url")
a = ap.parse_args()
# Shared partials, inlined so each page stays one self-contained file.
partials = {"/*BRAND_CSS*/": "brand.css", "/*BRAND_JS*/": "brand.js", "<!--BRAND_HTML-->": "brand.html"}
for key, template, page, files in modules:
    s = {k: (here / "sample" / f).read_text() for k, f in files}
    body = (here / template).read_text()
    for mark, f in partials.items():
        assert body.count(mark) == 1, f"{template}: expected one {mark}"
        body = body.replace(mark, (here / f).read_text().rstrip("\n"))
    body = body.replace("/*SAMPLE*/null", json.dumps(s))
    (here / page).write_text(head + body + "\n</html>\n")
    if a.artifact:
        out = pathlib.Path(a.artifact); out.mkdir(parents=True, exist_ok=True)
        if a.perf_url: body = body.replace('href="index.html"', f'href="{a.perf_url}"')
        if a.exp_url: body = body.replace('href="exposure.html"', f'href="{a.exp_url}"')
        (out / ("performance.html" if key == "perf" else "exposure.html")).write_text(body)
