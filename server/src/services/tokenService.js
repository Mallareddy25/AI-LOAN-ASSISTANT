'use strict';

const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const ApiError = require('../utils/ApiError');

const ISSUER = config.auth.issuer;

/**
 * Issue the access + refresh pair returned at login/registration.
 * The access token carries the user identity and role for authorization.
 */
function signTokenPair(user, { familyId = crypto.randomUUID(), jti = crypto.randomUUID() } = {}) {
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn,
    issuer: ISSUER,
  });

  // The jti is the row id in `refresh_tokens`, so a valid signature is still not
  // enough to use the token: it also has to be an unspent, unrevoked row.
  const refreshToken = jwt.sign(
    { sub: user.id, type: 'refresh', jti, family: familyId },
    config.auth.jwtRefreshSecret,
    { expiresIn: config.auth.jwtRefreshExpiresIn, issuer: ISSUER },
  );

  return { accessToken, refreshToken, jti, familyId };
}

/** Decode the configured refresh lifetime as a Date, for the tracking row. */
function refreshExpiryDate() {
  // `match()[0]` is the whole match and `[1]` the first group, so the groups are
  // read by index rather than by destructuring, which would pick up "7d" and "7".
  const parsed = /^(\d+)([smhd])$/.exec(String(config.auth.jwtRefreshExpiresIn));
  const amount = parsed ? parsed[1] : '7';
  const unit = parsed ? parsed[2] : 'd';
  const ms = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit] ?? 86400000;
  return new Date(Date.now() + Number(amount) * ms);
}

/** Verify an access token, normalising every failure to 401. */
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret, { issuer: ISSUER });
    if (decoded.type === 'refresh') {
      throw ApiError.unauthorized('Invalid token type', { code: 'INVALID_TOKEN' });
    }
    return decoded;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Your session has expired. Please sign in again.', {
        code: 'TOKEN_EXPIRED',
      });
    }
    throw ApiError.unauthorized('Invalid authentication token', { code: 'INVALID_TOKEN' });
  }
}

/** Verify a refresh token. */
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, config.auth.jwtRefreshSecret, { issuer: ISSUER });
    if (decoded.type !== 'refresh') {
      throw ApiError.unauthorized('Invalid token type', { code: 'INVALID_TOKEN' });
    }
    return decoded;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Refresh token has expired. Please sign in again.', {
        code: 'REFRESH_TOKEN_EXPIRED',
      });
    }
    throw ApiError.unauthorized('Invalid refresh token', { code: 'INVALID_TOKEN' });
  }
}

/** Extract a bearer token from the Authorization header. */
function extractBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || typeof header !== 'string') return null;
  const [scheme, value] = header.split(' ');
  if (!value || scheme.toLowerCase() !== 'bearer') return null;
  return value.trim() || null;
}

module.exports = {
  signTokenPair,
  refreshExpiryDate,
  verifyAccessToken,
  verifyRefreshToken,
  extractBearerToken,
};
