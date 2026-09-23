// Pending private content: local visual QA only. Never uses production credentials or writes a release pack.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPrivateStudyQaPack } from "./private-study-qa-pack.mjs";

const root = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const basePath = process.env.STUDY_PRIVATE_QA_BASE, deltaDir = process.env.STUDY_PRIVATE_QA_DELTA;
const pack = loadPrivateStudyQaPack(basePath, deltaDir);
const media = pack.questions.filter(question => question.material);
assert.deepEqual(media.map(question => question.material.kind).sort(), ["png", "table"]);
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CODEX_PLAYWRIGHT_PACKAGE || "playwright");
const port = Number(process.argv[2] || 8794), base = `http://127.0.0.1:${port}`;
const screenshotDir = resolve(root, "data/private/study/g4-s1-math-u1/browser-qa/pending-media");
const server = spawn(process.execPath, [resolve(root, "tests/helpers/serve-family.mjs"), String(port)], {
  cwd: root, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NATIVE_CAMP_AUDIO_PACK: "" },
});
const ready = new Promise((ok, fail) => {
  const timer = setTimeout(() => fail(Error("Private QA server did not start")), 10000);
  server.stdout.on("data", chunk => { if (String(chunk).includes(`${base}/test/start`)) { clearTimeout(timer); ok(); } });
  server.once("exit", code => { clearTimeout(timer); fail(Error(`Private QA server exited ${code}`)); });
});
async function inspectMaterial(page, question, name, width) {
  const image = question.material.kind === "png";
  if (image) {
    const img = page.locator(".study-material-image > img");
    await img.waitFor();
    await page.waitForFunction(() => document.querySelector(".study-material-image > img")?.naturalWidth === 550);
    assert.equal(await img.getAttribute("alt"), question.material.alt);
    assert.equal(await page.locator(".study-material-image figcaption").innerText(), question.material.alt);
  } else {
    await page.locator(".study-material-table").waitFor();
    assert.equal(await page.locator(".study-material-table thead th").count(), question.material.columns.length);
    assert.equal(await page.locator(".study-material-table tbody tr").count(), question.material.rows.length);
    if (width >= 768) {
      const card = page.locator(name === "child" ? ".group-card" : ".preview-group-card");
      const geometryForPart = async part => {
        await card.locator(".study-table-scroll").evaluate(node => node.scrollIntoView({ block: "start" }));
        const geometry = await card.evaluate((element, role) => {
        const box = selector => element.querySelector(selector)?.getBoundingClientRect();
        const material = box(".study-table-scroll"), question = box(role === "child" ? ".group-part-question" : ".preview-group-question");
        const option = box(role === "child" ? ".group-option" : ".preview-group-part .preview-option");
        const nav = box(role === "child" ? ".group-nav" : ".preview-group-nav");
        return { material: [material.top, material.bottom], question: [question.top, question.bottom], option: [option.top, option.bottom], nav: [nav.top, nav.bottom], viewport: innerHeight, scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        }, name);
        assert.equal(geometry.scroll, 0);
        const top = Math.min(geometry.material[0], geometry.question[0], geometry.option[0], geometry.nav[0]);
        const bottom = Math.max(geometry.material[1], geometry.question[1], geometry.option[1], geometry.nav[1]);
        assert.ok(top >= -1 && bottom <= geometry.viewport + 1, `${name} ${width} part ${part}: table and current answer must be in one viewport: ${JSON.stringify(geometry)}`);
        await page.screenshot({ path: resolve(screenshotDir, `${name}-table-${width}-part-${part}-viewport.png`) });
        console.log(`${name} ${width} part ${part}: ${JSON.stringify(geometry)}`);
      };
      await geometryForPart(1);
      for (let i = 1; i < question.parts.length; i++) await page.locator(name === "child" ? "#group-next" : '[data-action="next-part"]').click();
      await geometryForPart(question.parts.length);
    }
  }
  await page.screenshot({ path: resolve(screenshotDir, `${name}-${image ? "image" : "table"}-${width}.png`), fullPage: true });
  if (image) {
    await page.locator("[data-material-open]").click();
    const viewport = page.locator(".study-material-viewport");
    const metrics = await viewport.evaluate(node => ({ natural: node.querySelector("img").naturalWidth,
      shown: node.querySelector("img").getBoundingClientRect().width, scroll: node.scrollWidth, client: node.clientWidth }));
    assert.equal(metrics.natural, 550);
    assert.ok(metrics.shown >= 1100 && metrics.scroll > metrics.client);
    await page.screenshot({ path: resolve(screenshotDir, `${name}-image-zoom-left-${width}.png`) });
    await viewport.evaluate(node => node.scrollLeft = node.scrollWidth);
    await page.screenshot({ path: resolve(screenshotDir, `${name}-image-zoom-right-${width}.png`) });
    await page.keyboard.press("Escape");
  } else {
    const scroll = page.locator(".study-table-scroll");
    await scroll.evaluate(node => node.scrollLeft = node.scrollWidth);
    await page.screenshot({ path: resolve(screenshotDir, `${name}-table-right-${width}.png`), fullPage: true });
  }
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
}
let browser;
try {
  await ready;
  await mkdir(screenshotDir, { recursive: true });
  browser = await chromium.launch({ headless: true });
  for (const [width, height] of [[390, 844], [768, 1024], [1024, 768]]) {
    for (const question of media) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      await page.goto(`${base}/test/start`);
      await page.goto(`${base}/test/study-pending-pack`);
      await page.getByRole("link", { name: "自然" }).click();
      await page.locator("#study-home-content .unit-section").first().waitFor();
      await page.evaluate(({ unit, subtopic }) => window._startFull(unit, subtopic), question);
      assert.equal(await page.locator("#group-parts .group-part-question").count(), 1);
      assert.match(await page.locator("#group-position").innerText(), new RegExp(`小題 1／${question.parts.length}`));
      await inspectMaterial(page, question, "child", width);
      await context.close();

      const previewContext = await browser.newContext({ viewport: { width, height } });
      const login = await previewContext.request.post(`${base}/api/v1/session`, { data: { key: "test-token" }, headers: { Origin: base } });
      assert.equal(login.status(), 200);
      const preview = await previewContext.newPage();
      await preview.goto(`${base}/test/study-preview?mode=pending`);
      await preview.locator('select[data-action="subject"]').selectOption("science");
      await preview.locator('select[data-action="unit"]').selectOption(String(question.unit));
      await preview.locator('select[data-action="subtopic"]').selectOption(question.subtopic);
      assert.equal(await preview.locator(".preview-group-question").count(), 1);
      assert.match(await preview.locator(".preview-group-nav").innerText(), new RegExp(`小題 1／${question.parts.length}`));
      await inspectMaterial(preview, question, "preview", width);
      await preview.goto(`${base}/test/study-preview/inspect`);
      await preview.locator("#server-result").getByText(/kvSentinelsUnchanged/).waitFor();
      const snapshot = JSON.parse(await preview.locator("#server-result").innerText());
      assert.equal(snapshot.kvSentinelsUnchanged, true);
      assert.deepEqual(snapshot.requests.filter(request => request.pathname.startsWith("/api/")).map(request => [request.method, request.pathname]),
        [["GET", "/api/v1/session"], ["GET", "/api/v1/packs/g4-s1-math-u1"]]);
      await previewContext.close();
    }
    console.log(`pending private media ${width}x${height}: child and preview rendered from fake KV; screenshots in ignored private QA folder`);
  }
} finally {
  await browser?.close();
  server.kill();
}
