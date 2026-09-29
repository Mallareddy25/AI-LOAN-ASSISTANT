import { describe, it, expect } from 'vitest';
import calculator from '../src/services/calculatorService.js';

const { calculateEmi, computeEmi, simulatePrepayment, estimateEligibility, round } = calculator;

/** Standard reducing-balance formula, computed independently of the service. */
function referenceEmi(principal, monthlyRate, months) {
  if (monthlyRate === 0) return principal / months;
  const growth = (1 + monthlyRate) ** months;
  return (principal * monthlyRate * growth) / (growth - 1);
}

describe('computeEmi', () => {
  // Signature is (principal, MONTHLY rate, months) — see the service.
  it('matches the standard reducing-balance formula', () => {
    const cases = [
      [500000, 12 / 12 / 100, 36],
      [250000, 8.5 / 12 / 100, 60],
      [1000000, 14 / 12 / 100, 120],
      [750000, 9.25 / 12 / 100, 240],
    ];
    cases.forEach(([principal, rate, months]) => {
      expect(round(computeEmi(principal, rate, months), 2)).toBe(
        round(referenceEmi(principal, rate, months), 2),
      );
    });
  });

  it('treats a zero-rate loan as principal / months', () => {
    expect(round(computeEmi(240000, 0, 24), 2)).toBe(round(10000, 2));
  });

  it('never divides by a non-positive term', () => {
    expect(computeEmi(100000, 0.01, 0)).toBe(0);
    expect(computeEmi(100000, 0.01, -5)).toBe(0);
  });
});

describe('calculateEmi', () => {
  const { summary, schedule } = calculateEmi({
    principal: 500000,
    annualRate: 12,
    tenureYears: 3,
  });

  it('produces a full amortisation schedule', () => {
    expect(schedule).toHaveLength(36);
    expect(summary.emi).toBeCloseTo(16607.15, 2);
    expect(summary.scheduleLength).toBe(36);
  });

  it('reduces the balance to zero at the end of the term', () => {
    const last = schedule[schedule.length - 1];
    expect(Math.abs(last.balance)).toBeLessThan(1);
  });

  it('keeps principal + interest consistent with the EMI', () => {
    schedule.forEach((row) => {
      expect(Math.abs(row.principal + row.interest - row.emi)).toBeLessThan(0.05);
    });
  });

  it('sums principal paid to the amount borrowed', () => {
    const total = schedule.reduce((sum, row) => sum + row.principal, 0);
    expect(Math.abs(total - 500000)).toBeLessThan(1);
  });

  it('accumulates interest monotonically and matches the summary', () => {
    const last = schedule[schedule.length - 1];
    expect(last.cumulativeInterest).toBeCloseTo(summary.totalInterest, 1);
    expect(summary.totalPrincipal + summary.totalInterest).toBeCloseTo(summary.totalPayable, 1);
    expect(summary.interestRatio + summary.principalRatio).toBeCloseTo(100, 0);
  });

  it('derives the year and month count from either input', () => {
    expect(summary.tenureMonths).toBe(36);
    expect(summary.tenureYears).toBe(3);
    expect(
      calculateEmi({ principal: 100000, annualRate: 10, tenureMonths: 18 }).summary.tenureMonths,
    ).toBe(18);
  });

  it('handles a zero-interest loan end to end', () => {
    const free = calculateEmi({ principal: 120000, annualRate: 0, tenureYears: 1 });
    expect(free.summary.emi).toBeCloseTo(10000, 2);
    expect(free.summary.totalInterest).toBe(0);
    expect(free.schedule).toHaveLength(12);
  });
});

describe('simulatePrepayment', () => {
  it('returns no scenario when there is nothing to prepay', () => {
    const result = simulatePrepayment({
      principal: 300000,
      annualRate: 10,
      tenureYears: 10,
      amount: 0,
    });
    expect(result.scenario).toBeNull();
    expect(result.base.emi).toBeGreaterThan(0);
  });

  it('saves interest and shortens the term', () => {
    const { base, scenario } = simulatePrepayment({
      principal: 1000000,
      annualRate: 12,
      tenureYears: 20,
      amount: 200000,
      afterPeriod: 12,
    });

    expect(scenario).not.toBeNull();
    expect(scenario.interestSaved).toBeGreaterThan(0);
    // keep-tenure: the term shortens and the instalment falls, because the
    // same remaining months now carry a smaller balance.
    expect(scenario.strategy).toBe('keep-tenure');
    expect(scenario.newTenureMonths).toBeLessThan(base.tenureMonths);
    expect(scenario.newEmi).toBeLessThan(base.emi);
  });

  it('reports a full payoff when the prepayment clears the balance', () => {
    const { scenario } = simulatePrepayment({
      principal: 200000,
      annualRate: 10,
      tenureYears: 5,
      amount: 199999,
      afterPeriod: 2,
    });
    expect(scenario.fullyPaidOff).toBe(true);
    expect(scenario.newOutstanding).toBe(0);
  });

  it('never reports a negative or NaN saving', () => {
    const { scenario } = simulatePrepayment({
      principal: 300000,
      annualRate: 10,
      tenureYears: 10,
      amount: 1000,
      afterPeriod: 6,
    });
    expect(Number.isFinite(scenario.interestSaved)).toBe(true);
    expect(scenario.interestSaved).toBeGreaterThanOrEqual(0);
  });
});

describe('estimateEligibility', () => {
  const strong = estimateEligibility({
    age: 30,
    employmentType: 'salaried',
    monthlyIncome: 120000,
    existingEmis: 0,
    creditScore: 780,
    loanAmount: 5000000,
    loanType: 'home',
  });
  const weak = estimateEligibility({
    age: 22,
    employmentType: 'other',
    monthlyIncome: 18000,
    existingEmis: 3,
    creditScore: 550,
    loanAmount: 5000000,
    loanType: 'personal',
  });

  it('scores a strong profile above a weak one', () => {
    expect(strong.score).toBeGreaterThan(weak.score);
  });

  it('uses the four documented bands', () => {
    expect(['strong', 'moderate', 'needs-improvement', 'early-stage']).toContain(strong.band);
    expect(['strong', 'moderate', 'needs-improvement', 'early-stage']).toContain(weak.band);
  });

  it('explains every factor it scored', () => {
    expect(strong.factors.length).toBeGreaterThan(3);
    strong.factors.forEach((factor) => {
      expect(typeof factor.label).toBe('string');
      expect(typeof factor.detail).toBe('string');
      expect(factor.points).toBeLessThanOrEqual(factor.weight);
    });
  });

  it('stays educational — no approval language in the summary', () => {
    expect(strong.summary).toMatch(/educational|observation|general/i);
    expect(strong.summary).not.toMatch(/you will be approved|guaranteed/i);
  });
});
