(() => {
  "use strict";
  const global = typeof window === "undefined" ? globalThis : window;

  // Presentation only. Grants, placed IDs and completion remain collection-owned.
  function describe(model, snapshot, heldPack = null) {
    const build = snapshot.activeBuild;
    const placed = new Set(build?.placed || []);
    const assigned = (snapshot.grants || []).filter(grant => grant.buildId === build?.id && Number.isInteger(grant.packIndex) && model.steps[grant.packIndex]);
    const nextGrant = assigned.sort((a, b) => a.packIndex - b.packIndex)
      .find(grant => model.steps[grant.packIndex].parts.some(part => !placed.has(part.id)));
    const grant = assigned.find(grant => grant.packIndex === heldPack) || nextGrant;
    const packIndex = grant?.packIndex ?? null;
    const pack = model.steps[packIndex]?.parts || [];
    const packIds = new Set(pack.map(part => part.id));
    return { placed, packIndex, grant, nextGrant, pack, packDone: pack.length > 0 && pack.every(part => placed.has(part.id)), remaining: pack.filter(part => !placed.has(part.id)),
      before: new Set([...placed].filter(id => !packIds.has(id))) };
  }
  const esc = text => String(text ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[ch]);
  const paths = {
    check: '<path d="m5 12 4 4L19 6"/>', arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    left: '<path d="M20 12H4m6-6-6 6 6 6"/>', down: '<path d="M12 3v16m-6-6 6 6 6-6"/>',
    pause: '<path d="M8 5v14M16 5v14"/>', play: '<path d="m8 4 12 8-12 8Z"/>',
    history: '<path d="M4 9a8 8 0 1 1 0 7M4 3v6h6m2-2v6l4 2"/>',
    bag: '<path d="M5 7h14l2 14H3ZM9 7V3h6v4"/>',
    sound: '<path d="M3 9h4l5-5v16l-5-5H3Zm13-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16"/>',
    muted: '<path d="M3 9h4l5-5v16l-5-5H3Zm13 0 6 6m0-6-6 6"/>',
    hand: '<path d="M9 12V4a2 2 0 0 1 4 0v7-3a2 2 0 0 1 4 0v3-1a2 2 0 0 1 4 0v5c0 4-3 7-7 7h-1c-3 0-4-2-6-4l-3-4a2 2 0 0 1 3-3l2 2"/>',
    block: '<path d="M3 9h18v12H3Zm4 0V4h4v5m2 0V4h4v5"/>',
    shelf: '<path d="M3 3v18m18-18v18M3 12h18M3 21h18M6 5h5v7m3-5h4v5"/>',
  };
  const icon = name => `<svg class="e500-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  const artwork = (part, ids) => {
    const mask = (part.occlusionPeers || []).reduce((sum, id, index) => sum | (ids.has(id) ? 1 << index : 0), 0);
    return part.variants?.find(variant => variant.mask === mask)?.svg || part.svg;
  };

  function mount(host, { model, collection, sound, audioEnabled = true, onSound, onClose, onShelf, onFinalPlacement } = {}) {
    const parts = model.steps.flatMap(step => step.parts).sort((a, b) => a.z - b.z);
    const byId = id => parts.find(part => part.id === id);
    const buildId = collection.snapshot().activeBuild.id;
    const name = model.id === "ct273" ? "CT273" : "E500";
    const ct = model.id === "ct273" ? global.KidsCT273Mechanism?.create() : null;
    let snapshot = collection.snapshot(), heldPack = null, selected = null;
    let paused = false, before = false, pushing = false, offset = 0;
    let disposed = false, busy = false, localError = "", ready = false, assetError = false;
    let drag = null, floating = null, motion = null, epoch = 0, suppressClickUntil = 0, assetAttempt = 0;
    let pointerTap = null, renderPending = false;
    const imageTimers = new Set(), listeners = [];
    const view = () => describe(model, snapshot, heldPack);
    let mechanismView = !!ct && view().packIndex === 2;
    const displayPart = part => mechanismView && ct?.part(part.id) ? { ...part, ...ct.part(part.id) } : part;
    const reduced = () => global.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const listen = (target, name, handler) => { target?.addEventListener?.(name, handler); listeners.push(() => target?.removeEventListener?.(name, handler)); };
    const picture = (part, ids = view().placed) => {
      part = displayPart(part);
      const b = part.box;
      return `<svg class="part-art" viewBox="${b.x} ${b.y} ${b.width} ${b.height}" aria-hidden="true">${artwork(part, ids)}</svg>`;
    };
    const pieces = (ids, rail = null, initial = ids) => parts.filter(part => ids.has(part.id) && (rail === null || (part.z < 3) === rail)).map(part =>
      `<g class="placed-part${!initial.has(part.id) ? " placed-new" : ""}" data-placed="${part.id}">${artwork(part, ids)}</g>`).join("");
    const miniature = (ids, label) => `<svg viewBox="45 80 720 420" role="img" aria-label="${esc(label)}">${pieces(ids)}</svg>`;
    const pushGraphic = () => `<span class="push-gesture" role="img" aria-label="按住模型，左右拖動">${icon("left")}${icon("hand")}${icon("arrow")}</span>`;
    const button = (action, content, label, extra = "") => `<button type="button" data-e500-action="${action}" aria-label="${esc(label)}" ${extra}>${content}</button>`;
    const canPush = ids => model.steps.slice(0, 4).every(step => step.parts.every(part => ids.has(part.id)));
    function instructions(part) {
      if (!part) return `<span class="pack-done" role="img" aria-label="這包接好了">${icon("check")}${icon("check")}${icon("check")}</span>`;
      return `<div class="picture-instructions" role="img" aria-label="1 選零件；2 拖到虛線接點，或點一下接點；3 接好">
        <div class="picture-step"><b>1</b>${picture(part)}<span class="gesture">${icon("hand")}</span></div>${icon("arrow")}
        <div class="picture-step target-step"><b>2</b>${picture(part)}<span class="gesture">${icon("down")}</span></div>${icon("arrow")}
        <div class="picture-step"><b>3</b>${picture(part)}<span class="gesture success">${icon("check")}</span></div></div>`;
    }
    function guide(part) {
      if (!part) return "";
      part = displayPart(part);
      const b = part.box, x = b.x + b.width/2, y = b.y + b.height/2;
      return `<g class="join-guide"><g class="ghost-part">${artwork(part, view().placed)}</g>
        <rect class="destination" x="${b.x-7}" y="${b.y-7}" width="${b.width+14}" height="${b.height+14}" rx="9"/>
        <circle class="contact-ring" cx="${x}" cy="${y}" r="18"/><circle class="contact-dot" cx="${x}" cy="${y}" r="5"/>
        <path class="join-arrow" d="M${x} ${y-60}v30m-9-9 9 9 9-9"/></g>
        <rect data-e500-action="place" tabindex="0" role="button" aria-label="接上：${esc(part.name)}" x="${b.x-15}" y="${b.y-15}" width="${Math.max(44,b.width+30)}" height="${Math.max(44,b.height+30)}" fill="transparent"/>`;
    }
    function syncStatus() {
      const sync = snapshot.sync || {};
      const text = localError || (sync.status === "offline" ? "已存本機，待連線" : sync.status === "error" ? "同步待重試" : sync.pending || sync.status === "saving" ? "保存中" : "已保存");
      return `<div class="e500-save" role="status">${icon(localError || ["offline","error"].includes(sync.status) ? "history" : "check")}<span>${esc(text)}</span>${["offline","error"].includes(sync.status) ? button("flush", "重試", "重試同步") : ""}</div>`;
    }
    function paint(html) {
      const focused = document.activeElement?.closest?.("[data-e500-action], [data-ct-wheel], [data-ct-angle]");
      const action = focused && host.contains?.(focused) ? focused.dataset.e500Action : null;
      const part = focused?.dataset.part;
      const ctFocus = focused && host.contains?.(focused) ? focused.hasAttribute?.("data-ct-angle") ? "[data-ct-angle]" : focused.dataset.ctWheel !== undefined ? `[data-ct-wheel="${focused.dataset.ctWheel}"]` : null : null;
      host.innerHTML = html;
      if (ctFocus) host.querySelector(ctFocus)?.focus?.({preventScroll:true});
      if (action) {
        const target = host.querySelector(`[data-e500-action="${action}"]${part ? `[data-part="${part}"]` : ""}:not(:disabled)`)
          || host.querySelector('.part-button:not(:disabled)') || host.querySelector('[data-e500-action="next"]');
        target?.focus?.({preventScroll:true});
      }
    }
    function render(force = false) {
      if (disposed) return;
      if (!force && (busy || drag || pointerTap !== null)) { renderPending = true; return; }
      renderPending = false;
      const v = view(), ids = v.placed, shown = before ? v.before : ids;
      ct?.sync(ids);
      const chapters = ct ? [["輪組與底盤","p3-2",0,4],["鍋爐與車頭","p5-2",4,7],["駕駛室","p8-3",7,8],["煤水車","p10-2",8,10],["連桿與收尾","p12-1",10,14]] : [["底盤","p4-2",0,5],["橘色車身","p7-2",5,7],["駕駛室","p8-3",7,9],["車頂設備","p12-1",9,12],["車頭收尾","p14-2",12,14]];
      const completedChapters = chapters.map(([, , from, to]) => model.steps.slice(from,to).every(step => step.parts.every(part => shown.has(part.id))));
      const activeChapter = completedChapters.indexOf(false);
      const top = `<div class="workshop-top"><div class="model-heading"><h2>${name}</h2><span class="model-count" aria-label="${shown.size} / 42 組已裝好">${shown.size}<small> / 42</small></span></div><div class="tool-actions">${button("sound",icon(audioEnabled ? "sound":"muted"),audioEnabled ? "關閉拼裝音效":"開啟拼裝音效",`aria-pressed="${audioEnabled}"`)}${button("shelf",icon("shelf"),"收藏室")}${button("pause",icon("pause")+"休息","稍後再拼")}</div></div>`;
      const shell = content => `<section class="e500-workshop" aria-label="${name} 拼裝工作台">${top}${content}${syncStatus()}</section>`;
      if (!ready) { paint(shell(`<div class="asset-notice" role="status"><h3>${assetError ? "圖片暫時沒載好" : "準備中…"}</h3>${assetError ? button("retry","重新載入","重新載入圖片") : ""}</div>`)); return; }
      if (paused) { paint(shell(`<div class="pause-card">${miniature(ids,`留在工作台的 ${name} 半成品`)}<div>${button("resume",icon("play")+"繼續","回工作台接著拼",'class="primary"')}${button("close",icon("left")+"首頁","回首頁")}</div></div>`)); return; }
      const hasNext = v.packDone && v.nextGrant;
      const unassigned = snapshot.grants?.some(grant => grant.buildId == null);
      const viewBox = mechanismView ? "0 75 900 295" : shown.size < 15 && !v.pack?.some(part => part.box.y < 220) ? "65 220 680 270" : "65 80 680 410";
      paint(shell(`<ol class="chapters" aria-label="整台建造階段">${chapters.map(([name,id],i) => `<li class="${completedChapters[i] ? "done" : i === activeChapter ? "active":""}" aria-label="${i+1} ${name}${completedChapters[i] ? "已完成": i === activeChapter ? "組裝中":"尚未完成"}" ${i === activeChapter ? 'aria-current="step"':""}><span class="chapter-number">${completedChapters[i] ? icon("check"):i+1}</span>${picture(byId(id))}</li>`).join("")}</ol>
        <div class="bench-grid"><div class="model-area">${before ? `<div class="scene-note">${icon("history")}回看</div>`:""}
          <svg class="scene${pushing ? " is-pushing":""}${mechanismView ? " ct-mechanism-scene":""}" data-e500-scene viewBox="${viewBox}" role="group" aria-label="${name} ${mechanismView ? "輪組側面特寫，" : ""}${before ? "本包開始前":"施工模型"}">
            ${mechanismView ? ct.scene(shown, { disabled:before || !!selected }) : `<path class="ground-line" d="M65 445L745 270 M65 470L745 295"/>${pieces(shown,true)}
            <g data-movable-train transform="translate(${offset} ${-offset*.257})">${pieces(shown,false,v.packDone && !before ? v.before : shown)}</g>`}
            <g data-placement-guide>${!before && !pushing && selected ? guide(byId(selected)):""}</g>
          </svg><div class="scene-caption"><div data-picture-guide>${mechanismView && !selected && ct.hasWheel(shown) ? ct.gesture() : pushing ? pushGraphic():instructions(byId(selected) || v.remaining[0])}</div></div>
        </div><aside class="tray" aria-label="本包零件">
          ${v.packIndex !== null ? `<div class="pack-heading"><span aria-label="第 ${v.packIndex+1} 包，共 14 包">${icon("bag")}${v.packIndex+1} / 14</span><span class="pack-dots" role="img" aria-label="本包 ${3-v.remaining.length} / 3 組已接好">${v.pack.map(part => `<i class="${ids.has(part.id)?"done":""}">${ids.has(part.id)?icon("check"):""}</i>`).join("")}</span></div>
            <div class="part-list">${v.pack.map(part => button("part",picture(part,ids)+`<span class="part-state">${icon(ids.has(part.id)?"check":"hand")}</span>`,part.name+(ids.has(part.id)?"，已接好":""),`class="part-button" data-part="${part.id}" aria-pressed="${selected === part.id}" ${ids.has(part.id)||before||pushing?"disabled":""}`)).join("")}</div>
            ${v.packDone ? `<div class="round-end">${button("before",miniature(before?ids:v.before,before?"本包完成後":"本包開始前")+`<span>${icon(before?"arrow":"history")}${before?"現在":"回看"}</span>`,before?"回到現在":"看看本包開始前",`class="compare-button" aria-pressed="${before}"`)}</div>` : button("place",icon("down")+"接上","接上選好的零件",`class="primary place-button" ${!selected||before||pushing?"disabled":""}`)}` : ""}
          ${hasNext ? button("next",`<span>下一包 ${icon("arrow")}</span><span>${model.steps[v.nextGrant.packIndex].parts.map(part=>picture(part)).join("")}</span>`,"打開下一包",'class="next-pack"') : !v.remaining.length ? unassigned ? button("allocate",icon("bag")+"開一包","打開下一包",'class="primary next-pack"') : `<div class="rest-mark">${icon("pause")}<span>下次繼續</span>${button("close",icon("left")+"首頁","回首頁")}</div>` : ""}
        </aside></div>
        ${ct && (v.packIndex === 2 || ct.hasWheel(ids)) ? `<div class="ct-tools">${button("mechanism",mechanismView ? miniature(ids,"查看全車半成品")+"全車" : ct.gesture()+"輪組", mechanismView ? "查看全車半成品" : "查看輪組並試轉",`aria-pressed="${mechanismView}" ${before ? "disabled":""}`)}${mechanismView ? ct.controls(shown,{disabled:before || !!selected}):""}</div>`:""}
        ${!ct && canPush(ids) ? `<div class="milestone">${button("push",(pushing?icon("block"):pushGraphic())+`<span>${pushing?"組裝":"試推"}</span>`,pushing?"回到組裝":"試推看看",`class="push-button" aria-pressed="${pushing}" ${before?"disabled":""}`)}${pushing?`<div class="push-controls">${button("push-left",icon("left"),"往左推")}<input data-push-position type="range" aria-label="車的位置" min="-45" max="45" value="${offset}" step="1">${button("push-right",icon("arrow"),"往右推")}</div>`:""}</div>`:""}`));
    }
    function selectPart(id) {
      const v = view();
      if (!ready || busy || paused || before || pushing || !v.remaining.some(part => part.id === id)) return;
      selected = id;
      if (ct) {
        const side = ct.isPart(id);
        if (id === "p12-1") ct.align();
        mechanismView = side; render(true);
      }
      // Keep the captured touch node alive while choosing a piece.
      for (const button of host.querySelectorAll('[data-e500-action="part"]')) button.setAttribute("aria-pressed",String(button.dataset.part === id));
      host.querySelector("[data-placement-guide]").innerHTML = guide(byId(id));
      host.querySelector("[data-picture-guide]").innerHTML = instructions(byId(id));
      const install = host.querySelector('button[data-e500-action="place"]');
      if (install) install.disabled = false;
    }
    function destination(part) {
      const matrix = host.querySelector("[data-e500-scene]")?.getScreenCTM?.();
      if (!matrix || !global.DOMPoint) return null;
      const b = displayPart(part).box, a = new global.DOMPoint(b.x,b.y).matrixTransform(matrix), z = new global.DOMPoint(b.x+b.width,b.y+b.height).matrixTransform(matrix);
      return { x:a.x,y:a.y,width:z.x-a.x,height:z.y-a.y };
    }
    function makeFloating(part, dest) {
      const node = document.createElement("div");
      node.className = "e500-flying-part"; node.setAttribute("aria-hidden","true");
      node.style.width = dest.width+"px"; node.style.height = dest.height+"px";
      node.innerHTML = picture(part); document.body.append(node); floating = node; return node;
    }
    function cancelInteraction() {
      epoch++;
      pointerTap = null;
      const old = drag; drag = null;
      if (old && host.hasPointerCapture?.(old.pointerId)) host.releasePointerCapture(old.pointerId);
      motion?.cancel(); motion = null; floating?.remove(); floating = null; busy = false;
    }
    async function install(id, from = null) {
      const v = view();
      if (disposed || busy) return;
      if (!ready || paused || before || pushing || snapshot.activeBuild?.id !== buildId || !v.remaining.some(part => part.id === id)) {
        cancelInteraction(); selected = null; render(); return;
      }
      const part = byId(id), grant = v.grant, token = ++epoch;
      busy = true; localError = ""; heldPack = v.packIndex;
      const dest = destination(part);
      sound?.unlock();
      if (dest && !reduced()) {
        const source = host.querySelector(`[data-part="${id}"] .part-art`)?.getBoundingClientRect();
        const start = from || { x:source.x+source.width/2-dest.width/2, y:source.y+source.height/2-dest.height/2 };
        const ghost = floating || makeFloating(part,dest);
        if (ghost.animate) {
          motion = ghost.animate([{transform:`translate(${start.x}px,${start.y}px)`},{transform:`translate(${dest.x}px,${dest.y-13}px)`,offset:.75},{transform:`translate(${dest.x}px,${dest.y}px)`}], {duration:from?240:520,easing:"cubic-bezier(.2,.65,.3,1)",fill:"forwards"});
          try { await motion.finished; } catch { return; }
        }
      }
      if (disposed || token !== epoch) return;
      // The collection client writes the placement to its local outbox before returning.
      // Recheck fresh grants/IDs after an animation or another tab's update.
      snapshot = collection.snapshot();
      const fresh = view();
      if (snapshot.activeBuild?.id !== buildId || !fresh.remaining.some(part => part.id === id) || fresh.grant?.id !== grant.id) {
        cancelInteraction(); selected = null; render(); return;
      }
      try {
        if (fresh.placed.size === parts.length-1) onFinalPlacement?.(buildId);
        await collection.placePart({ buildId, grantId:grant.id, packIndex:grant.packIndex, partId:id });
        sound?.place();
      } catch (error) { onFinalPlacement?.(buildId, false); localError = error?.message || "沒有保存成功，請再試一次"; }
      finally {
        floating?.remove(); floating = null; motion = null; busy = false; selected = null;
        if (!disposed) {
          snapshot = collection.snapshot(); render();
          (host.querySelector('.part-button:not(:disabled)') || host.querySelector('[data-e500-action="next"]') || host.querySelector('[data-e500-action="before"]'))?.focus?.({preventScroll:true});
        }
      }
    }
    function wheelAngle(event,index) {
      const matrix=host.querySelector("[data-e500-scene]")?.getScreenCTM?.();
      if (!matrix || !global.DOMPoint) return null;
      const point=new global.DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
      return ct.pointerAngle(point,index);
    }
    function turnWheel(index,delta) {
      if (!ct || !mechanismView || before || selected || busy || paused) return;
      ct.sync(view().placed); ct.turn(index,delta); ct.update(host);
    }
    function updateOffset(value) {
      offset = Math.max(-45,Math.min(45,value));
      host.querySelector("[data-movable-train]")?.setAttribute("transform",`translate(${offset} ${-offset*.257})`);
      const slider = host.querySelector("[data-push-position]"); if (slider) slider.value = String(Math.round(offset));
    }
    async function loadAssets() {
      const attempt = ++assetAttempt; ready = false; assetError = false; render();
      const sources = new Set(parts.flatMap(part => [part.svg,...(part.variants || []).map(variant=>variant.svg)]).flatMap(svg=>[...svg.matchAll(/href="([^"]+)"/g)].map(match=>match[1])));
      try {
        await Promise.all([...sources].map(src => new Promise((resolve,reject) => {
          const image = new global.Image();
          const timer = global.setTimeout(() => finish(false),15000); imageTimers.add(timer);
          function finish(ok) { global.clearTimeout(timer); imageTimers.delete(timer); image.onload=null; image.onerror=null; ok?resolve():reject(new Error("image failed")); }
          image.onload=()=>finish(true); image.onerror=()=>finish(false); image.src=src;
        })));
        if (attempt !== assetAttempt || disposed) return; ready = true;
      } catch { if (attempt !== assetAttempt || disposed) return; assetError = true; }
      render();
    }
    listen(host,"click",event => {
      pointerTap = null;
      queueMicrotask(()=>{if(renderPending)render();});
      if (Date.now() < suppressClickUntil) return;
      const control = event.target.closest?.("[data-e500-action]");
      if (!control || control.disabled) return;
      const action = control.dataset.e500Action;
      if (busy && !motion && ["allocate","flush"].includes(action)) return;
      if (action === "part") { if (event.detail === 0) selectPart(control.dataset.part); return; }
      if (action === "place") { if (selected) void install(selected); return; }
      if (action === "ct-prev" || action === "ct-next") { turnWheel(ct.chosen, action === "ct-prev" ? -90 : 90); return; }
      if (action === "ct-detach") { if (ct && mechanismView && !before && !selected && !busy) { ct.trial(); render(); } return; }
      if (action === "sound") { audioEnabled=!audioEnabled; onSound?.(audioEnabled); render(); return; }
      if (action === "push-left" || action === "push-right") { updateOffset(offset+(action === "push-left"?-20:20)); return; }
      cancelInteraction(); selected = null;
      if (action === "mechanism") { mechanismView=!mechanismView; ct.endTrial(); pushing=false; }
      if (action === "retry") { void loadAssets(); return; }
      if (action === "close") { onClose?.(); return; }
      if (action === "shelf") { onShelf?.(); return; }
      if (action === "pause") { paused=true; pushing=false; before=false; offset=0; }
      if (action === "resume") paused=false;
      if (action === "before") { before=!before; pushing=false; offset=0; ct?.endTrial(); }
      if (action === "push") { pushing=!pushing; before=false; offset=0; }
      if (action === "next") { heldPack=null; before=false; pushing=false; offset=0; mechanismView=!!ct && view().packIndex===2; ct?.endTrial(); }
      if (action === "allocate" || action === "flush") {
        busy=true;
        Promise.resolve().then(()=>action === "allocate" ? collection.allocate():collection.flush()).catch(error=>{localError=error?.message || "請再試一次";}).finally(()=>{busy=false;snapshot=collection.snapshot();render();});
      }
      render();
      (action === "next" ? host.querySelector('.part-button:not(:disabled)') : host.querySelector(`[data-e500-action="${paused?"resume":action === "resume"?"pause":action}"]`))?.focus?.({preventScroll:true});
    });
    listen(host,"keydown",event => {
      const wheel=event.target.closest?.("[data-ct-wheel]");
      if(wheel && ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)) {
        event.preventDefault(); turnWheel(Number(wheel.dataset.ctWheel),["ArrowLeft","ArrowDown"].includes(event.key)?-15:15);return;
      }
      if (event.key === "Escape") { event.preventDefault();cancelInteraction();selected=null;render();host.querySelector('.part-button:not(:disabled)')?.focus?.({preventScroll:true}); }
      if ((event.key === "Enter" || event.key === " ") && event.target.closest?.('rect[data-e500-action="place"]')) { event.preventDefault(); if (selected) void install(selected); }
    });
    listen(host,"input",event => {
      if (event.target.matches?.("[data-push-position]")) updateOffset(Number(event.target.value));
      if (event.target.matches?.("[data-ct-angle]")) turnWheel(ct.chosen,Number(event.target.value)-ct.angle);
    });
    listen(host,"pointerdown",event => {
      if (event.button > 0 || event.isPrimary === false || busy || drag) return;
      if (event.target.closest?.("[data-e500-action], [data-ct-angle]")) pointerTap = event.pointerId;
      const wheel = event.target.closest?.("[data-ct-wheel]");
      if (wheel && mechanismView && !before && !selected) {
        const index = Number(wheel.dataset.ctWheel); ct.choose(index); ct.update(host);
        drag={kind:"ct-turn",pointerId:event.pointerId,index,last:wheelAngle(event,index)};
        host.setPointerCapture?.(event.pointerId);return;
      }
      if (pushing && event.target.closest?.("[data-e500-scene]")) {
        drag={kind:"push",pointerId:event.pointerId,startX:event.clientX,offset,scale:host.querySelector("[data-e500-scene]").getScreenCTM().a};
        host.setPointerCapture?.(event.pointerId);return;
      }
      const control=event.target.closest?.('[data-e500-action="part"]');
      if (!control || control.disabled) return;
      selectPart(control.dataset.part);
      if (selected !== control.dataset.part) return;
      drag={kind:"part",pointerId:event.pointerId,id:selected,startX:event.clientX,startY:event.clientY,moved:false};
      host.setPointerCapture?.(event.pointerId);sound?.unlock();
    });
    listen(host,"pointermove",event => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (drag.kind === "ct-turn") {
        event.preventDefault(); const angle=wheelAngle(event,drag.index);
        if (angle !== null && drag.last !== null) turnWheel(drag.index,ct.delta(drag.last,angle));
        drag.last=angle;return;
      }
      if (drag.kind === "push") {event.preventDefault();updateOffset(drag.offset+(event.clientX-drag.startX)/drag.scale);return;}
      if (!drag.moved && Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)<8) return;
      const dest=destination(byId(drag.id)); if (!dest) return;
      event.preventDefault();drag.moved=true;
      const near=event.clientX>=dest.x-24 && event.clientX<=dest.x+dest.width+24 && event.clientY>=dest.y-24 && event.clientY<=dest.y+dest.height+24;
      drag.position=near?{x:dest.x,y:dest.y-13}:{x:event.clientX-dest.width/2,y:event.clientY-dest.height/2};
      drag.near=near;
      const ghost=floating || makeFloating(byId(drag.id),dest);
      ghost.style.transform=`translate(${drag.position.x}px,${drag.position.y}px)`;
      host.querySelector(".join-guide")?.classList.toggle("is-near",near);
    });
    listen(host,"pointerup",event => {
      if (pointerTap === event.pointerId) {
        const pointerId = event.pointerId;
        (global.requestAnimationFrame || queueMicrotask)(()=>{if(pointerTap === pointerId){pointerTap=null;if(renderPending)render();}});
      }
      if (!drag || drag.pointerId !== event.pointerId) return;
      const released=drag;drag=null;
      if (host.hasPointerCapture?.(event.pointerId)) host.releasePointerCapture(event.pointerId);
      if (released.kind === "push" || released.kind === "ct-turn") {suppressClickUntil=Date.now()+400;if(renderPending)render();return;}
      if (!released.moved) return;
      suppressClickUntil=Date.now()+400;
      if (released.near) void install(released.id,released.position);
      else {cancelInteraction();selected=null;render();}
    });
    const cancelPointer=event=>{if(pointerTap === event.pointerId)pointerTap=null;if(drag && drag.pointerId === event.pointerId){cancelInteraction();selected=null;render();}else if(renderPending)render();};
    listen(host,"pointercancel",cancelPointer);
    // Normal touch capture ends before click. Keep ordinary buttons mounted until
    // click/after-paint; only an unexpected capture loss cancels an active drag.
    listen(host,"lostpointercapture",event=>{if(drag?.pointerId === event.pointerId)cancelPointer(event);});
    for (const event of ["blur","resize","pagehide"]) listen(global,event,()=>{if(drag || motion || pointerTap !== null){cancelInteraction();selected=null;render();}});
    void loadAssets();
    return {
      update(next) {snapshot=next;render();},
      destroy() {disposed=true;assetAttempt++;cancelInteraction();for(const timer of imageTimers)global.clearTimeout(timer);imageTimers.clear();for(const remove of listeners)remove();},
    };
  }
  global.KidsTrainWorkshop = Object.freeze({ describe, mount });
})();
