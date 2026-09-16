/* 一次性閱讀文章保留自己的進度；從孩子入口進來時，回同一個孩子。 */
(() => {
  const child = new URLSearchParams(location.search).get("child");
  if (!["aiden", "bingpu"].includes(child)) return;
  const base = new URL("../", document.currentScript.src);
  const back = document.querySelector("header a");
  if (back) back.href = new URL("?child=" + child, base).href;
  document.querySelectorAll(".parent-note").forEach((el) => {
    el.hidden = true;
  });
  const manifest = document.querySelector('link[rel="manifest"]');
  if (manifest) manifest.href = new URL("platform.webmanifest", base).href;
})();
