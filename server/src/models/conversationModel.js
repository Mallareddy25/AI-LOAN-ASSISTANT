'use strict';

const { cleanText } = require('../utils/sanitize');

function toConversation(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    category: row.category,
    isArchived: Boolean(row.is_archived),
    messageCount: Number(row.message_count || 0),
    lastMessage: row.last_message || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    userId: row.user_id,
    role: row.role,
    content: row.content,
    source: row.source,
    promptTokens: row.prompt_tokens,
    completionTokens: row.completion_tokens,
    latencyMs: row.latency_ms,
    createdAt: row.created_at,
  };
}

const DEFAULT_TITLE = 'New conversation';

/** Derive a readable conversation title from the first user message. */
function titleFromMessage(message, maxLength = 60) {
  const cleaned = cleanText(message, 400);
  if (!cleaned) return DEFAULT_TITLE;
  const firstSentence = cleaned.split(/(?<=[.!?])\s/)[0] || cleaned;
  const trimmed = firstSentence.length > maxLength ? `${firstSentence.slice(0, maxLength - 1).trim()}…` : firstSentence;
  return trimmed || DEFAULT_TITLE;
}

const conversationModel = {
  async create({ userId, title, category = null }) {
    const db = require('../config/db');
    const { insertId } = await db.insert(
      'INSERT INTO conversations (user_id, title, category) VALUES (?, ?, ?)',
      [userId, title || DEFAULT_TITLE, category],
    );
    return conversationModel.findById(insertId, userId);
  },

  async findById(id, userId) {
    const db = require('../config/db');
    const row = await db.selectOne('SELECT * FROM conversations WHERE id = ? AND user_id = ? LIMIT 1', [
      id,
      userId,
    ]);
    return toConversation(row);
  },

  /** Ownership check that also guards against cross-user access. */
  async belongsToUser(id, userId) {
    const db = require('../config/db');
    const row = await db.selectOne('SELECT id FROM conversations WHERE id = ? AND user_id = ? LIMIT 1', [
      id,
      userId,
    ]);
    return Boolean(row);
  },

  async list({ userId, limit, offset, search }) {
    const db = require('../config/db');
    const { likePattern } = require('../utils/sanitize');

    const where = ['c.user_id = ?'];
    const params = [userId];

    if (search) {
      where.push("(c.title LIKE ? ESCAPE '\\\\' OR EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.content LIKE ? ESCAPE '\\\\'))");
      const pattern = likePattern(search);
      params.push(pattern, pattern);
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;

    const countRow = await db.selectOne(
      `SELECT COUNT(*) AS total FROM conversations c ${whereSql}`,
      params,
    );
    const total = Number(countRow?.total || 0);

    const rows = await db.select(
      `SELECT c.*,
              (SELECT m.content FROM messages m
                WHERE m.conversation_id = c.id
                ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS last_message
         FROM conversations c
         ${whereSql}
         ORDER BY c.updated_at DESC
         LIMIT ${Math.floor(limit)} OFFSET ${Math.floor(offset)}`,
      params,
    );

    return { rows: rows.map(toConversation), total };
  },

  async rename(id, userId, title) {
    const db = require('../config/db');
    const safeTitle = cleanText(title, 160) || DEFAULT_TITLE;
    const { affectedRows } = await db.update(
      'UPDATE conversations SET title = ? WHERE id = ? AND user_id = ?',
      [safeTitle, id, userId],
    );
    if (!affectedRows) return null;
    return conversationModel.findById(id, userId);
  },

  async archive(id, userId, isArchived) {
    const db = require('../config/db');
    const { affectedRows } = await db.update(
      'UPDATE conversations SET is_archived = ? WHERE id = ? AND user_id = ?',
      [isArchived ? 1 : 0, id, userId],
    );
    if (!affectedRows) return null;
    return conversationModel.findById(id, userId);
  },

  async remove(id, userId) {
    const db = require('../config/db');
    const { affectedRows } = await db.update(
      'DELETE FROM conversations WHERE id = ? AND user_id = ?',
      [id, userId],
    );
    return affectedRows > 0;
  },

  async setTitleIfDefault(id, title) {
    const db = require('../config/db');
    await db.update('UPDATE conversations SET title = ? WHERE id = ? AND title = ?', [
      cleanText(title, 160) || DEFAULT_TITLE,
      id,
      DEFAULT_TITLE,
    ]);
  },

  async count() {
    const db = require('../config/db');
    const row = await db.selectOne('SELECT COUNT(*) AS total FROM conversations');
    return Number(row?.total || 0);
  },

  async countByUser(userId) {
    const db = require('../config/db');
    const row = await db.selectOne('SELECT COUNT(*) AS total FROM conversations WHERE user_id = ?', [
      userId,
    ]);
    return Number(row?.total || 0);
  },
};

module.exports = { conversationModel, toConversation, toMessage, titleFromMessage, DEFAULT_TITLE };
