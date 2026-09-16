// 同源 API 的裝置登入；KV 只保存憑證雜湊，不保存家庭金鑰或 Cookie 原文。
const HOST = "https://kids.linshuhuan.com";
const AGE = 180 * 86400;
const hex = (bytes) =>
  Array.from(bytes, (v) => v.toString(16).padStart(2, "0")).join("");
const digest = async (value) =>
  hex(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  );
const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
function local(request, env) {
  return (
    env.LOCAL_DEV === true &&
    ["127.0.0.1", "localhost"].includes(new URL(request.url).hostname)
  );
}
function cookieName(request, env) {
  return local(request, env) ? "kids_session_dev" : "__Host-kids_session";
}
function cookie(request, env, value, age = AGE) {
  return `${cookieName(request, env)}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${local(request, env) ? "" : "; Secure"}`;
}
function sameOrigin(request, env) {
  const origin = new URL(request.url).origin;
  return (
    (origin === HOST || local(request, env)) &&
    request.headers.get("Origin") === origin
  );
}
async function tokenKey(request, env) {
  const name = cookieName(request, env);
  const value = (request.headers.get("Cookie") || "")
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(name + "="))
    ?.slice(name.length + 1);
  return /^[a-f0-9]{64}$/.test(value || "")
    ? "s:device:" + (await digest(value))
    : null;
}
async function session(request, env) {
  const key = await tokenKey(request, env);
  if (!key) return null;
  const raw = await env.KV.get(key);
  if (!raw) return null;
  const value = JSON.parse(raw);
  if (
    !Number.isFinite(value.expiresAt) ||
    value.expiresAt <= Date.now() ||
    value.family !== (await digest(env.TOKEN))
  )
    return null;
  return value;
}
async function loginBody(request) {
  if (!request.headers.get("Content-Type")?.startsWith("application/json"))
    throw Error();
  const reader = request.body?.getReader();
  if (!reader) throw Error();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4096) throw Error();
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

// /api/* 僅接受 Cookie；舊 workers.dev/v1/* 另由既有 family token 路徑處理。
export async function authorizeSession(request, env, url) {
  if (new URL(request.url).origin !== HOST && !local(request, env))
    return json(403, { error: "origin" });
  const mutation = !["GET", "HEAD", "OPTIONS"].includes(request.method);
  if (mutation && !sameOrigin(request, env))
    return json(403, { error: "origin" });
  if (request.headers.get("Sec-Fetch-Site") === "cross-site")
    return json(403, { error: "origin" });
  if (url.pathname === "/v1/session") {
    if (request.method === "GET") {
      const value = await session(request, env);
      return value
        ? json(200, { authenticated: true, expiresAt: value.expiresAt })
        : json(401, { error: "需要連接家庭" });
    }
    if (request.method !== "POST") return json(405, { error: "method" });
    let body;
    try {
      body = await loginBody(request);
    } catch {
      return json(400, { error: "登入格式不正確" });
    }
    if (
      typeof body?.key !== "string" ||
      body.key.length > 256 ||
      !body.key ||
      !env.TOKEN
    )
      return json(401, { error: "家庭金鑰不正確" });
    const expected = await digest(env.TOKEN),
      supplied = await digest(body.key);
    let different = 0;
    for (let i = 0; i < expected.length; i++)
      different |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
    if (different) return json(401, { error: "家庭金鑰不正確" });
    const value = hex(crypto.getRandomValues(new Uint8Array(32)));
    const expiresAt = Date.now() + AGE * 1000;
    await env.KV.put(
      "s:device:" + (await digest(value)),
      JSON.stringify({ family: expected, expiresAt }),
      { expirationTtl: AGE },
    );
    return json(
      200,
      { authenticated: true, expiresAt },
      { "Set-Cookie": cookie(request, env, value) },
    );
  }
  if (url.pathname === "/v1/session/logout") {
    if (request.method !== "POST") return json(405, { error: "method" });
    const key = await tokenKey(request, env);
    if (key) await env.KV.delete(key);
    return json(
      200,
      { authenticated: false },
      { "Set-Cookie": cookie(request, env, "", 0) },
    );
  }
  return (await session(request, env))
    ? null
    : json(401, { error: "需要重新連接家庭" });
}
