// Real Study/preview pages and event handlers; invented questions and isolated storage only.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syntheticPack } from './synthetic-study-pack.mjs';
import { operationQuestions } from './synthetic-math-operations.mjs';
const root = resolve(fileURLToPath(new URL('../../docs/', import.meta.url)));
const out = resolve(process.argv[2] || 'data/private/geometry-scroll-browser');
const { chromium } = createRequire(import.meta.url)(process.env.CODEX_PLAYWRIGHT_PACKAGE || 'playwright');
const questions = operationQuestions().filter(q => ['bar_chart_draw', 'triangle_construct', 'measure_tool'].includes(q.type));
const bar = questions.find(q => q.type === 'bar_chart_draw');
bar.text = '合成：依下方六組資料完成長條圖。';
bar.interaction.bars = Array.from({ length: 6 }, (_, i) => ({ label: `合成${i + 1}組`, value: 10 + i * 2, given: false, labelGiven: true }));
function packFor(q) {
  const pack = syntheticPack();
  pack.questions.push(q); pack.explanations[q.id] = 'Synthetic explanation';
  return pack;
}
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/test-start') {
      const q = questions.find(q => q.type === url.searchParams.get('type')), pack = packFor(q);
      const progress = { schemaVersion: 1, studyTerm: 'g4-s1', semester: 'final', subject: 'math', mastered: {}, challenge: { [q.unit]: { batch: [q.id] } }, stats: {}, errorBank: [], flagged: [] };
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<script>localStorage.clear();localStorage.setItem('study:progress:test-child',${JSON.stringify(JSON.stringify(progress))});localStorage.setItem('study:private-pack:g4-s1-math-u1',${JSON.stringify(JSON.stringify(pack))});location.replace('/study/?child=test-child&subject=math&term=g4-s1');</script>`); return;
    }
    const file = resolve(root, '.' + url.pathname, url.pathname.endsWith('/') ? 'index.html' : '');
    if (!file.startsWith(root + sep)) throw Error('path');
    let content = await readFile(file);
    if (file === resolve(root, 'study/index.html')) content = Buffer.from(content.toString().replace(/<script src="..\/shared\/(?:device-auth|family-(?:client|app)|collection-(?:core|client))\.js[^>]*><\/script>/g, ''));
    if (file.endsWith('family-core.js')) content = Buffer.from(content.toString().replace(/(\{"id":(?:24|28),[^\n]+"published":)false/g, '$1true'));
    if (file.endsWith('preview.js')) content = Buffer.from(content.toString().replace('if (root.document?.getElementById?.("study-preview")) boot();', ''));
    res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' })[extname(file)] || 'application/octet-stream');
    res.end(content);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
const scrollPositions = page => page.locator('.sg-scroll').evaluateAll(nodes => nodes.map(n => ({ left: n.scrollLeft, top: n.scrollTop })));
async function drag(page, x, y) {
  await page.locator('svg[data-geometry-action="canvas"]').scrollIntoViewIfNeeded();
  const p = await page.locator('svg[data-geometry-action="canvas"]').evaluate((svg, [x, y]) => {
    const p = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM()); return { x: p.x, y: p.y };
  }, [x, y]);
  await page.mouse.move(p.x, p.y); await page.mouse.down();
  // A small physical move after pointerdown must still target the same column.
  await page.mouse.move(p.x + 1, p.y - 1); await page.mouse.up();
}
try {
  await mkdir(out, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.env.CODEX_CHROMIUM_PATH ? { executablePath: process.env.CODEX_CHROMIUM_PATH } : {}) });
  const report = [];
  for (const role of ['study', 'preview']) for (const width of [375, 768]) for (const q of questions) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: true });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => route.request().url().startsWith(base) || route.request().url().startsWith('data:') ? route.continue() : route.abort());
    if (role === 'study') {
      await page.goto(base + '/test-start?type=' + q.type);
      await page.locator('#pack-availability').filter({ hasText: '本機已有' }).waitFor({ state: 'attached' });
      await page.evaluate(unit => window._startFull(unit), q.unit);
    } else {
      await page.goto(base + '/study/preview.html');
      await page.evaluate(({ pack, unit }) => {
        window.controller = StudyPreview.mount({ root: document.getElementById('study-preview'), pack });
        controller.handle('subject', { value: 'math' }); controller.handle('unit', { value: String(unit) });
      }, { pack: packFor(q), unit: q.unit });
    }
    await page.locator(`[data-geometry-type="${q.type}"]`).waitFor();
    const getState = () => page.evaluate(role => role === 'preview' ? controller.state.operation : JSON.parse(localStorage.getItem('study:operation-draft:test-child')).state, role);
    const dimensions = await page.locator('.sg-scroll').evaluateAll(nodes => nodes.map(n => ({ client: n.clientWidth, scroll: n.scrollWidth })));
    assert.equal(dimensions.length, q.type === 'bar_chart_draw' ? 2 : 1);
    if (width === 375) assert.ok(dimensions.every(d => d.scroll > d.client));
    else assert.ok(dimensions.every(d => d.scroll === d.client), '768px needs no horizontal scroll');
    if (q.type === 'bar_chart_draw') {
      // Distinct table/chart offsets expose accidental copying of the first scroller.
      await page.locator('.sg-scroll').evaluateAll(nodes => nodes.forEach((n, i) => { n.scrollLeft = i ? n.scrollWidth : 47; }));
      const before = await scrollPositions(page);
      await page.locator('[data-geometry-action="height"][data-geometry-value="1"]').click();
      assert.deepEqual(await scrollPositions(page), before, `${role}/${width}: both natural scrollers survive button render`);
      await page.locator('[data-geometry-action="clear"]').click();
      assert.deepEqual(await scrollPositions(page), before);
      await drag(page, 575, 200); // Sixth of six 90-unit columns; half of the 20 small divisions.
      const state = await getState();
      assert.deepEqual(state.heights, [null, null, null, null, null, 10], `${role}/${width}: drag must only draw bar 6`);
      assert.deepEqual(await scrollPositions(page), before);
      await page.locator('[data-geometry-action="height"][data-geometry-value="1"]').click();
      assert.deepEqual((await getState()).heights, [null, null, null, null, null, 11]);
      await page.screenshot({ path: resolve(out, `${role}-bar-${width}.png`), fullPage: true });
      // Exercise independent vertical offsets too, with a bounded host height.
      await page.addStyleTag({ content: '.sg-scroll { max-height: 80px; }' });
      await page.locator('.sg-scroll').evaluateAll(nodes => nodes.forEach((n, i) => { n.scrollTop = 7 + i * 31; }));
      const bothAxes = await scrollPositions(page);
      assert.ok(bothAxes.every(p => p.top > 0));
      await page.locator('[data-geometry-action="height"][data-geometry-value="-1"]').click();
      assert.deepEqual(await scrollPositions(page), bothAxes);
      report.push({ role, width, type: q.type, dimensions, before, bothAxes, heightsAfterDrag: state.heights });
    } else {
      await page.locator('.sg-scroll').evaluate(n => { n.scrollLeft = n.scrollWidth; });
      const before = await scrollPositions(page);
      const action = q.type === 'triangle_construct' ? '[data-geometry-action="vertex"][data-geometry-value="1"]' : '[data-geometry-action="tool"][data-geometry-value="ruler"]';
      await page.locator(action).click();
      assert.deepEqual(await scrollPositions(page), before, `${role}/${width}/${q.type}: single scroller survives render`);
      const target = q.type === 'triangle_construct' ? [650, 250] : [320, 100];
      await drag(page, ...target);
      assert.deepEqual(await scrollPositions(page), before);
      const state = await getState();
      const point = q.type === 'triangle_construct' ? state.points[1] : [state.tool.x, state.tool.y];
      assert.ok(Math.abs(point[0] - target[0]) < 3 && Math.abs(point[1] - target[1]) < 3);
      report.push({ role, width, type: q.type, dimensions, before, pointAfterDrag: point });
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    assert.deepEqual(errors, []);
    await context.close();
  }
  await writeFile(resolve(out, 'browser-receipt.json'), JSON.stringify({ status: 'pass', syntheticOnly: true, realStudyAndPreview: true, authAndNetworkExcluded: true, report }, null, 2));
  console.log('PASS: Study/preview at 375/768px; independent bar scroll offsets, sixth-bar drag, triangle/measure single scrollers');
} finally { await browser?.close(); server.close(); }
