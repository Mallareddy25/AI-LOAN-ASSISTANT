'use strict';

function toEligibility(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    factor: row.factor,
    category: row.category,
    icon: row.icon,
    summary: row.summary,
    explanation: row.explanation,
    typicalConsideration: row.typical_consideration,
    impact: row.impact,
    example: row.example,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const eligibilityModel = {
  async list({ search, category, impact, limit, offset }) {
    const db = require('../config/db');
    const { likePattern } = require('../utils/sanitize');

    const where = [];
    const params = [];

    if (search) {
      const pattern = likePattern(search);
      where.push(
        "(factor LIKE ? ESCAPE '\\\\' OR summary LIKE ? ESCAPE '\\\\' OR explanation LIKE ? ESCAPE '\\\\')",
      );
      params.push(pattern, pattern, pattern);
    }
    if (category && category !== 'All') {
      where.push('category = ?');
      params.push(category);
    }
    if (impact && impact !== 'All') {
      where.push('impact = ?');
      params.push(impact);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRow = await db.selectOne(
      `SELECT COUNT(*) AS total FROM eligibility_factors ${whereSql}`,
      params,
    );
    const total = Number(countRow?.total || 0);

    const rows = await db.select(
      `SELECT * FROM eligibility_factors
        ${whereSql}
        ORDER BY FIELD(impact, 'high', 'medium', 'low'), sort_order ASC
        LIMIT ${Math.floor(limit)} OFFSET ${Math.floor(offset)}`,
      params,
    );

    return { rows: rows.map(toEligibility), total };
  },

  async categories() {
    const db = require('../config/db');
    const rows = await db.select(
      'SELECT category, COUNT(*) AS count FROM eligibility_factors GROUP BY category ORDER BY MIN(sort_order) ASC',
    );
    return rows.map((row) => ({ category: row.category, count: Number(row.count) }));
  },

  async findByIdOrSlug(idOrSlug) {
    const db = require('../config/db');
    const numeric = Number.parseInt(idOrSlug, 10);
    const row = Number.isFinite(numeric)
      ? await db.selectOne('SELECT * FROM eligibility_factors WHERE id = ? LIMIT 1', [numeric])
      : await db.selectOne('SELECT * FROM eligibility_factors WHERE slug = ? LIMIT 1', [
          String(idOrSlug),
        ]);
    return toEligibility(row);
  },

  async create(payload) {
    const db = require('../config/db');
    const { insertId } = await db.insert(
      `INSERT INTO eligibility_factors
        (slug, factor, category, icon, summary, explanation, typical_consideration, impact, example, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.slug,
        payload.factor,
        payload.category ?? 'Personal',
        payload.icon ?? 'User',
        payload.summary,
        payload.explanation,
        payload.typicalConsideration ?? null,
        payload.impact ?? 'medium',
        payload.example ?? null,
        payload.sortOrder ?? 0,
      ],
    );
    return eligibilityModel.findByIdOrSlug(insertId);
  },

  async update(id, payload) {
    const db = require('../config/db');
    const columns = {
      slug: 'slug',
      factor: 'factor',
      category: 'category',
      icon: 'icon',
      summary: 'summary',
      explanation: 'explanation',
      typicalConsideration: 'typical_consideration',
      impact: 'impact',
      example: 'example',
      sortOrder: 'sort_order',
    };

    const sets = [];
    const params = [];
    Object.entries(columns).forEach(([key, column]) => {
      if (payload[key] === undefined) return;
      sets.push(`${column} = ?`);
      params.push(payload[key]);
    });

    if (!sets.length) return eligibilityModel.findByIdOrSlug(id);

    params.push(id);
    await db.update(`UPDATE eligibility_factors SET ${sets.join(', ')} WHERE id = ?`, params);
    return eligibilityModel.findByIdOrSlug(id);
  },

  async remove(id) {
    const db = require('../config/db');
    const { affectedRows } = await db.update('DELETE FROM eligibility_factors WHERE id = ?', [id]);
    return affectedRows > 0;
  },

  async count() {
    const db = require('../config/db');
    const row = await db.selectOne('SELECT COUNT(*) AS total FROM eligibility_factors');
    return Number(row?.total || 0);
  },
};

module.exports = { eligibilityModel, toEligibility };
