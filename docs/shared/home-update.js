/* 只在首頁檢查程式發布；不清除登入／進度，也不在練習或家長表單重載。 */
(() => {
  const version = document.querySelector('meta[name="kids-home-release"]')?.content;
  const base = new URL("../", document.currentScript.src);
  const url = new URL(location.href);
  if (!/^[a-f0-9]{64}$/.test(version || "") || !document.getElementById("hub") ||
      ![base.pathname, base.pathname + "index.html"].includes(url.pathname) ||
      url.searchParams.get("view") === "parent" || /[#&]restore=./.test(url.hash)) return;
  const attemptKey = "kids:home-update-attempt";
  const auth = window.KidsAuth;
  let busy = false, leaving = false, lastCheck = -Infinity, controller;
  const safe = () => !leaving && document.visibilityState === "visible" &&
    (!auth || auth.state.status === "connected") &&
    !document.getElementById("connect-family");
  async function check() {
    if (busy || !safe() || Date.now() - lastCheck < 5000) return;
    busy = true;
    lastCheck = Date.now();
    controller = new AbortController();
    const timer = setTimeout(() => controller?.abort(), 6000);
    try {
      const releaseURL = new URL("home-release.json", base);
      releaseURL.searchParams.set("check", String(Date.now()));
      const response = await fetch(releaseURL, { cache: "no-store", signal: controller.signal });
      if (!response.ok) return;
      const next = (await response.json()).version;
      if (!/^[a-f0-9]{64}$/.test(next || "") || next === version || !safe()) return;
      try {
        const previous = JSON.parse(sessionStorage.getItem(attemptKey));
        if (previous?.version === next && Date.now() - previous.at < 300000) return;
      } catch {
        // 儲存被停用時，以網址擋住同一版本反覆重載。
        if (new URL(location.href).searchParams.get("_release") === next) return;
      }
      const target = new URL(location.href);
      target.searchParams.set("_release", next);
      // 先確認 HTML 與版本檔已同時發布，並更新此網址的 HTTP cache。
      // 預讀靜態頁不攜帶舊網址上的家庭金鑰。
      const preflight = new URL(target);
      preflight.searchParams.delete("k");
      preflight.hash = "";
      const page = await fetch(preflight, { cache: "reload", signal: controller.signal });
      if (!page.ok) return;
      const parsed = new DOMParser().parseFromString(await page.text(), "text/html");
      if (parsed.querySelector('meta[name="kids-home-release"]')?.content !== next || !safe()) return;
      try {
        sessionStorage.setItem(attemptKey, JSON.stringify({ version: next, at: Date.now() }));
      } catch {
        if (target.searchParams.get("_release") === new URL(location.href).searchParams.get("_release")) return;
      }
      leaving = true;
      location.replace(target.href);
    } catch {
      // 離線、逾時或壞回應保留目前首頁，下一次前景檢查再試。
    } finally {
      clearTimeout(timer);
      controller = null;
      busy = false;
    }
  }
  window.addEventListener("pageshow", () => { leaving = false; check(); });
  window.addEventListener("pagehide", () => { leaving = true; controller?.abort(); });
  window.addEventListener("focus", check);
  window.addEventListener("online", check);
  window.addEventListener("kids:connection", check);
  document.addEventListener("visibilitychange", check);
  setInterval(check, 30000);
  // 舊圖示的 k 會先從網址移除；等 Cookie 讀回確認後，才可離開保存 legacy key 的頁面。
  Promise.resolve(auth?.ready).then(check);
})();
