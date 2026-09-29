'use strict';

function toDocument(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    description: row.description,
    whyNeeded: row.why_needed,
    typicalFormats: row.typical_formats,
    appliesTo: row.applies_to
      ? String(row.applies_to)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
    notes: row.notes,
    isRequired: Boolean(row.is_required),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const documentModel = {
  async list({ search, category, required, loanType, limit, offset }) {
    const db = require('../config/db');
    const { likePattern } = require('../utils/sanitize');

    const where = [];
    const params = [];

    if (search) {
      const pattern = likePattern(search);
      where.push(
        "(title LIKE ? ESCAPE '\\\\' OR description LIKE ? ESCAPE '\\\\' OR why_needed LIKE ? ESCAPE '\\\\')",
      );
      params.push(pattern, pattern, pattern);
    }
    if (category && category !== 'All') {
      where.push('category = ?');
      params.push(category);
    }
    if (required === true || required === 'true') where.push('is_required = 1');

    let joinSql = '';
    if (loanType) {
      joinSql = `JOIN loan_type_documents ltd ON ltd.document_id = d.id
                 JOIN loan_types lt ON lt.id = ltd.loan_type_id AND lt.slug = ?`;
      params.unshift(loanType);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRow = await db.selectOne(
      `SELECT COUNT(DISTINCT d.id) AS total FROM documents d ${joinSql} ${whereSql}`,
      params,
    );
    const total = Number(countRow?.total || 0);

    const rows = await db.select(
      `SELECT DISTINCT d.* FROM documents d
         ${joinSql}
         ${whereSql}
        ORDER BY d.is_required DESC, d.category ASC, d.sort_order ASC
        LIMIT ${Math.floor(limit)} OFFSET ${Math.floor(offset)}`,
      params,
    );

    return { rows: rows.map(toDocument), total };
  },

  async categories() {
    const db = require('../config/db');
    const rows = await db.select(
      'SELECT category, COUNT(*) AS count FROM documents GROUP BY category ORDER BY MIN(sort_order) ASC',
    );
    return rows.map((row) => ({ category: row.category, count: Number(row.count) }));
  },

  async findByIdOrSlug(idOrSlug) {
    const db = require('../config/db');
    const numeric = Number.parseInt(idOrSlug, 10);
    const row = Number.isFinite(numeric)
      ? await db.selectOne('SELECT * FROM documents WHERE id = ? LIMIT 1', [numeric])
      : await db.selectOne('SELECT * FROM documents WHERE slug = ? LIMIT 1', [String(idOrSlug)]);
    return toDocument(row);
  },

  async create(payload) {
    const db = require('../config/db');
    const { insertId } = await db.insert(
      `INSERT INTO documents
        (slug, title, category, description, why_needed, typical_formats, applies_to, notes, is_required, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.slug,
        payload.title,
        payload.category,
        payload.description,
        payload.whyNeeded ?? null,
        payload.typicalFormats ?? 'PDF, JPG, PNG',
        Array.isArray(payload.appliesTo) ? payload.appliesTo.join(',') : payload.appliesTo ?? null,
        payload.notes ?? null,
        payload.isRequired === false ? 0 : 1,
        payload.sortOrder ?? 0,
      ],
    );
    return documentModel.findByIdOrSlug(insertId);
  },

  async update(id, payload) {
    const db = require('../config/db');
    const columns = {
      slug: 'slug',
      title: 'title',
      category: 'category',
      description: 'description',
      whyNeeded: 'why_needed',
      typicalFormats: 'typical_formats',
      notes: 'notes',
      isRequired: 'is_required',
      sortOrder: 'sort_order',
    };

    const sets = [];
    const params = [];
    Object.entries(columns).forEach(([key, column]) => {
      if (payload[key] === undefined) return;
      let value = payload[key];
      if (key === 'isRequired') value = value ? 1 : 0;
      sets.push(`${column} = ?`);
      params.push(value);
    });

    if (payload.appliesTo !== undefined) {
      sets.push('applies_to = ?');
      params.push(
        Array.isArray(payload.appliesTo) ? payload.appliesTo.join(',') : payload.appliesTo ?? null,
      );
    }

    if (!sets.length) return documentModel.findByIdOrSlug(id);

    params.push(id);
    await db.update(`UPDATE documents SET ${sets.join(', ')} WHERE id = ?`, params);
    return documentModel.findByIdOrSlug(id);
  },

  async remove(id) {
    const db = require('../config/db');
    const { affectedRows } = await db.update('DELETE FROM documents WHERE id = ?', [id]);
    return affectedRows > 0;
  },

  async count() {
    const db = require('../config/db');
    const row = await db.selectOne('SELECT COUNT(*) AS total FROM documents');
    return Number(row?.total || 0);
  },
};

module.exports = { documentModel, toDocument };
