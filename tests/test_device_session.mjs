import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/worker.mjs";
import { kvStub } from "../worker/kv-stub.mjs";
const origin = "https://kids.linshuhuan.com";
const environment = () => ({ TOKEN: "test-family-secret", KV: kvStub() });
const request = (
  path,
  { method = "GET", body, cookie, from = origin, headers = {} } = {},
) =>
  new Request(origin + "/api/v1/" + path, {
    method,
    headers: {
      Origin: from,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
async function login(env) {
  const response = await worker.fetch(
    request("session", { method: "POST", body: { key: env.TOKEN } }),
    env,
  );
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie");
}
test("首次連接產生裝置專用 HttpOnly Cookie；不回傳或持久化原始憑證", async () => {
  const env = environment(),
    cookie = await login(env),
    second = await login(env);
  assert.match(
    cookie,
    /^__Host-kids_session=[a-f0-9]{64}; Path=\/; HttpOnly; SameSite=Strict; Max-Age=15552000; Secure$/,
  );
  assert.notEqual(cookie, second);
  const r = await worker.fetch(request("session", { cookie }), env);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.equal((await r.json()).authenticated, true);
  const entries = await env.KV.list({ prefix: "s:device:" });
  assert.equal(entries.keys.length, 2);
  for (const { name } of entries.keys) {
    const value = await env.KV.get(name);
    assert.ok(!value.includes(env.TOKEN));
    assert.ok(!cookie.includes(name.split(":").at(-1)));
  }
});
test("Cookie 可讀設定、題包與讀寫進度／累計，無須 key 或 Authorization", async () => {
  const env = environment(),
    cookie = await login(env);
  assert.equal(
    (await worker.fetch(request("settings", { cookie }), env)).status,
    200,
  );
  const payload = {
    rev: 0,
    writeId: "cookie-write",
    data: { schemaVersion: 1, answer: 1 },
  };
  assert.equal(
    (
      await worker.fetch(
        request("progress/test-session/study", {
          cookie,
          method: "POST",
          body: payload,
          headers: { "Content-Type": "text/plain" },
        }),
        env,
      )
    ).status,
    200,
  );
  assert.deepEqual(
    (
      await (
        await worker.fetch(
          request("progress/test-session/study", { cookie }),
          env,
        )
      ).json()
    ).data,
    payload.data,
  );
  const data = { version: 1, days: {}, tasks: {}, done: {} };
  assert.equal(
    (
      await worker.fetch(
        request("activity/test-session/study/device", {
          cookie,
          method: "PUT",
          body: data,
        }),
        env,
      )
    ).status,
    200,
  );
  assert.equal(
    (await worker.fetch(request("activity/test-session", { cookie }), env))
      .status,
    200,
  );
  // 通過驗證，題包尚未設置則為 404，而非 401。
  assert.equal(
    (await worker.fetch(request("packs/g4-s1-math-u1", { cookie }), env))
      .status,
    404,
  );
});
test("新 API 拒絕 URL 金鑰／偽造 Cookie；既有 token API 保持相容", async () => {
  const env = environment();
  for (const cookie of [
    undefined,
    "__Host-kids_session=bad",
    "__Host-kids_session=" + "a".repeat(64),
  ]) {
    assert.equal(
      (
        await worker.fetch(
          request("settings?k=" + env.TOKEN, {
            cookie,
            headers: { Authorization: "Bearer " + env.TOKEN },
          }),
          env,
        )
      ).status,
      401,
    );
  }
  const old = await worker.fetch(
    new Request("https://legacy.workers.dev/v1/settings?k=" + env.TOKEN),
    env,
  );
  assert.equal(old.status, 200);
});
test("Cookie 寫入包含 beacon／登入／登出都拒絕跨來源與缺 Origin", async () => {
  const env = environment(),
    cookie = await login(env);
  for (const from of ["https://evil.example", "null", ""]) {
    for (const path of [
      "session",
      "session/logout",
      "settings",
      "progress/test-a/study",
      "activity/test-a/study/device",
    ]) {
      const r = await worker.fetch(
        request(path, {
          cookie,
          from,
          method: "POST",
          body: { key: env.TOKEN },
        }),
        env,
      );
      assert.equal(r.status, 403, path);
    }
  }
  assert.equal(
    (
      await worker.fetch(
        request("settings", {
          cookie,
          headers: { "Sec-Fetch-Site": "cross-site" },
        }),
        env,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await worker.fetch(
        new Request("https://other.example/api/v1/session", {
          headers: { Cookie: cookie },
        }),
        env,
      )
    ).status,
    403,
  );
});
test("錯誤金鑰、無效內容不得建立登入；到期、金鑰輪替及登出會失效", async () => {
  const env = environment();
  for (const body of [{ key: "wrong" }, { key: [] }, { key: "" }, null]) {
    assert.notEqual(
      (await worker.fetch(request("session", { method: "POST", body }), env))
        .status,
      200,
    );
  }
  const big = await worker.fetch(
    request("session", { method: "POST", body: { key: "a".repeat(5000) } }),
    env,
  );
  assert.equal(big.status, 400);
  const cookie = await login(env);
  assert.equal(
    (
      await worker.fetch(request("session", { cookie }), {
        ...env,
        TOKEN: "rotated",
      })
    ).status,
    401,
  );
  const [{ name }] = (await env.KV.list({ prefix: "s:device:" })).keys;
  const value = JSON.parse(await env.KV.get(name));
  await env.KV.put(
    name,
    JSON.stringify({ ...value, expiresAt: Date.now() - 1 }),
  );
  assert.equal(
    (await worker.fetch(request("session", { cookie }), env)).status,
    401,
  );
  const other = await login(env);
  const out = await worker.fetch(
    request("session/logout", { cookie: other, method: "POST" }),
    env,
  );
  assert.match(out.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal(
    (await worker.fetch(request("settings", { cookie: other }), env)).status,
    401,
  );
});
