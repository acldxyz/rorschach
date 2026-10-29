# Exposure Model

An LP's look-through view across all its managers. Load your fund commitments and each fund's schedule of investments (holdings, required), and every position is scaled to your share of the fund. It shows:

- exposure to every company across all your funds: concentration, sector mix, and which companies more than one manager holds
- a drill-down for each company: who owns what, who invested in which round, how each fund marks each security, and the exit value that returns 3x or 4x (or any target you set) to you, gross or net of carry, compared with the value implied by today's marks
- manager overlap, and the same security held at different marks
- manager and fund summaries, including how much of your NAV sits in companies another of your managers also holds

The exit assumptions (dilution before exit, target multiples, gross or net of carry) sit with the analyses, since they change the results rather than the data.

**Workspaces.** Save workspace (Data view) writes one JSON file (`<title>-workspace.json`, `app: "exposure-model"`) with the loaded rows of each kind, where they came from (with the source sheet, capped as the Data view keeps it), the unit setting, the exit assumptions, the brand and the Analysis view's selections (sub-tab, company, sort and filters). Open workspace, or "Open a saved workspace" on the welcome card, restores all of it and lands on the Data view. GP Diligence workspaces are refused with a message saying so, and GP Diligence refuses these.

**Excel download.** Besides a sheet per table and chart, "Key figures", "Assumptions" and "Sources", the workbook ends with "Data · Fund commitments" and "Data · Fund holdings": the cleaned rows in the app's own columns, typed (numbers, percentages, dates), amounts in full units (headers say so, e.g. "Cost (USD, full units)"), and a last "Source cell" column naming the cell each row came from (`LP book.xlsx › Holdings!C12`, or `lp_holdings.csv!C12`), as GP Diligence's data sheets do.

See the [root README](../README.md) for the features both products share and how to build.

## Files

- `template.html`: the product's page, built into `index.html` by `python3 build.py` at the repo root.
- `sample/`: the fictional ten-fund LP portfolio, marked as of 30 Jun 2026 in the files; the app moves its dates forward when it loads (see the root README). `cd exposure-model/sample && python3 generate_exposure.py` regenerates it.
