"""Bakes the sample CSVs into each module's page so it runs from a single file with no server.

python3 build.py                      writes index.html (fund performance) and exposure.html (LP exposure)
python3 build.py OUT [EXPOSURE_OUT]   also writes the artifact variants, where the host supplies the skeleton
"""
import json, pathlib, sys
here = pathlib.Path(__file__).parent
head = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n'
modules = [
    ("app.template.html", "index.html", [("cf", "cash_flows.csv"), ("inv", "investments.csv"), ("bm", "benchmarks.csv"), ("team", "team.csv"), ("hist", "company_history.csv")]),
    ("exposure.template.html", "exposure.html", [("commit", "lp_commitments.csv"), ("hold", "lp_holdings.csv")]),
]
for i, (template, page, files) in enumerate(modules):
    s = {k: (here / "sample" / f).read_text() for k, f in files}
    body = (here / template).read_text().replace("/*SAMPLE*/null", json.dumps(s))
    (here / page).write_text(head + body + "\n</html>\n")
    if len(sys.argv) > i + 1: pathlib.Path(sys.argv[i + 1]).write_text(body)
