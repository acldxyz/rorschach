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

Both modules open empty, with a welcome card that asks how to start: upload your own files, open a saved workspace (fund performance only), or use the fictional sample data. The card comes back whenever nothing is loaded, for example after Clear.

A Light/Dark toggle sits at the top of each module. It follows the system setting until you pick one, and the choice is kept in the browser. Downloads (PNG, HTML report) always come out light, whatever theme is showing.

Both modules have Brand fields in their Data panel. They take your colours (hex, `rgb()` or names, in order) and a font (installed locally or from Google Fonts), and restyle the page, the charts, the PNG downloads and the HTML report. They're saved in the browser, shared by the two modules when both are opened from the same place, and the fund performance module also keeps them in workspace files. The Excel workbook carries figures only: the spreadsheet library the app uses can't write fonts or fills.

Files:

- `lp-analytics/app.template.html` and `lp-analytics/exposure.template.html` are the sources; `brand.css`, `brand.js` and `brand.html` hold the Brand feature both share, and `theme.css`, `theme.js` and `theme.html` the Light/Dark toggle.
- `python3 lp-analytics/build.py` inlines those partials and bakes the sample CSVs into `index.html` and `exposure.html`.
- `python3 lp-analytics/build.py --artifact OUTDIR --perf-url URL --exp-url URL` also writes the two pages for publishing as private claude.ai artifacts, with the module links pointing at each other's published URLs.
- `cd lp-analytics/sample && python3 generate.py` regenerates the mock three-fund sample data for the fund performance module; `python3 generate_exposure.py` regenerates the mock ten-fund LP portfolio for the exposure module.
- `lp-analytics/reel/` records a muted, seamlessly looping ~28-second reel of the fund performance module, for use as a background video; `signup.html` is an example page that plays it behind a signup card. Run `python3 lp-analytics/build.py`, then `node lp-analytics/reel/record.js` (add `--theme dark` for the dark cut). It needs Playwright and an ffmpeg with libx264, libvpx-vp9 and the xfade filter (set `FFMPEG` to point at one). Renders (MP4, WebM, posters) go to `lp-analytics/reel/out/`, which git ignores, so they stay local: host them wherever the signup page is served.

The history was moved over from `acldxyz/personal-site` (branch `claude/amazing-heisenberg-48gqo9`).
