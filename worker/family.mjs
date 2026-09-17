import "../docs/shared/family-core.js";
const core = globalThis.KidsFamilyCore;
const reply = (status, body, cors) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...cors,
    },
  });
async function read(kv, key, fallback) {
  const raw = await kv.get(key);
  return raw === null ? fallback : JSON.parse(raw);
}
async function bodyOf(request) {
  const raw = await request.text();
  if (raw.length > 900000) throw Error("資料過大");
  return JSON.parse(raw);
}
export async function familyRoute(request, env, url, cors) {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length === 2 && parts[1] === "settings") {
    const key = "c:family:settings";
    const current = await read(env.KV, key, { rev: 0, data: core.defaults() });
    if (!Number.isInteger(current.rev) || current.rev < 0)
      throw Error("invalid stored settings revision");
    current.data = core.validateSettings(current.data);
    if (request.method === "GET") return reply(200, current, cors);
    if (request.method !== "PUT") return reply(405, { error: "method" }, cors);
    let body, data;
    try {
      body = await bodyOf(request);
      data = core.validateSettings(
        core.preserveHomeFields(body.data, current.data),
      );
      if (
        !Number.isInteger(body.rev) ||
        body.rev < 0 ||
        !core.idRE.test(body.writeId)
      )
        throw Error("儲存版本不正確");
    } catch (e) {
      return reply(400, { error: e.message }, cors);
    }
    if (current.writeId === body.writeId) return reply(200, current, cors);
    if (current.rev !== body.rev)
      return reply(
        409,
        {
          error: "設定已在其他裝置更新，請重新讀取後再調整。",
          rev: current.rev,
        },
        cors,
      );
    const next = {
      rev: current.rev + 1,
      writeId: body.writeId,
      data,
      updatedAt: new Date().toISOString(),
    };
    await env.KV.put(key, JSON.stringify(next));
    return reply(200, next, cors);
  }
  if (parts[1] !== "activity") return null;
  const child = parts[2];
  if (
    !core.CHILDREN.includes(child) &&
    !/^test-[a-z0-9-]{1,25}$/.test(child || "")
  )
    return reply(404, { error: "child" }, cors);
  const generation = core.activityGeneration(
    await read(env.KV, `c:activity-generation:${child}`, 0),
  );
  // 第 0 代沿用原 key；重置只換目前世代，舊裝置延遲送出的資料仍留在舊區。
  const prefix = `${generation ? "m" + generation : "m"}:${child}:`;
  const resetReply = () => reply(409, {
    error: "累計已重置，請重新讀取。", generation,
  }, cors);
  if (parts.length === 3 && request.method === "GET") {
    if (url.searchParams.has("generation") &&
        url.searchParams.get("generation") !== String(generation)) return resetReply();
    const streams = [];
    const cursor = url.searchParams.get("cursor");
    const list = await env.KV.list({
      prefix,
      limit: 200,
      ...(cursor ? { cursor } : {}),
    });
    const batch = await Promise.all(
      list.keys.map(async ({ name }) => {
        const [, , app, device] = name.split(":");
        const raw = await env.KV.get(name);
        return raw === null
          ? null
          : { app, device, data: core.validateStream(JSON.parse(raw)) };
      }),
    );
    streams.push(...batch.filter(Boolean));
    return reply(
      200,
      {
        generation,
        streams,
        nextCursor: list.list_complete === false ? list.cursor : null,
      },
      cors,
    );
  }
  if (parts.length !== 5) return reply(404, { error: "not found" }, cors);
  const [, , , app, device] = parts;
  if ((!core.APPS.slice(0, 5).includes(app) && app !== "nativecamp") || !core.idRE.test(device))
    return reply(404, { error: "stream" }, cors);
  if (!["PUT", "POST"].includes(request.method))
    return reply(405, { error: "method" }, cors);
  let incoming;
  try {
    incoming = core.validateStream(await bodyOf(request));
  } catch (e) {
    return reply(400, { error: e.message }, cors);
  }
  if (core.activityGeneration(incoming.generation) !== generation) return resetReply();
  const key = `${prefix}${app}:${device}`;
  const current = core.validateStream(
    await read(env.KV, key, core.emptyStream(generation)),
  );
  const data = core.mergeStreams(current, incoming);
  await env.KV.put(key, JSON.stringify(data));
  return reply(200, { data, generation }, cors);
}
