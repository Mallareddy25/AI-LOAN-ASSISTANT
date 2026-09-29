'use strict';

const express = require('express');
const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/authenticate');
const { writeLimiter } = require('../middleware/rateLimiters');
const controller = require('../controllers/adminController');

const router = express.Router();

// ── Schemas ─────────────────────────────────────────────────────────────

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(160).optional(),
  category: z.string().trim().max(60).optional(),
  role: z.enum(['USER', 'ADMIN', 'All']).optional(),
  impact: z.enum(['high', 'medium', 'low', 'All']).optional(),
  featured: z.enum(['true', 'false']).optional(),
});

const termSchema = z.object({
  // Optional: derived from the title when omitted, so an admin never has to
  // hand-type a URL-safe value. Still validated when supplied.
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers and hyphens')
    .optional(),
  term: z.string().trim().min(2).max(160),
  category: z.string().trim().min(2).max(60).default('General'),
  shortDefinition: z.string().trim().min(10).max(500),
  detailedExplanation: z.string().trim().min(20),
  example: z.string().trim().max(3000).nullish(),
  relatedTerms: z.array(z.string().trim().max(120)).max(20).default([]),
  whyItMatters: z.string().trim().max(500).nullish(),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

const loanTypeSchema = z.object({
  // Optional: derived from the title when omitted, so an admin never has to
  // hand-type a URL-safe value. Still validated when supplied.
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers and hyphens')
    .optional(),
  name: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(200).nullish(),
  icon: z.string().trim().max(40).default('Banknote'),
  accent: z.string().trim().max(16).default('emerald'),
  whatItIs: z.string().trim().min(20),
  commonPurpose: z.string().trim().max(3000).nullish(),
  eligibilitySummary: z.string().trim().max(3000).nullish(),
  documentsSummary: z.string().trim().max(3000).nullish(),
  interestConcept: z.string().trim().max(3000).nullish(),
  tenureConcept: z.string().trim().max(3000).nullish(),
  repaymentConcept: z.string().trim().max(3000).nullish(),
  keyTerminology: z.array(z.string().trim().max(120)).max(30).default([]),
  pros: z.array(z.string().trim().max(200)).max(10).default([]),
  cons: z.array(z.string().trim().max(200)).max(10).default([]),
  rateNote: z.string().trim().max(255).optional(),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
});

const documentSchema = z.object({
  // Optional: derived from the title when omitted, so an admin never has to
  // hand-type a URL-safe value. Still validated when supplied.
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers and hyphens')
    .optional(),
  title: z.string().trim().min(2).max(160),
  category: z.string().trim().min(2).max(60),
  description: z.string().trim().min(10).max(500),
  whyNeeded: z.string().trim().max(500).nullish(),
  typicalFormats: z.string().trim().max(200).nullish(),
  appliesTo: z.array(z.string().trim().max(80)).max(20).default([]),
  notes: z.string().trim().max(500).nullish(),
  isRequired: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

const eligibilitySchema = z.object({
  // Optional: derived from the title when omitted, so an admin never has to
  // hand-type a URL-safe value. Still validated when supplied.
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers and hyphens')
    .optional(),
  factor: z.string().trim().min(2).max(160),
  category: z.string().trim().min(2).max(60).default('Personal'),
  icon: z.string().trim().max(40).default('User'),
  summary: z.string().trim().min(10).max(500),
  explanation: z.string().trim().min(20),
  typicalConsideration: z.string().trim().max(500).nullish(),
  impact: z.enum(['high', 'medium', 'low']).default('medium'),
  example: z.string().trim().max(500).nullish(),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

const faqSchema = z.object({
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(10),
  category: z.string().trim().min(2).max(60).default('General'),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isPublished: z.boolean().default(true),
});

const roleSchema = z.object({ role: z.enum(['USER', 'ADMIN']) });
const statusSchema = z.object({ isActive: z.boolean() });

/** Merge a partial-update schema so PUT accepts any subset of fields. */
const partial = (schema) => schema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'Provide at least one field to update',
});

// ── Gate: every route below requires an ADMIN token ─────────────────────

router.use(authenticate, authorize('ADMIN'));

// ── Dashboard ───────────────────────────────────────────────────────────

router.get('/stats', asyncHandler(controller.getStats));
router.get('/activity', asyncHandler(controller.getActivity));
router.get('/topics', asyncHandler(controller.getTopTopics));

// ── Users ───────────────────────────────────────────────────────────────

router.get('/users', validate({ query: listQuerySchema }), controller.listUsers);
router.patch(
  '/users/:id/role',
  writeLimiter,
  validate({ params: idParamSchema, body: roleSchema }),
  controller.updateUserRole,
);
router.patch(
  '/users/:id/status',
  writeLimiter,
  validate({ params: idParamSchema, body: statusSchema }),
  controller.updateUserStatus,
);

// ── Glossary terms ──────────────────────────────────────────────────────

router.get('/terms', validate({ query: listQuerySchema }), controller.terms.list);
router.get('/terms/:id', validate({ params: idParamSchema }), controller.terms.get);
router.post('/terms', writeLimiter, validate({ body: termSchema }), controller.terms.create);
router.put(
  '/terms/:id',
  writeLimiter,
  validate({ params: idParamSchema, body: partial(termSchema) }),
  controller.terms.update,
);
router.delete('/terms/:id', writeLimiter, validate({ params: idParamSchema }), controller.terms.remove);

// ── Loan types ──────────────────────────────────────────────────────────

router.get('/loans', validate({ query: listQuerySchema }), controller.loans.list);
router.get('/loans/:id', validate({ params: idParamSchema }), controller.loans.get);
router.post('/loans', writeLimiter, validate({ body: loanTypeSchema }), controller.loans.create);
router.put(
  '/loans/:id',
  writeLimiter,
  validate({ params: idParamSchema, body: partial(loanTypeSchema) }),
  controller.loans.update,
);
router.delete('/loans/:id', writeLimiter, validate({ params: idParamSchema }), controller.loans.remove);

// ── Documents ───────────────────────────────────────────────────────────

router.get('/documents', validate({ query: listQuerySchema }), controller.documents.list);
router.get('/documents/:id', validate({ params: idParamSchema }), controller.documents.get);
router.post('/documents', writeLimiter, validate({ body: documentSchema }), controller.documents.create);
router.put(
  '/documents/:id',
  writeLimiter,
  validate({ params: idParamSchema, body: partial(documentSchema) }),
  controller.documents.update,
);
router.delete(
  '/documents/:id',
  writeLimiter,
  validate({ params: idParamSchema }),
  controller.documents.remove,
);

// ── Eligibility factors ─────────────────────────────────────────────────

router.get('/eligibility', validate({ query: listQuerySchema }), controller.eligibility.list);
router.get('/eligibility/:id', validate({ params: idParamSchema }), controller.eligibility.get);
router.post(
  '/eligibility',
  writeLimiter,
  validate({ body: eligibilitySchema }),
  controller.eligibility.create,
);
router.put(
  '/eligibility/:id',
  writeLimiter,
  validate({ params: idParamSchema, body: partial(eligibilitySchema) }),
  controller.eligibility.update,
);
router.delete(
  '/eligibility/:id',
  writeLimiter,
  validate({ params: idParamSchema }),
  controller.eligibility.remove,
);

// ── FAQs ────────────────────────────────────────────────────────────────

router.get('/faqs', validate({ query: listQuerySchema }), controller.faqs.list);
router.get('/faqs/:id', validate({ params: idParamSchema }), controller.faqs.get);
router.post('/faqs', writeLimiter, validate({ body: faqSchema }), controller.faqs.create);
router.put(
  '/faqs/:id',
  writeLimiter,
  validate({ params: idParamSchema, body: partial(faqSchema) }),
  controller.faqs.update,
);
router.delete('/faqs/:id', writeLimiter, validate({ params: idParamSchema }), controller.faqs.remove);

module.exports = router;
