'use strict';

/**
 * Aggregate queries powering the admin dashboard.
 * Read-only — no user data leaves the server.
 */

const statsModel = {
  async summary() {
    const db = require('../config/db');
    const { userModel } = require('./userModel');
    const { conversationModel } = require('./conversationModel');
    const { messageModel } = require('./messageModel');
    const { loanTypeModel } = require('./loanTypeModel');
    const { termModel } = require('./termModel');
    const { documentModel } = require('./documentModel');
    const { eligibilityModel } = require('./eligibilityModel');
    const { faqModel } = require('./faqModel');

    const [
      totalUsers,
      totalConversations,
      totalMessages,
      loanTypes,
      terms,
      documents,
      eligibility,
      faqs,
    ] = await Promise.all([
      userModel.count(),
      conversationModel.count(),
      messageModel.count(),
      loanTypeModel.count(),
      termModel.count(),
      documentModel.count(),
      eligibilityModel.count(),
      faqModel.count(),
    ]);

    const knowledgeItems = terms + documents + eligibility + loanTypes + faqs;

    const [activeUsersRow, aiRow, todayRow] = await Promise.all([
      db.selectOne('SELECT COUNT(*) AS total FROM users WHERE is_active = 1'),
      // `GROUP BY source` returns one row per engine, so this needs `select`
      // rather than `selectOne`.
      db.select(
        "SELECT source, COUNT(*) AS total FROM messages WHERE role = 'assistant' GROUP BY source",
      ),
      db.selectOne(
        "SELECT COUNT(*) AS total FROM messages WHERE role = 'user' AND created_at >= CURDATE()",
      ),
    ]);

    const aiUsage = { openai: 0, offline_knowledge: 0 };
    (aiRow || []).forEach((row) => {
      aiUsage[row.source] = Number(row.total);
    });

    return {
      totalUsers,
      activeUsers: Number(activeUsersRow?.total || 0),
      totalConversations,
      totalMessages,
      totalKnowledgeItems: knowledgeItems,
      knowledgeBreakdown: { loanTypes, terms, documents, eligibility, faqs },
      aiUsage,
      questionsToday: Number(todayRow?.total || 0),
    };
  },

  /**
   * "Most asked topics" — derived from real user questions in the database by
   * mapping each question to the knowledge category whose keywords appear in
   * it. This is genuine data, not fabricated statistics.
   */
  async topTopics(limit = 8) {
    const db = require('../config/db');
    const { termModel } = require('./termModel');

    const rows = await db.select(
      `SELECT m.content, m.created_at
         FROM messages m
        WHERE m.role = 'user'
        ORDER BY m.id DESC
        LIMIT 800`,
    );

    const terms = await termModel.list({ limit: 100, page: 1, offset: 0 });

    // Build keyword -> canonical topic map from the glossary itself.
    const TOPIC_KEYWORDS = {
      EMI: ['emi', 'instalment', 'installment', 'monthly payment', 'monthly installment'],
      Interest: ['interest', 'rate of interest', 'roi', 'apr', 'reducing balance'],
      Eligibility: ['eligible', 'eligibility', 'qualify', 'approval', 'approve', 'criteria'],
      Credit: ['credit score', 'credit history', 'cibil', 'credit report'],
      Documents: ['document', 'documents', 'proof', 'pan card', 'aadhaar', 'salary slip'],
      Repayment: ['repay', 'repayment', 'miss', 'emi due', 'late payment', 'closure'],
      Prepayment: ['prepay', 'prepayment', 'foreclosure', 'part payment', 'part-prepayment'],
      'Home Loan': ['home loan', 'housing loan', 'property', 'mortgage', 'house loan'],
      'Personal Loan': ['personal loan'],
      'Education Loan': ['education loan', 'student loan', 'study loan'],
      'Vehicle Loan': ['vehicle loan', 'car loan', 'auto loan', 'bike loan'],
      'Business Loan': ['business loan', 'msme', 'working capital', 'enterprise'],
      'Gold Loan': ['gold loan'],
      Debt: ['debt', 'dti', 'debt to income', 'outstanding', 'existing loan'],
      Tenure: ['tenure', 'duration', 'how long'],
      Collateral: ['collateral', 'security', 'secured', 'unsecured'],
      Amortization: ['amortization', 'amortisation', 'schedule'],
      Moratorium: ['moratorium'],
    };

    const counts = Object.keys(TOPIC_KEYWORDS).reduce((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {});

    const matchedTerms = new Map();

    rows.forEach((row) => {
      const text = String(row.content || '').toLowerCase();
      Object.entries(TOPIC_KEYWORDS).forEach(([topic, keywords]) => {
        if (keywords.some((keyword) => text.includes(keyword))) {
          counts[topic] += 1;
          // Attribute the matched glossary term so the UI can link to it.
          const term = terms.rows.find((candidate) =>
            keywords.some((keyword) => candidate.term.toLowerCase().includes(keyword)),
          );
          if (term && !matchedTerms.has(topic)) matchedTerms.set(topic, { slug: term.slug, term: term.term });
        }
      });
    });

    return Object.entries(counts)
      .map(([topic, count]) => ({ topic, count, ...(matchedTerms.get(topic) || {}) }))
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },

  /** Daily question volume for the last `days` days. */
  async activity(days = 7) {
    const db = require('../config/db');
    const safeDays = Math.min(Math.max(1, Number(days) || 7), 90);
    const rows = await db.select(
      `SELECT DATE(created_at) AS day,
              SUM(role = 'user') AS questions,
              SUM(role = 'assistant') AS answers
         FROM messages
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
        ORDER BY day ASC`,
      [safeDays - 1],
    );
    return rows.map((row) => ({
      day: row.day,
      questions: Number(row.questions || 0),
      answers: Number(row.answers || 0),
    }));
  },

  /** Average AI response latency, used as a real operational metric. */
  async performance() {
    const db = require('../config/db');
    const row = await db.selectOne(
      `SELECT AVG(latency_ms) AS avg_latency,
              MAX(latency_ms) AS max_latency,
              AVG(prompt_tokens) AS avg_prompt_tokens,
              AVG(completion_tokens) AS avg_completion_tokens
         FROM messages
        WHERE role = 'assistant' AND latency_ms IS NOT NULL`,
    );
    return {
      averageLatencyMs: row?.avg_latency ? Math.round(Number(row.avg_latency)) : null,
      maxLatencyMs: row?.max_latency ? Math.round(Number(row.max_latency)) : null,
      averagePromptTokens: row?.avg_prompt_tokens ? Math.round(Number(row.avg_prompt_tokens)) : null,
      averageCompletionTokens: row?.avg_completion_tokens
        ? Math.round(Number(row.avg_completion_tokens))
        : null,
    };
  },
};

module.exports = { statsModel };
