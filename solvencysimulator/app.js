/* Page wiring. Reads the controls, runs the projection, and redraws the cards and charts. */
(function () {
  "use strict";

  var model = window.SolvencyModel;
  var currentLaw = model.project(model.defaultScenario());
  var quarters = {
    Q1: "first quarter",
    Q2: "second quarter",
    Q3: "third quarter",
    Q4: "fourth quarter"
  };
  var packageOn = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function selected(name) {
    var node = document.querySelector('input[name="' + name + '"]:checked');
    return node ? node.value : "";
  }

  function svgEl(name, attrs) {
    var el = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.keys(attrs).forEach(function (key) {
      el.setAttribute(key, attrs[key]);
    });
    return el;
  }

  function bindPair(rangeId, numberId) {
    var range = byId(rangeId);
    var number = byId(numberId);
    range.addEventListener("input", function () {
      number.value = range.value;
    });
    number.addEventListener("input", function () {
      var value = Number(number.value);
      if (!isFinite(value)) return;
      var min = Number(range.min);
      var max = Number(range.max);
      range.value = String(Math.min(max, Math.max(min, value)));
    });
  }

  function formulaPiece(id, label, total) {
    return '<label class="formula-field' + (total ? " formula-total" : "") + '">' +
      "<span>" + label + "</span>" +
      '<output id="' + id + '"></output></label>';
  }

  function formulaLine(rateId, rateLabel, tariffId, tariffLabel, totalId, totalLabel) {
    return '<div class="formula-line">' +
      formulaPiece(rateId, rateLabel, false) +
      '<span class="formula-op" aria-hidden="true">+</span>' +
      formulaPiece(tariffId, tariffLabel, false) +
      '<span class="formula-op" aria-hidden="true">=</span>' +
      formulaPiece(totalId, totalLabel, true) +
      "</div>";
  }

  function tariffFormula() {
    return '<div class="rate-formula" id="tier-tariff-note">' +
      formulaLine(
        "formula-ss-rate", "Social Security combined rate",
        "formula-ss-tariff", "National Social Security tariff",
        "formula-ss-total", "Total Social Security rate"
      ) +
      formulaLine(
        "formula-hi-rate", "Medicare hospital insurance combined rate",
        "formula-hi-tariff", "National Medicare tariff",
        "formula-hi-total", "Total Medicare hospital insurance rate"
      ) +
      '<p class="hint" id="tier-tariff-aside"></p></div>';
  }

  function tierField(id, label, min, max, step, value) {
    return (
      '<div class="control">' +
      '<label for="' + id + '-num">' + label + "</label>" +
      '<input id="' + id + '-num" type="number" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '">' +
      '<input id="' + id + '" class="range" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '">' +
      "</div>"
    );
  }

  function buildTiers() {
    var tiers = model.defaultTiers();
    var html = "";
    for (var i = 0; i < tiers.length; i++) {
      if (i === 1) {
        html += '<div class="upper-payer">' +
          '<p class="hint">Optional for Tiers 2, 3, and 4. The employer can pay the entire Social Security and Medicare tax on these bands. The worker pays nothing. The savings accounts still receive the full tax. Benefits stay full, and those wages still count toward a future benefit the same way they do when the tax is shared.</p>' +
          '<div class="segmented" role="radiogroup" aria-label="Who pays the tax on Tiers 2, 3, and 4">' +
          '<label><input type="radio" name="upper-payer" value="split" checked> Worker and employer share the tax</label>' +
          '<label><input type="radio" name="upper-payer" value="employer"> Employer pays the entire tax</label>' +
          "</div></div>";
      }
      var last = i === tiers.length - 1;
      var title = "Tier " + (i + 1);
      if (last) title += tiers[i - 1] && Number(tiers[i - 1].upTo) === 10000000 ? ", $10,000,000 and above" : ", and above";
      html += '<div class="tier"><h3>' + title +
        ' <span class="mode-flag" id="tier-flag-' + i + '">Current Law</span></h3>';
      html += '<p class="hint law-ref" id="tier-law-' + i + '" hidden>' + currentLawTierText(i) + "</p>";
      if (i >= 1) {
        html += '<p class="employer-note" id="tier-pay-note-' + i + '"></p>';
      }
      if (!last) {
        html += tierField("tier-upto-" + i, "Earnings up to, in 2026 dollars", 20000, 50000000, 1000, tiers[i].upTo);
      } else {
        html += "<p class=\"hint\">Earnings above $10,000,000.</p>";
      }
      html += tierField("tier-oasdi-" + i, "Social Security combined rate", 0, 40, 0.01, tiers[i].oasdi);
      html += tierField("tier-hi-" + i, "Medicare hospital insurance combined rate", 0, 40, 0.01, tiers[i].hi);
      if (last) html += tariffFormula();
      html += '<p class="hint" id="tier-workers-' + i + '"></p>';
      html += "</div>";
    }
    byId("tier-list").innerHTML = html;
    for (var j = 0; j < tiers.length; j++) {
      if (j < tiers.length - 1) bindPair("tier-upto-" + j, "tier-upto-" + j + "-num");
      bindPair("tier-oasdi-" + j, "tier-oasdi-" + j + "-num");
      bindPair("tier-hi-" + j, "tier-hi-" + j + "-num");
      byId("tier-oasdi-" + j).addEventListener("change", onTierRateChange);
      byId("tier-oasdi-" + j + "-num").addEventListener("change", onTierRateChange);
      byId("tier-hi-" + j).addEventListener("change", onTierRateChange);
      byId("tier-hi-" + j + "-num").addEventListener("change", onTierRateChange);
    }
  }

  function fillTiers(tiers) {
    for (var i = 0; i < tiers.length; i++) {
      if (i < tiers.length - 1 && tiers[i].upTo != null) {
        byId("tier-upto-" + i + "-num").value = tiers[i].upTo;
        var upRange = byId("tier-upto-" + i);
        upRange.value = String(Math.min(Number(upRange.max), Math.max(Number(upRange.min), tiers[i].upTo)));
      }
      byId("tier-oasdi-" + i + "-num").value = tiers[i].oasdi;
      byId("tier-oasdi-" + i).value = tiers[i].oasdi;
      byId("tier-hi-" + i + "-num").value = tiers[i].hi;
      byId("tier-hi-" + i).value = tiers[i].hi;
    }
  }

  function readTier0() {
    return null;
  }

  function employerPaysUpper() {
    return selected("upper-payer") === "employer";
  }

  function readTiers() {
    var count = tierCount();
    var pays = employerPaysUpper();
    var tiers = [];
    for (var i = 0; i < count; i++) {
      tiers.push({
        upTo: i === count - 1 ? null : Number(byId("tier-upto-" + i + "-num").value),
        oasdi: Number(byId("tier-oasdi-" + i + "-num").value),
        hi: Number(byId("tier-hi-" + i + "-num").value),
        employerPays: i >= 1 && pays
      });
    }
    return tiers;
  }

  function tierCount() {
    var count = 0;
    while (byId("tier-oasdi-" + count)) count += 1;
    return count;
  }

  function roundRate(value) {
    var rate = Number(value);
    if (!isFinite(rate)) rate = 0;
    return Math.round(Math.min(40, Math.max(0, rate)) * 100) / 100;
  }

  /* A hand edit keeps the tiers above it. Tiers under it move down so the
     schedule still rises, and they drop further when the savings account
     can still reach the target year at the lower rates. */
  var relaxingTiers = false;
  function relaxTiersBelow(editedIndex, key) {
    var count = tierCount();
    var field = key === "oasdi" ? "oasdi" : "hi";
    var rates = [];
    for (var i = 0; i < count; i++) {
      rates.push(roundRate(byId("tier-" + field + "-" + i + "-num").value));
    }
    var above = rates.slice(editedIndex);

    function fitted(scale) {
      var next = rates.slice();
      for (var i = 0; i < editedIndex; i++) next[i] = roundRate(rates[i] * scale);
      for (var j = editedIndex - 1; j >= 0; j--) {
        var ceiling = roundRate(next[j + 1] - 0.01);
        if (next[j] > ceiling) next[j] = ceiling;
      }
      return next;
    }

    function lasts(trial) {
      var tiersMode = document.querySelector('input[name="mode"][value="tiers"]');
      if (tiersMode) tiersMode.checked = true;
      var scenario = withPackage(readScenario());
      if (packageOn) scenario.topTail = true;
      scenario.mode = "tiers";
      scenario.tiers = scenario.tiers.map(function (tier, i) {
        var copy = {
          upTo: tier.upTo,
          oasdi: tier.oasdi,
          hi: tier.hi,
          employerPays: tier.employerPays
        };
        copy[field] = trial[i];
        return copy;
      });
      var target = Number(byId("solve-target").value);
      var summary = model.project(scenario).summary[field === "oasdi" ? "oasdi" : "hi"];
      return summary.depletionYear == null || summary.depletionYear > target;
    }

    var best = fitted(1);
    if (lasts(best)) {
      var lo = 0;
      var hi = 1;
      for (var n = 0; n < 10; n++) {
        var mid = (lo + hi) / 2;
        var trial = fitted(mid);
        if (lasts(trial)) {
          best = trial;
          hi = mid;
        } else {
          lo = mid;
        }
      }
    }
    for (var w = 0; w < editedIndex; w++) {
      var id = "tier-" + field + "-" + w;
      setPair(id, id + "-num", best[w]);
    }
    above.forEach(function (rate, offset) {
      var id = "tier-" + field + "-" + (editedIndex + offset);
      var current = roundRate(byId(id + "-num").value);
      if (current !== rate) setPair(id, id + "-num", rate);
    });
  }

  function onTierRateChange(event) {
    if (relaxingTiers) return;
    var id = event.target.id;
    var match = id.match(/^tier-(oasdi|hi)-(\d+)(?:-num)?$/);
    if (!match) return;
    relaxingTiers = true;
    try {
      var tiersMode = document.querySelector('input[name="mode"][value="tiers"]');
      if (tiersMode) tiersMode.checked = true;
      if (match) relaxTiersBelow(Number(match[2]), match[1]);
    } finally {
      relaxingTiers = false;
    }
  }

  function readScenario() {
    var mode = selected("mode") || "current";
    var simulating = mode === "tiers" || packageOn;
    return {
      mode: mode,
      oasdiRate: 12.4,
      hiRate: 2.9,
      wageBase: 184500,
      noCap: false,
      creditBenefits: false,
      tiers: readTiers(),
      tier0: readTier0(),
      freezeBrackets: false,
      fra: Number(byId("fra-num").value),
      eea: Number(byId("eea-num").value),
      medicareAge: Number(byId("medicare-age-num").value),
      monthsPerYear: Number(byId("months-num").value),
      workerRatio: 0,
      workforceGrowth: 0,
      federalTransfer: readTransfer(),
      extraOasi: readProposed().oasi,
      extraHi: readProposed().hi,
      extraDi: readProposed().di,
      chainedCola: !!(byId("cola-option") && byId("cola-option").checked),
      chainedColaYear: Number(byId("solve-effective").value) || 2027,
      ssLevy: simulating ? (Number(byId("solve-ss").value) || 0) : 0,
      hiLevy: simulating ? (Number(byId("solve-hi").value) || 0) : 0,
      levyPayer: selected("levy-payer") === "employer" ? "employer" : "split"
    };
  }

  function readTransfer() {
    var amount = Number(byId("federal-transfer").value);
    if (!isFinite(amount) || amount < 0) return 0;
    return amount;
  }

  function readProposed() {
    var oasi = 0;
    var hi = 0;
    var di = 0;
    function add(boxId, oasiId, hiId, diId) {
      var box = byId(boxId);
      if (!box || !box.checked) return;
      if (oasiId && byId(oasiId)) {
        var oasiAmount = Number(byId(oasiId).value);
        if (isFinite(oasiAmount) && oasiAmount > 0) oasi += oasiAmount;
      }
      if (hiId && byId(hiId)) {
        var hiAmount = Number(byId(hiId).value);
        if (isFinite(hiAmount) && hiAmount > 0) hi += hiAmount;
      }
      if (diId && byId(diId)) {
        var diAmount = Number(byId(diId).value);
        if (isFinite(diAmount) && diAmount > 0) di += diAmount;
      }
    }
    add("income-option", "income-oasi", "income-hi");
    add("trade-option", "trade-oasi", "trade-hi", "trade-di");
    add("health-option", null, "health-hi");
    return { oasi: oasi, hi: hi, di: di };
  }

  function withPackage(scenario) {
    if (!packageOn) return scenario;
    scenario.effectiveYear = Number(byId("solve-effective").value);
    scenario.targetYear = Number(byId("solve-target").value);
    scenario.ssLevy = Number(byId("solve-ss").value);
    scenario.hiLevy = Number(byId("solve-hi").value);
    scenario.creditBenefits = false;
    return scenario;
  }

  function depleteText(summary) {
    if (summary.depletionYear == null) return "After 2100";
    return summary.depletionYear + ", " + (quarters[summary.quarter] || "");
  }

  function payText(summary) {
    if (summary.depletionYear == null) return "100% through 2100";
    return Math.round(summary.payableAtDepletion * 100) + "% when the savings account runs out · " +
      Math.round(summary.payable2100 * 100) + "% in 2100";
  }

  function ratioText(summary) {
    var later = summary.depletionYear != null && summary.depletionYear <= 2036
      ? "Runs out by 2036"
      : Math.round(summary.ratio2036) + "% at the start of 2036";
    return Math.round(summary.ratio2026) + "% at the start of 2026. " + later + ".";
  }

  function statusKey(status) {
    if (status === "Healthy") return "healthy";
    if (status === "Under pressure") return "pressure";
    return "critical";
  }

  function paintFund(name, summary, law) {
    var card = byId("card-" + name);
    card.dataset.status = statusKey(summary.status);
    byId("status-" + name).textContent = summary.status;
    byId("deplete-" + name).textContent = depleteText(summary);
    byId("deplete-" + name + "-law").textContent = "Current Law: " + depleteText(law);
    byId("payable-" + name).textContent = payText(summary);
    byId("payable-" + name + "-law").textContent = "Current Law: " + payText(law);
    byId("ratio-" + name).textContent = ratioText(summary);
    byId("ratio-" + name + "-law").textContent = "Current Law: " + ratioText(law);
  }

  function sameResult(a, b) {
    return a.depletionYear === b.depletionYear && a.quarter === b.quarter &&
      Math.round(a.payable2100 * 100) === Math.round(b.payable2100 * 100);
  }

  function narrative(result, scenario) {
    var oasdi = result.summary.oasdi;
    var hi = result.summary.hi;
    var lawO = currentLaw.summary.oasdi;
    var lawH = currentLaw.summary.hi;
    if (isBaseline(scenario)) {
      return "This is the Current Law path. Combined Social Security runs out in " +
        depleteText(lawO) + ". Medicare hospital insurance runs out in " + depleteText(lawH) +
        ". Disability Insurance still pays full promised benefits through 2100.";
    }
    function clause(name, summary, law) {
      if (sameResult(summary, law)) {
        return name + " still runs out in " + depleteText(summary) +
          ", the same timing as Current Law. In 2100, income covers about " +
          Math.round(summary.payable2100 * 100) + "% of promised benefits, compared with " +
          Math.round(law.payable2100 * 100) + "% under Current Law.";
      }
      if (summary.depletionYear == null) {
        return name + " pays full promised benefits through 2100 under your package. Current Law runs out in " +
          depleteText(law) + ".";
      }
      return name + " runs out in " + depleteText(summary) + " under your package, and income would then cover about " +
        Math.round(summary.payableAtDepletion * 100) + "% of promised benefits. Current Law runs out in " +
        depleteText(law) + ".";
    }
    return clause("Combined Social Security", oasdi, lawO) + " " + clause("Medicare hospital insurance", hi, lawH);
  }

  function missesTarget(summary, target) {
    return summary.depletionYear != null && summary.depletionYear <= target;
  }

  function solvencyRecommendations(result, scenario) {
    var target = Math.round(Number(byId("solve-target").value));
    if (!isFinite(target)) target = 2075;
    var oasdiShort = missesTarget(result.summary.oasdi, target);
    var hiShort = missesTarget(result.summary.hi, target);
    if (!oasdiShort && !hiShort) return "";
    var tiers = scenario.tiers || [];
    var tier1Ss = scenario.mode === "tiers" && tiers[0] ? Number(tiers[0].oasdi) : 12.4;
    var parts = ["Short of " + target + "."];
    if (scenario.chainedCola) {
      parts.push("Those dates already include the slower yearly Social Security raise.");
    }
    if ((Number(scenario.extraOasi) || 0) > 0 || (Number(scenario.extraHi) || 0) > 0) {
      parts.push("Those dates already include the proposed option checked under the federal transfer.");
    }
    if (oasdiShort) {
      parts.push("Combined Social Security runs out in " + depleteText(result.summary.oasdi) + ".");
      if (byId("even-rates") && byId("even-rates").checked) {
        parts.push("The Tier 1 soft cap is already off, so every tier is near the same rate. The largest remaining Social Security gain is the annual transfer from other federal funds.");
      } else if (tier1Ss < 13.4) {
        parts.push("The largest Social Security gain is in Income tiers: raise the Tier 1 Social Security rate toward 13.45%. That band covers the most wages.");
      } else {
        parts.push("Tier 1 Social Security is already near 13.45%. The largest remaining Social Security gain is the annual transfer from other federal funds.");
      }
    }
    if (hiShort) {
      parts.push("Medicare hospital insurance runs out in " + depleteText(result.summary.hi) + ".");
      parts.push("The largest Medicare gain is the annual transfer from other federal funds.");
    }
    return parts.join(" ");
  }

  function isBaseline(scenario) {
    return scenario.mode === "current" &&
      scenario.fra === 67 && scenario.eea === 62 && scenario.medicareAge === 65 &&
      scenario.monthsPerYear === 2 && scenario.workerRatio === 0 && scenario.workforceGrowth === 0 &&
      !(Number(scenario.federalTransfer) > 0) &&
      !(Number(scenario.extraOasi) > 0) &&
      !(Number(scenario.extraHi) > 0) &&
      !(Number(scenario.extraDi) > 0) &&
      !scenario.chainedCola;
  }

  function money(value) {
    return "$" + Number(value).toLocaleString("en-US");
  }

  function paintSummary(scenario) {
    var lead = byId("summary-lead");
    var list = byId("summary-params");
    if (!lead || !list) return;
    var simulating = scenario.mode === "tiers" || packageOn;
    lead.textContent = isBaseline(scenario)
      ? "This run uses today’s rules. The dates below are Current Law. Change a setting below and this report updates on its own."
      : "This is the outcome of the settings listed here. The large dates are this run. The smaller line on each card is Current Law.";
    list.innerHTML = "";
    function add(label, value) {
      var wrap = document.createElement("div");
      var term = document.createElement("dt");
      term.textContent = label;
      var detail = document.createElement("dd");
      detail.textContent = value;
      wrap.appendChild(term);
      wrap.appendChild(detail);
      list.appendChild(wrap);
    }
    var months = scenario.monthsPerYear;
    var monthWord = months === 1 ? "month" : "months";
    var starts = byId("solve-effective").value || "2027";
    var fraText = String(scenario.fra);
    fraText += scenario.fra === 67
      ? ". This is today’s full retirement age."
      : ". Today’s full retirement age is 67. The new age rises by " + months + " " + monthWord + " a year, starting January 1, " + starts + ". People already getting benefits stay on today’s rules.";
    add("Full retirement age", fraText);
    var claimText = String(scenario.eea);
    claimText += scenario.eea === 62
      ? ". This is today’s earliest age to claim Social Security."
      : ". Today’s earliest claim age is 62. A later claim comes with a higher monthly benefit.";
    add("Earliest age to claim", claimText);
    var medicareText = String(scenario.medicareAge);
    medicareText += scenario.medicareAge === 65
      ? ". This is today’s eligibility age for Medicare hospital insurance."
      : ". Today’s eligibility age is 65. This changes hospital-insurance cost for people entering because of age. The report does not show who would pay hospital bills below the new age.";
    add("Medicare hospital insurance age", medicareText);
    add("Phase-in", months + " " + monthWord + " of age each year.");
    add("Takes effect", "January 1, " + starts + ". Age changes and wage-tax changes wait until this date. A federal transfer or a checked proposed deposit is counted from 2026." +
      (scenario.chainedCola ? " The slower yearly raise starts with the December adjustment of this year, so the first smaller checks are paid the next year." : ""));
    add("Remains solvent until", (byId("solve-target").value || "2075") + ". Run the Simulator looks for payroll tax rates that keep the accounts paying full benefits through this year.");
    var transfer = Number(scenario.federalTransfer) || 0;
    add("Federal transfer", transfer > 0
      ? transfer + " billion 2026 dollars each year through 2100, paid to Social Security and the same amount to hospital insurance. Social Security’s share follows today’s 12.4% split. This is not Current Law. It does not raise benefits."
      : "0. No money from other federal funds is added.");
    add("Employer health-insurance charge", byId("health-option") && byId("health-option").checked
      ? "On. This is not Current Law. A proposed 2% charge on the premium the employer pays to the health insurance company. The worker’s own premium payment is not taxed again. The 2% is split evenly between the worker and the employer. Each year through 2100, hospital insurance receives " + byId("health-hi").value + " billion 2026 dollars. Social Security and disability receive none."
      : "Off. Not included in this run.");
    add("Broader income tax", byId("income-option") && byId("income-option").checked
      ? "On. This is not Current Law. A proposed 4% tax on realized capital gains, dividends, and taxable interest. Each year through 2100, retirement receives " + byId("income-oasi").value + " billion 2026 dollars and hospital insurance receives " + byId("income-hi").value + " billion. Disability is not given a share."
      : "Off. Not included in this run.");
    add("Stock-trade tariff", byId("trade-option") && byId("trade-option").checked
      ? "On. This is not Current Law. The tariff is on the dollars traded, once on the buy and once on the sale, 0.298% each side. On a $1,000 trade the buyer pays $2.98 and the seller pays $2.98. Each year through 2100, retirement receives " + byId("trade-oasi").value + " billion 2026 dollars, disability receives " + byId("trade-di").value + " billion, and hospital insurance receives " + byId("trade-hi").value + " billion."
      : "Off. Not included in this run.");
    add("Slower yearly benefit increase", scenario.chainedCola
      ? "On. This is not Current Law. The yearly Social Security raise uses the chained price index, about 0.3 percentage points less than today’s raise. Retirement, survivors, and disability receive it. Medicare hospital insurance does not. The first check stays the same. The smaller raise starts the year after " + starts + "."
      : "Off. Today’s yearly raise stays in place.");
    add("Tier 1 soft cap", byId("even-rates") && byId("even-rates").checked
      ? "Removed. This is not Current Law. About the same payroll rate is used on every tier. The soft cap would have tried to keep Tier 1 at or under 13.45% for Social Security and 3.65% for Medicare."
      : (simulating
        ? "On. Tier 1 stays at or under 13.45% for Social Security and 3.65% for Medicare. Higher tiers take any rate still needed."
        : "On. It applies when you run the simulator. This Current Law run keeps today’s wage tax."));
    if (scenario.mode === "tiers" && scenario.tiers && scenario.tiers.length) {
      add("Payroll tax tiers", "Social Security: " + scheduleList(scenario.tiers, "oasdi") + ". Hospital insurance: " + scheduleList(scenario.tiers, "hi") + ".");
    } else {
      add("Payroll tax tiers", "Today’s wage tax. Social Security is 12.4% through the $184,500 wage base and 0% above it. Medicare hospital insurance is 2.9% of all wages, plus 0.9% above $200,000 for a single person or $250,000 for a joint return.");
    }
    var ssLevy = Number(byId("solve-ss").value) || 0;
    var hiLevy = Number(byId("solve-hi").value) || 0;
    var payer = reportCheckedLabel("levy-payer") || "Split evenly";
    add("Tariffs above $10 million", ssLevy + "% Social Security and " + hiLevy + "% Medicare. " + payer + ". " +
      (simulating
        ? "The savings accounts receive the full tariff. It does not raise anyone’s benefit."
        : "Current Law leaves these tariffs out."));
    add("Who pays Tiers 2, 3, and 4", employerPaysUpper()
      ? "The employer pays the entire tax. The worker pays nothing. The savings accounts still receive the full tax."
      : "The worker and the employer share the tax.");
    add("Future benefits", "Wages above today’s $184,500 wage base do not raise future benefits.");
  }

  function paintEffects(scenario) {
    var items = [];
    if (scenario.mode === "flat") {
      if (Math.abs(scenario.oasdiRate - 12.4) > 0.05) {
        items.push("The Social Security combined payroll tax is " + scenario.oasdiRate.toFixed(1) +
          "%, compared with 12.4% under Current Law. The change starts in 2026.");
      }
      if (Math.abs(scenario.hiRate - 2.9) > 0.05) {
        items.push("The standard Medicare hospital-insurance rate is " + scenario.hiRate.toFixed(1) +
          "%, compared with 2.9%. The extra 0.9% tax on high wages stays on today’s path.");
      }
      if (scenario.noCap) {
        items.push("The Social Security earnings cap is removed. " +
          (scenario.creditBenefits
            ? "Wages above today’s cap also count toward a future benefit, as new retirees start getting checks."
            : "Taxes rise on those wages. Promised benefits do not."));
      } else if (Math.abs(scenario.wageBase - 184500) > 100) {
        items.push("The wage base, the cap on the Social Security tax, is " + money(Math.round(scenario.wageBase)) +
          " instead of $184,500. " +
          (scenario.creditBenefits
            ? "Future retirement benefits move with it, as new retirees replace people already getting checks."
            : "Only the tax cap moves. Benefits stay tied to today’s $184,500 cap, or to a lower cap if you set one."));
      }
    }
    if (scenario.mode === "tiers") {
      var tier0 = scenario.tier0;
      if (tier0 && tier0.upTo > 0) {
        var employerOnly = tier0IsEmployerSim(tier0.oasdi, tier0.hi);
        items.push(employerOnly
          ? "Tier 0 is not part of Current Law. Through " + money(Math.round(tier0.upTo)) +
            ", the worker pays no Social Security or Medicare payroll tax. The employer pays " +
            formatRate(tier0.oasdi) + " for Social Security and " + formatRate(tier0.hi) +
            " for Medicare hospital insurance. Benefits stay full, and those wages still count toward a future benefit."
          : "Tier 0, through " + money(Math.round(tier0.upTo)) +
            ", charges " + formatRate(tier0.oasdi) + " for Social Security and " + formatRate(tier0.hi) +
            " for Medicare hospital insurance. Wages in that band still count toward a future benefit.");
      }
      items.push(scenario.freezeBrackets
        ? "Income tiers are frozen in today’s dollars, so they cover a larger share of earnings as wages rise."
        : "Income tiers move with average wages. The dashed line is Current Law, including the real $200,000 and $250,000 Medicare limits, which do not rise with wages.");
      items.push(scenario.creditBenefits
        ? "Counting newly taxed wages toward a future benefit is on. Wages taxed above today’s $184,500 cap also raise future Social Security benefits."
        : "These rates change tax money. They do not raise benefits on wages above today’s $184,500 cap.");
    }
    if (scenario.fra !== 67) {
      var years = Math.abs(scenario.fra - 67) * 12 / scenario.monthsPerYear;
      items.push("The full retirement age moves from 67 to " + scenario.fra + " at " +
        scenario.monthsPerYear + " month" + (scenario.monthsPerYear === 1 ? "" : "s") +
        " per year, so the new age applies to new retirees after about " + Math.round(years) +
        " years. A new retiree who still claims at 67 gets about 6.7% less each month for each year the full retirement age rises. People already getting benefits are unchanged. A slow phase-in does little to the early-2030s date when the account runs out. It lowers the cost later.");
    }
    if (scenario.eea !== 62 && scenario.eea < scenario.fra) {
      items.push("The earliest Social Security claiming age moves from 62 to " + scenario.eea +
        ". The near-term change is mostly timing. A later claim comes with a higher monthly benefit, so the long-run cost change is smaller.");
    }
    if (scenario.medicareAge !== 65) {
      items.push("The Medicare hospital-insurance eligibility age moves from 65 to " + scenario.medicareAge +
        ". This changes Part A cost for people entering because of age. Disability, kidney failure, and ALS eligibility stay as they are. Hospital bills for people below the new age are not moved onto Medicaid, employers, or families in this picture.");
    }
    if (byId("health-option") && byId("health-option").checked) {
      items.push("The employer health-insurance charge is on. It is not Current Law. It is a proposed 2% charge on the premium the employer pays to the health insurance company. The worker’s own premium payment is not taxed again. The worker pays 1% and the employer pays 1%. Each year through 2100, hospital insurance receives " +
        byId("health-hi").value + " billion 2026 dollars. Social Security and disability receive none. It does not raise benefits.");
    }
    if (Number(scenario.federalTransfer) > 0) {
      var billions = Math.round(scenario.federalTransfer * 100) / 100;
      items.push("Each year through 2100, " + billions +
        " billion 2026 dollars is transferred from other federal funds into Social Security, and the same amount into Medicare hospital insurance. It is not Current Law. Social Security’s share is split the same way as today’s 12.4% tax: about 85% to retirement and survivors, and about 15% to disability. It does not raise benefits and it does not change tax rates. The amount rises with prices, so its buying power stays the same.");
    }
    if (byId("income-option") && byId("income-option").checked) {
      items.push("The broader income tax is on. It is not Current Law. It is a proposed 4% tax on realized capital gains, dividends, and taxable interest. Each year through 2100, retirement receives " +
        byId("income-oasi").value + " billion 2026 dollars and hospital insurance receives " +
        byId("income-hi").value + " billion. Disability is not given a share. It does not raise benefits.");
    }
    if (byId("even-rates") && byId("even-rates").checked) {
      items.push("The Tier 1 soft cap is off. It is not Current Law. The soft cap tries to keep Tier 1 at or under 13.45% for Social Security and 3.65% for Medicare hospital insurance. With the cap off, about the same payroll rate is used on every tier. Benefits do not rise.");
    }
    if (byId("trade-option") && byId("trade-option").checked) {
      items.push("The stock-trade tariff is on. It is not Current Law. The tariff is on the dollars traded, once on the buy and once on the sale. Each side pays 0.298%. On a $1,000 trade the buyer pays $2.98 and the seller pays $2.98. Each year through 2100, retirement receives " +
        byId("trade-oasi").value + " billion 2026 dollars, disability receives " +
        byId("trade-di").value + " billion, and hospital insurance receives " +
        byId("trade-hi").value + " billion. It does not raise benefits. The solid green line includes this money. The red cost line does not move. Disability’s share is inside the combined Social Security chart.");
    }
    if (scenario.chainedCola) {
      items.push("The slower yearly benefit increase is on. It is not Current Law. Social Security checks rise with the chained price index, about 0.3 percentage points less than today’s raise. The first check stays the same, because it is based on wages. People already getting benefits receive the smaller raise too. Retirement, survivors, and disability are included. Medicare hospital insurance is not. The first smaller checks are paid the year after " +
        (byId("solve-effective").value || "2027") + ".");
    }
    var list = byId("effects");
    var block = byId("effects-block");
    list.innerHTML = "";
    if (!items.length) {
      if (block) block.hidden = true;
      return;
    }
    if (block) block.hidden = false;
    items.forEach(function (text) {
      var li = document.createElement("li");
      li.textContent = text;
      list.appendChild(li);
    });
  }

  function paintClamp(scenario) {
    var note = byId("clamp-note");
    if (scenario.eea >= scenario.fra) {
      note.hidden = false;
      note.textContent = "The earliest claiming age is kept one year below the full retirement age, so the projection uses " +
        (scenario.fra - 1) + ".";
    } else {
      note.hidden = true;
      note.textContent = "";
    }
  }

  function rowsFor(result, fund) {
    return result.years.map(function (row) { return row[fund]; });
  }

  function points(rows, field) {
    return rows.map(function (row, index) {
      return { year: 2026 + index, y: row[field] };
    });
  }

  function niceStep(span) {
    var rough = span / 4;
    if (rough <= 0) return 1;
    var pow = Math.pow(10, Math.floor(Math.log10(rough)));
    var candidates = [1, 2, 2.5, 5, 10];
    var step = 10 * pow;
    for (var i = 0; i < candidates.length; i++) {
      if (rough <= candidates[i] * pow) {
        step = candidates[i] * pow;
        break;
      }
    }
    return step;
  }

  function ticks(min, max) {
    var step = niceStep(max - min);
    var start = Math.ceil((min - step * 0.001) / step) * step;
    var out = [];
    for (var value = start; value <= max + step * 0.001; value += step) {
      out.push(Math.round(value * 1000) / 1000);
      if (out.length > 7) break;
    }
    return out;
  }

  function formatTick(value, kind) {
    var sign = value < 0 ? "−" : "";
    var abs = Math.abs(value);
    if (kind === "dollars") {
      return sign + (abs >= 10 ? abs.toFixed(0) : abs.toFixed(1));
    }
    return sign + Math.round(abs) + "%";
  }

  function formatValue(value, kind) {
    if (kind === "dollars") {
      var sign = value < 0 ? "−" : "";
      return sign + "$" + Math.abs(value).toFixed(2) + " trillion";
    }
    if (kind === "rate") return (Math.round(value * 10) / 10).toFixed(1) + "% of payroll";
    return Math.round(value) + "%";
  }

  function drawChart(host, spec) {
    host.innerHTML = "";
    var svg = svgEl("svg", { viewBox: "0 0 720 340", role: "img" });
    svg.setAttribute("aria-label", spec.label);
    svg.setAttribute("tabindex", "0");
    host.appendChild(svg);

    var tip = document.createElement("div");
    tip.className = "tooltip";
    tip.hidden = true;
    host.appendChild(tip);

    var legend = document.createElement("ul");
    legend.className = "legend";
    spec.series.forEach(function (series) {
      var li = document.createElement("li");
      var swatch = document.createElement("span");
      swatch.className = "swatch" + (series.dash ? " dashed" : "");
      swatch.style.borderTopColor = series.color;
      li.appendChild(swatch);
      li.appendChild(document.createTextNode(series.name));
      legend.appendChild(li);
    });
    host.appendChild(legend);

    var left = 58;
    var right = 16;
    var top = 16;
    var bottom = 36;
    var width = 720 - left - right;
    var height = 340 - top - bottom;
    var min = Infinity;
    var max = -Infinity;
    spec.series.forEach(function (series) {
      series.values.forEach(function (point) {
        if (point.y < min) min = point.y;
        if (point.y > max) max = point.y;
      });
    });
    if (!isFinite(min)) { min = 0; max = 1; }
    if (spec.includeZero) {
      min = Math.min(0, min);
      max = Math.max(0, max);
    }
    if (min === max) { min -= 1; max += 1; }
    var pad = (max - min) * 0.08;
    if (min < 0) min -= pad;
    max += pad;

    function xOf(year) {
      return left + ((year - 2026) / 74) * width;
    }
    function yOf(value) {
      return top + ((max - value) / (max - min)) * height;
    }

    ticks(min, max).forEach(function (tick) {
      var y = yOf(tick);
      svg.appendChild(svgEl("line", {
        x1: left, x2: left + width, y1: y, y2: y,
        stroke: tick === 0 ? "#9aabba" : "#e3eaf0",
        "stroke-width": tick === 0 ? 1.25 : 1
      }));
      var label = svgEl("text", {
        x: left - 8, y: y + 4, "text-anchor": "end", fill: "#5c6b7c", "font-size": "12"
      });
      label.textContent = formatTick(tick, spec.kind);
      svg.appendChild(label);
    });

    [2026, 2040, 2060, 2080, 2100].forEach(function (year) {
      var label = svgEl("text", {
        x: xOf(year), y: top + height + 22, "text-anchor": "middle", fill: "#5c6b7c", "font-size": "12"
      });
      label.textContent = String(year);
      svg.appendChild(label);
    });

    spec.markers.forEach(function (marker) {
      if (marker.year < 2026 || marker.year > 2100) return;
      svg.appendChild(svgEl("line", {
        x1: xOf(marker.year), x2: xOf(marker.year), y1: top, y2: top + height,
        stroke: marker.color, "stroke-width": 1, "stroke-dasharray": "3 4", opacity: "0.7"
      }));
    });

    spec.series.forEach(function (series) {
      var d = "";
      series.values.forEach(function (point, index) {
        d += (index === 0 ? "M" : "L") + xOf(point.year).toFixed(1) + " " + yOf(point.y).toFixed(1) + " ";
      });
      svg.appendChild(svgEl("path", {
        d: d, fill: "none", stroke: series.color, "stroke-width": series.dash ? 1.75 : 2.4,
        "stroke-dasharray": series.dash || "", "stroke-linejoin": "round", "stroke-linecap": "round"
      }));
    });

    var hover = svgEl("line", {
      x1: 0, x2: 0, y1: top, y2: top + height, stroke: "#1b2836", "stroke-width": 1, opacity: "0"
    });
    svg.appendChild(hover);
    var capture = svgEl("rect", {
      x: left, y: top, width: width, height: height, fill: "transparent"
    });
    svg.appendChild(capture);

    var table = document.createElement("table");
    table.className = "sr-only";
    var caption = document.createElement("caption");
    caption.textContent = spec.label;
    table.appendChild(caption);
    [2026, 2035, 2050, 2075, 2100].forEach(function (year) {
      var tr = document.createElement("tr");
      var th = document.createElement("th");
      th.textContent = String(year);
      tr.appendChild(th);
      spec.series.forEach(function (series) {
        var td = document.createElement("td");
        var point = series.values[year - 2026];
        td.textContent = series.name + " " + formatValue(point.y, spec.kind);
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });
    host.appendChild(table);

    function showYear(year, clientX, clientY) {
      year = Math.max(2026, Math.min(2100, year));
      var x = xOf(year);
      hover.setAttribute("x1", x);
      hover.setAttribute("x2", x);
      hover.setAttribute("opacity", "1");
      tip.hidden = false;
      tip.innerHTML = "";
      var title = document.createElement("strong");
      title.textContent = String(year);
      tip.appendChild(title);
      spec.series.forEach(function (series) {
        var line = document.createElement("p");
        line.textContent = series.name + ": " + formatValue(series.values[year - 2026].y, spec.kind);
        tip.appendChild(line);
      });
      var hostRect = host.getBoundingClientRect();
      var localX = clientX - hostRect.left;
      tip.style.top = "12px";
      var tipWidth = tip.offsetWidth;
      var leftPx = localX + 14;
      if (leftPx + tipWidth > hostRect.width - 8) leftPx = localX - tipWidth - 14;
      tip.style.left = Math.max(8, leftPx) + "px";
      host.dataset.year = String(year);
    }

    function fromEvent(event) {
      var rect = svg.getBoundingClientRect();
      var vx = ((event.clientX - rect.left) / rect.width) * 720;
      var year = Math.round(2026 + ((vx - left) / width) * 74);
      showYear(year, event.clientX, event.clientY);
    }

    capture.addEventListener("pointermove", fromEvent);
    capture.addEventListener("pointerdown", fromEvent);
    svg.addEventListener("pointerleave", function () {
      tip.hidden = true;
      hover.setAttribute("opacity", "0");
    });
    svg.addEventListener("keydown", function (event) {
      var year = Number(host.dataset.year || 2035);
      if (event.key === "ArrowRight") year += 1;
      else if (event.key === "ArrowLeft") year -= 1;
      else return;
      event.preventDefault();
      var rect = svg.getBoundingClientRect();
      var x = rect.left + (xOf(year) / 720) * rect.width;
      showYear(year, x, rect.top + 40);
    });
  }

  var RATE_STOPS = [0, 184500, 1000000, 5000000, 10000000];
  var WAGE_BASE_DOLLARS = 184500;
  var HI_SURTAX_DOLLARS = 200000;
  var LEVY_DOLLARS = 10000000;

  function orderedTiers(raw) {
    var floor = 0;
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var last = i === raw.length - 1;
      var upTo = last ? null : Number(raw[i].upTo);
      if (!last) {
        if (!isFinite(upTo)) upTo = floor + 50000;
        upTo = Math.max(floor + 1000, upTo);
        floor = upTo;
      }
      out.push({
        upTo: upTo,
        oasdi: Math.min(40, Math.max(0, Number(raw[i].oasdi) || 0)),
        hi: Math.min(40, Math.max(0, Number(raw[i].hi) || 0)),
        employerPays: !!raw[i].employerPays
      });
    }
    return out;
  }

  function dollarText(value) {
    var rounded = Math.round(value);
    return "$" + String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function formatTrillions(value) {
    var sign = value < 0 ? "−" : "";
    var abs = Math.abs(value);
    if (abs < 5e-7) return "$0";
    if (abs < 0.01) {
      var digits = abs >= 0.001 ? 4 : 6;
      return sign + "$" + abs.toFixed(digits) + " trillion";
    }
    var places = abs >= 100 ? 1 : 2;
    return sign + "$" + abs.toFixed(places) + " trillion";
  }

  function formatRate(value) {
    var hundredths = Math.round(value * 100) / 100;
    var tenths = Math.round(hundredths * 10) / 10;
    if (Math.abs(hundredths - tenths) < 0.001) return tenths.toFixed(1) + "%";
    return hundredths.toFixed(2) + "%";
  }

  function formatShare(pct) {
    if (pct == null || !isFinite(pct)) return "—";
    var rounded = Math.round(pct * 10) / 10;
    if (Math.abs(rounded) < 0.05) {
      if (Math.abs(pct) < 1e-6) return "0%";
      return pct > 0 ? "<0.1%" : ">−0.1%";
    }
    var text = Math.abs(rounded).toFixed(1) + "%";
    return rounded < 0 ? "−" + text : text;
  }

  function percentOf(part, whole) {
    if (!isFinite(part) || !isFinite(whole) || Math.abs(whole) < 1e-8) return null;
    return part / whole * 100;
  }

  function massBetween(lo, hi) {
    if (!(hi > lo)) return 0;
    return model.packageMass(lo, hi);
  }

  /* Step chart of combined payroll-tax rates against 2026-dollar earnings.
     The five labeled stops are equally spaced. A last gap shows the levy above $10 million. */
  function drawStepChart(host, spec) {
    host.innerHTML = "";
    var svg = svgEl("svg", { viewBox: "0 0 720 340", role: "img" });
    svg.setAttribute("aria-label", spec.label);
    svg.setAttribute("tabindex", "0");
    host.appendChild(svg);

    var tip = document.createElement("div");
    tip.className = "tooltip";
    tip.hidden = true;
    host.appendChild(tip);

    var legend = document.createElement("ul");
    legend.className = "legend";
    spec.series.forEach(function (series) {
      var li = document.createElement("li");
      var swatch = document.createElement("span");
      swatch.className = "swatch" + (series.dash ? " dashed" : "");
      swatch.style.borderTopColor = series.color;
      li.appendChild(swatch);
      li.appendChild(document.createTextNode(series.name));
      legend.appendChild(li);
    });
    host.appendChild(legend);

    var left = 58;
    var right = 16;
    var top = 16;
    var bottom = 50;
    var width = 720 - left - right;
    var height = 340 - top - bottom;
    var gaps = RATE_STOPS.length;

    function xOf(earnings) {
      if (earnings <= 0) return left;
      if (earnings >= LEVY_DOLLARS * 2) return left + width;
      if (earnings > LEVY_DOLLARS) {
        var tail = (earnings - LEVY_DOLLARS) / LEVY_DOLLARS;
        return left + ((gaps - 1 + tail) / gaps) * width;
      }
      for (var i = 0; i < RATE_STOPS.length - 1; i++) {
        if (earnings <= RATE_STOPS[i + 1]) {
          var span = RATE_STOPS[i + 1] - RATE_STOPS[i];
          var frac = span === 0 ? 0 : (earnings - RATE_STOPS[i]) / span;
          return left + ((i + frac) / gaps) * width;
        }
      }
      return left + ((gaps - 1) / gaps) * width;
    }

    var min = 0;
    var max = 0;
    spec.series.forEach(function (series) {
      spec.edges.forEach(function (edge) {
        var before = series.rateAt(edge);
        var after = series.rateAt(edge + 1);
        if (before > max) max = before;
        if (after > max) max = after;
      });
      var startRate = series.rateAt(0);
      if (startRate > max) max = startRate;
    });
    if (max <= min) max = min + 1;
    var pad = (max - min) * 0.08;
    max += pad;

    function yOf(value) {
      return top + ((max - value) / (max - min)) * height;
    }

    ticks(min, max).forEach(function (tick) {
      var y = yOf(tick);
      svg.appendChild(svgEl("line", {
        x1: left, x2: left + width, y1: y, y2: y,
        stroke: tick === 0 ? "#9aabba" : "#e3eaf0",
        "stroke-width": tick === 0 ? 1.25 : 1
      }));
      var label = svgEl("text", {
        x: left - 8, y: y + 4, "text-anchor": "end", fill: "#5c6b7c", "font-size": "12"
      });
      label.textContent = formatTick(tick, "percent");
      svg.appendChild(label);
    });

    RATE_STOPS.forEach(function (stop, index) {
      var label = svgEl("text", {
        x: xOf(stop), y: top + height + 18, "text-anchor": "middle", fill: "#5c6b7c", "font-size": "11"
      });
      label.textContent = dollarText(stop);
      svg.appendChild(label);
    });
    var axis = svgEl("text", {
      x: left + width / 2, y: top + height + 36, "text-anchor": "middle", fill: "#5c6b7c", "font-size": "11"
    });
    axis.textContent = "Earnings in 2026 dollars";
    svg.appendChild(axis);

    var drawSeries = spec.series.slice().sort(function (a, b) {
      return (a.dash ? 0 : 1) - (b.dash ? 0 : 1);
    });
    drawSeries.forEach(function (series) {
      var rate = series.rateAt(0);
      var d = "M" + xOf(0).toFixed(1) + " " + yOf(rate).toFixed(1);
      var prevX = xOf(0);
      spec.edges.forEach(function (edge) {
        var x = xOf(edge);
        if (x < prevX) x = prevX;
        var after = series.rateAt(edge + 1);
        d += " L" + x.toFixed(1) + " " + yOf(rate).toFixed(1);
        if (Math.abs(after - rate) > 1e-9) {
          d += " L" + x.toFixed(1) + " " + yOf(after).toFixed(1);
          rate = after;
        }
        prevX = x;
      });
      d += " L" + (left + width).toFixed(1) + " " + yOf(rate).toFixed(1);
      svg.appendChild(svgEl("path", {
        d: d, fill: "none", stroke: series.color, "stroke-width": series.dash ? 1.75 : 2.4,
        "stroke-dasharray": series.dash || "", "stroke-linejoin": "round", "stroke-linecap": "round",
        "data-series": series.name
      }));
    });

    var hover = svgEl("line", {
      x1: 0, x2: 0, y1: top, y2: top + height, stroke: "#1b2836", "stroke-width": 1, opacity: "0"
    });
    svg.appendChild(hover);
    var capture = svgEl("rect", {
      x: left, y: top, width: width, height: height, fill: "transparent"
    });
    svg.appendChild(capture);

    var table = document.createElement("table");
    table.className = "sr-only";
    var caption = document.createElement("caption");
    caption.textContent = spec.label;
    table.appendChild(caption);
    RATE_STOPS.concat([LEVY_DOLLARS + 1]).forEach(function (earnings) {
      var tr = document.createElement("tr");
      var th = document.createElement("th");
      th.textContent = earnings > LEVY_DOLLARS ? "Above $10,000,000" : dollarText(earnings);
      tr.appendChild(th);
      spec.series.forEach(function (series) {
        var td = document.createElement("td");
        td.textContent = series.name + " " + formatRate(series.rateAt(earnings));
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });
    host.appendChild(table);

    function earningsAt(vx) {
      var pos = ((vx - left) / width) * gaps;
      if (pos <= 0) return 0;
      if (pos >= gaps - 1) {
        var tailPos = Math.min(1, pos - (gaps - 1));
        return LEVY_DOLLARS + tailPos * LEVY_DOLLARS;
      }
      var index = Math.min(RATE_STOPS.length - 2, Math.floor(pos));
      var frac = pos - index;
      return RATE_STOPS[index] + frac * (RATE_STOPS[index + 1] - RATE_STOPS[index]);
    }

    function showEarnings(earnings, clientX) {
      earnings = Math.max(0, earnings);
      var above = earnings > LEVY_DOLLARS;
      var x = xOf(above ? Math.min(earnings, LEVY_DOLLARS * 2) : earnings);
      hover.setAttribute("x1", x);
      hover.setAttribute("x2", x);
      hover.setAttribute("opacity", "1");
      tip.hidden = false;
      tip.innerHTML = "";
      var title = document.createElement("strong");
      title.textContent = above ? "Above $10,000,000" : dollarText(earnings);
      tip.appendChild(title);
      spec.series.forEach(function (series) {
        var line = document.createElement("p");
        var rate = series.rateAt(earnings);
        line.textContent = series.name + ": " + formatRate(rate);
        tip.appendChild(line);
      });
      var hostRect = host.getBoundingClientRect();
      var localX = clientX - hostRect.left;
      tip.style.top = "12px";
      var tipWidth = tip.offsetWidth;
      var leftPx = localX + 14;
      if (leftPx + tipWidth > hostRect.width - 8) leftPx = localX - tipWidth - 14;
      tip.style.left = Math.max(8, leftPx) + "px";
      host.dataset.earnings = String(Math.round(earnings));
    }

    function fromEvent(event) {
      var rect = svg.getBoundingClientRect();
      var vx = ((event.clientX - rect.left) / rect.width) * 720;
      showEarnings(earningsAt(vx), event.clientX);
    }

    capture.addEventListener("pointermove", fromEvent);
    capture.addEventListener("pointerdown", fromEvent);
    svg.addEventListener("pointerleave", function () {
      tip.hidden = true;
      hover.setAttribute("opacity", "0");
    });
    svg.addEventListener("keydown", function (event) {
      var current = Number(host.dataset.earnings || 0);
      var step = 50000;
      if (event.key === "ArrowRight") current += step;
      else if (event.key === "ArrowLeft") current -= step;
      else return;
      event.preventDefault();
      current = Math.max(0, Math.min(LEVY_DOLLARS * 2, current));
      var rect = svg.getBoundingClientRect();
      var x = rect.left + (xOf(current) / 720) * rect.width;
      showEarnings(current, x);
    });
  }

  function tierShares(tiers, ssLevy, hiLevy, tier0) {
    var cfg = model.DEFAULT_ASSUMPTIONS;
    var freeze = false;
    var workforcePp = 0;
    var start = Math.round(Number(byId("solve-effective").value));
    var end = Math.round(Number(byId("solve-target").value));
    if (!isFinite(start)) start = 2027;
    if (!isFinite(end)) end = 2075;
    start = Math.max(2026, Math.min(2100, start));
    end = Math.max(2026, Math.min(2100, end));

    function zeroRows(n) {
      var rows = [[], [], []];
      for (var fund = 0; fund < 3; fund++) {
        for (var band = 0; band < n; band++) rows[fund].push(0);
      }
      return rows;
    }
    var pack = zeroRows(tiers.length);
    var law = zeroRows(tiers.length);
    var pack0 = [0, 0, 0];
    var law0 = [0, 0, 0];
    var payroll = cfg.oasdiPayroll0;
    var wageBase = model.WAGE_BASE;
    var floor = tier0 && tier0.upTo > 0 ? tier0.upTo : 0;

    for (var year = 2026; year <= 2100; year++) {
      var t = year - 2026;
      var growth = (year < 2036 ? cfg.payrollGrowthEarly : cfg.payrollGrowthLater) + workforcePp / 100;
      if (year >= start && year <= end) {
        var infl = Math.pow(1 + cfg.inflation, t);
        var covered = (payroll / cfg.taxableShare) / infl / 1000;
        var hiPayroll = (payroll * cfg.hiPayrollRatio) / infl / 1000;
        var wageIndex = freeze ? Math.pow(1 + cfg.wageGrowth, t) : 1;
        function multiple(dollars) {
          if (dollars == null || !isFinite(dollars)) return Infinity;
          return (dollars / wageBase) / wageIndex;
        }
        var edges = [multiple(floor)];
        for (var edge = 0; edge < tiers.length - 1; edge++) edges.push(multiple(tiers[edge].upTo));
        edges.push(Infinity);
        var levyMultiple = multiple(LEVY_DOLLARS);
        var hiCut = (HI_SURTAX_DOLLARS / wageBase) / Math.pow(1 + cfg.wageGrowth, t);
        var payer = selected("levy-payer") === "employer" ? "employer" : "split";
        var ssParts = model.levyShares(ssLevy, payer);
        var hiParts = model.levyShares(hiLevy, payer);
        var ssTotal = ssParts.worker + ssParts.employer;
        var hiTotal = hiParts.worker + hiParts.employer;
        if (floor > 0) {
          var mass0 = massBetween(0, multiple(floor));
          var oasdi0 = mass0 * (tier0.oasdi / 100) * covered;
          var hi0 = mass0 * (tier0.hi / 100) * hiPayroll;
          var lawOasdi0 = mass0 * 0.124 * covered;
          pack0[0] += oasdi0 * (10.6 / 12.4);
          pack0[1] += oasdi0;
          pack0[2] += hi0;
          law0[0] += lawOasdi0 * (10.6 / 12.4);
          law0[1] += lawOasdi0;
          law0[2] += mass0 * 0.029 * hiPayroll;
        }
        for (var i = 0; i < tiers.length; i++) {
          var lo = edges[i];
          var hiEdge = edges[i + 1];
          var mass = massBetween(lo, hiEdge);
          var levyMass = massBetween(Math.max(lo, levyMultiple), hiEdge);
          var oasdi = (mass * (tiers[i].oasdi / 100) + levyMass * (ssTotal / 100)) * covered;
          var hiDollars = (mass * (tiers[i].hi / 100) + levyMass * (hiTotal / 100)) * hiPayroll;
          pack[0][i] += oasdi * (10.6 / 12.4);
          pack[1][i] += oasdi;
          pack[2][i] += hiDollars;

          var lawOasdi = massBetween(lo, Math.min(hiEdge, 1)) * 0.124 * covered;
          law[0][i] += lawOasdi * (10.6 / 12.4);
          law[1][i] += lawOasdi;
          law[2][i] += mass * 0.029 * hiPayroll + massBetween(Math.max(lo, hiCut), hiEdge) * 0.009 * hiPayroll;
        }
      }
      payroll *= 1 + growth;
    }

    return { start: start, end: end, pack: pack, law: law, tier0: tier0, pack0: pack0, law0: law0 };
  }

  function tier0ShareNote(tier0) {
    if (!tier0 || !(tier0.upTo > 0)) return "";
    var employerOnly = tier0IsEmployerSim(tier0.oasdi, tier0.hi);
    if (employerOnly) {
      return " Tier 0, through " + dollarText(tier0.upTo) +
        ", collects only the employer tax: about 6.5% for Social Security and about 1.6% for hospital insurance. The worker pays nothing. Benefits stay full, and those wages still count toward a future benefit.";
    }
    return " Tier 0, through " + dollarText(tier0.upTo) +
      ", is taxed at " + formatRate(tier0.oasdi) + " for Social Security and " + formatRate(tier0.hi) +
      " for hospital insurance. Those wages still count toward a future benefit.";
  }

  function upperPayNote(tiers) {
    for (var i = 0; i < tiers.length; i++) {
      if (!tiers[i].employerPays) continue;
      return " On Tiers 2, 3, and 4, the employer pays the entire Social Security and Medicare tax. The worker pays nothing. The savings accounts still receive the full tax. Benefits stay full, and those wages still count toward a future benefit the same way they do when the tax is shared.";
    }
    return "";
  }

  function levyShareNote(ssLevy, hiLevy) {
    if (ssLevy > 0 || hiLevy > 0) {
      var payer = selected("levy-payer") === "employer" ? "employer" : "split";
      var ssParts = model.levyShares(ssLevy, payer);
      var hiParts = model.levyShares(hiLevy, payer);
      return " The extra tariffs are added only on pay above $10 million. Social Security is " +
        formatRate(ssParts.worker) + " from the worker and " + formatRate(ssParts.employer) +
        " from the employer. Medicare hospital insurance is " + formatRate(hiParts.worker) +
        " from the worker and " + formatRate(hiParts.employer) +
        " from the employer. The savings accounts receive the full tariff either way, and it does not raise anyone’s benefit.";
    }
    return " The extra charges above $10 million are not in these dollars while Current Law is selected.";
  }

  function paintPackageNote(scenario) {
    var note = byId("package-note");
    var amount = Number(scenario.federalTransfer) || 0;
    if (isBaseline(scenario)) {
      note.textContent = "These large dates are Current Law: today’s rules, with no extra federal money. The smaller line on each card matches them.";
      return;
    }
    if (amount > 0) {
      var proposed = (Number(scenario.extraOasi) || 0) > 0 || (Number(scenario.extraHi) || 0) > 0;
      note.textContent = "The large dates already include $" + amount +
        " billion a year from other federal funds" +
        (proposed ? ", plus a proposed option checked under that box" : "") +
        ". That money is not Current Law. Current Law is today’s rules with that box at 0. Click Reset to Current Law to see those dates. The smaller line on each card is Current Law.";
      return;
    }
    if ((Number(scenario.extraOasi) || 0) > 0 || (Number(scenario.extraHi) || 0) > 0) {
      note.textContent = "The large dates include a proposed option checked below the federal transfer" +
        (scenario.chainedCola ? ", and the slower yearly Social Security raise" : "") +
        ". It is not Current Law. Click Reset to Current Law to clear it. The smaller line on each card is Current Law.";
      return;
    }
    if (scenario.chainedCola) {
      note.textContent = "The large dates include the slower yearly Social Security raise. It is not Current Law. Click Reset to Current Law to clear it. The smaller line on each card is Current Law.";
      return;
    }
    note.textContent = "The large dates are your package. The smaller line on each card is Current Law.";
  }

  function paintTierShares(tiers, ssLevy, hiLevy, tier0) {
    var shares = tierShares(tiers, ssLevy, hiLevy, tier0);
    var note = byId("tier-share-note");
    note.textContent = shares.start <= shares.end
      ? "Approximate figures, in trillions of 2026 dollars, from January 1, " + shares.start +
        " through " + shares.end + ". Pay under $2 million follows the wage pattern already in this model. Pay at and above $2 million, and at and above $10 million, uses 2023 Social Security wage statistics. The first percentage is that band’s share of the program’s payroll tax. The second is its share of the dollars above Current Law." +
        tier0ShareNote(tier0) + upperPayNote(tiers) + levyShareNote(ssLevy, hiLevy)
      : "The target year is before the start year, so there are no years to add up.";

    var table = byId("tier-share-table");
    table.innerHTML = "";
    var caption = document.createElement("caption");
    caption.className = "sr-only";
    caption.textContent = "About how much payroll tax each band pays, in trillions of 2026 dollars. Each cell shows dollars, the share of payroll tax, and the share of the dollars above Current Law.";
    table.appendChild(caption);

    var head = document.createElement("thead");
    var headRow = document.createElement("tr");
    ["Tier", "Retirement and survivors", "Combined Social Security", "Medicare hospital insurance"].forEach(function (label) {
      var th = document.createElement("th");
      th.scope = "col";
      th.textContent = label;
      headRow.appendChild(th);
    });
    head.appendChild(headRow);
    table.appendChild(head);

    var body = document.createElement("tbody");
    var fundCount = [0, 0, 0];
    var extraCount = [0, 0, 0];
    for (var fund = 0; fund < 3; fund++) {
      if (tier0) {
        fundCount[fund] += shares.pack0[fund];
        extraCount[fund] += shares.pack0[fund] - shares.law0[fund];
      }
      for (var band = 0; band < shares.pack[fund].length; band++) {
        fundCount[fund] += shares.pack[fund][band];
        extraCount[fund] += shares.pack[fund][band] - shares.law[fund][band];
      }
    }
    function addRow(label, dollarsByFund, lawByFund) {
      var tr = document.createElement("tr");
      var th = document.createElement("th");
      th.scope = "row";
      th.textContent = label;
      tr.appendChild(th);
      for (var f = 0; f < 3; f++) {
        var dollars = dollarsByFund[f];
        var extra = dollars - lawByFund[f];
        var td = document.createElement("td");
        if (f === 1) td.dataset.oasdi = "1";
        var amount = document.createElement("span");
        amount.className = "share-dollars";
        amount.textContent = formatTrillions(dollars);
        var taxShare = document.createElement("span");
        taxShare.className = "share-pct";
        taxShare.textContent = formatShare(percentOf(dollars, fundCount[f])) + " of payroll tax";
        var solvency = document.createElement("span");
        solvency.className = "share-pct";
        solvency.textContent = formatShare(percentOf(extra, extraCount[f])) + " share of the dollars above Current Law";
        td.appendChild(amount);
        td.appendChild(taxShare);
        td.appendChild(solvency);
        tr.appendChild(td);
      }
      body.appendChild(tr);
    }
    if (tier0) addRow("Tier 0, through " + dollarText(tier0.upTo), shares.pack0, shares.law0);
    for (var i = 0; i < tiers.length; i++) {
      var label = i === tiers.length - 1
        ? "Above " + dollarText(tiers[i - 1].upTo)
        : (tier0
          ? dollarText((i === 0 ? tier0.upTo : tiers[i - 1].upTo) + 1) + "–" + dollarText(tiers[i].upTo)
          : "Through " + dollarText(tiers[i].upTo));
      addRow(label, [shares.pack[0][i], shares.pack[1][i], shares.pack[2][i]], [shares.law[0][i], shares.law[1][i], shares.law[2][i]]);
    }
    table.appendChild(body);
  }

  function paintPayrollRates(fund) {
    var block = byId("rates-block");
    var host = byId("chart-rates");
    var show = packageOn || selected("mode") === "tiers";
    if (!show) {
      block.hidden = true;
      host.innerHTML = "";
      byId("tier-share-table").innerHTML = "";
      byId("tier-share-note").textContent = "";
      return;
    }
    var tiers = orderedTiers(readTiers());
    var tier0 = readTier0();
    var simulating = packageOn || selected("mode") === "tiers";
    var ssLevy = simulating ? (Number(byId("solve-ss").value) || 0) : 0;
    var hiLevy = simulating ? (Number(byId("solve-hi").value) || 0) : 0;
    var payer = selected("levy-payer") === "employer" ? "employer" : "split";
    var ssTotal = model.levyShares(ssLevy, payer).worker + model.levyShares(ssLevy, payer).employer;
    var hiTotal = model.levyShares(hiLevy, payer).worker + model.levyShares(hiLevy, payer).employer;
    var edges = [WAGE_BASE_DOLLARS, HI_SURTAX_DOLLARS, LEVY_DOLLARS];
    tiers.forEach(function (tier) {
      if (tier.upTo != null) edges.push(tier.upTo);
    });
    if (tier0) edges.push(tier0.upTo);
    var seen = {};
    var unique = [];
    edges.forEach(function (edge) {
      if (!isFinite(edge) || edge <= 0) return;
      var key = String(Math.round(edge));
      if (seen[key]) return;
      seen[key] = true;
      unique.push(Math.round(edge));
    });
    unique.sort(function (a, b) { return a - b; });

    function packageRate(earnings) {
      var last = tiers[tiers.length - 1];
      var oasdi = last.oasdi;
      var hi = last.hi;
      var cuts = [];
      if (tier0 && tier0.upTo > 0) cuts.push(tier0);
      tiers.forEach(function (tier) { cuts.push(tier); });
      var floor = 0;
      for (var c = 0; c < cuts.length; c++) {
        var end = cuts[c].upTo == null ? Infinity : Math.max(floor + 1000, Number(cuts[c].upTo));
        if (earnings <= end) {
          oasdi = cuts[c].oasdi;
          hi = cuts[c].hi;
          break;
        }
        floor = end;
      }
      if (simulating && earnings > LEVY_DOLLARS) {
        oasdi += ssTotal;
        hi += hiTotal;
      }
      if (fund === "oasi") return oasdi * (10.6 / 12.4);
      if (fund === "hi") return hi;
      return oasdi;
    }

    function lawRate(earnings) {
      if (fund === "hi") return earnings <= HI_SURTAX_DOLLARS ? 2.9 : 3.8;
      var base = fund === "oasi" ? 10.6 : 12.4;
      return earnings <= WAGE_BASE_DOLLARS ? base : 0;
    }

    block.hidden = false;
    drawStepChart(host, {
      label: "Payroll tax rates, your package and Current Law",
      edges: unique,
      series: [
        { name: "Your package", color: "#1e3a5f", rateAt: packageRate },
        { name: "Current Law", color: "#8aa0b8", dash: "6 4", rateAt: lawRate }
      ]
    });
    paintTierShares(tiers, ssLevy, hiLevy, tier0);
  }

  function paintCharts(result) {
    var fund = selected("program") || "oasdi";
    var names = {
      oasdi: "Combined Social Security",
      oasi: "Retirement and survivors",
      hi: "Medicare hospital insurance"
    };
    var yours = rowsFor(result, fund);
    var law = rowsFor(currentLaw, fund);
    var shortfall = byId("shortfall").checked;
    var reserveField = shortfall ? "reserveHypStartReal" : "reserveStartReal";
    var markers = [];
    if (result.summary[fund].depletionYear) {
      markers.push({ year: result.summary[fund].depletionYear, color: "#1e3a5f" });
    }
    if (currentLaw.summary[fund].depletionYear) {
      markers.push({ year: currentLaw.summary[fund].depletionYear, color: "#8aa0b8" });
    }
    if (packageOn) {
      markers.push({ year: Number(byId("solve-effective").value), color: "#9a6700" });
      markers.push({ year: Number(byId("solve-target").value), color: "#6b3fa0" });
    }
    var transferOn = Number(byId("federal-transfer").value) > 0;
    var incomeOn = !!(byId("income-option") && byId("income-option").checked);
    var tradeOn = !!(byId("trade-option") && byId("trade-option").checked);
    var healthOn = !!(byId("health-option") && byId("health-option").checked);
    var depositHere = fund === "hi" ? (incomeOn || tradeOn || healthOn) : (incomeOn || tradeOn);
    var colaOn = !!(byId("cola-option") && byId("cola-option").checked);
    var earlyMoney = transferOn && depositHere
      ? "The federal transfer and the proposed options are in the solid line from 2026, even before a later start date, so the solid line is not Current Law before then."
      : transferOn
        ? "The federal transfer is in the solid line from 2026, even before a later start date, so the solid line is not Current Law before then."
        : depositHere
          ? "The proposed options are in the solid line from 2026, even before a later start date, so the solid line is not Current Law before then."
          : "";
    byId("chart-markers").textContent = packageOn
      ? "The gold line is the January 1 start. The purple line is the year the package is asked to reach. Tax and age changes wait until that January 1. " +
        (earlyMoney || "Before that date, the solid line matches Current Law.")
      : earlyMoney;

    var depositNote = transferOn && depositHere
      ? " The green line includes the federal transfer and the proposed deposits from 2026. The dashed line leaves that money out."
      : transferOn
        ? " The green line includes the federal transfer from 2026. The dashed line leaves that money out."
        : depositHere
          ? " The green line includes the proposed deposits from 2026. The dashed line leaves that money out."
          : "";
    var tradeNote = "";
    if (tradeOn && fund === "hi") {
      tradeNote = " The stock-trade tariff is in this green line: 0.298% on the buy and 0.298% on the sale, hospital insurance’s share. The red cost line does not change.";
    } else if (tradeOn && fund === "oasdi") {
      tradeNote = " The stock-trade tariff is in this green line: 0.298% on the buy and 0.298% on the sale. This combined line includes the retirement share and the disability share. The red cost line does not change.";
    } else if (tradeOn) {
      tradeNote = " The stock-trade tariff is in this green line: 0.298% on the buy and 0.298% on the sale, retirement’s share only. Disability’s share is in the combined Social Security chart. The red cost line does not change.";
    }
    byId("flow-note").textContent = (fund === "hi"
      ? "Green is tax money. Red is the cost of promised hospital care. Both are a percent of taxed wages. Medicare’s wage total is larger because there is no wage cap. The dashed line is Current Law."
      : "Green is tax money. Red is the cost of promised benefits. Both are a percent of taxed wages. The dashed line is Current Law.") + depositNote + tradeNote +
      (colaOn && fund === "hi"
        ? " The slower Social Security raise is on. It does not change hospital cost, so the red lines stay together."
        : colaOn
          ? " The solid red line is the smaller yearly benefit raise. The dashed red line is today’s raise."
          : "");

    drawChart(byId("chart-ratio"), {
      label: names[fund] + " savings compared with one year of cost, your package and Current Law",
      kind: "ratio",
      includeZero: true,
      markers: markers,
      series: [
        { name: "Your package", color: "#1e3a5f", values: points(yours, "ratio") },
        { name: "Current Law", color: "#8aa0b8", dash: "6 4", values: points(law, "ratio") }
      ]
    });
    drawChart(byId("chart-flow"), {
      label: names[fund] + " tax money and promised cost",
      kind: "rate",
      includeZero: true,
      markers: markers,
      series: [
        { name: "Tax money, your package", color: "#0f6b3c", values: points(yours, "incomeRate") },
        { name: "Promised cost, your package", color: "#8c2f2f", values: points(yours, "costRate") },
        { name: "Tax money, Current Law", color: "#0f6b3c", dash: "6 4", values: points(law, "incomeRate") },
        { name: "Promised cost, Current Law", color: "#8c2f2f", dash: "6 4", values: points(law, "costRate") }
      ]
    });
    drawChart(byId("chart-reserves"), {
      label: names[fund] + " savings in trillions of 2026 dollars",
      kind: "dollars",
      includeZero: true,
      markers: markers,
      series: [
        { name: shortfall ? "Your package, including the unpaid gap" : "Your package", color: "#1e3a5f", values: points(yours, reserveField) },
        { name: shortfall ? "Current Law, including the unpaid gap" : "Current Law", color: "#8aa0b8", dash: "6 4", values: points(law, reserveField) }
      ]
    });
    paintPayrollRates(fund);
  }

  var currentLawForm = null;

  function controlKey(el) {
    return el.id || (el.name + ":" + el.value);
  }

  function controlState(el) {
    if (el.type === "checkbox" || el.type === "radio") return el.checked ? "1" : "0";
    if (el.type === "number" || el.type === "range") {
      if (el.value === "") return "";
      var numeric = Number(el.value);
      return isFinite(numeric) ? String(numeric) : String(el.value);
    }
    return String(el.value);
  }

  function captureCurrentLawForm() {
    currentLawForm = {};
    var controls = document.querySelectorAll("#controls input, #controls select, #controls textarea");
    for (var i = 0; i < controls.length; i++) {
      if (controls[i].name === "tier0-choice" || controls[i].name === "tier-schedule") continue;
      currentLawForm[controlKey(controls[i])] = controlState(controls[i]);
    }
  }

  function restoreCurrentLawForm() {
    if (!currentLawForm) return;
    var controls = document.querySelectorAll("#controls input, #controls select, #controls textarea");
    for (var i = 0; i < controls.length; i++) {
      var el = controls[i];
      var state = currentLawForm[controlKey(el)];
      if (state == null) continue;
      if (el.type === "checkbox" || el.type === "radio") el.checked = state === "1";
      else el.value = state;
    }
  }

  function formIsCurrentLaw() {
    if (packageOn || !currentLawForm) return false;
    var controls = document.querySelectorAll("#controls input, #controls select, #controls textarea");
    for (var i = 0; i < controls.length; i++) {
      var el = controls[i];
      if (el.name === "tier0-choice" || el.name === "tier-schedule") continue;
      if (currentLawForm[controlKey(el)] !== controlState(el)) return false;
    }
    return true;
  }

  function workerNote(share) {
    if (!(share > 0) || share < 1 / 1000000) {
      return "Fewer than 1 in a million workers have earnings in this band.";
    }
    if (share >= 0.999) return "More than 99.9% of workers have earnings in this band.";
    if (share >= 0.1) return "About " + Math.round(share * 100) + "% of workers have earnings in this band.";
    if (share >= 0.01) {
      return "About " + (Math.round(share * 1000) / 10).toFixed(1) + "% of workers have earnings in this band.";
    }
    var oneIn = Math.round(1 / share);
    if (oneIn >= 10000) oneIn = Math.round(oneIn / 1000) * 1000;
    else if (oneIn >= 1000) oneIn = Math.round(oneIn / 100) * 100;
    else if (oneIn >= 100) oneIn = Math.round(oneIn / 10) * 10;
    return "About 1 in " + oneIn.toLocaleString("en-US") + " workers has earnings in this band.";
  }

  function paintWorkerNotes() {
    var count = tierCount();
    var lo = 0;
    for (var i = 0; i < count; i++) {
      var note = byId("tier-workers-" + i);
      if (!note) continue;
      var upInput = byId("tier-upto-" + i + "-num");
      var hi = upInput ? Number(upInput.value) : Infinity;
      if (!isFinite(hi) || hi <= lo) hi = Infinity;
      note.textContent = workerNote(model.workerCdf(hi) - model.workerCdf(lo));
      if (upInput && isFinite(Number(upInput.value)) && Number(upInput.value) > lo) lo = Number(upInput.value);
    }
  }

  function paintHealthHeading() {
    var current = formIsCurrentLaw();
    var flags = document.querySelectorAll("[data-mode-flag]");
    for (var i = 0; i < flags.length; i++) {
      flags[i].textContent = current ? "Current Law" : "Simulation";
      flags[i].dataset.state = current ? "current" : "simulation";
    }
  }

  function currentLawTierText(i) {
    var lines = [
      "Current Law is not one rate on this band. Social Security is 12.4% through the $184,500 wage base and 0% from there through $1,000,000. Medicare hospital insurance is 2.9% through $200,000 and 3.8% above $200,000. A simulation uses one rate for the whole band and tries to keep Social Security at or under 13.45% and Medicare at or under 3.65%.",
      "Current Law on this band: Social Security 0%, and Medicare hospital insurance 3.8% (2.9% plus the extra 0.9% the worker pays above $200,000).",
      "Current Law on this band: Social Security 0%, and Medicare hospital insurance 3.8% (2.9% plus the extra 0.9% the worker pays above $200,000).",
      "Current Law on this band: Social Security 0%, and Medicare hospital insurance 3.8% (2.9% plus the extra 0.9% the worker pays above $200,000). The 7% Social Security tariff and the 3% Medicare tariff are not Current Law."
    ];
    return lines[i] || lines[lines.length - 1];
  }

  function paintTierFlag(flag, lawNote, simulation) {
    if (flag) {
      flag.textContent = simulation ? "Simulation" : "Current Law";
      flag.dataset.state = simulation ? "simulation" : "current";
    }
    if (lawNote) lawNote.hidden = !simulation;
  }

  function paintTierSchedule() {
    var mode = selected("mode") || "current";
    var currentInput = document.querySelector('input[name="tier-schedule"][value="current"]');
    var simInput = document.querySelector('input[name="tier-schedule"][value="simulation"]');
    if (currentInput) currentInput.checked = mode === "current";
    if (simInput) simInput.checked = mode === "tiers";
    var flag = byId("tiers-flag");
    if (!flag) return;
    var simulation = mode === "tiers";
    if (mode === "flat") {
      flag.textContent = "Not in use";
      flag.dataset.state = "current";
    } else {
      flag.textContent = simulation ? "Simulation" : "Current Law";
      flag.dataset.state = simulation ? "simulation" : "current";
    }
    for (var i = 0; i < tierCount(); i++) {
      paintTierFlag(byId("tier-flag-" + i), byId("tier-law-" + i), simulation);
    }
  }

  function render(announce) {
    paintHealthHeading();
    paintWorkerNotes();
    paintTierSchedule();
    paintTariffNote();
    paintUpperPayer();
    var scenario = withPackage(readScenario());
    if (packageOn) scenario.topTail = true;
    var result = model.project(scenario);
    paintFund("oasi", result.summary.oasi, currentLaw.summary.oasi);
    paintFund("oasdi", result.summary.oasdi, currentLaw.summary.oasdi);
    paintFund("hi", result.summary.hi, currentLaw.summary.hi);
    var di = result.summary.di;
    byId("di-note").textContent = di.depletionYear == null
      ? "The disability account by itself still pays full promised benefits through 2100. At the end of 2025, 8.2 million people received disability benefits."
      : "The disability account runs out in " + depleteText(di) + " under this package.";
    var text = narrative(result, scenario);
    var advice = solvencyRecommendations(result, scenario);
    byId("narrative").textContent = text;
    var recommendations = byId("recommendations");
    recommendations.hidden = advice === "";
    recommendations.textContent = advice;
    if (announce) byId("narrative-live").textContent = advice === "" ? text : text + " " + advice;
    paintSummary(scenario);
    paintEffects(scenario);
    paintPackageNote(scenario);
    paintClamp(scenario);
    paintCharts(result);
  }

  function setPair(rangeId, numberId, value) {
    byId(numberId).value = value;
    var range = byId(rangeId);
    var numeric = Number(value);
    range.value = String(Math.min(Number(range.max), Math.max(Number(range.min), numeric)));
  }

  function reset() {
    document.querySelector('input[name="mode"][value="current"]').checked = true;
    fillTiers(model.defaultTiers());
    setPair("fra", "fra-num", 67);
    setPair("eea", "eea-num", 62);
    setPair("medicare-age", "medicare-age-num", 65);
    setPair("months", "months-num", 2);
    byId("federal-transfer").value = "0";
    packageOn = false;
    byId("solve-next").hidden = true;
    byId("solve-result").textContent = "";
    restoreCurrentLawForm();
    render(true);
  }

  function paintTariffNote() {
    var simulating = packageOn || selected("mode") === "tiers";
    var payer = selected("levy-payer") === "employer" ? "employer" : "split";
    var ss = model.levyShares(Number(byId("solve-ss").value) || 0, payer);
    var hi = model.levyShares(Number(byId("solve-hi").value) || 0, payer);
    var text = "National Social Security tariff " + formatRate(ss.total) +
      ": worker " + formatRate(ss.worker) + ", employer " + formatRate(ss.employer) +
      ". National Medicare tariff " + formatRate(hi.total) +
      ": worker " + formatRate(hi.worker) + ", employer " + formatRate(hi.employer) +
      ". The savings accounts receive the full tariff either way.";
    var note = byId("tier-tariff-note");
    if (note) {
      var last = tierCount() - 1;
      var ssBox = Number(byId("tier-oasdi-" + last + "-num").value) || 0;
      var hiBox = Number(byId("tier-hi-" + last + "-num").value) || 0;
      var ssTariff = simulating ? ss.total : 0;
      var hiTariff = simulating ? hi.total : 0;
      function showFormula(id, value) {
        var field = byId(id);
        if (field) field.textContent = formatRate(value);
      }
      showFormula("formula-ss-rate", ssBox);
      showFormula("formula-ss-tariff", ssTariff);
      showFormula("formula-ss-total", ssBox + ssTariff);
      showFormula("formula-hi-rate", hiBox);
      showFormula("formula-hi-tariff", hiTariff);
      showFormula("formula-hi-total", hiBox + hiTariff);
      var aside = byId("tier-tariff-aside");
      if (aside) {
        aside.textContent = "The combined rate does not include the tariff. A simulation charges the total on pay above $10 million. Current Law leaves the tariff out. A tariff does not raise anyone’s benefit.";
      }
    }
    var hint = byId("levy-split-hint");
    if (hint) {
      hint.textContent = simulating
        ? text
        : "Split evenly means the worker and the employer each pay half. Employer pays the whole moves the worker’s half onto the employer. Current Law does not use these tariffs.";
    }
  }

  function paintUpperPayer() {
    var on = employerPaysUpper();
    for (var i = 1; i < tierCount(); i++) {
      var note = byId("tier-pay-note-" + i);
      if (!note) continue;
      var ss = model.levyShares(Number(byId("tier-oasdi-" + i + "-num").value) || 0, "employer");
      var hi = model.levyShares(Number(byId("tier-hi-" + i + "-num").value) || 0, "employer");
      note.textContent = "The employer pays the entire " + formatRate(ss.employer) +
        " Social Security tax and the entire " + formatRate(hi.employer) +
        " Medicare tax. The worker pays " + formatRate(ss.worker) +
        " and " + formatRate(hi.worker) +
        ". Benefits stay full, and these wages still count toward a future benefit the same way they do when the tax is shared.";
      note.classList.toggle("is-on", on);
    }
  }

  function closeTo(value, target) {
    return Math.abs(Number(value) - target) < 0.02;
  }

  function tier0IsEmployerSim(oasdi, hi) {
    return closeTo(oasdi, 6.5) && closeTo(hi, 1.6);
  }

  function scheduleList(tiers, key) {
    return tiers.map(function (tier, i) {
      var band = tier.upTo == null
        ? "above " + dollarText(tiers[i - 1].upTo)
        : (i === 0
          ? "through " + dollarText(tier.upTo)
          : dollarText(tiers[i - 1].upTo + 1) + " to " + dollarText(tier.upTo));
      return band + " at " + Number(tier[key]).toFixed(2) + "%";
    }).join("; ");
  }

  function findTaxes() {
    var solved = model.solveTaxes({
      fra: Number(byId("fra-num").value),
      eea: Number(byId("eea-num").value),
      medicareAge: Number(byId("medicare-age-num").value),
      targetYear: Number(byId("solve-target").value),
      effectiveYear: Number(byId("solve-effective").value),
      ssLevy: Number(byId("solve-ss").value),
      hiLevy: Number(byId("solve-hi").value),
      levyPayer: selected("levy-payer") === "employer" ? "employer" : "split",
      federalTransfer: readTransfer(),
      extraOasi: readProposed().oasi,
      extraHi: readProposed().hi,
      extraDi: readProposed().di,
      chainedCola: !!(byId("cola-option") && byId("cola-option").checked),
      evenRates: !!(byId("even-rates") && byId("even-rates").checked),
      softCapFirst: { oasdi: 13.45, hi: 3.65 },
      cutoffs: [
        Number(byId("tier-upto-0-num").value),
        Number(byId("tier-upto-1-num").value),
        Number(byId("tier-upto-2-num").value)
      ]
    });
    document.querySelector('input[name="mode"][value="tiers"]').checked = true;
    var merged = solved.tiers;
    fillTiers(merged);
    setPair("fra", "fra-num", solved.fra);
    setPair("medicare-age", "medicare-age-num", solved.medicareAge);
    packageOn = true;
    var capNote = solved.capped ? " under the 45% combined-rate cap" : " at the top of the search";
    var retirementSentence = solved.evenRates
      ? (solved.oasiReached
        ? "Retirement and survivors lasts through " + solved.targetYear + ". "
        : "Retirement and survivors still does not last through " + solved.targetYear + capNote + ". ")
      : "";
    var ssSentence = solved.oasdiReached
      ? "Combined Social Security lasts through " + solved.targetYear + "."
      : "Combined Social Security still does not last through " + solved.targetYear + capNote + ".";
    var hiSentence = solved.hiReached
      ? "Medicare hospital insurance lasts through " + solved.targetYear + "."
      : "Medicare hospital insurance still does not last through " + solved.targetYear + capNote + ".";
    var tierSentence = solved.evenRates
      ? " The Tier 1 soft cap is off. About the same rate is used on every tier. The soft cap would have tried to keep Tier 1 at or under 13.45% Social Security and 3.65% Medicare."
      : " Tier 1 runs through $1,000,000. The simulator tries to keep that band at or under 13.45% Social Security and 3.65% Medicare. Tier 2 can rise by as much as 4 percentage points above Tier 1. Tiers 3 and 4 take any rate still needed above that.";
    byId("solve-next").hidden = false;
    byId("solve-result").textContent =
      "Takes effect January 1, " + solved.effectiveYear +
      ". Full retirement age " + solved.fra +
      " and Medicare hospital insurance at " + solved.medicareAge +
      ". Social Security rates, from Tier 1 through the top band: " + scheduleList(merged, "oasdi") +
      ". Medicare hospital insurance rates, from Tier 1 through the top band: " + scheduleList(merged, "hi") +
      "." + tierSentence +
      (employerPaysUpper()
        ? " On Tiers 2, 3, and 4, the employer pays the entire Social Security and Medicare tax. The worker pays nothing. The savings accounts still receive the full tax. Benefits stay full, and those wages still count toward a future benefit the same way they do when the tax is shared."
        : "") +
      " Pay above $10 million also pays a " + solved.ssLevy +
      "% National Social Security tariff (" + model.levyShares(solved.ssLevy, selected("levy-payer")).worker +
      "% worker and " + model.levyShares(solved.ssLevy, selected("levy-payer")).employer +
      "% employer) on top of the top Social Security rate, and a " + solved.hiLevy +
      "% National Medicare tariff (" + model.levyShares(solved.hiLevy, selected("levy-payer")).worker +
      "% worker and " + model.levyShares(solved.hiLevy, selected("levy-payer")).employer +
      "% employer) on top of the top hospital rate. A tariff here is an extra charge. It is not a tax on imported goods, and it does not raise that person’s benefit. The savings accounts receive the full tariff either way. " +
      "Tiers 3 and 4 are " + formatShare(solved.oasdiTopShare) +
      " of combined Social Security payroll tax and " + formatShare(solved.hiTopShare) +
      " of Medicare hospital-insurance payroll tax. " +
      retirementSentence + ssSentence + " " + hiSentence;
    render(true);
  }

  function agesAtCurrentLaw() {
    return Number(byId("fra-num").value) === 67 &&
      Number(byId("eea-num").value) === 62 &&
      Number(byId("medicare-age-num").value) === 65;
  }

  var solvingForAges = false;
  function updateTiersForAges() {
    if (solvingForAges || agesAtCurrentLaw()) return;
    solvingForAges = true;
    try {
      findTaxes();
    } finally {
      solvingForAges = false;
    }
  }

  function reportNode(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function reportStamp(when) {
    return when.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short"
    });
  }

  function reportSheet(title) {
    var section = reportNode("section", "pdf-sheet");
    section.appendChild(reportNode("h2", "", title));
    return section;
  }

  function reportRow(label, value) {
    var row = document.createElement("tr");
    row.appendChild(reportNode("th", "", label));
    row.appendChild(reportNode("td", "", value));
    return row;
  }

  function reportCheckedLabel(name) {
    var node = document.querySelector('input[name="' + name + '"]:checked');
    if (!node) return "";
    var label = node.closest("label");
    return label ? label.textContent.replace(/\s+/g, " ").trim() : node.value;
  }

  function reportDollars(value) {
    var amount = Number(value);
    if (!isFinite(amount)) return String(value);
    return "$" + amount.toLocaleString("en-US");
  }

  function reportPercent(value) {
    var amount = Number(value);
    if (!isFinite(amount)) return String(value);
    return amount.toLocaleString("en-US", { maximumFractionDigits: 2 }) + "%";
  }

  function reportChart(title, note, hostId) {
    var figure = reportNode("figure", "pdf-chart");
    var caption = document.createElement("figcaption");
    caption.appendChild(reportNode("h3", "", title));
    if (note) caption.appendChild(reportNode("p", "pdf-muted", note));
    figure.appendChild(caption);
    var host = reportNode("div", "chart-host");
    host.innerHTML = byId(hostId).innerHTML;
    var tip = host.querySelector(".tooltip");
    if (tip) tip.remove();
    figure.appendChild(host);
    return figure;
  }

  function reportHealthCard(fund, title) {
    var card = reportNode("article", "pdf-fund");
    var heading = reportNode("h3", "");
    heading.appendChild(document.createTextNode(title + " "));
    var status = reportNode("span", "pdf-status", byId("status-" + fund).textContent);
    status.dataset.state = byId("card-" + fund).dataset.status || "critical";
    heading.appendChild(status);
    card.appendChild(heading);
    var about = byId("card-" + fund).querySelector(".card-about");
    if (about && about.textContent) card.appendChild(reportNode("p", "pdf-muted", about.textContent.replace(/\s+/g, " ").trim()));
    card.appendChild(reportNode("p", "", "Year the savings account runs out: " + byId("deplete-" + fund).textContent));
    card.appendChild(reportNode("p", "pdf-law", byId("deplete-" + fund + "-law").textContent));
    var shareLabel = fund === "hi"
      ? "Share of hospital costs that incoming money can still pay"
      : "Share of promised benefits that incoming money can still pay";
    card.appendChild(reportNode("p", "", shareLabel + ": " + byId("payable-" + fund).textContent));
    card.appendChild(reportNode("p", "pdf-law", byId("payable-" + fund + "-law").textContent));
    card.appendChild(reportNode("p", "", "Savings compared with one year of cost: " + byId("ratio-" + fund).textContent));
    card.appendChild(reportNode("p", "pdf-law", byId("ratio-" + fund + "-law").textContent));
    return card;
  }

  function reportFlag(flag) {
    if (!flag) return null;
    var copy = flag.cloneNode(true);
    copy.removeAttribute("data-mode-flag");
    return copy;
  }

  function fillPdfReport(stamp) {
    var report = byId("pdf-report");
    report.innerHTML = "";
    report.appendChild(reportNode("p", "pdf-running", "Simulation report · " + stamp));
    var mode = byId("health-heading").querySelector(".mode-flag");
    var health = reportSheet("Solvency Simulation Summary Report");
    var healthTitle = health.querySelector("h2");
    if (healthTitle && mode) healthTitle.appendChild(reportFlag(mode));
    health.appendChild(reportNode("p", "pdf-lead", "Report run " + stamp + "."));
    if (byId("summary-lead")) health.appendChild(reportNode("p", "", byId("summary-lead").textContent));
    if (byId("summary-review")) health.appendChild(byId("summary-review").cloneNode(true));
    health.appendChild(reportNode("p", "pdf-muted", "This is a teaching report, not an official projection. The full notice is on the last page."));
    var settingsHeading = reportNode("h3", "", "Settings used for this run");
    var settingsFlag = byId("summary-settings-heading") && byId("summary-settings-heading").querySelector(".mode-flag");
    if (settingsFlag) settingsHeading.appendChild(reportFlag(settingsFlag));
    health.appendChild(settingsHeading);
    if (byId("summary-params")) health.appendChild(byId("summary-params").cloneNode(true));
    var runEffects = byId("effects");
    if (runEffects && runEffects.textContent.trim()) {
      health.appendChild(reportNode("h3", "", "What these settings do"));
      health.appendChild(runEffects.cloneNode(true));
    }
    health.appendChild(reportNode("h3", "", "System Health"));
    if (byId("narrative") && byId("narrative").textContent) {
      health.appendChild(reportNode("p", "", byId("narrative").textContent));
    }
    var advice = byId("recommendations");
    if (advice && !advice.hidden && advice.textContent) {
      health.appendChild(reportNode("p", "pdf-rec", advice.textContent));
    }
    var packageNote = byId("package-note");
    if (packageNote && packageNote.textContent) health.appendChild(reportNode("p", "pdf-muted", packageNote.textContent));
    health.appendChild(reportHealthCard("oasi", "Retirement and survivors"));
    health.appendChild(reportHealthCard("oasdi", "Social Security, combined"));
    var di = byId("di-note").textContent;
    if (di) health.lastChild.appendChild(reportNode("p", "", di));
    health.appendChild(reportHealthCard("hi", "Medicare hospital insurance"));
    var healthNotes = document.querySelectorAll(".summary-report > p.fine");
    var healthFine = healthNotes.length ? healthNotes[healthNotes.length - 1] : null;
    if (healthFine && healthFine.id !== "package-note") health.appendChild(healthFine.cloneNode(true));
    report.appendChild(health);

    var settings = reportSheet("Settings used for this run");
    var settingsTitle = settings.querySelector("h2");
    if (settingsTitle && settingsFlag) settingsTitle.appendChild(reportFlag(settingsFlag));
    var facts = document.createElement("table");
    facts.className = "pdf-table";
    var factsBody = document.createElement("tbody");
    [
      ["Social Security full retirement age", byId("fra-num").value],
      ["Earliest age to claim Social Security", byId("eea-num").value],
      ["Medicare hospital insurance eligibility age", byId("medicare-age-num").value],
      ["Phase-in, months of age per year", byId("months-num").value],
      ["Remains solvent until this year", byId("solve-target").value],
      ["Takes effect January 1", byId("solve-effective").value],
      ["National Social Security tariff above $10 million", reportPercent(byId("solve-ss").value)],
      ["National Medicare tariff above $10 million", reportPercent(byId("solve-hi").value)],
      ["Who pays the tariffs above $10 million", reportCheckedLabel("levy-payer")],
      ["Annual transfer from other federal funds to the Trust funds, billions of dollars (optional)", byId("federal-transfer").value + " billion 2026 dollars each year through 2100"],
      ["Payroll tax to employer-paid health insurance, proposed option", byId("health-option").checked ? "On. Hospital insurance receives " + byId("health-hi").value + " billion of 2026 dollars each year. Social Security and disability receive none." : "Off"],
      ["Broader income tax, proposed option", byId("income-option").checked ? "On. Retirement " + byId("income-oasi").value + " billion and hospital insurance " + byId("income-hi").value + " billion of 2026 dollars each year" : "Off"],
      ["Stock-trade tariff, proposed option", byId("trade-option").checked ? "On. 0.298% on the buy and 0.298% on the sale. Retirement " + byId("trade-oasi").value + " billion, disability " + byId("trade-di").value + " billion, and hospital insurance " + byId("trade-hi").value + " billion of 2026 dollars each year" : "Off"],
      ["Slower yearly benefit increase, proposed option", byId("cola-option").checked ? "On. The yearly Social Security raise uses the chained price index, about 0.3 percentage points less than today’s raise. Hospital insurance is unchanged." : "Off"],
      ["Tier 1 soft cap", byId("even-rates").checked ? "Removed. About the same payroll rate is used on every tier. This is not Current Law." : "On. Tier 1 stays at or under 13.45% Social Security and 3.65% Medicare."],
      ["Newly taxed earnings and future benefits", "Do not raise benefits above today’s wage base"],
      ["Who pays Tiers 2, 3, and 4", reportCheckedLabel("upper-payer") || "Worker and employer share the tax"]
    ].forEach(function (pair) {
      factsBody.appendChild(reportRow(pair[0], pair[1]));
    });
    facts.appendChild(factsBody);
    settings.appendChild(facts);

    var tiers = document.createElement("table");
    tiers.className = "pdf-table";
    var head = document.createElement("thead");
    var headRow = document.createElement("tr");
    ["Band", "Earnings", "Social Security", "Medicare hospital insurance", "Workers in this band"].forEach(function (label) {
      headRow.appendChild(reportNode("th", "", label));
    });
    head.appendChild(headRow);
    tiers.appendChild(head);
    var tierBody = document.createElement("tbody");
    var count = tierCount();
    for (var i = 0; i < count; i++) {
      var upInput = byId("tier-upto-" + i + "-num");
      var earnings = upInput ? "Through " + reportDollars(upInput.value) : "Above " + reportDollars(byId("tier-upto-" + (i - 1) + "-num").value);
      var row = document.createElement("tr");
      [ "Tier " + (i + 1), earnings, reportPercent(byId("tier-oasdi-" + i + "-num").value), reportPercent(byId("tier-hi-" + i + "-num").value), byId("tier-workers-" + i).textContent ].forEach(function (value) {
        row.appendChild(reportNode("td", "", value));
      });
      tierBody.appendChild(row);
    }
    tiers.appendChild(tierBody);
    settings.appendChild(reportNode("h3", "", "Income tiers"));
    settings.appendChild(tiers);
    var formulaSs = byId("formula-ss-rate");
    var formulaAside = byId("tier-tariff-aside");
    if (formulaSs && formulaAside) {
      settings.appendChild(reportNode("p", "",
        "Social Security combined rate " + formulaSs.textContent +
        " + National Social Security tariff " + byId("formula-ss-tariff").textContent +
        " = Total Social Security rate " + byId("formula-ss-total").textContent +
        ". Medicare hospital insurance combined rate " + byId("formula-hi-rate").textContent +
        " + National Medicare tariff " + byId("formula-hi-tariff").textContent +
        " = Total Medicare hospital insurance rate " + byId("formula-hi-total").textContent +
        ". " + formulaAside.textContent));
    }
    var solved = byId("solve-result").textContent;
    if (solved) {
      settings.appendChild(reportNode("h3", "", "Simulator result"));
      settings.appendChild(reportNode("p", "", solved));
    }
    settings.appendChild(reportNode("p", "pdf-back", "Back to the Solvency Simulation Summary Report, at the start of this report."));
    report.appendChild(settings);

    var previousFund = selected("program") || "oasdi";
    var funds = [
      ["oasdi", "Social Security, combined"],
      ["oasi", "Retirement and survivors"],
      ["hi", "Medicare hospital insurance"]
    ];
    var shareTable = "";
    var shareNote = "";
    funds.forEach(function (pair) {
      document.querySelector('input[name="program"][value="' + pair[0] + '"]').checked = true;
      var scenario = withPackage(readScenario());
      if (packageOn) scenario.topTail = true;
      paintCharts(model.project(scenario));
      var charts = reportSheet("Charts: " + pair[1]);
      charts.appendChild(reportNode("p", "pdf-muted", "The solid line is this run. The dashed line is Current Law."));
      charts.appendChild(reportChart("Savings compared with one year of cost", "After the account runs out, the line is zero. Over 100% means more than one year of cost is saved.", "chart-ratio"));
      charts.appendChild(reportChart("Money in and promised cost", byId("flow-note").textContent, "chart-flow"));
      charts.appendChild(reportChart("Savings", "Trillions of 2026 dollars, at the start of each year.", "chart-reserves"));
      if (!byId("rates-block").hidden && byId("chart-rates").querySelector("svg")) {
        charts.appendChild(reportChart("Payroll tax rates", "The dashed line is today’s tax rate under Current Law.", "chart-rates"));
        shareTable = byId("tier-share-table").outerHTML;
        shareNote = byId("tier-share-note").textContent;
      }
      report.appendChild(charts);
    });
    document.querySelector('input[name="program"][value="' + previousFund + '"]').checked = true;
    var restore = withPackage(readScenario());
    if (packageOn) restore.topTail = true;
    paintCharts(model.project(restore));
    if (shareTable) {
      var shares = reportSheet("About how much tax each band pays");
      if (shareNote) shares.appendChild(reportNode("p", "pdf-muted", shareNote));
      var wrap = reportNode("div", "share-wrap");
      wrap.innerHTML = shareTable;
      shares.appendChild(wrap);
      report.appendChild(shares);
    }

    var closing = reportSheet("What this tool does and does not do");
    var about = document.querySelector(".prose");
    Array.prototype.forEach.call(about.children, function (child) {
      if (child.id === "about-heading") return;
      closing.appendChild(child.cloneNode(true));
    });
    var disclaimer = reportNode("div", "pdf-disclaimer");
    Array.prototype.forEach.call(document.querySelectorAll("footer p"), function (paragraph) {
      disclaimer.appendChild(paragraph.cloneNode(true));
    });
    closing.appendChild(disclaimer);
    report.appendChild(closing);
  }

  function createPdfReport() {
    var when = new Date();
    var stamp = reportStamp(when);
    fillPdfReport(stamp);
    document.body.classList.add("report-print");
    var previousTitle = document.title;
    document.title = "Simulation report " + stamp.replace(/:/g, ".").replace(/[\\/*?"<>|]/g, "");
    function finish() {
      document.body.classList.remove("report-print");
      document.title = previousTitle;
      window.removeEventListener("afterprint", finish);
    }
    window.addEventListener("afterprint", finish);
    window.print();
  }

  buildTiers();
  ["fra", "eea", "medicare-age", "months"].forEach(function (id) {
    bindPair(id, id + "-num");
  });
  ["fra", "fra-num", "eea", "eea-num", "medicare-age", "medicare-age-num"].forEach(function (id) {
    byId(id).addEventListener("change", updateTiersForAges);
  });
  document.querySelectorAll('input[name="upper-payer"]').forEach(function (input) {
    input.addEventListener("change", function () {
      if (input.value === "employer") {
        document.querySelector('input[name="mode"][value="tiers"]').checked = true;
      }
    });
  });
  document.querySelectorAll('input[name="tier-schedule"]').forEach(function (input) {
    input.addEventListener("change", function () {
      if (input.value === "current") {
        document.querySelector('input[name="mode"][value="current"]').checked = true;
        fillTiers(model.defaultTiers());
        var sharedTax = document.querySelector('input[name="upper-payer"][value="split"]');
        if (sharedTax) sharedTax.checked = true;
      } else {
        document.querySelector('input[name="mode"][value="tiers"]').checked = true;
      }
    });
  });
  byId("controls").addEventListener("input", function () { render(false); });
  byId("controls").addEventListener("change", function () { render(true); });
  byId("controls").addEventListener("submit", function (event) { event.preventDefault(); });
  byId("reset").addEventListener("click", reset);
  byId("create-pdf").addEventListener("click", createPdfReport);
  byId("create-pdf-end").addEventListener("click", createPdfReport);
  byId("find-taxes").addEventListener("click", findTaxes);
  byId("even-rates").addEventListener("change", function () { findTaxes(); });
  ["income-option", "trade-option", "health-option", "cola-option", "federal-transfer"].forEach(function (id) {
    byId(id).addEventListener("change", function () {
      if (byId("even-rates").checked) findTaxes();
    });
  });
  document.querySelectorAll('input[name="program"]').forEach(function (input) {
    input.addEventListener("input", function () { render(false); });
  });
  byId("shortfall").addEventListener("input", function () { render(false); });
  captureCurrentLawForm();
  render(true);
})();
