# Baseline data

The page does not fetch these files. Opening `index.html` directly cannot read them, and the working projection lives in `model.js`.

`oasdi-annual.csv` and `hi-annual.csv` hold published anchor points from the 2026 Trustees Reports. A later version can replace the smoothed curves in `model.js` with a full year-by-year table dropped here.

`earnings.js` is loaded by the page. It holds the earnings-distribution assumption used for income tiers. Pay under $2 million follows that pattern. The page states the thin tail above that from the 2023 Social Security wage statistics: 3.052% of wages at and above $2 million, and 1.043% at and above $10 million. Those two shares are cited on the page and used in the model. They are not rows in the CSV files. The source is https://www.ssa.gov/cgi-bin/netcomp.cgi?year=2023.
