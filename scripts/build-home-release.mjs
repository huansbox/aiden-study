// 首頁發布版本由實際內容決定；CI 的 --check 防止忘記更新版本與資源網址。
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = new URL("../docs/", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8").replace(/\r\n/g, "\n");
const meta = /(<meta name="kids-home-release" content=")[a-f0-9]+("\s*\/?>)/;
const html = read("index.html");
if (!meta.test(html)) throw Error("Missing kids-home-release meta");
const refs = [...html.matchAll(/(?:src|href)="(shared\/[^"?]+\.(?:js|css))(?:\?v=[^"&]*)?"/g)];
const assets = [...new Set(refs.map((m) => m[1]))].sort();
const canonical = html.replace(meta, "$1VERSION$2").replace(/((?:src|href)="shared\/[^"?]+\.(?:js|css))\?v=[^"&]*(")/g, "$1$2");
const hash = createHash("sha256");
for (const [path, content] of [["index.html", canonical], ...[...assets, "registry.json", "platform.webmanifest"].map((p) => [p, read(p)])])
  hash.update(path + "\0" + content + "\0");
const version = hash.digest("hex");
let output = html.replace(meta, "$1" + version + "$2");
for (const match of refs) output = output.replace(match[0], match[0].replace(/(?:\?v=[^"&]*)?"$/, "?v=" + version + '"'));
const manifest = JSON.stringify({ version }, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (output !== html || read("home-release.json") !== manifest) {
    throw Error("首頁版本未更新，請執行 node scripts/build-home-release.mjs");
  }
  console.log("Home release verified: " + version.slice(0, 12));
} else {
  writeFileSync(fileURLToPath(new URL("index.html", root)), output);
  writeFileSync(fileURLToPath(new URL("home-release.json", root)), manifest);
  console.log("Home release generated: " + version.slice(0, 12));
}
