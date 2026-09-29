'use strict';

/**
 * Map a raw `users` row to the public shape returned by the API.
 * `password_hash` is deliberately never included.
 */
function toPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: Boolean(row.is_active),
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Fields safe to persist for admin list views. */
function toAdminUser(row) {
  if (!row) return null;
  return {
    ...toPublicUser(row),
    conversationCount: Number(row.conversation_count || 0),
    messageCount: Number(row.message_count || 0),
  };
}

const userModel = {
  async create({ name, email, passwordHash, role = 'USER' }) {
    const db = require('../config/db');
    const { insertId } = await db.insert(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, role],
    );
    return userModel.findById(insertId);
  },

  async findById(id) {
    const db = require('../config/db');
    const row = await db.selectOne('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return toPublicUser(row);
  },

  /** Includes password_hash — only for the login flow. */
  async findByEmailWithHash(email) {
    const db = require('../config/db');
    return db.selectOne('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  },

  async findByEmail(email) {
    const db = require('../config/db');
    const row = await db.selectOne(
      'SELECT id, name, email, role, is_active, created_at, updated_at FROM users WHERE email = ? LIMIT 1',
      [email],
    );
    return toPublicUser(row);
  },

  async emailExists(email) {
    const db = require('../config/db');
    const row = await db.selectOne('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    return Boolean(row);
  },

  async updateProfile(id, { name }) {
    const db = require('../config/db');
    await db.update('UPDATE users SET name = ? WHERE id = ?', [name, id]);
    return userModel.findById(id);
  },

  async updatePassword(id, passwordHash) {
    const db = require('../config/db');
    await db.update('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
    return true;
  },

  async updateRole(id, role) {
    const db = require('../config/db');
    await db.update('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    return userModel.findById(id);
  },

  async setActive(id, isActive) {
    const db = require('../config/db');
    await db.update('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
    return userModel.findById(id);
  },

  async touchLastLogin(id) {
    const db = require('../config/db');
    await db.update('UPDATE users SET last_login_at = NOW() WHERE id = ?', [id]);
  },

  /**
   * Admin listing with search, role filter and pagination.
   */
  async list({ search, role, limit, offset }) {
    const db = require('../config/db');
    const { likePattern } = require('../utils/sanitize');

    const where = [];
    const params = [];

    if (search) {
      where.push('(u.name LIKE ? ESCAPE \'\\\\\' OR u.email LIKE ? ESCAPE \'\\\\\')');
      const pattern = likePattern(search);
      params.push(pattern, pattern);
    }
    if (role && ['USER', 'ADMIN'].includes(role)) {
      where.push('u.role = ?');
      params.push(role);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRow = await db.selectOne(
      `SELECT COUNT(*) AS total FROM users u ${whereSql}`,
      params,
    );
    const total = Number(countRow?.total || 0);

    const rows = await db.select(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.last_login_at, u.created_at, u.updated_at,
              (SELECT COUNT(*) FROM conversations c WHERE c.user_id = u.id) AS conversation_count,
              (SELECT COUNT(*) FROM messages m WHERE m.user_id = u.id) AS message_count
         FROM users u
         ${whereSql}
         ORDER BY u.created_at DESC
         LIMIT ${Math.floor(limit)} OFFSET ${Math.floor(offset)}`,
      params,
    );

    return { rows: rows.map(toAdminUser), total };
  },

  async count() {
    const db = require('../config/db');
    const row = await db.selectOne('SELECT COUNT(*) AS total FROM users');
    return Number(row?.total || 0);
  },
};

module.exports = { userModel, toPublicUser, toAdminUser };
