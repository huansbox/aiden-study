// Component rendering/event verification for the bounded decimal setup contract.
// Full Study/preview dispatch is verified separately by the integration owner.
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const out = resolve(process.argv[2] || "data/private/decimal-setup-browser");
const { chromium } = createRequire(import.meta.url)(process.env.CODEX_PLAYWRIGHT_PACKAGE || "playwright");
const css = await readFile(resolve(root, "docs/study/math-interactions.css"), "utf8"), js = await readFile(resolve(root, "docs/study/math-interactions.js"), "utf8");
const previewCss = await readFile(resolve(root, "docs/study/preview.css"), "utf8");
const q = { id: "math-g4s1-synthetic-setup-v1", subject: "math", unit: 25, type: "vertical_decimal", options: [], answer: "", subtopic: "Synthetic", source: "Synthetic", text: "Synthetic original problem. First write the addition, then calculate vertically.", interaction: { op: "+", operands: ["4.2", "1.35"], result: "5.55", setup: [{ prompt: "先寫出加法算式，再用直式完成。", answer: "4.2+1.35", value: "5.55" }] } };
let browser;
try {
  await mkdir(out, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.env.CODEX_CHROMIUM_PATH ? { executablePath: process.env.CODEX_CHROMIUM_PATH } : {}) });
  const report = [];
  for (const width of [375, 768]) {
    const page = await browser.newPage({ viewport: { width, height: 1024 } });
    await page.setContent(`<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${previewCss}\n${css}</style><main class="preview-shell"><article class="preview-card"><div id="panel"></div><button id="check">確認答案</button><p id="result"></p></article></main><script>${js}</script><script>
      const q=${JSON.stringify(q)}, M=StudyMathInteractions; M.validateQuestion(q); let state=M.initial(q), feedback=false;
      function render(){ document.querySelector('#panel').innerHTML=M.render(q,state,false,feedback); document.querySelector('#check').disabled=!M.complete(q,state); }
      document.querySelector('#panel').onclick=e=>{const b=e.target.closest('[data-math-action]');if(!b)return;state=M.update(q,state,b.dataset.mathAction,b.dataset.mathValue);if(!['setupFocus','focus'].includes(b.dataset.mathAction))feedback=false;render();};
      document.querySelector('#check').onclick=()=>{feedback=true;document.querySelector('#result').textContent=M.grade(q,state)?'correct':'wrong';render();};render();
    </script>`);
    const key = async (action, value) => page.locator(`[data-math-action="${action}"][data-math-value="${value}"]`).click();
    for (const char of "5.55") await key("setupKey", char);
    for (const [row, value] of ["4.2", "1.35", "5.55"].entries()) {
      await key("focus", `${row}:1`);
      for (const char of value) await key("key", char);
    }
    await page.locator("#check").click(); assert.equal(await page.locator("#result").innerText(), "wrong");
    assert.match(await page.locator(".smi-setup").innerText(), /要修正/);
    assert.match(await page.locator("#panel").innerText(), /直式：答對/);
    await key("setupClear", ""); for (const char of "(4.20+1.35)=5.55") await key("setupKey", char);
    await page.locator("#check").click(); assert.equal(await page.locator("#result").innerText(), "correct");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    const box = await page.locator(".smi-setup .smi-keypad").boundingBox(); assert.ok(box.width <= width - 32);
    await page.screenshot({ path: resolve(out, `decimal-setup-${width}.png`), fullPage: true });
    report.push({ width, resultOnlyRejected: true, alignedVerticalAcceptedIndependently: true, equivalentExpressionAccepted: true, noPageOverflow: true });
    await page.close();
  }
  await writeFile(resolve(out, "decimal-setup-browser-receipt.json"), JSON.stringify({ status: "pass", componentOnly: true, syntheticOnly: true, actualModuleAndPreviewStyles: true, report }, null, 2));
  console.log("PASS: decimal setup component at 375/768, partial feedback and exact method grading");
} finally { await browser?.close(); }
