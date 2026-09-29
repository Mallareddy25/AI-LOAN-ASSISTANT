'use strict';

const rateLimit = require('express-rate-limit');
const { config } = require('../config/env');
const ApiError = require('../utils/ApiError');

/** Shared handler so every limiter responds with the standard error shape. */
function handler(message) {
  return (req, res, next) => {
    next(ApiError.tooManyRequests(message));
  };
}

/** Rate limiter applied to the whole /api surface. */
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  handler: handler('Too many requests from this device. Please slow down and try again shortly.'),
});

/** Strict limiter for credential endpoints to slow down brute-force attempts. */
const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => config.isTest,
  handler: handler('Too many sign-in attempts. Please wait a few minutes before trying again.'),
});

/** Limiter for the AI endpoint — protects both the OpenAI budget and the DB. */
const chatLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.chatMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  handler: handler(
    'You have asked a lot of questions in a short time. Please wait a few minutes before asking more.',
  ),
});

/** Limiter for write-heavy admin endpoints. */
const writeLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  handler: handler('Too many write operations in a short period. Please slow down.'),
});

module.exports = { globalLimiter, authLimiter, chatLimiter, writeLimiter };
