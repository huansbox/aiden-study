// Isolated synthetic regression for the largest supported U2 word bank.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { socialUnitTwoSyntheticPack } from "./synthetic-study-pack.mjs";

const root = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CODEX_PLAYWRIGHT_PACKAGE || "playwright");
const port = Number(process.argv[2] || 8797), base = `http://127.0.0.1:${port}`;
const output = resolve(root, "data/private/study/g4-s1-math-u1/social-u2-existing-paper-batch/qa/synthetic");
const q = socialUnitTwoSyntheticPack().questions.at(-1), report = [];
const server = spawn(process.execPath, [resolve(root, "tests/helpers/serve-study-auto-pack.mjs"), String(port)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
let browser;
try {
  await new Promise((ok, bad) => {
    const timer = setTimeout(() => bad(Error("synthetic server did not start")), 10000);
    server.stdout.on("data", chunk => { if (String(chunk).includes(`${base}/test-start`)) { clearTimeout(timer); ok(); } });
    server.once("exit", code => { clearTimeout(timer); bad(Error(`synthetic server exited ${code}`)); });
  });
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true });
  for (const [width, height] of [[768, 1024], [1024, 768]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(`${base}/test-start?scenario=social-u2`);
    await page.locator("#pack-availability").filter({ hasText: "題庫版本" }).waitFor();
    await page.evaluate(() => window._startFull(23));
    await page.locator("#page-quiz:not(.hidden) .select-word-bank").waitFor();
    assert.equal(await page.locator(".select-blank-list .select-blank").count(), 13);
    assert.equal(await page.locator(".select-word-bank .select-choice").count(), 15);
    assert.equal(await page.locator("#fib-submit").isDisabled(), true);
    await page.locator('[data-select-value="15"]').click();
    assert.match(await page.locator('.select-blank-list [data-select-blank="0"]').innerText(), /P\. 合成詞語 15/);
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.selectValue), "15");
    // Return to a filled blank and select the same word twice: the bank is reusable.
    await page.locator('.select-blank-list [data-select-blank="0"]').click();
    await page.locator('[data-select-value="1"]').click();
    await page.locator('.select-blank-list [data-select-blank="0"]').click();
    await page.locator('[data-select-value="15"]').click();
    for (let i = 1; i < 12; i++) await page.locator(`[data-select-value="${q.blanks[i].answer}"]`).click();
    assert.equal(await page.locator("#fib-submit").isDisabled(), true, "last empty blank must block submit");
    await page.locator('.select-blank-list [data-select-blank="12"]').click();
    await page.locator('[data-select-value="15"]').click();
    await page.locator("#fib-submit").click();
    await page.locator("#result-hint.wrong").waitFor();
    await page.locator('.select-blank-list [data-select-blank="12"]').click();
    assert.match(await page.locator("#fill-input-panel .group-feedback").innerText(), /正解：I\. 合成詞語 9/);
    await page.screenshot({ path: resolve(output, `wrong-${width}.png`), fullPage: true });
    await page.reload();
    await page.locator("#pack-availability").filter({ hasText: "題庫版本" }).waitFor();
    await page.evaluate(() => window._startFull(23));
    await page.locator("#page-quiz:not(.hidden) .select-word-bank").waitFor();
    for (let i = 0; i < 13; i++) {
      await page.locator(`[data-select-value="${q.blanks[i].answer}"]`).click();
      if ([0, 9, 12].includes(i)) await page.screenshot({ path: resolve(output, `blank-${i + 1}-${width}.png`), fullPage: true });
    }
    const tap = await page.locator('[data-select-value="15"]').boundingBox();
    assert.ok(tap.width >= 44 && tap.height >= 44);
    await page.locator("#fib-submit").click();
    await page.locator("#result-hint.correct").waitFor();
    await page.locator("#next-btn").click();
    await page.locator("#page-summary:not(.hidden)").waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    await context.close();

    const previewContext = await browser.newContext({ viewport: { width, height } });
    const preview = await previewContext.newPage(), requests = [];
    await preview.addInitScript(() => localStorage.setItem("synthetic-preview-sentinel", "unchanged"));
    preview.on("request", request => { if (request.url().includes("/v1/")) requests.push([request.method(), new URL(request.url()).pathname]); });
    await preview.goto(`${base}/study/preview.html?child=test-child`);
    await preview.locator('[data-action="subject"]').selectOption("social");
    await preview.locator('[data-action="unit"]').selectOption("23");
    await preview.locator('[data-action="question"]').selectOption("2");
    assert.equal(await preview.locator('[data-action="answer-select"]').count(), 15);
    assert.match(await preview.locator(".preview-question").innerText(), /（１３）/);
    for (let i = 0; i < 13; i++) {
      await preview.locator(`[data-action="answer-select"][data-value="${q.blanks[i].answer}"]`).click();
      if (i < 12) await preview.locator('[data-action="next-part"]').click();
    }
    await preview.locator('[data-action="previous-part"]').click();
    await preview.locator('[data-action="next-part"]').click();
    assert.equal(await preview.evaluate(() => document.activeElement?.dataset.action), "previous-part");
    await preview.locator('[data-action="check"]').click();
    await preview.locator(".preview-feedback.correct").waitFor();
    assert.match(await preview.locator(".preview-reveal").innerText(), /第 13 空：I\. 合成詞語 9/);
    assert.equal(await preview.evaluate(() => localStorage.getItem("synthetic-preview-sentinel")), "unchanged");
    assert.equal(await preview.evaluate(() => localStorage.getItem("study:progress:test-child")), null);
    assert.ok(requests.length > 0 && requests.every(([method]) => method === "GET"));
    assert.equal(await preview.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await preview.screenshot({ path: resolve(output, `preview-${width}.png`), fullPage: true });
    report.push({ width, height, thirteenBlanks: true, fifteenWords: true, retryReload: true, previewReadOnly: true, tap });
    await previewContext.close();
  }
  await writeFile(resolve(output, "report.json"), JSON.stringify({ status: "pass", fixture: "synthetic-only", results: report }, null, 2));
  console.log("PASS synthetic U2: both iPad viewports, full word bank, all blanks, reselect/reload/feedback and preview isolation");
} finally {
  await browser?.close();
  server.kill();
}
