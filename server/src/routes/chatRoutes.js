'use strict';

const express = require('express');
const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const { authenticate, optionalAuthenticate } = require('../middleware/authenticate');
const { chatLimiter } = require('../middleware/rateLimiters');
const { config } = require('../config/env');
const controller = require('../controllers/chatController');

const router = express.Router();

/** Shared pagination + search schema for conversation queries. */
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(160).optional(),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const chatBodySchema = z.object({
  message: z
    .string({ required_error: 'Please enter a question.' })
    .trim()
    .min(2, 'Please enter a question of at least 2 characters')
    .max(
      config.chat.maxMessageLength,
      `Please keep your question under ${config.chat.maxMessageLength} characters`,
    ),
  conversationId: z.coerce.number().int().positive().optional(),
});

const renameSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').max(160),
});

const archiveSchema = z.object({
  isArchived: z.boolean(),
});

const feedbackSchema = z.object({
  rating: z.enum(['up', 'down']),
});

// ── Public ──────────────────────────────────────────────────────────────

router.get('/suggestions', asyncHandler(controller.getSuggestions));

/**
 * Guests may ask a question. `optionalAuthenticate` attaches the user when a
 * valid token is present so the conversation can be persisted, but never
 * rejects an anonymous request.
 */
router.post(
  '/',
  chatLimiter,
  optionalAuthenticate,
  validate({ body: chatBodySchema }),
  controller.postMessage,
);

// ── Authenticated ───────────────────────────────────────────────────────

router.use(authenticate);

router.get('/conversations', validate({ query: listQuerySchema }), controller.listConversations);

router.get('/conversations/:id', validate({ params: idParamSchema }), controller.getConversation);

router.patch(
  '/conversations/:id',
  validate({ params: idParamSchema, body: renameSchema }),
  controller.renameConversation,
);

router.patch(
  '/conversations/:id/archive',
  validate({ params: idParamSchema, body: archiveSchema }),
  controller.archiveConversation,
);

router.delete('/conversations/:id', validate({ params: idParamSchema }), controller.deleteConversation);

/**
 * Feedback is attached to an individual assistant answer, so the id in the
 * path is a MESSAGE id (it used to sit under `/conversations/:id/feedback`,
 * which was ambiguous because the controller never used the conversation).
 */
router.post(
  '/messages/:id/feedback',
  validate({ params: idParamSchema, body: feedbackSchema }),
  controller.rateMessage,
);

module.exports = router;
