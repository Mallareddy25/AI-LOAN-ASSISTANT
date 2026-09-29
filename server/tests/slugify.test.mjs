import { describe, it, expect } from 'vitest';
import sanitize from '../src/utils/sanitize.js';

const { slugify } = sanitize;

describe('slugify', () => {
  it('lowercases and hyphenates a title', () => {
    expect(slugify('Amortization Schedule')).toBe('amortization-schedule');
    expect(slugify('  Fixed vs Floating Rate  ')).toBe('fixed-vs-floating-rate');
  });

  it('produces a value that satisfies the admin slug schema', () => {
    // The schema requires /^[a-z0-9-]+$/ within 2..120 characters.
    ['Home Loan', 'EMI & Amortisation', 'Kisan Credit Card!!', 'EMI'].forEach((title) => {
      expect(slugify(title), title).toMatch(/^[a-z0-9-]+$/);
      expect(slugify(title).length, title).toBeGreaterThanOrEqual(2);
      expect(slugify(title).length, title).toBeLessThanOrEqual(120);
    });
  });

  it('folds diacritics instead of dropping the word', () => {
    expect(slugify('Café Loan')).toBe('cafe-loan');
    expect(slugify('Crème Brûlée')).toBe('creme-brulee');
  });

  it('strips apostrophes without leaving a double hyphen', () => {
    expect(slugify("Lender's Name")).toBe('lenders-name');
    expect(slugify("borrower's name")).toBe('borrowers-name');
  });

  it('collapses punctuation and trims stray hyphens', () => {
    expect(slugify('--Home Loan--')).toBe('home-loan');
    expect(slugify('a / b / c')).toBe('a-b-c');
    expect(slugify('50% of income')).toBe('50-of-income');
  });

  it('truncates on a word boundary and never leaves a trailing hyphen', () => {
    const long = slugify('The Complete Guide To Understanding Fixed And Floating Interest Rates', 40);
    expect(long.length).toBeLessThanOrEqual(40);
    expect(long.endsWith('-')).toBe(false);
    expect(long).toBe('the-complete-guide-to-understanding');
  });

  it('returns an empty string when nothing usable survives', () => {
    expect(slugify('!!!')).toBe('');
    expect(slugify('')).toBe('');
    expect(slugify(null)).toBe('');
  });
});
