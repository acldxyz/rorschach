# rorschach

Tools for fund LPs and GPs.

## lp-analytics

A single-file track record analyzer for venture funds. You load a GP's fund cash flows and portfolio company data, and it shows net performance, return concentration, follow-on discipline, company progress and scenarios.

- `lp-analytics/app.template.html` is the source.
- The Brand fields in the Data panel take your colours (hex, `rgb()` or names, in order) and a font (installed locally or from Google Fonts). They restyle the page, the charts, the PNG downloads and the HTML report, and they're saved in the browser and in workspace files. The Excel workbook carries figures only: the spreadsheet library the app uses can't write fonts or fills.
- `python3 lp-analytics/build.py` bakes `lp-analytics/sample/*.csv` into `lp-analytics/index.html`, which opens straight from disk with no server.
- `cd lp-analytics/sample && python3 generate.py` regenerates the mock three-fund sample data.

The history was moved over from `acldxyz/personal-site` (branch `claude/amazing-heisenberg-48gqo9`).
