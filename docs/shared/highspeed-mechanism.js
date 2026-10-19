(() => {
  "use strict";
  const global = typeof window === "undefined" ? globalThis : window;
  const nose = ["p7-1", "p7-2", "p7-3"];
  const esc = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"})[char]);
  const artwork = (part, ids) => {
    const mask = (part.occlusionPeers || []).reduce((sum, id, index) => sum | (ids.has(id) ? 1 << index : 0), 0);
    return part.variants?.find(variant => variant.mask === mask)?.svg || part.svg;
  };
  const fullArtwork = part => part.variants?.find(variant => variant.mask === 0)?.svg || part.svg;
  const sourcesIn = svg => [...svg.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
  const hand = '<svg viewBox="0 0 64 72" aria-hidden="true"><path d="M19 37V13c0-7 10-7 10 0v17-5c0-6 9-6 9 0v6-4c0-6 9-6 9 0v7c0-6 9-6 9 0v15c0 12-8 20-20 20-9 0-12-5-18-13L7 43c-4-7 3-11 8-5l8 10" fill="#fff1d5" stroke="#47757a" stroke-width="3" stroke-linejoin="round"/></svg>';

  // A view of the existing toy bricks. This module never writes collection data.
  function create(model) {
    if (!["700t", "n700s"].includes(model?.id)) return null;
    const duck = model.id === "700t";
    const parts = model.steps.flatMap(step => step.parts);
    const byId = id => parts.find(part => part.id === id);
    const featureIds = duck ? [...nose, "p12-1", "p12-2", "p12-3"] : nose;
    const sceneIds = new Set(["p4-1", ...featureIds]);
    const viewBox = duck ? "45 65 395 365" : "65 85 420 360";
    const travel = { layers: 82, cover: 76, wings: 74 };
    const values = { layers: 0, cover: 0, wings: 0 };
    let placed = new Set(), current = nose[0];
    const isPart = id => featureIds.includes(id);
    const can = (kind, ids = placed) => kind === "cover"
      ? duck && ids.has("p7-1") && ids.has("p12-2")
      : kind === "layers" ? duck && nose.every(id => ids.has(id))
      : kind === "wings" && !duck && nose.every(id => ids.has(id));
    const title = kind => kind === "cover" ? "檢修蓋" : kind === "layers" ? "鴨嘴分層" : "中央與雙翼";
    const value = kind => can(kind) ? values[kind] || 0 : 0;
    const transform = (name, amount) => name === "layers-upper" ? `translate(0 ${-amount * travel.layers})`
      : name === "layers-middle" ? `translate(0 ${-amount * travel.layers / 2})`
      : name === "cover" ? `translate(${-amount * travel.cover} ${amount * 11})`
      : name === "wing-far" ? `translate(${-amount * 24} ${-amount * travel.wings})`
      : `translate(${amount * 43} ${amount * travel.wings * .48})`;
    const moved = (name, amount, art) => `<g data-hs-move="${name}" transform="${transform(name, amount)}">${art}</g>`;
    function sync(ids) {
      placed = new Set(ids);
      for (const kind of Object.keys(values)) if (!can(kind)) values[kind] = 0;
    }
    function endTrial() { for (const kind of Object.keys(values)) values[kind] = 0; }
    function choose(id) { if (isPart(id)) { current = id; endTrial(); } }
    function part(id) {
      if (!isPart(id)) return null;
      const item = byId(id);
      return { box: item.box, svg: item.svg, variants: item.variants, occlusionPeers: item.occlusionPeers };
    }
    function sourcesFor(ids) {
      return [...new Set(parts.filter(item => sceneIds.has(item.id) && ids.has(item.id))
        .flatMap(item => sourcesIn(artwork(item, ids)).concat(sourcesIn(fullArtwork(item)))))];
    }
    const picture = (ids, box = viewBox) => `<svg viewBox="${box}" aria-hidden="true">${featureIds.filter(id => ids.has(id)).map(id => fullArtwork(byId(id))).join("")}</svg>`;
    function gesture() {
      return `<span class="hs-gesture" role="img" aria-label="${duck ? "上下分開鴨嘴，檢修蓋向左試拆" : "上下拖動，讓雙翼向兩側展開"}">${picture(new Set(nose))}${hand}<b aria-hidden="true">${duck ? "↕" : "↗↙"}</b></span>`;
    }
    function instructions(id) {
      const item = byId(isPart(id) ? id : current);
      const stages = duck ? [["下層", [nose[0]]], ["橘色中層", nose.slice(0, 2)], ["白色上層", nose]]
        : [["下層", [nose[0]]], ["中央", nose.slice(0, 2)], ["雙翼", nose]];
      if (duck && id?.startsWith("p12-")) {
        return `<div class="hs-instructions" role="img" aria-label="選好車鼻零件，接到虛線位置；檢修蓋接好後可試拆及接回"><span>${picture(new Set([id]), `${item.box.x - 10} ${item.box.y - 10} ${item.box.width + 20} ${item.box.height + 20}`)}</span><i aria-hidden="true">→</i><span>${picture(new Set(featureIds))}</span><i aria-hidden="true">→</i>${gesture()}</div>`;
      }
      return `<div class="hs-instructions" role="img" aria-label="${duck ? "由下往上，接上白色底、橘色中層、白色上層" : "接上長鼻底座，再接中央，最後接合兩側高起的雙翼"}">${stages.map(([label, ids], index) => `<span class="${ids.at(-1) === id ? "active" : ""}"><b>${index + 1}</b>${picture(new Set(ids))}<small>${label}</small></span>${index < 2 ? '<i aria-hidden="true">→</i>' : ""}`).join("")}</div>`;
    }
    function operator(kind, amount, art, box, disabled) {
      return `<g data-train-operate="${kind}" class="hs-moving" role="slider" aria-label="${esc(title(kind))}${kind === "cover" ? "向左試拆，向右接回" : "向上分開，向下接回"}" tabindex="${disabled ? -1 : 0}" aria-disabled="${disabled}" aria-orientation="${kind === "cover" ? "horizontal" : "vertical"}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(amount * 100)}">${art}<rect class="hs-focus" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="7"/><rect class="hs-hit" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="7" fill="transparent"/></g>`;
    }
    function scene(ids, { disabled = false, before = false } = {}) {
      const amount = kind => before ? 0 : value(kind);
      const base = ids.has("p4-1") ? `<g data-hs-context="p4-1">${artwork(byId("p4-1"), ids)}</g>` : "";
      if (duck) {
        const layers = amount("layers"), cover = amount("cover");
        const art = id => ids.has(id) ? `<g data-hs-part="${id}"><g data-hs-surface-rest visibility="${layers ? "hidden" : "visible"}">${artwork(byId(id), ids)}</g><g data-hs-surface-spread visibility="${layers ? "visible" : "hidden"}">${fullArtwork(byId(id))}</g></g>` : "";
        const lower = art("p7-1") + art("p12-1");
        const middle = moved("layers-middle", layers, art("p7-2") + art("p12-3"));
        const upper = moved("layers-upper", layers, art("p7-3"));
        const layerArt = lower + middle + upper;
        const coverArt = ids.has("p12-2") ? moved("cover", cover, `<g data-hs-part="p12-2">${fullArtwork(byId("p12-2"))}</g>`) : "";
        const coverBox = { x: 54, y: 284, width: 130, height: 65 };
        // The dashed seat marks a toy connection; it is not an invented mechanism.
        const seat = ids.has("p7-1") && ids.has("p12-2") ? `<path class="hs-seat" data-hs-seat="cover" visibility="${cover ? "visible" : "hidden"}" d="m138 296 33 15v15l-33-15Z"/>` : "";
        return `${base}${can("layers", ids) ? operator("layers", layers, layerArt, { x: 129, y: 101, width: 190, height: 245 }, disabled) : layerArt}${seat}${can("cover", ids) ? operator("cover", cover, coverArt, coverBox, disabled) : coverArt}`;
      }
      const wings = amount("wings");
      const body = nose.slice(0, 2).filter(id => ids.has(id)).map(id => `<g data-hs-part="${id}">${wings ? fullArtwork(byId(id)) : artwork(byId(id), ids)}</g>`).join("");
      // The original p7-3 PNG already has two distinct brick rows. Complementary
      // clips follow the transparent seam; both halves retain the original ID.
      const wingPart = byId("p7-3");
      const wingArt = ids.has("p7-3") ? `<g data-hs-part="p7-3"><g data-hs-wing-rest ${wings ? 'visibility="hidden"' : ""}>${artwork(wingPart, ids)}</g><g data-hs-wing-spread ${wings ? "" : 'visibility="hidden"'}>${moved("wing-far", wings, `<g clip-path="url(#hs-n700s-far)">${fullArtwork(wingPart)}</g>`)}${moved("wing-near", wings, `<g clip-path="url(#hs-n700s-near)">${fullArtwork(wingPart)}</g>`)}</g></g>` : "";
      const defs = '<defs><clipPath id="hs-n700s-far"><path d="M100 100H311V212L303 222 292 232 279 242 266 252 252 262 238 272 224 282 210 292 196 302 182 312 168 322 158 327H100Z"/></clipPath><clipPath id="hs-n700s-near"><path d="M311 100H410V400H100V327H158L168 322 182 312 196 302 210 292 224 282 238 272 252 262 266 252 279 242 292 232 303 222 311 212Z"/></clipPath></defs>';
      return `${defs}${base}${body}${can("wings", ids) ? operator("wings", wings, wingArt, { x: 110, y: 95, width: 300, height: 300 }, disabled) : wingArt}`;
    }
    function controls(ids, { disabled = false } = {}) {
      const kinds = duck ? ["layers", "cover"] : ["wings"];
      return `<div class="hs-controls">${kinds.filter(kind => can(kind, ids)).map(kind => {
        const amount = value(kind), openLabel = kind === "cover" ? "試拆" : kind === "layers" ? "分層" : "展開";
        const off = disabled ? "disabled" : "";
        return `<div class="hs-unit"><strong>${title(kind)}</strong><button type="button" data-train-action="open" data-kind="${kind}" aria-label="${openLabel}${title(kind)}，不改拼裝進度" ${off}>${openLabel}</button><input type="range" data-train-range="${kind}" aria-label="${title(kind)}分開程度" min="0" max="100" step="1" value="${Math.round(amount * 100)}" ${off}><button type="button" data-train-action="close" data-kind="${kind}" aria-label="接回${title(kind)}，不改拼裝進度" ${off}>接回</button></div>`;
      }).join("")}<small class="hs-note">玩具零件觀察</small></div>`;
    }
    function move(kind, amount) { if (can(kind) && Number.isFinite(amount)) values[kind] = Math.max(0, Math.min(1, amount)); }
    function trial(action, kind) {
      if (["open", "detach"].includes(action)) move(kind, 1);
      if (["close", "attach"].includes(action)) move(kind, 0);
    }
    function update(host) {
      for (const [name, kind] of [["layers-upper", "layers"], ["layers-middle", "layers"], ["cover", "cover"], ["wing-far", "wings"], ["wing-near", "wings"]]) {
        host.querySelector(`[data-hs-move="${name}"]`)?.setAttribute("transform", transform(name, value(kind)));
      }
      host.querySelector("[data-hs-wing-rest]")?.setAttribute("visibility", value("wings") ? "hidden" : "visible");
      host.querySelector("[data-hs-wing-spread]")?.setAttribute("visibility", value("wings") ? "visible" : "hidden");
      for (const item of host.querySelectorAll("[data-hs-surface-rest]")) item.setAttribute("visibility", value("layers") ? "hidden" : "visible");
      for (const item of host.querySelectorAll("[data-hs-surface-spread]")) item.setAttribute("visibility", value("layers") ? "visible" : "hidden");
      host.querySelector('[data-hs-seat="cover"]')?.setAttribute("visibility", value("cover") ? "visible" : "hidden");
      for (const kind of Object.keys(values)) {
        const amount = Math.round(value(kind) * 100);
        host.querySelector(`[data-train-operate="${kind}"]`)?.setAttribute("aria-valuenow", String(amount));
        const range = host.querySelector(`[data-train-range="${kind}"]`); if (range) range.value = String(amount);
      }
    }
    return { sync, isPart, part, choose, scene, controls, instructions, gesture, trial, move, value, endTrial, update, sourcesFor, travel, viewBox, label: "車鼻零件特寫",
      hasPart: ids => featureIds.some(id => ids.has(id)), autoPack: index => index === 6 || duck && index === 11,
      axis: kind => kind === "cover" ? "horizontal" : "vertical",
      direction: kind => kind === "cover" ? -1 : 1,
      entry: id => !duck && id === "p7-3" ? { x: -45, y: -10 } : { x: 0, y: -35 },
      arrow: id => !duck && id === "p7-3" ? "right" : "down",
      get sources() { return sourcesFor(placed); }, get current() { return current; }
    };
  }
  global.KidsHighspeedMechanism = Object.freeze({ create });
})();
