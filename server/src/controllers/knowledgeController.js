'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { loanTypeModel } = require('../models/loanTypeModel');
const { termModel } = require('../models/termModel');
const { documentModel } = require('../models/documentModel');
const { eligibilityModel } = require('../models/eligibilityModel');
const { faqModel } = require('../models/faqModel');
const { parsePagination, pageMeta } = require('../utils/pagination');
const { RATE_NOTE, DOCS_NOTE, ESTIMATOR_NOTE, DISCLAIMER_OBJECT } = require('../utils/disclaimer');

// ── Loan types ──────────────────────────────────────────────────────────

/** GET /api/loans */
const listLoans = asyncHandler(async (req, res) => {
  const loans = await loanTypeModel.list();
  res.json({ success: true, data: loans, meta: { rateNote: RATE_NOTE, count: loans.length } });
});

/** GET /api/loans/:idOrSlug */
const getLoan = asyncHandler(async (req, res) => {
  const loan = await loanTypeModel.findDetailed(req.params.idOrSlug);
  if (!loan) throw ApiError.notFound('That loan type was not found.');
  res.json({ success: true, data: loan, meta: { rateNote: loan.rateNote, disclaimer: DISCLAIMER_OBJECT } });
});

// ── Glossary ────────────────────────────────────────────────────────────

/** GET /api/terms?search=&category=&featured=&page=&limit= */
const listTerms = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  const [{ rows, total }, categories] = await Promise.all([
    termModel.list({
      search: req.query.search,
      category: req.query.category,
      featured: req.query.featured === 'true',
      ...pagination,
    }),
    termModel.categories(),
  ]);

  res.json({
    success: true,
    data: rows,
    pagination: pageMeta({ ...pagination, total }),
    meta: { categories, count: total },
  });
});

/** GET /api/terms/categories */
const listTermCategories = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await termModel.categories() });
});

/** GET /api/terms/:idOrSlug */
const getTerm = asyncHandler(async (req, res) => {
  const term = await termModel.findDetailed(req.params.idOrSlug);
  if (!term) throw ApiError.notFound('That term was not found in the glossary.');
  res.json({ success: true, data: term });
});

// ── Documents ───────────────────────────────────────────────────────────

/** GET /api/documents?search=&category=&required=&loanType= */
const listDocuments = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  const [{ rows, total }, categories] = await Promise.all([
    documentModel.list({
      search: req.query.search,
      category: req.query.category,
      required: req.query.required,
      loanType: req.query.loanType,
      ...pagination,
    }),
    documentModel.categories(),
  ]);

  res.json({
    success: true,
    data: rows,
    pagination: pageMeta({ ...pagination, total }),
    meta: { categories, count: total, note: DOCS_NOTE },
  });
});

/** GET /api/documents/categories */
const listDocumentCategories = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await documentModel.categories() });
});

// ── Eligibility ─────────────────────────────────────────────────────────

/** GET /api/eligibility */
const listEligibility = asyncHandler(async (req, res) => {
  const pagination = parsePagination({ ...req.query, limit: req.query.limit || 50 });
  const [{ rows, total }, categories] = await Promise.all([
    eligibilityModel.list({
      search: req.query.search,
      category: req.query.category,
      impact: req.query.impact,
      ...pagination,
    }),
    eligibilityModel.categories(),
  ]);

  res.json({
    success: true,
    data: rows,
    pagination: pageMeta({ ...pagination, total }),
    meta: {
      categories,
      impacts: [
        { value: 'high', label: 'High impact' },
        { value: 'medium', label: 'Medium impact' },
        { value: 'low', label: 'Lower impact' },
      ],
      count: total,
      estimatorNote: ESTIMATOR_NOTE,
      disclaimer: DISCLAIMER_OBJECT,
    },
  });
});

/** GET /api/eligibility/categories */
const listEligibilityCategories = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await eligibilityModel.categories() });
});

// ── FAQs ────────────────────────────────────────────────────────────────

/** GET /api/faqs?category= */
const listFaqs = asyncHandler(async (req, res) => {
  const pagination = parsePagination({ ...req.query, limit: req.query.limit || 50 });
  const { rows, total } = await faqModel.list({
    category: req.query.category,
    ...pagination,
  });
  res.json({
    success: true,
    data: rows,
    pagination: pageMeta({ ...pagination, total }),
  });
});

/** GET /api/faqs/categories */
const listFaqCategories = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await faqModel.categories() });
});

module.exports = {
  listLoans,
  getLoan,
  listTerms,
  listTermCategories,
  getTerm,
  listDocuments,
  listDocumentCategories,
  listEligibility,
  listEligibilityCategories,
  listFaqs,
  listFaqCategories,
};
