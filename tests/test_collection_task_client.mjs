import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { collectionRuntime } from "./helpers/collection-runtime.mjs";
const taskId = "number-line-difference", completedQuestionIds = ["p1", "p2", "p3", "p4", "p5", "p6"];
const complete = (collection) => collection.completeTask({ taskId, completedQuestionIds });

function client(runtime, { storage = new Map() } = {}) {
  let offline = false, failWrites = false, loseResponse = false;
  const requests = [];
  const localStorage = { get length() { return storage.size; }, key: (i) => [...storage.keys()][i], getItem: (key) => storage.get(key) ?? null,
    setItem(key, value) { if (failWrites) throw Error("storage full"); storage.set(key, String(value)); }, removeItem: (key) => storage.delete(key) };
  const ctx = vm.createContext({ Intl, Date, URL, JSON, Map, Set, Promise, crypto: globalThis.crypto, localStorage, CustomEvent: class {}, addEventListener() {}, dispatchEvent() {} });
  ctx.window = ctx;
  ctx.KidsFamily = {
    read(key, fallback = null) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
    write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } },
    async request(path, init = {}) {
      if (offline) throw Error("offline");
      if (init.method) requests.push({ path, body: JSON.parse(init.body) });
      const response = await runtime.fetch(new Request("http://local" + path, { ...init, headers: { Authorization: "Bearer test-token", "Content-Type": "application/json" } }));
      if (loseResponse && init.method) { loseResponse = false; throw Error("response lost"); }
      const result = await response.json();
      if (!response.ok) { const error = Error(result.error); error.status = response.status; throw error; }
      return result;
    },
  };
  for (const file of ["collection-core.js", "collection-client.js"]) vm.runInContext(readFileSync(new URL("../docs/shared/" + file, import.meta.url), "utf8"), ctx);
  return { context: ctx, collection: ctx.KidsCollection.create("test-number-line-client"), storage, requests, offline: (value) => { offline = value; }, failWrites: (value) => { failWrites = value; }, loseResponse: () => { loseResponse = true; } };
}

const platformSource = () => readFileSync(new URL("../learning-tasks/number-line-difference/source/platform.js", import.meta.url), "utf8").replace("export async function", "async function");

test("家長 preview 的正式 platform 分支不碰身分、storage、收藏或網路", async () => {
  const context = vm.createContext({});
  for (const name of ["location", "localStorage", "window", "document", "fetch", "KidsFamily", "KidsCollection", "KidsAuth"]) {
    Object.defineProperty(context, name, { get() { throw Error("Preview touched " + name); } });
  }
  vm.runInContext(platformSource(), context);
  const platform = await context.openPlatform(true);
  assert.equal(platform.preview, true); assert.equal(platform.child, null);
  assert.equal(platform.load(), null); assert.equal(platform.save({}), true);
  assert.equal(platform.reward().status, "preview");
  await platform.finish(completedQuestionIds); await platform.retry();
});

test("Pad platform 真正連接正式收藏 client，只有 finish 才排任務包且可重開讀回", async () => {
  const runtime = await collectionRuntime();
  try {
    const h = client(runtime), loadedScripts = [];
    const context = h.context;
    context.URLSearchParams = URLSearchParams;
    context.location = { search: "?child=aiden" };
    context.document = { createElement: () => ({}), head: { append(script) { loadedScripts.push(script.src); script.onload(); } } };
    context.KidsAuth = { ready: Promise.resolve(), state: { status: "ready" }, refresh: async () => {} };
    vm.runInContext(platformSource(), context);
    const platform = await context.openPlatform(false); await platform.ready;
    assert.ok(loadedScripts.some((src) => src.includes("collection-client.js")));
    assert.equal(platform.reward().status, "unearned");
    assert.equal(platform.save({ runId: "one", question: 5 }), true);
    assert.equal(platform.load().question, 5);
    assert.equal(h.requests.length, 0, "題內存檔不發包");
    await platform.finish(completedQuestionIds);
    assert.equal(platform.reward().status, "earned");
    assert.equal(h.requests.length, 1); assert.ok(h.requests[0].path.endsWith("/task-complete"));
    const reopened = await context.openPlatform(false); await reopened.ready;
    await reopened.finish(completedQuestionIds);
    assert.equal(reopened.reward().status, "earned"); assert.equal(h.requests.length, 1);
  } finally { await runtime.dispose(); }
});

test("離線首次完成保存同一操作、重開補送；另一裝置與清空本機後讀回已領", async () => {
  const runtime = await collectionRuntime();
  try {
    const first = client(runtime); await first.collection.ready;
    first.offline(true);
    const pending = await complete(first.collection);
    assert.equal(pending.taskRewards[taskId].status, "pending");
    assert.equal(pending.grants.length, 0, "尚未確認時不顯示已發包");
    assert.equal(pending.sync.pending, 1);
    await complete(first.collection);
    assert.equal(first.collection.snapshot().sync.pending, 1, "重做沿用尚未送達操作");
    const reopened = client(runtime, { storage: first.storage }); await reopened.collection.ready;
    assert.equal(reopened.collection.snapshot().taskRewards[taskId].status, "earned");
    assert.equal(reopened.collection.snapshot().sync.pending, 0);
    assert.equal(reopened.requests.length, 1);
    assert.ok(reopened.requests.every((r) => r.path.endsWith("/task-complete")), "不送 record/round");
    const freshDevice = client(runtime); await freshDevice.collection.ready;
    assert.equal(freshDevice.collection.snapshot().taskRewards[taskId].status, "earned");
    await complete(freshDevice.collection);
    assert.equal(freshDevice.requests.length, 0, "已領重做不需再排命令");
    assert.equal(freshDevice.collection.snapshot().daily.earned, 0);
  } finally { await runtime.dispose(); }
});

test("回應遺失保留同 commandId，兩裝置離線各自完成後仍同一包", async () => {
  const runtime = await collectionRuntime();
  try {
    const one = client(runtime), two = client(runtime);
    await Promise.all([one.collection.ready, two.collection.ready]);
    two.offline(true); await complete(two.collection);
    one.loseResponse();
    const lost = await complete(one.collection);
    assert.equal(lost.taskRewards[taskId].status, "pending");
    assert.equal(lost.sync.pending, 1);
    const commandId = one.requests[0].body.commandId;
    await one.collection.flush();
    assert.equal(one.requests[1].body.commandId, commandId);
    assert.equal(one.collection.snapshot().taskRewards[taskId].status, "earned");
    two.offline(false); await two.collection.flush();
    assert.notEqual(two.requests[0].body.commandId, commandId);
    assert.equal(two.collection.snapshot().grants.length, 1);
    assert.equal(two.collection.snapshot().taskRewards[taskId].grantId, one.collection.snapshot().taskRewards[taskId].grantId);
  } finally { await runtime.dispose(); }
});

test("未完成不排命令，本機寫入失敗會明確拒絕，修復後才能保存並補送", async () => {
  const runtime = await collectionRuntime();
  try {
    const h = client(runtime); await h.collection.ready;
    await assert.rejects(h.collection.completeTask({ taskId, completedQuestionIds: ["p1"] }), /全部六題/);
    assert.equal(h.requests.length, 0); assert.equal(h.collection.snapshot().sync.pending, 0);
    h.failWrites(true);
    await assert.rejects(complete(h.collection), /無法保存新的成果/);
    assert.equal(h.requests.length, 0); assert.equal(h.collection.snapshot().taskRewards[taskId].status, "unearned");
    h.failWrites(false); await complete(h.collection);
    assert.equal(h.collection.snapshot().taskRewards[taskId].status, "earned");
  } finally { await runtime.dispose(); }
});
