# rorschach

Two products for venture fund LPs. They share a look and feel but serve different jobs, and each stands alone.

- **[GP Diligence](gp-diligence/README.md)** (`gp-diligence/`): diligence on one venture GP. Load the GP's fund cash flows and portfolio company data to see net performance, return concentration, follow-on discipline, company progress and scenarios.
- **[Exposure Model](exposure-model/README.md)** (`exposure-model/`): an LP's look-through view across all its managers. Load your fund commitments and each fund's schedule of investments to see your share of every company, concentration, manager overlap and the exits needed to return 3x or 4x.

Each product builds into a single page that opens straight from disk with no server. Files never leave the browser.

## Layout

```
shared/          what both products share: the Brand row (brand.*), the Light/Dark toggle (theme.*),
                 the multi-sheet workbook proposal (workbook.*), and the Data view with its source audit (dataview.*)
gp-diligence/    template.html, sample/ (data and generator), reel/ (promo video recorder), index.html (built)
exposure-model/  template.html, sample/ (data and generator), index.html (built)
build.py         builds both products
```

## Building

- `python3 build.py` inlines `shared/` into each product's `template.html`, bakes in its sample CSVs and writes `gp-diligence/index.html` and `exposure-model/index.html`.
- `python3 build.py --artifact OUTDIR` also writes `OUTDIR/gp-diligence.html` and `OUTDIR/exposure-model.html` for publishing as private claude.ai artifacts.

A change to `shared/` reaches both products on the next build. Product-specific screens and logic stay in each product's `template.html`.

## Common features

Both products work the same way around their analyses:

- **Arrival:** each opens on a single card asking how to start: upload your own files, open a saved workspace or use the fictional sample data. Each saves its own workspace files and refuses the other's.
- **Analysis and Data views:** a switch at the top moves between the analyses and the Data view. Every load lands on Data.
  - **Data** lists what was identified: per kind of data, the source (file, sheet, header row), rows read, used and skipped (with reasons), the fields found and the columns ignored.
  - **Audit:** pick a field to open a pane that draws the source sheet itself, with each mapped column labelled with the field it feeds, title rows, skipped rows and row categories marked, and a key. Click a cell to see its raw value and the value the app used.
- **Workbooks:** upload a workbook with several sheets and each sheet's kind of data is recognised from its headers and tab name. You confirm the list before it loads.
- **Brand:** your colours and font, typed in or read from the firm's Office template (`.potx`, `.pptx`, `.thmx`, `.dotx`, `.docx`, `.xltx`, `.xlsx`), restyle the page, charts and downloads. Each product keeps its own brand settings in the browser.
- **Light/Dark:** follows the system until you pick one. Downloads (PNG, HTML report) always come out light.
- **Downloads:** an Excel workbook (with a **Sources** sheet recording where every field came from, then a "Data · …" sheet per kind loaded with the cleaned rows and the source cell of each) and an HTML report. The Excel workbook carries figures only: the spreadsheet library the app uses can't write fonts or fills.

The history was moved over from `acldxyz/personal-site` (branch `claude/amazing-heisenberg-48gqo9`).
