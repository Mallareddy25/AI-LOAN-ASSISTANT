'use strict';

/**
 * MySQL connection pool (mysql2/promise).
 *
 * All queries in the model layer use parameterised placeholders, so user
 * input is never concatenated into SQL. This module owns connection lifecycle
 * and exposes a single `query` helper plus a health probe.
 */

const mysql = require('mysql2/promise');
const { config } = require('./env');
const { logger } = require('./logger');

let pool = null;
const poolStats = { created: 0, queries: 0, slow: 0 };

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: config.database.connectionLimit,
      queueLimit: config.database.queueLimit,
      connectTimeout: config.database.connectTimeout,
      charset: 'utf8mb4_unicode_ci',
      // DECIMAL columns arrive as strings by default. We keep NUMERIC as
      // Number only where explicitly requested, to avoid precision surprises.
      dateStrings: false,
      supportBigNumbers: true,
      bigNumberStrings: false,
      multipleStatements: false,
      namedPlaceholders: false,
    });

    logger.info('MySQL connection pool created', {
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      limit: config.database.connectionLimit,
    });
  }
  return pool;
}

/**
 * Execute a parameterised query.
 * @param {string} sql    SQL text using `?` placeholders
 * @param {Array}  params Values bound to the placeholders
 * @returns {Promise<[any, Array]>} [rows, fields]
 */
async function query(sql, params = []) {
  const started = process.hrtime.bigint();
  try {
    const [rows] = await getPool().execute(sql, params);
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
    poolStats.queries += 1;
    if (elapsedMs > 500) {
      poolStats.slow += 1;
      logger.warn('Slow SQL query', { elapsedMs: Math.round(elapsedMs), sql: sql.slice(0, 160) });
    }
    return [rows];
  } catch (error) {
    // Never log the params — they may contain user data or hashes.
    logger.error('Database query failed', {
      code: error.code,
      sql: sql.slice(0, 200),
      message: error.message,
    });
    throw error;
  }
}

/** Rows-returning helper. */
async function select(sql, params = []) {
  const [rows] = await query(sql, params);
  return Array.isArray(rows) ? rows : [];
}

/** First row or null. */
async function selectOne(sql, params = []) {
  const rows = await select(sql, params);
  return rows.length ? rows[0] : null;
}

/** Insert helper returning insertId and affectedRows. */
async function insert(sql, params = []) {
  const [result] = await query(sql, params);
  return { insertId: result.insertId, affectedRows: result.affectedRows };
}

/** UPDATE/DELETE helper returning affectedRows. */
async function update(sql, params = []) {
  const [result] = await query(sql, params);
  return { affectedRows: result.affectedRows };
}

/** Run several statements inside a single transaction. */
async function transaction(work) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      logger.error('Transaction rollback failed', { message: rollbackError.message });
    }
    throw error;
  } finally {
    connection.release();
  }
}

/** Liveness probe used by GET /api/health. */
async function healthCheck() {
  const started = Date.now();
  try {
    await select('SELECT 1 AS ok');
    return { status: 'up', latencyMs: Date.now() - started };
  } catch (error) {
    return { status: 'down', latencyMs: Date.now() - started, error: error.code || 'UNKNOWN' };
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('MySQL connection pool closed');
  }
}

/** Verify the expected tables exist — used at boot and by the test suite. */
async function assertSchema() {
  const required = [
    'users',
    'conversations',
    'messages',
    'loan_types',
    'loan_terms',
    'documents',
    'eligibility_factors',
    'faqs',
  ];
  const rows = await select(
    'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
    [config.database.database],
  );
  const present = new Set(rows.map((row) => row.name));
  const missing = required.filter((table) => !present.has(table));
  return { ok: missing.length === 0, missing, present: [...present] };
}

function getStats() {
  return { ...poolStats, hasPool: Boolean(pool) };
}

module.exports = {
  getPool,
  query,
  select,
  selectOne,
  insert,
  update,
  transaction,
  healthCheck,
  closePool,
  assertSchema,
  getStats,
};
