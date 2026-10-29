# GP Diligence

Diligence on one venture GP. Load the GP's fund cash flows (required) and, optionally, portfolio company data, company history, securities and firm staff to see:

- **Track record:** a net performance summary per fund (vintage, size, total value, % invested, % realized, years active since the first capital call, net TVPI, DPI and IRR, shaded by benchmark quartile), with a Detailed view adding paid-in, distributed, NAV, how many companies make up 90% of value, RVPI and quartile badges, and footnotes that follow the columns shown; relative performance against vintage benchmarks; the J-curve and annual cash flows.
- **Portfolio:** slices by stage, sector, outcome and more (invested capital mix per fund, gross TVM, deal counts and a slice table); return concentration, ending on a layer chart of portfolio value by investment, as added: one stacked layer per company in entry order, worth ownership × the latest post-money from the history file (cost until a first mark, the reported unrealized value in the latest quarter, a straight line from cost when there is no history), with the eight largest coloured; time to write-off and follow-on rounds before write-off; gross margin. Annual cash flows, Portfolio slices and Return concentration each have their own Funds checklist to show one, several or all funds.
- **Portfolio companies:** growth vs profitability, with one line per company (year-over-year revenue growth against profit margin, quarter by quarter), a diamond on the quarter each company closed a funding round, and filters for fund, industry and period; then a profile per company, with runway and round tracking from the history file and, from the securities file, a **Securities held** table: priced shares (shares, purchase and current price per share, multiple, cost, fair value, liquidation preference, seniority, anti-dilution) and convertibles (cost, fair value, valuation cap, discount, interest, maturity, time to maturity, status). The Excel workbook merges them into a Securities - priced and a Securities - convertible sheet.
- **Team & partners:** headcount and partner track records.
- **Scenarios:** exit forecasts with dilution, liquidation preferences and the fund waterfall.

**Excel workbook** downloads every table and chart's figures, a Key figures and a Sources sheet, then one `Data · …` sheet per kind loaded (fund cash flows, portfolio companies, company history, firm staff): the cleaned rows in the app's own columns, with typed numbers and dates, amounts in full units of the display currency, and the source cell each row came from, so the file doubles as one consolidated copy of the uploads.

**Save workspace** downloads one file holding everything loaded and set up: the data, column matches, source details for the audit, brand, units, benchmarks and scenarios. **Open workspace** restores it. Workspaces saved under the old name (Track Record Analyzer) still open.

See the [root README](../README.md) for the features both products share and how to build.

## Files

- `template.html`: the product's page, built into `index.html` by `python3 build.py` at the repo root.
- `sample/`: the fictional three-fund sample data. `cd gp-diligence/sample && python3 generate.py` regenerates it. `securities.csv` (one row per fund, company and security) is derived from the committed `investments.csv` and `company_history.csv` by `python3 generate_securities.py`, run from the same folder: cost adds up to `invested` and fair value to `unrealized` for every company.
- `reel/`: records a muted, seamlessly looping ~28-second reel of the product for use as a background video; `signup.html` is an example page that plays it behind a signup card. Run `python3 build.py`, then `node gp-diligence/reel/record.js` (add `--theme dark` for the dark cut). It needs Playwright and an ffmpeg with libx264, libvpx-vp9 and the xfade filter (set `FFMPEG` to point at one). Renders go to `gp-diligence/reel/out/`, which git ignores.
