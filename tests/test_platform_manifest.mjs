import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const docs = new URL("../docs/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("platform.webmanifest", docs), "utf8"));
const pages = ["index.html", "study/index.html", "math/index.html", "math/nonogram/index.html", "spelling/index.html", "zhuyin/index.html"];

test("平台 manifest 保留安裝頁身分與孩子名稱，不指定共同啟動網址或 id", () => {
  assert.equal(manifest.display, "standalone");
  for (const field of ["start_url", "id", "name", "short_name"]) {
    assert.equal(Object.hasOwn(manifest, field), false, field);
  }
  // 不把子頁舊 manifest 的 start_url='.' 帶回平台，否則重開圖示會丟 child。
  assert.equal(manifest.scope, "./");
});

test("兩種部署路徑下，首頁與五個 app 同屬平台 manifest 的 scope", () => {
  for (const base of ["https://huansbox.github.io/aiden-study/", "https://kids.linshuhuan.com/"]) {
    const manifestURL = new URL("platform.webmanifest", base);
    const scope = new URL(manifest.scope, manifestURL);
    assert.equal(scope.href, base);
    for (const path of pages) {
      const html = readFileSync(new URL(path, docs), "utf8");
      const links = [...html.matchAll(/<link\b[^>]*rel="manifest"[^>]*href="([^"]+)"[^>]*>/g)];
      assert.equal(links.length, 1, path);
      assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/);
      for (const child of ["aiden", "bingpu"]) {
        const pageURL = new URL(path + "?child=" + child, base);
        assert.equal(new URL(links[0][1], pageURL).href, manifestURL.href, path);
        assert.ok(pageURL.pathname.startsWith(scope.pathname), path);
      }
    }
  }
});
