#!/usr/bin/env node
// Visual QA harness for the SlimeVR BMI160 installer workspace.
// Boots a local static server, walks through every step on multiple viewports,
// captures a full-page screenshot, extracts computed styles for key selectors,
// and runs a WCAG contrast check for text-vs-surface pairings.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const siteDir = resolve(repoRoot, 'site');
const outDir = resolve(repoRoot, '.visual-qa');
const screenshotsDir = join(outDir, 'screenshots');
const computedDir = join(outDir, 'computed');
const contrastDir = join(outDir, 'contrast');

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1920', width: 1920, height: 1080 },
  { name: 'tablet-1024', width: 1024, height: 1366 },
  { name: 'mobile-390', width: 390, height: 844 },
];

const STEPS = [
  { id: 'step-0', name: 'inspect' },
  { id: 'step-1', name: 'flash' },
  { id: 'step-2', name: 'wifi' },
  { id: 'step-3', name: 'verify' },
  { id: 'step-4', name: 'serial-log' },
];

const KEY_SELECTORS = [
  'body',
  '.container',
  'header',
  '.brand h1',
  '.brand small',
  '.header-meta',
  '.eyebrow',
  '.header-meta-value',
  '.status-bar',
  '.status-led',
  '.status-text',
  '.step-rail',
  '.rail-title',
  '.step-item',
  '.step-item .step-copy strong',
  '.step-item .step-copy small',
  'main',
  '.step-title',
  '.step-instruction',
  '.section-kicker',
  '.hero-cta',
  '.hero-cta-body',
  '.hero-chip',
  '.kpi',
  '.kpi-label',
  '.kpi-value',
  '.device-hero',
  '.device-hero-icon',
  '.before-start',
  '.check-list li',
  '.btn-primary',
  '.btn-secondary',
  '.btn-hero',
  '.form-group label',
  '.form-input',
  '.status-log',
  '.status-line',
  '#live-log',
  '#wifi-status',
  'footer',
];

function relativeLuminance([r, g, b]) {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(rgb1, rgb2) {
  const L1 = relativeLuminance(rgb1);
  const L2 = relativeLuminance(rgb2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseRgba(input) {
  const rgbaMatch = input.match(/rgba?\(([^)]+)\)/i);
  if (!rgbaMatch) return null;
  const parts = rgbaMatch[1].split(',').map((s) => s.trim());
  const r = Number(parts[0]);
  const g = Number(parts[1]);
  const b = Number(parts[2]);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return [r, g, b];
}

function flattenAlphaColor(rgbaStr, parentRgbaStr) {
  const own = parseRgba(rgbaStr);
  if (!own) return null;
  const ownAlpha = rgbaStr.includes('rgba') ? Number(rgbaStr.match(/,\s*([\d.]+)\s*\)/)?.[1] ?? '1') : 1;
  if (ownAlpha >= 0.999) {
    return own.map((c) => Math.round(c));
  }
  const bg = parseRgba(parentRgbaStr) ?? [0, 0, 0];
  const blended = own.map((c, i) => Math.round(c * ownAlpha + bg[i] * (1 - ownAlpha)));
  return blended;
}

function findSurface(node) {
  let cur = node;
  while (cur) {
    const bg = cur.bg;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
      return bg;
    }
    cur = cur.parent;
  }
  return 'rgb(255, 255, 255)';
}

async function run() {
  console.log('[qa] booting local server...');
  const port = 4173;
  const server = spawn(process.execPath, [], {
    stdio: ['ignore', 'pipe', 'pipe'],
  }).on('error', () => {});

  await new Promise((resolveBoot) => {
    let booted = false;
    server.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      if (!booted && text.includes('READY')) {
        booted = true;
        resolveBoot();
      }
    });
    setTimeout(resolveBoot, 800);
  });
}

async function startServer() {
  const { default: http } = await import('node:http');
  const { readFile } = await import('node:fs/promises');
  const { extname, join } = await import('node:path');

  const port = 4173;
  const server = http.createServer(async (req, res) => {
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
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
      };
      res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-store');
      res.end(data);
    } catch (e) {
      res.statusCode = 404;
      res.end('not found');
    }
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  console.log(`[qa] server ready at http://127.0.0.1:${port}`);
  return { server, port };
}

async function navigateToStep(page, stepId) {
  const idx = parseInt(String(stepId).replace('step-', ''), 10);
  await page.evaluate((id) => {
    const items = document.querySelectorAll('.step-item');
    const contents = document.querySelectorAll('.step-content');
    items.forEach((it, j) => {
      it.classList.toggle('is-active', j === id);
      it.classList.toggle('is-complete', j < id);
    });
    contents.forEach((c, j) => c.classList.toggle('hidden', j !== id));
    const live = document.getElementById('live-log');
    if (live) live.classList.toggle('is-empty', live.textContent.trim() === '');
  }, idx);
  await delay(120);
}

async function extractComputed(page) {
  return page.evaluate((selectors) => {
    const traverse = (node, depth) => {
      const bg = window.getComputedStyle(node).backgroundColor;
      const inner = window.getComputedStyle(node).backgroundImage;
      return { bg, inner, children: [] };
    };
    const out = {};
    selectors.forEach((sel) => {
      const node = document.querySelector(sel);
      if (!node) {
        out[sel] = { present: false };
        return;
      }
      const cs = window.getComputedStyle(node);
      const data = {
        present: true,
        color: cs.color,
        backgroundColor: cs.backgroundColor,
        backgroundImage: cs.backgroundImage.length > 200 ? cs.backgroundImage.slice(0, 200) + '...' : cs.backgroundImage,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        opacity: cs.opacity,
        visibility: cs.visibility,
        display: cs.display,
        zIndex: cs.zIndex,
        marginTop: cs.marginTop,
        marginBottom: cs.marginBottom,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        width: cs.width,
        height: cs.height,
        borderRadius: cs.borderRadius,
        filter: cs.filter,
        position: cs.position,
        overflow: cs.overflow,
      };
      let cur = node;
      const ancestors = [];
      let hop = 0;
      while (cur && hop < 8) {
        ancestors.push({ tag: cur.tagName, cls: cur.className?.toString?.() ?? '', bg: window.getComputedStyle(cur).backgroundColor });
        cur = cur.parentElement;
        hop++;
      }
      data.ancestorBg = ancestors;
      out[sel] = data;
    });
    return out;
  }, KEY_SELECTORS);
}

function contrastReport(computed) {
  const findings = [];
  for (const [sel, data] of Object.entries(computed)) {
    if (!data.present) continue;
    const own = parseRgba(data.color);
    if (!own) continue;
    const ownAlpha = data.color.includes('rgba') ? Number(data.color.match(/,\s*([\d.]+)\s*\)/)?.[1] ?? '1') : 1;
    if (ownAlpha < 0.99) continue;
    const surfaceBg = data.ancestorBg.find((a) => a.bg !== 'rgba(0, 0, 0, 0)' && a.bg !== 'transparent')?.bg
      ?? 'rgb(11, 13, 16)';
    const blended = flattenAlphaColor(surfaceBg, 'rgb(11, 13, 16)');
    if (!blended) continue;
    const ratio = contrastRatio(own, blended);
    const fontPx = Number(String(data.fontSize).replace('px', '')) || 14;
    const threshold = fontPx >= 18 ? 3.0 : 4.5;
    findings.push({
      selector: sel,
      color: data.color,
      surface: surfaceBg,
      ratio: Number(ratio.toFixed(2)),
      threshold,
      pass: ratio >= threshold,
      fontSize: data.fontSize,
    });
  }
  return findings;
}

async function checkOverflow(page) {
  return page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    const overflowX = html.scrollWidth - html.clientWidth;
    const overflowY = html.scrollHeight - html.clientHeight;
    const outOfViewport = [];
    document.querySelectorAll('h1, h2, h3, p, button, a, .kpi, .step-item, .status-bar').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.right > html.clientWidth + 1) {
        outOfViewport.push({
          selector: el.tagName + (el.className?.toString ? '.' + el.className.toString().replace(/\s+/g, '.') : ''),
          right: Math.round(rect.right),
          clientWidth: html.clientWidth,
        });
      }
    });
    return {
      overflowX,
      overflowY,
      bodyScrollWidth: body.scrollWidth,
      clientWidth: html.clientWidth,
      outOfViewport: outOfViewport.slice(0, 30),
      heightIssues: Array.from(document.querySelectorAll('.step-content:not(.hidden)')).map((el) => ({
        id: el.id,
        height: Math.round(el.getBoundingClientRect().height),
      })),
    };
  });
}

async function main() {
  const args = process.argv.slice(2);
  const skipBrowser = args.includes('--no-browser');
  const onlyViewport = args.find((a) => a.startsWith('--viewport='))?.split('=')[1];

  for (const dir of [screenshotsDir, computedDir, contrastDir]) {
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  }
  const { server } = await startServer();
  const browser = await chromium.launch();
  try {
    for (const vp of VIEWPORTS) {
      if (onlyViewport && vp.name !== onlyViewport) continue;
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
      await page.goto(`http://127.0.0.1:4173/`, { waitUntil: 'networkidle' });
      await delay(300);

      for (const step of STEPS) {
        await navigateToStep(page, step.id);
        await delay(150);
        await page.screenshot({
          path: join(screenshotsDir, `${vp.name}-${step.name}.png`),
          fullPage: true,
        });
        const data = await extractComputed(page);
        await writeFile(join(computedDir, `${vp.name}-${step.name}.json`), JSON.stringify(data, null, 2));
        const c = contrastReport(data);
        await writeFile(join(contrastDir, `${vp.name}-${step.name}.json`), JSON.stringify(c, null, 2));
        const overflow = await checkOverflow(page);
        await writeFile(join(contrastDir, `${vp.name}-${step.name}-overflow.json`), JSON.stringify(overflow, null, 2));
        const fails = c.filter((f) => !f.pass).length;
        console.log(`[qa] ${vp.name} / ${step.name} → contrast fails=${fails}, overflowX=${overflow.overflowX}, h=${overflow.heightIssues.map(h => h.height).join(',')}`);
        if (errors.length) console.log(`[qa] errors:`, errors.slice(0, 5));
      }
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
