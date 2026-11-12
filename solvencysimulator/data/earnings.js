/* Approximate earnings distribution for the tier calculator.
   Share of OASDI-covered earnings under the wage base is an assumption,
   chosen so the wage cap lines up with the Trustees' statement that HI
   taxable payroll averages about 25 percent larger than OASDI taxable
   payroll (the gap is the cap plus workers covered only by HI).
   Replace TAXABLE_EARNINGS_SHARE and the lognormal parameters with an
   official earnings-interval table when one is loaded. */
var EARNINGS_ASSUMPTIONS = (typeof window !== "undefined" ? window : global).EARNINGS_ASSUMPTIONS = {
  taxableEarningsShare: 0.83,
  /* Wage base as a multiple of the average covered wage. */
  baseOverAverageWage: 2.45,
  /* Earnings-weighted lognormal, mean shifted so the mass under the base is 0.83. */
  earningsWeightedMu: 0.238,
  earningsWeightedSigma: 0.69,
  /* Additional Medicare Tax threshold, 2026, single filer, not indexed. */
  hiSurtaxThreshold: 200000,
  hiSurtaxRate: 0.9
};
