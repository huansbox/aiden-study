// Isolated responsive QA: synthetic content, fake KV, fresh browser context per viewport.
// Run with CODEX_PLAYWRIGHT_PACKAGE=<absolute bundled playwright package path> node tests/helpers/study-science-browser-check.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CODEX_PLAYWRIGHT_PACKAGE || "playwright");
const port = Number(process.argv[2] || 8792);
const base = `http://127.0.0.1:${port}`;
const screenshotDir = resolve(root, "data/private/study/g4-s1-math-u1/browser-qa");
const server = spawn(process.execPath, [resolve(root, "tests/helpers/serve-family.mjs"), String(port)], {
  cwd: root, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NATIVE_CAMP_AUDIO_PACK: "" },
});
const ready = new Promise((ok, fail) => {
  const timer = setTimeout(() => fail(Error("synthetic server did not start")), 10000);
  server.stdout.on("data", chunk => {
    if (String(chunk).includes(`${base}/test/start`)) { clearTimeout(timer); ok(); }
  });
  server.once("exit", code => { clearTimeout(timer); fail(Error(`synthetic server exited ${code}`)); });
});
let browser;
try {
  await ready;
  await mkdir(screenshotDir, { recursive: true });
  browser = await chromium.launch({ headless: true });
  for (const [width, height] of [[390, 844], [768, 1024], [1024, 768]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    await page.goto(`${base}/test/start`);
    await page.goto(`${base}/test/study-science-pack`);
    await page.getByRole("link", { name: "自然" }).click();
    await page.locator("#study-home-content .unit-section").first().waitFor();
    assert.match(await page.locator("#study-home-content").innerText(), /地表的靜與動.*水生生物與環境/s);
    await page.locator('button[onclick="window._startFull(20)"]').first().click();
    await page.locator("#q-options .opt-btn").first().waitFor();
    const touchHeight = (await page.locator("#q-options .opt-btn").first().boundingBox()).height;
    assert.ok(touchHeight >= 44, `Study touch option too short at ${width}px: ${touchHeight}`);
    assert.equal(await page.locator("#q-options .opt-btn").count(), 2);
    await page.screenshot({ path: resolve(screenshotDir, `study-${width}.png`) });
    const studySize = await page.evaluate(() => ({ width: innerWidth, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth }));
    assert.equal(studySize.width, width);
    assert.equal(studySize.overflow, false, `Study horizontal overflow at ${width}px`);

    await page.goto(`${base}/test/study-preview?mode=science`);
    await page.locator('select[data-action="subject"]').selectOption("science");
    await page.locator('.preview-option[data-value="false"]').click();
    await page.locator('button[data-action="check"]').click();
    assert.match(await page.locator(".preview-feedback").innerText(), /還沒答對/);
    await page.locator('button[data-action="reveal"]').click();
    assert.match(await page.locator(".preview-reveal").innerText(), /O（正確）.*合成解說/s);
    await page.locator('select[data-action="unit"]').selectOption("21");
    assert.equal(await page.locator(".preview-option").count(), 4);
    const previewSize = await page.evaluate(() => ({
      width: innerWidth,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      filterColumns: getComputedStyle(document.querySelector(".preview-filters")).gridTemplateColumns.split(" ").length,
      navColumns: getComputedStyle(document.querySelector(".preview-question-nav")).gridTemplateColumns.split(" ").length,
    }));
    assert.equal(previewSize.width, width);
    assert.equal(previewSize.overflow, false, `Preview horizontal overflow at ${width}px`);
    assert.equal(previewSize.filterColumns, width <= 640 ? 1 : 3);
    assert.equal(previewSize.navColumns, width <= 480 ? 2 : 3);
    await page.screenshot({ path: resolve(screenshotDir, `preview-${width}.png`) });

    await page.goto(`${base}/test/study-preview?questions=60`);
    await page.locator('select[data-action="question"]').selectOption("59");
    assert.match(await page.locator(".preview-question-jump").innerText(), /第 60 題／共 60 題/);
    const nav = await page.evaluate(() => ({
      width: Math.round(document.querySelector('select[data-action="question"]').getBoundingClientRect().width),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    assert.equal(nav.overflow, false);
    assert.ok(nav.width <= (width <= 480 ? width : 280), `question jump too wide at ${width}px: ${nav.width}`);
    await page.goto(`${base}/test/study-preview/inspect`);
    await page.locator("#browser-result").getByText(/未變更/).waitFor();
    await page.locator("#server-result").getByText(/kvSentinelsUnchanged/).waitFor();
    const snapshot = JSON.parse(await page.locator("#server-result").innerText());
    assert.equal(snapshot.kvSentinelsUnchanged, true);
    assert.deepEqual(snapshot.requests.filter(r => r.pathname.startsWith("/api/")).map(r => [r.method, r.pathname]),
      [["GET", "/api/v1/session"], ["GET", "/api/v1/packs/g4-s1-math-u1"]]);
    console.log(`responsive synthetic QA ${width}x${height}: Study touch ${touchHeight}px, preview ${previewSize.filterColumns}/${previewSize.navColumns} columns, jump ${nav.width}px, no overflow or preview writes`);
    await context.close();
  }
} finally {
  await browser?.close();
  server.kill();
}
