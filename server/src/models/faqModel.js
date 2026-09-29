'use strict';

function toFaq(row) {
  if (!row) return null;
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    category: row.category,
    sortOrder: row.sort_order,
    isPublished: Boolean(row.is_published),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const faqModel = {
  async list({ category, includeUnpublished = false, limit, offset }) {
    const db = require('../config/db');

    const where = [];
    const params = [];

    if (!includeUnpublished) where.push('is_published = 1');
    if (category && category !== 'All') {
      where.push('category = ?');
      params.push(category);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRow = await db.selectOne(`SELECT COUNT(*) AS total FROM faqs ${whereSql}`, params);
    const total = Number(countRow?.total || 0);

    const rows = await db.select(
      `SELECT * FROM faqs ${whereSql}
        ORDER BY sort_order ASC, id ASC
        LIMIT ${Math.floor(limit)} OFFSET ${Math.floor(offset)}`,
      params,
    );

    return { rows: rows.map(toFaq), total };
  },

  async categories() {
    const db = require('../config/db');
    const rows = await db.select(
      'SELECT category, COUNT(*) AS count FROM faqs GROUP BY category ORDER BY MIN(sort_order) ASC',
    );
    return rows.map((row) => ({ category: row.category, count: Number(row.count) }));
  },

  async findById(id) {
    const db = require('../config/db');
    const row = await db.selectOne('SELECT * FROM faqs WHERE id = ? LIMIT 1', [id]);
    return toFaq(row);
  },

  async create(payload) {
    const db = require('../config/db');
    const { insertId } = await db.insert(
      'INSERT INTO faqs (question, answer, category, sort_order, is_published) VALUES (?, ?, ?, ?, ?)',
      [
        payload.question,
        payload.answer,
        payload.category ?? 'General',
        payload.sortOrder ?? 0,
        payload.isPublished === false ? 0 : 1,
      ],
    );
    return faqModel.findById(insertId);
  },

  async update(id, payload) {
    const db = require('../config/db');
    const columns = {
      question: 'question',
      answer: 'answer',
      category: 'category',
      sortOrder: 'sort_order',
      isPublished: 'is_published',
    };

    const sets = [];
    const params = [];
    Object.entries(columns).forEach(([key, column]) => {
      if (payload[key] === undefined) return;
      const value = key === 'isPublished' ? (payload[key] ? 1 : 0) : payload[key];
      sets.push(`${column} = ?`);
      params.push(value);
    });

    if (!sets.length) return faqModel.findById(id);

    params.push(id);
    await db.update(`UPDATE faqs SET ${sets.join(', ')} WHERE id = ?`, params);
    return faqModel.findById(id);
  },

  async remove(id) {
    const db = require('../config/db');
    const { affectedRows } = await db.update('DELETE FROM faqs WHERE id = ?', [id]);
    return affectedRows > 0;
  },

  async count() {
    const db = require('../config/db');
    const row = await db.selectOne('SELECT COUNT(*) AS total FROM faqs WHERE is_published = 1');
    return Number(row?.total || 0);
  },
};

module.exports = { faqModel, toFaq };
