'use strict';

/**
 * Input hardening helpers.
 *
 * SQL injection is prevented structurally by always using parameterised
 * queries (see `config/db.js`). These helpers cover the remaining concerns:
 * LIKE-pattern escaping, control-character stripping, length clamping and
 * identifier whitelisting for ORDER BY clauses.
 */

/** Escape `%`, `_` and `\` so user input cannot alter a LIKE pattern. */
function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, (match) => `\\${match}`);
}

/** Build a `%term%` pattern that is safe to pass as a bound parameter. */
function likePattern(value) {
  return `%${escapeLike(String(value).trim())}%`;
}

/** Remove control characters that can corrupt logs or terminal output. */
function stripControlChars(value) {
  // eslint-disable-next-line no-control-regex
  return String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

/** Normalise free text: trim, strip control chars, collapse whitespace, clamp. */
function cleanText(value, maxLength = 500) {
  if (value === null || value === undefined) return '';
  return stripControlChars(String(value).replace(/\s+/g, ' ').trim()).slice(0, maxLength);
}

/** Clamp an integer into a range, returning a fallback when invalid. */
function clampInt(value, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, fallback = 0 } = {}) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

/** Clamp a finite number into a range. */
function clampNumber(value, { min = 0, max = Number.MAX_VALUE, fallback = 0 } = {}) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

/** Round to `places` decimals, avoiding float artefacts like 1234.5600000000001. */
function round(value, places = 2) {
  const factor = 10 ** places;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

/**
 * Resolve an ORDER BY request against a whitelist.
 * @param {string} requested  Client-supplied sort field
 * @param {string[]} allowed  Column names that are safe to emit
 * @param {string} fallback   Column used when the request is not allowed
 */
function safeOrderBy(requested, allowed, fallback) {
  const value = String(requested || '').trim().toLowerCase();
  return allowed.includes(value) ? value : fallback;
}

/**
 * Build a URL-safe slug from a human title.
 *
 * Knowledge items are addressed publicly as `/glossary/:slug`, so the value has
 * to survive a browser URL untouched. Diacritics are folded rather than dropped
 * ("Café Loan" → "cafe-loan"), and the result is truncated on a word boundary.
 *
 * @param {string} input
 * @param {number} [maxLength=80]
 * @returns {string} Lowercase slug, possibly empty if nothing survived
 */
function slugify(input, maxLength = 80) {
  const base = String(input || '')
    .normalize('NFKD')
    // Strip the combining marks left behind by NFKD.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (base.length <= maxLength) return base;

  const clipped = base.slice(0, maxLength);
  const lastDash = clipped.lastIndexOf('-');
  // Prefer a word boundary, but never return an empty slug.
  return (lastDash > maxLength * 0.5 ? clipped.slice(0, lastDash) : clipped).replace(/-+$/, '');
}

/** Parse `key:value,key2:value2` into a plain object. */
function parseKeyValues(input) {
  if (!input) return {};
  return String(input)
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const index = pair.indexOf(':');
      if (index === -1) return acc;
      const key = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      if (key) acc[key] = value;
      return acc;
    }, {});
}

module.exports = {
  escapeLike,
  likePattern,
  stripControlChars,
  cleanText,
  clampInt,
  clampNumber,
  round,
  safeOrderBy,
  parseKeyValues,
  slugify,
};
