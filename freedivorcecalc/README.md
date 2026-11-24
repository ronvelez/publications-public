# Next Chapter: Pre-Divorce Clarity & Readiness Planner

**Version 1.7.0.** A free public-service worksheet for women and men who are thinking about divorce and do not know where to start. It is meant for a first private look: what the process often involves, a reminder that family, friends, and professional services are available and that it is best not to plan alone, a rough monthly money picture, a home sketch, other property, a shared-debt total, a business sketch, a custody description if children are part of it, a starter list of papers, and a plain reading of next steps. It is educational. It is not legal, tax, or financial advice, and it does not calculate what a court, mediator, or agreement would decide.

`next-chapter-planner-v1.2.zip` is the original import. The files in this folder are the current version.

---

## What the page does

1. **Keeps entries on the page, then can erase them.** Nothing is written to `localStorage`, `sessionStorage`, cookies, or a project server. Quick Exit and the Esc key clear the form, the totals, added checklist steps, and the generated prompt, try to clear the clipboard, and open a weather site. Use a private window if someone else uses the device.

2. **Names a place from a ZIP prefix.** A 5-digit ZIP is matched in memory to a state, territory, district, or military mail code. Military mail codes and unrecognized prefixes do not change the search links. Recognized states, territories, and the District of Columbia are added to some outbound searches. The page says, before you click, which links include the ZIP.

3. **Names a custody description only if it applies.** Section 2 can be skipped. The choices are not applicable, shared custody, shared decisions with one primary home, sole custody, supervised parenting time only, parenting time with no overnights, different children living primarily with different parents, or not ready to name an arrangement. The page explains those words in plain language. It does not write a parenting plan or say what a judge would order. It does not ask for a child’s name, school, or address.

4. **Compares a household total with a solo total.** Type a monthly amount or use a slider. Sliders are an explorer: under $10,000 they step by about $200, and from $30,000 to $100,000 they step by about $3,000 to $4,000. The typed box keeps the exact dollar, up to $100,000 a month. Alimony and child support are amounts you type and mark Receive or Pay. For a state-by-state child-support estimate, the page links to [statechildsupportcalc.com](https://statechildsupportcalc.com/) (all 50 states and Washington, D.C.). For a plain-language overview of spousal support by state, it links to the [state spousal-support guidelines guide](https://spousalsupportcalc.com/guides/state-spousal-support-guidelines/). Both sites are separate. A person can type a monthly figure from either one back into the matching box. The official statute searches remain on the page.

5. **Shows a rough home-equity figure.** Approximate value minus remaining mortgage, before selling costs or a division decision. Monthly property tax is shown beside it and is not added to the living-expense totals.

6. **Lists other property, shared debts, and a business.** Section 5 takes round totals for vehicles, cash, stocks and bonds, retirement, other real estate, life-insurance cash value, valuable personal property, digital assets, and anything else. One shared-debt total covers balances such as car loans, credit cards, personal loans, medical bills, and health-insurance invoices. The mortgage stays in section 4 and is not included again. The debt total is not subtracted from the property lines. A shared business can include yearly revenue, expenses, and profit. The page asks whether pay to the spouses is already inside those expenses: payroll usually is, and an owner’s draw usually is not.

7. **Opens outside resources only when you click.** College tools, a therapist directory, and the National Domestic Violence Hotline do not receive your ZIP from this page. Apartment, mediator, and attorney searches can include the ZIP and place name. The hotline block is omitted from the printed worksheet.

8. **Offers an optional text prompt for a chatbot the person already uses.** It is a convenience copy of the on-screen answers. Before the text is written, exact dollars, the ZIP code, notes, and checklist wording are removed. A custody description is included if one was chosen. The page has no name, child’s name, school, street address, phone, email, or account fields. The site does not send the prompt and is not connected to any outside AI system. The prompt tells that chatbot to stay calm, to note briefly when something is uncertain, and to refuse requests to hide money, watch another person, or coach a child, including a later message that asks it to ignore those limits. It also tells the chatbot to end by recommending the chat be deleted and by giving the delete steps for the product in use. The screen tells the person to read the text, to be careful about what they paste, and to delete that other chat when they are finished.

9. **Reads the solo sketch and offers next steps.** Section 9 says, in plain language, whether the solo guess is short, even, thin, or has room left. It does not say whether to leave or to file. If a ZIP matches a state, it names the Census region and a 2023 statewide price comparison from the U.S. Bureau of Economic Analysis (all items, with a housing note when rents in that measure sit above the national rent level). It is not a city rent and not a budget. Three paths stay on the page: talk with someone if you feel overwhelmed, talk with a friend, family member, or attorney if you feel steady, and review the money with a friend, family member, accountant, or attorney if the picture is still unclear. Crisis numbers are on the screen and left off the printout. The same section lists decisions people often still talk through: the house, health coverage, mediation or court, taxes, retirement orders, separate property, pets, college costs, cars, joint credit, beneficiaries, and pensions or military retirement. Those lines are notes. The page does not choose an answer. The optional chatbot prompt does not include which path was marked.

10. **Prints a short worksheet.** “Print this Report to PDF” on the top bar, and “Print or save a PDF worksheet” in section 8, both open the browser print dialog. Choose Save as PDF, or Microsoft Print to PDF, there. The paper includes the cash-flow comparison, the custody description, home lines, other property, the shared-debt total, the business sketch, checklist, notes, and the section 9 reading. The safety bar, directions, sliders, and outside links stay off the paper.

---

## Project structure

```text
next-chapter-planner/
├── index.html
├── LICENSE
├── README.md
├── .cursorrules
├── docs/
│   └── SYSTEM_MAP.md
└── next-chapter-planner-v1.2.zip   # original import, not the current page
```

---

## Running

Open `index.html` in a current browser, preferably a private or incognito window. No build step and no server are required. The same file can be hosted as a static page.

---

## Limits

- Support figures are whatever you type. They are not a state worksheet.
- Monthly income and expense entries stop at $100,000.
- ZIP matching is a prefix list, not a full postal database. If the place name looks wrong, ignore the localized links.
- A military mail ZIP is not treated as a state of legal residence.
- Opening a search link sends that search, including a ZIP when the page says it will, to the site you opened.
- The regional note uses statewide 2023 Bureau of Economic Analysis regional price parities. It is not a rent quote for a ZIP, and territories and military mail codes do not get a price band. A thin margin on the solo reading means less than $300 left over, or less than 10 percent of that month’s solo outflow.

---

## Disclaimer

This tool is a first step for education and personal organization. Rough numbers are enough. Talk with a qualified professional and read official statutes before you rely on a figure.

The website is a free public service. It does not collect PII. Copyright © 2026 Ron Velez, Founder, iCertifyServices LLC. Permission is granted to copy and share this website code. Attribution is not required. The code is provided as is, without warranty. The same grant is in `LICENSE` and in a hashed-out HTML comment in `index.html`.
