'use strict';

const ApiError = require('../utils/ApiError');
const { config } = require('../config/env');
const { logger } = require('../config/logger');

/** 404 handler for unmatched API routes. */
function notFound(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} does not exist.`));
}

/**
 * Central error handler.
 *
 * Contract with the client:
 *   { success: false, error: { code, message, details?, fields? }, requestId }
 *
 * In production, unexpected errors are logged server-side and replaced with a
 * generic message. Stack traces and internal messages are NEVER sent.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  // Body-parser errors (malformed JSON, payload too large) arrive as plain Errors.
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_JSON', message: 'The request body is not valid JSON.' },
      requestId: req.id,
    });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'The request body is too large.' },
      requestId: req.id,
    });
  }

  // MySQL errors mapped to friendly, non-leaking messages.
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE', message: 'A record with these details already exists.' },
      requestId: req.id,
    });
  }
  if (error.code === 'ECONNREFUSED' || error.code === 'PROTOCOL_CONNECTION_LOST' || error.code === 'ER_ACCESS_DENIED_ERROR') {
    logger.error('Database connection error', { code: error.code, requestId: req.id });
    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message:
          'We could not reach the database. Please try again in a moment — if this continues, check your MySQL connection settings.',
      },
      requestId: req.id,
    });
  }
  if (error.code === 'ETIMEDOUT' || error.code === 'ER_LOCK_WAIT_TIMEOUT') {
    return res.status(503).json({
      success: false,
      error: { code: 'DATABASE_TIMEOUT', message: 'The request took too long. Please try again.' },
      requestId: req.id,
    });
  }

  if (error instanceof ApiError) {
    return res.status(error.status).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
        ...(error.fields ? { fields: error.fields } : {}),
      },
      requestId: req.id,
    });
  }

  // Anything unrecognised is a bug: log it fully, tell the user nothing.
  logger.error('Unhandled error', {
    requestId: req.id,
    message: error?.message,
    stack: config.isProduction ? undefined : error?.stack,
    path: req.originalUrl,
  });

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.isProduction
        ? 'Something went wrong on our side. Please try again.'
        : `Something went wrong: ${error?.message || 'Unknown error'}`,
    },
    requestId: req.id,
  });
}

module.exports = { notFound, errorHandler };
