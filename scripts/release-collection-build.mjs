// Dry run: node scripts/release-collection-build.mjs --snapshot <JSON>
// Apply additionally requires --apply --endpoint <URL> --child <id>
// --expected-build <id> --expected-revision <n>; token only via COLLECTION_TOKEN.
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import "../docs/shared/collection-core.js";
const C = globalThis.KidsCollectionCore;
const values = new Map();
for (let i = 2; i < process.argv.length; i++) {
  const option = process.argv[i];
  if (option === "--apply") values.set(option, true);
  else if (["--snapshot", "--endpoint", "--child", "--expected-build", "--expected-revision", "--command-id"].includes(option) && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) values.set(option, process.argv[++i]);
  else throw Error("未知選項或缺少值；憑證只能使用 COLLECTION_TOKEN 環境變數。");
}
if (!values.has("--snapshot")) throw Error("必須先提供 --snapshot 收藏備份 JSON；預設只預覽，不更動資料。");
const raw = await readFile(values.get("--snapshot"), "utf8"), before = JSON.parse(raw);
C.check(Array.isArray(before.grants) && Array.isArray(before.builds) && Number.isSafeInteger(before.revision), "備份不是收藏 snapshot");
const summary = C.releaseSummary(before);
console.log(JSON.stringify({ dryRun:!values.has("--apply"), ...summary }, null, 2));
if (values.has("--apply")) {
  const expectedActiveBuildId = values.get("--expected-build"), expectedRevision = Number(values.get("--expected-revision"));
  C.check(values.has("--expected-revision") && expectedRevision === before.revision && expectedActiveBuildId === summary.buildId && summary.releasable, "請明確提供與備份一致的 expected build／revision；只能撤回未完成作品。");
  const endpoint = new URL(values.get("--endpoint"));
  C.check(["https:", "http:"].includes(endpoint.protocol) && !endpoint.username && !endpoint.password && !endpoint.search && !endpoint.hash && (endpoint.protocol === "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname)), "endpoint 必須為 HTTPS 或本機隔離站，不含憑證或 query");
  const child = values.get("--child");
  C.check(["aiden", "bingpu"].includes(child) || /^test-[a-z0-9-]{1,25}$/.test(child || ""), "請明確指定 child");
  const token = process.env.COLLECTION_TOKEN;
  C.check(token, "未設定 COLLECTION_TOKEN；不接受命令列或檔案內的憑證。");
  const url = `${endpoint.href.replace(/\/$/, "")}/v1/collection/${child}`;
  const request = async (suffix = "", init = {}) => {
    const response = await fetch(url + suffix, { ...init, headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json" } });
    const body = await response.json();
    C.check(response.ok, body.error || "維護請求失敗", response.status); return body;
  };
  const commandId = values.get("--command-id") || `release:${createHash("sha256").update(child + ":" + raw).digest("hex").slice(0, 40)}`;
  // 由備份內容固定 commandId；同一命令重送由 SQLite 去重，不能退到後來新選的作品。
  const result = await request("/release-build", { method:"POST", body:JSON.stringify({ commandId, expectedActiveBuildId, expectedRevision }) });
  const after = await request();
  const verified = C.verifyRelease(before, after, expectedActiveBuildId);
  console.log(JSON.stringify({ applied:true, duplicate:result.duplicate, ...verified }, null, 2));
}
