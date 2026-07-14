import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/worker.mjs";
import { kvStub } from "../worker/kv-stub.mjs";

const TOKEN = "t-secret";
const BASE = "https://sync.test";
const OLD_ORIGIN = "https://huansbox.github.io";
const NEW_ORIGIN = "https://kids.linshuhuan.com";

function env(kv = kvStub()) {
  return { TOKEN, KV: kv };
}

function req(path, { method = "GET", origin, body, token = TOKEN, header = false } = {}) {
  const headers = {};
  if (origin) headers.Origin = origin;
  let url = `${BASE}${path}`;
  if (token !== null) {
    if (header) headers.Authorization = `Bearer ${token}`;
    else url += (url.includes("?") ? "&" : "?") + `k=${token}`;
  }
  return new Request(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function seeded(entries) {
  const init = {};
  for (const [child, app, stored] of entries) {
    init[`p:${child}:${app}`] = {
      value: JSON.stringify(stored),
      metadata: { rev: stored.rev, updatedAt: stored.updatedAt ?? "2026-07-11T00:00:00.000Z" },
    };
  }
  return kvStub(init);
}

test("OPTIONS：白名單 origin 回 ACAO（新舊兩個都放行）", async () => {
  for (const origin of [OLD_ORIGIN, NEW_ORIGIN]) {
    const res = await worker.fetch(req("/v1/progress/test-a/study", { method: "OPTIONS", origin, token: null }), env());
    assert.equal(res.status, 204);
    assert.equal(res.headers.get("Access-Control-Allow-Origin"), origin);
  }
});

test("OPTIONS：非白名單 origin 不回 ACAO", async () => {
  const res = await worker.fetch(req("/v1/progress/test-a/study", { method: "OPTIONS", origin: "https://evil.example", token: null }), env());
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), null);
});

test("無 token／錯 token → 401", async () => {
  for (const token of [null, "wrong"]) {
    const res = await worker.fetch(req("/v1/progress/test-a/study", { token }), env());
    assert.equal(res.status, 401);
  }
});

test("token 可走 Authorization header", async () => {
  const res = await worker.fetch(req("/v1/progress/test-a/study", { header: true }), env());
  assert.equal(res.status, 200);
});

test("GET 從未寫過的 key → 200 合法空（可播種），非 404", async () => {
  const res = await worker.fetch(req("/v1/progress/test-a/study"), env());
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { rev: 0, data: null });
});

test("PUT 播種→GET round-trip", async () => {
  const kv = kvStub();
  const put = await worker.fetch(
    req("/v1/progress/test-a/study", { method: "PUT", body: { rev: 0, data: { m: [1] }, writeId: "w1" } }),
    env(kv),
  );
  assert.equal(put.status, 200);
  const putBody = await put.json();
  assert.deepEqual(Object.keys(putBody).sort(), ["epoch", "rev"], "PUT 回應不得多帶非預期欄位");
  assert.equal(putBody.rev, 1);
  assert.equal(typeof putBody.epoch, "string");
  const get = await worker.fetch(req("/v1/progress/test-a/study"), env(kv));
  assert.deepEqual(await get.json(), { rev: 1, data: { m: [1] }, writeId: "w1", epoch: putBody.epoch });
  assert.equal(get.headers.get("Cache-Control"), "no-store");
});

test("POST 為 PUT 的 beacon 別名", async () => {
  const kv = kvStub();
  const res = await worker.fetch(
    req("/v1/progress/test-a/study", { method: "POST", body: { rev: 0, data: { m: [] }, writeId: "w1" } }),
    env(kv),
  );
  assert.equal(res.status, 200);
});

test("PUT 帶落後 rev＋不同 writeId → 409 回現行 rev", async () => {
  const kv = seeded([["test-a", "study", { rev: 4, data: { m: [1] }, writeId: "w0" }]]);
  const res = await worker.fetch(
    req("/v1/progress/test-a/study", { method: "PUT", body: { rev: 3, data: { m: [2] }, writeId: "w9" } }),
    env(kv),
  );
  assert.equal(res.status, 409);
  assert.deepEqual(await res.json(), { rev: 4 });
});

test("PUT 重送同 writeId → 200 冪等、rev 不重複遞增", async () => {
  const kv = kvStub();
  const body = { rev: 0, data: { m: [1] }, writeId: "w1" };
  const first = await worker.fetch(req("/v1/progress/test-a/study", { method: "PUT", body }), env(kv));
  assert.equal((await first.json()).rev, 1);
  const retry = await worker.fetch(req("/v1/progress/test-a/study", { method: "PUT", body }), env(kv));
  assert.equal(retry.status, 200);
  const retryBody = await retry.json();
  assert.equal(retryBody.rev, 1);
  assert.equal(retryBody.idempotent, true);
});

// ── 世代章 epoch（票 #37）：讓 client 分得出「KV 舊讀」與「雲端已被他機重新播種」──

const PATH = "/v1/progress/test-a/study";
const put = (kv, body) => worker.fetch(req(PATH, { method: "PUT", body }), env(kv));

test("世代章：同一世代內的 PUT 原樣帶下去（rev 遞增、章不變）", async () => {
  const kv = kvStub();
  const seed = await put(kv, { rev: 0, data: { m: [1] }, writeId: "w1" });
  const epoch = (await seed.json()).epoch;
  const next = await put(kv, { rev: 1, data: { m: [2] }, writeId: "w2" });
  const body = await next.json();
  assert.equal(body.rev, 2);
  assert.equal(body.epoch, epoch, "同一世代不得換章，否則他機每輪都誤判成換代");
});

test("世代章：KV 遺失後重新播種 → 鑄新章（#37 的換代訊號來源）", async () => {
  const before = kvStub();
  const a = await put(before, { rev: 0, data: { m: [1] }, writeId: "w1" });
  const epochBefore = (await a.json()).epoch;

  const rebuilt = kvStub(); // namespace 重建／key 誤刪＝整包空
  const b = await put(rebuilt, { rev: 0, data: { m: [9] }, writeId: "w2" });
  const after = await b.json();
  assert.equal(after.rev, 1, "rev 從 1 重數（跨代不可比，正是卡死的根因）");
  assert.notEqual(after.epoch, epochBefore, "換代必須換章，落後裝置才分得出這不是舊讀");
});

test("世代章：冪等重送回同一枚章", async () => {
  const kv = kvStub();
  const body = { rev: 0, data: { m: [1] }, writeId: "w1" };
  const epoch = (await (await put(kv, body)).json()).epoch;
  const retry = await (await put(kv, body)).json();
  assert.equal(retry.idempotent, true);
  assert.equal(retry.epoch, epoch);
});

test("世代章：舊協定存檔（無章）→ 下次 PUT 補鑄，不留無章存檔", async () => {
  const kv = seeded([["test-a", "study", { rev: 3, data: { m: [1] }, writeId: "w0" }]]);
  const get = await worker.fetch(req(PATH), env(kv));
  assert.equal((await get.json()).epoch, undefined, "改動前寫的存檔本來就沒有章");
  const res = await put(kv, { rev: 3, data: { m: [2] }, writeId: "w1" });
  assert.equal(typeof (await res.json()).epoch, "string");
});

test("PUT 壞 JSON → 400；壞形狀 → 400", async () => {
  const raw = new Request(`${BASE}/v1/progress/test-a/study?k=${TOKEN}`, { method: "PUT", body: "{{{" });
  assert.equal((await worker.fetch(raw, env())).status, 400);
  for (const body of [{ rev: -1, data: null, writeId: "w" }, { rev: 0, data: null, writeId: "" }, { rev: 0, writeId: "w" }, { rev: "0", data: null, writeId: "w" }]) {
    const res = await worker.fetch(req("/v1/progress/test-a/study", { method: "PUT", body }), env());
    assert.equal(res.status, 400, JSON.stringify(body));
  }
});

test("GET 到損毀存檔 → 500（非合法空）", async () => {
  const kv = kvStub({ "p:test-a:study": { value: "{{{not json", metadata: null } });
  const res = await worker.fetch(req("/v1/progress/test-a/study"), env(kv));
  assert.equal(res.status, 500);
});

test("形狀壞的存檔（可 parse 但缺 rev）→ GET/PUT 皆 500，不磚化不回假資料", async () => {
  const kv = kvStub({ "p:test-a:study": { value: "{}", metadata: null } });
  const get = await worker.fetch(req("/v1/progress/test-a/study"), env(kv));
  assert.equal(get.status, 500);
  const put = await worker.fetch(
    req("/v1/progress/test-a/study", { method: "PUT", body: { rev: 0, data: null, writeId: "w1" } }),
    env(kv),
  );
  assert.equal(put.status, 500);
});

test("KV 拋錯 → 帶 CORS 的 500（不可漏成無 header 錯誤頁被誤判離線）", async () => {
  const throwing = {
    async get() {
      throw new Error("kv boom");
    },
    async put() {
      throw new Error("kv boom");
    },
    async list() {
      throw new Error("kv boom");
    },
  };
  const res = await worker.fetch(req("/v1/progress/test-a/study", { origin: NEW_ORIGIN }), { TOKEN, KV: throwing });
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: "internal" });
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), NEW_ORIGIN);
});

test("路由／key 格式錯誤 → 404；method 錯誤 → 405", async () => {
  assert.equal((await worker.fetch(req("/v2/progress/test-a/study"), env())).status, 404);
  assert.equal((await worker.fetch(req("/v1/progress/Bad_Child!/study"), env())).status, 404);
  assert.equal((await worker.fetch(req("/v1/progress/test-a/study", { method: "DELETE" }), env())).status, 405);
  assert.equal((await worker.fetch(req("/v1/status", { method: "PUT", body: {} }), env())).status, 405);
});

test("status：回每 key 最後寫入時間、忽略 test- child、需 token", async () => {
  const kv = seeded([
    ["aiden", "study", { rev: 7, data: {}, writeId: "w0", updatedAt: "2026-07-10T01:00:00.000Z" }],
    ["bingpu", "zhuyin", { rev: 2, data: {}, writeId: "w1", updatedAt: "2026-07-11T02:00:00.000Z" }],
    ["test-a", "study", { rev: 99, data: {}, writeId: "w2" }],
  ]);
  const denied = await worker.fetch(req("/v1/status", { token: "wrong" }), env(kv));
  assert.equal(denied.status, 401);
  const res = await worker.fetch(req("/v1/status"), env(kv));
  assert.equal(res.status, 200);
  const { keys } = await res.json();
  const names = keys.map((k) => `${k.child}:${k.app}`).sort();
  assert.deepEqual(names, ["aiden:study", "bingpu:zhuyin"]);
  const aiden = keys.find((k) => k.child === "aiden");
  assert.equal(aiden.rev, 7);
  assert.equal(aiden.lastWrite, "2026-07-10T01:00:00.000Z");
});

test("回應帶白名單 origin 的 ACAO（GET/PUT 實體請求）", async () => {
  const res = await worker.fetch(req("/v1/progress/test-a/study", { origin: NEW_ORIGIN }), env());
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), NEW_ORIGIN);
});
