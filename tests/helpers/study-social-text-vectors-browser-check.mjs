// 原創合成資料＋真 Worker／browser；不讀正式 token、cookie 或孩子進度。
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const { chromium } = createRequire(import.meta.url)(process.env.CODEX_PLAYWRIGHT_PACKAGE || "playwright");
const port = Number(process.argv[2] || 8813), base = `http://127.0.0.1:${port}`;
const output = resolve(root, process.argv[3] || "data/private/study/g4-s1-math-u1/social-u2-more-paper-batch/ops/runtime-browser");
const server = spawn(process.execPath, [resolve(root, "tests/helpers/serve-study-auto-pack.mjs"), String(port)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
const report = [];
let browser;
try {
  await new Promise((ok, fail) => {
    const timer = setTimeout(() => fail(Error("synthetic server did not start")), 10000);
    server.stdout.on("data", chunk => { if (String(chunk).includes(`${base}/test-start`)) { clearTimeout(timer); ok(); } });
    server.once("exit", code => { clearTimeout(timer); fail(Error(`synthetic server exited ${code}`)); });
  });
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true });
  for (const [width, height] of [[768, 1024], [1024, 768]]) {
    const context = await browser.newContext({ viewport: { width, height } }), page = await context.newPage(), errors = [];
    page.on("pageerror", e => errors.push(e.message));
    const begin = async activity => {
      await page.goto(`${base}/test-start?scenario=social-text-vectors&activity=${activity}`);
      await page.locator("#pack-availability").filter({ hasText: "題庫版本" }).waitFor();
      await page.evaluate(() => window._startFull(23));
    };
    await begin("text");
    const input = page.locator("#fib-text");
    assert.equal(await input.getAttribute("type"), "text");
    assert.equal(await page.locator("#fib-submit").isDisabled(), true);
    await input.fill("　"); assert.equal(await page.locator("#fib-submit").isDisabled(), true);
    // 101 BMP characters fit HTML maxlength=200, so only the JS clamp can enforce 100 codepoints.
    await input.fill("甲".repeat(101)); assert.equal(await input.inputValue(), "甲".repeat(100));
    await input.fill("😀".repeat(101));
    assert.equal(await input.evaluate(el => Array.from(el.value).length), 100);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await input.fill("Alpha town"); assert.equal(await input.inputValue(), "Alpha town");
    await page.locator('.blank-box[data-idx="1"]').click();
    await input.fill("錯詞"); await page.locator("#fib-submit").click();
    await page.locator("#result-hint.wrong").waitFor();
    assert.equal(await page.locator(".blank-correct-val b").count(), 0);
    assert.match(await page.locator(".blank-correct-val").last().innerText(), /<b>合成<\/b>/);
    await page.screenshot({ path: resolve(output, `text-feedback-${width}.png`), fullPage: true });
    await page.reload();
    await page.locator("#pack-availability").filter({ hasText: "題庫版本" }).waitFor();
    await page.evaluate(() => window._startFull(23));
    await input.fill(" Ａｌｐｈａ ");
    await page.locator('.blank-box[data-idx="1"]').click(); await input.fill("乙鎮");
    await page.locator("#fib-submit").click(); await page.locator("#result-hint.correct").waitFor();
    await page.locator("#next-btn").click(); await page.locator("#page-summary:not(.hidden)").waitFor();
    await begin("vectors");
    for (const value of ["2", "3", "3", "4"]) await page.locator(`[data-select-value="${value}"]`).click();
    await page.locator("#fib-submit").click(); await page.locator("#result-hint.wrong").waitFor();
    await page.locator('.select-blank[data-select-blank="1"]').click();
    assert.equal(await page.locator(".group-feedback").innerText(), "正解：甲標籤", "feedback follows the nearest noncanonical vector, not canonical blank 2");
    for (const [index, correct] of [true, false, true, true].entries()) {
      for (const selector of [".select-blank-marker", ".select-blank"]) {
        const blank = page.locator(`${selector}[data-select-blank="${index}"]`);
        assert.equal(await blank.count(), 1);
        assert.equal(await blank.evaluate(el => el.classList.contains("b-correct")), correct, `${selector} blank ${index + 1} correct marker`);
        assert.equal(await blank.evaluate(el => el.classList.contains("b-wrong")), !correct, `${selector} blank ${index + 1} wrong marker`);
      }
    }
    await page.screenshot({ path: resolve(output, `vector-feedback-${width}.png`), fullPage: true });
    await page.reload(); await page.locator("#pack-availability").filter({ hasText: "題庫版本" }).waitFor();
    await page.evaluate(() => window._startFull(23));
    for (const value of ["2", "1", "3", "4"]) await page.locator(`[data-select-value="${value}"]`).click();
    await page.locator("#fib-submit").click(); await page.locator("#result-hint.correct").waitFor();
    await page.locator("#next-btn").click(); await page.locator("#page-summary:not(.hidden)").waitFor();
    assert.deepEqual(errors, []); await context.close();

    const previewContext = await browser.newContext({ viewport: { width, height } }), preview = await previewContext.newPage(), requests = [];
    await preview.addInitScript(() => {
      window.__writeAttempts = [];
      Storage.prototype.setItem = function(key) { window.__writeAttempts.push(key); throw Error("preview attempted storage write"); };
      Storage.prototype.removeItem = function(key) { window.__writeAttempts.push(key); throw Error("preview attempted storage removal"); };
      Storage.prototype.clear = function() { window.__writeAttempts.push("clear"); throw Error("preview attempted storage clear"); };
    });
    preview.on("request", request => { if (request.url().includes("/v1/")) requests.push([request.method(), new URL(request.url()).pathname]); });
    await preview.goto(`${base}/study/preview.html?child=test-child`);
    await preview.locator('[data-action="subject"]').selectOption("social"); await preview.locator('[data-action="unit"]').selectOption("23");
    await preview.locator('[data-action="question"]').selectOption("3");
    const first = preview.locator('[data-action="answer-number"][data-index="0"]'), second = preview.locator('[data-action="answer-number"][data-index="1"]');
    assert.equal(await first.getAttribute("inputmode"), "text");
    await first.fill("甲".repeat(101)); assert.equal(await first.inputValue(), "甲".repeat(100));
    await first.fill("😀".repeat(101)); assert.equal(await first.evaluate(el => Array.from(el.value).length), 100);
    await first.fill("Alpha town"); assert.equal(await first.inputValue(), "Alpha town");
    assert.equal(await preview.locator('[data-action="check"]').isDisabled(), true);
    await second.fill("乙鎮"); await preview.locator('[data-action="check"]').click(); await preview.locator(".preview-feedback.wrong").waitFor();
    await first.fill(" Ａｌｐｈａ "); await preview.locator('[data-action="check"]').click(); await preview.locator(".preview-feedback.correct").waitFor();
    assert.equal(await preview.locator(".preview-reveal b").count(), 0);
    await preview.screenshot({ path: resolve(output, `preview-text-${width}.png`), fullPage: true });
    await preview.locator('[data-action="retry-answer"]').click(); assert.equal(await first.inputValue(), "");
    await preview.locator('[data-action="question"]').selectOption("4");
    for (const [index, value] of ["2", "2", "3", "4"].entries()) {
      await preview.locator(`[data-action="answer-select"][data-value="${value}"]`).click();
      if (index < 3) await preview.locator('[data-action="next-part"]').click();
    }
    await preview.locator('[data-action="check"]').click(); await preview.locator(".preview-feedback.wrong").waitFor();
    await preview.locator('[data-action="previous-part"]').click(); await preview.locator('[data-action="previous-part"]').click();
    await preview.locator('[data-action="answer-select"][data-value="1"]').click();
    await preview.locator('[data-action="check"]').click(); await preview.locator(".preview-feedback.correct").waitFor();
    assert.deepEqual(await preview.evaluate(() => window.__writeAttempts), []);
    assert.deepEqual(await preview.evaluate(async () => (await indexedDB.databases()).map(db => db.name)), []);
    assert.ok(requests.length > 0 && requests.every(([method]) => method === "GET"));
    assert.equal(await preview.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    report.push({ width, height, nativeText: true, codepointLimit: 100, bmpClampChildAndPreview: true, escapedFeedback: true, retryReload: true, fullVectorGrading: true, noncanonicalWrongBlankFeedback: "正解：甲標籤", vectorMarkers: [true, false, true, true], previewZeroStorageWrite: true, requests });
    await previewContext.close();
  }
  await writeFile(resolve(output, "report.json"), JSON.stringify({ status: "pass", fixture: "original synthetic only", results: report }, null, 2));
  console.log("PASS synthetic social23 text/vectors: 768x1024 + 1024x768, native input, normalization, retry/reload, inert markup, full vectors and preview read-only");
} finally { await browser?.close(); server.kill(); }
