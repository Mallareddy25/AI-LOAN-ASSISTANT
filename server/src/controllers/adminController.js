'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { logger } = require('../config/logger');
const { parsePagination, pageMeta } = require('../utils/pagination');
const { userModel } = require('../models/userModel');
const { statsModel } = require('../models/statsModel');
const { termModel } = require('../models/termModel');
const { loanTypeModel } = require('../models/loanTypeModel');
const { documentModel } = require('../models/documentModel');
const { eligibilityModel } = require('../models/eligibilityModel');
const { faqModel } = require('../models/faqModel');
const { aiService } = require('../services/aiService');
const { slugify } = require('../utils/sanitize');

/**
 * Generic CRUD factory for the knowledge entities.
 * Keeps the admin routes declarative and guarantees consistent error handling.
 *
 * @param {object} deps
 * @param {object} deps.model
 * @param {string} deps.label            Human name used in messages
 * @param {string} [deps.slugField]      Field used for the 404 message
 * @param {string} [deps.titleField]     Field a slug is derived from
 */
function crudController({ model, label, slugField = 'slug', titleField }) {
  return {
    list: asyncHandler(async (req, res) => {
      const pagination = parsePagination({ ...req.query, limit: req.query.limit || 25 });
      const { rows, total } = await model.list({ ...req.query, ...pagination });
      res.json({ success: true, data: rows, pagination: pageMeta({ ...pagination, total }) });
    }),

    get: asyncHandler(async (req, res) => {
      const item = await model.findByIdOrSlug(req.params.id);
      if (!item) throw ApiError.notFound(`That ${label} was not found.`);
      res.json({ success: true, data: item });
    }),

    create: asyncHandler(async (req, res) => {
      const payload = { ...req.body };

      /*
       * Slugs are public URLs, so derive one from the title instead of making
       * an admin hand-type a URL-safe value. An explicit slug still wins, and a
       * collision gets a numeric suffix rather than a duplicate-key error.
       */
      if (titleField && !payload[slugField]) {
        const base = slugify(payload[titleField], 80);
        if (base) {
          let candidate = base;
          let suffix = 2;
          // Bounded so a pathological table cannot spin here.
          while (suffix < 100 && (await model.findByIdOrSlug(candidate))) {
            candidate = `${base}-${suffix}`;
            suffix += 1;
          }
          payload[slugField] = candidate;
        }
      }

      const item = await model.create(payload);
      logger.info(`${label} created`, { entity: label, id: item.id, by: req.user.id });
      res.status(201).json({ success: true, data: item, message: `${label} created.` });
    }),

    update: asyncHandler(async (req, res) => {
      const id = Number.parseInt(req.params.id, 10);
      const existing = await model.findByIdOrSlug(id);
      if (!existing) throw ApiError.notFound(`That ${label} was not found.`);

      const item = await model.update(id, req.body);
      logger.info(`${label} updated`, { entity: label, id, by: req.user.id });
      res.json({ success: true, data: item, message: `${label} updated.` });
    }),

    remove: asyncHandler(async (req, res) => {
      const id = Number.parseInt(req.params.id, 10);
      const existing = await model.findByIdOrSlug(id);
      if (!existing) throw ApiError.notFound(`That ${label} was not found.`);

      await model.remove(id);
      logger.info(`${label} deleted`, { entity: label, id, slug: existing[slugField], by: req.user.id });
      res.json({ success: true, message: `${label} deleted.`, data: { id, slug: existing[slugField] } });
    }),
  };
}

// ── Dashboard ───────────────────────────────────────────────────────────

/** GET /api/admin/stats */
const getStats = asyncHandler(async (req, res) => {
  const [summary, topTopics, activity, performance] = await Promise.all([
    statsModel.summary(),
    statsModel.topTopics(8),
    statsModel.activity(7),
    statsModel.performance(),
  ]);

  res.json({
    success: true,
    data: {
      ...summary,
      topTopics,
      activity,
      performance,
      ai: {
        configured: aiService.isConfigured(),
        model: aiService.getModel(),
      },
    },
  });
});

/** GET /api/admin/activity?days= */
const getActivity = asyncHandler(async (req, res) => {
  const days = Number.parseInt(req.query.days, 10) || 7;
  res.json({ success: true, data: await statsModel.activity(days) });
});

/** GET /api/admin/topics */
const getTopTopics = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await statsModel.topTopics(10) });
});

// ── Users ───────────────────────────────────────────────────────────────

/** GET /api/admin/users */
const listUsers = asyncHandler(async (req, res) => {
  const pagination = parsePagination({ ...req.query, limit: req.query.limit || 20 });
  const { rows, total } = await userModel.list({
    search: req.query.search,
    role: req.query.role,
    ...pagination,
  });
  res.json({ success: true, data: rows, pagination: pageMeta({ ...pagination, total }) });
});

/** PATCH /api/admin/users/:id/role */
const updateUserRole = asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const { role } = req.body;

  if (id === req.user.id) {
    throw ApiError.badRequest('You cannot change your own role.', { code: 'SELF_ROLE_CHANGE' });
  }

  const target = await userModel.findById(id);
  if (!target) throw ApiError.notFound('That user was not found.');

  const user = await userModel.updateRole(id, role);
  logger.info('User role changed', { targetUserId: id, role, by: req.user.id });

  res.json({ success: true, data: user, message: `Role updated to ${role}.` });
});

/** PATCH /api/admin/users/:id/status */
const updateUserStatus = asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const { isActive } = req.body;

  if (id === req.user.id) {
    throw ApiError.badRequest('You cannot deactivate your own account.', {
      code: 'SELF_DEACTIVATION',
    });
  }

  const target = await userModel.findById(id);
  if (!target) throw ApiError.notFound('That user was not found.');

  const user = await userModel.setActive(id, isActive);
  logger.info('User status changed', { targetUserId: id, isActive, by: req.user.id });

  res.json({
    success: true,
    data: user,
    message: isActive ? 'Account reactivated.' : 'Account deactivated.',
  });
});

module.exports = {
  getStats,
  getActivity,
  getTopTopics,
  listUsers,
  updateUserRole,
  updateUserStatus,
  terms: crudController({ model: termModel, label: 'Term', slugField: 'slug', titleField: 'term' }),
  loans: crudController({ model: loanTypeModel, label: 'Loan type', slugField: 'slug', titleField: 'name' }),
  documents: crudController({ model: documentModel, label: 'Document', slugField: 'slug', titleField: 'title' }),
  eligibility: crudController({ model: eligibilityModel, label: 'Eligibility factor', slugField: 'slug', titleField: 'factor' }),
  faqs: crudController({
    model: {
      list: faqModel.list.bind(faqModel),
      findByIdOrSlug: async (idOrSlug) => faqModel.findById(Number.parseInt(idOrSlug, 10)),
      create: faqModel.create.bind(faqModel),
      update: faqModel.update.bind(faqModel),
      remove: faqModel.remove.bind(faqModel),
    },
    label: 'FAQ',
    slugField: 'question',
  }),
};
