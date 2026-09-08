// 注音 MVP 內容資料＋音檔資產審計（issue #16）。
// 執行：node --test tests/test_zhuyin_content.mjs
// 斷言分兩類：①內容不變量＋孤兒檔（有檔無 key）＝fail；②缺檔（有 key 無檔）＝聚合警告、不 fail
// ——家長錄音與後續票開發並行，缺檔歸零的收尾驗收在 #20。全部聚合列出、不 fail-fast。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";

const contentUrl = new URL("../docs/zhuyin/content.json", import.meta.url);
const content = JSON.parse(readFileSync(contentUrl, "utf8"));

const KEY_RE = /^[a-z0-9-]+$/;
const KINDS = ["onset", "rime"];

function collectContentErrors(c) {
  const errs = [];
  if (!c.audio || typeof c.audio.dir !== "string" || !c.audio.dir.endsWith("/"))
    errs.push("audio.dir 必須是以 / 結尾的字串");
  if (!c.audio || typeof c.audio.ext !== "string" || !c.audio.ext.startsWith("."))
    errs.push("audio.ext 必須是以 . 開頭的字串");

  const keyOwner = new Map(); // 音檔 key -> 擁有者描述（key＝檔名主幹，必須全域唯一）
  const claimKey = (key, desc) => {
    if (typeof key !== "string" || !KEY_RE.test(key)) {
      errs.push(`${desc}：音檔 key「${key}」不合法（只允許 a-z、0-9、-）`);
      return;
    }
    if (keyOwner.has(key)) errs.push(`${desc}：音檔 key「${key}」與「${keyOwner.get(key)}」重複`);
    else keyOwner.set(key, desc);
  };

  const symbolKind = new Map(); // glyph -> kind
  for (const s of c.symbols || []) {
    const desc = `符號「${s.glyph}」`;
    if (typeof s.glyph !== "string" || s.glyph.length !== 1) errs.push(`${desc}：glyph 必須是單一字元`);
    else if (symbolKind.has(s.glyph)) errs.push(`${desc}：glyph 重複`);
    else symbolKind.set(s.glyph, s.kind);
    if (!KINDS.includes(s.kind)) errs.push(`${desc}：kind「${s.kind}」不合法（onset｜rime）`);
    claimKey(s.audio, desc);
  }
  if (!symbolKind.size) errs.push("symbols 不可為空");

  const circleIds = new Set();
  for (const circle of c.circles || []) {
    const desc = `圈「${circle.id}」`;
    if (typeof circle.id !== "string" || !circle.id) errs.push("圈缺 id");
    else if (circleIds.has(circle.id)) errs.push(`${desc}：id 重複`);
    else circleIds.add(circle.id);
    const seen = new Set();
    for (const g of circle.entryOrder || []) {
      if (!symbolKind.has(g)) errs.push(`${desc}：entryOrder 引用不存在的符號「${g}」`);
      if (seen.has(g)) errs.push(`${desc}：entryOrder 重複「${g}」`);
      seen.add(g);
    }
    if (!seen.size) errs.push(`${desc}：entryOrder 不可為空`);
  }
  if (!circleIds.size) errs.push("circles 不可為空");

  const circleSets = (c.circles || []).map((x) => new Set(x.entryOrder || []));
  const comboSeen = new Set();
  for (const y of c.syllables || []) {
    const z = `${y.onset}${y.rime}${y.tone}`;
    const desc = `音節「${z}」`;
    if (symbolKind.get(y.onset) !== "onset") errs.push(`${desc}：onset「${y.onset}」不是已定義的聲符`);
    if (symbolKind.get(y.rime) !== "rime") errs.push(`${desc}：rime「${y.rime}」不是已定義的韻符`);
    if (!Number.isInteger(y.tone) || y.tone < 1 || y.tone > 4) errs.push(`${desc}：tone「${y.tone}」不合法（1–4）`);
    if (comboSeen.has(z)) errs.push(`${desc}：聲韻調組合重複`);
    comboSeen.add(z);
    if (!circleSets.some((set) => set.has(y.onset) && set.has(y.rime)))
      errs.push(`${desc}：不被任何圈覆蓋（聲符與韻符沒有同時出現在同一圈）`);
    claimKey(y.audio, desc);
    if (y.word !== undefined) {
      const wdesc = `${desc}的詞「${y.word && y.word.text}」`;
      if (!y.word || typeof y.word.text !== "string" || !y.word.text) errs.push(`${wdesc}：text 不可為空`);
      if (!y.word || typeof y.word.emoji !== "string" || !y.word.emoji) errs.push(`${wdesc}：emoji 不可為空`);
      claimKey(y.word && y.word.audio, wdesc);
    }
  }
  if (!comboSeen.size) errs.push("syllables 不可為空");

  return errs;
}

function audioKeys(c) {
  const keys = [];
  for (const s of c.symbols || []) keys.push(s.audio);
  for (const y of c.syllables || []) {
    keys.push(y.audio);
    if (y.word) keys.push(y.word.audio);
  }
  return keys;
}

// 孤兒＝資產目錄裡對不回任何 key 的檔（含副檔名不符規約者）；點開頭的檔（.gitkeep 等）不計
function collectOrphans(keys, files, ext) {
  const keySet = new Set(keys);
  return files.filter((f) => !(f.endsWith(ext) && keySet.has(f.slice(0, -ext.length))));
}

function collectMissing(keys, files, ext) {
  const fileSet = new Set(files);
  return keys.filter((k) => !fileSet.has(k + ext));
}

function listAudioFiles(dirUrl) {
  if (!existsSync(dirUrl)) return [];
  return readdirSync(dirUrl).filter((f) => !f.startsWith("."));
}

// ── 出貨檔審計 ──

test("內容不變量：出貨 content.json 零錯誤（聚合列出）", () => {
  assert.deepEqual(collectContentErrors(content), []);
});

const keys = audioKeys(content);
const files = listAudioFiles(new URL(`../docs/zhuyin/${content.audio.dir}`, import.meta.url));

test("孤兒檔（有檔無 key）＝零", () => {
  assert.deepEqual(collectOrphans(keys, files, content.audio.ext), []);
});

test("缺檔（有 key 無檔）＝警告列表、不 fail", () => {
  const missing = collectMissing(keys, files, content.audio.ext);
  if (missing.length) {
    console.warn(`⚠ 缺音檔 ${missing.length}/${keys.length}（家長錄音完成前屬預期；歸零驗收在 #20）：`);
    for (const k of missing) console.warn(`  - ${k}${content.audio.ext}`);
  }
});

// ── 審計函式本身的行為（餵壞資料，證明每類錯誤真的會被抓、且聚合不 fail-fast）──

test("collector：多類錯誤一次聚合抓到", () => {
  const bad = JSON.parse(JSON.stringify(content));
  bad.circles[0].entryOrder.push("ㄆ"); // 引用不存在的符號
  bad.symbols[2].kind = "vowel"; // 不合法 kind（連帶 ㄚ 不再是韻符）
  bad.syllables[0].tone = 5; // 聲調越界
  bad.syllables[1].audio = "syl-ba1"; // 音檔 key 重複
  bad.syllables[2].audio = "SYL_BA3"; // 不合法 key
  bad.syllables[3].word.emoji = ""; // 詞缺 emoji
  bad.syllables.push({ onset: "ㄇ", rime: "ㄚ", tone: 2, audio: "syl-ma2b" }); // 聲韻調重複
  const errs = collectContentErrors(bad);
  const hit = (substr) => errs.some((e) => e.includes(substr));
  assert.ok(hit("引用不存在的符號「ㄆ」"), errs.join("\n"));
  assert.ok(hit("kind「vowel」不合法"), errs.join("\n"));
  assert.ok(hit("「ㄚ」不是已定義的韻符"), errs.join("\n"));
  assert.ok(hit("tone「5」不合法"), errs.join("\n"));
  assert.ok(hit("key「syl-ba1」與"), errs.join("\n"));
  assert.ok(hit("key「SYL_BA3」不合法"), errs.join("\n"));
  assert.ok(hit("emoji 不可為空"), errs.join("\n"));
  assert.ok(hit("聲韻調組合重複"), errs.join("\n"));
});

test("collector：音節不被任何圈覆蓋要抓到", () => {
  const bad = JSON.parse(JSON.stringify(content));
  bad.circles[0].entryOrder = ["ㄅ", "ㄚ"]; // 拿掉 ㄇ，ㄇㄚ 系列失去覆蓋
  const errs = collectContentErrors(bad);
  assert.ok(errs.some((e) => e.includes("音節「ㄇㄚ1」：不被任何圈覆蓋")), errs.join("\n"));
});

test("collectOrphans：非規約副檔名與陌生檔名都算孤兒", () => {
  const ks = ["sym-b", "syl-ba1"];
  assert.deepEqual(collectOrphans(ks, ["sym-b.m4a", "syl-ba1.m4a"], ".m4a"), []);
  assert.deepEqual(
    collectOrphans(ks, ["sym-b.m4a", "sym-b.webm", "old-take.m4a"], ".m4a"),
    ["sym-b.webm", "old-take.m4a"]
  );
});

test("collectMissing：只列沒有對應檔的 key", () => {
  assert.deepEqual(collectMissing(["sym-b", "sym-m"], ["sym-b.m4a"], ".m4a"), ["sym-m"]);
  assert.deepEqual(collectMissing(["sym-b"], ["sym-b.m4a"], ".m4a"), []);
});
