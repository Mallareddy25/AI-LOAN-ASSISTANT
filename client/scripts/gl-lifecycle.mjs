/**
 * Checks that the shared WebGL scene releases its resources when it unmounts.
 *
 * The scene is mounted on six routes and torn down on the others, so every
 * navigation cycles the renderer. Chrome destroys the oldest context once a
 * page exceeds roughly sixteen, which shows up as a "Too many active WebGL
 * contexts" warning and a black canvas long before any test notices, so the
 * check watches for that directly as well as watching the heap for growth.
 */
import { chromium, waitForRateLimit } from './lib/harness.mjs';

const BASE = 'http://localhost:5173';
const CYCLES = 5;
const IMMERSIVE = '/calculator'; // mounts the scene
const PLAIN = '/chat'; // does not

const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);

const messages = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') messages.push(`${m.type()}: ${m.text().slice(0, 140)}`);
});
page.on('pageerror', (e) => messages.push('pageerror: ' + String(e).slice(0, 120)));

let failures = 0;
const log = (label, ok, detail) => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`);
};

const heap = async () => {
  const { metrics } = await cdp.send('Performance.getMetrics');
  return metrics.find((m) => m.name === 'JSHeapUsedSize')?.value ?? 0;
};

// Ten navigations, each fetching knowledge data, so claim a window up front
// rather than measuring a half-throttled run.
await waitForRateLimit();

// Warm up so the first sample is not dominated by module loading.
await page.goto(`${BASE}${IMMERSIVE}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
const canvasesUp = await page.locator('canvas').count();
log('the immersive route mounts a canvas', canvasesUp === 1, `${canvasesUp} canvas`);

const samples = [];
for (let i = 1; i <= CYCLES; i += 1) {
  await page.goto(`${BASE}${PLAIN}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const away = await page.locator('canvas').count();
  if (away !== 0) log(`cycle ${i}: canvas released on leaving`, false, `${away} still present`);

  await page.goto(`${BASE}${IMMERSIVE}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const back = await page.locator('canvas').count();
  const used = await heap();
  samples.push(used);
  if (back !== 1) log(`cycle ${i}: canvas remounts`, false, `${back} canvases`);
}

// Leave it unmounted and confirm the DOM really is clean.
await page.goto(`${BASE}${PLAIN}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const finalCanvases = await page.locator('canvas').count();
log('the canvas is removed from the DOM on a non-immersive route', finalCanvases === 0, `${finalCanvases} canvases`);

const growth = samples[samples.length - 1] - samples[0];
const perCycle = growth / (samples.length - 1);
log(
  'the heap does not grow without bound across mount cycles',
  perCycle < 1.5 * 1024 * 1024,
  `${(perCycle / 1024 / 1024).toFixed(2)} MB per cycle over ${CYCLES} cycles ` +
    `(${(growth / 1024 / 1024).toFixed(2)} MB total)`,
);

const glWarnings = messages.filter((m) => /webgl|context lost|too many active/i.test(m));
log(
  'Chrome never reports a WebGL context problem',
  glWarnings.length === 0,
  glWarnings.join(' | ') || 'no WebGL warnings',
);

// 429s are this script's own doing — it navigates more than any other suite —
// and say nothing about resource lifecycle, so they are reported but not failed.
const throttled = messages.filter((m) => /429/.test(m)).length;
const other = messages.filter(
  (m) => !/webgl|context lost|too many active/i.test(m) && !/429/.test(m),
);
log(
  'no other console errors during the cycles',
  other.length === 0,
  other.join(' | ') || (throttled ? `clean apart from ${throttled} rate-limit responses` : 'clean'),
);

await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nthe scene releases its resources cleanly');
process.exit(failures ? 1 : 0);
