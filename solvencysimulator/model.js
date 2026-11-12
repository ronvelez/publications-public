/* Year-by-year trust fund projection for OASDI and Medicare HI.
   Illustrative. Calibrated so Current Law lands on the 2026 Trustees'
   intermediate depletion years. It is not a reproduction of the
   official annual tables. */
(function (root) {
  var START_YEAR = 2026;
  var END_YEAR = 2100;
  var WAGE_BASE = 184500;

  var DEFAULT_ASSUMPTIONS = {
    interest: 0.035,
    payrollGrowthEarly: 0.036,
    payrollGrowthLater: 0.037,
    inflation: 0.024,
    wageGrowth: 0.036,
    oasdiPayroll0: 2561.3 / 1.51 / 0.1537,
    hiPayrollRatio: 1.25,
    oasiReserve0: 2338.3,
    diReserve0: 223.0,
    hiReserve0: 255.7,
    taxableShare: 0.83,
    retirementShareOfOasi: 0.85,
    benefitCreditPassThrough: 0.375,
    fraCutPerYear: 0.0667,
    awardFlow: 1 / 20,
    turnoverYears: 25,
    hiCostSharePerAgeYear: 0.025,
    /* Chained CPI has run about 0.3 points a year below the CPI-W used for today's COLA. */
    chainedColaCut: 0.003,
    /* Smoothed Trustees waypoints. Early points are calibration so the
       funds run out in the published years; 2085 and 2100 match the report. */
    oasdiCost: [[2026, 15.37], [2035, 16.1], [2055, 18.4], [2085, 20.45], [2100, 20.02]],
    oasdiIncome: [[2026, 12.91], [2085, 13.47], [2100, 13.45]],
    diCost: [[2026, 1.25], [2100, 1.45]],
    hiCost: [[2026, 3.49], [2035, 4.4], [2045, 4.54], [2100, 4.86]],
    hiIncome: [[2026, 3.49], [2050, 4.05], [2100, 4.51]]
  };

  function clamp(value, lo, hi) {
    return Math.min(hi, Math.max(lo, value));
  }

  function lerpPoints(year, points) {
    if (year <= points[0][0]) return points[0][1];
    for (var i = 1; i < points.length; i++) {
      if (year <= points[i][0]) {
        var y0 = points[i - 1][0];
        var v0 = points[i - 1][1];
        var y1 = points[i][0];
        var v1 = points[i][1];
        return v0 + (v1 - v0) * ((year - y0) / (y1 - y0));
      }
    }
    return points[points.length - 1][1];
  }

  function normalCdf(x) {
    var t = 1 / (1 + 0.2316419 * Math.abs(x));
    var d = 0.3989422804 * Math.exp(-x * x / 2);
    var p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    return x >= 0 ? 1 - p : p;
  }

  function earningsCdf(multipleOfBase) {
    if (multipleOfBase <= 0) return 0;
    if (!isFinite(multipleOfBase)) return 1;
    var assumptions = root.EARNINGS_ASSUMPTIONS || {
      baseOverAverageWage: 2.45,
      earningsWeightedMu: 0.238,
      earningsWeightedSigma: 0.69
    };
    var earningsOverAverage = multipleOfBase * assumptions.baseOverAverageWage;
    var z = (Math.log(earningsOverAverage) - assumptions.earningsWeightedMu) / assumptions.earningsWeightedSigma;
    return clamp(normalCdf(z), 0, 1);
  }

  /* Share of workers, not share of wages. The earnings-weighted lognormal
     above is the wage distribution. Shifting its mean down by sigma squared
     gives the approximate share of people. */
  function workerCdf(dollars) {
    if (!(dollars > 0)) return 0;
    if (!isFinite(dollars)) return 1;
    var assumptions = root.EARNINGS_ASSUMPTIONS || {
      baseOverAverageWage: 2.45,
      earningsWeightedMu: 0.238,
      earningsWeightedSigma: 0.69
    };
    var average = WAGE_BASE / assumptions.baseOverAverageWage;
    var sigma = assumptions.earningsWeightedSigma;
    var mu = assumptions.earningsWeightedMu - sigma * sigma;
    var z = (Math.log(dollars / average) - mu) / sigma;
    return clamp(normalCdf(z), 0, 1);
  }

  /* Social Security wage statistics, net compensation, 2023.
     https://www.ssa.gov/cgi-bin/netcomp.cgi?year=2023
     Published interval amounts. The $10 million row exists, so the levy
     base is that row and every interval above it. */
  var SSA_NET_COMPENSATION_2023 = 11103241227338.01;
  var SSA_NET_AT_OR_ABOVE_2M_2023 = [
    45906321139.79,
    32422610776.08,
    24427091643.43,
    19385154155.09,
    16227557474.51,
    13100311739.23,
    71591195497.14,
    49126007781.69,
    37657452719.35,
    28988597955.29
  ];
  var SSA_NET_AT_OR_ABOVE_10M_2023 = [
    49126007781.69,
    37657452719.35,
    28988597955.29
  ];

  function sumDollars(values) {
    var total = 0;
    for (var i = 0; i < values.length; i++) total += values[i];
    return total;
  }

  var SHARE_AT_OR_ABOVE_2M = sumDollars(SSA_NET_AT_OR_ABOVE_2M_2023) / SSA_NET_COMPENSATION_2023;
  var SHARE_AT_OR_ABOVE_10M = sumDollars(SSA_NET_AT_OR_ABOVE_10M_2023) / SSA_NET_COMPENSATION_2023;

  function tailSlab(lo, hi, slabLo, slabHi, slabMass) {
    if (!(slabMass > 0) || !(hi > slabLo) || !(lo < slabHi)) return 0;
    if (slabHi === Infinity) return lo <= slabLo + 1e-6 ? slabMass : 0;
    var left = Math.max(lo, slabLo);
    var right = Math.min(hi, slabHi);
    if (!(right > left)) return 0;
    return slabMass * ((right - left) / (slabHi - slabLo));
  }

  /* Earnings under $2 million stay on earningsCdf. The two published
     shares replace only the mass at and above $2 million and $10 million.
     Used by the Find the taxes package and the tier-share table. */
  function packageMass(lo, hi) {
    if (!(hi > lo)) return 0;
    var cut2 = 2000000 / WAGE_BASE;
    var cut10 = 10000000 / WAGE_BASE;
    var mass = 0;
    var bodyHi = Math.min(hi, cut2);
    if (bodyHi > lo) {
      var start = lo <= 0 ? 0 : earningsCdf(lo);
      mass += Math.max(0, earningsCdf(bodyHi) - start);
    }
    mass += tailSlab(lo, hi, cut2, cut10, SHARE_AT_OR_ABOVE_2M - SHARE_AT_OR_ABOVE_10M);
    mass += tailSlab(lo, hi, cut10, Infinity, SHARE_AT_OR_ABOVE_10M);
    return mass;
  }

  function defaultTiers() {
    return [
      { upTo: 1000000, oasdi: 12.4, hi: 2.9 },
      { upTo: 5000000, oasdi: 0, hi: 3.8 },
      { upTo: 10000000, oasdi: 0, hi: 3.8 },
      { upTo: null, oasdi: 0, hi: 3.8 }
    ];
  }

  /* The tariff percent is what the trust fund receives. Split evenly divides
     it between the worker and the employer. Employer-pays-whole moves the
     worker's half onto the employer. The two shares always add up to the total. */
  function levyShares(total, payer) {
    var rate = Number(total);
    if (!isFinite(rate) || rate < 0) rate = 0;
    var cents = Math.round(rate * 100);
    if (payer === "employer") return { worker: 0, employer: cents / 100, total: cents / 100 };
    var workerCents = Math.floor(cents / 2);
    var employerCents = cents - workerCents;
    return { worker: workerCents / 100, employer: employerCents / 100, total: cents / 100 };
  }

  function defaultScenario() {
    return {
      mode: "current",
      oasdiRate: 12.4,
      hiRate: 2.9,
      wageBase: WAGE_BASE,
      noCap: false,
      creditBenefits: true,
      tiers: defaultTiers(),
      freezeBrackets: false,
      fra: 67,
      eea: 62,
      medicareAge: 65,
      monthsPerYear: 2,
      workerRatio: 0,
      workforceGrowth: 0,
      federalTransfer: 0
    };
  }

  function presets() {
    return {
      currentRates: defaultTiers(),
      allEarnings: [
        { upTo: 1000000, oasdi: 12.4, hi: 2.9 },
        { upTo: 5000000, oasdi: 12.4, hi: 2.9 },
        { upTo: 10000000, oasdi: 12.4, hi: 2.9 },
        { upTo: null, oasdi: 12.4, hi: 2.9 }
      ],
      taxAboveBase: [
        { upTo: 1000000, oasdi: 12.4, hi: 2.9 },
        { upTo: 5000000, oasdi: 12.4, hi: 3.8 },
        { upTo: 10000000, oasdi: 12.4, hi: 3.8 },
        { upTo: null, oasdi: 12.4, hi: 3.8 }
      ]
    };
  }

  function normalizeTiers(tiers) {
    var ordered = [];
    var floor = 0;
    for (var i = 0; i < tiers.length; i++) {
      var isLast = i === tiers.length - 1;
      var upTo = isLast ? null : Number(tiers[i].upTo);
      if (!isLast) {
        if (!isFinite(upTo)) upTo = floor + 50000;
        upTo = Math.max(floor + 1000, upTo);
        floor = upTo;
      }
      var oasdiRate = clamp(Number(tiers[i].oasdi) || 0, 0, 40);
      var employerPays = !!tiers[i].employerPays;
      ordered.push({
        upTo: upTo,
        oasdi: oasdiRate,
        hi: clamp(Number(tiers[i].hi) || 0, 0, 40),
        employerPays: employerPays,
        /* The worker's share can be zero while the employer remits the full rate.
           Keep the wage credit whenever that full Social Security rate is still paid. */
        keepCredit: !!tiers[i].keepCredit || (employerPays && oasdiRate > 0)
      });
    }
    return ordered;
  }

  function bracketEnd(upTo, year, freeze, cfg) {
    if (upTo == null) return Infinity;
    var growth = freeze ? Math.pow(1 + cfg.wageGrowth, year - START_YEAR) : 1;
    return (upTo / WAGE_BASE) / growth;
  }

  function averageRates(tiers, year, freeze, cfg, topTail) {
    var prev = 0;
    var oasdi = 0;
    var hi = 0;
    var taxed = 0;
    for (var i = 0; i < tiers.length; i++) {
      var end = bracketEnd(tiers[i].upTo, year, freeze, cfg);
      var mass = topTail ? packageMass(prev, end) : Math.max(0, earningsCdf(end) - earningsCdf(prev));
      /* Employer pays the entire combined rate: worker share is zero, employer
         share is the full rate, and the trust fund still receives that full rate. */
      var oasdiRate = tiers[i].oasdi;
      var hiRate = tiers[i].hi;
      if (tiers[i].employerPays) {
        var ssParts = levyShares(oasdiRate, "employer");
        var hiParts = levyShares(hiRate, "employer");
        oasdiRate = ssParts.worker + ssParts.employer;
        hiRate = hiParts.worker + hiParts.employer;
      }
      oasdi += mass * (oasdiRate / 100);
      hi += mass * (hiRate / 100);
      if (oasdiRate > 0 || tiers[i].keepCredit) taxed += mass;
      prev = end;
    }
    return { oasdi: oasdi, hi: hi, taxed: taxed };
  }

  /* Current-law payroll structure: indexed OASDI cap, HI at 2.9 percent,
     plus the 0.9 percent add-on above an unindexed $200,000. */
  function referenceHiAverage(year, cfg) {
    var growth = Math.pow(1 + cfg.wageGrowth, year - START_YEAR);
    var threshold = (root.EARNINGS_ASSUMPTIONS && root.EARNINGS_ASSUMPTIONS.hiSurtaxThreshold) || 200000;
    var surtax = ((root.EARNINGS_ASSUMPTIONS && root.EARNINGS_ASSUMPTIONS.hiSurtaxRate) || 0.9) / 100;
    var above = 1 - earningsCdf((threshold / WAGE_BASE) / growth);
    return 0.029 + surtax * above;
  }

  function phaseProgress(year, deltaYears, monthsPerYear, origin) {
    if (Math.abs(deltaYears) < 1e-9) return 1;
    var start = origin == null ? START_YEAR : origin;
    var yearsNeeded = Math.abs(deltaYears) * 12 / Math.max(1, monthsPerYear);
    return clamp((year - start) / yearsNeeded, 0, 1);
  }

  function stepFund(start, noninterest, cost, interestRate, allowNegative) {
    var interest = start > 0 ? start * interestRate : 0;
    var endRaw = start + interest + noninterest - cost;
    var frac = null;
    if (start > 0 && endRaw <= 0) {
      var drain = start - endRaw;
      frac = drain > 0 ? start / drain : 0;
    }
    var payable = cost > 0 ? noninterest / cost : 1;
    return {
      endDisplay: allowNegative ? endRaw : Math.max(0, endRaw),
      endRaw: endRaw,
      frac: frac,
      interest: interest,
      payable: payable,
      ratio: cost > 0 ? (Math.max(0, start) / cost) * 100 : 0
    };
  }

  function quarterName(frac) {
    if (frac == null) return null;
    if (frac < 0.25) return "Q1";
    if (frac < 0.5) return "Q2";
    if (frac < 0.75) return "Q3";
    return "Q4";
  }

  function statusFor(depletionYear, ratioEnd) {
    if (depletionYear == null && ratioEnd >= 100) return "Healthy";
    if (depletionYear == null || depletionYear > 2036) return "Under pressure";
    return "Critical";
  }

  function summarize(rows, key) {
    var depletionYear = null;
    var quarter = null;
    var payableAt = null;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i][key].depleted && depletionYear == null) {
        depletionYear = rows[i].year;
        quarter = rows[i][key].quarter;
        payableAt = rows[i][key].payable;
      }
    }
    var last = rows[rows.length - 1][key];
    var row2036 = null;
    for (var j = 0; j < rows.length; j++) {
      if (rows[j].year === 2036) row2036 = rows[j];
    }
    var ratio2036 = row2036 ? row2036[key].ratio : 0;
    if (depletionYear != null && depletionYear <= 2036) ratio2036 = 0;
    return {
      depletionYear: depletionYear,
      quarter: quarter,
      payableAtDepletion: depletionYear == null ? 1 : payableAt,
      payable2100: depletionYear == null ? 1 : last.payable,
      ratio2026: rows[0][key].ratio,
      ratio2036: ratio2036,
      ratio2100: last.ratio,
      status: statusFor(depletionYear, last.ratio)
    };
  }

  function project(scenario, assumptions) {
    var cfg = {};
    var key;
    for (key in DEFAULT_ASSUMPTIONS) cfg[key] = DEFAULT_ASSUMPTIONS[key];
    if (assumptions) {
      for (key in assumptions) cfg[key] = assumptions[key];
    }
    scenario = scenario || defaultScenario();

    var tiers = normalizeTiers(scenario.tiers || defaultTiers());
    var fraDelta = clamp(Number(scenario.fra) || 67, 62, 75) - 67;
    var eea = clamp(Number(scenario.eea) || 62, 60, 70);
    var fra = 67 + fraDelta;
    if (eea >= fra) eea = fra - 1;
    var eeaDelta = eea - 62;
    var medicareDelta = clamp(Number(scenario.medicareAge) || 65, 60, 75) - 65;
    var months = clamp(Number(scenario.monthsPerYear) || 2, 1, 12);
    var workerRatio = clamp(Number(scenario.workerRatio) || 0, -0.25, 0.25);
    var workforcePp = clamp(Number(scenario.workforceGrowth) || 0, -0.5, 0.5);
    var demoFactor = 1 / (1 + workerRatio);

    var mode = scenario.mode || "current";
    var credit = !!scenario.creditBenefits;
    var oasi = cfg.oasiReserve0;
    var di = cfg.diReserve0;
    var pooled = oasi + di;
    var hi = cfg.hiReserve0;
    var oasiHyp = oasi;
    var pooledHyp = pooled;
    var hiHyp = hi;
    var payroll = cfg.oasdiPayroll0;
    var fraStock = 1;
    var eeaStock = 1;
    var creditStock = 0;
    var colaStock = 1;
    var chainedCola = !!scenario.chainedCola;
    var colaOrigin = Number(scenario.chainedColaYear);
    if (!isFinite(colaOrigin)) colaOrigin = 2027;
    var colaCut = Number(cfg.chainedColaCut);
    if (!isFinite(colaCut) || colaCut < 0) colaCut = 0;
    if (colaCut > cfg.inflation) colaCut = cfg.inflation;
    var colaPriceFactor = (1 + cfg.inflation - colaCut) / (1 + cfg.inflation);
    var rows = [];

    for (var year = START_YEAR; year <= END_YEAR; year++) {
      var t = year - START_YEAR;
      var growth = (year < 2036 ? cfg.payrollGrowthEarly : cfg.payrollGrowthLater) + workforcePp / 100;
      var oasdiCostBase = lerpPoints(year, cfg.oasdiCost);
      var oasdiIncomeBase = lerpPoints(year, cfg.oasdiIncome);
      var diCostBase = lerpPoints(year, cfg.diCost);
      var hiCostBase = lerpPoints(year, cfg.hiCost);
      var hiIncomeBase = lerpPoints(year, cfg.hiIncome);
      var workforceRamp = clamp(t / 30, 0, 1);
      var workforceFactor = 1 / (1 + (workforcePp / 100) * 10 * workforceRamp);

      var oasdiComponent = 12.4;
      var hiDelta = 0;
      var taxedMass = cfg.taxableShare;
      var effectiveYear = scenario.effectiveYear == null || scenario.effectiveYear === ""
        ? null
        : Number(scenario.effectiveYear);
      var packageOn = effectiveYear == null || year >= effectiveYear;
      var yearMode = packageOn ? mode : "current";

      if (yearMode === "flat") {
        var multiple = scenario.noCap ? Infinity : (Number(scenario.wageBase) || WAGE_BASE) / WAGE_BASE;
        var share = earningsCdf(multiple);
        oasdiComponent = (Number(scenario.oasdiRate) || 0) * (share / cfg.taxableShare);
        hiDelta = (Number(scenario.hiRate) || 0) - 2.9;
        taxedMass = scenario.noCap ? 1 : share;
      } else if (yearMode === "tiers") {
        var activeTiers = tiers;
        var tier0 = scenario.tier0;
        if (tier0 && Number(tier0.upTo) > 0) {
          activeTiers = normalizeTiers([{
            upTo: Number(tier0.upTo),
            oasdi: Number(tier0.oasdi) || 0,
            hi: Number(tier0.hi) || 0,
            keepCredit: true
          }].concat(tiers));
        }
        var avg = averageRates(activeTiers, year, !!scenario.freezeBrackets, cfg, !!scenario.topTail);
        oasdiComponent = (avg.oasdi / cfg.taxableShare) * 100;
        var refHi = referenceHiAverage(year, cfg) * 100;
        hiDelta = avg.hi * 100 - refHi;
        taxedMass = avg.taxed;
      }

      /* The $10 million levies add revenue only. They do not enlarge the benefit base.
         The National Social Security tax is split with the rest of OASDI, 10.6/1.8. */
      if (packageOn) {
        var levyEnd = bracketEnd(10000000, year, !!scenario.freezeBrackets, cfg);
        var tail = scenario.topTail
          ? packageMass(levyEnd, Infinity)
          : Math.max(0, 1 - earningsCdf(levyEnd));
        var payer = scenario.levyPayer === "employer" ? "employer" : "split";
        var ssParts = levyShares(scenario.ssLevy, payer);
        var hiParts = levyShares(scenario.hiLevy, payer);
        var ssLevy = ssParts.worker + ssParts.employer;
        var hiLevy = hiParts.worker + hiParts.employer;
        oasdiComponent += ssLevy * (tail / cfg.taxableShare);
        hiDelta += hiLevy * tail / (cfg.taxableShare * cfg.hiPayrollRatio);
      }

      /* Credit links the benefit base to the earnings being taxed.
         With the box off, earnings above today's cap do not raise benefits,
         and a lower cap still reduces benefits. The levies never get credit. */
      var creditedMass = cfg.taxableShare;
      if (yearMode !== "current") {
        creditedMass = credit ? taxedMass : Math.min(cfg.taxableShare, taxedMass);
      }
      var creditTarget = cfg.benefitCreditPassThrough * (creditedMass / cfg.taxableShare - 1);

      var yearFra = packageOn ? fraDelta : 0;
      var yearEea = packageOn ? eeaDelta : 0;
      var origin = effectiveYear == null ? START_YEAR : effectiveYear;
      var fraP = phaseProgress(year, yearFra, months, origin);
      var fraNew = 1 + (Math.pow(1 - cfg.fraCutPerYear, yearFra) - 1) * fraP;
      var eeaP = phaseProgress(year, yearEea, months, origin);
      var eeaNew = 1 - 0.004 * yearEea * eeaP;
      var eeaTimingPeak = 0.02 * yearEea * eeaP;
      var since = effectiveYear == null ? t : Math.max(0, year - effectiveYear);
      var eeaFade = Math.exp(-Math.max(0, since - Math.max(1, Math.abs(yearEea) * 12 / months)) / 10);
      var eeaTiming = 1 - eeaTimingPeak * (0.35 + 0.65 * (yearEea > 0 ? eeaFade : 1));

      var fraEffect = fraStock - 1;
      var eeaEffect = eeaStock - 1;
      var ageFactor = clamp(1 + cfg.retirementShareOfOasi * (fraEffect + eeaEffect + creditStock), 0.35, 1.8);
      ageFactor *= clamp(eeaTiming, 0.85, 1.15);

      var yearMed = packageOn ? medicareDelta : 0;
      var medP = phaseProgress(year, yearMed, months, origin);
      var hiAgeFactor = clamp(1 - cfg.hiCostSharePerAgeYear * yearMed * medP, 0.55, 1.6);

      /* Age and benefit-base changes apply to the retirement share of OASI only. */
      var oasiCore = Math.max(0.4, oasdiCostBase - diCostBase) * demoFactor * workforceFactor;
      var oasiCostRate = oasiCore * ageFactor;
      var diCostRate = diCostBase * demoFactor * workforceFactor;
      /* A chained-CPI COLA lowers the yearly raise on checks already in payment.
         New awards still start at the wage-indexed benefit, then join that slower path.
         The December COLA of colaOrigin is paid the following year. Hospital insurance is unchanged. */
      if (chainedCola && year > colaOrigin) {
        colaStock = colaStock * (1 - cfg.awardFlow) * colaPriceFactor + cfg.awardFlow;
        oasiCostRate *= colaStock;
        diCostRate *= colaStock;
      }
      var oasdiCostRate = oasiCostRate + diCostRate;

      var otherOasdi = oasdiIncomeBase - 12.4;
      var oasiIncomeRate = otherOasdi * 0.98 + oasdiComponent * (10.6 / 12.4);
      var diIncomeRate = otherOasdi * 0.02 + oasdiComponent * (1.8 / 12.4);
      var hiCostRate = hiCostBase * demoFactor * workforceFactor * hiAgeFactor;
      var hiIncomeRate = hiIncomeBase + hiDelta;

      var hiPayroll = payroll * cfg.hiPayrollRatio;
      var infl = Math.pow(1 + cfg.inflation, t);

      var oasiIncome = (oasiIncomeRate / 100) * payroll;
      var oasiCost = (oasiCostRate / 100) * payroll;
      var diIncome = (diIncomeRate / 100) * payroll;
      var diCost = (diCostRate / 100) * payroll;
      var hiIncome = (hiIncomeRate / 100) * hiPayroll;
      var hiCost = (hiCostRate / 100) * hiPayroll;

      /* Billions of 2026 dollars, scaled by this year's price level so the
         real transfer stays constant. One Social Security total, split
         10.6/1.8. Hospital insurance receives that same full amount.
         Non-interest income only: benefits and payroll-tax rates stay put.
         Paid each year from 2026 through 2100, including before a package date. */
      var transferBillions = Number(scenario.federalTransfer);
      if (!isFinite(transferBillions) || transferBillions < 0) transferBillions = 0;
      if (transferBillions > 0) {
        var transferNominal = transferBillions * infl;
        var oasiTransfer = transferNominal * (10.6 / 12.4);
        var diTransfer = transferNominal * (1.8 / 12.4);
        var hiTransfer = transferNominal;
        oasiIncome += oasiTransfer;
        diIncome += diTransfer;
        hiIncome += hiTransfer;
        if (payroll > 0) {
          oasiIncomeRate += (oasiTransfer / payroll) * 100;
          diIncomeRate += (diTransfer / payroll) * 100;
        }
        if (hiPayroll > 0) hiIncomeRate += (hiTransfer / hiPayroll) * 100;
      }

      /* Proposed options. Billions of 2026 dollars, same price scaling as the
         federal transfer. Retirement receives its share directly. Hospital
         insurance receives its own share. Disability is not assigned one.
         Not Current Law. Paid each year through 2100. */
      var extraOasi = Number(scenario.extraOasi);
      var extraHi = Number(scenario.extraHi);
      if (!isFinite(extraOasi) || extraOasi < 0) extraOasi = 0;
      if (!isFinite(extraHi) || extraHi < 0) extraHi = 0;
      if (extraOasi > 0 || extraHi > 0) {
        var extraOasiNominal = extraOasi * infl;
        var extraHiNominal = extraHi * infl;
        oasiIncome += extraOasiNominal;
        hiIncome += extraHiNominal;
        if (payroll > 0) oasiIncomeRate += (extraOasiNominal / payroll) * 100;
        if (hiPayroll > 0) hiIncomeRate += (extraHiNominal / hiPayroll) * 100;
      }

      var oasiStep = stepFund(oasi, oasiIncome, oasiCost, cfg.interest, false);
      var diStep = stepFund(di, diIncome, diCost, cfg.interest, false);
      var poolStep = stepFund(pooled, oasiIncome + diIncome, oasiCost + diCost, cfg.interest, false);
      var hiStep = stepFund(hi, hiIncome, hiCost, cfg.interest, false);
      var oasiHypStep = stepFund(oasiHyp, oasiIncome, oasiCost, cfg.interest, true);
      var poolHypStep = stepFund(pooledHyp, oasiIncome + diIncome, oasiCost + diCost, cfg.interest, true);
      var hiHypStep = stepFund(hiHyp, hiIncome, hiCost, cfg.interest, true);

      function pack(fundStep, hypStep, incomeRate, costRate, incomeDollars, costDollars) {
        var depleted = fundStep.frac != null || fundStep.ratio === 0 && year > START_YEAR && fundStep.endDisplay === 0 && fundStep.endRaw <= 0;
        /* A fund that starts at zero is already depleted. The first crossing carries the quarter. */
        return {
          ratio: fundStep.ratio,
          incomeRate: incomeRate,
          costRate: costRate,
          incomeReal: incomeDollars / infl / 1000,
          costReal: costDollars / infl / 1000,
          reserveReal: Math.max(0, fundStep.endDisplay) / infl / 1000,
          reserveStartReal: Math.max(0, fundStep.ratio / 100 * costDollars) / infl / 1000,
          reserveHypReal: hypStep.endRaw / infl / 1000,
          reserveHypStartReal: null,
          payable: fundStep.frac != null || fundStep.ratio <= 0 ? fundStep.payable : 1,
          depleted: fundStep.frac != null,
          quarter: quarterName(fundStep.frac)
        };
      }

      var oasiPack = pack(oasiStep, oasiHypStep, oasiIncomeRate, oasiCostRate, oasiIncome, oasiCost);
      var diPack = pack(diStep, diStep, diIncomeRate, diCostRate, diIncome, diCost);
      var poolPack = pack(poolStep, poolHypStep, oasiIncomeRate + diIncomeRate, oasdiCostRate, oasiIncome + diIncome, oasiCost + diCost);
      var hiPack = pack(hiStep, hiHypStep, hiIncomeRate, hiCostRate, hiIncome, hiCost);

      /* Payable stays at 100 percent until the year reserves run out, then follows income / cost. */
      function fixPayable(pack, startBalance) {
        if (startBalance > 0 && pack.quarter == null) pack.payable = 1;
        return pack;
      }
      fixPayable(oasiPack, oasi);
      fixPayable(diPack, di);
      fixPayable(poolPack, pooled);
      fixPayable(hiPack, hi);
      oasiPack.reserveHypStartReal = oasiHyp / infl / 1000;
      poolPack.reserveHypStartReal = pooledHyp / infl / 1000;
      hiPack.reserveHypStartReal = hiHyp / infl / 1000;
      diPack.reserveHypStartReal = di / infl / 1000;

      rows.push({
        year: year,
        oasi: oasiPack,
        di: diPack,
        oasdi: poolPack,
        hi: hiPack
      });

      oasi = oasiStep.endDisplay;
      di = diStep.endDisplay;
      pooled = poolStep.endDisplay;
      hi = hiStep.endDisplay;
      oasiHyp = oasiHypStep.endRaw;
      pooledHyp = poolHypStep.endRaw;
      hiHyp = hiHypStep.endRaw;

      fraStock = fraStock * (1 - cfg.awardFlow) + fraNew * cfg.awardFlow;
      eeaStock = eeaStock * (1 - cfg.awardFlow) + eeaNew * cfg.awardFlow;
      creditStock = creditStock * (1 - cfg.awardFlow) + creditTarget * cfg.awardFlow;
      payroll *= 1 + growth;
    }

    /* Mark years after depletion so the payable share stays on income / cost. */
    ["oasi", "di", "oasdi", "hi"].forEach(function (name) {
      var seen = false;
      for (var i = 0; i < rows.length; i++) {
        if (rows[i][name].depleted) seen = true;
        else if (seen) {
          rows[i][name].depleted = true;
          rows[i][name].payable = rows[i][name].incomeRate / rows[i][name].costRate;
          rows[i][name].ratio = 0;
        }
      }
    });

    return {
      years: rows,
      summary: {
        oasi: summarize(rows, "oasi"),
        di: summarize(rows, "di"),
        oasdi: summarize(rows, "oasdi"),
        hi: summarize(rows, "hi")
      },
      assumptions: cfg
    };
  }

  function wideTiers(cutoffs, oasdiBase, hiBase) {
    var ups = cutoffs && cutoffs.length >= 3 ? cutoffs : [1000000, 5000000, 10000000];
    var bands = [];
    for (var i = 0; i < 4; i++) {
      bands.push({
        upTo: i < 3 ? Number(ups[i]) : null,
        oasdi: Math.round((oasdiBase + 4 * i) * 100) / 100,
        hi: Math.round((hiBase + 4 * i) * 100) / 100
      });
    }
    return bands;
  }

  function solveTaxes(input) {
    input = input || {};
    var target = clamp(Math.round(Number(input.targetYear) || 2075), START_YEAR, END_YEAR);
    var effective = clamp(Math.round(Number(input.effectiveYear) || 2027), START_YEAR, END_YEAR);
    var fra = Number(input.fra) || 67;
    var medicareAge = Number(input.medicareAge) || 65;
    var eea = input.eea == null ? 62 : Number(input.eea);
    var ssLevy = input.ssLevy == null ? 7 : Number(input.ssLevy);
    var hiLevy = input.hiLevy == null ? 3 : Number(input.hiLevy);
    var federalTransfer = Number(input.federalTransfer);
    if (!isFinite(federalTransfer) || federalTransfer < 0) federalTransfer = 0;
    var extraOasi = Number(input.extraOasi);
    var extraHi = Number(input.extraHi);
    if (!isFinite(extraOasi) || extraOasi < 0) extraOasi = 0;
    if (!isFinite(extraHi) || extraHi < 0) extraHi = 0;
    var cutoffs = input.cutoffs || [1000000, 5000000, 10000000];
    var locked = [];
    if (input.lockedTiers) {
      for (var lockIndex = 0; lockIndex < input.lockedTiers.length; lockIndex++) {
        var lockedTier = input.lockedTiers[lockIndex];
        if (!lockedTier || !(Number(lockedTier.upTo) > 0)) continue;
        locked.push({
          upTo: Number(lockedTier.upTo),
          oasdi: Number(lockedTier.oasdi) || 0,
          hi: Number(lockedTier.hi) || 0
        });
      }
    }
    var tier0 = input.tier0 && Number(input.tier0.upTo) > 0 ? {
      upTo: Number(input.tier0.upTo),
      oasdi: Number(input.tier0.oasdi) || 0,
      hi: Number(input.tier0.hi) || 0
    } : null;
    if (tier0 && tier0.upTo >= Number(cutoffs[0])) tier0.upTo = Math.max(0, Number(cutoffs[0]) - 1000);
    if (tier0 && !(tier0.upTo > 0)) tier0 = null;
    var bandStart = tier0 ? tier0.upTo / WAGE_BASE : 0;
    if (locked.length) {
      var lockedEnd = locked[locked.length - 1].upTo / WAGE_BASE;
      if (lockedEnd > bandStart) bandStart = lockedEnd;
    }
    var edges = [bandStart, cutoffs[0] / WAGE_BASE, cutoffs[1] / WAGE_BASE, cutoffs[2] / WAGE_BASE, Infinity];
    if (locked.length) {
      for (var edgeIndex = 1; edgeIndex < edges.length - 1; edgeIndex++) {
        if (!(edges[edgeIndex] > edges[edgeIndex - 1])) edges[edgeIndex] = edges[edgeIndex - 1] + (1000 / WAGE_BASE);
      }
    }
    var masses = [];
    var levyInBand = [];
    var levyCut = 10000000 / WAGE_BASE;
    for (var b = 0; b < 4; b++) {
      masses.push(packageMass(edges[b], edges[b + 1]));
      levyInBand.push(packageMass(Math.max(edges[b], levyCut), edges[b + 1]));
    }

    function scenarioFor(oasdiRates, hiRates) {
      var base = defaultScenario();
      base.mode = "tiers";
      base.creditBenefits = false;
      base.freezeBrackets = false;
      base.topTail = true;
      base.tiers = locked.map(function (tier) {
        return { upTo: tier.upTo, oasdi: tier.oasdi, hi: tier.hi };
      });
      for (var i = 0; i < 4; i++) {
        base.tiers.push({
          upTo: i < 3 ? Number(cutoffs[i]) : null,
          oasdi: oasdiRates[i],
          hi: hiRates[i]
        });
      }
      base.levyPayer = input.levyPayer === "employer" ? "employer" : "split";
      base.fra = fra;
      base.eea = eea;
      base.medicareAge = medicareAge;
      base.effectiveYear = effective;
      base.ssLevy = ssLevy;
      base.hiLevy = hiLevy;
      base.federalTransfer = federalTransfer;
      base.extraOasi = extraOasi;
      base.extraHi = extraHi;
      base.chainedCola = !!input.chainedCola;
      base.chainedColaYear = effective;
      base.targetYear = target;
      if (tier0) base.tier0 = tier0;
      return base;
    }

    function lasts(summary) {
      return summary.depletionYear == null || summary.depletionYear > target;
    }

    function bandShare(rates, levy, bottomRate, lockedRates) {
      var top = 0;
      var all = tier0 ? packageMass(0, tier0.upTo / WAGE_BASE) * (Number(bottomRate) || 0) : 0;
      var lockedLo = tier0 ? tier0.upTo / WAGE_BASE : 0;
      if (lockedRates) {
        for (var L = 0; L < locked.length; L++) {
          var lockedHi = locked[L].upTo / WAGE_BASE;
          all += packageMass(lockedLo, lockedHi) * (Number(lockedRates[L]) || 0);
          lockedLo = lockedHi;
        }
      }
      for (var i = 0; i < 4; i++) {
        var dollars = masses[i] * rates[i] + levyInBand[i] * levy;
        if (i >= 2) top += dollars;
        all += dollars;
      }
      return all > 0 ? top / all : 0;
    }

    function enforce(rates) {
      var out = rates.map(function (rate) {
        return Math.min(40, Math.max(0, Math.round(rate * 100) / 100));
      });
      for (var i = 1; i < 4; i++) {
        if (!(out[i] > out[i - 1])) out[i] = Math.min(40, Math.round((out[i - 1] + 0.01) * 100) / 100);
      }
      if (!(out[3] > out[2])) {
        out[3] = 40;
        out[2] = 39.99;
      }
      return out;
    }

    /* First two bands keep a 4-point step. The two bands above $2 million
       rise above that ladder until they are about 20% of the package, or
       until a rate hits 40%. The levy is counted in the top band. */
    function ratesFor(base, levy, bottomRate, lockedRates) {
      var r0 = Math.min(40, Math.round(base * 100) / 100);
      var r1 = Math.min(40, Math.round((r0 + 4) * 100) / 100);
      var best = enforce([r0, r1, r0 + 8, r0 + 12]);
      if (bandShare(best, levy, bottomRate, lockedRates) >= 0.20) return best;
      var loH = 0;
      var hiH = 40;
      for (var n = 0; n < 20; n++) {
        var h = (loH + hiH) / 2;
        var trial = enforce([r0, r1, r0 + 8 + h, r0 + 12 + h]);
        if (bandShare(trial, levy, bottomRate, lockedRates) >= 0.20) {
          best = trial;
          hiH = h;
        } else {
          loH = h;
        }
      }
      if (bandShare(best, levy, bottomRate, lockedRates) < 0.20) best = enforce([r0, r1, 40, 40]);
      return best;
    }

    /* About the same rate on every tier. A one-hundredth step keeps the
       schedule rising. Used when the Tier 1 soft cap is removed. */
    function ratesForEven(level) {
      var rate = Math.min(40, Math.max(0, Math.round(level * 100) / 100));
      return enforce([rate, rate, rate, rate]);
    }

    function searchEven(which) {
      var floor = which === "hi" ? 2.9 : 12.4;
      var cap = 40;
      var lo = floor;
      var hiBound = cap;
      var bestRates = ratesForEven(cap);
      var reached = false;
      for (var n = 0; n < 16; n++) {
        var mid = (lo + hiBound) / 2;
        var rates = ratesForEven(Math.min(cap, Math.max(floor, mid)));
        var oasdiRates = which === "hi" ? [12.4, 12.41, 12.42, 12.43] : rates;
        var hiRates = which === "hi" ? rates : [2.9, 2.91, 2.92, 2.93];
        var result = project(scenarioFor(oasdiRates, hiRates));
        if (lasts(result.summary[which])) {
          reached = true;
          bestRates = rates;
          hiBound = mid;
        } else {
          lo = mid;
        }
      }
      if (!reached) bestRates = ratesForEven(cap);
      return { rates: bestRates, reached: reached };
    }

    function search(which) {
      var cap = which === "oasdi" ? 25 : 12;
      var floor = which === "oasdi" ? 12.4 : 2.9;
      var levy = which === "oasdi" ? ssLevy : hiLevy;
      var bottomRate = tier0 ? (which === "oasdi" ? tier0.oasdi : tier0.hi) : 0;
      var lockedRates = locked.map(function (tier) { return which === "oasdi" ? tier.oasdi : tier.hi; });
      var lo = floor;
      var hi = cap;
      var bestRates = ratesFor(cap, levy, bottomRate, lockedRates);
      var reached = false;
      for (var n = 0; n < 12; n++) {
        var mid = (lo + hi) / 2;
        var rates = ratesFor(Math.min(cap, Math.max(floor, mid)), levy, bottomRate, lockedRates);
        var oasdiRates = which === "oasdi" ? rates : [12.4, 16.4, 20.4, 24.4];
        var hiRates = which === "hi" ? rates : [2.9, 6.9, 10.9, 14.9];
        var result = project(scenarioFor(oasdiRates, hiRates));
        if (lasts(result.summary[which])) {
          reached = true;
          bestRates = rates;
          hi = mid;
        } else {
          lo = mid;
        }
      }
      if (!reached) bestRates = ratesFor(cap, levy, bottomRate, lockedRates);
      return { rates: bestRates, reached: reached };
    }

    /* Tier 1 prefers to stay at or under the soft cap. Tier 2 can rise as
       much as 4 points above Tier 1. Any further rate goes to Tiers 3 and 4. */
    function ratesForSoft(base, softCap) {
      var ceiling = Math.min(40, Math.max(0, softCap));
      var pressed = Math.min(40, Math.max(0, Math.round(base * 100) / 100));
      var r0 = Math.round(Math.min(ceiling, pressed) * 100) / 100;
      var above = Math.max(0, Math.round((pressed - ceiling) * 100) / 100);
      var tier2Room = 4;
      var bump = Math.min(tier2Room, above);
      var spill = Math.max(0, Math.round((above - tier2Room) * 100) / 100);
      var r1 = Math.min(40, Math.round((r0 + (bump > 0 ? bump : 0.01)) * 100) / 100);
      var r2 = Math.min(40, Math.round((r1 + 0.01 + spill) * 100) / 100);
      var r3 = Math.min(40, Math.round((r2 + 0.01) * 100) / 100);
      return enforce([r0, r1, r2, r3]);
    }

    function searchSoft(which, softCap) {
      var floor = which === "oasdi" ? 12.4 : 2.9;
      var cap = 40;
      var lo = floor;
      var hi = cap;
      var bestRates = ratesForSoft(cap, softCap);
      var reached = false;
      for (var n = 0; n < 14; n++) {
        var mid = (lo + hi) / 2;
        var rates = ratesForSoft(Math.min(cap, Math.max(floor, mid)), softCap);
        var oasdiRates = which === "oasdi" ? rates : [13, 15, 17, 21];
        var hiRates = which === "hi" ? rates : [3.2, 5.2, 7.2, 11.2];
        var result = project(scenarioFor(oasdiRates, hiRates));
        if (lasts(result.summary[which])) {
          reached = true;
          bestRates = rates;
          hi = mid;
        } else {
          lo = mid;
        }
      }
      if (!reached) bestRates = ratesForSoft(cap, softCap);
      return { rates: bestRates, reached: reached };
    }

    var evenRates = input.evenRates === true;
    var softCap = !evenRates && input.softCapFirst && input.softCapFirst.oasdi != null ? input.softCapFirst : null;
    /* The even rate is solved for retirement itself, so combined Social
       Security is covered as well. The soft cap is solved for the combined fund. */
    var oasdi = evenRates ? searchEven("oasi") : (softCap ? searchSoft("oasdi", Number(softCap.oasdi)) : search("oasdi"));
    var hi = evenRates ? searchEven("hi") : (softCap ? searchSoft("hi", Number(softCap.hi)) : search("hi"));

    /* Combined Social Security payroll plus Medicare stays at or under 45%.
       Above $10 million the National Medicare tax counts toward that 45%.
       The National Social Security tax stays on top and outside the cap.
       Rates only move down. An earlier band is lowered when that is what
       keeps the schedule strictly increasing after a higher band is cut. */
    function toCents(rate) {
      return Math.round(rate * 100);
    }

    function bandRoom(index) {
      var upper = index < 3 ? Number(cutoffs[index]) : Infinity;
      var medicareNational = upper > 10000000 ? Math.max(0, hiLevy) : 0;
      var room = 4500 - toCents(medicareNational);
      return room > 0 ? room : 0;
    }

    function fitPair(oCents, hCents, room) {
      var sum = oCents + hCents;
      if (sum <= room) return [oCents, hCents];
      if (room <= 0) return [0, 0];
      var oExact = oCents * room / sum;
      var hExact = hCents * room / sum;
      var oNext = Math.floor(oExact);
      var hNext = Math.floor(hExact);
      var left = room - oNext - hNext;
      var oFrac = oExact - oNext;
      var hFrac = hExact - hNext;
      while (left > 0 && (oNext < oCents || hNext < hCents)) {
        if (oFrac >= hFrac && oNext < oCents) oNext += 1;
        else if (hNext < hCents) hNext += 1;
        else oNext += 1;
        left -= 1;
      }
      if (oNext + hNext > room) {
        if (oNext >= hNext && oNext > 0) oNext -= 1;
        else if (hNext > 0) hNext -= 1;
      }
      if (oNext < 0) oNext = 0;
      if (hNext < 0) hNext = 0;
      return [oNext, hNext];
    }

    var oCents = oasdi.rates.map(toCents);
    var hCents = hi.rates.map(toCents);
    var savedO = oCents.slice();
    var savedH = hCents.slice();
    for (var band = 0; band < 4; band++) {
      var fitted = fitPair(oCents[band], hCents[band], bandRoom(band));
      oCents[band] = fitted[0];
      hCents[band] = fitted[1];
    }
    for (var step = 3; step >= 1; step--) {
      if (!(oCents[step] > oCents[step - 1])) oCents[step - 1] = Math.max(0, oCents[step] - 1);
      if (!(hCents[step] > hCents[step - 1])) hCents[step - 1] = Math.max(0, hCents[step] - 1);
    }
    var rateCapped = false;
    for (var k = 0; k < 4; k++) {
      if (oCents[k] !== savedO[k] || hCents[k] !== savedH[k]) rateCapped = true;
    }
    var oasdiRates = oCents.map(function (cents) { return cents / 100; });
    var hiRates = hCents.map(function (cents) { return cents / 100; });

    var tiers = [];
    for (var i = 0; i < 4; i++) {
      tiers.push({
        upTo: i < 3 ? Number(cutoffs[i]) : null,
        oasdi: oasdiRates[i],
        hi: hiRates[i]
      });
    }
    var finalScenario = scenarioFor(oasdiRates, hiRates);
    var projected = project(finalScenario);
    return {
      tiers: tiers,
      oasdiRates: oasdiRates.slice(),
      hiRates: hiRates.slice(),
      ssLevy: ssLevy,
      hiLevy: hiLevy,
      capped: rateCapped,
      fra: fra,
      medicareAge: medicareAge,
      effectiveYear: effective,
      targetYear: target,
      oasdiTopShare: bandShare(oasdiRates, ssLevy, tier0 ? tier0.oasdi : 0, locked.map(function (tier) { return tier.oasdi; })) * 100,
      hiTopShare: bandShare(hiRates, hiLevy, tier0 ? tier0.hi : 0, locked.map(function (tier) { return tier.hi; })) * 100,
      oasdiReached: lasts(projected.summary.oasdi),
      oasiReached: lasts(projected.summary.oasi),
      hiReached: lasts(projected.summary.hi),
      evenRates: evenRates,
      scenario: finalScenario,
      summary: projected.summary
    };
  }

  var api = {
    START_YEAR: START_YEAR,
    END_YEAR: END_YEAR,
    WAGE_BASE: WAGE_BASE,
    DEFAULT_ASSUMPTIONS: DEFAULT_ASSUMPTIONS,
    defaultScenario: defaultScenario,
    defaultTiers: defaultTiers,
    levyShares: levyShares,
    presets: presets,
    project: project,
    solveTaxes: solveTaxes,
    earningsCdf: earningsCdf,
    workerCdf: workerCdf,
    packageMass: packageMass,
    SHARE_AT_OR_ABOVE_2M: SHARE_AT_OR_ABOVE_2M,
    SHARE_AT_OR_ABOVE_10M: SHARE_AT_OR_ABOVE_10M
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.SolvencyModel = api;
})(typeof window !== "undefined" ? window : global);
