# rorschach

Tools for fund LPs and GPs.

## lp-analytics

A single-file track record analyzer for venture funds. You load a GP's fund cash flows and portfolio company data, and it shows net performance, return concentration, follow-on discipline, company progress and scenarios.

- `lp-analytics/app.template.html` is the source.
- `python3 lp-analytics/build.py` bakes `lp-analytics/sample/*.csv` into `lp-analytics/index.html`, which opens straight from disk with no server.
- `python3 lp-analytics/sample/generate.py` regenerates the mock three-fund sample data.

The history was moved over from `acldxyz/personal-site` (branch `claude/amazing-heisenberg-48gqo9`).
