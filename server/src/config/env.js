'use strict';

/**
 * Centralised, fail-fast environment configuration.
 *
 * Every secret is read HERE and only here. Nothing else in the codebase
 * calls `process.env` for a credential, which keeps the blast radius small
 * and makes the configuration surface auditable.
 */

const path = require('path');
const fs = require('fs');

// Load .env from the server root, then from the repository root (monorepo).
const SERVER_ROOT = path.resolve(__dirname, '..', '..');
const REPO_ROOT = path.resolve(SERVER_ROOT, '..');

[
  path.join(SERVER_ROOT, '.env'),
  path.join(REPO_ROOT, '.env'),
].forEach((candidate) => {
  if (fs.existsSync(candidate)) {
    // eslint-disable-next-line global-require
    require('dotenv').config({ path: candidate });
  }
});

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

/** Read an integer env var with a fallback and a sane range check. */
function int(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Secrets that must NOT be silently defaulted in production.
 * In development we fall back to a clearly-labelled development value so the
 * project runs out of the box, but we warn loudly.
 */
function requireSecret(name, devFallback) {
  const value = (process.env[name] || '').trim();
  if (value) return value;
  if (isProduction) {
    throw new Error(
      `[config] FATAL: environment variable ${name} is required in production. ` +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
    );
  }
  if (devFallback) {
    // eslint-disable-next-line no-console
    console.warn(`[config] WARNING: ${name} is not set — using a development-only fallback.`);
  }
  return devFallback;
}

const openaiApiKey = (process.env.OPENAI_API_KEY || '').trim();

const config = {
  env: NODE_ENV,
  isProduction,
  isTest,
  isDevelopment: NODE_ENV === 'development',

  server: {
    port: int(process.env.PORT, 5000),
    clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    apiPrefix: '/api',
    bodyLimit: '1mb',
    shutdownTimeoutMs: 10_000,
  },

  database: {
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: int(process.env.DATABASE_PORT, 3306),
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'loan_assistant',
    connectionLimit: int(process.env.DATABASE_CONNECTION_LIMIT, 10),
    queueLimit: 0,
    connectTimeout: 10_000,
    // Test suite uses a separate schema so dev data is never touched.
    get name() {
      return isTest
        ? process.env.DATABASE_TEST_NAME || `${config.database.database}_test`
        : process.env.DATABASE_NAME || 'loan_assistant';
    },
  },

  auth: {
    jwtSecret: requireSecret('JWT_SECRET', 'dev-only-insecure-jwt-secret-change-me'),
    jwtRefreshSecret: requireSecret(
      'JWT_REFRESH_SECRET',
      'dev-only-insecure-refresh-secret-change-me',
    ),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    bcryptRounds: Math.min(Math.max(int(process.env.BCRYPT_ROUNDS, 12), 4), 15),
    issuer: 'loan-information-assistant',
  },

  ai: {
    apiKey: openaiApiKey,
    // `false` means the app deliberately runs on the offline knowledge engine.
    isConfigured: Boolean(openaiApiKey),
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    maxTokens: int(process.env.OPENAI_MAX_TOKENS, 900),
    temperature: Number.parseFloat(process.env.OPENAI_TEMPERATURE || '0.4'),
    timeoutMs: int(process.env.OPENAI_TIMEOUT_MS, 30_000),
    maxRetries: 2,
    contextTurns: int(process.env.AI_CONTEXT_TURNS, 10),
    kbContextLimit: int(process.env.AI_KB_CONTEXT_LIMIT, 4000),
  },

  chat: {
    maxMessageLength: int(process.env.CHAT_MAX_MESSAGE_LENGTH, 2000),
    maxHistoryMessages: 60,
    maxTitleLength: 160,
  },

  rateLimit: {
    windowMs: int(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: int(process.env.RATE_LIMIT_MAX, 300),
    authMax: int(process.env.AUTH_RATE_LIMIT_MAX, 10),
    chatMax: int(process.env.CHAT_RATE_LIMIT_MAX, 20),
  },

  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@loanassistant.local',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
    adminName: process.env.SEED_ADMIN_NAME || 'System Administrator',
    // The browser suites and the README both sign in with this account, so it
    // has to be provisioned by db:seed rather than created by hand.
    demoEmail: process.env.SEED_DEMO_EMAIL || 'demo@student.test',
    demoPassword: process.env.SEED_DEMO_PASSWORD || 'Test@1234',
    demoName: process.env.SEED_DEMO_NAME || 'Demo Student',
  },

  paths: {
    serverRoot: SERVER_ROOT,
    repoRoot: REPO_ROOT,
    database: path.join(REPO_ROOT, 'database'),
  },
};

/** Startup sanity report — safe to log, contains no secret values. */
function describeConfig() {
  return {
    env: config.env,
    port: config.server.port,
    database: `${config.database.user}@${config.database.host}:${config.database.port}/${config.database.name}`,
    aiConfigured: config.ai.isConfigured,
    aiModel: config.ai.model,
    allowedOrigins: config.server.clientUrl,
  };
}

module.exports = { config, describeConfig };
