/**
 * Test helpers shared by the browser scripts.
 */
import { chromium } from 'playwright-core';

export const BASE = 'http://localhost:5173';
export const API = 'http://localhost:5050/api';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The API rate-limits by device, and a full browser run spends hundreds of
 * requests. When a previous run exhausted the window, the next one would fail
 * with 429s that look like product bugs, so wait the window out first.
 */
export async function waitForRateLimit(api = API) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const res = await fetch(`${api}/health`);
      if (res.status !== 429) {
        if (attempt > 0) console.log(`  (waited out a rate-limit window, ${attempt} checks)`);
        return true;
      }
      const retryAfter = Number(res.headers.get('retry-after'));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? (retryAfter + 2) * 1000 : 5000;
      if (attempt === 0) console.log('  (rate-limit window active — waiting for it to reset)');
      await sleep(Math.min(waitMs, 35_000));
    } catch {
      await sleep(2000);
    }
  }
  return false;
}

export { chromium, sleep };
