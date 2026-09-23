// Synthetic-only image/table group check. No production token, progress or content.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { syntheticPngData } from "./synthetic-study-pack.mjs";

const root = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CODEX_PLAYWRIGHT_PACKAGE || "playwright");
const port = Number(process.argv[2] || 8793), base = `http://127.0.0.1:${port}`;
const screenshotDir = resolve(root, "data/private/study/g4-s1-math-u1/browser-qa");
const server = spawn(process.execPath, [resolve(root, "tests/helpers/serve-family.mjs"), String(port)], {
  cwd: root, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NATIVE_CAMP_AUDIO_PACK: "" },
});
const ready = new Promise((ok, fail) => {
  const timer = setTimeout(() => fail(Error("synthetic server did not start")), 10000);
  server.stdout.on("data", chunk => { if (String(chunk).includes(`${base}/test/start`)) { clearTimeout(timer); ok(); } });
  server.once("exit", code => { clearTimeout(timer); fail(Error(`synthetic server exited ${code}`)); });
});
async function checkZoom(page) {
  const inline = page.locator(".study-material-image > img");
  await page.waitForFunction(() => document.querySelector(".study-material-image > img")?.naturalWidth === 550);
  const inlineWidth = (await inline.boundingBox()).width;
  await page.locator("[data-material-open]").click();
  assert.equal(await page.locator(".study-material-overlay").isVisible(), true);
  assert.equal(await page.locator("[data-material-close]").evaluate(node => node === document.activeElement), true);
  const metrics = await page.locator(".study-material-viewport").evaluate(viewport => {
    const image = viewport.querySelector("img");
    const before = { imageWidth: image.getBoundingClientRect().width, naturalWidth: image.naturalWidth,
      scrollWidth: viewport.scrollWidth, clientWidth: viewport.clientWidth,
      scrollHeight: viewport.scrollHeight, clientHeight: viewport.clientHeight };
    viewport.scrollTo(viewport.scrollWidth, viewport.scrollHeight);
    return { ...before, right: viewport.scrollLeft, bottom: viewport.scrollTop };
  });
  assert.equal(metrics.naturalWidth, 550);
  assert.ok(metrics.imageWidth >= 1100 && metrics.imageWidth >= inlineWidth * 1.9);
  assert.ok(metrics.scrollWidth >= metrics.imageWidth && metrics.right >= metrics.scrollWidth - metrics.clientWidth - 1);
  assert.ok(metrics.scrollWidth > metrics.clientWidth);
  assert.ok(metrics.bottom >= metrics.scrollHeight - metrics.clientHeight - 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
  await page.locator(".study-material-viewport").evaluate(node => { node.scrollLeft = 0; });
  await page.keyboard.press("Tab");
  assert.equal(await page.locator(".study-material-viewport").evaluate(node => node === document.activeElement), true);
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(() => document.querySelector(".study-material-viewport").scrollLeft > 0);
  await page.keyboard.press("Shift+Tab");
  assert.equal(await page.locator("[data-material-close]").evaluate(node => node === document.activeElement), true);
  await page.keyboard.press("Tab");
  assert.equal(await page.locator(".study-material-viewport").evaluate(node => node === document.activeElement), true);
}
let browser;
try {
  await ready;
  await mkdir(screenshotDir, { recursive: true });
  browser = await chromium.launch({ headless: true });
  for (const [width, height] of [[390, 844], [768, 1024], [1024, 768]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    await page.goto(`${base}/test/start`);
    if (width === 390) {
      const decoded = await page.evaluate(async ([valid, duplicate]) => {
        const decode = async src => { const img = new Image(); img.src = src; try { await img.decode(); return true; } catch { return false; } };
        return [await decode(valid), await decode(duplicate)];
      }, [syntheticPngData(1, 3, 1, 1, 1, 2), syntheticPngData(1, 3, 1, 1, 2, 2)]);
      assert.deepEqual(decoded, [true, false]);
    }
    await page.goto(`${base}/test/study-group-pack`);
    await page.getByRole("link", { name: "自然" }).click();
    await page.locator("#study-home-content .unit-section").first().waitFor();
    await page.evaluate(() => window._startFull(21, "合成圖像"));
    await page.locator("#group-parts .group-option").first().waitFor();
    assert.equal(await page.locator("#group-parts .group-part-question").count(), 1);
    assert.equal(await page.locator("#group-submit").isDisabled(), true);
    assert.ok((await page.locator("#group-parts .group-option").first().boundingBox()).height >= 44);
    await checkZoom(page);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".study-material-overlay").isVisible(), false);
    assert.equal(await page.locator("[data-material-open]").evaluate(node => node === document.activeElement), true);
    await page.screenshot({ path: resolve(screenshotDir, `group-child-image-${width}.png`) });
    for (const [index, value] of ["1", "2", "3"].entries()) {
      await page.locator(`#group-parts [data-group-value="${value}"]`).click();
      if (index < 2) assert.equal(await page.locator("#group-submit").isDisabled(), true);
      if (index < 2) await page.locator("#group-next").click();
    }
    await page.locator("#group-prev").click();
    assert.equal(await page.locator('#group-parts [aria-pressed="true"]').getAttribute("data-group-value"), "2");
    await page.locator("#group-next").click();
    assert.equal(await page.locator("#group-submit").isDisabled(), false);
    await page.locator("#group-submit").click();
    assert.match(await page.locator("#result-hint").innerText(), /答對/);
    await page.evaluate(() => window._startFull(21, "合成表格"));
    await page.locator(".study-material-table").waitFor();
    assert.equal(await page.locator(".study-material-table tbody tr").count(), 2);
    assert.equal(await page.locator("#group-position").innerText(), "小題 1／8");
    assert.equal(await page.locator("#group-parts .group-part-question").count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
    await page.screenshot({ path: resolve(screenshotDir, `group-child-table-${width}.png`) });
    await context.close();

    const previewContext = await browser.newContext({ viewport: { width, height } });
    const login = await previewContext.request.post(`${base}/api/v1/session`, { data: { key: "test-token" }, headers: { Origin: base } });
    assert.equal(login.status(), 200);
    const preview = await previewContext.newPage();
    await preview.goto(`${base}/test/study-preview?mode=group`);
    await preview.locator('select[data-action="subject"]').selectOption("science");
    await preview.locator('select[data-action="unit"]').selectOption("21");
    await preview.locator('select[data-action="subtopic"]').selectOption("合成圖像");
    await checkZoom(preview);
    await preview.locator("[data-material-close]").click();
    assert.equal(await preview.locator(".study-material-overlay").isVisible(), false);
    assert.equal(await preview.locator("[data-material-open]").evaluate(node => node === document.activeElement), true);
    assert.equal(await preview.locator('button[data-action="check"]').isDisabled(), true);
    for (const [index, value] of ["1", "2", "3"].entries()) {
      await preview.locator(`[data-action="answer-group"][data-value="${value}"]`).click();
      if (index < 2) assert.equal(await preview.locator('button[data-action="check"]').isDisabled(), true);
      if (index < 2) await preview.locator('[data-action="next-part"]').click();
    }
    await preview.locator('[data-action="previous-part"]').click();
    assert.equal(await preview.locator('[data-action="answer-group"][aria-pressed="true"]').getAttribute("data-value"), "2");
    await preview.locator('[data-action="next-part"]').click();
    await preview.locator('button[data-action="check"]').click();
    assert.match(await preview.locator(".preview-feedback").innerText(), /答對/);
    await preview.locator('select[data-action="subtopic"]').selectOption("合成表格");
    assert.equal(await preview.locator(".study-material-table tbody tr").count(), 2);
    assert.match(await preview.locator(".preview-group-nav").innerText(), /小題 1／8/);
    assert.equal(await preview.locator(".preview-group-question").count(), 1);
    assert.equal(await preview.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
    await preview.screenshot({ path: resolve(screenshotDir, `group-preview-table-${width}.png`) });
    await preview.goto(`${base}/test/study-preview/inspect`);
    await preview.locator("#server-result").getByText(/kvSentinelsUnchanged/).waitFor();
    const snapshot = JSON.parse(await preview.locator("#server-result").innerText());
    assert.equal(snapshot.kvSentinelsUnchanged, true);
    assert.deepEqual(snapshot.requests.filter(r => r.pathname.startsWith("/api/")).map(r => [r.method, r.pathname]),
      [["GET", "/api/v1/session"], ["GET", "/api/v1/packs/g4-s1-math-u1"]]);
    console.log(`synthetic group ${width}x${height}: image zoom, table, child and preview, no page overflow or preview KV write`);
    await previewContext.close();
  }
} finally {
  await browser?.close();
  server.kill();
}
