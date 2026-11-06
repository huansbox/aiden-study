// 真 Study/preview HTML + CSS + render/event handlers，僅使用合成題與隔離本機儲存。
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { syntheticPack } from "./synthetic-study-pack.mjs";
import { circuitQuestion } from "./synthetic-circuit.mjs";
import { finalMathQuestion } from "./synthetic-final-math.mjs";
const root = resolve(fileURLToPath(new URL("../../docs/", import.meta.url)));
const out = resolve(process.argv[2] || "data/private/runtime-browser");
const { chromium } = createRequire(import.meta.url)(process.env.CODEX_PLAYWRIGHT_PACKAGE || "playwright");
const pack = syntheticPack(), circuit = circuitQuestion();
const math = { ...finalMathQuestion(), options: [], text: "Synthetic （１）", blanks: [{ input: "fraction_interval", answer: "", count: 2, distinct: true, form: "mixed", range: { min: [2, 1], max: [5, 2], minInclusive: false, maxInclusive: false } }] };
pack.questions.push(circuit, math); pack.explanations[circuit.id] = pack.explanations[math.id] = "Synthetic explanation";
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/test-start") {
      const subject = url.searchParams.get("subject") || "science", unit = subject === "science" ? 30 : 27;
      const progress = { schemaVersion: 1, studyTerm: "g4-s1", semester: "final", subject, mastered: {}, challenge: { [unit]: { batch: [subject === "science" ? circuit.id : math.id] } }, stats: {}, errorBank: [], flagged: [] };
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(`<script>localStorage.clear();localStorage.setItem('study:progress:test-child',${JSON.stringify(JSON.stringify(progress))});localStorage.setItem('study:private-pack:g4-s1-math-u1',${JSON.stringify(JSON.stringify(pack))});location.replace('/study/?child=test-child&subject=${subject}&term=g4-s1');</script>`); return;
    }
    const file = resolve(root, "." + url.pathname, url.pathname.endsWith("/") ? "index.html" : "");
    if (!file.startsWith(root + sep)) throw Error("path");
    let content = await readFile(file);
    if (file === resolve(root, "study/index.html")) content = Buffer.from(content.toString().replace(/<script src="..\/shared\/(?:device-auth|family-(?:client|app)|collection-(?:core|client))\.js[^>]*><\/script>/g, ""));
    // 只在合成伺服器公開測試單元；不修改發布設定。
    if (file.endsWith("family-core.js")) content = Buffer.from(content.toString().replace(/(\{"id":(?:27|30),[^\n]+"published":)false/g, "$1true"));
    // 測試 mount 本身，不觸發正式帳戶或遠端讀取。
    if (file.endsWith("preview.js")) content = Buffer.from(content.toString().replace('if (root.document?.getElementById?.("study-preview")) boot();', ""));
    res.setHeader("Content-Type", ({ ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json" })[extname(file)] || "application/octet-stream");
    res.end(content);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(ok => server.listen(0, "127.0.0.1", ok));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  await mkdir(out, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.env.CODEX_CHROMIUM_PATH ? { executablePath: process.env.CODEX_CHROMIUM_PATH } : {}) });
  const report = [];
  for (const role of ["study", "preview"]) {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => route.request().url().startsWith(base) || route.request().url().startsWith("data:") ? route.continue() : route.abort());
    if (role === "study") {
      await page.goto(base + "/test-start");
      await page.locator("#pack-availability").filter({ hasText: "本機已有" }).waitFor({ state: "attached" });
      await page.evaluate(() => window._startFull(30));
    } else {
      await page.goto(base + "/study/preview.html");
      await page.evaluate(pack => { window.controller = StudyPreview.mount({ root: document.getElementById("study-preview"), pack }); controller.handle("subject", { value: "science" }); controller.handle("unit", { value: "30" }); }, pack);
    }
    await page.locator('[data-circuit-action="place"]').click();
    const geometry = await page.locator(".circuit-terminal").evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { id: node.dataset.circuitValue, x: r.x, y: r.y, width: r.width, height: r.height }; }));
    assert.equal(geometry.length, 5);
    assert.ok(geometry.every(r => r.width === 44 && r.height === 44));
    const overlap = geometry.some((a, i) => geometry.slice(i + 1).some(b => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height));
    assert.equal(overlap, false);
    const dimensions = await page.evaluate(() => { const s = document.querySelector(".circuit-scroll"); return { viewport: innerWidth, document: document.documentElement.scrollWidth, scene: document.querySelector(".circuit-scene").getBoundingClientRect().width, scrollWidth: s.scrollWidth, clientWidth: s.clientWidth }; });
    assert.equal(dimensions.document, 375); assert.equal(dimensions.scene, 540); assert.ok(dimensions.scrollWidth > dimensions.clientWidth);
    const scroller = page.locator(".circuit-scroll");
    await scroller.evaluate(node => { node.scrollLeft = node.scrollWidth; });
    const before = await scroller.evaluate(node => node.scrollLeft);
    await page.locator('[data-circuit-value="bulb-shell"]').click();
    assert.equal(await scroller.evaluate(node => node.scrollLeft), before);
    await page.screenshot({ path: resolve(out, `${role}-circuit-375.png`), fullPage: true });
    report.push({ role, geometry, overlap, ...dimensions, preservedScrollLeft: before });
    assert.deepEqual(errors, []);
    if (role === "study") {
      await page.goto(base + "/test-start?subject=math"); await page.locator("#pack-availability").filter({ hasText: "本機已有" }).waitFor({ state: "attached" }); await page.evaluate(() => window._startFull(27));
    } else await page.evaluate(() => { controller.handle("subject", { value: "math" }); controller.handle("unit", { value: "27" }); });
    for (const [field, value] of [["0:whole", "2"], ["0:numerator", "1"], ["0:denominator", "3"], ["1:whole", "2"], ["1:numerator", "1"], ["1:denominator", "4"]]) await page.locator(`[data-math-field="${field}"]`).fill(value);
    await page.locator(role === "study" ? "#math-submit" : '[data-action="check"]').click();
    assert.match(await page.locator('[data-math-action="blank"]').innerText(), /答對/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 375);
    await page.screenshot({ path: resolve(out, `${role}-interval-375.png`), fullPage: true });
    await context.close();
  }
  await writeFile(resolve(out, "browser-receipt.json"), JSON.stringify({ status: "pass", syntheticOnly: true, actualPageMarkupStylesAndHandlers: true, authAndNetworkExcluded: true, report }, null, 2));
  console.log("PASS: real Study and preview 375px circuit geometry, local scroll and fraction interval UI");
} finally { await browser?.close(); server.close(); }
