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

Files:

- `lp-analytics/app.template.html` and `lp-analytics/exposure.template.html` are the sources.
- `python3 lp-analytics/build.py` bakes the sample CSVs into `index.html` and `exposure.html`.
- `cd lp-analytics/sample && python3 generate.py` regenerates the mock three-fund sample data for the fund performance module; `python3 generate_exposure.py` regenerates the mock ten-fund LP portfolio for the exposure module.

The history was moved over from `acldxyz/personal-site` (branch `claude/amazing-heisenberg-48gqo9`).
