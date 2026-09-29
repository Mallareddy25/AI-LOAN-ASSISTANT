'use strict';

/** Parse a JSON column defensively — never throw on malformed data. */
function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Fall back to a comma-separated string, which the seed also allows.
    return String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function toLoanType(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    icon: row.icon,
    accent: row.accent,
    whatItIs: row.what_it_is,
    commonPurpose: row.common_purpose,
    eligibilitySummary: row.eligibility_summary,
    documentsSummary: row.documents_summary,
    interestConcept: row.interest_concept,
    tenureConcept: row.tenure_concept,
    repaymentConcept: row.repayment_concept,
    keyTerminology: parseJsonArray(row.key_terminology),
    pros: parseJsonArray(row.pros),
    cons: parseJsonArray(row.cons),
    rateNote: row.rate_note,
    sortOrder: row.sort_order,
    isActive: Boolean(row.is_active),
    // Optional relationship payloads (populated by findById)
    terms: row.terms ? parseJsonArray(row.terms) : undefined,
    documents: row.documents ? parseJsonArray(row.documents) : undefined,
    eligibilityFactors: row.eligibility_factors ? parseJsonArray(row.eligibility_factors) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const loanTypeModel = {
  async list({ includeInactive = false } = {}) {
    const db = require('../config/db');
    const rows = await db.select(
      `SELECT * FROM loan_types
        ${includeInactive ? '' : 'WHERE is_active = 1'}
        ORDER BY sort_order ASC, name ASC`,
    );
    return rows.map(toLoanType);
  },

  async findByIdOrSlug(idOrSlug) {
    const db = require('../config/db');
    const numeric = Number.parseInt(idOrSlug, 10);
    const row = Number.isFinite(numeric)
      ? await db.selectOne('SELECT * FROM loan_types WHERE id = ? LIMIT 1', [numeric])
      : await db.selectOne('SELECT * FROM loan_types WHERE slug = ? LIMIT 1', [String(idOrSlug)]);
    return toLoanType(row);
  },

  /**
   * Full detail view including related glossary terms, document checklist and
   * eligibility factors. Built with three simple aggregate queries so it stays
   * parameterised and easy to read.
   */
  async findDetailed(idOrSlug) {
    const db = require('../config/db');
    const loan = await loanTypeModel.findByIdOrSlug(idOrSlug);
    if (!loan) return null;

    const termRows = await db.select(
      `SELECT t.id, t.slug, t.term, t.short_definition, ltt.relevance
         FROM loan_type_terms ltt
         JOIN loan_terms t ON t.id = ltt.term_id
        WHERE ltt.loan_type_id = ?
        ORDER BY FIELD(ltt.relevance, 'core', 'common', 'optional'), t.sort_order ASC`,
      [loan.id],
    );

    const docRows = await db.select(
      `SELECT d.id, d.slug, d.title, d.category, d.description, ltd.is_core
         FROM loan_type_documents ltd
         JOIN documents d ON d.id = ltd.document_id
        WHERE ltd.loan_type_id = ?
        ORDER BY ltd.is_core DESC, d.category ASC, d.sort_order ASC`,
      [loan.id],
    );

    const eligibilityRows = await db.select(
      'SELECT * FROM eligibility_factors ORDER BY sort_order ASC LIMIT 6',
    );

    return {
      ...loan,
      terms: termRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        term: row.term,
        shortDefinition: row.short_definition,
        relevance: row.relevance,
      })),
      documents: docRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        category: row.category,
        description: row.description,
        isCore: Boolean(row.is_core),
      })),
      eligibilityFactors: eligibilityRows.map((row) => require('./eligibilityModel').toEligibility(row)),
    };
  },

  async create(payload) {
    const db = require('../config/db');
    const { insertId } = await db.insert(
      `INSERT INTO loan_types
        (slug, name, tagline, icon, accent, what_it_is, common_purpose, eligibility_summary,
         documents_summary, interest_concept, tenure_concept, repayment_concept,
         key_terminology, pros, cons, rate_note, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.slug,
        payload.name,
        payload.tagline ?? null,
        payload.icon ?? 'Banknote',
        payload.accent ?? 'emerald',
        payload.whatItIs,
        payload.commonPurpose ?? null,
        payload.eligibilitySummary ?? null,
        payload.documentsSummary ?? null,
        payload.interestConcept ?? null,
        payload.tenureConcept ?? null,
        payload.repaymentConcept ?? null,
        JSON.stringify(payload.keyTerminology ?? []),
        JSON.stringify(payload.pros ?? []),
        JSON.stringify(payload.cons ?? []),
        payload.rateNote ??
          'Interest rates change frequently. Verify current rates directly with the lender.',
        payload.sortOrder ?? 0,
        payload.isActive === false ? 0 : 1,
      ],
    );
    return loanTypeModel.findByIdOrSlug(insertId);
  },

  async update(id, payload) {
    const db = require('../config/db');
    const columns = {
      slug: 'slug',
      name: 'name',
      tagline: 'tagline',
      icon: 'icon',
      accent: 'accent',
      whatItIs: 'what_it_is',
      commonPurpose: 'common_purpose',
      eligibilitySummary: 'eligibility_summary',
      documentsSummary: 'documents_summary',
      interestConcept: 'interest_concept',
      tenureConcept: 'tenure_concept',
      repaymentConcept: 'repayment_concept',
      keyTerminology: 'key_terminology',
      pros: 'pros',
      cons: 'cons',
      rateNote: 'rate_note',
      sortOrder: 'sort_order',
      isActive: 'is_active',
    };

    const sets = [];
    const params = [];
    Object.entries(columns).forEach(([key, column]) => {
      if (payload[key] === undefined) return;
      let value = payload[key];
      if (['keyTerminology', 'pros', 'cons'].includes(key)) {
        value = JSON.stringify(value ?? []);
      }
      if (key === 'isActive') value = value ? 1 : 0;
      sets.push(`${column} = ?`);
      params.push(value);
    });

    if (!sets.length) return loanTypeModel.findByIdOrSlug(id);

    params.push(id);
    await db.update(`UPDATE loan_types SET ${sets.join(', ')} WHERE id = ?`, params);
    return loanTypeModel.findByIdOrSlug(id);
  },

  async remove(id) {
    const db = require('../config/db');
    const { affectedRows } = await db.update('DELETE FROM loan_types WHERE id = ?', [id]);
    return affectedRows > 0;
  },

  async count() {
    const db = require('../config/db');
    const row = await db.selectOne('SELECT COUNT(*) AS total FROM loan_types WHERE is_active = 1');
    return Number(row?.total || 0);
  },
};

module.exports = { loanTypeModel, toLoanType, parseJsonArray };
