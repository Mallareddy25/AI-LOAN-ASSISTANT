'use strict';

/**
 * EMI & AMORTIZATION ENGINE
 *
 * Standard reducing-balance EMI formula:
 *
 *            P x r x (1 + r)^n
 *     EMI = ───────────────────────────
 *              (1 + r)^n − 1
 *
 *   P = principal (loan amount)
 *   r = monthly interest rate (annual rate / 12 / 100)
 *   n = number of monthly instalments
 *
 * All monetary values are rounded to 2 decimals (Indian standard practice).
 * The final instalment is adjusted by a few paise so the schedule closes at
 * exactly zero outstanding principal.
 */

const { round } = require('../utils/sanitize');

function pow(base, exponent) {
  return base ** exponent;
}

/**
 * Compute the periodic payment.
 * @param {number} principal
 * @param {number} monthlyRate  as a decimal, e.g. 0.01 for 1%
 * @param {number} months
 * @returns {number}
 */
function computeEmi(principal, monthlyRate, months) {
  if (months <= 0) return 0;
  // A zero-rate loan simply repays the principal in equal parts.
  if (monthlyRate === 0) return principal / months;
  const growth = pow(1 + monthlyRate, months);
  return (principal * monthlyRate * growth) / (growth - 1);
}

/**
 * Full amortization schedule plus summary figures.
 *
 * @param {object} input
 * @param {number} input.principal        Loan amount
 * @param {number} input.annualRate       Annual interest rate, e.g. 10 for 10%
 * @param {number} input.tenureYears      Tenure in years
 * @param {number} [input.tenureMonths]   Tenure in months (overrides years)
 * @returns {object} summary, schedule
 */
function calculateEmi({ principal, annualRate, tenureYears, tenureMonths }) {
  const months = tenureMonths || Math.round((tenureYears || 0) * 12);
  const monthlyRate = annualRate / 12 / 100;
  const baseEmi = round(computeEmi(principal, monthlyRate, months), 2);

  const schedule = [];
  let balance = round(principal, 2);
  let totalInterest = 0;
  let totalPrincipal = 0;
  let cumulativeInterest = 0;

  for (let period = 1; period <= months; period += 1) {
    if (balance <= 0.005) break;

    const interest = round(balance * monthlyRate, 2);
    let principalPart = round(baseEmi - interest, 2);
    let emi = round(principalPart + interest, 2);

    // Last instalment: pay off whatever remains instead of overshooting.
    if (balance - principalPart <= 0.005 || period === months) {
      principalPart = round(balance, 2);
      emi = round(principalPart + interest, 2);
    }

    balance = round(balance - principalPart, 2);
    totalInterest = round(totalInterest + interest, 2);
    totalPrincipal = round(totalPrincipal + principalPart, 2);
    cumulativeInterest = round(cumulativeInterest + interest, 2);

    schedule.push({
      period,
      emi,
      principal: principalPart,
      interest,
      balance: Math.max(balance, 0),
      cumulativeInterest,
      cumulativePrincipal: totalPrincipal,
    });
  }

  const totalPayable = round(totalInterest + totalPrincipal, 2);
  const interestRatio = totalPayable > 0 ? round((totalInterest / totalPayable) * 100, 1) : 0;

  return {
    summary: {
      principal: round(principal, 2),
      annualRate: round(annualRate, 4),
      monthlyRate: round(monthlyRate, 6),
      tenureMonths: months,
      tenureYears: round(months / 12, 2),
      emi: baseEmi,
      totalInterest,
      totalPrincipal,
      totalPayable,
      interestRatio,
      principalRatio: round(100 - interestRatio, 1),
      scheduleLength: schedule.length,
    },
    schedule,
  };
}

/**
 * Yearly aggregation of the schedule — used for the chart so a 30-year loan
 * does not render 360 data points.
 */
function yearlyBreakdown(schedule) {
  const buckets = new Map();
  schedule.forEach((row) => {
    const year = Math.ceil(row.period / 12);
    const current = buckets.get(year) || {
      year,
      period: year,
      principal: 0,
      interest: 0,
      paid: 0,
      outstanding: row.balance,
    };
    current.principal = round(current.principal + row.principal, 2);
    current.interest = round(current.interest + row.interest, 2);
    current.paid = round(current.paid + row.emi, 2);
    current.outstanding = row.balance;
    buckets.set(year, current);
  });
  return [...buckets.values()];
}

/**
 * Part-prepayment simulation: what happens to the remaining schedule if the
 * borrower pays `amount` on the principal after `afterPeriod` instalments.
 */
function simulatePrepayment({ principal, annualRate, tenureYears, tenureMonths, amount, afterPeriod, keepEmi = false }) {
  const base = calculateEmi({ principal, annualRate, tenureYears, tenureMonths });

  if (!amount || amount <= 0) {
    return { base: base.summary, scenario: null };
  }

  const upto = Math.min(Math.max(1, Number(afterPeriod) || 1), base.schedule.length);
  const before = base.schedule[upto - 1];
  if (!before) return { base: base.summary, scenario: null };

  const newBalance = round(before.balance - amount, 2);
  if (newBalance <= 0) {
    return {
      base: base.summary,
      scenario: {
        fullyPaidOff: true,
        newOutstanding: 0,
        period: upto,
        interestSaved: before.cumulativeInterest,
      },
    };
  }

  const remaining = base.schedule.length - upto;
  const monthlyRate = annualRate / 12 / 100;

  const scenario = keepEmi
    ? {
        strategy: 'keep-emi',
        newEmi: before.emi,
        newTenureMonths: null,
        monthsSaved: null,
        interestSaved: 0,
      }
    : {
        strategy: 'keep-tenure',
        newEmi: round(computeEmi(newBalance, monthlyRate, remaining), 2),
        newTenureMonths: remaining,
        monthsSaved: 0,
        interestSaved: 0,
      };

  // Recalculate the new schedule to measure the real interest saving.
  const newResult = calculateEmi({
    principal: newBalance,
    annualRate,
    tenureMonths: scenario.newTenureMonths || remaining,
  });

  const newInterestTotal = newResult.summary.totalInterest;
  // Interest the original loan would still have charged from this point on.
  const originalRemainingInterest = round(
    base.summary.totalInterest - before.cumulativeInterest + before.interest,
    2,
  );

  if (scenario.strategy === 'keep-tenure') {
    scenario.monthsSaved = base.schedule.length - upto - remaining;
  } else {
    // keep-EMI: tenure shortens to whatever the new balance needs
    const months = estimateMonths(newBalance, before.emi, monthlyRate);
    scenario.newTenureMonths = months;
    scenario.monthsSaved = base.schedule.length - upto - months;
  }

  scenario.interestSaved = round(originalRemainingInterest - newInterestTotal, 2);
  scenario.newTotalPayable = round(newBalance + newInterestTotal, 2);
  scenario.newOutstanding = newBalance;
  scenario.period = upto;

  return { base: base.summary, scenario, newSchedule: newResult.summary };
}

/** How many months to clear `balance` paying `emi` per month at `rate`. */
function estimateMonths(balance, emi, monthlyRate) {
  if (emi <= 0) return 0;
  if (monthlyRate === 0) return Math.ceil(balance / emi);
  const growth = pow(1 + monthlyRate, 2);
  const n = -Math.log(1 - (balance * monthlyRate) / emi) / Math.log(growth);
  return Math.max(1, Math.ceil(n));
}

/** Eligibility estimator inputs → an EDUCATIONAL indication, never an approval. */
function estimateEligibility({ age, employmentType, monthlyIncome, existingEmis, creditScore, loanAmount, loanType }) {
  const factors = [];
  let score = 0;
  let max = 0;

  const add = (label, detail, weight, points) => {
    max += weight;
    score += points;
    factors.push({ label, detail, weight, points });
  };

  // Age — general guidance bands only.
  const ageBand =
    age < 21 ? 'below-typical' : age <= 30 ? 'typical-entry' : age <= 45 ? 'mid-career' : age <= 58 ? 'later' : 'above-typical';
  add(
    'Age',
    age < 21
      ? 'Many lenders set a minimum entry age; below 21 the options are usually limited.'
      : age <= 30
        ? 'This is a common entry range that most lenders work with.'
        : age <= 45
          ? 'A well-established working age, though tenure may be capped by the maximum age at closure.'
          : age > 58
            ? 'Above the typical upper age for most lenders; tenure would need to be short, so verify with the lender.'
            : 'Upper range — verify the maximum age at loan closure with the lender.',
    20,
    ageBand === 'typical-entry' || ageBand === 'mid-career' ? 18 : ageBand === 'later' ? 10 : 3,
  );

  // Employment type.
  add(
    'Employment type',
    employmentType === 'salaried'
      ? 'Salaried income is usually the simplest for a lender to verify using salary slips and bank credits.'
      : employmentType === 'self-employed'
        ? 'Self-employed income is assessed through business records, ITR and bank statements, and usually needs a longer track record.'
        : 'A business applicant is usually assessed on business income, turnover and vintage.',
    20,
    employmentType === 'salaried' ? 18 : employmentType === 'self-employed' ? 13 : 11,
  );

  // Income.
  if (monthlyIncome > 0) {
    const emiRatio = existingEmis > 0 ? existingEmis / monthlyIncome : 0;
    add(
      'Income vs existing obligations',
      `Your existing obligations are about ${Math.round(emiRatio * 100)}% of your monthly income. Lenders prefer a larger share of income to remain free after existing EMIs.`,
      25,
      emiRatio <= 0.2 ? 23 : emiRatio <= 0.35 ? 17 : emiRatio <= 0.5 ? 9 : 2,
    );
  } else {
    add('Income vs existing obligations', 'No monthly income provided, so this could not be assessed.', 25, 0);
  }

  // Credit score band.
  const scoreBand =
    creditScore >= 780 ? 'excellent' : creditScore >= 700 ? 'good' : creditScore >= 650 ? 'fair' : 'needs-work';
  add(
    'Credit score',
    `A score of ${creditScore} falls in the "${scoreBand}" range on a typical 300–900 scale. Bands and cut-offs differ by lender.`,
    20,
    creditScore >= 780 ? 19 : creditScore >= 700 ? 15 : creditScore >= 650 ? 8 : 2,
  );

  // Requested amount relative to income.
  if (monthlyIncome > 0 && loanAmount > 0) {
    const multiple = loanAmount / monthlyIncome;
    add(
      'Loan amount requested',
      `The amount you indicated is about ${round(multiple, 1)} times your monthly income. Lenders assess the amount against income, existing obligations and, for secured loans, the value of the security.`,
      15,
      multiple <= 6 ? 14 : multiple <= 10 ? 9 : multiple <= 15 ? 4 : 1,
    );
  } else {
    add('Loan amount requested', 'No loan amount provided, so this could not be assessed.', 15, 0);
  }

  const percentage = max > 0 ? Math.round((score / max) * 100) : 0;

  let band;
  let summary;
  if (percentage >= 78) {
    band = 'strong';
    summary =
      'Based on the general factors you entered, your profile shows several commonly favourable indicators. This is a general educational observation only.';
  } else if (percentage >= 55) {
    band = 'moderate';
    summary =
      'Some of the factors you entered are commonly viewed as workable, while others may need attention. Lenders assess each case individually.';
  } else if (percentage >= 32) {
    band = 'needs-improvement';
    summary =
      'Several of the factors you entered commonly lead to a higher rate, a lower amount or a longer tenure. Improving your credit profile and reducing existing obligations usually helps.';
  } else {
    band = 'early-stage';
    summary =
      'The factors you entered are at an early stage. Building a credit record and stabilising income is usually the first step before approaching a lender.';
  }

  return {
    band,
    summary,
    score: percentage,
    factors,
    loanType: loanType || null,
    computedAt: new Date().toISOString(),
  };
}

module.exports = {
  calculateEmi,
  computeEmi,
  yearlyBreakdown,
  simulatePrepayment,
  estimateMonths,
  estimateEligibility,
  round,
};
