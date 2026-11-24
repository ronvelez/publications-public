# Next Chapter: Pre-Divorce Clarity & Readiness Planner

**Version 1.3.1.** A free public-service worksheet for women and men who are thinking about divorce and do not know where to start. It is meant for a first private look: what the process often involves, a reminder that family, friends, and professional services are available and that it is best not to plan alone, a rough monthly money picture, a home sketch, and a starter list of papers. It is educational. It is not legal, tax, or financial advice, and it does not calculate what a court, mediator, or agreement would decide.

`next-chapter-planner-v1.2.zip` is the original import. The files in this folder are the current version.

---

## What the page does

1. **Keeps entries on the page, then can erase them.** Nothing is written to `localStorage`, `sessionStorage`, cookies, or a project server. Quick Exit and the Esc key clear the form, the totals, added checklist steps, and the generated prompt, try to clear the clipboard, and open a weather site. Use a private window if someone else uses the device.

2. **Names a place from a ZIP prefix.** A 5-digit ZIP is matched in memory to a state, territory, district, or military mail code. Military mail codes and unrecognized prefixes do not change the search links. Recognized states, territories, and the District of Columbia are added to some outbound searches. The page says, before you click, which links include the ZIP.

3. **Compares a household total with a solo total.** Type a monthly amount or use a slider. Sliders are an explorer: under $10,000 they step by about $200, and from $30,000 to $100,000 they step by about $3,000 to $4,000. The typed box keeps the exact dollar, up to $100,000 a month. Alimony and child support are amounts you type and mark Receive or Pay. For a state-by-state child-support estimate, the page links to [statechildsupportcalc.com](https://statechildsupportcalc.com/) (all 50 states and Washington, D.C.). For a plain-language overview of spousal support by state, it links to the [state spousal-support guidelines guide](https://spousalsupportcalc.com/guides/state-spousal-support-guidelines/). Both sites are separate. A person can type a monthly figure from either one back into the matching box. The official statute searches remain on the page.

4. **Shows a rough home-equity figure.** Approximate value minus remaining mortgage, before selling costs or a division decision. Monthly property tax is shown beside it and is not added to the living-expense totals.

5. **Opens outside resources only when you click.** College tools, a therapist directory, and the National Domestic Violence Hotline do not receive your ZIP from this page. Apartment, mediator, and attorney searches can include the ZIP and place name. The hotline block is omitted from the printed worksheet.

6. **Offers an optional text prompt for a chatbot the person already uses.** It is a convenience copy of the on-screen answers. Before the text is written, exact dollars, the ZIP code, notes, and checklist wording are removed. The page has no name, street address, phone, email, or account fields. The site does not send the prompt and is not connected to any outside AI system. The screen tells the person to read the text and to be careful about what they paste into a separate chatbot.

7. **Prints a short worksheet.** Print or save a PDF for the cash-flow comparison, home lines, checklist, and notes. The safety bar, directions, sliders, and outside links stay off the paper.

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

---

## Disclaimer

This tool is a first step for education and personal organization. Rough numbers are enough. Talk with a qualified professional and read official statutes before you rely on a figure.

The website is a free public service. It does not collect PII. Copyright © 2026 Ron Velez, Founder, iCertifyServices LLC. Permission is granted to copy and share this website code. Attribution is not required. The code is provided as is, without warranty. The same grant is in `LICENSE` and in a hashed-out HTML comment in `index.html`.
