import { chromium } from 'playwright-core';

const route = process.argv[2] || '/';
const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on('console', (m) => console.log(`CONSOLE[${m.type()}]`, m.text().slice(0, 500)));
page.on('pageerror', (e) => console.log('PAGEERROR', String(e.stack || e).slice(0, 1200)));
page.on('response', (r) => {
  if (r.status() >= 400) console.log('HTTP', r.status(), r.url());
});

await page.goto(`http://localhost:5173${route}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

console.log('--- URL:', page.url());
console.log('--- BODY TEXT ---');
console.log((await page.evaluate(() => document.body.innerText)).slice(0, 1200));
console.log('--- ROOT HTML (first 1500) ---');
const html = await page.evaluate(() => document.getElementById('root')?.innerHTML || 'NO ROOT');
console.log(html.slice(0, 1500) || '(empty)');

await browser.close();
