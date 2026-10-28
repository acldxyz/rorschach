# Exposure Model

An LP's look-through view across all its managers. Load your fund commitments and each fund's schedule of investments (holdings, required), and every position is scaled to your share of the fund. It shows:

- exposure to every company across all your funds: concentration, sector mix, and which companies more than one manager holds
- a drill-down for each company: who owns what, who invested in which round, how each fund marks each security, and the exit value that returns 3x or 4x (or any target you set) to you, gross or net of carry, compared with the value implied by today's marks
- manager overlap, and the same security held at different marks
- manager and fund summaries, including how much of your NAV sits in companies another of your managers also holds

The exit assumptions (dilution before exit, target multiples, gross or net of carry) sit with the analyses, since they change the results rather than the data.

See the [root README](../README.md) for the features both products share and how to build.

## Files

- `template.html`: the product's page, built into `index.html` by `python3 build.py` at the repo root.
- `sample/`: the fictional ten-fund LP portfolio. `cd exposure-model/sample && python3 generate_exposure.py` regenerates it.
