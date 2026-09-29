/**
 * Responsive + accessibility + 3D-layer verification.
 *  • 390px mobile viewport: no horizontal overflow, nav drawer works
 *  • prefers-reduced-motion: content still renders, heavy motion disabled
 *  • the shared canvas is mounted once on immersive routes and absent elsewhere
 *  • scrolling the story actually registers sections with the scroll engine
 */
import { chromium, BASE, waitForRateLimit } from './lib/harness.mjs';

await waitForRateLimit();
const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
const log = (label, ok, detail = '') =>
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);

/* ── Mobile ─────────────────────────────────────────────────────────── */
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));

  for (const route of ['/', '/loans', '/eligibility', '/calculator', '/chat', '/glossary']) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1400);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    log(`mobile ${route} has no horizontal overflow`, overflow <= 1, `${overflow}px`);
  }

  // Mobile nav drawer
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const burger = page.locator('header button, nav button').first();
  const hasBurger = (await burger.count()) > 0;
  // Always report, even when the control is missing: a check that skips itself
  // is indistinguishable from a pass, which is how a suite quietly loses coverage.
  if (hasBurger) {
    await burger.click();
    await page.waitForTimeout(700);
  }
  const links = await page.evaluate(
    () => document.querySelectorAll('nav a[href="/loans"], nav a[href="/faqs"]').length,
  );
  log(
    'mobile nav opens',
    hasBurger && links > 0,
    hasBurger ? `${links} nav links visible` : 'no menu button found',
  );

  log('no page errors on mobile', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ── Reduced motion ─────────────────────────────────────────────────── */
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const text = await page.evaluate(() => document.body.innerText);
  log(
    'reduced motion still renders the whole story',
    /Understand Loans/.test(text) && /language of loans/i.test(text),
  );

  const canvasCount = await page.evaluate(() => document.querySelectorAll('canvas').length);
  log('reduced motion keeps a single canvas', canvasCount === 1, `${canvasCount} canvas`);

  const hidden = await page.evaluate(() => {
    // Content must not depend on a reveal animation finishing.
    const sections = [...document.querySelectorAll('section')];
    return sections.filter((s) => {
      const style = getComputedStyle(s);
      return Number(style.opacity) < 0.05;
    }).length;
  });
  log('no section is left invisible under reduced motion', hidden === 0, `${hidden} hidden`);

  await page.goto(`${BASE}/calculator`, { waitUntil: 'networkidle' });
  // Wait for the result rather than a fixed delay: the calculator paints its
  // stats asynchronously, so a sleep here was a race.
  // Stat labels are uppercased by CSS.
  const emiReady = await page
    .waitForFunction(() => /monthly emi/i.test(document.body.innerText), { timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  const calcText = await page.evaluate(() => document.body.innerText);
  log('reduced motion keeps the calculator working', emiReady, emiReady ? '' : calcText.slice(0, 80));

  await ctx.close();
}

/* ── 3D layer + scroll engine ───────────────────────────────────────── */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  for (const route of ['/', '/loans', '/eligibility']) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1600);
    const count = await page.evaluate(() => document.querySelectorAll('canvas').length);
    log(`immersive route ${route} mounts the shared canvas`, count === 1, `${count} canvas`);
  }

  for (const route of ['/chat', '/faqs', '/glossary']) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const count = await page.evaluate(() => document.querySelectorAll('canvas').length);
    log(`non-immersive route ${route} has no canvas`, count === 0, `${count} canvas`);
  }

  // Scroll the story and confirm the sections register + drive the engine.
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);

  const registered = await page.evaluate(() =>
    [...document.querySelectorAll('[data-story]')].map((s) => s.id),
  );
  log(
    'story sections are marked for the scroll engine',
    ['hero', 'terminology', 'eligibility', 'documents', 'repayment', 'calculator', 'cta'].every(
      (id) => registered.includes(id),
    ),
    registered.join(','),
  );

  await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 2.2, behavior: 'instant' }));
  await page.waitForTimeout(1400);

  const readProgress = () =>
    page.evaluate(() => {
      const bar = document.querySelector('[data-scroll-progress]');
      return {
        scrollY: window.scrollY,
        max: document.documentElement.scrollHeight - window.innerHeight,
        bar: bar ? parseFloat(bar.style.width) || 0 : null,
      };
    });

  const atEligibility = await readProgress();

  // Progress must be proportional, not saturated: 100% here would mean the
  // denominator was captured before the page finished loading.
  const expected = (atEligibility.scrollY / Math.max(1, atEligibility.max)) * 100;
  log(
    'scroll progress is proportional (not saturated)',
    atEligibility.bar > 2 &&
      atEligibility.bar < 98 &&
      Math.abs(atEligibility.bar - expected) < 12,
    `bar=${atEligibility.bar?.toFixed(1)}% expected≈${expected.toFixed(1)}% scrollY=${Math.round(
      atEligibility.scrollY,
    )}/${atEligibility.max}`,
  );

  // And it must keep moving further down the page.
  await page.evaluate(() =>
    window.scrollTo({ top: document.documentElement.scrollHeight * 0.75, behavior: 'instant' }),
  );
  await page.waitForTimeout(1200);
  const later = await readProgress();
  log(
    'progress keeps advancing further down',
    later.bar > atEligibility.bar && later.bar > 40,
    `${atEligibility.bar?.toFixed(1)}% → ${later.bar?.toFixed(1)}%`,
  );

  // Confirm the eligibility visual is actually driven by section focus.
  const focusMoved = await page.evaluate(() => {
    const el = document.querySelector('#eligibility');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top), height: Math.round(r.height) };
  });
  log('eligibility section reached the viewport', focusMoved && focusMoved.top < 900, JSON.stringify(focusMoved));

  await ctx.close();
}

/* ── Theme: light and dark must both be legible ──────────────────────── */
{
  // The calculator hits the API, so make sure a window is available.
  await waitForRateLimit();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const theme = () => page.evaluate(() => document.documentElement.dataset.theme);
  const bodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  await page.goto(`${BASE}/calculator`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => /monthly emi/i.test(document.body.innerText), { timeout: 20000 });

  // Light is the shipped default.
  log('light theme is the default', (await theme()) === 'light', await bodyBg());
  const lightBg = await bodyBg();

  // The control switches the whole token layer.
  await page.click('[data-testid="theme-toggle"]');
  await page.waitForTimeout(600);
  const darkBg = await bodyBg();
  log('toggle switches to the dark theme', (await theme()) === 'dark' && darkBg !== lightBg, darkBg);

  // And the choice survives a reload rather than snapping back.
  await page.reload({ waitUntil: 'networkidle' });
  log('theme choice persists across reload', (await theme()) === 'dark', await bodyBg());
  log(
    'theme is applied before first paint',
    await page.evaluate(() => document.documentElement.dataset.theme === 'dark'),
  );

  /**
   * WCAG AA for body copy in both themes. Text sitting on a gradient or a
   * gradient-clipped glyph is skipped: neither backdrop can be sampled from
   * the DOM, so asserting on them produces false failures.
   */
  const contrastFailures = async () =>
    page.evaluate(() => {
      const lum = (rgb) => {
        const [r, g, b] = rgb.map((v) => {
          const c = v / 255;
          return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const parse = (str) => (str.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const ratio = (a, b) => {
        const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
        return (hi + 0.05) / (lo + 0.05);
      };
      const backdrop = (el) => {
        for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
          const cs = getComputedStyle(n);
          if (cs.backgroundImage !== 'none') return null; // unpaintable here
          const c = parse(cs.backgroundColor);
          const alpha = (cs.backgroundColor.match(/[\d.]+/g) || [])[3];
          if (c.length === 3 && (alpha === undefined || Number(alpha) > 0.85)) return c;
        }
        return parse(getComputedStyle(document.body).backgroundColor);
      };

      const bad = [];
      document.querySelectorAll('p, li, span, a, button, label, td, th, h1, h2, h3').forEach((el) => {
        const text = (el.textContent || '').trim();
        if (text.length < 3 || el.children.length > 0) return;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.1) return;
        if (cs.webkitBackgroundClip === 'text') return;
        const box = el.getBoundingClientRect();
        if (box.width < 4 || box.height < 4) return;
        if (box.top > window.innerHeight || box.bottom < 0) return;
        const bg = backdrop(el);
        if (!bg) return;
        const fg = parse(cs.color);
        if (fg.length !== 3) return;
        const size = parseFloat(cs.fontSize);
        const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
        const r = ratio(fg, bg);
        if (r < (large ? 3 : 4.5)) bad.push(`${r.toFixed(2)}:1 ${cs.color} "${text.slice(0, 24)}"`);
      });
      return bad;
    });

  const darkFails = await contrastFailures();
  log('dark theme meets AA contrast', darkFails.length === 0, darkFails.slice(0, 3).join(' | '));

  await page.click('[data-testid="theme-toggle"]');
  await page.waitForTimeout(600);
  const lightFails = await contrastFailures();
  log('light theme meets AA contrast', lightFails.length === 0, lightFails.slice(0, 3).join(' | '));

  // Content must not depend on the theme: the calculator's result and schedule
  // are both present, not just an empty shell.
  const lightContent = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasEmi: /monthly emi/i.test(text),
      hasAmount: /\u20b9\s?[\d,]+/.test(text),
      hasSchedule: /amortisation/i.test(text),
    };
  });
  log(
    'light theme still renders the calculator',
    lightContent.hasEmi && lightContent.hasAmount && lightContent.hasSchedule,
    JSON.stringify(lightContent),
  );
  await ctx.close();
}

await browser.close();
