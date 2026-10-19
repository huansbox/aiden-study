/* 一次性家長維護入口；沿既有家庭 Cookie，不將憑證放入檔案或訊息。 */
(() => {
  const F = window.KidsFamily, C = window.KidsCollectionCore;
  const child = document.getElementById("maintenance-child"), summary = document.getElementById("maintenance-summary");
  const read = document.getElementById("maintenance-read"), backup = document.getElementById("maintenance-backup"), release = document.getElementById("maintenance-release"), status = document.getElementById("maintenance-status");
  const initial = new URLSearchParams(location.search).get("child");
  if (["aiden", "bingpu"].includes(initial)) child.value = initial;
  const titles = { e500:"E500", emu3000:"EMU3000", r200:"R200", "700t":"台灣高鐵 700T", n700s:"日本新幹線 N700S", emu900:"EMU900", "breezy-blue":"藍皮解憂號", ct273:"CT273", car:"小汽車", train:"蒸汽火車", plane:"飛機" };
  let current = null, savedRevision = null, busy = false;
  const pendingKey = () => `collection:maintenance:release:${child.value}`;
  function controls() {
    const pending = F.read(pendingKey());
    child.disabled = read.disabled = busy;
    backup.disabled = busy || !current;
    release.disabled = busy || (!pending && (!current || !C.releaseSummary(current).releasable || savedRevision !== current.revision));
    release.textContent = pending ? "重試同一筆退包操作並核對" : current && C.releaseSummary(current).releasable ? `退回目前作品的 ${C.releaseSummary(current).assigned} 包並重新選車` : "目前沒有可撤回作品";
  }
  function render() {
    if (!current) { summary.textContent = "尚未取得收藏資料。"; controls(); return; }
    const s = C.releaseSummary(current);
    summary.replaceChildren();
    const lines = [`孩子：${child.value === "aiden" ? "Aiden" : "Bingpu"}`, `目前作品：${titles[s.modelId] || s.modelId || "尚未選車"}${current.activeBuild?.completedAt ? "（已完成，不能撤回）" : ""}`, `已拼完整包 ${s.completed} · 部分包 ${s.partial} · 已配未拼 ${s.waiting}`, `本作品共占用 ${s.assigned} 包 · 零件盒未配 ${s.unassigned} 包 · 原 grant 總數 ${s.total}`, `收藏 revision：${s.revision}`];
    for (const line of lines) { const p = document.createElement("p"); p.textContent = line; summary.append(p); }
    controls();
  }
  async function refresh() {
    busy = true; current = null; savedRevision = null; controls(); status.textContent = "正在讀取當下收藏⋯";
    try { current = await F.request(`/v1/collection/${child.value}`); status.textContent = "請先下載此版本備份，核對孩子與車款後再退包。"; }
    catch (error) { status.textContent = error.message; }
    finally { busy = false; render(); }
  }
  backup.addEventListener("click", () => {
    if (!current || busy) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(current, null, 2) + "\n"], { type:"application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `collection-${child.value}-revision-${current.revision}.json`;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    savedRevision = current.revision; status.textContent = "備份下載已啟動。請確認檔案已保存，再按退包。"; controls();
  });
  release.addEventListener("click", async () => {
    if (busy) return;
    let pending = F.read(pendingKey());
    if (!pending) {
      if (!current || savedRevision !== current.revision || !C.releaseSummary(current).releasable) return;
      pending = { command: { type:"release-build", commandId:`release:${crypto.randomUUID()}`, expectedActiveBuildId:current.activeBuild.id, expectedRevision:current.revision }, before:current };
      if (!F.write(pendingKey(), pending)) { status.textContent = "無法保存操作識別，尚未退包。"; return; }
    }
    busy = true; controls(); status.textContent = "正在退包並讀回核對⋯";
    try {
      await F.request(`/v1/collection/${child.value}/release-build`, { method:"POST", body:JSON.stringify(pending.command) });
      current = await F.request(`/v1/collection/${child.value}`);
      const after = C.verifyRelease(pending.before, current, pending.command.expectedActiveBuildId);
      localStorage.removeItem(pendingKey());
      status.textContent = `已讀回核對：原有 ${after.originalTotal} 包的 ID 與日期皆保留，目前共 ${after.total} 包（另新增 ${after.added} 包）。本次已退回 ${after.released} 包，目前${after.buildId ? "已有其他作品；未對新作品退包" : "尚未選車"}，零件盒未配 ${after.unassigned} 包。`;
      savedRevision = null;
    } catch (error) {
      if ([400,404,409].includes(error.status)) { localStorage.removeItem(pendingKey()); savedRevision = null; current = null; }
      status.textContent = `${error.message} ${current ? "可重試同一筆操作。" : "請重新讀取並重新備份。"}`;
    } finally { busy = false; render(); }
  });
  read.addEventListener("click", refresh); child.addEventListener("change", refresh); void refresh();
})();
