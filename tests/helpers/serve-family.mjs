// 隔離的本機 E2E：只用 test-token、synthetic 題包、記憶體 KV。
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../../worker/worker.mjs";
import { kvStub } from "../../worker/kv-stub.mjs";
import { expandedSyntheticPack, navigationSyntheticPack } from "./synthetic-study-pack.mjs";
const root = resolve(fileURLToPath(new URL("../../docs/", import.meta.url)));
const port = Number(process.argv[2] || 8788),
  endpoint = `http://127.0.0.1:${port}`;
const KV = kvStub({
  "c:study:g4-s1-math-u1": { value: JSON.stringify(expandedSyntheticPack()) },
});
// Explicit local-only opt-in. Default E2E never reads private recordings.
if (process.env.NATIVE_CAMP_AUDIO_PACK) {
  const pack = JSON.parse(await readFile(resolve(process.env.NATIVE_CAMP_AUDIO_PACK), "utf8"));
  for (const [id, value] of Object.entries(pack)) {
    if (!/^[a-z0-9-]{1,80}$/.test(id)) throw Error("Invalid Native Camp audio id");
    await KV.put(`c:nativecamp:audio:${id}`, JSON.stringify(value));
  }
}
let offline = false;
let catalogOffline = false;
let release = null;
let studyPreviewMode = "ok";
let requestLog = [];
const previewProgress = JSON.stringify({ rev: 7, epoch: "synthetic-preview", writeId: "synthetic-preview", data: { sentinel: "study-progress" } });
const previewActivity = JSON.stringify({ version: 1, days: {}, tasks: {}, done: {} });
const digest = (value) => createHash("sha256").update(value).digest("hex");
await KV.put("p:aiden:study", previewProgress, { metadata: { rev: 7, updatedAt: "2026-09-19T00:00:00.000Z" } });
await KV.put("m:aiden:study:preview-sentinel", previewActivity);
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, endpoint);
    if (!url.pathname.startsWith("/test/")) requestLog.push({ method: req.method, pathname: url.pathname });
    if (url.pathname === "/test/start") {
      res.writeHead(302, { Location: "/parent/?k=test-token" });
      res.end();
      return;
    }
    if (url.pathname === "/test/controls") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(
        `<h1>隔離測試控制</h1><p>雲端 ${offline ? "暫停" : "正常"}</p><p>白板資料 ${catalogOffline ? "暫停" : "正常"}</p><p>模擬發布：${release || "關閉"}</p><a href="/test/mode?offline=1">暫停測試雲端</a><br><a href="/test/mode?offline=0">恢復測試雲端</a><br><a href="/test/catalog?offline=1">暫停白板資料</a><br><a href="/test/catalog?offline=0">恢復白板資料</a><br><a href="/test/release?version=a">模擬發布 A</a><br><a href="/test/release?version=b">模擬發布 B</a><br><a href="/test/release">恢復原始發布</a><br><a href="/?child=aiden">哥哥首頁</a><br><a href="/?child=bingpu">弟弟首頁</a>`,
      );
      return;
    }
    if (url.pathname === "/test/study-preview") {
      const requested = url.searchParams.get("mode") || "ok";
      const requestedCount = Number(url.searchParams.get("questions") || 0);
      studyPreviewMode = ["ok", "401", "404", "offline", "500", "bad-json", "bad-utf8", "invalid", "delay-once"].includes(requested) ? requested : "ok";
      requestLog = [];
      await KV.put("c:study:g4-s1-math-u1", JSON.stringify([18, 60].includes(requestedCount) ? navigationSyntheticPack(requestedCount) : expandedSyntheticPack()));
      await KV.put("p:aiden:study", previewProgress, { metadata: { rev: 7, updatedAt: "2026-09-19T00:00:00.000Z" } });
      await KV.put("m:aiden:study:preview-sentinel", previewActivity);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(`<!doctype html><meta charset="utf-8"><title>準備 Study preview 隔離驗收</title><p>正在放置 synthetic 哨兵並開啟試玩頁⋯</p><script>
        localStorage.setItem("study:progress:aiden", JSON.stringify({ sentinel: "study-progress" }));
        localStorage.setItem("study:private-pack:g4-s1-math-u1", "synthetic-shared-pack-cache-sentinel");
        localStorage.setItem("family:stream:aiden:study:preview-sentinel", "synthetic-activity-sentinel");
        sessionStorage.setItem("study-preview:sentinel", "synthetic-session-sentinel");
        location.replace("/study/preview.html?child=aiden");
      </script>`);
      return;
    }
    if (url.pathname === "/test/study-preview/inspect") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Study preview 隔離結果</title>
        <h1>Study preview 隔離結果</h1><p id="browser-result">檢查中⋯</p><pre id="server-result"></pre><script>
        const expected = {
          "study:progress:aiden": JSON.stringify({ sentinel: "study-progress" }),
          "study:private-pack:g4-s1-math-u1": "synthetic-shared-pack-cache-sentinel",
          "family:stream:aiden:study:preview-sentinel": "synthetic-activity-sentinel",
        };
        const browserOK = Object.entries(expected).every(([key, value]) => localStorage.getItem(key) === value) && sessionStorage.getItem("study-preview:sentinel") === "synthetic-session-sentinel";
        document.getElementById("browser-result").textContent = browserOK ? "瀏覽器學習／題包／session 哨兵：未變更" : "瀏覽器哨兵已變更";
        fetch("/test/study-preview/snapshot").then((response) => response.json()).then((value) => {
          document.getElementById("server-result").textContent = JSON.stringify(value, null, 2);
        });
      </script>`);
      return;
    }
    if (url.pathname === "/test/study-preview/snapshot") {
      const progress = await KV.get("p:aiden:study"), activity = await KV.get("m:aiden:study:preview-sentinel");
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.end(JSON.stringify({
        kvSentinelsUnchanged: progress === previewProgress && activity === previewActivity,
        progressDigest: digest(progress || ""),
        activityDigest: digest(activity || ""),
        expectedProgressDigest: digest(previewProgress),
        expectedActivityDigest: digest(previewActivity),
        requests: requestLog,
      }));
      return;
    }
    if (url.pathname === "/test/mode") {
      offline = url.searchParams.get("offline") === "1";
      res.writeHead(302, { Location: "/test/controls" });
      res.end();
      return;
    }
    if (url.pathname === "/test/catalog") {
      catalogOffline = url.searchParams.get("offline") === "1";
      res.writeHead(302, { Location: "/test/controls" });
      res.end();
      return;
    }
    if (url.pathname === "/parent/work-catalog.json" && catalogOffline) {
      res.writeHead(503, { "Cache-Control": "no-store" });
      res.end();
      return;
    }
    if (url.pathname === "/test/release") {
      const value = url.searchParams.get("version");
      release = ["a", "b"].includes(value) ? value : null;
      res.writeHead(302, { Location: "/test/controls" });
      res.end();
      return;
    }
    if (url.pathname === "/home-release.json" && offline) {
      res.writeHead(503, { "Cache-Control": "no-store" });
      res.end();
      return;
    }
    if (url.pathname.startsWith("/v1/") || url.pathname.startsWith("/api/")) {
      if (url.pathname === "/api/v1/packs/g4-s1-math-u1" && studyPreviewMode !== "ok") {
        const mode = studyPreviewMode;
        if (mode === "delay-once") {
          studyPreviewMode = "ok";
          await new Promise((resolveDelay) => setTimeout(resolveDelay, 9000));
        } else {
          const status = mode === "401" ? 401 : mode === "404" ? 404 : mode === "offline" ? 503 : mode === "500" ? 500 : 200;
          const body = mode === "bad-json" ? "{" : mode === "bad-utf8" ? Buffer.from([0xff, 0xfe]) : mode === "invalid" ? JSON.stringify({ schemaVersion: 1, packId: "invalid", revision: 1, questions: [], explanations: {} }) : JSON.stringify({ error: `synthetic-${mode}` });
          res.writeHead(status, { "Content-Type": mode === "bad-utf8" ? "application/octet-stream" : "application/json", "Cache-Control": "no-store" });
          res.end(body);
          return;
        }
      }
      if (offline) {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end('{"error":"測試雲端暫停"}');
        return;
      }
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      const response = await worker.fetch(
        new Request(url, {
          method: req.method,
          headers: req.headers,
          ...(body.length ? { body } : {}),
        }),
        { TOKEN: "test-token", KV, LOCAL_DEV:true },
      );
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    const path = resolve(
      root,
      "." + decodeURIComponent(url.pathname),
      url.pathname.endsWith("/") ? "index.html" : "",
    );
    if (!path.startsWith(root + sep)) throw Error("path");
    let bytes = await readFile(path);
    if (release && url.pathname === "/home-release.json")
      bytes = Buffer.from(JSON.stringify({ version: release.repeat(64) }));
    if (release && ["/", "/index.html"].includes(url.pathname))
      bytes = Buffer.from(bytes.toString()
        .replace(/(<meta name="kids-home-release" content=")[a-f0-9]+("\s*>)/, "$1" + release.repeat(64) + "$2")
        .replace(/((?:src|href)="shared\/[^"?]+\.(?:js|css))\?v=[^"]+"/g, "$1?v=" + release.repeat(64) + '"')
        .replace('<body class="family-page">', `<body class="family-page"><p id="test-release">隔離發布 ${release.toUpperCase()} <span id="test-script"></span></p>`));
    if (release && url.pathname === "/shared/home.js")
      bytes = Buffer.concat([Buffer.from(`document.getElementById("test-script").textContent = "程式 ${release.toUpperCase()}";\n`), bytes]);
    if (release && url.pathname === "/shared/family.css")
      bytes = Buffer.concat([bytes, Buffer.from(`\n#test-release::after { content: " · 樣式 ${release.toUpperCase()}"; }\n`)]);
    if (path.endsWith("sync-v1.js"))
      bytes = Buffer.from(
        bytes
          .toString()
          .replace(
            '"https://aiden-kids-sync.huansbox.workers.dev"',
            JSON.stringify(endpoint),
          ),
      );
    const mime = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".mp3": "audio/mpeg",
      ".webmanifest": "application/manifest+json",
      ".txt": "text/plain; charset=utf-8",
    };
    res.writeHead(200, {
      "Content-Type": mime[extname(path)] || "application/octet-stream",
      "Cache-Control": release && (["/", "/index.html", "/home-release.json"].includes(url.pathname) || url.pathname.startsWith("/shared/")) ? "max-age=600" : "no-store",
      "Content-Security-Policy": "connect-src 'self'",
    });
    res.end(bytes);
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(port, "127.0.0.1", () => console.log(endpoint + "/test/start"));
