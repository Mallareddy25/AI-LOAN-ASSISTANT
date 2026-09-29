import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Authorization boundary tests.
 *
 * The admin API is protected by a single `router.use(authenticate,
 * authorize('ADMIN'))`, which is the right shape but has two failure modes that
 * no other suite would notice:
 *
 *   1. A route registered *above* that line is completely unprotected, because
 *      `router.use` only applies to what comes after it. This is asserted
 *      structurally below, by comparing line numbers in the source.
 *   2. A path under /admin that is not a real route must still be rejected. If
 *      an unknown path returns 404 instead of 401, the gate has been moved
 *      behind the routes and no longer covers them.
 *
 * The rest probes the real middleware chain over HTTP, because a stubbed
 * request cannot show whether the gate ran at all.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_ROUTES_SOURCE = path.resolve(HERE, '..', 'src', 'routes', 'adminRoutes.js');

const CREDENTIALS = {
  member: { email: 'demo@student.test', password: 'Test@1234' },
  admin: { email: 'admin@loanassistant.local', password: 'Admin@12345' },
};

/**
 * Every admin endpoint, with a body that is valid enough to reach the handler.
 * The point is the gate, not the handler, so the exact ids and payloads only
 * need to be plausible.
 */
const ADMIN_ENDPOINTS = [
  { method: 'GET', path: '/admin/stats' },
  { method: 'GET', path: '/admin/activity' },
  { method: 'GET', path: '/admin/topics' },
  { method: 'GET', path: '/admin/users' },
  { method: 'GET', path: '/admin/users/1' },
  { method: 'PATCH', path: '/admin/users/1', body: { role: 'USER' } },
  { method: 'GET', path: '/admin/terms' },
  { method: 'POST', path: '/admin/terms', body: { term: 'Gate probe' } },
  { method: 'GET', path: '/admin/terms/1' },
  { method: 'PATCH', path: '/admin/terms/1', body: { term: 'Gate probe' } },
  { method: 'GET', path: '/admin/loans' },
  { method: 'POST', path: '/admin/loans', body: { name: 'Gate probe' } },
  { method: 'GET', path: '/admin/documents' },
  { method: 'POST', path: '/admin/documents', body: { title: 'Gate probe' } },
  { method: 'GET', path: '/admin/eligibility' },
  { method: 'POST', path: '/admin/eligibility', body: { factor: 'Gate probe' } },
  { method: 'GET', path: '/admin/faqs' },
  { method: 'POST', path: '/admin/faqs', body: { question: 'Gate probe?' } },
];

let server;
let base;
let tokens = {};

const signIn = async ({ email, password }) => {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  expect(res.ok, `sign-in failed for ${email}: ${res.status}`).toBe(true);
  const json = await res.json();
  return json.data.accessToken;
};

const call = async (method, path, { token, body } = {}) => {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body) headers['content-type'] = 'application/json';
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.status;
};

beforeAll(async () => {
  const app = (await import('../src/app.js')).default;
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
  for (const [role, credentials] of Object.entries(CREDENTIALS)) {
    tokens[role] = await signIn(credentials);
  }
}, 30000);

afterAll(() => {
  server?.close();
});

describe('admin authorization', () => {
  it('rejects an anonymous request to every admin endpoint', async () => {
    const wrong = [];
    for (const { method, path, body } of ADMIN_ENDPOINTS) {
      // eslint-disable-next-line no-await-in-loop
      const status = await call(method, path, { body });
      if (status !== 401) wrong.push(`${method} ${path} -> ${status}`);
    }
    expect(wrong).toEqual([]);
  });

  it('rejects a signed-in member from every admin endpoint', async () => {
    const wrong = [];
    for (const { method, path, body } of ADMIN_ENDPOINTS) {
      // eslint-disable-next-line no-await-in-loop
      const status = await call(method, path, { token: tokens.member, body });
      if (status !== 403) wrong.push(`${method} ${path} -> ${status}`);
    }
    expect(wrong).toEqual([]);
  });

  it('lets an admin through the gate on every admin endpoint', async () => {
    const wrong = [];
    for (const { method, path, body } of ADMIN_ENDPOINTS) {
      // eslint-disable-next-line no-await-in-loop
      const status = await call(method, path, { token: tokens.admin, body });
      // 404 for a missing id and 422 for a deliberately incomplete body are both
      // proof the request reached the handler. 401 or 403 would mean it did not.
      if (status === 401 || status === 403) wrong.push(`${method} ${path} -> ${status}`);
    }
    expect(wrong).toEqual([]);
  });

  it('gates unknown admin paths, so the gate sits in front of the routes', async () => {
    // A 404 here would mean the router resolved the path before the gate ran.
    expect(await call('GET', '/admin/definitely-not-a-route')).toBe(401);
    expect(await call('GET', '/admin/definitely-not-a-route', { token: tokens.member })).toBe(403);
  });

  it('declares no admin route above the role gate', () => {
    const source = fs.readFileSync(ADMIN_ROUTES_SOURCE, 'utf8');
    const lines = source.split('\n');

    const gateIndex = lines.findIndex((line) =>
      /router\.use\(\s*authenticate\s*,\s*authorize\(\s*'ADMIN'\s*\)\s*\)/.test(line),
    );
    expect(gateIndex, 'the role gate declaration was not found').toBeGreaterThan(-1);

    const before = [];
    lines.slice(0, gateIndex).forEach((line, index) => {
      if (/^\s*router\.(get|post|patch|put|delete)\(/.test(line)) {
        before.push(`line ${index + 1}: ${line.trim()}`);
      }
    });
    // `router.use` only protects routes registered after it, so anything above
    // this line would be reachable without a token.
    expect(before, 'admin routes are declared above the role gate').toEqual([]);
  });

  it('leaves the public knowledge API open, and chat open to guests', async () => {
    // Guards against the opposite mistake: over-gating the public app.
    expect(await call('GET', '/loans')).toBe(200);
    expect(await call('GET', '/terms')).toBe(200);
    expect(await call('GET', '/calculator/emi')).not.toBe(401);
  });
});
