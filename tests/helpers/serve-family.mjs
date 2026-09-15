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
        `<h1>隔離測試控制</h1><p>雲端 ${offline ? "暫停" : "正常"}</p><a href="/test/mode?offline=1">暫停測試雲端</a><br><a href="/test/mode?offline=0">恢復測試雲端</a><br><a href="/?child=aiden">哥哥首頁</a><br><a href="/?child=bingpu">弟弟首頁</a>`,
      );
      return;
    }
    if (url.pathname === "/test/mode") {
      offline = url.searchParams.get("offline") === "1";
      res.writeHead(302, { Location: "/test/controls" });
      res.end();
      return;
    }
    if (url.pathname.startsWith("/v1/")) {
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
        { TOKEN: "test-token", KV },
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
      "Cache-Control": "no-store",
      "Content-Security-Policy": "connect-src 'self'",
    });
    res.end(bytes);
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(port, "127.0.0.1", () => console.log(endpoint + "/test/start"));
