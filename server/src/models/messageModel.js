'use strict';

const { toMessage } = require('./conversationModel');

const messageModel = {
  /**
   * Persist a chat turn.
   * @param {object} params
   * @param {number} params.conversationId
   * @param {number|null} params.userId  null for guest conversations
   * @param {'user'|'assistant'} params.role
   * @param {string} params.content
   * @param {'openai'|'offline_knowledge'} [params.source]
   * @param {object} [params.metrics] { promptTokens, completionTokens, latencyMs }
   */
  async create({ conversationId, userId = null, role, content, source = 'openai', metrics = {} }) {
    const db = require('../config/db');
    const { insertId } = await db.insert(
      `INSERT INTO messages
         (conversation_id, user_id, role, content, source, prompt_tokens, completion_tokens, latency_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        conversationId,
        userId,
        role,
        content,
        source,
        metrics.promptTokens ?? null,
        metrics.completionTokens ?? null,
        metrics.latencyMs ?? null,
      ],
    );

    await db.update('UPDATE conversations SET message_count = message_count + 1 WHERE id = ?', [
      conversationId,
    ]);

    return { id: insertId, conversationId, userId, role, content, source };
  },

  /** Most recent `limit` messages of a conversation, oldest-first. */
  async listByConversation(conversationId, limit = 60) {
    const db = require('../config/db');
    const rows = await db.select(
      `SELECT * FROM (
         SELECT m.* FROM messages m
          WHERE m.conversation_id = ?
          ORDER BY m.created_at DESC, m.id DESC
          LIMIT ${Math.floor(limit)}
       ) recent
       ORDER BY recent.created_at ASC, recent.id ASC`,
      [conversationId],
    );
    return rows.map(toMessage);
  },

  async findById(id, userId) {
    const db = require('../config/db');
    // When a userId is supplied the lookup is scoped to that user's own
    // messages, so one account cannot read or rate another account's history.
    const row = userId
      ? await db.selectOne('SELECT * FROM messages WHERE id = ? AND user_id = ? LIMIT 1', [
          id,
          userId,
        ])
      : await db.selectOne('SELECT * FROM messages WHERE id = ? LIMIT 1', [id]);
    return toMessage(row);
  },

  async rate(messageId, userId, rating) {
    const db = require('../config/db');
    await db.query(
      `INSERT INTO message_feedback (message_id, user_id, rating)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating)`,
      [messageId, userId, rating],
    );
    return true;
  },

  async count() {
    const db = require('../config/db');
    const row = await db.selectOne('SELECT COUNT(*) AS total FROM messages');
    return Number(row?.total || 0);
  },

  async countByUser(userId) {
    const db = require('../config/db');
    const row = await db.selectOne('SELECT COUNT(*) AS total FROM messages WHERE user_id = ?', [userId]);
    return Number(row?.total || 0);
  },
};

module.exports = { messageModel };
