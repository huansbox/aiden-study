// Fresh isolated serve-family instance; real parent controls, Study batches and spelling round.
// Usage: node scripts/verify-daily-goal-rewards.mjs <local-CDP-websocket> <local-test-origin>
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { connectBrowser } from "../tests/helpers/collection-browser.mjs";
const [endpoint, origin] = process.argv.slice(2);
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin || "")) throw Error("Only an isolated local test origin is accepted");
if (!(await (await fetch(origin + "/test/controls")).text()).includes("隔離測試控制")) throw Error("Not an isolated test server");
await fetch(origin + "/test/study-social-pack");
const browser = await connectBrowser(endpoint, origin), checks = [];
const state = () => browser.evaluate('KidsCollection.create("aiden").snapshot()');
const settled = () => browser.waitFor('KidsCollection.create("aiden").snapshot().sync.pending===0 && KidsCollection.create("aiden").snapshot().sync.status==="ready"');
const passed = (label) => { checks.push(label); console.log("PASS " + label); };
async function checkHome(earned) {
  await browser.navigate(origin + "/?child=aiden");
  await browser.waitFor(`document.querySelector(".daily-pack-count")?.textContent==="今日拼裝包 ${earned} / 4"`);
  assert.match(await browser.evaluate('document.querySelector(".daily-explanation").textContent'), /4 種目標共可領 4 包/);
}
async function study(entryId, unit, earned) {
  await browser.click(`[data-entry="${entryId}"] a`);
  await browser.waitFor(`document.querySelector('button[onclick="window._startFull(${unit})"]')`);
  await browser.click(`button[onclick="window._startFull(${unit})"]`);
  await browser.waitFor('document.querySelector("#page-quiz:not(.hidden) .q-text")');
  let answers = 0;
  while (await browser.evaluate('!document.querySelector("#page-quiz").classList.contains("hidden")')) {
    const text = await browser.evaluate('document.querySelector(".q-text").innerText');
    assert.match(text, /合成/, "only synthetic fixtures may be answered");
    if (await browser.evaluate('Boolean(document.querySelector("#q-options .opt-btn"))')) {
      const answer = text.includes("所有地方") ? "false" : text.includes("觀察紀錄") || text.includes("不同地形") ? "true" : text.includes("觀察工具") ? "1" : "2";
      await browser.click(`#q-options [data-value="${answer}"]`);
    } else {
      if (await browser.evaluate('Boolean(document.querySelector(".choice-btn"))')) await browser.click('.choice-btn[data-val=">"]');
      else {
        const answer = text.match(/請輸入 (\d+)/)?.[1];
        assert.ok(answer, "known synthetic numeric answer");
        for (const digit of answer) await browser.click(`#numpad [data-key="${digit}"]`);
      }
      await browser.click("#fib-submit");
    }
    await browser.waitFor('document.querySelector("#next-btn:not(.hidden)")');
    assert.equal(await browser.evaluate('Boolean(document.querySelector("#family-reward"))'), false, "no reward during answer feedback");
    await browser.click("#next-btn");
    if (++answers > 12) throw Error("Study batch did not end");
  }
  await settled();
  await browser.waitFor('document.querySelector("#family-reward")?.textContent.includes("拼裝")');
  assert.equal((await state()).daily.earned, earned);
  await checkHome(earned);
  passed(`${entryId}: one pack at threshold, notification only at batch end, home ${earned}/4`);
}
try {
  await mkdir(".scratch/daily-goal-rewards", { recursive: true });
  await browser.send("Storage.clearDataForOrigin", { origin, storageTypes: "all" });
  await browser.send("Emulation.setDeviceMetricsOverride", { width: 768, height: 1024, deviceScaleFactor: 1, mobile: true });
  await browser.navigate(origin + "/parent/?k=test-token");
  await browser.waitFor('document.querySelector("[data-parent-view=settings]")');
  await browser.click('[data-parent-view="settings"]');
  await browser.waitFor('document.querySelector("#save-daily-goals")');
  const goals = ["study:math", "study:science", "study:social", "spelling"];
  const available = await browser.evaluate('Array.from(document.querySelectorAll("[data-daily-entry]")).map(el=>({id:el.dataset.dailyEntry,checked:el.checked}))');
  for (const { id, checked } of available) if (checked !== goals.includes(id)) await browser.click(`[data-daily-entry="${id}"]`);
  for (const id of goals) await browser.evaluate(`(() => { const el=document.querySelector('[data-daily-quantity="${id}"]'); el.value=1; el.dispatchEvent(new Event("input",{bubbles:true})); })()`);
  await browser.click("#save-daily-goals");
  await browser.waitFor('document.querySelector("#daily-goals-status").textContent.startsWith("已儲存")');
  assert.equal((await state()).daily.limit, 4);
  passed("parent saves four kinds of daily goals, dynamic limit four");
  await checkHome(0);
  await study("study:math", 15, 1);
  await study("study:science", 20, 2);
  await study("study:social", 22, 3);
  await browser.click('[data-entry="spelling"] a');
  await browser.waitFor('document.querySelector("#spell-next")');
  let cards = 0;
  while (await browser.evaluate('Boolean(document.querySelector("#spell-next"))')) {
    assert.equal(await browser.evaluate('Boolean(document.querySelector("#family-reward"))'), false);
    await browser.click("#spell-next");
    if (++cards > 60) throw Error("Spelling round did not end");
  }
  await settled();
  await browser.waitFor('document.querySelector("#family-reward")?.textContent.includes("拼裝")');
  assert.equal((await state()).daily.earned, 4);
  await checkHome(4);
  passed("fourth goal spelling full round awards exactly fourth pack, home 4/4");
  await browser.screenshot(".scratch/daily-goal-rewards/home-four-packs.png");
  assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'), true, "portrait page has no horizontal overflow");
  await browser.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'), true, "narrow page has no horizontal overflow");
  await browser.screenshot(".scratch/daily-goal-rewards/home-narrow.png");
  await browser.click('[data-entry="spelling"] a');
  await browser.waitFor('document.querySelector("#spell-next")');
  cards = 0;
  while (await browser.evaluate('Boolean(document.querySelector("#spell-next"))')) {
    await browser.click("#spell-next"); if (++cards > 60) throw Error("Repeat spelling round did not end");
  }
  await settled(); assert.equal((await state()).daily.earned, 4);
  await checkHome(4);
  passed("repeat practice keeps exactly four packs; portrait and narrow home render without overflow");
  await writeFile(".scratch/daily-goal-rewards/result.json", JSON.stringify({ checks, finalDaily: (await state()).daily }, null, 2) + "\n");
} finally { browser.close(); }
