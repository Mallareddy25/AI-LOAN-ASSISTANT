'use strict';

/**
 * Cursor-free pagination helpers shared by every list endpoint.
 */

const DEFAULTS = { page: 1, limit: 20, maxLimit: 100 };

function parsePagination(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || DEFAULTS.page);
  const requested = Number.parseInt(query.limit, 10) || DEFAULTS.limit;
  const limit = Math.min(Math.max(1, requested), DEFAULTS.maxLimit);
  return { page, limit, offset: (page - 1) * limit };
}

/** Build the LIMIT/OFFSET clause. Values are inlined as safe integers. */
function limitClause({ limit, offset }) {
  return `LIMIT ${Math.floor(limit)} OFFSET ${Math.floor(offset)}`;
}

function pageMeta({ page, limit, total }) {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Build a metadata object for a paginated response.
 * @returns {{data: Array, pagination: object}}
 */
function paginated(data, pagination, total) {
  return { data, pagination: pageMeta({ ...pagination, total }) };
}

module.exports = { parsePagination, limitClause, pageMeta, paginated, DEFAULTS };
