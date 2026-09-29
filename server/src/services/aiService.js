'use strict';

/**
 * AI SERVICE — the only module in the codebase that talks to OpenAI.
 *
 * Responsibilities
 *   • Lazily construct the OpenAI client from the server-side API key
 *   • Retrieve grounding context from the MySQL knowledge base
 *   • Call the Chat Completions API with retries, timeout and token budget
 *   • Fall back to the offline knowledge engine when no key is configured
 *   • Run the response through the output guardrails before returning
 *   • Return usage metrics for observability
 *
 * The frontend NEVER calls OpenAI. The key is read from `config/env.js`, which
 * loads the server `.env`, and is not exposed on any API response.
 */

const OpenAI = require('openai');
const { config } = require('../config/env');
const { logger } = require('../config/logger');
const { knowledgeService } = require('./knowledgeService');
const { offlineEngine } = require('./offlineEngine');
const { screenUserMessage, sanitizeAssistantReply, requiresHardRefusal } = require('./guardrailService');
const { CREDENTIAL_REFUSAL } = require('./guardrailService');
const { DISCLAIMER_OBJECT } = require('../utils/disclaimer');

let client = null;

/** Lazily build the client. Returns null when no API key is configured. */
function getClient() {
  if (!config.ai.isConfigured) return null;
  if (client) return client;

  client = new OpenAI({
    apiKey: config.ai.apiKey,
    timeout: config.ai.timeoutMs,
    maxRetries: config.ai.maxRetries,
    // Keep the key on the server: no dangerouslyAllowBrowser flag is set.
  });

  logger.info('OpenAI client initialised', { model: config.ai.model });
  return client;
}

/** Map OpenAI SDK errors onto friendly, non-leaking messages. */
function mapOpenAIError(error) {
  const status = error?.status || error?.response?.status;

  if (status === 401) {
    return {
      code: 'AI_AUTH_FAILED',
      message:
        'The AI service rejected the configured API key. Please check OPENAI_API_KEY in your server .env file.',
    };
  }
  if (status === 429) {
    return {
      code: 'AI_RATE_LIMITED',
      message:
        'The AI service is temporarily rate limited. Please wait a moment and try again, or use the knowledge modules in the meantime.',
    };
  }
  if (status === 400) {
    return {
      code: 'AI_BAD_REQUEST',
      message: 'The AI service could not process this request. Please rephrase your question.',
    };
  }
  if (error?.code === 'ECONNABORTED' || error?.name === 'APIConnectionTimeoutError') {
    return {
      code: 'AI_TIMEOUT',
      message: 'The AI service took too long to respond. Please try again.',
    };
  }
  if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
    return {
      code: 'AI_UNREACHABLE',
      message: 'Could not reach the AI service. Please check your network connection.',
    };
  }
  return {
    code: 'AI_ERROR',
    message: 'The AI assistant is temporarily unavailable. You can still browse the knowledge modules.',
  };
}

const aiService = {
  /** Whether a real model is available. Surfaced on /api/health. */
  isConfigured: () => config.ai.isConfigured,
  getModel: () => config.ai.model,

  /**
   * Main entry point.
   *
   * @param {string} question          User message (already length-validated)
   * @param {Array}  history           [{ role, content }] oldest-first
   * @param {object} [options]
   * @param {string} [options.conversationId]
   * @param {number} [options.userId]
   * @returns {Promise<{content, source, confidence, followUps, risk, guardrails, usage, latencyMs, disclaimer}>}
   */
  async answer(question, history = [], options = {}) {
    const startedAt = Date.now();
    // Traced so a stored conversation can be tied back to a specific answer.
    logger.debug('answer requested', {
      conversationId: options.conversationId ?? null,
      userId: options.userId ?? null,
      historyLength: history.length,
    });

    // ── Layer 1: pre-flight safety screen ────────────────────────────────
    const screen = screenUserMessage(question);
    if (!screen.ok || requiresHardRefusal(screen.risk)) {
      return {
        content: CREDENTIAL_REFUSAL,
        source: 'guardrail',
        confidence: 'high',
        followUps: [
          'What is an EMI?',
          'What documents are required for a home loan?',
          'What is the difference between principal and interest?',
        ],
        risk: screen.risk,
        guardrails: ['credential_request_blocked'],
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        latencyMs: Date.now() - startedAt,
        disclaimer: DISCLAIMER_OBJECT,
      };
    }

    // ── Layer 2: retrieve grounding context ──────────────────────────────
    let retrieval = { keywords: [], terms: [], loanTypes: [], documents: [], eligibility: [], context: '' };
    let retrievalError = null;
    try {
      retrieval = await knowledgeService.retrieve(question);
    } catch (error) {
      // A knowledge-base outage must not take the chat down.
      retrievalError = error.message;
      logger.error('Knowledge retrieval failed; continuing without grounding', {
        message: error.message,
      });
    }

    // ── Layer 3: generate ───────────────────────────────────────────────
    const clientInstance = getClient();

    if (!clientInstance) {
      // No key configured → deterministic, database-backed answer.
      try {
        const offline = await offlineEngine.answer(question, retrieval, history);
        const sanitized = sanitizeAssistantReply(offline.content, screen.risk);
        return {
          content: sanitized.text,
          source: 'offline_knowledge',
          confidence: offline.confidence,
          followUps: aiService.buildFollowUps(question, retrieval, offline.loanType),
          risk: screen.risk,
          guardrails: sanitized.applied,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          latencyMs: Date.now() - startedAt,
          offlineNotice: true,
          matchedTerms: offline.matchedTerms,
          disclaimer: DISCLAIMER_OBJECT,
        };
      } catch (error) {
        logger.error('Offline engine failed', { message: error.message });
        throw Object.assign(
          new Error('The knowledge base is currently unavailable. Please try again shortly.'),
          { code: 'KNOWLEDGE_UNAVAILABLE' },
        );
      }
    }

    const systemPrompt = knowledgeService.buildPromptFor(question, retrieval);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...aiService.trimHistory(history),
      { role: 'user', content: question },
    ];

    try {
      const completion = await clientInstance.chat.completions.create(
        {
          model: config.ai.model,
          messages,
          temperature: config.ai.temperature,
          max_tokens: config.ai.maxTokens,
          top_p: 0.9,
        },
        { timeout: config.ai.timeoutMs },
      );

      const raw = completion.choices?.[0]?.message?.content || '';
      const sanitized = sanitizeAssistantReply(raw, screen.risk);
      const usage = completion.usage || {};

      return {
        content: sanitized.text,
        source: 'openai',
        confidence: 'high',
        finishReason: completion.choices?.[0]?.finish_reason || 'stop',
        followUps: aiService.buildFollowUps(question, retrieval),
        risk: screen.risk,
        guardrails: sanitized.applied,
        usage: {
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0,
        },
        latencyMs: Date.now() - startedAt,
        model: config.ai.model,
        grounded: Boolean(retrieval.context),
        disclaimer: DISCLAIMER_OBJECT,
        ...(retrievalError ? { retrievalWarning: 'grounding_unavailable' } : {}),
      };
    } catch (error) {
      const mapped = mapOpenAIError(error);
      logger.error('OpenAI request failed', {
        code: mapped.code,
        status: error?.status,
        message: error?.message,
      });

      // Degrade gracefully: answer from the knowledge base instead of failing.
      try {
        const offline = await offlineEngine.answer(question, retrieval, history);
        const sanitized = sanitizeAssistantReply(offline.content, screen.risk);
        return {
          content: sanitized.text,
          source: 'offline_knowledge',
          confidence: offline.confidence,
          followUps: aiService.buildFollowUps(question, retrieval, offline.loanType),
          risk: screen.risk,
          guardrails: [...sanitized.applied, 'ai_degraded_to_knowledge_base'],
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          latencyMs: Date.now() - startedAt,
          degraded: true,
          degradedReason: mapped.code,
          degradedMessage: mapped.message,
          disclaimer: DISCLAIMER_OBJECT,
        };
      } catch (fallbackError) {
        throw Object.assign(new Error(mapped.message), { code: mapped.code });
      }
    }
  },

  /** Cap history length so the prompt stays inside the token budget. */
  trimHistory(history) {
    const turns = (history || [])
      .filter((turn) => turn && (turn.role === 'user' || turn.role === 'assistant') && turn.content)
      .slice(-config.chat.maxHistoryMessages);

    const recent = turns.slice(-config.ai.contextTurns);
    if (recent.length === turns.length) return recent;

    // Older turns are dropped, but tell the model so it does not assume a gap
    // in the conversation is a topic change.
    return [{ role: 'system', content: 'Earlier conversation turns were trimmed for length.' }, ...recent];
  },

  /**
   * Generate relevant follow-up suggestions. Sourced from the actual retrieved
   * glossary terms and loan types, so suggestions always point at real content.
   */
  buildFollowUps(question, retrieval = {}, loanTypeSlug = null) {
    const suggestions = [];
    const seen = new Set();

    const push = (label) => {
      const clean = String(label).replace(/\*\*/g, '').trim();
      if (!clean || seen.has(clean) || clean.length > 80) return;
      seen.add(clean);
      suggestions.push(clean);
    };

    (retrieval.terms || []).slice(1, 4).forEach((term) => {
      push(`What is ${term.term}?`);
    });

    (retrieval.loanTypes || []).slice(0, 2).forEach((loan) => {
      push(`What documents are needed for a ${loan.name.toLowerCase()}?`);
    });

    if (loanTypeSlug) {
      const loan = (retrieval.loanTypes || []).find((item) => item.slug === loanTypeSlug);
      if (loan) push(`What is the tenure concept for ${loan.name.toLowerCase()}?`);
    }

    if ((retrieval.eligibility || []).length) {
      push('What factors affect loan eligibility?');
    }

    if (!suggestions.length) {
      [
        'What is EMI?',
        'What is the difference between principal and interest?',
        'What happens if I miss an EMI?',
        'What documents are required for a home loan?',
        'What is prepayment?',
      ].forEach(push);
    }

    return suggestions.slice(0, 4);
  },
};

module.exports = { aiService, mapOpenAIError };
