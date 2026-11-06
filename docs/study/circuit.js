/* 限定一電池、一燈泡、兩電線的原圖操作；不模擬任意電路。 */
(function(root) {
  "use strict";
  const IDS = ["battery-positive", "battery-negative", "bulb-glass", "bulb-shell", "bulb-base"];
  const initial = () => ({ batteryPlaced: false, edges: [], selected: null });
  const pairKey = pair => [...pair].sort().join(":");
  function complete(value) {
    return value?.batteryPlaced === true && Array.isArray(value.edges) && value.edges.length === 2 &&
      value.edges.every(edge => Array.isArray(edge) && edge.length === 2 && edge.every(id => IDS.includes(id)) && edge[0] !== edge[1]) &&
      new Set(value.edges.map(pairKey)).size === 2;
  }
  function grade(value) {
    if (!complete(value)) return false;
    const ends = value.edges.flat();
    return ["battery-positive", "battery-negative", "bulb-shell", "bulb-base"].every(id => ends.filter(x => x === id).length === 1) &&
      value.edges.every(edge => edge.filter(id => id.startsWith("battery-")).length === 1);
  }
  function update(value, action, id) {
    const next = { batteryPlaced: !!value?.batteryPlaced, edges: (value?.edges || []).map(pair => [...pair]), selected: value?.selected || null };
    if (action === "place") next.batteryPlaced = true;
    else if (action === "clear") return initial();
    else if (action === "delete" && Number.isInteger(Number(id)) && Number(id) >= 0 && Number(id) < next.edges.length) { next.edges.splice(Number(id), 1); next.selected = null; }
    else if (action === "terminal" && IDS.includes(id) && next.batteryPlaced) {
      if (!next.selected) { if (next.edges.length < 2) next.selected = id; }
      else {
        const pair = [next.selected, id];
        if (id !== next.selected && next.edges.length < 2 && !next.edges.some(edge => pairKey(edge) === pairKey(pair))) next.edges.push(pair);
        next.selected = null;
      }
    }
    return next;
  }
  function render(q, value = initial(), disabled = false) {
    const nodes = q.circuit.terminals, byId = new Map(nodes.map(node => [node.id, node]));
    const positive = byId.get("battery-positive"), negative = byId.get("battery-negative");
    const esc = value => String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
    const lock = disabled ? " disabled" : "";
    return `<section class="study-circuit" aria-label="電池與燈泡連線操作">
      <p>先放入一顆電池，再點兩個接點畫一條線，共畫兩條。可刪除電線後重畫。</p>
      <div class="circuit-tools"><button type="button" data-circuit-action="place" ${value.batteryPlaced ? "disabled" : lock}>放入一顆電池</button><button type="button" data-circuit-action="clear"${lock}>全部重畫</button></div>
      <div class="circuit-scene">
        <img class="circuit-bulb" src="${esc(q.material.data)}" alt="${esc(q.material.alt)}" />
        <svg viewBox="0 0 1000 700" aria-hidden="true">
          ${value.batteryPlaced ? `<rect x="${positive.x - 45}" y="${positive.y + 12}" width="90" height="${negative.y - positive.y - 24}" rx="8" fill="#e8eef4" stroke="#334155" stroke-width="4"/><rect x="${positive.x - 16}" y="${positive.y - 2}" width="32" height="16" fill="#64748b"/><text x="${positive.x}" y="${positive.y + 60}" text-anchor="middle" font-size="40">+</text><text x="${negative.x}" y="${negative.y - 35}" text-anchor="middle" font-size="40">−</text>` : ""}
          ${value.edges.map(edge => { const a = byId.get(edge[0]), b = byId.get(edge[1]); return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#225c88" stroke-width="7"/>`; }).join("")}
        </svg>
        ${nodes.map((node, index) => node.id.startsWith("battery-") && !value.batteryPlaced ? "" : `<button type="button" class="circuit-terminal" style="left:${node.x / 10}%;top:${node.y / 7}%" data-circuit-action="terminal" data-circuit-value="${node.id}" aria-label="接點 ${index + 1}" aria-pressed="${value.selected === node.id}" ${!value.batteryPlaced ? "disabled" : lock}><span></span><b>${index + 1}</b></button>`).join("")}
      </div>
      <p role="status">${!value.batteryPlaced ? "尚未放入電池" : value.selected ? "再選一個接點" : `已畫 ${value.edges.length}／2 條電線`}</p>
      <div class="circuit-tools">${value.edges.map((_, index) => `<button type="button" data-circuit-action="delete" data-circuit-value="${index}"${lock}>刪除電線 ${index + 1}</button>`).join("")}</div>
    </section>`;
  }
  root.StudyCircuit = { IDS, initial, complete, grade, update, render };
})(globalThis);
