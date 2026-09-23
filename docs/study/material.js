// 僅渲染已由 StudyPrivatePack.parse 驗證的私人題材。
(function(root) {
  "use strict";
  const esc = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&#39;" })[char]);

  function render(material) {
    if (!material) return "";
    if (material.kind === "table") return `<div class="study-table-scroll" role="region" tabindex="0" aria-label="${esc(material.caption)}；表格可左右捲動"><table class="study-material-table"><caption>${esc(material.caption)}</caption><thead><tr>${material.columns.map(cell => `<th scope="col">${esc(cell)}</th>`).join("")}</tr></thead><tbody>${material.rows.map(row => `<tr>${row.map((cell, index) => index === 0 ? `<th scope="row">${esc(cell)}</th>` : `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div><p class="study-table-hint">表格可左右滑動查看全部欄位</p>`;
    return `<figure class="study-material-image"><img src="${esc(material.data)}" alt="${esc(material.alt)}"><figcaption>${esc(material.alt)}</figcaption><button type="button" data-material-open>放大圖片</button><div class="study-material-overlay" role="dialog" aria-modal="true" aria-label="放大圖片：${esc(material.alt)}" hidden><button type="button" data-material-close>關閉圖片</button><img src="${esc(material.data)}" alt="${esc(material.alt)}"></div></figure>`;
  }

  function bind(container) {
    const open = container.querySelector?.("[data-material-open]");
    const close = container.querySelector?.("[data-material-close]");
    const overlay = container.querySelector?.(".study-material-overlay");
    if (!open || !close || !overlay) return;
    open.onclick = () => { overlay.hidden = false; close.focus(); };
    close.onclick = () => { overlay.hidden = true; open.focus(); };
    overlay.onclick = event => { if (event.target === overlay) close.click(); };
    overlay.onkeydown = event => {
      if (event.key === "Escape") { event.preventDefault(); close.click(); }
      else if (event.key === "Tab") { event.preventDefault(); close.focus(); }
    };
  }
  root.StudyMaterial = { render, bind };
})(globalThis);
