'use strict';

/**
 * Rotating refresh tokens with reuse detection.
 *
 * A refresh token is a JWT so it can be verified without a database round trip,
 * but it also carries a `jti` that is a row in `refresh_tokens`. The signature
 * alone is deliberately not enough: the row decides whether the token is still
 * unspent, which is what makes rotation and theft detection possible.
 *
 * Rows are grouped into a "family" — one per sign-in. Exchanging a token marks
 * its row used and issues a replacement in the same family. Presenting a row
 * that is already used means two copies of the same credential exist, so the
 * family is revoked outright.
 */
const db = require('../config/db');

const refreshTokenModel = {
  /**
   * Record a freshly issued refresh token.
   * @param {object} params
   * @param {string} params.id the jti placed in the JWT
   * @param {number} params.userId
   * @param {string} params.familyId
   * @param {Date}   params.expiresAt
   * @param {string} [params.userAgent]
   * @param {string} [params.ipAddress]
   */
  async create({ id, userId, familyId, expiresAt, userAgent = null, ipAddress = null }) {
    await db.insert(
      `INSERT INTO refresh_tokens (id, user_id, family_id, expires_at, user_agent, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, userId, familyId, expiresAt, userAgent, ipAddress],
    );
  },

  /** @returns {Promise<object|null>} the row for a jti, or null if unknown. */
  async findById(id) {
    return db.selectOne('SELECT * FROM refresh_tokens WHERE id = ? LIMIT 1', [id]);
  },

  /**
   * Claim a token for exchange.
   *
   * The `used_at IS NULL` predicate is what makes this safe against two
   * simultaneous refreshes: the loser of the race updates zero rows and is told
   * the token was already spent, rather than both callers walking away with a
   * valid pair.
   *
   * @returns {Promise<boolean>} true when this call was the one that claimed it
   */
  async markUsed(id) {
    const result = await db.update(
      `UPDATE refresh_tokens SET used_at = CURRENT_TIMESTAMP
        WHERE id = ? AND used_at IS NULL AND revoked_at IS NULL`,
      [id],
    );
    return result.affectedRows === 1;
  },

  /** Revoke every token in a family, whatever state it is in. */
  async revokeFamily(familyId) {
    const result = await db.update(
      `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP
        WHERE family_id = ? AND revoked_at IS NULL`,
      [familyId],
    );
    return result.affectedRows;
  },

  /** Revoke every token belonging to a user, e.g. on password change. */
  async revokeAllForUser(userId) {
    const result = await db.update(
      `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND revoked_at IS NULL`,
      [userId],
    );
    return result.affectedRows;
  },

  /** Drop rows that expired more than a day ago, so the table stays small. */
  async purgeExpired() {
    const result = await db.update(
      'DELETE FROM refresh_tokens WHERE expires_at < NOW() - INTERVAL 1 DAY',
    );
    return result.affectedRows;
  },
};

module.exports = { refreshTokenModel };
