'use strict';

const bcrypt = require('bcryptjs');
const { config } = require('../config/env');
const { logger } = require('../config/logger');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { userModel } = require('../models/userModel');
const { signTokenPair, refreshExpiryDate, verifyRefreshToken } = require('../services/tokenService');
const { refreshTokenModel } = require('../models/refreshTokenModel');
const { messageModel } = require('../models/messageModel');
const { conversationModel } = require('../models/conversationModel');

/** Generic message so the API never confirms whether an email is registered. */
const INVALID_CREDENTIALS = 'Incorrect email or password. Please try again.';

function sessionPayload(user, tokens) {
  return {
    user,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: config.auth.jwtExpiresIn,
  };
}

/**
 * Persist the refresh token that is about to be handed out, so that a later
 * exchange can tell a first use from a replay.
 */
async function trackRefreshToken(user, tokens, req) {
  await refreshTokenModel.create({
    id: tokens.jti,
    userId: user.id,
    familyId: tokens.familyId,
    expiresAt: refreshExpiryDate(),
    userAgent: req.get('user-agent')?.slice(0, 255) ?? null,
    ipAddress: req.ip ?? null,
  });
}

/**
 * POST /api/auth/register
 * Body: { name, email, password }
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const normalisedEmail = email.toLowerCase();

  if (await userModel.emailExists(normalisedEmail)) {
    throw ApiError.conflict('An account with this email already exists. Please sign in instead.', {
      code: 'EMAIL_TAKEN',
    });
  }

  // Cost 12 is deliberately slow — that is the point of a password hash.
  const passwordHash = await bcrypt.hash(password, config.auth.bcryptRounds);

  const user = await userModel.create({ name, email: normalisedEmail, passwordHash });
  if (!user) {
    throw ApiError.internal('We could not create your account. Please try again.');
  }

  await userModel.touchLastLogin(user.id);
  const tokens = signTokenPair(user);
  await trackRefreshToken(user, tokens, req);

  logger.info('User registered', { userId: user.id });

  res.status(201).json({ success: true, data: sessionPayload(user, tokens) });
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalisedEmail = email.toLowerCase();

  const row = await userModel.findByEmailWithHash(normalisedEmail);

  // Always run a comparison so a missing account and a wrong password take a
  // similar amount of time — this prevents account enumeration by timing.
  const hash = row ? row.password_hash : '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const matches = await bcrypt.compare(password, hash);

  if (!row || !matches) {
    logger.warn('Failed login attempt', { email: normalisedEmail });
    throw ApiError.unauthorized(INVALID_CREDENTIALS, { code: 'INVALID_CREDENTIALS' });
  }

  if (!row.is_active) {
    throw ApiError.forbidden('This account has been deactivated. Please contact support.', {
      code: 'ACCOUNT_INACTIVE',
    });
  }

  const user = await userModel.findById(row.id);
  await userModel.touchLastLogin(user.id);
  const tokens = signTokenPair(user);
  await trackRefreshToken(user, tokens, req);

  logger.info('User logged in', { userId: user.id, role: user.role });

  res.json({ success: true, data: sessionPayload(user, tokens) });
});

/**
 * GET /api/auth/me — requires authentication
 */
const me = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.user.id);
  const [conversationCount, messageCount] = await Promise.all([
    conversationModel.countByUser(req.user.id),
    messageModel.countByUser(req.user.id),
  ]);

  res.json({
    success: true,
    data: { ...user, stats: { conversationCount, messageCount } },
  });
});

/**
 * PATCH /api/auth/me — update display name
 */
const updateProfile = asyncHandler(async (req, res) => {
  const user = await userModel.updateProfile(req.user.id, { name: req.body.name });
  res.json({ success: true, data: user, message: 'Profile updated.' });
});

/**
 * POST /api/auth/change-password
 * Body: { currentPassword, newPassword }
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const row = await userModel.findByEmailWithHash(req.user.email);
  const matches = await bcrypt.compare(currentPassword, row.password_hash);
  if (!matches) {
    throw ApiError.unauthorized('Your current password is incorrect.', { code: 'INVALID_CREDENTIALS' });
  }

  if (await bcrypt.compare(newPassword, row.password_hash)) {
    throw ApiError.badRequest('Your new password must be different from your current password.', {
      code: 'PASSWORD_REUSED',
    });
  }

  const hash = await bcrypt.hash(newPassword, config.auth.bcryptRounds);
  await userModel.updatePassword(req.user.id, hash);

  // A password change is the usual response to a suspected compromise, so every
  // existing session has to go, including this one. The client is expected to
  // sign in again with the new password.
  const revoked = await refreshTokenModel.revokeAllForUser(req.user.id);

  logger.info('Password changed', { userId: req.user.id, sessionsRevoked: revoked });

  res.json({ success: true, message: 'Password changed successfully.' });
});

/**
 * POST /api/auth/refresh — rotate the access token
 * Body: { refreshToken }
 */
const refresh = asyncHandler(async (req, res) => {
  const payload = verifyRefreshToken(req.body.refreshToken);

  const record = payload.jti ? await refreshTokenModel.findById(payload.jti) : null;

  if (payload.jti && !record) {
    // A correctly signed token whose jti was never issued, or has been purged as
    // expired. Either way it is not ours to honour.
    throw ApiError.unauthorized('This session is no longer valid. Please sign in again.', {
      code: 'REFRESH_TOKEN_UNKNOWN',
    });
  }

  if (record?.revoked_at) {
    throw ApiError.unauthorized('This session was ended. Please sign in again.', {
      code: 'REFRESH_TOKEN_REVOKED',
    });
  }

  if (record?.used_at) {
    // Presenting a token that was already exchanged means two copies of the same
    // credential are in circulation. Assume theft: kill the whole family, which
    // also logs out whoever holds the other copy.
    const revoked = await refreshTokenModel.revokeFamily(record.family_id);
    logger.warn('refresh token replay detected; family revoked', {
      userId: record.user_id,
      familyId: record.family_id,
      revoked,
    });
    throw ApiError.unauthorized(
      'This session was ended for security reasons. Please sign in again.',
      { code: 'REFRESH_TOKEN_REUSED' },
    );
  }

  const user = await userModel.findById(payload.sub);
  if (!user) {
    throw ApiError.unauthorized('Your account could not be found. Please sign in again.');
  }
  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated.');
  }

  // Claim the old token before minting a replacement. If another request wins
  // this race it gets the reuse path above, and only one pair is ever issued.
  if (record && !(await refreshTokenModel.markUsed(record.id))) {
    throw ApiError.unauthorized('This session was ended. Please sign in again.', {
      code: 'REFRESH_TOKEN_REUSED',
    });
  }

  const tokens = signTokenPair(user, { familyId: record ? record.family_id : undefined });
  await trackRefreshToken(user, tokens, req);
  res.json({
    success: true,
    data: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
  });
});

/**
 * POST /api/auth/logout
 * JWTs are stateless, so logout is acknowledged and the client discards the
 * tokens. The short-lived access token naturally expires.
 */
const logout = asyncHandler(async (req, res) => {
  // Stateless access tokens cannot be recalled, but the refresh token can: the
  // caller's family is revoked, so a copied token is dead from this point on.
  const raw = req.body?.refreshToken;
  if (raw) {
    try {
      const payload = verifyRefreshToken(raw);
      if (payload.family) await refreshTokenModel.revokeFamily(payload.family);
    } catch {
      // An unusable token on logout is not an error worth reporting: the client
      // is throwing its copy away regardless.
    }
  }
  res.json({ success: true, message: 'Signed out successfully.' });
});

module.exports = {
  register,
  login,
  me,
  updateProfile,
  changePassword,
  refresh,
  logout,
};
