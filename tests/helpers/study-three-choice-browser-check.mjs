// Isolated loopback QA with synthetic choices and no real child identity or token.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CODEX_PLAYWRIGHT_PACKAGE || "playwright");
const port = Number(process.argv[2] || 8799);
const base = `http://127.0.0.1:${port}`;
const screenshotDir = resolve(root, "data/private/study/g4-s1-math-u1/browser-qa/science-three-choice");
const server = spawn(process.execPath, [resolve(root, "tests/helpers/serve-study-auto-pack.mjs"), String(port)], {
  cwd: root, stdio: ["ignore", "pipe", "pipe"],
});
const ready = new Promise((resolveReady, reject) => {
  const timer = setTimeout(() => reject(Error("synthetic server did not start")), 10000);
  server.stdout.on("data", chunk => {
    if (String(chunk).includes(`${base}/test-start`)) { clearTimeout(timer); resolveReady(); }
  });
  server.once("exit", code => { clearTimeout(timer); reject(Error(`synthetic server exited ${code}`)); });
});
let browser;
try {
  await ready;
  await mkdir(screenshotDir, { recursive: true });
  browser = await chromium.launch({ headless: true });
  for (const [width, height] of [[768, 1024], [1024, 768]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.goto(`${base}/test-start?scenario=science-three`);
    await page.locator("#pack-availability").filter({ hasText: "題庫版本" }).waitFor();
    await page.evaluate(() => window._setSubject("science"));
    await page.locator("#study-home-content .unit-section").first().waitFor();
    await page.evaluate(() => window._startFull(20, "@science-topic:S1b"));
    await page.locator("#page-quiz:not(.hidden) #q-options .opt-btn").first().waitFor();
    assert.equal(await page.locator("#q-options .opt-btn").count(), 3);
    const heightPx = (await page.locator("#q-options .opt-btn").first().boundingBox()).height;
    assert.ok(heightPx >= 44, `choice button too short at ${width}px: ${heightPx}`);
    await page.screenshot({ path: resolve(screenshotDir, `study-${width}.png`) });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
    assert.deepEqual(pageErrors, []);
    await context.close();

    const previewContext = await browser.newContext({ viewport: { width, height } });
    const preview = await previewContext.newPage();
    const writes = [];
    preview.on("request", request => { if (request.url().includes("/v1/")) writes.push(request.method()); });
    await preview.goto(`${base}/study/preview.html?child=test-child`);
    await preview.locator('select[data-action="subject"]').selectOption("science");
    await preview.locator('select[data-action="subtopic"]').selectOption("@science-topic:S1b");
    await preview.locator(".preview-option").first().waitFor();
    assert.match(await preview.locator(".preview-meta").innerText(), /三選一/);
    assert.equal(await preview.locator(".preview-option").count(), 3);
    const before = await preview.evaluate(() => localStorage.getItem("study:progress:test-child"));
    await preview.locator('.preview-option[data-value="2"]').click();
    await preview.locator('button[data-action="check"]').click();
    assert.match(await preview.locator(".preview-feedback").innerText(), /還沒答對/);
    await preview.locator('.preview-option[data-value="3"]').click();
    await preview.locator('button[data-action="check"]').click();
    assert.match(await preview.locator(".preview-feedback").innerText(), /答對了/);
    assert.equal(await preview.evaluate(() => localStorage.getItem("study:progress:test-child")), before);
    assert.ok(writes.length > 0 && writes.every(method => method === "GET"));
    assert.equal(await preview.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
    await preview.screenshot({ path: resolve(screenshotDir, `preview-${width}.png`) });
    await previewContext.close();
    console.log(`PASS synthetic three-choice ${width}x${height}: Study 3 buttons, preview label/scoring, no preview progress writes or overflow`);
  }
} finally {
  await browser?.close();
  server.kill();
}
