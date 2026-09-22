import "../docs/shared/collection-core.js";
const C = globalThis.KidsCollectionCore;
export async function collectionRoute(request, env, url, cors) {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[1] !== "collection") return null;
  const reply = (status, data) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  try {
    const child = parts[2];
    C.check(["aiden", "bingpu"].includes(child) || env.LOCAL_DEV && /^test-[a-z0-9-]{1,25}$/.test(child || ""), "孩子識別不正確", 404);
    C.check(env.COLLECTIONS, "拼裝收藏暫時無法連線，練習紀錄仍會保存。", 503);
    const object = env.COLLECTIONS.getByName(child);
    if (request.method === "GET" && parts.length === 3) return reply(200, await object.view(url.searchParams.get("date") || C.dateKey()));
    C.check(["POST", "PUT"].includes(request.method) && parts.length === 4, "找不到收藏操作", 404);
    const text = await request.text();
    C.check(text.length < 20000, "操作資料過大");
    const command = JSON.parse(text);
    C.check(command && typeof command === "object" && !Array.isArray(command), "收藏操作不正確");
    command.type = parts[3];
    if (["record", "round"].includes(command.type)) {
      const generation = Number(await env.KV.get(`c:activity-generation:${child}`) || 0);
      C.check(Number.isSafeInteger(command.generation) && command.generation >= 0, "練習版本不正確");
      if (command.generation !== generation) return reply(409, { error: "累計已重置，舊練習不會再發包。", generation });
    }
    const result = await object.execute(command);
    return reply(result.status || 200, result);
  } catch (error) { return reply(error.status || (error instanceof SyntaxError ? 400 : 503), { error: error.message || "收藏暫時無法儲存" }); }
}
