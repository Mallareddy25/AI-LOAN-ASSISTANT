'use strict';

const express = require('express');

const router = express.Router();

// ── Health ──────────────────────────────────────────────────────────────
router.use('/health', require('./healthRoutes'));

// ── Authentication ──────────────────────────────────────────────────────
router.use('/auth', require('./authRoutes'));

// ── AI chat + conversations ─────────────────────────────────────────────
router.use('/chat', require('./chatRoutes'));

// ── Knowledge base (loans, glossary, documents, eligibility, FAQs) ─────
router.use('/', require('./knowledgeRoutes'));

// ── EMI calculator + educational eligibility estimator ──────────────────
router.use('/calculator', require('./calculatorRoutes'));

// ── Admin (ADMIN role only) ─────────────────────────────────────────────
router.use('/admin', require('./adminRoutes'));

module.exports = router;
