// 先啟動 serve-study-auto-pack.mjs；只連 loopback synthetic fixture。
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PLAYWRIGHT_PACKAGE || "playwright");
const base=`http://127.0.0.1:${Number(process.argv[2] || 8798)}`;
const browser=await chromium.launch({headless:true});
try {
  const context=await browser.newContext({viewport:{width:768,height:1024}});
  const page=await context.newPage(), calls=[],errors=[];
  page.on("request",r=>{if(r.url().includes("/packs/"))calls.push(r.url());});
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto(base+"/test-start?scenario=catalog");
  await page.locator("#pack-availability").filter({hasText:"題庫版本"}).waitFor({state:"attached"});
  assert.equal(calls.filter(u=>u.includes("/shards/")).length,0);
  await page.locator('[onclick="window._startFull(15)"]').click();
  await page.locator("#page-quiz:not(.hidden)").waitFor();
  assert.ok(calls.some(u=>u.includes("/shards/")));
  const count=calls.length;
  await page.reload();
  await page.locator('[onclick="window._startFull(15)"]').click();
  await page.locator("#page-quiz:not(.hidden)").waitFor();
  assert.equal(calls.slice(count).filter(u=>u.includes("/shards/")).length,0);
  const progress=await page.evaluate(()=>localStorage.getItem("study:progress:test-child"));
  await page.goto(base+"/study/preview.html?child=test-child");
  await page.locator(".preview-question").waitFor();
  await page.locator('[data-action="subject"]').selectOption("science");
  await page.locator(".preview-question").waitFor();
  await page.locator('[data-action="unit"]').selectOption("21");
  await page.locator('[data-action="subject"]').selectOption("social");
  await page.locator(".preview-question").waitFor();
  assert.equal(await page.locator('[data-action="unit"]').inputValue(),"22");
  assert.equal(await page.evaluate(()=>localStorage.getItem("study:progress:test-child")),progress);
  assert.deepEqual(errors,[]);
  console.log("PASS: boot catalog only; selected-unit load; real IndexedDB reload; rapid preview selection; progress unchanged");
} finally {await browser.close();}
