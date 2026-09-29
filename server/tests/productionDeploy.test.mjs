import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Regression tests for the single-origin production deployment.
 *
 * `NODE_ENV` must be `production` *before* the app module is loaded, because
 * the static-client branch in `app.js` is decided at require time. Two bugs
 * lived in that branch and were invisible to every other suite:
 *
 *   1. The root JSON banner was registered before the static handler, so `/`
 *      answered with JSON instead of the app.
 *   2. A single `default-src 'none'` CSP was applied to the SPA document as
 *      well, so the browser blocked the app's own scripts, styles and XHR and
 *      the calculator silently made no API call at all.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(HERE, '..', '..', 'client', 'dist');
const hasBuild = fs.existsSync(path.join(CLIENT_DIST, 'index.html'));

let server;
let base;

beforeAll(async () => {
  if (!hasBuild) return;
  process.env.NODE_ENV = 'production';
  const { config } = await import('../src/config/env.js');
  const app = (await import('../src/app.js')).default;
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
  // Silence the startup banner; the assertions are the point.
  config.logger?.info?.('production deploy test ready');
});

afterAll(() => {
  server?.close();
});

describe.skipIf(!hasBuild)('production single-origin deployment', () => {
  it('serves the SPA at the root instead of the API banner', async () => {
    const res = await fetch(`${base}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
    expect(await res.text()).toMatch(/<div id="root"|<script/);
  });

  it('falls back to index.html for client-side routes', async () => {
    for (const route of ['/admin', '/calculator', '/chat', '/loans/eligibility-guide']) {
      const res = await fetch(`${base}${route}`);
      expect(res.status, route).toBe(200);
      expect(res.headers.get('content-type'), route).toMatch(/text\/html/);
    }
  });

  it('keeps JSON API responses under /api, including 404s', async () => {
    const health = await fetch(`${base}/api/health`);
    expect(health.status).toBe(200);
    expect(health.headers.get('content-type')).toMatch(/application\/json/);

    const missing = await fetch(`${base}/api/definitely-not-a-route`);
    expect(missing.status).toBe(404);
    expect(missing.headers.get('content-type')).toMatch(/application\/json/);
  });

  it('serves built assets referenced by index.html', async () => {
    const html = await (await fetch(`${base}/`)).text();
    const entry = html.match(/\/assets\/[^"']+\.js/)?.[0];
    expect(entry, 'index.html should reference an entry chunk').toBeTruthy();

    const res = await fetch(`${base}${entry}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/javascript/);
  });

  it('echoes Access-Control-Allow-Origin for its own origin', async () => {
    // Vite marks modulepreload links `crossorigin`, so the browser sends this
    // server's own origin when fetching the app's JS. Refusing it 500'd every
    // asset and left the production build unable to boot.
    const res = await fetch(`${base}/api/health`, { headers: { Origin: base } });
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe(base);
  });

  it('omits CORS headers for an untrusted origin without erroring', async () => {
    const res = await fetch(`${base}/api/health`, {
      headers: { Origin: 'https://evil.example' },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('gives the SPA a policy that permits its own scripts, styles and XHR', async () => {
    const res = await fetch(`${base}/`);
    const csp = res.headers.get('content-security-policy') || '';
    expect(csp).toMatch(/default-src 'self'/);
    expect(csp).toMatch(/script-src 'self'/);
    expect(csp).toMatch(/connect-src 'self'/);
    // The bug this guards: `default-src 'none'` on the document blocked the
    // app from calling /api at all.
    expect(csp).not.toMatch(/default-src 'none'/);
  });

  it('keeps a locked-down policy on API responses', async () => {
    const res = await fetch(`${base}/api/health`);
    const csp = res.headers.get('content-security-policy') || '';
    expect(csp).toMatch(/default-src 'none'/);
    expect(csp).toMatch(/frame-ancestors 'none'/);
  });

  /*
   * The theme is resolved before first paint by a small script, so the document
   * has to be able to load it. It used to be inline, which `script-src 'self'`
   * blocked: every production page logged a CSP violation and a visitor with a
   * saved dark preference got a light flash before React mounted.
   */
  it('loads the pre-paint theme script from the same origin, not inline', async () => {
    const res = await fetch(`${base}/`);
    const html = await res.text();
    const csp = res.headers.get('content-security-policy') || '';

    expect(html).toMatch(/<script src="\/theme-init\.js"><\/script>/);
    // An inline <script> with a body would be refused by the policy below.
    expect(html).not.toMatch(/<script>(?!\s*<\/script>)/);
    expect(csp).toMatch(/script-src 'self'/);
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);

    const script = await fetch(`${base}/theme-init.js`);
    expect(script.status).toBe(200);
    expect(script.headers.get('content-type')).toMatch(/javascript/);
    expect(await script.text()).toMatch(/loan-assistant-theme/);
  });

  it('does not leak the dev client origin into the production policy', async () => {
    const res = await fetch(`${base}/`);
    const csp = res.headers.get('content-security-policy') || '';
    expect(csp).toMatch(/connect-src 'self'/);
    // The SPA is same-origin in production, so the dev server has no business
    // being an allowed connection target.
    expect(csp).not.toMatch(/connect-src[^;]*5173/);
  });
});
