'use strict';

/**
 * Structured logger with automatic secret redaction.
 *
 * Any key that looks like a credential is replaced with `[REDACTED]` before
 * the record is emitted, so a stray `logger.info({ body })` can never leak a
 * password or an API key into the log stream.
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const SECRET_KEY_PATTERN =
  /(pass(word|wd)?|secret|token|api[-_]?key|authorization|auth|credential|cookie|otp|pin|cvv|hash)/i;

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 6;

function redact(value, depth = 0) {
  if (depth > MAX_DEPTH) return '[Truncated]';
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redact(item, depth + 1));
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return `[Buffer ${value.length}b]`;
  if (typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = SECRET_KEY_PATTERN.test(key) ? REDACTED : redact(val, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > 2000) {
    return `${value.slice(0, 2000)}…[${value.length} chars]`;
  }
  return value;
}

const COLORS = {
  error: '\x1b[31m',
  warn: '\x1b[33m',
  info: '\x1b[36m',
  debug: '\x1b[90m',
};
const RESET = '\x1b[0m';

function createLogger(levelName = 'info') {
  const threshold = LEVELS[levelName] ?? LEVELS.info;
  const useColor = process.stdout.isTTY && process.env.NO_COLOR !== '1';

  function emit(level, args) {
    if (LEVELS[level] > threshold) return;
    const payload = args.map((arg) => redact(arg));
    const tag = level.toUpperCase().padEnd(5);
    const head = useColor ? `${COLORS[level]}${tag}${RESET}` : tag;
    const stream = level === 'error' ? console.error : console.log;
    stream(`[${new Date().toISOString()}] ${head}`, ...payload);
  }

  return {
    error: (...args) => emit('error', args),
    warn: (...args) => emit('warn', args),
    info: (...args) => emit('info', args),
    debug: (...args) => emit('debug', args),
    child(bindings) {
      const parent = this;
      return {
        error: (...args) => parent.error(bindings, ...args),
        warn: (...args) => parent.warn(bindings, ...args),
        info: (...args) => parent.info(bindings, ...args),
        debug: (...args) => parent.debug(bindings, ...args),
      };
    },
  };
}

const logger = createLogger(
  process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'error' : 'info'),
);

module.exports = { logger, createLogger, redact, SECRET_KEY_PATTERN };
