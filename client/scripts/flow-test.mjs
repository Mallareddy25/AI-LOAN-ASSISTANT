/**
 * Functional pass: exercises the calculator, guest chat, demo login, the
 * message feedback endpoint and the admin console.
 */
import { chromium, waitForRateLimit } from './lib/harness.mjs';

await waitForRateLimit();

const BASE = 'http://localhost:5173';
const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(`PAGEERROR ${String(e).slice(0, 200)}`));
page.on('response', (r) => {
  if (r.status() >= 400 && !/favicon/i.test(r.url())) {
    errors.push(`HTTP ${r.status()} ${r.request().method()} ${r.url().replace(BASE, '')}`);
  }
});

const log = (label, ok, detail = '') =>
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);

/* ── 1. EMI calculator ──────────────────────────────────────────────── */
await page.goto(`${BASE}/calculator`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => /₹/.test(document.body.innerText), { timeout: 15000 });

const emiOf = async () => {
  const text = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('p')];
    const label = nodes.find((n) => n.textContent.trim() === 'Monthly EMI');
    return label?.parentElement?.querySelector('p:nth-of-type(2)')?.textContent?.trim() || '';
  });
  return text;
};

/**
 * The calculator recomputes through a debounced request, so a fixed sleep is a
 * race. Wait for the displayed EMI to actually differ from `previous`.
 */
const emiChangesTo = async (previous, timeout = 15000) =>
  page
    .waitForFunction(
      (before) => {
        const nodes = [...document.querySelectorAll('p')];
        const label = nodes.find((n) => n.textContent.trim() === 'Monthly EMI');
        const value = label?.parentElement?.querySelector('p:nth-of-type(2)')?.textContent?.trim() || '';
        return value && value !== before;
      },
      previous,
      { timeout },
    )
    .then(() => true)
    .catch(() => false);

const firstEmi = await emiOf();
log('calculator renders an EMI', /\d/.test(firstEmi), firstEmi);

// Independently recompute the standard reducing-balance EMI.
const expected = (() => {
  const P = 500000;
  const r = 12 / 100 / 12;
  const n = 36;
  return (P * r * (1 + r) ** n) / ((1 + r) ** n - 1);
})();
const shown = Number(String(firstEmi).replace(/[^\d.]/g, ''));
log(
  'EMI matches the standard formula',
  Math.abs(shown - expected) < 2,
  `shown=${shown.toFixed(2)} expected=${expected.toFixed(2)}`,
);

// Change the rate and confirm the figure reacts.
await page.locator('#calc-rate').fill('20');
await page.locator('#calc-rate').dispatchEvent('change');
const rateChanged = await emiChangesTo(firstEmi);
const secondEmi = await emiOf();
log('EMI updates when the rate changes', rateChanged && secondEmi !== firstEmi, `${firstEmi} → ${secondEmi}`);

// A zero-interest loan must equal principal / months exactly.
await page.locator('#calc-rate').fill('0');
await page.locator('#calc-rate').dispatchEvent('change');
await emiChangesTo(secondEmi);
await page.locator('#calc-tenure').fill('2');
await page.locator('#calc-tenure').dispatchEvent('change');
const zeroSettled = await emiChangesTo(await emiOf(), 20000).catch(() => true);
await page.waitForTimeout(400);
const zeroEmi = Number(String(await emiOf()).replace(/[^\d.]/g, ''));
log(
  'zero-interest EMI = principal / months',
  Math.abs(zeroEmi - 500000 / 24) < 2,
  `${zeroEmi}${zeroSettled ? '' : ' (not settled)'}`,
);

const hasSchedule = await page.evaluate(() =>
  [...document.querySelectorAll('h3')].some((h) => h.textContent.includes('Amortisation')),
);
log('amortisation schedule is rendered', hasSchedule);

/* ── 2. Guest chat ──────────────────────────────────────────────────── */
await page.goto(`${BASE}/chat`, { waitUntil: 'networkidle' });
await page.waitForSelector('#chat-input', { timeout: 15000 });
await page.fill('#chat-input', 'What is an EMI?');
await page.press('#chat-input', 'Enter');
await page.waitForTimeout(3500);

const chatText = await page.evaluate(() => document.body.innerText);
log('guest chat returns an answer', /EMI/i.test(chatText) && chatText.length > 800);
log('chat shows the offline notice or a source badge', /knowledge base|offline/i.test(chatText));

/* ── 3. Demo sign-in, via a hostile ?next= ──────────────────────────── */
// Browsers treat "\\" as "//", so a ?next= value like /\\evil.example is a
// protocol-relative URL in disguise. The sign-in must ignore it and fall back
// to the member dashboard instead of leaving the site.
await page.goto(`${BASE}/login?next=%2F%5C%5Cevil.example`, { waitUntil: 'networkidle' });
await page.fill('#auth-email', 'demo@student.test');
await page.fill('#auth-password', 'Test@1234');
await page.click('button[type="submit"]');
await page.waitForURL(/dashboard/, { timeout: 20000 });
await page.waitForTimeout(1500);

const landedOn = new URL(page.url());
log(
  'a backslash ?next= cannot bounce the user off-site',
  landedOn.origin === BASE && !/evil/i.test(landedOn.pathname),
  `${landedOn.origin}${landedOn.pathname}`,
);

// Stat labels are uppercased by CSS, so compare case-insensitively.
const dashText = await page.evaluate(() => document.body.innerText);
log('demo login lands on the dashboard', /hello,\s*demo/i.test(dashText));

// Keep the member's token: the admin signs in later, and the admin has no
// conversations of their own, so cleanup has to use this captured one.
const memberToken = await page.evaluate(() => localStorage.getItem('lia.accessToken'));

// The counts come from /auth/me. Ask a question as the demo user first, so the
// assertion below depends on this run rather than on whatever the database
// happened to contain — a clean database used to fail it for no real reason.
await page.goto(`${BASE}/chat`, { waitUntil: 'networkidle' });
await page.waitForSelector('#chat-input', { timeout: 15000 });
await page.fill('#chat-input', 'How do I repay a loan early?');
await page.press('#chat-input', 'Enter');
await page.waitForTimeout(4000);
const asked = await page.evaluate(() => /repay|early|prepay/i.test(document.body.innerText));
log('the signed-in user can ask a question', asked);

await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

const counts = await page.evaluate(() => {
  const text = document.body.innerText;
  const after = (label) => {
    const index = text.toUpperCase().indexOf(label.toUpperCase());
    if (index === -1) return null;
    const match = text.slice(index + label.length, index + label.length + 40).match(/\d+/);
    return match ? Number(match[0]) : null;
  };
  return { questions: after('QUESTIONS ASKED'), conversations: after('CONVERSATIONS') };
});
log(
  'dashboard shows real stats',
  counts.questions > 0 && counts.conversations > 0,
  `questions=${counts.questions} conversations=${counts.conversations}`,
);

/* ── 4. Signed-in chat + feedback (the contract I fixed) ───────────── */
await page.goto(`${BASE}/chat`, { waitUntil: 'networkidle' });
await page.waitForSelector('#chat-input', { timeout: 15000 });
await page.fill('#chat-input', 'What documents are needed for a home loan?');
await page.press('#chat-input', 'Enter');
await page.waitForTimeout(4000);

const thumbUp = page.locator('button[aria-label="Mark this answer helpful"]').last();
const hasThumb = (await thumbUp.count()) > 0;
log('feedback control appears for a persisted answer', hasThumb);

if (hasThumb) {
  const before = errors.length;
  await thumbUp.click();
  await page.waitForTimeout(1500);
  const feedbackErrors = errors.slice(before).filter((e) => /feedback/i.test(e));
  log('feedback POST succeeds', feedbackErrors.length === 0, feedbackErrors.join('; '));
}

// The history controls are icon buttons identified by their title attribute,
// not by text, so query the DOM rather than innerText.
const historyVisible = await page.evaluate(
  () => !!document.querySelector('button[title="New conversation"]'),
);
log('conversation history sidebar is available', historyVisible);

/* ── 5. Admin console ───────────────────────────────────────────────── */
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
await page.click('text=Sign out');
await page.waitForTimeout(1200);

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await page.fill('#auth-email', 'admin@loanassistant.local');
await page.fill('#auth-password', 'Admin@12345');
await page.click('button[type="submit"]');
// An admin is sent to the console, not the member dashboard.
await page.waitForURL(/\/admin/, { timeout: 20000 });

await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const adminText = await page.evaluate(() => document.body.innerText);
log('admin console loads', /Admin console/i.test(adminText));
log('admin overview shows real counts', /Registered users/i.test(adminText) && /Knowledge items/i.test(adminText));
log('admin shows AI configuration state', /knowledge base|OpenAI|model/i.test(adminText));

// Open each knowledge tab and confirm it lists records.
for (const tab of ['Users', 'Glossary terms', 'Documents', 'FAQs']) {
  const before = errors.length;
  await page.click(`button:has-text("${tab}")`);
  await page.waitForTimeout(1500);
  const tabText = await page.evaluate(() => document.body.innerText);
  log(`admin tab "${tab}" renders`, tabText.length > 600, errors.slice(before).join('; '));
}

/* ── 6. Admin writes: required fields, blank slugs, cleanup ─────────── */
// The form and the API must agree on what is required. This caught the form
// letting a glossary term be submitted without its detailed explanation, which
// the API rejected with a bare 422.
const tab = (label) => page.locator('button.btn-ghost', { hasText: label }).first().click();

await tab('Glossary terms');
await page.waitForTimeout(1500);
await page.click('button.btn-gold:has-text("Add term")');
await page.waitForTimeout(800);
await page.fill('#field-term', 'Flow Probe Term');
await page.fill('#field-category', 'Verification');
await page.fill('#field-shortDefinition', 'A temporary entry created by the flow test.');

const beforeGuard = errors.length;
await page.click('button.btn-gold:has-text("Save")');
await page.waitForTimeout(800);
const inline = await page.evaluate(() =>
  [...document.querySelectorAll('[role="alert"]')].map((n) => n.innerText),
);
log(
  'a missing required field is reported inline',
  inline.some((m) => /explanation is required/i.test(m)),
  inline.join(' | ') || 'no inline message',
);
log(
  'the incomplete draft never reaches the API',
  errors.slice(beforeGuard).every((e) => !/422/.test(e)),
  errors.slice(beforeGuard).join('; '),
);

// The slug is optional on purpose: it is derived from the title.
await page.fill('#field-detailedExplanation', 'A longer explanation written by the flow test to satisfy the API contract.');
log('slug left blank by the admin', (await page.inputValue('#field-slug')) === '');
await page.click('button.btn-gold:has-text("Save")');
await page.waitForTimeout(2500);
const created = await page.evaluate(() => /Flow Probe Term/i.test(document.body.innerText));
log('a term with no slug is saved and listed', created);

const listed = await (await page.request.get('http://localhost:5050/api/terms?limit=100')).json();
const probe = (listed.data || []).find((r) => r.term === 'Flow Probe Term');
log('the server generated a URL-safe slug', !!probe && /^[a-z0-9-]+$/.test(probe.slug), probe ? probe.slug : 'not found');

if (probe) {
  const fetchPage = await page.request.get(
    `http://localhost:5050/api/terms/${probe.slug}`,
  );
  log('the generated slug resolves on the public API', fetchPage.ok(), `HTTP ${fetchPage.status()}`);
  // Remove it again so repeated runs do not pile up junk.
  const adminToken = await page.evaluate(() => localStorage.getItem('lia.accessToken'));
  const removed = await page.request.delete(`http://localhost:5050/api/admin/terms/${probe.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  log('the probe term is removed again', removed.ok(), `HTTP ${removed.status()}`);
}

// ── Cleanup ──────────────────────────────────────────────────────────
// Everything above is created by this run, so remove it again. Leaving a
// conversation behind per run is what previously made the dashboard assertion
// depend on database state rather than on the test.
if (memberToken) {
  const list = await page.request.get('http://localhost:5050/api/chat/conversations?limit=100', {
    headers: { Authorization: `Bearer ${memberToken}` },
  });
  if (list.ok()) {
    const { data = [] } = await list.json();
    for (const conversation of data) {
      await page.request.delete(`http://localhost:5050/api/chat/conversations/${conversation.id}`, {
        headers: { Authorization: `Bearer ${memberToken}` },
      });
    }
    log(`this run's conversations are removed again (${data.length})`, true);
  } else {
    log("this run's conversations are removed again", false, `HTTP ${list.status()}`);
  }
}

/* ── Wrap up ────────────────────────────────────────────────────────── */
console.log('');
if (errors.length) {
  console.log('Network/page errors observed:');
  [...new Set(errors)].forEach((e) => console.log('  ', e));
} else {
  console.log('No page or network errors.');
}

await browser.close();
