// 契約測試：同一份 case 矩陣（worker/contract-cases.mjs）同時餵 client 與 server（worker handler），
// 斷言兩端判定一致且收斂。client＝docs/shared/sync-v1.js 的真 sync round（#28 起）：
// 從 <sync-pure>＋<sync-client> sentinel 抽取 createSyncClient，效果（fetch／儲存／uuid／時鐘）全數注入。
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../worker/worker.mjs";
import { kvStub } from "../worker/kv-stub.mjs";
import { CONTRACT_CASES } from "../worker/contract-cases.mjs";

const src = readFileSync(new URL("../docs/shared/sync-v1.js", import.meta.url), "utf8");
const pure = src.match(/\/\/ <sync-pure>([\s\S]*?)\/\/ <\/sync-pure>/);
const clientBlk = src.match(/\/\/ <sync-client>([\s\S]*?)\/\/ <\/sync-client>/);
if (!pure || !clientBlk) throw new Error("docs/shared/sync-v1.js 找不到 sentinel 區塊");
const { createSyncClient } = new Function(
  pure[1] + clientBlk[1] + "\nreturn { createSyncClient };",
)();

const TOKEN = "t-secret";
const CHILD = "test-a";
const APP = "study";
const KV_KEY = `p:${CHILD}:${APP}`;
const BASE = "https://sync.test";

function makeEnv(c) {
  const init = {};
  if (c.serverRaw !== undefined) {
    init[KV_KEY] = { value: c.serverRaw, metadata: null };
  } else if (c.server) {
    init[KV_KEY] = {
      value: JSON.stringify({ ...c.server, updatedAt: "2026-07-11T00:00:00.000Z" }),
      metadata: { rev: c.server.rev, updatedAt: "2026-07-11T00:00:00.000Z" },
    };
  }
  return { TOKEN, KV: kvStub(init) };
}

async function directPut(env, body) {
  return worker.fetch(
    new Request(`${BASE}/v1/progress/${CHILD}/${APP}?k=${TOKEN}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
    env,
  );
}

// 真 client＋注入替身：fetchImpl 橋接 in-process worker（真離線 threw:true 由 classifyRemote 矩陣測試覆蓋）；
// raceWriteBeforePut twist＝client 首個 PUT 送達 server 前，另一裝置以同 base rev 先寫入
function makeHarness(caseClient, env, token, twists = {}) {
  const seen = { puts: [], raced: false };
  const store = {
    data: structuredClone(caseClient.data),
    meta: {
      syncedRev: caseClient.syncedRev,
      dirty: caseClient.dirty,
      lastWriteId: caseClient.lastWriteId,
    },
  };
  const client = createSyncClient({
    endpoint: BASE,
    child: CHILD,
    app: APP,
    schemaVersion: caseClient.schemaVersion,
    getToken: () => token,
    loadData: () => store.data,
    saveData: (d) => { store.data = d; },
    loadMeta: () => store.meta,
    saveMeta: (m) => { store.meta = m; },
    uuid: () => "client-w1",
    now: () => 1_000,
    fetchImpl: async (url, init = {}) => {
      const method = init.method || "GET";
      if (method === "PUT" && twists.raceWriteBeforePut && !seen.raced) {
        seen.raced = true;
        const base = JSON.parse(init.body).rev;
        const raceRes = await directPut(env, { rev: base, data: twists.raceWriteBeforePut.data, writeId: "race-w" });
        assert.equal(raceRes.status, 200, "競態寫入應成功");
      }
      if (method === "PUT") seen.puts.push(JSON.parse(init.body));
      return worker.fetch(new Request(url, { method, body: init.body }), env);
    },
  });
  return { client, store, seen };
}

async function readServer(env) {
  const raw = await env.KV.get(KV_KEY);
  if (raw === null) return { rev: 0, data: null, raw: null };
  try {
    const parsed = JSON.parse(raw);
    return { rev: parsed.rev, data: parsed.data, raw };
  } catch {
    return { rev: null, data: null, raw };
  }
}

for (const c of CONTRACT_CASES) {
  test(`契約：${c.name}`, async () => {
    const env = makeEnv(c);
    const before = await readServer(env);
    const initialClientData = structuredClone(c.client.data);
    const token = c.wrongToken ? "wrong" : TOKEN;
    const { client, store, seen } = makeHarness(c.client, env, token, {
      raceWriteBeforePut: c.raceWriteBeforePut,
    });

    const out = await client.syncNow();

    assert.equal(out.action, c.expect.firstAction, "client 首個判定");
    if (c.expect.putRejected) {
      assert.equal(out.putRejected, true, "應走過 PUT 被拒路徑");
      assert.equal(out.secondAction, "conflict-adopt", "PUT 被拒後應收斂為取遠端");
    }
    if (c.expect.firstAction === "reseed") {
      assert.ok(store.meta.reseedAt, "reseed 應記健康事件（雲端資料曾遺失）");
    }

    if (c.replayPut) {
      // response 遺失重送：同 writeId 冪等、rev 不重複遞增
      const putBody = seen.puts.at(-1);
      assert.ok(putBody, "本 case 應發出過 PUT");
      const retry = await directPut(env, putBody);
      assert.equal(retry.status, 200, "重送同 writeId 應冪等成功");
      const retryBody = await retry.json();
      assert.equal(retryBody.rev, store.meta.syncedRev, "重送不得重複遞增 rev");
    }

    const after = await readServer(env);
    if (c.expect.finalServerRev !== undefined) {
      assert.equal(after.rev, c.expect.finalServerRev, "server 最終 rev");
    }
    if (c.expect.serverUnchanged) {
      assert.equal(after.raw, before.raw, "server 不得被改動");
    }
    if (c.expect.converged) {
      assert.deepEqual(store.data, after.data, "client 與 server 收斂一致");
      assert.equal(store.meta.syncedRev, after.rev, "syncedRev 收斂到 server rev");
      assert.equal(!!store.meta.dirty, false);
    }
    if (c.expect.clientKeepsLocal) {
      assert.deepEqual(store.data, initialClientData, "client 應保留本地資料");
    }
    for (const id of c.expect.finalMasteredContains ?? []) {
      assert.ok((after.data.mastered ?? []).includes(id), `雲端終值應含 ${id}`);
      assert.ok((store.data.mastered ?? []).includes(id), `client 終值應含 ${id}`);
    }
    for (const id of c.expect.finalMasteredLacks ?? []) {
      assert.ok(!(after.data.mastered ?? []).includes(id), `雲端終值不得含 ${id}`);
      assert.ok(!(store.data.mastered ?? []).includes(id), `client 終值不得含 ${id}`);
    }
    if (c.expect.finalDataLacksErrorBankEntry) {
      const gone = c.expect.finalDataLacksErrorBankEntry;
      const inClient = (store.data.errorBank ?? []).some((e) => e.questionId === gone);
      const inServer = (after.data.errorBank ?? []).some((e) => e.questionId === gone);
      assert.equal(inClient || inServer, false, `已刪資料 ${gone} 不得復活`);
    }

    if (c.secondClientPull) {
      const other = makeHarness(
        { syncedRev: 1, dirty: false, data: { mastered: ["q1"] }, schemaVersion: 1 },
        env,
        TOKEN,
      );
      const o = await other.client.syncNow();
      assert.equal(o.action, "adopt");
      assert.deepEqual(other.store.data, store.data, "他端 pull 應得到匯入後的資料");
    }
  });
}

// ── 以下為真 client 專屬行為（替身迴圈時代測不到）：匯入定錨、beacon 不清 dirty＋own-write 疊推

test("importedLocal：GET 定錨當下遠端 rev → 同輪 push，他端 pull 得到匯入資料", async () => {
  const env = makeEnv({ server: { rev: 5, data: { mastered: ["q1"] }, writeId: "w0" } });
  // 匯入前本地落後（syncedRev 0）：定錨必須以「當下遠端 rev=5」為 base，而非本地舊值
  const { client, store } = makeHarness(
    { syncedRev: 0, dirty: false, data: { mastered: ["imported-1"] }, schemaVersion: 1 },
    env,
    TOKEN,
  );
  const out = await client.importedLocal();
  assert.equal(out.action, "push", "定錨後應以 LWW 最新寫入身分 push");
  const after = await readServer(env);
  assert.equal(after.rev, 6);
  assert.deepEqual(after.data, { mastered: ["imported-1"] });
  assert.equal(store.meta.syncedRev, 6);
  assert.equal(!!store.meta.dirty, false);
});

test("markImported 定錨標記持久化：定錨 GET 失敗 → 下一輪成功 GET 補定錨 → push 勝出（非 conflict-adopt）", async () => {
  // 匯入前雲端已在 rev 42（他機舊寫入）、本地 meta 落後：標記必須撐過失敗的定錨輪
  const env = makeEnv({ server: { rev: 42, data: { mastered: ["remote"] }, writeId: "w-other" } });
  let failNext = true;
  const store = { data: { mastered: ["imported-1"] }, meta: { syncedRev: 40, dirty: false } };
  const client = createSyncClient({
    endpoint: BASE,
    child: CHILD,
    app: APP,
    schemaVersion: 1,
    getToken: () => TOKEN,
    loadData: () => store.data,
    saveData: (d) => { store.data = d; },
    loadMeta: () => store.meta,
    saveMeta: (m) => { store.meta = m; },
    uuid: () => "client-w1",
    now: () => 1_000,
    debounceMs: 0,
    fetchImpl: async (url, init = {}) => {
      if (failNext && (init.method || "GET") === "GET") { failNext = false; throw new Error("offline"); }
      return worker.fetch(new Request(url, { method: init.method || "GET", body: init.body }), env);
    },
  });

  const first = await client.importedLocal();
  assert.equal(first.action, "offline");
  assert.equal(store.meta.anchorPending, true, "定錨標記須持久化等待下一輪");
  assert.equal(store.meta.dirty, true);

  const second = await client.syncNow();
  assert.equal(second.action, "push", "補定錨後應以匯入資料 push，而非被 conflict-adopt 丟棄");
  const after = await readServer(env);
  assert.equal(after.rev, 43);
  assert.deepEqual(after.data, { mastered: ["imported-1"] });
  assert.equal(store.meta.anchorPending, false, "定錨完成後標記須清除");
  assert.equal(store.meta.syncedRev, 43);
});

test("flushBeacon：beacon 後永不清 dirty；下輪 GET 認出 own-write → 疊推零損失", async () => {
  const env = makeEnv({ server: { rev: 2, data: { mastered: ["q1"] }, writeId: "w0" } });
  const beacons = [];
  const store = {
    data: { mastered: ["q1", "q2"] },
    meta: { syncedRev: 2, dirty: true, lastWriteId: undefined },
  };
  let uuidSeq = 0;
  const client = createSyncClient({
    endpoint: BASE,
    child: CHILD,
    app: APP,
    schemaVersion: 1,
    getToken: () => TOKEN,
    loadData: () => store.data,
    saveData: (d) => { store.data = d; },
    loadMeta: () => store.meta,
    saveMeta: (m) => { store.meta = m; },
    uuid: () => `w-${++uuidSeq}`,
    now: () => 1_000,
    debounceMs: 0,
    beaconImpl: (url, body) => { beacons.push({ url, body }); return true; },
    fetchImpl: async (url, init = {}) =>
      worker.fetch(new Request(url, { method: init.method || "GET", body: init.body }), env),
  });

  assert.equal(client.flushBeacon(), true);
  assert.equal(store.meta.dirty, true, "beacon 讀不到 response → 不得清 dirty");
  assert.equal(store.meta.lastWriteId, "w-1");
  assert.equal(store.meta.pendingWriteId, "w-1");

  // 模擬 beacon 實際送達 server（sendBeacon＝POST 別名）
  const beacon = beacons[0];
  const landed = await worker.fetch(new Request(beacon.url, { method: "POST", body: beacon.body }), env);
  assert.equal(landed.status, 200);

  // 頁面死前又答了一題（beacon 後新變更 → 未決寫入作廢、下輪換新 writeId）
  store.data = { mastered: ["q1", "q2", "q3"] };
  client.markDirty();
  assert.equal(store.meta.pendingWriteId, null);

  // 下次開站：遠端領先但 writeId 命中自己的 beacon → push 疊推，不丟 q3
  const out = await client.syncNow();
  assert.equal(out.action, "push", "own-write 應續 push 而非 conflict-adopt");
  const after = await readServer(env);
  assert.equal(after.rev, 4);
  assert.deepEqual(after.data, { mastered: ["q1", "q2", "q3"] });
  assert.equal(store.meta.syncedRev, 4);
  assert.equal(!!store.meta.dirty, false);
});
