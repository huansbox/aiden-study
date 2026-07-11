// 家庭進度同步服務（Cloudflare Worker＋KV）。spec＝issue #26「進度同步」節、票＝#27。
// 協定：GET 從未寫過的 key → 200 {rev:0,data:null}（合法空、可播種）；有值時回 {rev,data,writeId}
// （writeId 讓 client 認出「遠端領先的那筆是我自己的 beacon」）。404 只留給路由／key 格式錯誤。
// PUT 帶 writeId 冪等：response 遺失後重送同 writeId → 200 現行 rev，不重複遞增。
// writeId 契約＝client 每次新寫入以 crypto.randomUUID() 新產、每 key 至多一筆未決寫入（見 decide-sync.mjs）。
// sendBeacon 不能帶 header，token 一律支援 ?k= query（與圖示網址同一把）；POST 為 PUT 的 beacon 別名。
// 已知接受限制（家庭規模、KV 無 conditional write）：同 rev 併發 PUT 可能雙雙 200，
// 先落地者被 LWW 靜默覆蓋且無 409 訊號——與「KV 最終一致」同屬 spec 已載明的接受風險。

const ALLOWED_ORIGINS = new Set([
  "https://huansbox.github.io",
  "https://kids.linshuhuan.com",
]);

const KEY_RE = /^[a-z0-9-]{1,32}$/;

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  const base = { Vary: "Origin" };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return {
      ...base,
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET,PUT,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    };
  }
  return base;
}

function json(status, body, cors) {
  return new Response(JSON.stringify(body), {
    status,
    // no-store：同步正確性依賴每次 GET 讀到最新 rev，URL 又固定（?k= 不變），
    // 不能賭瀏覽器（尤其 Safari）的啟發式快取
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors },
  });
}

function tokenFrom(request, url) {
  const auth = request.headers.get("Authorization");
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7);
  return url.searchParams.get("k");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // 未捕捉例外會讓 runtime 回不帶 CORS header 的錯誤頁，瀏覽器端會誤判成離線——
    // KV 拋錯（429、值超限）必須以帶 CORS 的 500 回，client 才分得出 data-error vs offline
    try {
      return await handle(request, env, url, cors);
    } catch {
      return json(500, { error: "internal" }, cors);
    }
  },
};

async function handle(request, env, url, cors) {
    const token = tokenFrom(request, url);
    if (!token || token !== env.TOKEN) return json(401, { error: "bad token" }, cors);

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] !== "v1") return json(404, { error: "not found" }, cors);

    if (parts.length === 2 && parts[1] === "status") {
      if (request.method !== "GET") return json(405, { error: "method" }, cors);
      const list = await env.KV.list({ prefix: "p:" });
      const keys = list.keys
        .map((k) => {
          const [, child, app] = k.name.split(":");
          return {
            child,
            app,
            rev: k.metadata?.rev ?? null,
            lastWrite: k.metadata?.updatedAt ?? null,
          };
        })
        .filter((e) => !e.child.startsWith("test-"));
      return json(200, { keys }, cors);
    }

    if (parts.length === 4 && parts[1] === "progress") {
      const child = parts[2];
      const app = parts[3];
      if (!KEY_RE.test(child) || !KEY_RE.test(app)) return json(404, { error: "bad key" }, cors);
      const kvKey = `p:${child}:${app}`;

      if (request.method === "GET") {
        const raw = await env.KV.get(kvKey);
        if (raw === null) return json(200, { rev: 0, data: null }, cors);
        let stored;
        try {
          stored = JSON.parse(raw);
        } catch {
          return json(500, { error: "corrupt" }, cors);
        }
        // 形狀壞（可 parse 但缺 rev）與不可 parse 同罪：回 200 假資料會讓 client 空轉、
        // 回 409 會把 key 磚化——都不如有訊號的 500
        if (!Number.isInteger(stored.rev)) return json(500, { error: "corrupt" }, cors);
        return json(200, { rev: stored.rev, data: stored.data, writeId: stored.writeId }, cors);
      }

      if (request.method === "PUT" || request.method === "POST") {
        let body;
        try {
          body = await request.json();
        } catch {
          return json(400, { error: "bad json" }, cors);
        }
        if (
          !body ||
          typeof body !== "object" ||
          !Number.isInteger(body.rev) ||
          body.rev < 0 ||
          typeof body.writeId !== "string" ||
          body.writeId.length === 0 ||
          !("data" in body)
        ) {
          return json(400, { error: "bad shape" }, cors);
        }
        const raw = await env.KV.get(kvKey);
        let current = { rev: 0, data: null, writeId: null };
        if (raw !== null) {
          try {
            current = JSON.parse(raw);
          } catch {
            return json(500, { error: "corrupt" }, cors);
          }
          if (!Number.isInteger(current.rev)) return json(500, { error: "corrupt" }, cors);
        }
        if (body.rev !== current.rev) {
          if (body.writeId === current.writeId) {
            return json(200, { rev: current.rev, idempotent: true }, cors);
          }
          return json(409, { rev: current.rev }, cors);
        }
        const next = {
          rev: current.rev + 1,
          data: body.data,
          writeId: body.writeId,
          updatedAt: new Date().toISOString(),
        };
        await env.KV.put(kvKey, JSON.stringify(next), {
          metadata: { rev: next.rev, updatedAt: next.updatedAt },
        });
        return json(200, { rev: next.rev }, cors);
      }

      return json(405, { error: "method" }, cors);
    }

    return json(404, { error: "not found" }, cors);
}
