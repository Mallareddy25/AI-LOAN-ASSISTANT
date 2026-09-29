'use strict';

/**
 * Express application factory.
 *
 * Exported separately from `server.js` so the test suite can mount the app
 * with supertest without binding a port.
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const { config } = require('./config/env');
const { logger } = require('./config/logger');
const { requestLogger } = require('./middleware/requestLogger');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimiters');
const apiRoutes = require('./routes');

const app = express();

// ── Trust proxy so rate limiting and IP detection work behind a proxy ───
app.set('trust proxy', config.isProduction ? 1 : false);
app.disable('x-powered-by');

// ── Security headers ────────────────────────────────────────────────────
// Two Content Security Policies, because this process either serves JSON only
// (development) or serves JSON *and* the built SPA from one origin
// (production). A single locked-down `default-src 'none'` policy is right for
// API responses, but as a document policy it blocks the app's own scripts,
// styles and XHR, so the SPA needs its own scoped policy below.
const API_CSP = {
  defaultSrc: ["'none'"],
  frameAncestors: ["'none'"],
  baseUri: ["'none'"],
  formAction: ["'none'"],
};

// ── Static client (production single-server deployment) ────────────────
// Resolved before the root banner, because when the built client is being
// served the banner must not shadow `/` and answer with JSON instead of the app.
const clientDist = path.join(config.paths.repoRoot, 'client', 'dist');
const servesClient = config.isProduction && fs.existsSync(clientDist);

const SPA_CSP = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'blob:'],
  fontSrc: ["'self'", 'data:'],
  // In production the SPA is served from this same origin, so 'self' covers
  // every API call. The dev client's origin is only needed when it is actually
  // a separate origin, and it must not leak into a production policy.
  connectSrc: servesClient
    ? ["'self'"]
    : ["'self'", ...config.server.clientUrl],
  workerSrc: ["'self'", 'blob:'],
  objectSrc: ["'none'"],
  frameAncestors: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
};

app.use(
  helmet({
    contentSecurityPolicy: false, // applied per-scope below
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer' },
    hsts: config.isProduction ? { maxAge: 15552000, includeSubDomains: true } : false,
  }),
);

// ── CORS allowlist ──────────────────────────────────────────────────────
const allowedOrigins = new Set(config.server.clientUrl);
// A same-origin request is always legitimate. This matters in production,
// where the built client is served from this very process: Vite emits
// `crossorigin` on its modulepreload links, so the browser sends an `Origin`
// header of this server's own address for the JS/CSS it loads. Rejecting it
// would 500 every asset and leave the app unable to boot.
app.use(
  cors((req, callback) => {
    const origin = req.headers.origin;
    const forwardedProto = req.headers['x-forwarded-proto'];
    const protocol = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || req.protocol;
    const selfOrigin = `${protocol}://${req.headers.host}`;

    const permitted =
      !origin || origin === selfOrigin || allowedOrigins.has(origin);

    callback(null, {
      origin: permitted,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy'],
      maxAge: 86400,
    });
  }),
);

app.use(compression());
app.use(express.json({ limit: config.server.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.server.bodyLimit }));

// ── Logging ─────────────────────────────────────────────────────────────
if (!config.isTest) {
  app.use(morgan(config.isProduction ? 'combined' : 'dev', { skip: () => config.env === 'test' }));
}
app.use(requestLogger);


// ── Root banner (no secrets) ────────────────────────────────────────────
if (!servesClient) {
  app.get('/', (req, res) => {
    res.json({
      success: true,
      data: {
        service: 'AI Loan Information Assistant API',
        projectCode: '4SU24CS045',
        version: require('../package.json').version,
        documentation: 'See README.md for the full API reference.',
        health: `${config.server.apiPrefix}/health`,
        notice:
          'Educational information only. This API does not approve loans or provide financial advice.',
      },
    });
  });
}

// ── API ─────────────────────────────────────────────────────────────────
app.use(config.server.apiPrefix, helmet.contentSecurityPolicy({ directives: API_CSP }));
app.use(config.server.apiPrefix, globalLimiter, apiRoutes);

// ── Static client ───────────────────────────────────────────────────────
if (servesClient) {
  app.use(helmet.contentSecurityPolicy({ directives: SPA_CSP }));
  app.use(express.static(clientDist, { maxAge: '1d', index: false }));
  // SPA fallback: any non-API GET resolves to the client router.
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  logger.info('Serving client build from', { path: clientDist });
}

// ── Error handling (must be last) ───────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
