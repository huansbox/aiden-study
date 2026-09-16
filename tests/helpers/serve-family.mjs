// 隔離的本機 E2E：只用 test-token、synthetic 題包、記憶體 KV。
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../../worker/worker.mjs";
import { kvStub } from "../../worker/kv-stub.mjs";
import { expandedSyntheticPack } from "./synthetic-study-pack.mjs";
const root = resolve(fileURLToPath(new URL("../../docs/", import.meta.url)));
const port = Number(process.argv[2] || 8788),
  endpoint = `http://127.0.0.1:${port}`;
const KV = kvStub({
  "c:study:g4-s1-math-u1": { value: JSON.stringify(expandedSyntheticPack()) },
});
let offline = false;
let release = null;
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, endpoint);
    if (url.pathname === "/test/start") {
      res.writeHead(302, { Location: "/parent/?k=test-token" });
      res.end();
      return;
    }
    if (url.pathname === "/test/controls") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(
        `<h1>隔離測試控制</h1><p>雲端 ${offline ? "暫停" : "正常"}</p><p>模擬發布：${release || "關閉"}</p><a href="/test/mode?offline=1">暫停測試雲端</a><br><a href="/test/mode?offline=0">恢復測試雲端</a><br><a href="/test/release?version=a">模擬發布 A</a><br><a href="/test/release?version=b">模擬發布 B</a><br><a href="/test/release">恢復原始發布</a><br><a href="/?child=aiden">哥哥首頁</a><br><a href="/?child=bingpu">弟弟首頁</a>`,
      );
      return;
    }
    if (url.pathname === "/test/mode") {
      offline = url.searchParams.get("offline") === "1";
      res.writeHead(302, { Location: "/test/controls" });
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
