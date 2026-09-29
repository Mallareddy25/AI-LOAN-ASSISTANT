'use strict';

const express = require('express');
const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/authenticate');
const { authLimiter } = require('../middleware/rateLimiters');
const controller = require('../controllers/authController');

const router = express.Router();

// ── Schemas ─────────────────────────────────────────────────────────────
// Password policy: 8-72 chars (bcrypt truncates beyond 72 bytes) with at
// least one letter and one number. Deliberately not over-engineered.
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(72, 'Password must be at most 72 characters long')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/\d/, 'Password must contain at least one number');

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, 'Please enter a valid email address')
  .max(190, 'Email address is too long')
  .email('Please enter a valid email address');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120, 'Name is too long'),
  email: emailSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  // No complexity rules on login — the stored hash is the authority.
  password: z.string().min(1, 'Please enter your password').max(72),
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120, 'Name is too long'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Please enter your current password').max(72),
  newPassword: passwordSchema,
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10, 'A refresh token is required'),
});

// ── Routes ──────────────────────────────────────────────────────────────

router.post('/register', authLimiter, validate({ body: registerSchema }), controller.register);

router.post('/login', authLimiter, validate({ body: loginSchema }), controller.login);

router.get('/me', authenticate, controller.me);

router.patch('/me', authenticate, validate({ body: updateProfileSchema }), controller.updateProfile);

router.post(
  '/change-password',
  authenticate,
  authLimiter,
  validate({ body: changePasswordSchema }),
  controller.changePassword,
);

router.post('/refresh', validate({ body: refreshSchema }), controller.refresh);

router.post('/logout', asyncHandler(controller.logout));

module.exports = router;
