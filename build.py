"""Builds each product into one self-contained page that opens from disk with no server.

Two products share a look and feel but stand alone: GP Diligence (gp-diligence/) and Exposure Model
(exposure-model/). Each has a template.html and its sample CSVs; the shared parts live in shared/ and
are inlined at exactly one placeholder each: the Brand row (brand.css, brand.js, brand.html), the top
bar's Light/Dark toggle (theme.css, theme.js, theme.html), the multi-sheet workbook proposal
(workbook.css, workbook.js) and the Data view with its source audit (dataview.css, dataview.js).

python3 build.py
    writes gp-diligence/index.html and exposure-model/index.html.
python3 build.py --artifact OUTDIR
    also writes OUTDIR/gp-diligence.html and OUTDIR/exposure-model.html for publishing as claude.ai
    artifacts: no document skeleton (the host supplies it).
"""
import argparse, json, pathlib
root = pathlib.Path(__file__).parent
shared = root / "shared"
head = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n'
products = {
    "gp-diligence": [("cf", "cash_flows.csv"), ("inv", "investments.csv"), ("bm", "benchmarks.csv"), ("team", "team.csv"), ("hist", "company_history.csv")],
    "exposure-model": [("commit", "lp_commitments.csv"), ("hold", "lp_holdings.csv")],
}
partials = {"/*BRAND_CSS*/": "brand.css", "/*BRAND_JS*/": "brand.js", "<!--BRAND_HTML-->": "brand.html",
            "/*THEME_CSS*/": "theme.css", "/*THEME_JS*/": "theme.js", "<!--THEME_HTML-->": "theme.html",
            "/*WORKBOOK_CSS*/": "workbook.css", "/*WORKBOOK_JS*/": "workbook.js",
            "/*DATAVIEW_CSS*/": "dataview.css", "/*DATAVIEW_JS*/": "dataview.js"}
ap = argparse.ArgumentParser()
ap.add_argument("--artifact")
a = ap.parse_args()
for name, files in products.items():
    d = root / name
    body = (d / "template.html").read_text()
    for mark, f in partials.items():
        assert body.count(mark) == 1, f"{name}/template.html: expected one {mark}"
        body = body.replace(mark, (shared / f).read_text().rstrip("\n"))
    body = body.replace("/*SAMPLE*/null", json.dumps({k: (d / "sample" / f).read_text() for k, f in files}))
    (d / "index.html").write_text(head + body + "\n</html>\n")
    if a.artifact:
        out = pathlib.Path(a.artifact); out.mkdir(parents=True, exist_ok=True)
        (out / f"{name}.html").write_text(body)
