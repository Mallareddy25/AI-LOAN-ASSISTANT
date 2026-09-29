'use strict';

const { logger } = require('../config/logger');

/**
 * Assigns a request id and logs method, path, status and duration.
 * The morgan stream in app.js is the primary access log; this adds the
 * request id so an error can be traced back to the exact request.
 */
function requestLogger(req, res, next) {
  req.id = req.headers['x-request-id'] || `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  res.setHeader('X-Request-Id', req.id);

  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const meta = {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durationMs: Math.round(durationMs),
    };

    if (res.statusCode >= 500) logger.error('Request failed', meta);
    else if (res.statusCode >= 400) logger.warn('Request rejected', meta);
    else logger.info('Request', meta);
  });

  next();
}

module.exports = { requestLogger };
