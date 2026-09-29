'use strict';

/**
 * Vercel serverless entry point.
 *
 * Vercel does not run a long-lived process, so `server.js` — which calls
 * `app.listen()` and installs signal handlers — is the wrong entry here. This
 * file exports the bare Express app instead, and Vercel invokes it per request.
 *
 * The app is deliberately not refactored into a factory: `app.js` already
 * decides whether to serve `client/dist` at require time, based on
 * `NODE_ENV` and the build output being present. Exporting the app directly
 * keeps that decision in one place and means the same module serves the API and
 * the SPA from a single origin, exactly as it does on a long-running host.
 *
 * Database preflight (`assertSchema`) is therefore not run at boot the way
 * `bootstrap()` does. `GET /api/health` performs the same check live and
 * reports `missingTables`, so a missing schema is still visible.
 */

module.exports = require('../server/src/app');
