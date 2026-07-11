// 契約測試：同一份 case 矩陣（worker/contract-cases.mjs）同時餵 client（decideSync）與
// server（worker handler），跑最小 client 迴圈，斷言兩端判定一致且收斂。

import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/worker.mjs";
import { decideSync } from "../worker/decide-sync.mjs";
import { kvStub } from "../worker/kv-stub.mjs";
import { CONTRACT_CASES } from "../worker/contract-cases.mjs";

const TOKEN = "t-secret";
const CHILD = "test-a";
const APP = "study";
const KV_KEY = `p:${CHILD}:${APP}`;

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

async function call(env, method, token, body) {
  return worker.fetch(
    new Request(`https://sync.test/v1/progress/${CHILD}/${APP}?k=${token}`, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );
}

async function fetchRemote(env, token) {
  let res;
  try {
    res = await call(env, "GET", token);
  } catch {
    return { kind: "network" };
  }
  if (res.status === 401) return { kind: "auth" };
  if (res.status !== 200) return { kind: "http" };
  let body;
  try {
    body = await res.json();
  } catch {
    return { kind: "bad-payload" };
  }
  return { kind: "ok", rev: body.rev, data: body.data, schemaVersion: body.data?.schemaVersion };
}

// 最小 client 同步迴圈：GET → decideSync → 依 action 行動；PUT 被拒（409）→ 重新 GET → 再判定
async function syncRound(env, client, token, twists = {}) {
  const remote = await fetchRemote(env, token);
  const action = decideSync(client, remote);
  const out = { firstAction: action.type, putRejected: false };

  if (action.type === "adopt" || action.type === "conflict-adopt") {
    client.data = remote.data;
    client.syncedRev = remote.rev;
    client.dirty = false;
    return out;
  }
  if (action.type !== "push") return out;

  if (twists.raceWriteBeforePut) {
    const raceRes = await call(env, "PUT", TOKEN, {
      rev: remote.rev,
      data: twists.raceWriteBeforePut.data,
      writeId: "race-w",
    });
    assert.equal(raceRes.status, 200, "競態寫入應成功");
  }

  const putBody = { rev: client.syncedRev, data: client.data, writeId: "client-w1" };
  const res = await call(env, "PUT", token, putBody);

  if (res.status === 200) {
    const body = await res.json();
    client.syncedRev = body.rev;
    client.dirty = false;
    if (twists.replayPut) {
      const retry = await call(env, "PUT", token, putBody);
      assert.equal(retry.status, 200, "重送同 writeId 應冪等成功");
      const retryBody = await retry.json();
      assert.equal(retryBody.rev, body.rev, "重送不得重複遞增 rev");
      client.syncedRev = retryBody.rev;
    }
    return out;
  }
  if (res.status === 409) {
    out.putRejected = true;
    const again = await fetchRemote(env, token);
    const second = decideSync(client, again);
    assert.equal(second.type, "conflict-adopt", "PUT 被拒後應收斂為取遠端");
    client.data = again.data;
    client.syncedRev = again.rev;
    client.dirty = false;
    return out;
  }
  assert.fail(`push 收到未預期狀態 ${res.status}`);
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
    const client = structuredClone(c.client);
    const initialClientData = structuredClone(c.client.data);
    const token = c.wrongToken ? "wrong" : TOKEN;

    const out = await syncRound(env, client, token, {
      raceWriteBeforePut: c.raceWriteBeforePut,
      replayPut: c.replayPut,
    });

    assert.equal(out.firstAction, c.expect.firstAction, "client 首個判定");
    if (c.expect.putRejected) assert.equal(out.putRejected, true, "應走過 PUT 被拒路徑");

    const after = await readServer(env);
    if (c.expect.finalServerRev !== undefined) {
      assert.equal(after.rev, c.expect.finalServerRev, "server 最終 rev");
    }
    if (c.expect.serverUnchanged) {
      assert.equal(after.raw, before.raw, "server 不得被改動");
    }
    if (c.expect.converged) {
      assert.deepEqual(client.data, after.data, "client 與 server 收斂一致");
      assert.equal(client.syncedRev, after.rev, "syncedRev 收斂到 server rev");
      assert.equal(client.dirty, false);
    }
    if (c.expect.clientKeepsLocal) {
      assert.deepEqual(client.data, initialClientData, "client 應保留本地資料");
    }
    if (c.expect.finalDataLacksErrorBankEntry) {
      const gone = c.expect.finalDataLacksErrorBankEntry;
      const inClient = (client.data.errorBank ?? []).some((e) => e.questionId === gone);
      const inServer = (after.data.errorBank ?? []).some((e) => e.questionId === gone);
      assert.equal(inClient || inServer, false, `已刪資料 ${gone} 不得復活`);
    }

    if (c.secondClientPull) {
      const other = { syncedRev: 1, dirty: false, data: { mastered: ["q1"] }, schemaVersion: 1 };
      const o = await syncRound(env, other, TOKEN, {});
      assert.equal(o.firstAction, "adopt");
      assert.deepEqual(other.data, client.data, "他端 pull 應得到匯入後的資料");
    }
  });
}
