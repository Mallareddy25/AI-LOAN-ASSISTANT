'use strict';

const { parseJsonArray } = require('./loanTypeModel');

function toTerm(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    term: row.term,
    category: row.category,
    shortDefinition: row.short_definition,
    detailedExplanation: row.detailed_explanation,
    example: row.example,
    relatedTerms: parseJsonArray(row.related_terms),
    whyItMatters: row.why_it_matters,
    isFeatured: Boolean(row.is_featured),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Present only on the detail endpoint
    related: row.related ? parseJsonArray(row.related) : undefined,
    usedIn: row.used_in ? parseJsonArray(row.used_in) : undefined,
  };
}

const termModel = {
  async list({ search, category, featured, limit, offset }) {
    const db = require('../config/db');
    const { likePattern } = require('../utils/sanitize');

    const where = [];
    const params = [];

    if (search) {
      const pattern = likePattern(search);
      where.push(
        "(term LIKE ? ESCAPE '\\\\' OR short_definition LIKE ? ESCAPE '\\\\' OR detailed_explanation LIKE ? ESCAPE '\\\\' OR example LIKE ? ESCAPE '\\\\')",
      );
      params.push(pattern, pattern, pattern, pattern);
    }
    if (category && category !== 'All') {
      where.push('category = ?');
      params.push(category);
    }
    if (featured) where.push('is_featured = 1');

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRow = await db.selectOne(
      `SELECT COUNT(*) AS total FROM loan_terms ${whereSql}`,
      params,
    );
    const total = Number(countRow?.total || 0);

    const rows = await db.select(
      `SELECT * FROM loan_terms
        ${whereSql}
        ORDER BY is_featured DESC, sort_order ASC, term ASC
        LIMIT ${Math.floor(limit)} OFFSET ${Math.floor(offset)}`,
      params,
    );

    return { rows: rows.map(toTerm), total };
  },

  /** Distinct categories, for the filter UI. */
  async categories() {
    const db = require('../config/db');
    const rows = await db.select(
      'SELECT category, COUNT(*) AS count FROM loan_terms GROUP BY category ORDER BY category ASC',
    );
    return rows.map((row) => ({ category: row.category, count: Number(row.count) }));
  },

  async findByIdOrSlug(idOrSlug) {
    const db = require('../config/db');
    const numeric = Number.parseInt(idOrSlug, 10);
    const row = Number.isFinite(numeric)
      ? await db.selectOne('SELECT * FROM loan_terms WHERE id = ? LIMIT 1', [numeric])
      : await db.selectOne('SELECT * FROM loan_terms WHERE slug = ? LIMIT 1', [String(idOrSlug)]);
    return toTerm(row);
  },

  /** Detail view: term + resolved related terms + loan types that use it. */
  async findDetailed(idOrSlug) {
    const db = require('../config/db');
    const term = await termModel.findByIdOrSlug(idOrSlug);
    if (!term) return null;

    let related = [];
    if (term.relatedTerms.length) {
      const placeholders = term.relatedTerms.map(() => '?').join(', ');
      const rows = await db.select(
        `SELECT id, slug, term, short_definition
           FROM loan_terms
          WHERE slug IN (${placeholders})
          ORDER BY sort_order ASC`,
        term.relatedTerms,
      );
      related = rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        term: row.term,
        shortDefinition: row.short_definition,
      }));
    }

    const usedInRows = await db.select(
      `SELECT lt.id, lt.slug, lt.name, lt.icon, lt.accent, ltt.relevance
         FROM loan_type_terms ltt
         JOIN loan_types lt ON lt.id = ltt.loan_type_id
        WHERE ltt.term_id = ? AND lt.is_active = 1
        ORDER BY FIELD(ltt.relevance, 'core', 'common', 'optional'), lt.sort_order ASC`,
      [term.id],
    );

    return {
      ...term,
      related,
      usedIn: usedInRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        icon: row.icon,
        accent: row.accent,
        relevance: row.relevance,
      })),
    };
  },

  async create(payload) {
    const db = require('../config/db');
    const { insertId } = await db.insert(
      `INSERT INTO loan_terms
        (slug, term, category, short_definition, detailed_explanation, example,
         related_terms, why_it_matters, is_featured, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.slug,
        payload.term,
        payload.category ?? 'General',
        payload.shortDefinition,
        payload.detailedExplanation,
        payload.example ?? null,
        JSON.stringify(payload.relatedTerms ?? []),
        payload.whyItMatters ?? null,
        payload.isFeatured ? 1 : 0,
        payload.sortOrder ?? 0,
      ],
    );
    return termModel.findByIdOrSlug(insertId);
  },

  async update(id, payload) {
    const db = require('../config/db');
    const columns = {
      slug: 'slug',
      term: 'term',
      category: 'category',
      shortDefinition: 'short_definition',
      detailedExplanation: 'detailed_explanation',
      example: 'example',
      relatedTerms: 'related_terms',
      whyItMatters: 'why_it_matters',
      isFeatured: 'is_featured',
      sortOrder: 'sort_order',
    };

    const sets = [];
    const params = [];
    Object.entries(columns).forEach(([key, column]) => {
      if (payload[key] === undefined) return;
      let value = payload[key];
      if (key === 'relatedTerms') value = JSON.stringify(value ?? []);
      if (key === 'isFeatured') value = value ? 1 : 0;
      sets.push(`${column} = ?`);
      params.push(value);
    });

    if (!sets.length) return termModel.findByIdOrSlug(id);

    params.push(id);
    await db.update(`UPDATE loan_terms SET ${sets.join(', ')} WHERE id = ?`, params);
    return termModel.findByIdOrSlug(id);
  },

  async remove(id) {
    const db = require('../config/db');
    const { affectedRows } = await db.update('DELETE FROM loan_terms WHERE id = ?', [id]);
    return affectedRows > 0;
  },

  async count() {
    const db = require('../config/db');
    const row = await db.selectOne('SELECT COUNT(*) AS total FROM loan_terms');
    return Number(row?.total || 0);
  },
};

module.exports = { termModel, toTerm };
