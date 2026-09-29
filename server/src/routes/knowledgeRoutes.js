'use strict';

const express = require('express');
const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const controller = require('../controllers/knowledgeController');

const router = express.Router();

/** Reusable list-query schema for the knowledge endpoints. */
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(160).optional(),
  category: z.string().trim().max(60).optional(),
});

const idParamSchema = z.object({
  idOrSlug: z.string().trim().min(1).max(160),
});

// ── Loan types ──────────────────────────────────────────────────────────

router.get('/loans', asyncHandler(controller.listLoans));
router.get('/loans/:idOrSlug', validate({ params: idParamSchema }), controller.getLoan);

// ── Glossary ────────────────────────────────────────────────────────────
// NOTE: `/terms/categories` is registered before `/terms/:idOrSlug` so the
// literal path is not swallowed by the parameterised route.

router.get('/terms/categories', asyncHandler(controller.listTermCategories));

router.get(
  '/terms',
  validate({
    query: listQuerySchema.extend({
      featured: z.enum(['true', 'false']).optional(),
    }),
  }),
  controller.listTerms,
);

router.get('/terms/:idOrSlug', validate({ params: idParamSchema }), controller.getTerm);

// ── Documents ───────────────────────────────────────────────────────────

router.get('/documents/categories', asyncHandler(controller.listDocumentCategories));

router.get(
  '/documents',
  validate({
    query: listQuerySchema.extend({
      required: z.enum(['true', 'false']).optional(),
      loanType: z.string().trim().max(80).optional(),
    }),
  }),
  controller.listDocuments,
);

// ── Eligibility ─────────────────────────────────────────────────────────

router.get('/eligibility/categories', asyncHandler(controller.listEligibilityCategories));

router.get(
  '/eligibility',
  validate({
    query: listQuerySchema.extend({
      impact: z.enum(['high', 'medium', 'low', 'All']).optional(),
    }),
  }),
  controller.listEligibility,
);

// ── FAQs ────────────────────────────────────────────────────────────────

router.get('/faqs/categories', asyncHandler(controller.listFaqCategories));

router.get(
  '/faqs',
  validate({ query: listQuerySchema }),
  controller.listFaqs,
);

module.exports = router;
