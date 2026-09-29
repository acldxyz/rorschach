"""Bakes the sample CSVs into the page so it runs from a single file with no server."""
import json, pathlib, sys
here = pathlib.Path(__file__).parent
s = {k: (here / "sample" / f).read_text() for k, f in [("cf", "cash_flows.csv"), ("inv", "investments.csv"), ("bm", "benchmarks.csv"), ("team", "team.csv"), ("hist", "company_history.csv")]}
body = (here / "app.template.html").read_text().replace("/*SAMPLE*/null", json.dumps(s))
head = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n'
(here / "index.html").write_text(head + body + "\n</html>\n")
if len(sys.argv) > 1: pathlib.Path(sys.argv[1]).write_text(body)  # artifact variant: host supplies the skeleton
