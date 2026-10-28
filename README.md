# rorschach

Tools for fund LPs and GPs.

## lp-analytics

Two single-file modules that link to each other and open straight from disk with no server.

**Fund performance** (`index.html`): a track record analyzer for one venture GP. You load the GP's fund cash flows and portfolio company data, and it shows net performance, return concentration, follow-on discipline, company progress and scenarios.

**LP exposure** (`exposure.html`): the LP's look-through view across all its managers. You load your fund commitments and each fund's schedule of investments, and it scales every position to your share of the fund. It shows:

- exposure to every company across all your funds: concentration, sector mix, and which companies more than one manager holds
- a drill-down for each company: who owns what, who invested in which round, how each fund marks each security, and the exit value that returns 3x or 4x (or any target you set) to you, gross or net of carry, compared with the value implied by today's marks
- manager overlap, and the same security held at different marks
- manager and fund summaries, including how much of your NAV sits in companies another of your managers also holds

Both modules open empty, showing nothing but a welcome card that asks how to start: upload your own files, open a saved workspace (fund performance only), or use the fictional sample data. The rest of the page appears once a choice is made, and the card comes back on its own whenever nothing is loaded, for example after Clear.

Each module then has two views, switched at the top of the page: **Analysis** (the charts and tables, with their own tabs) and **Data**. Every load (an upload, a workbook, the sample or a workspace) lands on Data, which lists what was identified: a card per kind of data with its source (file, sheet and header row), rows read, used and skipped (with the reasons), the fields found, the fields the app works out itself, and the columns it ignored. Pick a field to audit it: a pane draws the source sheet itself, with Excel's column letters and row numbers, each mapped column tinted and labelled with the field it feeds (the picked one outlined), ignored columns greyed, title rows above the header dimmed, skipped rows hatched with the reason, and rows marked by category (cash flows as Contribution, Distribution or NAV after the type mapping; company history as funding rounds or quarterly reports; staff by level), with a key you can click to switch fields. Click a cell, or move with the arrow keys, to see its raw value, the field it feeds and the value the app used. Long sheets show 60 rows at a time, with earlier/later rows and Go to row. The pane also shows which column and header the field came from and how it was matched, what the app did to it (dates read, units scaled, signs set, type labels counted, percentages read), and sample rows with each source cell (`Cash Flows!F7`) beside the value the app uses, with a toggle for all rows. Data also holds the uploads, workspace buttons, units, currency, benchmark (fund performance) and Brand settings; the exposure module's exit assumptions stay with Analysis. **Add data** in the Analysis view opens a file, recognises what kind of data it holds and asks you to confirm in the Data view. The Excel download has a **Sources** sheet (one row per kind and field: source file, sheet, column, header, how matched, transform, rows used and skipped), and the HTML report opens with the Data view's summary. Fund performance workspaces keep these source details, including each sheet as read (up to 5,000 rows by 60 columns), so the grid survives a reopen; older workspaces still open, with a reduced grid of the mapped columns or a note that the details weren't saved.

Firms often keep everything in one Excel workbook. Upload a workbook with several sheets (to any of the data upload boxes, or through the welcome card) and each module works out which kind of data each sheet holds, from its column headers, its tab name and, for cash flows, a column of Contribution/Distribution/NAV labels. A short list shows every sheet with its first headers and the guess, which you can change or set to Not used; **Load these** then loads each chosen sheet in turn, through the fund performance module's column matching step where a sheet needs it. CSVs and single-sheet workbooks load as before.

A Light/Dark toggle sits at the top of each module. It follows the system setting until you pick one, and the choice is kept in the browser. Downloads (PNG, HTML report) always come out light, whatever theme is showing.

Both modules have Brand fields in their Data view. They take your colours (hex, `rgb()` or names, in order) and a font (installed locally or from Google Fonts), and restyle the page, the charts, the PNG downloads and the HTML report. **Load colour template** fills both from the firm's Office template or theme (`.potx`, `.pptx`, `.thmx`, `.dotx`, `.docx`, `.xltx`, `.xlsx`): the theme's six accent colours in order, and its body font (the heading font is mentioned in the note). It also takes a text, CSV or JSON list of colour codes, with an optional `font: Name` line. They're saved in the browser, shared by the two modules when both are opened from the same place, and the fund performance module also keeps them in workspace files. The Excel workbook carries figures only: the spreadsheet library the app uses can't write fonts or fills.

Files:

- `lp-analytics/app.template.html` and `lp-analytics/exposure.template.html` are the sources; `brand.css`, `brand.js` and `brand.html` hold the Brand feature both share, `theme.css`, `theme.js` and `theme.html` the Light/Dark toggle, `workbook.js` and `workbook.css` the multi-sheet workbook proposal, and `dataview.js` and `dataview.css` the Data view with its source audit.
- `python3 lp-analytics/build.py` inlines those partials and bakes the sample CSVs into `index.html` and `exposure.html`.
- `python3 lp-analytics/build.py --artifact OUTDIR --perf-url URL --exp-url URL` also writes the two pages for publishing as private claude.ai artifacts, with the module links pointing at each other's published URLs.
- `cd lp-analytics/sample && python3 generate.py` regenerates the mock three-fund sample data for the fund performance module; `python3 generate_exposure.py` regenerates the mock ten-fund LP portfolio for the exposure module.
- `lp-analytics/reel/` records a muted, seamlessly looping ~28-second reel of the fund performance module, for use as a background video; `signup.html` is an example page that plays it behind a signup card. Run `python3 lp-analytics/build.py`, then `node lp-analytics/reel/record.js` (add `--theme dark` for the dark cut). It needs Playwright and an ffmpeg with libx264, libvpx-vp9 and the xfade filter (set `FFMPEG` to point at one). Renders (MP4, WebM, posters) go to `lp-analytics/reel/out/`, which git ignores, so they stay local: host them wherever the signup page is served.

The history was moved over from `acldxyz/personal-site` (branch `claude/amazing-heisenberg-48gqo9`).
