'use strict';

const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken, extractBearerToken } = require('../services/tokenService');
const { userModel } = require('../models/userModel');

/**
 * Require a valid Bearer token.
 * Attaches `req.user = { id, email, name, role }` on success.
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    throw ApiError.unauthorized('You must be signed in to do that. Please sign in and try again.', {
      code: 'NO_TOKEN',
    });
  }

  const payload = verifyAccessToken(token);

  // Re-read the user so a deactivated account or changed role takes effect
  // immediately rather than at the next token refresh.
  const user = await userModel.findById(payload.sub);
  if (!user) {
    throw ApiError.unauthorized('Your account could not be found. Please sign in again.', {
      code: 'USER_NOT_FOUND',
    });
  }
  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated. Please contact support.', {
      code: 'ACCOUNT_INACTIVE',
    });
  }

  req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
  req.tokenPayload = payload;
  next();
});

/**
 * Attach `req.user` when a valid token is present, but never reject.
 * Used by POST /api/chat so guests can ask questions while signed-in users
 * also get their conversation persisted.
 */
const optionalAuthenticate = asyncHandler(async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
    const user = await userModel.findById(payload.sub);
    if (user && user.isActive) {
      req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
    }
  } catch {
    // An invalid or expired token simply means "treat as a guest".
  }
  next();
});

/**
 * Role gate. Must run after `authenticate`.
 * @param {...('USER'|'ADMIN')} allowedRoles
 */
const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `This action requires ${allowedRoles.join(' or ')} access. You are signed in as ${req.user.role}.`,
          { code: 'INSUFFICIENT_ROLE' },
        ),
      );
    }
    return next();
  };

module.exports = { authenticate, optionalAuthenticate, authorize };
