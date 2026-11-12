# National Social Security and Medicare Hospital Insurance Data Simulator

A public educational page for examining how payroll taxes, income tiers, tariffs, and eligibility ages change the Social Security and Medicare Hospital Insurance trust funds. No account is required and nothing is installed.

The package you build is the solid line. Current Law stays on the charts as the dashed line. The projection is an illustration calibrated to the 2026 Trustees’ intermediate assumptions. It is not an official projection from the Social Security Administration or the Centers for Medicare & Medicaid Services, and it does not calculate anyone’s own benefits.

Parts B and D are described on the page and are left out of the trust-fund math. Their premiums and general-revenue transfers are reset each year, so they do not have a depletion date.

## Open it on your computer

A ZIP of the web files is in this folder under the name `solvencysimulator.zip`. Unzip it, then open `index.html` to open the simulator page. The same link is in the page footer.

The page is plain HTML, CSS, and JavaScript. There is no build step. The scripts are classic scripts, so opening the file directly works.

1. Open the project folder, or unzip `solvencysimulator.zip`.
2. Double-click `index.html`, or run:

```bash
start index.html
```

On macOS or Linux, open `index.html` in a browser instead of `start`.

The charts redraw as soon as you move a slider. If a browser blocks local scripts, serve the folder and open the address it prints:

```bash
python -m http.server 8080
```

Then visit `http://localhost:8080`.

## What you can change

The controls sit in **Select the ages and Simulate the payroll tax tiers**. **Reset to Current Law** restores the starting page.

- Full retirement age (67), earliest Social Security claiming age (62), and the Medicare Part A eligibility age (65)
- How fast an age change phases in, in months of age per year (2)
- The year the package should remain solvent through (2075)
- The January 1 start date for rate and age changes (2027)
- A National Social Security tariff and a National Medicare tariff on pay above $10 million (7% and 3%). These are optional and are left out of Current Law. Split evenly, or have the employer pay the whole tariff. Either way the trust funds receive the full amount, and the tariff does not raise a benefit.
- An optional annual transfer from other federal funds to the trust funds, in billions of 2026 dollars (starts at 0). The same amount goes to Social Security and to Medicare hospital insurance each year through 2100. Social Security’s share follows today’s 12.4% split, about 85% to retirement and survivors and about 15% to disability.
- **Payroll tax to employer-paid health insurance (optional).** A proposed 2% charge on the premium the employer pays to the health insurance company. The worker’s own premium payment is not taxed again. The 2% is split evenly between the worker and the employer. It is not Current Law. Checking the box deposits about $21 billion a year into Medicare hospital insurance only. Social Security and disability receive none. It does not raise benefits.
- Two proposed deposits under that transfer. Both are left unchecked for today’s rules. Checking a box deposits that estimate into each trust fund each year through 2100. The money does not raise benefits and it does not change the wage-tax rates. Disability is not given a share. Combined Social Security still improves, because the retirement deposit is inside that total.
  - **Broader income tax.** A proposed 4% tax on realized capital gains, dividends, and taxable interest. The estimate is $39.6 billion a year to retirement and survivors and $21.1 billion a year to hospital insurance, in 2026 dollars.
  - **Stock-trade tariff.** A proposed 0.38% charge on the dollars in each US stock sale. The estimate is $243 billion a year to retirement and survivors and $129.5 billion a year to hospital insurance, in 2026 dollars.
- **Slower yearly benefit increase (optional).** A proposed switch from today’s Social Security cost-of-living raise to the chained consumer price index, about 0.3 percentage points less each year. It is not Current Law. The first check stays the same. People already getting benefits receive the smaller raise. Retirement, survivors, and disability are included. Medicare hospital insurance is not. With the January 1 year at 2027, the first smaller checks are paid in 2028.
- Income tiers, described below

**Run the Simulator** fills the income tiers for the ages and the solvency year on the form. Changing the full retirement age, the earliest claim age, or the Medicare age away from 67, 62, and 65 does the same. Phase-in months do not.

## Income tiers

A simulation uses four bands. Current Law keeps today’s tax schedule, so those bands stay off the trust-fund math until you choose Simulation or run the simulator. Each tier on the page shows an approximate share of workers with earnings in that band. Almost all workers are in Tier 1. The upper bands are a very small share of workers and a larger share of wages.

| Band | Earnings, in 2026 dollars | What a simulation does |
| --- | --- | --- |
| Tier 1 | Through $1,000,000 | One rate for the whole band. The simulator tries to keep Social Security at or under 13.45% and Medicare at or under 3.65%. That limit is the Tier 1 soft cap. |
| Tier 2 | Through $5,000,000 | Can rise by as much as 4 percentage points above Tier 1, which takes a little of the load off Tiers 3 and 4. |
| Tier 3 | Through $10,000,000 | Takes the rate still needed after Tier 2 has used that 4-point step. |
| Tier 4 | Above $10,000,000 | Rises with Tier 3. Also carries the 7% Social Security tariff and the 3% Medicare tariff. Those tariffs are separate from the payroll-rate sliders. |

Current Law is a different schedule inside the wide Tier 1 band. Social Security is 12.4% through the 2026 wage base of $184,500 and 0% above it. Medicare hospital insurance is 2.9% through $200,000 and 3.8% above that, including the 0.9% Additional Medicare Tax. The model wage base remains $184,500.

**Remove the Tier 1 soft cap** sits above Run the Simulator. It is not Current Law. Leave it unchecked to keep the 13.45% and 3.65% limits. Check it and the simulator uses about the same rate on every tier. Checking or unchecking the box runs the simulator. With the proposed deposits off, the federal transfer at 0, and a full retirement age of 65, that rate is about 15.5% for Social Security and about 3.8% for hospital insurance, and no extra federal transfer is needed. At today’s full retirement age of 67, with those same boxes off, Social Security is about 14.4% and hospital insurance stays about 3.8%. If either proposed deposit is checked, the even rate is lower.

After the income tiers, **Back to the Solvency Simulation Summary Report** returns to the top of that report.

On Tiers 2, 3, and 4, an optional choice lets the employer pay the entire Social Security and Medicare payroll tax. The worker pays nothing. The trust funds still receive the full combined rate, and benefits and credits stay in place. Current Law ignores that choice.

You can edit any tier by hand. If you change a tier’s Social Security or Medicare rate, the tiers under it move down when they can, so the schedule still rises. The tiers above the one you changed stay put. Rates below are cut further only when the selected solvency year is still reached. Social Security and Medicare move separately.

The income bands move with average wages. Wages above today’s wage base do not raise future benefits.

No single payroll rate goes above 40%. On the top band, the Social Security payroll rate, the Medicare payroll rate, and the Medicare tariff together stop at 45%. The Social Security tariff is outside that 45% cap.

In 2023, pay at and above $2 million was 3.052% of Social Security wages, and pay at and above $10 million was 1.043%. Those shares describe how thin the top of the wage distribution is. The source is the [Social Security wage statistics for 2023](https://www.ssa.gov/cgi-bin/netcomp.cgi?year=2023).

## Solvency Simulation Summary Report

The report at the top is the outcome of the run. It lists the settings that were used, then the System Health dates for each savings account. It updates as soon as a field changes. A note under the heading asks you to review this report often after you change a setting. The page marks itself Simulation when the form leaves the Current Law starting point, including when a proposed option is checked. When a federal transfer or a proposed deposit is on, the solid line on the charts includes that money from 2026. The employer health-insurance charge is in the Medicare hospital-insurance green line only. The slower yearly benefit increase lowers the solid red cost line for Social Security. It does not move the hospital-insurance cost line. The dashed line stays Current Law.

- **Healthy** means the account lasts through 2100 and the ending reserve is at least one year of cost.
- **Under pressure** means it lasts past 2036 and does not meet the Healthy test.
- **Critical** means it runs out by 2036.

The combined Social Security card pools the retirement account and the disability account. In current law those accounts are separate.

When combined Social Security or Medicare hospital insurance runs out on or before **Remains solvent until this year**, a red note under the status paragraph names the change with the largest gain.

- If a proposed deposit is checked, the note says those dates already include it.
- For Social Security, the largest gain is **Income tiers**: raise the Tier 1 Social Security rate toward 13.45%. Once that rate is already near 13.45%, or the Tier 1 soft cap is already off, the note points to the federal transfer.
- For Medicare hospital insurance, the note points to the federal transfer.

The note is hidden when both accounts already last past the year you picked.

## PDF report

**Create PDF of this Report** sits above the Solvency Simulation Summary Report. It writes a report of the numbers currently on the page. It uses the browser’s print window. Choose **Save as PDF**. No extra software and no plugin are required.

The file name and the top of every page include the date and time of that run. Each section starts on its own page, at its heading. A heading stays with the paragraph, table, or chart under it, so a title is not left alone at the bottom of a page. The pages follow the screen:

- Solvency Simulation Summary Report, with the review note, the settings for the run, and System Health for retirement and survivors, combined Social Security, and Medicare hospital insurance
- Settings used for the run, including the income tiers, then a line back to the Solvency Simulation Summary Report
- Charts for each of the three funds. The solid line is this run. The dashed line is Current Law.
- How much tax each band pays, when a simulation is on
- What the tool does and does not do, then the same educational notice as the page footer

## Check the Current Law dates

From this folder:

```bash
node scripts/check-current-law.js
```

Current Law in this model runs out in the fourth quarter of 2032 for retirement and survivors, the third quarter of 2034 for combined Social Security, and the second quarter of 2033 for Medicare Hospital Insurance. Disability Insurance lasts through 2100. Payable shares land within about two points of the official 78%, 83%, and 89% figures. The same script checks the tier schedule, the soft cap that lets Tier 2 rise by as much as 4 percentage points above Tier 1, and that the main levers move the funds.

## Put it on the web later

Upload this folder to any static host (GitHub Pages, Netlify, Cloudflare Pages, or a simple web server). Point the site at `index.html`. Do not add a build command.

Keep `model.js`, `app.js`, `styles.css`, `index.html`, and `data/earnings.js` together. The page loads those files with ordinary script tags.

## Layout

- `index.html` is the page.
- `styles.css` is the layout.
- `app.js` reads the controls, writes the health report, draws the charts, and builds the PDF report.
- `model.js` is the year-by-year projection and the tax solver.
- `data/` holds the earnings assumption and published anchor tables. The page does not fetch the CSV files.
- `scripts/check-current-law.js` checks the depletion dates and that the main levers move the funds.

Figures for program size come from the [2026 Trustees summary](https://www.ssa.gov/oact/trsum/). The [Medicare Enrollment Dashboard](https://data.cms.gov/tools/medicare-enrollment-dashboard) did not return enrollment counts as readable text, so Hospital Insurance enrollment is the 2026 Medicare Trustees figure cited on the page. The page’s **What this tool does and does not do** section lists the rest of the sources and the simplified methodology.

## Footer

This web application and its source code are purely for educational use. They do not represent any official government or non-governmental entity. They are not affiliated with, endorsed by, or a product of the Social Security Administration, the Centers for Medicare & Medicaid Services, or any other government agency or private organization. This is not an official projection. It is not legal, tax, financial, or benefits advice, and it does not calculate anyone’s own benefits. The numbers are a simplified picture drawn from the official 2026 reports, and they can differ from those reports. Do not use them to claim benefits, file taxes, or decide policy. The application and the source code are provided as is, with no warranty.

This is free, open-source software. You may use it and share it.

[Click here for the Zip file if you wish to place the web files on your own local computer.](solvencysimulator.zip)

Created by Ron Velez, Founder, iCertify Services LLC. Any comments or suggestions can be sent to [ronvelez@icertifyservices.com](mailto:ronvelez@icertifyservices.com).
