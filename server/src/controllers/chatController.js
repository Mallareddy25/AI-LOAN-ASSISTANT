'use strict';

const { config } = require('../config/env');
const { logger } = require('../config/logger');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { aiService } = require('../services/aiService');
const { conversationModel, titleFromMessage } = require('../models/conversationModel');
const { messageModel } = require('../models/messageModel');
const { parsePagination, pageMeta } = require('../utils/pagination');
const { DISCLAIMER_OBJECT } = require('../utils/disclaimer');

/** Starter prompts surfaced in the chat empty state. */
const SUGGESTIONS = [
  { category: 'Repayment', label: 'What is EMI?', hint: 'The monthly payment explained' },
  { category: 'Basics', label: 'What is the difference between principal and interest?', hint: 'The two halves of every EMI' },
  { category: 'Documents', label: 'What documents are required for a home loan?', hint: 'The usual checklist' },
  { category: 'Credit', label: 'What is a credit score?', hint: 'How lenders read your credit history' },
  { category: 'Eligibility', label: 'What factors affect loan eligibility?', hint: 'The factors lenders weigh' },
  { category: 'Repayment', label: 'What happens if I miss an EMI?', hint: 'Penalties and credit impact' },
  { category: 'Basics', label: 'What is loan tenure?', hint: 'Why a shorter tenure costs less overall' },
  { category: 'Repayment', label: 'What is prepayment?', hint: 'Paying more than the EMI' },
  { category: 'Repayment', label: 'What is foreclosure?', hint: 'Closing a loan early' },
  { category: 'Eligibility', label: 'Explain the debt-to-income ratio.', hint: 'How much income is already committed' },
  { category: 'Repayment', label: 'What is an amortization schedule?', hint: 'How interest and principal shift' },
];

/**
 * GET /api/chat/suggestions — public starter prompts
 */
const getSuggestions = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      suggestions: SUGGESTIONS,
      categories: [...new Set(SUGGESTIONS.map((item) => item.category))],
    },
  });
});

/**
 * POST /api/chat
 * Body: { message, conversationId? }
 *
 * Guests may ask questions; the reply is returned but not persisted, because
 * a conversation must belong to a user. Signed-in users get persistence,
 * conversation context and titles.
 */
const postMessage = asyncHandler(async (req, res) => {
  const { message, conversationId } = req.body;
  const user = req.user || null;

  let conversation = null;

  // ── Resolve or create the conversation (authenticated users only) ──────
  if (user) {
    if (conversationId) {
      conversation = await conversationModel.findById(conversationId, user.id);
      if (!conversation) {
        throw ApiError.notFound('That conversation was not found. It may have been deleted.', {
          code: 'CONVERSATION_NOT_FOUND',
        });
      }
    } else {
      conversation = await conversationModel.create({
        userId: user.id,
        title: titleFromMessage(message, config.chat.maxTitleLength),
      });
    }
  }

  // ── Load recent history for conversational context ───────────────────
  // The current message is NOT yet persisted, so it is never duplicated here.
  let history = [];
  if (conversation) {
    const recent = await messageModel.listByConversation(
      conversation.id,
      config.chat.maxHistoryMessages,
    );
    history = recent.map((turn) => ({ role: turn.role, content: turn.content }));
  }

  // Persist the user turn before generating, so a crash mid-generation still
  // leaves a visible record of what was asked. `source` is NOT NULL in the
  // schema; for a user turn the answering engine is recorded on the next row.
  if (conversation) {
    await messageModel.create({
      conversationId: conversation.id,
      userId: user.id,
      role: 'user',
      content: message,
      source: 'openai',
    });
  }

  // ── Generate the reply ───────────────────────────────────────────────
  const result = await aiService.answer(message, history, {
    conversationId: conversation?.id,
    userId: user?.id,
  });

  if (result.degraded) {
    logger.warn('AI degraded to knowledge base', {
      userId: user?.id,
      reason: result.degradedReason,
    });
  }

  // ── Persist the assistant turn ───────────────────────────────────────
  // The created row's id is returned so the client can attach per-answer
  // feedback to *this* message rather than guessing.
  let assistantMessageId = null;
  if (conversation) {
    const saved = await messageModel.create({
      conversationId: conversation.id,
      userId: user.id,
      role: 'assistant',
      content: result.content,
      source: result.source === 'guardrail' ? 'offline_knowledge' : result.source,
      metrics: {
        promptTokens: result.usage?.promptTokens,
        completionTokens: result.usage?.completionTokens,
        latencyMs: Math.min(result.latencyMs || 0, 65535),
      },
    });
    assistantMessageId = saved?.id ?? null;
  }

  res.json({
    success: true,
    data: {
      conversationId: conversation?.id ?? null,
      messageId: assistantMessageId,
      title: conversation?.title ?? null,
      reply: result.content,
      followUps: result.followUps,
      source: result.source,
      confidence: result.confidence,
      latencyMs: result.latencyMs,
      aiConfigured: aiService.isConfigured(),
      // Tell the client to show an explicit banner when running without a key.
      offlineNotice: Boolean(result.offlineNotice),
      degraded: Boolean(result.degraded),
      degradedMessage: result.degradedMessage || null,
      guardrails: result.guardrails,
      /*
       * Risk classification for the client: category names and a severity only,
       * never the matched text. Lets the UI label a personalised or
       * rate-sensitive answer without re-running detection.
       */
      riskFlags: result.risk?.flags || [],
      riskSeverity: result.risk?.severity || 'none',
      matchedKeywords: result.matchedKeywords || null,
      disclaimer: DISCLAIMER_OBJECT,
    },
  });
});

/**
 * GET /api/chat/conversations — authenticated
 */
const listConversations = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  const { rows, total } = await conversationModel.list({
    userId: req.user.id,
    search: req.query.search,
    ...pagination,
  });

  res.json({ success: true, data: rows, pagination: pageMeta({ ...pagination, total }) });
});

/**
 * GET /api/chat/conversations/:id — authenticated, ownership enforced
 */
const getConversation = asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const conversation = await conversationModel.findById(id, req.user.id);

  if (!conversation) {
    throw ApiError.notFound('That conversation was not found.', { code: 'CONVERSATION_NOT_FOUND' });
  }

  const messages = await messageModel.listByConversation(
    conversation.id,
    config.chat.maxHistoryMessages,
  );

  res.json({ success: true, data: { conversation, messages } });
});

/**
 * PATCH /api/chat/conversations/:id — rename
 */
const renameConversation = asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const conversation = await conversationModel.rename(id, req.user.id, req.body.title);

  if (!conversation) {
    throw ApiError.notFound('That conversation was not found.', { code: 'CONVERSATION_NOT_FOUND' });
  }

  res.json({ success: true, data: conversation, message: 'Conversation renamed.' });
});

/**
 * PATCH /api/chat/conversations/:id/archive
 */
const archiveConversation = asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const conversation = await conversationModel.archive(id, req.user.id, req.body.isArchived);

  if (!conversation) {
    throw ApiError.notFound('That conversation was not found.', { code: 'CONVERSATION_NOT_FOUND' });
  }

  res.json({
    success: true,
    data: conversation,
    message: conversation.isArchived ? 'Conversation archived.' : 'Conversation restored.',
  });
});

/**
 * DELETE /api/chat/conversations/:id
 */
const deleteConversation = asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const removed = await conversationModel.remove(id, req.user.id);

  if (!removed) {
    throw ApiError.notFound('That conversation was not found.', { code: 'CONVERSATION_NOT_FOUND' });
  }

  res.json({ success: true, message: 'Conversation deleted.' });
});

/**
 * POST /api/chat/messages/:id/feedback
 * `:id` is the assistant message id. Scoped to the caller's own messages.
 */
const rateMessage = asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const message = await messageModel.findById(id, req.user.id);
  if (!message) throw ApiError.notFound('That message was not found.');
  if (message.role !== 'assistant') {
    throw ApiError.badRequest('Only assistant answers can be rated.');
  }

  await messageModel.rate(id, req.user.id, req.body.rating);
  res.json({ success: true, message: 'Thanks for the feedback.' });
});

module.exports = {
  getSuggestions,
  postMessage,
  listConversations,
  getConversation,
  renameConversation,
  archiveConversation,
  deleteConversation,
  rateMessage,
  SUGGESTIONS,
};
