# rorschach

Tools for fund LPs and GPs.

## lp-analytics

A single-file track record analyzer for venture funds. You load a GP's fund cash flows and portfolio company data, and it shows net performance, return concentration, follow-on discipline, company progress and scenarios.

- `lp-analytics/app.template.html` is the source.
- The Brand fields in the Data panel take your colours (hex, `rgb()` or names, in order) and a font (installed locally or from Google Fonts). They restyle the page, the charts, the PNG downloads and the HTML report, and they're saved in the browser and in workspace files. The Excel workbook carries figures only: the spreadsheet library the app uses can't write fonts or fills.
- `python3 lp-analytics/build.py` bakes `lp-analytics/sample/*.csv` into `lp-analytics/index.html`, which opens straight from disk with no server.
- `cd lp-analytics/sample && python3 generate.py` regenerates the mock three-fund sample data.
- `lp-analytics/reel/` holds a muted, seamlessly looping ~28-second reel of the app for use as a background video (for example behind a signup form). `out/` has light and dark cuts as 1080p MP4 and WebM, a 720p MP4 for phones, and poster frames. `signup.html` is an example page that plays the matching reel behind a signup card and holds on the poster for people who prefer reduced motion. To re-record after changing the app, run `python3 lp-analytics/build.py`, then `node lp-analytics/reel/record.js` and `node lp-analytics/reel/record.js --theme dark`. This needs Playwright and ffmpeg. The recorder runs the real app on a virtual clock, one frame at a time, so the Chart.js animations come out smooth.

The history was moved over from `acldxyz/personal-site` (branch `claude/amazing-heisenberg-48gqo9`).
