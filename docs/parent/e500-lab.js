(() => {
  "use strict";
  const model = window.KidsBrickE500;
  const { presets, createTrial } = window.KidsE500LabState;
  // Restrict the original workshop's picker and artwork to this one model.
  window.KidsBrickModels = { title: "E500 比較原型", models: [model], get: id => id === model.id ? model : null };
  const parts = model.steps.flatMap(step => step.parts).sort((a, b) => a.z - b.z);
  const host = document.getElementById("improved-host");
  const currentHost = document.getElementById("current-host");
  const announce = text => { document.getElementById("lab-announcement").textContent = text; };
  const sound = window.KidsBrickAudio.create();
  const trials = new Map();
  let presetId = "half", mode = "improved", baseline = null;
  let selected = null, busy = false, paused = false, before = false, pushing = false, offset = 0;
  let drag = null, floating = null, motion = null, epoch = 0, suppressClickUntil = 0;
  let assetsReady = false, assetError = false, imageAttempt = 0, audioEnabled = true;
  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = text => String(text).replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[ch]);
  const preset = () => presets[presetId];
  const pair = () => {
    if (!trials.has(presetId)) trials.set(presetId, { improved: createTrial(model, presetId), current: createTrial(model, presetId) });
    return trials.get(presetId);
  };
  const trial = () => pair().improved;
  const placed = () => new Set(trial().snapshot().activeBuild.placed);
  const pack = () => model.steps[trial().packIndex].parts;
  const partById = id => parts.find(part => part.id === id);
  const doneCount = () => placed().size - preset().start;

  function artwork(part, ids) {
    const mask = (part.occlusionPeers || []).reduce((sum, id, index) => sum | (ids.has(id) ? 1 << index : 0), 0);
    return part.variants?.find(variant => variant.mask === mask)?.svg || part.svg;
  }
  function pieces(ids, { rail = null, highlight = false } = {}) {
    const initial = new Set(trial().initial);
    return parts.filter(part => ids.has(part.id) && (rail === null || (part.z < 3) === rail)).map(part =>
      `<g class="placed-part${highlight && !initial.has(part.id) ? " placed-new" : ""}" data-placed="${part.id}">${artwork(part, ids)}</g>`).join("");
  }
  function miniature(ids, label) {
    return `<svg viewBox="45 80 720 420" role="img" aria-label="${esc(label)}">${pieces(ids)}</svg>`;
  }
  function icon(name) {
    const paths = {
      check: '<path d="m5 12 4 4L19 6"/>',
      arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
      left: '<path d="M20 12H4m6-6-6 6 6 6"/>',
      down: '<path d="M12 3v16m-6-6 6 6 6-6"/>',
      pause: '<path d="M8 5v14M16 5v14"/>',
      play: '<path d="m8 4 12 8-12 8Z"/>',
      history: '<path d="M4 9a8 8 0 1 1 0 7M4 3v6h6m2-2v6l4 2"/>',
      bag: '<path d="M5 7h14l2 14H3ZM9 7V3h6v4"/>',
      sound: '<path d="M3 9h4l5-5v16l-5-5H3Zm13-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16"/>',
      muted: '<path d="M3 9h4l5-5v16l-5-5H3Zm13 0 6 6m0-6-6 6"/>',
      hand: '<path d="M9 12V4a2 2 0 0 1 4 0v7-3a2 2 0 0 1 4 0v3-1a2 2 0 0 1 4 0v5c0 4-3 7-7 7h-1c-3 0-4-2-6-4l-3-4a2 2 0 0 1 3-3l2 2"/>',
      block: '<path d="M3 9h18v12H3Zm4 0V4h4v5m2 0V4h4v5"/>',
    };
    return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  }
  function partPicture(part, ids = placed()) {
    const b = part.box;
    return `<svg class="part-art" viewBox="${b.x} ${b.y} ${b.width} ${b.height}" aria-hidden="true">${artwork(part, ids)}</svg>`;
  }
  function instructionGraphic() {
    const part = partById(selected) || pack().find(item => !placed().has(item.id));
    if (!part) return "";
    return `<div class="picture-instructions" role="img" aria-label="1 選零件；2 拖到虛線接點，或點一下接點；3 接好">
      <div class="picture-step"><b>1</b>${partPicture(part)}<span class="gesture">${icon("hand")}</span></div>${icon("arrow")}
      <div class="picture-step target-step"><b>2</b>${partPicture(part)}<span class="gesture">${icon("down")}</span></div>${icon("arrow")}
      <div class="picture-step"><b>3</b>${partPicture(part)}<span class="gesture success">${icon("check")}</span></div></div>`;
  }
  function pushGraphic() {
    return `<span class="push-gesture" role="img" aria-label="按住模型，左右拖動">${icon("left")}${icon("hand")}${icon("arrow")}</span>`;
  }
  function nextPackGraphic() {
    const next = model.steps[trial().packIndex + 1];
    return next ? `<div class="next-pack" role="img" aria-label="${esc(preset().next)}"><span>下一包</span><div>${icon("arrow")}${next.parts.map(part => partPicture(part)).join("")}</div></div>` : `<div class="finished-mark" role="img" aria-label="E500 全部完成">${icon("check")}<span>42 / 42</span></div>`;
  }
  function guide(part) {
    if (!part) return "";
    const b = part.box, x = b.x + b.width / 2, y = b.y + b.height / 2;
    return `<g class="join-guide"><g class="ghost-part">${artwork(part, placed())}</g>
      <rect class="destination" x="${b.x - 7}" y="${b.y - 7}" width="${b.width + 14}" height="${b.height + 14}" rx="9"/>
      <circle class="contact-ring" cx="${x}" cy="${y}" r="18"/><circle class="contact-dot" cx="${x}" cy="${y}" r="5"/>
      <path class="join-arrow" d="M${x} ${y-60}v30m-9-9 9 9 9-9"/>
      </g><rect data-place-target tabindex="0" role="button" aria-label="接上：${esc(part.name)}" x="${b.x - 15}" y="${b.y - 15}" width="${Math.max(44, b.width + 30)}" height="${Math.max(44, b.height + 30)}" fill="transparent"/>`;
  }
  function statusText() {
    if (before) return "這是本包開始前的樣子。回到現在，看看多了哪裡。";
    if (pushing) return "按住車身左右推；也可以用下方按鈕或滑桿。";
    if (doneCount() === 3) return preset().done;
    return selected ? `把${preset().shortNames[pack().findIndex(part => part.id === selected)]}接到亮起的接點。` : "選一組零件，接點就會亮起。";
  }
  function renderImproved() {
    if (!assetsReady) {
      host.innerHTML = `<div class="asset-notice" role="status"><h2>${assetError ? "圖片暫時沒載好" : "正在把 E500 搬上工作台…"}</h2><p>${assetError ? "本頁的試拼進度仍在，載好圖片後就能接著拼。" : "準備模型與這包零件。"}</p>${assetError ? '<button class="primary" data-action="retry">重新載入圖片</button>' : ""}</div>`;
      return;
    }
    const ids = placed(), completed = doneCount() === 3;
    if (paused) {
      host.innerHTML = `<section class="pause-card">${miniature(ids,"留在工作台的 E500 半成品")}<p class="pause-count">${ids.size} / 42</p><button class="primary" data-action="resume" aria-label="回工作台接著拼">${icon("play")}繼續</button></section>`;
      return;
    }
    const shown = before ? new Set(trial().initial) : ids;
    // A trial pack can finish before a structural chapter does: suspension
    // follows the chassis, and glazing follows the cab frames.
    const chapter = shown.size < 15 ? 0 : shown.size < 21 ? 1 : shown.size < 27 ? 2 : shown.size < 36 ? 3 : 4;
    const chapters = [["底盤","p4-2"], ["橘色車身","p7-2"], ["駕駛室","p8-3"], ["車頂設備","p12-1"], ["車頭收尾","p14-2"]];
    host.innerHTML = `<section class="workshop" aria-label="E500 改善版工作台">
      <div class="workshop-top"><div class="model-heading"><h2>E500</h2><span class="model-count" aria-label="${shown.size} / 42 組已裝好">${shown.size}<small> / 42</small></span></div><div class="tool-actions"><button class="quiet-button icon-button" data-action="sound" aria-label="${audioEnabled ? "音效開" : "音效關"}" aria-pressed="${audioEnabled}">${icon(audioEnabled ? "sound" : "muted")}</button><button class="quiet-button" data-action="pause" aria-label="稍後再拼">${icon("pause")}休息</button></div></div>
      <ol class="chapters" aria-label="整台建造階段">${chapters.map(([name,id],index) => {
        const done = shown.size === 42 || index < chapter;
        return `<li class="${done ? "done" : index === chapter ? "active" : ""}" aria-label="${index+1} ${name}${done ? "已完成" : index === chapter ? "組裝中" : "尚未完成"}" ${index === chapter && shown.size < 42 ? 'aria-current="step"' : ""}><span class="chapter-number">${done ? icon("check") : index+1}</span>${partPicture(partById(id))}</li>`;
      }).join("")}</ol>
      <div class="bench-grid"><div class="model-area">${before ? `<div class="scene-note">${icon("history")}回看</div>` : ""}
        <svg class="scene${pushing ? " is-pushing" : ""}" id="lab-scene" viewBox="${preset().viewBox}" role="group" aria-label="E500 ${before ? "本包開始前" : "施工模型"}">
          <path class="ground-line" d="M65 445L745 270 M65 470L745 295"/>${pieces(shown, {rail:true})}
          <g id="movable-train" transform="translate(${offset} ${-offset * .257})">${pieces(shown,{rail:false,highlight:completed && !before})}</g>
          <g id="placement-guide">${!before && !pushing && selected ? guide(partById(selected)) : ""}</g>
        </svg>
        <div class="scene-caption"><div id="picture-guide">${pushing ? pushGraphic() : completed ? `<span class="pack-done" role="img" aria-label="這一包三組已接好">${icon("check")}${icon("check")}${icon("check")}</span>` : instructionGraphic()}</div><p id="scene-message" class="sr-only">${statusText()}</p></div>
      </div><aside class="tray" aria-label="改善版本包零件"><div class="pack-heading"><span aria-label="第 ${trial().packIndex+1} 包，共 14 包">${icon("bag")}${trial().packIndex + 1} / 14</span><span class="pack-dots" role="img" aria-label="本包 ${doneCount()} / 3 組已接好">${pack().map(part => `<i class="${ids.has(part.id) ? "done" : ""}">${ids.has(part.id) ? icon("check") : ""}</i>`).join("")}</span></div>
        <div class="part-list">${pack().map(part => {
          const isPlaced = ids.has(part.id);
          return `<button class="part-button" data-part="${part.id}" aria-label="${esc(part.name)}${isPlaced ? "，已接好" : ""}" aria-pressed="${selected === part.id}" ${isPlaced || before || pushing ? "disabled" : ""}>${partPicture(part,ids)}<span class="part-state">${icon(isPlaced ? "check" : "hand")}</span></button>`;
        }).join("")}</div>
        ${!completed ? `<button class="primary place-button" data-action="place" aria-label="接上選好的零件" ${!selected || before || pushing ? "disabled" : ""}>${icon("down")}接上</button><p class="sr-only" id="ready-status">${before || pushing ? "回到組裝就能繼續。" : "靠近接點會對準，放到空白處會取消。"}</p>` : `<div class="round-end"><button class="quiet-button compare-button" data-action="before" aria-label="${before ? "回到現在" : "看看本包開始前"}" aria-pressed="${before}">${miniature(before ? ids : new Set(trial().initial),before ? "本包完成後" : "本包開始前")}<span>${icon(before ? "arrow" : "history")}${before ? "現在" : "回看"}</span></button>${nextPackGraphic()}</div>`}
      </aside></div>
      ${ids.size >= 12 ? `<div class="milestone"><button class="push-button" data-action="push" aria-label="${pushing ? "回到組裝" : "試推看看"}" aria-pressed="${pushing}" ${before ? "disabled" : ""}>${pushing ? icon("block") : pushGraphic()}<span>${pushing ? "組裝" : "試推"}</span></button>${pushing ? `<div class="push-controls"><button class="quiet-button icon-button" data-action="push-left" aria-label="往左推">${icon("left")}</button><input id="push-position" type="range" aria-label="車的位置" min="-45" max="45" value="0" step="1"><button class="quiet-button icon-button" data-action="push-right" aria-label="往右推">${icon("arrow")}</button></div>` : ""}</div>` : ""}
    </section>`;
    if (pushing) updateOffset(offset);
  }

  function selectPart(id) {
    if (busy || before || pushing || paused || placed().has(id) || !pack().some(part => part.id === id)) return;
    selected = id;
    for (const button of host.querySelectorAll("[data-part]")) button.setAttribute("aria-pressed", String(button.dataset.part === id));
    host.querySelector("#placement-guide").innerHTML = guide(partById(id));
    host.querySelector("#scene-message").textContent = statusText();
    const button = host.querySelector('[data-action="place"]');
    button.disabled = false;
    host.querySelector("#picture-guide").innerHTML = instructionGraphic();
    announce(statusText());
  }
  function destination(part) {
    const svg = host.querySelector("#lab-scene"), matrix = svg.getScreenCTM();
    const b = part.box;
    const a = new DOMPoint(b.x, b.y).matrixTransform(matrix);
    const z = new DOMPoint(b.x + b.width, b.y + b.height).matrixTransform(matrix);
    return { x:a.x, y:a.y, width:z.x-a.x, height:z.y-a.y };
  }
  function makeFloating(part, dest) {
    const div = document.createElement("div"), b = part.box;
    div.className = "flying-part";
    div.setAttribute("aria-hidden","true");
    div.style.width = dest.width + "px"; div.style.height = dest.height + "px";
    div.style.left = "0"; div.style.top = "0";
    div.innerHTML = `<svg viewBox="${b.x} ${b.y} ${b.width} ${b.height}">${artwork(part, placed())}</svg>`;
    document.body.append(div); floating = div;
    return div;
  }
  function cancelInteraction() {
    epoch++; drag = null; busy = false;
    motion?.cancel(); motion = null;
    floating?.remove(); floating = null;
    sound.stop();
  }
  async function install(id, from = null) {
    if (busy || before || pushing || mode !== "improved" || placed().has(id)) return;
    const part = partById(id);
    if (!pack().some(item => item.id === id)) return;
    busy = true; const token = ++epoch;
    const dest = destination(part);
    const source = host.querySelector(`[data-part="${id}"] svg`).getBoundingClientRect();
    const start = from || { x:source.x + source.width/2 - dest.width/2, y:source.y + source.height/2 - dest.height/2 };
    const ghost = floating || makeFloating(part,dest);
    ghost.style.transform = `translate(${start.x}px,${start.y}px)`;
    host.querySelector("#ready-status")?.replaceChildren(document.createTextNode("對準接點…"));
    sound.unlock();
    if (!reducedMotion()) {
      motion = ghost.animate([
        { transform:`translate(${start.x}px,${start.y}px)`, opacity:1 },
        { transform:`translate(${dest.x}px,${dest.y - 13}px)`, opacity:1, offset:.75 },
        { transform:`translate(${dest.x}px,${dest.y}px)`, opacity:1 },
      ], { duration:from ? 240 : 520, easing:"cubic-bezier(.2,.65,.3,1)",fill:"forwards" });
      try { await motion.finished; } catch { return; }
    }
    if (token !== epoch) return;
    await trial().placePart({ packIndex:trial().packIndex, partId:id });
    floating?.remove(); floating = null; motion = null; busy = false; selected = null;
    sound.place(); renderImproved();
    announce(`${part.name}已接好。${doneCount() === 3 ? preset().done : `本包還有 ${3 - doneCount()} 組。`}`);
    const next = host.querySelector('.part-button:not(:disabled)') || host.querySelector('[data-action="before"]');
    next?.focus({preventScroll:true});
  }
  function updateOffset(value) {
    offset = Math.max(-45, Math.min(45, value));
    host.querySelector("#movable-train")?.setAttribute("transform",`translate(${offset} ${-offset*.257})`);
    const slider = host.querySelector("#push-position");
    if (slider) slider.value = String(Math.round(offset));
  }
  function changeView() {
    cancelInteraction(); selected = null; before = false; pushing = false; offset = 0; paused = false;
    announce("");
    baseline?.destroy(); baseline = null;
    host.hidden = mode !== "improved"; currentHost.hidden = mode !== "current";
    for (const button of document.querySelectorAll("[data-mode]")) button.setAttribute("aria-pressed", String(button.dataset.mode === mode));
    for (const button of document.querySelectorAll("[data-preset]")) button.setAttribute("aria-pressed", String(button.dataset.preset === presetId));
    document.getElementById("comparison-note").textContent = `起點 ${preset().start} / 42 組，各試三組零件。切換版本保留各自進度；「兩版重試」會一起回到起點。`;
    if (mode === "current") baseline = window.KidsBrickWorkshop.mount(currentHost, { collection:pair().current, preview:true,
      onClose() { baseline.destroy(); baseline = null; currentHost.innerHTML = '<div class="pause-card"><h2>現況版試拼已暫停</h2><p>本頁進度仍保留。</p><button class="primary" id="resume-current">回到現況工作台</button></div>'; document.getElementById("resume-current").addEventListener("click",changeView); } });
    else renderImproved();
  }

  host.addEventListener("click", event => {
    if (Date.now() < suppressClickUntil) return;
    const part = event.target.closest("[data-part]");
    if (part) { selectPart(part.dataset.part); return; }
    if (event.target.closest("[data-place-target]")) { if (selected) install(selected); return; }
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) return;
    if (action === "retry") { loadAssets(); return; }
    if (action === "sound") { audioEnabled = !audioEnabled; sound.setEnabled(audioEnabled); if (audioEnabled) sound.unlock(); const button=event.target.closest("button");button.innerHTML=icon(audioEnabled ? "sound" : "muted");button.setAttribute("aria-label",audioEnabled ? "音效開" : "音效關");button.setAttribute("aria-pressed",String(audioEnabled));return; }
    if (action === "place") { if (selected) install(selected); return; }
    if (action === "push-left" || action === "push-right") { updateOffset(offset + (action === "push-left" ? -20 : 20)); return; }
    cancelInteraction(); selected = null;
    if (action === "pause") { paused = true; pushing = false; offset = 0; }
    if (action === "resume") paused = false;
    if (action === "before") { before = !before; pushing = false; offset = 0; }
    if (action === "push") { pushing = !pushing; offset = 0; }
    renderImproved();
    const focusAction = paused ? "resume" : action === "resume" ? "pause" : action;
    host.querySelector(`[data-action="${focusAction}"]`)?.focus({preventScroll:true});
  });
  host.addEventListener("keydown", event => {
    if (event.key === "Escape") { cancelInteraction(); selected = null; renderImproved(); host.querySelector('.part-button:not(:disabled)')?.focus({preventScroll:true}); }
    if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-place-target]")) { event.preventDefault(); if (selected) install(selected); }
  });
  host.addEventListener("input", event => { if (event.target.id === "push-position") updateOffset(Number(event.target.value)); });
  host.addEventListener("pointerdown", event => {
    if (event.button !== 0 || !event.isPrimary || busy || drag) return;
    if (pushing && event.target.closest("#lab-scene")) {
      drag = { kind:"push", pointerId:event.pointerId, startX:event.clientX, offset, scale:host.querySelector("#lab-scene").getScreenCTM().a };
      host.setPointerCapture(event.pointerId); return;
    }
    const button = event.target.closest("[data-part]");
    if (!button || button.disabled) return;
    const id = button.dataset.part; selectPart(id);
    drag = { kind:"part", pointerId:event.pointerId, id, startX:event.clientX, startY:event.clientY, moved:false };
    host.setPointerCapture(event.pointerId); sound.unlock();
  });
  host.addEventListener("pointermove", event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (drag.kind === "push") { event.preventDefault(); updateOffset(drag.offset + (event.clientX - drag.startX) / drag.scale); return; }
    if (!drag.moved && Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY) < 8) return;
    event.preventDefault(); drag.moved = true;
    const dest = destination(partById(drag.id));
    const near = event.clientX >= dest.x-24 && event.clientX <= dest.x+dest.width+24 && event.clientY >= dest.y-24 && event.clientY <= dest.y+dest.height+24;
    const point = near ? {x:dest.x,y:dest.y-13} : {x:event.clientX-dest.width/2,y:event.clientY-dest.height/2};
    const ghost = floating || makeFloating(partById(drag.id),dest);
    ghost.style.transform = `translate(${point.x}px,${point.y}px)`;
    drag.near = near; drag.position = point;
    host.querySelector(".join-guide")?.classList.toggle("is-near",near);
    host.querySelector("#ready-status").textContent = near ? "對準了，放開就接上。" : "移到亮起的接點；放在空白處會取消。";
  });
  host.addEventListener("pointerup", event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const released = drag; drag = null;
    if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId);
    if (released.kind === "push") { suppressClickUntil = Date.now()+400; return; }
    if (!released.moved) return;
    suppressClickUntil = Date.now()+400;
    if (released.near) install(released.id,released.position);
    else { floating?.remove(); floating=null;selected=null;renderImproved();announce("零件已放回，還沒接上。"); }
  });
  function cancelPointer(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    cancelInteraction(); selected = null; renderImproved();
  }
  host.addEventListener("pointercancel",cancelPointer);
  host.addEventListener("lostpointercapture",cancelPointer);
  for (const button of document.querySelectorAll("[data-mode]")) button.addEventListener("click",() => { mode = button.dataset.mode; changeView(); });
  for (const button of document.querySelectorAll("[data-preset]")) button.addEventListener("click",() => { presetId=button.dataset.preset; changeView(); });
  document.getElementById("reset-trials").addEventListener("click",() => { trials.delete(presetId); changeView(); announce("兩個版本都回到這一包的起點。"); });

  async function loadAssets() {
    const attempt = ++imageAttempt; assetsReady=false;assetError=false;
    if (mode === "improved") renderImproved();
    const sources = new Set(parts.flatMap(part => [part.svg,...(part.variants || []).map(variant=>variant.svg)]).flatMap(svg => [...svg.matchAll(/href="([^"]+)"/g)].map(match=>match[1].replace(/&amp;/g,"&"))));
    try {
      await Promise.all([...sources].map(src => new Promise((resolve,reject) => {
        const image = new Image();
        const timer = setTimeout(() => {image.onload=null;image.onerror=null;reject(new Error("image timeout"));},15000);
        image.onload=() => {clearTimeout(timer);resolve();}; image.onerror=() => {clearTimeout(timer);reject(new Error("image failed"));}; image.src=src;
      })));
      if (attempt !== imageAttempt) return;
      assetsReady=true;
    } catch { if (attempt !== imageAttempt) return; assetError=true; }
    if (mode === "improved") renderImproved();
  }
  window.addEventListener("resize",() => {if(drag || busy) {cancelInteraction();selected=null;if(mode==="improved")renderImproved();}});
  window.addEventListener("pagehide",() => {cancelInteraction();baseline?.destroy();baseline=null;});
  window.addEventListener("pageshow",event => {if(event.persisted)changeView();});
  changeView(); loadAssets();
})();
