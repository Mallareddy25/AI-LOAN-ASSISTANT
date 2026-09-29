'use strict';

/**
 * OFFLINE KNOWLEDGE ENGINE
 *
 * When `OPENAI_API_KEY` is not configured, the application must still be fully
 * demonstrable. This engine answers questions deterministically from the
 * MySQL knowledge base — glossary terms, loan types, documents and eligibility
 * factors — composing a structured, beginner-friendly markdown reply.
 *
 * It is intentionally conservative: it only ever states content that exists in
 * the database, it never fabricates lender-specific rates, and it routes every
 * personalised question to the disclaimer.
 */

const { knowledgeService } = require('./knowledgeService');
const { SHORT_DISCLAIMER, RATE_NOTE } = require('../utils/disclaimer');

/** Question openers mapped to a friendly structural cue. */
const ACKNOWLEDGEMENTS = [
  'Here is a simple explanation.',
  'Let me break this down.',
  'Good question — here is the basic idea.',
  'This is one of the concepts students ask about most often.',
];

function pick(list, seed = 0) {
  return list[Math.abs(seed) % list.length];
}

function seedFrom(text) {
  return String(text)
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

/** Terms that always deserve a definition in a glossary answer. */
function renderTerm(term) {
  const lines = [`**${term.term}**`, '', term.detailed_explanation];

  if (term.example) {
    lines.push('', '**Example**', term.example);
  }

  if (term.why_it_matters) {
    lines.push('', `**Why it matters** — ${term.why_it_matters}`);
  }

  if (term.related_terms) {
    let related = term.related_terms;
    try {
      related = JSON.parse(term.related_terms);
    } catch {
      related = String(term.related_terms)
        .split(',')
        .map((item) => item.trim());
    }
    if (Array.isArray(related) && related.length) {
      lines.push('', `**Related terms** — ${related.join(', ')}`);
    }
  }

  return lines.join('\n');
}

const offlineEngine = {
  isAvailable: true,

  /**
   * Answer a documents question.
   * Prefers the checklist for the specific loan type the user named, grouped
   * by category so it reads like a real checklist.
   */
  async answerDocuments(question, retrieval, opener) {
    const { loanTypeModel } = require('../models/loanTypeModel');
    const primaryLoan = (retrieval.loanTypes || [])[0];

    let documents = [];
    let loan = null;
    let scopeNote = '';

    if (primaryLoan) {
      loan = await loanTypeModel.findDetailed(primaryLoan.slug);
      if (loan && loan.documents.length) {
        documents = loan.documents.map((doc) => ({
          title: doc.title,
          category: doc.category,
          description: doc.description,
          isCore: doc.isCore,
        }));
        scopeNote = `Here is the checklist most commonly asked for with a **${loan.name}**.`;
      }
    }

    if (!documents.length) {
      documents = await knowledgeService.coreDocuments();
      documents = documents.map((doc) => ({
        title: doc.title,
        category: doc.category,
        description: doc.description,
        isCore: true,
      }));
      scopeNote =
        'Here are the documents lenders most commonly ask for. The exact list changes with the loan type and your profile.';
    }

    // Group by category for readability.
    const groups = new Map();
    documents.forEach((doc) => {
      if (!groups.has(doc.category)) groups.set(doc.category, []);
      groups.get(doc.category).push(doc);
    });

    const parts = ['### Documents you will usually be asked for', '', scopeNote];
    groups.forEach((items, category) => {
      parts.push('', `**${category}**`);
      items.forEach((doc) => {
        const marker = doc.isCore === false ? '_(if applicable)_' : '';
        parts.push(`- **${doc.title}**${marker} — ${doc.description}`);
      });
    });

    parts.push(
      '',
      '**A few practical tips**',
      '- Keep one folder of clean digital copies (PDF or JPG) of everything, ready to upload.',
      '- The name on your PAN and Aadhaar should match your other documents.',
      '- Bank statements are usually downloaded from net banking, not photographed.',
      '- Ask the lender for the exact list before you start collecting, so you do not have to resubmit.',
      '',
      '> Required documents vary by lender, applicant profile, and loan type. Always confirm the current list with the lender before you apply.',
      '',
      '[Open the full document checklist](/documents)',
    );

    return {
      content: `${opener}\n\n${parts.join('\n')}`,
      source: 'offline_knowledge',
      confidence: 'high',
      matchedTerms: 0,
      loanType: loan ? loan.slug : null,
      strategy: 'documents',
    };
  },

  /**
   * Answer an eligibility question. Explicitly framed as an explainer, never
   * as a decision about the user.
   */
  async answerEligibility(question, retrieval, opener) {
    const factors = retrieval.eligibility && retrieval.eligibility.length
      ? retrieval.eligibility
      : await knowledgeService.allEligibility();

    if (!factors.length) return null;

    const high = factors.filter((factor) => factor.impact === 'high');
    const others = factors.filter((factor) => factor.impact !== 'high');
    const ordered = [...high, ...others].slice(0, 8);

    const parts = [
      '### How loan eligibility is generally assessed',
      '',
      'Lenders do not use a single rule. They weigh several factors together, and there is **no automatic pass or fail**. These are the factors that usually carry the most weight:',
      '',
    ];

    ordered.forEach((factor) => {
      parts.push(`**${factor.factor}** — ${factor.summary}`);
      if (factor.explanation) parts.push(`  ${factor.explanation}`);
      if (factor.typical_consideration) {
        parts.push(`  *General guidance:* ${factor.typical_consideration}`);
      }
      parts.push('');
    });

    parts.push(
      '**The clearest single number to understand**',
      '',
      'Your **Debt-to-Income ratio (DTI)** = total monthly debt payments ÷ total monthly income. It shows how much of your income is already committed. A lower DTI generally means more room for a new EMI.',
      '',
      '> Educational information only — this is not a loan approval decision or personalised financial advice. Actual eligibility and terms depend on the lender\'s current policies and your verified information.',
      '',
      'You can run the **Educational Estimate — Not a Loan Approval Decision** tool on the [eligibility page](/eligibility) to see how these factors are typically weighted, and browse the full [eligibility guide](/eligibility).',
    );

    return {
      content: `${opener}\n\n${parts.join('\n')}`,
      source: 'offline_knowledge',
      confidence: 'high',
      matchedTerms: 0,
      strategy: 'eligibility',
    };
  },

  /** Answer from a full loan-type guide. */
  async answerLoanType(slug, opener) {
    const { loanTypeModel } = require('../models/loanTypeModel');
    const loan = await loanTypeModel.findDetailed(slug);
    if (!loan) return null;

    const parts = [`### ${loan.name}`, '', loan.whatItIs];
    if (loan.commonPurpose) parts.push('', '**Commonly used for**', loan.commonPurpose);
    if (loan.interestConcept) parts.push('', '**How interest works**', loan.interestConcept);
    if (loan.tenureConcept) parts.push('', '**About tenure**', loan.tenureConcept);
    if (loan.repaymentConcept) parts.push('', '**How it is repaid**', loan.repaymentConcept);

    if (loan.terms && loan.terms.length) {
      parts.push(
        '',
        '**Key terminology**',
        ...loan.terms
          .slice(0, 6)
          .map((term) => `- [${term.term}](/glossary/${term.slug}) — ${term.shortDefinition}`),
      );
    }

    parts.push('', `> ${RATE_NOTE}`, '', `[Open the full ${loan.name} guide](/loans/${loan.slug})`);

    return {
      content: `${opener}\n\n${parts.join('\n')}`,
      source: 'offline_knowledge',
      confidence: 'high',
      matchedTerms: 0,
      loanType: loan.slug,
      strategy: 'loan-type',
    };
  },

  /**
   * Produce an answer from the knowledge base.
   *
   * Routing is intent-first: a documents question is answered from the document
   * checklist, an eligibility question from the eligibility factors, and
   * everything else falls through to the glossary and loan-type guides.
   *
   * @param {string} question
   * @param {object} retrieval Output of `knowledgeService.retrieve`
   * @param {Array}  history   Recent conversation turns (unused offline, kept for parity)
   * @returns {Promise<{content, source, confidence, matchedTerms, strategy}>}
   */
  async answer(question, retrieval = {}, _history = []) {
    const seed = seedFrom(question);
    const opener = pick(ACKNOWLEDGEMENTS, seed);
    const keywords = retrieval.keywords || knowledgeService.extractKeywords(question);
    const intent = retrieval.intent || knowledgeService.detectIntent(question);

    // ── 1. Document checklist intent ───────────────────────────────────
    if (intent === 'documents') {
      const answer = await offlineEngine.answerDocuments(question, retrieval, opener);
      if (answer) return answer;
    }

    // ── 2. Eligibility intent ──────────────────────────────────────────
    if (intent === 'eligibility') {
      const answer = await offlineEngine.answerEligibility(question, retrieval, opener);
      if (answer) return answer;
    }

    // ── 3. Best glossary match ──────────────────────────────────────────
    if (retrieval.terms && retrieval.terms.length) {
      const [primary, ...secondary] = retrieval.terms;
      const parts = [`### ${primary.term}`, '', `${primary.short_definition}`, '', primary.detailed_explanation];

      if (primary.example) {
        parts.push('', '**Example**', primary.example);
      }

      if (primary.why_it_matters) {
        parts.push('', `**Why it matters** — ${primary.why_it_matters}`);
      }

      if (secondary.length) {
        parts.push('', '### Related concepts you may also want to know');
        parts.push(
          ...secondary.map(
            (term) => `- **${term.term}** — ${term.short_definition} ([learn more](/glossary/${term.slug}))`,
          ),
        );
      }

      parts.push(
        '',
        '> You can browse the full glossary, filter it by category, or ask me to explain any related term.',
      );

      return {
        content: `${opener}\n\n${parts.join('\n')}`,
        source: 'offline_knowledge',
        confidence: 'high',
        matchedTerms: retrieval.terms.length,
        strategy: 'glossary',
      };
    }

    // ── 4. Loan type match ──────────────────────────────────────────────
    if (retrieval.loanTypes && retrieval.loanTypes.length) {
      const answer = await offlineEngine.answerLoanType(retrieval.loanTypes[0].slug, opener);
      if (answer) return answer;
    }

    // ── 5. Document match (no explicit document intent) ────────────────
    if (retrieval.documents && retrieval.documents.length) {
      const parts = ['### Commonly required documents', ''];
      retrieval.documents.forEach((doc) => {
        parts.push(`- **${doc.title}** (${doc.category}) — ${doc.description}`);
      });
      parts.push(
        '',
        '> Required documents vary by lender, applicant profile, and loan type. Always confirm the exact list with the lender before you apply.',
        '',
        '[Open the full document checklist](/documents)',
      );
      return {
        content: `${opener}\n\n${parts.join('\n')}`,
        source: 'offline_knowledge',
        confidence: 'medium',
        matchedTerms: 0,
        strategy: 'documents-fallback',
      };
    }

    // ── 6. Eligibility match (no explicit eligibility intent) ──────────
    if (retrieval.eligibility && retrieval.eligibility.length) {
      const answer = await offlineEngine.answerEligibility(question, retrieval, opener);
      if (answer) return answer;
    }

    // ── 7. No match — answer honestly and signpost the knowledge base ───
    return {
      content: [
        opener,
        '',
        `I could not find a direct match for that in the current offline knowledge base${
          keywords.length ? ` (keywords I looked for: ${keywords.slice(0, 5).join(', ')})` : ''
        }.`,
        '',
        '**The most commonly asked topics in this app are:**',
        '',
        '- **EMI** — how a monthly instalment is split between principal and interest',
        '- **Principal vs interest** — the two parts of every loan payment',
        '- **Prepayment and foreclosure** — paying a loan off early',
        '- **Amortization schedule** — how interest and principal change month by month',
        '- **Credit score and credit history** — what lenders look at',
        '- **Documents** — what you are usually asked to submit',
        '- **Eligibility factors** — age, income, employment stability, DTI',
        '- **Moratorium** — periods where repayment has not started yet',
        '',
        'Try rephrasing your question using one of those words, or browse the [glossary](/glossary), the [eligibility guide](/eligibility) and the [document checklist](/documents).',
        '',
        `> ${SHORT_DISCLAIMER}`,
      ].join('\n'),
      source: 'offline_knowledge',
      confidence: 'low',
      matchedTerms: 0,
      strategy: 'fallback',
    };
  },

  /**
   * Conversation context is not modelled offline, but we still surface which
   * glossary terms the previous turns referenced so the UI can show continuity.
   */
  summariseContext(history = []) {
    return history
      .filter((turn) => turn.role === 'user')
      .slice(-3)
      .map((turn) => String(turn.content).slice(0, 80));
  },
};

module.exports = { offlineEngine, renderTerm };
