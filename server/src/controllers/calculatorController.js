'use strict';

const asyncHandler = require('../utils/asyncHandler');
const {
  calculateEmi,
  yearlyBreakdown,
  simulatePrepayment,
  estimateEligibility,
} = require('../services/calculatorService');
const { DISCLAIMER_OBJECT, RATE_NOTE, ESTIMATOR_NOTE } = require('../utils/disclaimer');

/** How many schedule rows to include in the API response. */
const MAX_SCHEDULE_ROWS = 400;

/**
 * GET  /api/calculator/emi?principal=&annualRate=&tenureYears=
 * POST /api/calculator/emi  { principal, annualRate, tenureYears }
 *
 * Public, so the calculator works without signing in. Both verbs are supported,
 * so the inputs are read from whichever the caller used.
 */
const calculateEmiHandler = asyncHandler(async (req, res) => {
  const input = { ...(req.query || {}), ...(req.body || {}) };
  const { principal, annualRate, tenureYears, tenureMonths } = input;

  const result = calculateEmi({
    principal: Number(principal),
    annualRate: Number(annualRate),
    tenureYears: tenureYears ? Number(tenureYears) : undefined,
    tenureMonths: tenureMonths ? Number(tenureMonths) : undefined,
  });

  // A 30-year loan has 360 rows — return the head of the schedule plus a
  // yearly roll-up so the client chart stays responsive.
  const schedule = result.schedule.slice(0, MAX_SCHEDULE_ROWS);
  const truncated = result.schedule.length > MAX_SCHEDULE_ROWS;

  res.json({
    success: true,
    data: {
      ...result.summary,
      schedule,
      scheduleTruncated: truncated,
      scheduleTotalRows: result.schedule.length,
      yearly: yearlyBreakdown(result.schedule),
      formula: 'EMI = P × r × (1 + r)ⁿ / ((1 + r)ⁿ − 1)',
    },
    meta: { rateNote: RATE_NOTE, disclaimer: DISCLAIMER_OBJECT },
  });
});

/**
 * POST /api/calculator/prepayment
 * Body: { principal, annualRate, tenureYears, amount, afterPeriod, strategy }
 */
const prepaymentHandler = asyncHandler(async (req, res) => {
  const { principal, annualRate, tenureYears, tenureMonths, amount, afterPeriod, strategy } = req.body;

  const result = simulatePrepayment({
    principal: Number(principal),
    annualRate: Number(annualRate),
    tenureYears: tenureYears ? Number(tenureYears) : undefined,
    tenureMonths: tenureMonths ? Number(tenureMonths) : undefined,
    amount: Number(amount),
    afterPeriod: Number(afterPeriod),
    keepEmi: strategy === 'keep-emi',
  });

  res.json({
    success: true,
    data: result,
    meta: { rateNote: RATE_NOTE, disclaimer: DISCLAIMER_OBJECT },
  });
});

/**
 * POST /api/eligibility/estimate
 *
 * EDUCATIONAL ESTIMATE — NOT A LOAN APPROVAL DECISION.
 * Returns a general indication based on common factors. It does not query any
 * lender, does not check any real bureau record, and cannot approve anything.
 */
const estimateHandler = asyncHandler(async (req, res) => {
  const result = estimateEligibility({
    age: req.body.age,
    employmentType: req.body.employmentType,
    monthlyIncome: req.body.monthlyIncome,
    existingEmis: req.body.existingEmis,
    creditScore: req.body.creditScore,
    loanAmount: req.body.loanAmount,
    loanType: req.body.loanType,
  });

  res.json({
    success: true,
    data: result,
    meta: {
      label: ESTIMATOR_NOTE,
      disclaimer: DISCLAIMER_OBJECT,
      notice:
        'This estimate uses general educational heuristics only. It is not connected to any lender or credit bureau, and it cannot approve or decline a loan.',
    },
  });
});

module.exports = { calculateEmiHandler, prepaymentHandler, estimateHandler, MAX_SCHEDULE_ROWS };
