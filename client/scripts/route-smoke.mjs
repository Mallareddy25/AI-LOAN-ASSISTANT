/**
 * Route smoke test: visits every route, records console errors/warnings and
 * failed network requests, and reports the rendered text length so a blank or
 * error page cannot pass silently.
 */
import { chromium, waitForRateLimit } from './lib/harness.mjs';

await waitForRateLimit();

const BASE = 'http://localhost:5173';

const ROUTES = [
  ['/', 'home'],
  ['/loans', 'loans'],
  ['/loans/home-loan', 'loan detail'],
  ['/loans/personal-loan', 'loan detail 2'],
  ['/glossary', 'glossary'],
  ['/glossary/emi', 'term detail'],
  ['/eligibility', 'eligibility'],
  ['/documents', 'documents'],
  ['/repayment', 'repayment'],
  ['/calculator', 'calculator'],
  ['/faqs', 'faqs'],
  ['/chat', 'chat'],
  ['/login', 'login'],
  ['/register', 'register'],
  ['/dashboard', 'dashboard (guard)'],
  ['/admin', 'admin (guard)'],
  ['/nope-does-not-exist', '404'],
];

const IGNORE = [
  /favicon/i,
  /Download the React DevTools/i,
  /webgl/i,
  /GPU stall/i,
  /SwiftShader/i,
  // Generic resource messages carry no URL; the response handler below reports
  // real network failures with their URL, so ignore the bare console echo.
  /Failed to load resource/i,
];

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});

const results = [];

for (const [route, label] of ROUTES) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const failed = [];

  page.on('console', (msg) => {
    if (msg.type() !== 'error' && msg.type() !== 'warning') return;
    const text = msg.text();
    if (IGNORE.some((re) => re.test(text))) return;
    consoleErrors.push(`[${msg.type()}] ${text.slice(0, 260)}`);
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(`[pageerror] ${String(err).slice(0, 260)}`);
  });
  page.on('requestfailed', (req) => {
    const failure = req.failure()?.errorText || '';
    if (IGNORE.some((re) => re.test(req.url()))) return;
    failed.push(`${req.method()} ${req.url().replace(BASE, '')} — ${failure}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      const url = res.url();
      if (IGNORE.some((re) => re.test(url))) return;
      failed.push(`${res.status()} ${url.replace(BASE, '')}`);
    }
  });

  let textLength = 0;
  let finalUrl = '';
  try {
    const res = await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
    if (!res) throw new Error('no response');

    // `innerText` only counts *rendered* text, and entrance animations start at
    // opacity 0 — so wait for the hero heading/label to become visible, then
    // measure. Measuring immediately would under-report every animated page.
    await page
      .waitForFunction(
        () => {
          const body = document.body.innerText || '';
          return body.trim().length > 200;
        },
        { timeout: 15000 },
      )
      .catch(() => {});

    await page.waitForTimeout(600);
    textLength = (await page.evaluate(() => document.body.innerText || '')).trim().length;
    finalUrl = page.url().replace(BASE, '') || '/';
  } catch (err) {
    consoleErrors.push(`[navigation] ${String(err).slice(0, 200)}`);
  }

  results.push({ route, label, finalUrl, textLength, consoleErrors, failed });
  await context.close();
}

await browser.close();

let bad = 0;
for (const r of results) {
  const ok = r.textLength > 200 && r.consoleErrors.length === 0 && r.failed.length === 0;
  if (!ok) bad += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.route.padEnd(24)} ${r.label}`);
  if (r.finalUrl !== r.route) console.log(`        → redirected to ${r.finalUrl}`);
  console.log(`        text=${r.textLength}`);
  r.failed.forEach((f) => console.log(`        NET  ${f}`));
  r.consoleErrors.forEach((c) => console.log(`        CON  ${c}`));
}
console.log(`\n${results.length - bad}/${results.length} routes clean`);
