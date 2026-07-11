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
  assert.deepEqual(await put.json(), { rev: 1 });
  const get = await worker.fetch(req("/v1/progress/test-a/study"), env(kv));
  assert.deepEqual(await get.json(), { rev: 1, data: { m: [1] } });
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
