'use strict';

/**
 * Knowledge retrieval for grounded answers.
 *
 * Before every model call we look up the most relevant glossary terms, loan
 * types, documents and eligibility factors in MySQL and inject them as
 * "reference material" into the system prompt. This keeps answers consistent
 * with the app's own educational content and reduces hallucination.
 *
 * A full-text search is attempted first; if the FULLTEXT index is unavailable
 * (for example a fresh database before the optimiser has run) we fall back to
 * a LIKE scan so the feature degrades instead of failing.
 */

const { cleanText, clampInt } = require('../utils/sanitize');
const { buildSystemPrompt } = require('../prompts/systemPrompt');
const { config } = require('../config/env');

/** Lazily resolve the loan-type model to avoid a circular require at load. */
function loanTypeModel() {
  // eslint-disable-next-line global-require
  return require('../models/loanTypeModel').loanTypeModel;
}

/** Stop-words removed before keyword extraction. */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'of', 'to', 'in', 'on',
  'for', 'with', 'and', 'or', 'but', 'if', 'then', 'that', 'this', 'these', 'those', 'it', 'its',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'do', 'does', 'did', 'can', 'could', 'should',
  'would', 'will', 'shall', 'may', 'might', 'what', 'which', 'who', 'whom', 'how', 'why', 'when',
  'where', 'about', 'as', 'at', 'by', 'from', 'into', 'out', 'up', 'down', 'so', 'than', 'too',
  'very', 'just', 'also', 'there', 'here', 's', 't', 'am', 'get', 'got', 'please', 'tell', 'explain',
  // Domain words too generic to discriminate between glossary entries. They
  // appear in almost every term, so including them would flatten relevance.
  'loan', 'loans', 'lender', 'lenders', 'bank', 'banks', 'borrow', 'borrowed', 'money', 'amount',
  'need', 'needs', 'want', 'give', 'know', 'mean', 'means', 'meaning', 'work', 'works', 'use',
  'used', 'using', 'take', 'taken', 'pay', 'paid', 'payment', 'payments', 'month', 'months', 'year',
  'years', 'interest', 'rate', 'credit', 'apply', 'application', 'banking',
]);

/**
 * Question intent. Used to decide WHICH knowledge collection should answer,
 * so "what documents…" reads the document checklist rather than whichever
 * glossary term happens to share a keyword.
 */
const INTENT_SIGNALS = {
  documents: [
    'document', 'documents', 'doc', 'docs', 'proof', 'proofs', 'paper', 'papers',
    'pan', 'aadhaar', 'passport', 'licence', 'license', 'slip', 'slips', 'itr',
    'form 16', 'statement', 'statements', 'deed', 'receipt', 'certificate', 'kYC',
  ],
  eligibility: [
    'eligible', 'eligibility', 'qualify', 'qualification', 'criteria', 'approved',
    'approval', 'who can', 'requirements for', 'can i get',
  ],
  // Consequences of NOT paying, and paying early, are separate concepts even
  // though both sit in the Repayment category.
  missed_payment: [
    'miss', 'missed', 'missing', 'skip', 'skipped', 'fail to pay', 'stop paying',
    'not pay', 'unable to pay', 'bounce', 'default on',
  ],
  early_payoff: [
    'prepay', 'prepayment', 'pre-paying', 'foreclos', 'foreclosure', 'pay off early',
    'close early', 'early settlement', 'part payment', 'part-prepayment', 'pay extra',
  ],
  calculator: ['emi', 'instalment', 'installment', 'monthly payment', 'how much', 'calculate'],
};

/**
 * Canonical glossary concepts for intents whose user phrasing differs from the
 * stored term name. "what happens if I miss an EMI" must surface *Loan Default*,
 * not the EMI entry — the phrase "miss" never appears in a term title.
 */
const INTENT_TERM_HINTS = {
  missed_payment: ['default', 'late', 'penalty'],
  early_payoff: ['prepayment', 'foreclosure', 'closure'],
  calculator: ['emi'],
};

/** Score added to a row whose fields match an intent hint. */
const INTENT_HINT_WEIGHT = 8;

/** Detect the question's intent. Returns the strongest match. */
function detectIntent(question) {
  const text = String(question || '').toLowerCase();
  const scores = Object.keys(INTENT_SIGNALS).map((intent) => ({
    intent,
    score: INTENT_SIGNALS[intent].filter((signal) => text.includes(signal)).length,
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores[0].score > 0 ? scores[0].intent : 'general';
}

/** Extract meaningful lowercase keywords from a question. */
function extractKeywords(question, limit = 12) {
  const words = cleanText(question, 500)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

  // Keep multi-word financial phrases intact as bonus terms.
  const phrases = [];
  const lowered = String(question).toLowerCase();
  [
    'credit score', 'debt to income', 'loan to value', 'part prepayment', 'loan closure',
    'interest rate', 'processing fee', 'home loan', 'personal loan', 'education loan',
    'vehicle loan', 'business loan', 'gold loan', 'credit history', 'late payment',
    'monthly instalment', 'monthly installment', 'income proof', 'address proof',
  ].forEach((phrase) => {
    if (lowered.includes(phrase)) phrases.push(phrase);
  });

  const seen = new Set();
  const keywords = [];
  [...phrases, ...words].forEach((word) => {
    if (!seen.has(word)) {
      seen.add(word);
      keywords.push(word);
    }
  });

  return keywords.slice(0, limit);
}

/**
 * Score a candidate row against the keyword list.
 *
 * Field weights make the *title* of a glossary entry matter far more than a
 * passing mention in its body, which is what stops "what documents do I need
 * for a home loan" from matching an unrelated term that happens to contain
 * the word "loan".
 *
 * @param {object} row
 * @param {string[]} keywords
 * @param {Array<[string, number]>} weightedFields  [fieldName, weight]
 */
function scoreRow(row, keywords, weightedFields) {
  let score = 0;
  const lowered = keywords.map((keyword) => keyword.toLowerCase());

  weightedFields.forEach(([fieldName, weight]) => {
    const value = String(row[fieldName] || '').toLowerCase().trim();
    if (!value) return;
    lowered.forEach((keyword) => {
      if (value === keyword) score += weight * 2.5;
      // Prefix matching must only apply on a meaningful field length, otherwise
      // a terse field would match on its first character alone.
      else if (value.length >= 4 && (value.startsWith(keyword) || keyword.startsWith(value))) {
        score += weight * 1.5;
      } else if (value.includes(keyword)) score += weight;
    });
  });

  return score;
}

/** Standard weighting per entity type — title/label dominates. */
const TERM_FIELDS = [
  ['term', 6],
  ['short_definition', 2],
  ['detailed_explanation', 1],
  ['example', 1],
];
const DOCUMENT_FIELDS = [
  ['title', 6],
  ['description', 2],
  ['category', 1.5],
];
const ELIGIBILITY_FIELDS = [
  ['factor', 6],
  ['summary', 2],
  ['explanation', 1],
  ['category', 1.5],
];

const knowledgeService = {
  extractKeywords,
  detectIntent,

  /**
   * Retrieve reference material for a question.
   *
   * Every collection is searched so the offline engine can choose the best
   * answer, but `intent` decides which one wins when several match.
   *
   * @returns {Promise<{intent, keywords, terms, loanTypes, documents, eligibility, context}>}
   */
  async retrieve(question, options = {}) {
    const limit = clampInt(options.limit, { min: 2, max: 8, fallback: 4 });
    const keywords = extractKeywords(question);
    const intent = detectIntent(question);
    const lowered = String(question || '').toLowerCase();

    // A keyword search with zero hits is a waste of a round trip.
    if (!keywords.length) {
      return {
        intent,
        keywords: [],
        terms: [],
        loanTypes: [],
        documents: [],
        eligibility: [],
        context: '',
      };
    }

    const [terms, loanTypes, documents, eligibility] = await Promise.all([
      knowledgeService.searchTerms(keywords, limit, intent),
      knowledgeService.searchLoanTypes(lowered, limit),
      knowledgeService.searchDocuments(keywords, options.documentLimit || 8),
      knowledgeService.searchEligibility(keywords, options.eligibilityLimit || 8),
    ]);

    // For an explicit documents/eligibility question, load the authoritative
    // list for that intent rather than relying on keyword overlap.
    if (intent === 'documents') {
      const primaryLoan = loanTypes[0];
      if (primaryLoan) {
        const detailed = await loanTypeModel().findDetailed(primaryLoan.slug);
        if (detailed && detailed.documents.length) {
          return {
            intent,
            keywords,
            terms,
            loanTypes,
            documents: detailed.documents,
            documentSet: 'loan-specific',
            eligibility,
            context: knowledgeService.formatContext(
              { terms, loanTypes, documents: detailed.documents, eligibility },
              config.ai.kbContextLimit,
            ),
          };
        }
      }
    }

    if (intent === 'eligibility') {
      const core = await knowledgeService.allEligibility();
      if (core.length) {
        return {
          intent,
          keywords,
          terms,
          loanTypes,
          documents,
          eligibility: core,
          eligibilitySet: 'full',
          context: knowledgeService.formatContext(
            { terms, loanTypes, documents, eligibility: core },
            config.ai.kbContextLimit,
          ),
        };
      }
    }

    const context = knowledgeService.formatContext(
      { terms, loanTypes, documents, eligibility },
      options.contextLimit,
    );

    return { intent, keywords, terms, loanTypes, documents, eligibility, context };
  },

  async searchTerms(keywords, limit, intent) {
    const db = require('../config/db');
    // Over-fetch, then rank in JS so multi-keyword relevance beats a single LIKE.
    const rows = await db.select(
      `SELECT id, slug, term, category, short_definition, detailed_explanation, example
         FROM loan_terms
        LIMIT 300`,
    );

    // Intent hints let us recognise a concept by how users ask for it.
    const hints = (INTENT_TERM_HINTS[intent] || []).map((hint) => hint.toLowerCase());
    const hintFields = [['term', 1], ['short_definition', 0.4], ['detailed_explanation', 0.2], ['example', 0.2]];

    return rows
      .map((row) => {
        const base = scoreRow(row, keywords, TERM_FIELDS);
        const hint = hints.length ? scoreRow(row, hints, hintFields) * INTENT_HINT_WEIGHT : 0;
        return { row, score: base + Math.round(hint) };
      })
      .filter((entry) => entry.score >= 6) // title-level match only
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.row);
  },

  async searchLoanTypes(questionLower, limit) {
    const db = require('../config/db');
    const rows = await db.select(
      'SELECT id, slug, name, what_it_is, interest_concept, rate_note FROM loan_types WHERE is_active = 1 LIMIT 50',
    );
    return rows
      .filter((row) => {
        const name = row.name.toLowerCase();
        return questionLower.includes(name) || questionLower.includes(row.slug);
      })
      .slice(0, limit);
  },

  async searchDocuments(keywords, limit) {
    const db = require('../config/db');
    const rows = await db.select(
      'SELECT id, title, category, description FROM documents LIMIT 100',
    );
    return rows
      .map((row) => ({ row, score: scoreRow(row, keywords, DOCUMENT_FIELDS) }))
      .filter((entry) => entry.score >= 6)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.row);
  },

  async searchEligibility(keywords, limit) {
    const db = require('../config/db');
    const rows = await db.select(
      'SELECT id, factor, category, summary, explanation, impact, typical_consideration, example FROM eligibility_factors LIMIT 60',
    );
    return rows
      .map((row) => ({ row, score: scoreRow(row, keywords, ELIGIBILITY_FIELDS) }))
      .filter((entry) => entry.score >= 6)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.row);
  },

  /** All eligibility factors ordered by impact — used for eligibility intent. */
  async allEligibility() {
    const db = require('../config/db');
    return db.select(
      `SELECT id, factor, category, summary, explanation, impact, typical_consideration, example
         FROM eligibility_factors
        ORDER BY FIELD(impact, 'high', 'medium', 'low'), sort_order ASC`,
    );
  },

  /** Core (required) documents grouped by category — used for document intent. */
  async coreDocuments() {
    const db = require('../config/db');
    return db.select(
      `SELECT id, title, category, description, why_needed
         FROM documents
        WHERE is_required = 1
        ORDER BY category ASC, sort_order ASC`,
    );
  },

  /** Render retrieved rows into the reference block of the system prompt. */
  formatContext({ terms = [], loanTypes = [], documents = [], eligibility = [] }, limit = 4000) {
    const blocks = [];

    if (terms.length) {
      blocks.push(
        [
          'GLOSSARY REFERENCE:',
          ...terms.map(
            (term) =>
              `- ${term.term}: ${term.short_definition}${
                term.example ? ` Example: ${term.example}` : ''
              }`,
          ),
        ].join('\n'),
      );
    }

    if (loanTypes.length) {
      blocks.push(
        [
          'LOAN TYPE REFERENCE:',
          ...loanTypes.map(
            (loan) => `- ${loan.name}: ${loan.what_it_is} ${loan.interest_concept || ''}`,
          ),
        ].join('\n'),
      );
    }

    if (documents.length) {
      blocks.push(
        ['DOCUMENT REFERENCE:', ...documents.map((doc) => `- ${doc.title} (${doc.category}): ${doc.description}`)].join(
          '\n',
        ),
      );
    }

    if (eligibility.length) {
      blocks.push(
        [
          'ELIGIBILITY REFERENCE:',
          ...eligibility.map((factor) => `- ${factor.factor} (${factor.category}): ${factor.summary}`),
        ].join('\n'),
      );
    }

    return blocks.join('\n\n').slice(0, limit);
  },

  /** Build the final system prompt for one request. */
  buildPromptFor(question, retrieval) {
    const loanTypeContext = (retrieval.loanTypes || [])
      .map((loan) => `The user is asking about ${loan.name}. ${loan.what_it_is}`)
      .join('\n');

    return buildSystemPrompt({
      retrievedContext: retrieval.context || '',
      loanTypeContext,
      today: new Date().toISOString().slice(0, 10),
    });
  },
};

module.exports = {
  knowledgeService,
  extractKeywords,
  detectIntent,
  scoreRow,
  STOP_WORDS,
  INTENT_SIGNALS,
  INTENT_TERM_HINTS,
  TERM_FIELDS,
  DOCUMENT_FIELDS,
  ELIGIBILITY_FIELDS,
};
