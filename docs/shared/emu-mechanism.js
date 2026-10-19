(() => {
  "use strict";
  const global = typeof window === "undefined" ? globalThis : window;
  const doors = ["p8-1", "p8-2", "p8-3"];
  const nose = ["p7-1", "p7-2", "p7-3", "p12-1", "p12-2"];
  const icon = text => `<span aria-hidden="true">${text}</span>`;
  function create(model) {
    if (!["emu3000", "emu900"].includes(model?.id)) return null;
    const isDoor = model.id === "emu900";
    const parts = model.steps.flatMap(step => step.parts), byId = id => parts.find(part => part.id === id);
    let placed = new Set(), chosen = isDoor ? doors[0] : nose[0], lit = false, opening = 0, detached = false;
    const staged = new Set();
    const complete = ids => isDoor ? ids.has(chosen) && !detached : nose.every(id => ids.has(id));
    const savedArt = (id, ids) => {
      const part = byId(id); if (!part) return "";
      const mask = (part.occlusionPeers || []).reduce((value, peer, index) => value | (ids.has(peer) ? 1 << index : 0), 0);
      return part.variants?.find(variant => variant.mask === mask)?.svg || part.svg;
    };
    // The checked-in PNG contains doors on both sides of the carriage. This
    // close-up crops the visible near pair; it does not draw replacement doors.
    function doorArt(id, half) {
      const part = byId(id), b = part.box;
      const crop = `${b.x + b.width * .574} ${b.y + b.height * .18} ${b.width * .426} ${b.height * .82}`;
      const x = half === "left" ? 354 : 420;
      return `<svg x="${x}" y="90" width="66" height="340" viewBox="${half === 'left' ? 354 : 420} 90 66 340" overflow="hidden"><svg x="354" y="90" width="132" height="340" viewBox="${crop}" preserveAspectRatio="none">${part.svg}</svg></svg>`;
    }
    function sync(ids) {
      placed = new Set(ids);
      for (const id of staged) if (placed.has(id)) staged.delete(id);
      if (!placed.has(chosen)) { opening = 0; detached = false; }
      if (!complete(placed)) lit = false;
    }
    function part(id) {
      if (!isPart(id)) return null;
      if (!isDoor) return { ...byId(id) };
      if (placed.has(id)) return { box: { x:354, y:90, width:132, height:340 }, svg:doorArt(id,'left')+doorArt(id,'right'), variants:[], occlusionPeers:[] };
      const half = staged.has(id) ? "right" : "left";
      return { box: { x: half === "left" ? 354 : 420, y: 90, width: 66, height: 340 }, svg: doorArt(id, half), variants: [], occlusionPeers: [] };
    }
    function isPart(id) { return (isDoor ? doors : nose).includes(id); }
    function scene(ids, { disabled = false, before = false } = {}) {
      if (!isDoor) {
        const art = ["p4-1", "p6-1", ...nose, "p8-3", "p10-1", "p12-3"].filter(id => ids.has(id)).sort((a,b) => byId(a).z - byId(b).z).map(id => `<g data-train-saved="${id}">${savedArt(id, ids)}</g>`).join("");
        return `${art}${lit && complete(ids) && !before ? `<g data-train-lit="true" aria-label="玩具頭燈已試亮"><ellipse cx="216" cy="215" rx="21" ry="12" fill="#fff4a9" opacity=".72"/><ellipse cx="182" cy="278" rx="35" ry="20" fill="#fff4a9" opacity=".58"/></g>` : ""}`;
      }
      const done = ids.has(chosen), left = done || !before && staged.has(chosen), value = done && !before ? opening : 0;
      return `<path d="M280 438H560" stroke="#aab8a8" stroke-width="7" stroke-linecap="round" aria-hidden="true"/>
        <rect x="350" y="86" width="140" height="348" rx="5" fill="#d6dfd3" stroke="#a1b39d" stroke-width="3" stroke-dasharray="6 8" aria-hidden="true"/>
        <g data-train-door="${chosen}" data-train-staged="${!done && left}">
        ${left && !detached ? `<g data-train-leaf="left" transform="translate(${-value * 59} 0)">${doorArt(chosen, "left")}</g>` : ""}
        ${done && !detached ? `<g data-train-leaf="right" transform="translate(${value * 59} 0)">${doorArt(chosen, "right")}</g>` : ""}
        ${done && !detached ? `<rect data-train-operate="doors" class="train-operate" x="332" y="80" width="176" height="358" fill="transparent" role="slider" aria-label="雙扇門反向滑開程度" aria-orientation="horizontal" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(value*100)}" aria-disabled="${disabled}" tabindex="${disabled ? -1 : 0}"/>` : ""}</g>`;
    }
    function gesture() { return `<span class="train-feature-gesture" role="img" aria-label="${isDoor ? '雙扇門向兩邊滑開，再合攏' : '接好車頭和燈組，再試亮玩具頭燈'}">${icon(isDoor ? '← ▥ ▥ →' : '◉ → ☼')}</span>`; }
    function instructions(id) {
      if (!isDoor) {
        const target = byId(nose.includes(id) ? id : chosen), b = target.box;
        const thumb = `<svg viewBox="${b.x} ${b.y} ${b.width} ${b.height}" aria-hidden="true">${savedArt(target.id,placed)}</svg>`;
        return `<div class="train-feature-guide" role="img" aria-label="拿取這組零件，接上車頭；車頭與兩組燈都裝好後才試亮"><span><b>1</b>${thumb}</span>${icon('→')}<span class="active"><b>2</b>${thumb}${icon('↓')}</span>${icon('→')}${gesture()}</div>`;
      }
      id = doors.includes(id) ? id : chosen;
      const step = placed.has(id) ? 2 : staged.has(id) ? 1 : 0;
      return `<div class="train-feature-guide" role="img" aria-label="1 接左門扇；2 接右門扇後保存；3 雙扇門反向滑開和合攏">${["左門扇", "右門扇", "試開合"].map((label, index) => `<span class="${step === index ? 'active' : ''}"><b>${index + 1}</b>${index < 2 ? `<svg viewBox="${index === 0 ? 354 : 420} 90 66 340" aria-hidden="true">${doorArt(id || chosen, index === 0 ? 'left' : 'right')}</svg>` : gesture()}<small>${label}</small></span>`).join(icon('→'))}</div>`;
    }
    function controls(ids, { disabled = false } = {}) {
      const off = disabled ? 'disabled' : '';
      if (!isDoor) return `<div class="train-feature-controls">${gesture()}<button data-train-action="light" aria-label="${lit ? '關閉' : '試亮'}玩具頭燈" aria-pressed="${lit}" ${off} ${complete(ids) ? '' : 'disabled'}>${lit ? '關燈' : '試亮頭燈'}</button><span role="status">${complete(ids) ? '車頭與燈組已接好' : '接好車頭與兩組燈，再試亮'}</span></div>`;
      return `<div class="train-feature-controls">${doors.filter(id => ids.has(id)).map((id, index) => `<button data-train-action="unit" data-part="${id}" aria-label="查看${byId(id).name}" aria-pressed="${id === chosen}" ${off}>${doors.indexOf(id)+1}</button>`).join('')}${gesture()}<button data-train-action="open" data-kind="doors" aria-label="雙扇門反向滑開" ${off} ${complete(ids) ? '' : 'disabled'}>滑開</button><input type="range" data-train-range="doors" min="0" max="100" value="${Math.round(opening*100)}" aria-label="雙扇門開啟程度" ${off} ${complete(ids) ? '' : 'disabled'}><button data-train-action="close" data-kind="doors" aria-label="雙扇門合攏" ${off} ${complete(ids) ? '' : 'disabled'}>合攏</button></div>`;
    }
    function move(kind, value) { if (isDoor && kind === 'doors' && complete(placed) && Number.isFinite(value)) opening = Math.max(0, Math.min(1, value)); }
    function update(host) {
      host.querySelector('[data-train-leaf="left"]')?.setAttribute('transform', `translate(${-opening*59} 0)`);
      host.querySelector('[data-train-leaf="right"]')?.setAttribute('transform', `translate(${opening*59} 0)`);
      host.querySelector('[data-train-operate="doors"]')?.setAttribute('aria-valuenow', String(Math.round(opening*100)));
      const slider = host.querySelector('[data-train-range="doors"]'); if (slider) slider.value = String(Math.round(opening*100));
    }
    return { sync, part, scene, controls, instructions, gesture, isPart, update, move,
      label: isDoor ? '雙扇門零件特寫' : '車頭與燈組特寫', viewBox: isDoor ? '240 55 360 410' : '100 160 250 240',
      sourcesFor: ids => [...new Set((isDoor ? doors : nose).filter(id => ids.has(id) || staged.has(id)).flatMap(id => [...byId(id).svg.matchAll(/href="([^"]+)"/g)].map(match => match[1])))],
      hasPart: ids => [...ids].some(isPart), autoPack: index => isDoor ? index === 7 : [6,11].includes(index),
      choose(id) { if (isPart(id)) { chosen = id; opening = 0; detached = false; } },
      stage(id) { if (!isDoor || !isPart(id) || placed.has(id) || staged.has(id)) return false; staged.add(id); return true; },
      hasStaged: () => staged.size > 0, clearStaged() { staged.clear(); },
      entry: id => ({x: isDoor ? staged.has(id) ? 65 : -65 : 0, y: isDoor ? 0 : -20}),
      arrow: id => isDoor ? staged.has(id) ? 'left' : 'right' : 'down',
      value: () => opening, travel: {doors:59}, axis: () => 'horizontal',
      trial(action, kind) { if (action === 'unit') return; if (!complete(placed)) return; if (action === 'light') lit = !lit; if (action === 'open') move(kind, 1); if (action === 'close') move(kind, 0); },
      endTrial() { lit = false; opening = 0; detached = false; },
      get current() { return chosen; },
    };
  }
  global.KidsEmuMechanism = Object.freeze({create});
})();
