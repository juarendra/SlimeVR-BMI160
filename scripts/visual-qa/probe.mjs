import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const port = 4174;
const siteDir = 'D:/Pribadi/SlimeVR-BMI160/site';
const server = createServer(async (req, res) => {
  let url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/' || url === '') url = '/index.html';
  const filePath = join(siteDir, url);
  try {
    const data = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
    };
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.end(data);
  } catch (e) {
    res.statusCode = 404;
    res.end('not found ' + url);
  }
});
await new Promise((r) => server.listen(port, '127.0.0.1', r));
const browser = await chromium.launch();
const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[err] ${e.message}`));
page.on('requestfailed', (r) => logs.push(`[reqfail] ${r.url()} ${r.failure()?.errorText}`));
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });

const dump = await page.evaluate(() => {
  const root = getComputedStyle(document.documentElement);
  const body = getComputedStyle(document.body);
  const stylesheetCount = document.styleSheets.length;
  const sheet0 = document.styleSheets[0];
  let rulesCount = 0;
  let firstFew = [];
  try {
    rulesCount = sheet0.cssRules?.length ?? 0;
    for (let i = 0; i < Math.min(10, rulesCount); i++) {
      firstFew.push(`${sheet0.cssRules[i].selectorText || '@' + i} ${sheet0.cssRules[i].cssText.slice(0, 120)}`);
    }
  } catch (e) {
    firstFew.push('cannot read: ' + e.message);
  }
  return {
    sheets: stylesheetCount,
    rules: rulesCount,
    bodyColor: body.color,
    bodyBg: body.backgroundColor,
    bodyBgImage: body.backgroundImage.slice(0, 80),
    htmlBg: root.backgroundColor,
    '--bg-dark': root.getPropertyValue('--bg-dark').trim(),
    '--text-primary': root.getPropertyValue('--text-primary').trim(),
    '--positron-red': root.getPropertyValue('--positron-red').trim(),
    firstFew,
  };
});
console.log(JSON.stringify(dump, null, 2));
console.log('\n--- logs ---');
logs.forEach((l) => console.log(l));
await browser.close();
server.close();
