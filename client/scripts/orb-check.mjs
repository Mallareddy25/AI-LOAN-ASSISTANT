/**
 * Measures whether the assistant orb is actually discernible against the page,
 * in both themes, by reading back rendered pixels.
 *
 * This exists because "does the glow survive a light background" cannot be
 * answered by a contrast audit: the orb and its bloom are decorative, not text,
 * so they never appear in a WCAG text check. Screenshots are decoded with the
 * browser's own image decoder, so no image library is needed.
 */
import { chromium } from 'playwright-core';

const BASE = 'http://localhost:5173';

/** Decode a PNG buffer in the browser and return per-pixel luminance stats. */
const MEASURE = async (dataUrl) => {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, c.width, c.height);

  const lin = (v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

  const lums = [];
  let rs = 0;
  let gs = 0;
  let bs = 0;
  for (let i = 0; i < data.length; i += 4) {
    rs += data[i];
    gs += data[i + 1];
    bs += data[i + 2];
    lums.push(lum(data[i], data[i + 1], data[i + 2]));
  }
  const n = lums.length;
  const mean = lums.reduce((a, b2) => a + b2, 0) / n;
  const variance = lums.reduce((a, l2) => a + (l2 - mean) ** 2, 0) / n;
  const sorted = [...lums].sort((a, b2) => a - b2);
  return {
    mean,
    stddev: Math.sqrt(variance),
    p05: sorted[Math.floor(n * 0.05)],
    p95: sorted[Math.floor(n * 0.95)],
    avg: [Math.round(rs / n), Math.round(gs / n), Math.round(bs / n)],
  };
};

const ratio = (a, b2) => (Math.max(a, b2) + 0.05) / (Math.min(a, b2) + 0.05);

const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const blank = await (await browser.newContext()).newPage();
await blank.goto('about:blank');

let failures = 0;
const log = (label, ok, detail) => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`);
};

for (const theme of ['light', 'dark']) {
  await page.addInitScript((t) => localStorage.setItem('loan-assistant-theme', t), theme);
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  const applied = await page.evaluate(() => document.documentElement.dataset.theme);
  if (applied !== theme) {
    log(`theme applied (${theme})`, false, `got ${applied}`);
    continue;
  }

  // The hero orb, and a patch of the same surface far away from it.
  const orb = page.locator('[role="img"][aria-label="AI Loan Assistant"]').first();
  const box = await orb.boundingBox();
  if (!box) {
    log(`hero orb found (${theme})`, false, 'no bounding box');
    continue;
  }
  const clip = {
    x: Math.round(box.x - 40),
    y: Math.round(box.y - 40),
    width: Math.round(box.width + 80),
    height: Math.round(box.height + 80),
  };
  const orbShot = (await page.screenshot({ clip })).toString('base64');

  const refClip = {
    x: clip.x + clip.width - 46,
    y: clip.y,
    width: 40,
    height: 40,
  };
  const refShot = (await page.screenshot({ clip: refClip })).toString('base64');

  const stats = await blank.evaluate(
    async ([a, r, fn]) => {
      const load = (b64) =>
        new Promise((res) => {
          const i = new Image();
          i.onload = () => res(i);
          i.src = 'data:image/png;base64,' + b64;
        });
      const calc = (img) => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        const lin = (v) => {
          const s = v / 255;
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        const lums = [];
        for (let i = 0; i < d.length; i += 4)
          lums.push(0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]));
        const n = lums.length;
        const mean = lums.reduce((x, y) => x + y, 0) / n;
        const varr = lums.reduce((x, y) => x + (y - mean) ** 2, 0) / n;
        const sorted = [...lums].sort((x, y) => x - y);
        return {
          mean,
          stddev: Math.sqrt(varr),
          p05: sorted[Math.floor(n * 0.05)],
          p95: sorted[Math.floor(n * 0.95)],
        };
      };
      return { orb: calc(await load(a)), ref: calc(await load(r)), fn };
    },
    [orbShot, refShot],
  );

  const { orb: o, ref } = stats;
  const contrast = ratio(o.p95, o.p05);
  const devFromBg = ratio(o.mean, ref.mean);

  log(
    `orb is discernible against the page (${theme})`,
    contrast >= 1.6,
    `core-vs-edge contrast ${contrast.toFixed(2)}:1 (needs >= 1.6)`,
  );
  log(
    `bloom registers against the local surface (${theme})`,
    devFromBg >= 1.02,
    `region mean vs background ${devFromBg.toFixed(3)}:1, pixel spread ${o.stddev.toFixed(4)}`,
  );
}

console.log(failures ? `\n${failures} check(s) failed` : '\norb legibility holds in both themes');
await browser.close();
process.exit(failures ? 1 : 0);
