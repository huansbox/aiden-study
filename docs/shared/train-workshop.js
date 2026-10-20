(() => {
  "use strict";
  const global = typeof window === "undefined" ? globalThis : window;

  const packStart = build => global.KidsCollectionCore?.packStart?.(build) ?? (build?.contentVersion === 2 ? 1 : 0);
  const packCount = (build, model) => global.KidsCollectionCore?.packCount?.(build) ?? model.steps.length - packStart(build);
  const fixedParts = (build, model) => model.steps.slice(0, packStart(build)).flatMap(step => step.parts);
  const requiredParts = (build, model) => model.steps.slice(packStart(build)).flatMap(step => step.parts);
  const packNumber = (build, index) => index - packStart(build) + 1;
  const sourcesIn = svg => [...(svg || "").matchAll(/href="([^"]+)"/g)].map(match => match[1]);

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

  function mount(host, { model, collection, inspection = false, sound, audioEnabled = true, onSound, onClose, onShelf, onFinalPlacement } = {}) {
    const initialBuild = collection.snapshot().activeBuild;
    const currentSnapshot = () => {
      const next = collection.snapshot();
      return inspection ? {...next,activeBuild:initialBuild} : next;
    };
    const parts = model.steps.flatMap(step => step.parts).sort((a, b) => a.z - b.z);
    const required = requiredParts(initialBuild, model), fixed = fixedParts(initialBuild, model);
    const visibleIds = ids => new Set([...ids, ...fixed.map(part => part.id)]);
    const byId = id => parts.find(part => part.id === id);
    const buildId = initialBuild.id;
    const vehicle = global.KidsVehicleMechanism?.create(model) || null;
    const name = vehicle?.name || (model.id === "breezy-blue" ? "藍皮客車" : model.id.toUpperCase());
    const bb = model.id === "breezy-blue" ? global.KidsBreezyMechanism?.create() : null;
    const ct = model.id === "ct273" ? global.KidsCT273Mechanism?.create() : null;
    const feature = vehicle || global.KidsEmuMechanism?.create(model) || global.KidsHighspeedMechanism?.create(model) || null;
    let snapshot = currentSnapshot(), heldPack = null, selected = null;
    let paused = false, before = false, pushing = false, offset = 0;
    let disposed = false, busy = false, localError = "", ready = false, assetError = false;
    let drag = null, floating = null, motion = null, epoch = 0, suppressClickUntil = 0;
    let pointerTap = null, renderPending = false;
    const imageTimers = new Set(), listeners = [], imageLoads = new Map();
    let assetRenderQueued = false;
    const view = () => describe(model, snapshot, heldPack);
    const autoMechanism = () => !!ct && view().packIndex === 2 || !!bb && [6,7].includes(view().packIndex) || !!feature?.autoPack(view().packIndex);
    let mechanismView = inspection ? !!(ct || bb || feature) : autoMechanism();
    if(bb) {bb.sync(view().placed);bb.choose(view().remaining.find(part=>bb.isPart(part.id))?.id);}
    if(feature) {feature.sync(view().placed); feature.choose(view().remaining.find(part=>feature.isPart(part.id))?.id);}
    const mechanism = feature || ct || bb;
    const stager = feature || bb;
    const displayPart = part => mechanismView && mechanism?.part(part.id) ? { ...part, ...mechanism.part(part.id) } : part;
    const reduced = () => global.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const listen = (target, name, handler) => { target?.addEventListener?.(name, handler); listeners.push(() => target?.removeEventListener?.(name, handler)); };
    const picture = (part, ids = view().placed) => {
      part = displayPart(part);
      const b = part.box;
      return `<svg class="part-art" viewBox="${b.x} ${b.y} ${b.width} ${b.height}" aria-hidden="true">${artwork(part, ids)}</svg>`;
    };
    const pieces = (ids, rail = null, initial = ids) => {
      const visible = visibleIds(ids), original = visibleIds(initial);
      return parts.filter(part => visible.has(part.id) && (rail === null || (part.z < 3) === rail)).map(part =>
        `<g class="placed-part${!original.has(part.id) ? " placed-new" : ""}" data-placed="${part.id}">${artwork(part, visible)}</g>`).join("");
    };
    const miniature = (ids, label) => `<svg viewBox="${vehicle ? model.viewBox : "45 80 720 420"}" role="img" aria-label="${esc(label)}">${pieces(ids)}</svg>`;
    const pushGraphic = () => `<span class="push-gesture" role="img" aria-label="按住模型，左右拖動">${icon("left")}${icon("hand")}${icon("arrow")}</span>`;
    const button = (action, content, label, extra = "") => `<button type="button" data-e500-action="${action}" aria-label="${esc(label)}" ${extra}>${content}</button>`;
    const canPush = ids => model.steps.slice(packStart(initialBuild), 4).every(step => step.parts.every(part => ids.has(part.id)));
    function instructions(part) {
      if(feature && mechanismView) return feature.instructions(selected || feature.current || part?.id);
      if(bb && mechanismView) return bb.instructions(selected || bb.current);
      if (!part && view().packIndex === null) return `<span class="pack-wait">${icon("bag")}<span>${snapshot.grants?.some(grant=>grant.buildId == null) ? "打開一包就能繼續" : "零件盒是空的，等新拼裝包再繼續"}</span></span>`;
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
      const direction=stager?.arrow?.(part.id);
      const arrow = direction === "right" ? `M${x-60} ${y}h30m-9-9 9 9-9 9` : direction === 'left' ? `M${x+60} ${y}h-30m9-9-9 9 9 9` : `M${x} ${y-60}v30m-9-9 9 9 9-9`;
      return `<g class="join-guide"><g class="ghost-part">${artwork(part, view().placed)}</g>
        <rect class="destination" x="${b.x-7}" y="${b.y-7}" width="${b.width+14}" height="${b.height+14}" rx="9"/>
        <circle class="contact-ring" cx="${x}" cy="${y}" r="18"/><circle class="contact-dot" cx="${x}" cy="${y}" r="5"/>
        <path class="join-arrow" d="${arrow}"/></g>
        <rect data-e500-action="place" tabindex="0" role="button" aria-label="接上：${esc(part.name)}" x="${b.x-15}" y="${b.y-15}" width="${Math.max(44,b.width+30)}" height="${Math.max(44,b.height+30)}" fill="transparent"/>`;
    }
    function syncStatus() {
      const sync = snapshot.sync || {};
      const text = localError || (stager?.hasStaged?.() ? "接好後保存" : sync.status === "offline" ? "已存本機，待連線" : sync.status === "error" ? "同步待重試" : sync.pending || sync.status === "saving" ? "保存中" : "已保存");
      return `<div class="e500-save" role="status">${icon(localError || ["offline","error"].includes(sync.status) ? "history" : "check")}<span>${esc(text)}</span>${["offline","error"].includes(sync.status) ? button("flush", "重試", "重試同步") : ""}</div>`;
    }
    function paint(html) {
      const focused = document.activeElement?.closest?.("[data-e500-action], [data-ct-wheel], [data-ct-angle], [data-bb-operate], [data-bb-range], [data-train-action], [data-train-range], [data-train-operate]");
      const action = focused && host.contains?.(focused) ? focused.dataset.e500Action : null;
      const part = focused?.dataset.part;
      const kind = focused?.dataset.kind;
      const bbFocus = focused && host.contains?.(focused) ? focused.dataset.bbRange ? `[data-bb-range="${focused.dataset.bbRange}"]` : focused.dataset.bbOperate ? `[data-bb-operate="${focused.dataset.bbOperate}"]` : null : null;
      const ctFocus = focused && host.contains?.(focused) ? focused.hasAttribute?.("data-ct-angle") ? "[data-ct-angle]" : focused.dataset.ctWheel !== undefined ? `[data-ct-wheel="${focused.dataset.ctWheel}"]` : null : null;
      const featureFocus = focused && host.contains?.(focused) ? focused.dataset.trainRange ? `[data-train-range="${focused.dataset.trainRange}"]` : focused.dataset.trainOperate ? `[data-train-operate="${focused.dataset.trainOperate}"]` : focused.dataset.trainAction ? `[data-train-action="${focused.dataset.trainAction}"]${part ? `[data-part="${part}"]` : ''}${kind ? `[data-kind="${kind}"]` : ''}` : null : null;
      host.innerHTML = html;
      if (bbFocus) host.querySelector(bbFocus)?.focus?.({preventScroll:true});
      if (ctFocus) host.querySelector(ctFocus)?.focus?.({preventScroll:true});
      if (featureFocus) host.querySelector(featureFocus)?.focus?.({preventScroll:true});
      if (action) {
        const target = host.querySelector(`[data-e500-action="${action}"]${part ? `[data-part="${part}"]` : ""}${kind ? `[data-kind="${kind}"]` : ""}:not(:disabled)`)
          || host.querySelector('.part-button:not(:disabled)') || host.querySelector('[data-e500-action="next"]');
        target?.focus?.({preventScroll:true});
      }
    }
    function render(force = false) {
      if (disposed) return;
      if (!force && (busy || drag || pointerTap !== null)) { renderPending = true; return; }
      renderPending = false;
      const v = view(), ids = v.placed, shown = before ? v.before : ids;
      ct?.sync(ids); bb?.sync(ids); feature?.sync(ids);
      ensureAssets(v);
      const chapters = bb ? [["輪組與底盤","p4-2",0,5],["藍色車身","p6-2",5,6],["窗戶與車門","p7-2",6,8],["車頂","p9-2",8,10],["端面收尾","p12-3",10,12]] : ct ? [["輪組與底盤","p3-2",0,4],["鍋爐與車頭","p5-2",4,7],["駕駛室","p8-3",7,8],["煤水車","p10-2",8,10],["連桿與收尾","p12-1",10,14]] : [["底盤","p4-2",0,5],["橘色車身","p7-2",5,7],["駕駛室","p8-3",7,9],["車頂設備","p12-1",9,12],["車頭收尾","p14-2",12,14]];
      if(feature?.chapters) chapters.splice(0,chapters.length,...feature.chapters);
      else if(feature) chapters.splice(0,chapters.length,...(model.id === 'emu900' ? [["輪組與底盤","p4-2",0,4],["銀色車身","p5-2",4,5],["微笑車頭","p6-2",5,7],["雙扇車門","p8-1",7,8],["車頂與收尾","p12-1",8,12]] : [["輪組與底盤","p4-2",0,5],["車身","p6-2",5,6],["車頭模組","p7-2",6,7],["車窗與車頂","p10-2",7,11],["接合收尾","p12-1",11,12]]));
      const completedChapters = chapters.map(([, , from, to]) => model.steps.slice(Math.max(from, packStart(initialBuild)),to).every(step => step.parts.every(part => shown.has(part.id))));
      const activeChapter = completedChapters.indexOf(false);
      const top = `<div class="workshop-top"><div class="model-heading"><h2>${name}</h2><span class="model-count" aria-label="${shown.size} / ${required.length} 組已裝好">${shown.size}<small> / ${required.length}</small></span></div><div class="tool-actions">${button("sound",icon(audioEnabled ? "sound":"muted"),audioEnabled ? "關閉拼裝音效":"開啟拼裝音效",`aria-pressed="${audioEnabled}"`)}${inspection ? button('close',icon('left')+'回到作品','回到作品') : button("shelf",icon("shelf"),"收藏室")+button("pause",icon("pause")+"休息","稍後再拼")}</div></div>`;
      const shell = content => `<section class="e500-workshop" aria-label="${name} ${inspection ? '完成作品零件觀察' : '拼裝工作台'}">${top}${content}${inspection ? '<div class="e500-save">已完成的作品</div>' : syncStatus()}</section>`;
      if (!ready) { paint(shell(`<div class="asset-notice" role="status"><h3>${assetError ? "圖片暫時沒載好" : "準備中…"}</h3>${assetError ? button("retry","重新載入","重新載入圖片") : ""}</div>`)); return; }
      if(inspection) {
        const box=mechanismView ? feature?.viewBox || (bb?'30 40 840 405':'0 75 900 295') : vehicle ? model.viewBox : '65 80 680 410';
        const controls=`<div class="ct-tools${vehicle ? ' vehicle-inline-tools' : ''}" ${vehicle ? 'data-vehicle-inline-controls' : ''}>${button('mechanism',mechanismView ? miniature(ids,'查看完整作品')+'全貌' : mechanism.gesture()+'特寫',mechanismView ? '查看完整作品' : '查看零件特寫',`aria-pressed="${mechanismView}"`)}${mechanismView ? mechanism.controls(ids,{disabled:false}) : ''}</div>`;
        paint(shell(`<div class="model-area${vehicle ? ' vehicle-model-area' : ''}">${vehicle ? controls : ''}<svg class="scene${mechanismView ? ' train-feature-scene' : ''}" data-e500-scene viewBox="${box}" role="group" aria-label="${name} ${mechanismView ? feature?.label || '零件特寫' : '完成作品'}">${mechanismView ? mechanism.scene(ids,{disabled:false,before:false}) : pieces(ids)}</svg><div class="scene-caption">${mechanism.gesture()}</div></div>${vehicle ? '' : controls}`));
        return;
      }
      if (paused) { paint(shell(`<div class="pause-card">${miniature(ids,`留在工作台的 ${name} 半成品`)}<div>${button("resume",icon("play")+"繼續","回工作台接著拼",'class="primary"')}${button("close",icon("left")+"首頁","回首頁")}</div></div>`)); return; }
      const hasNext = v.packDone && v.nextGrant;
      const unassigned = snapshot.grants?.some(grant => grant.buildId == null);
      const viewBox = mechanismView ? feature ? feature.viewBox : bb ? "30 40 840 405" : "0 75 900 295" : vehicle ? model.viewBox : shown.size < 15 && !v.pack?.some(part => part.box.y < 220) ? "65 220 680 270" : "65 80 680 410";
      const featureToolbar = feature && (feature.autoPack(v.packIndex) || feature.hasPart(ids)) ? `<div class="ct-tools${vehicle ? ' vehicle-inline-tools' : ''}" ${vehicle ? 'data-vehicle-inline-controls' : ''}>${button("mechanism",mechanismView ? miniature(ids,"查看完整半成品")+"全貌" : feature.gesture()+"特寫",mechanismView ? "查看完整半成品" : "查看"+feature.label,`aria-pressed="${mechanismView}" ${before?'disabled':''}`)}${mechanismView ? feature.controls(shown,{disabled:before || !!selected}) : ''}</div>` : '';
      paint(shell(`<ol class="chapters${vehicle ? " vehicle-chapters" : ""}" aria-label="整台建造階段">${chapters.map(([name,id],i) => `<li class="${completedChapters[i] ? "done" : i === activeChapter ? "active":""}" aria-label="${i+1} ${name}${completedChapters[i] ? "已完成": i === activeChapter ? "組裝中":"尚未完成"}" ${i === activeChapter ? 'aria-current="step"':""}><span class="chapter-number">${completedChapters[i] ? icon("check"):i+1}</span>${picture(byId(id))}</li>`).join("")}</ol>
        <div class="bench-grid"><div class="model-area${vehicle ? ' vehicle-model-area' : ''}">${vehicle ? featureToolbar : ''}${before ? `<div class="scene-note">${icon("history")}回看</div>`:""}
          <svg class="scene${pushing ? " is-pushing":""}${mechanismView ? feature ? " train-feature-scene" : bb ? " bb-scene" : " ct-mechanism-scene":""}" data-e500-scene viewBox="${viewBox}" role="group" aria-label="${name} ${mechanismView ? feature ? feature.label+'，' : bb ? "門窗特寫，" : "輪組側面特寫，" : ""}${before ? "本包開始前":"施工模型"}">
            ${mechanismView ? mechanism.scene(shown, { disabled:before || !!selected, before }) : `${vehicle ? "" : '<path class="ground-line" d="M65 445L745 270 M65 470L745 295"/>'}${pieces(shown,true)}
            <g data-movable-train transform="translate(${offset} ${-offset*.257})">${pieces(shown,false,v.packDone && !before ? v.before : shown)}</g>`}
            <g data-placement-guide>${!before && !pushing && selected ? guide(byId(selected)):""}</g>
          </svg><div class="scene-caption"><div data-picture-guide>${mechanismView && !selected && ct?.hasWheel(shown) ? ct.gesture() : pushing ? pushGraphic():instructions(byId(selected) || v.remaining[0])}</div></div>
        </div><aside class="tray" aria-label="本包零件">
          ${v.packIndex !== null ? `<div class="pack-heading"><span aria-label="第 ${packNumber(initialBuild,v.packIndex)} 包，共 ${packCount(initialBuild,model)} 包">${icon("bag")}${packNumber(initialBuild,v.packIndex)} / ${packCount(initialBuild,model)}</span><span class="pack-dots" role="img" aria-label="本包 ${3-v.remaining.length} / 3 組已接好">${v.pack.map(part => `<i class="${ids.has(part.id)?"done":""}">${ids.has(part.id)?icon("check"):""}</i>`).join("")}</span></div>
            <div class="part-list">${v.pack.map(part => button("part",picture(part,ids)+`<span class="part-state">${icon(ids.has(part.id)?"check":"hand")}</span>`,part.name+(ids.has(part.id)?"，已接好":""),`class="part-button" data-part="${part.id}" aria-pressed="${selected === part.id}" ${ids.has(part.id)||before||pushing?"disabled":""}`)).join("")}</div>
            ${v.packDone ? `<div class="round-end">${button("before",miniature(before?ids:v.before,before?"本包完成後":"本包開始前")+`<span>${icon(before?"arrow":"history")}${before?"現在":"回看"}</span>`,before?"回到現在":"看看本包開始前",`class="compare-button" aria-pressed="${before}"`)}</div>` : button("place",icon(stager?.arrow?.(selected)==="right"?"arrow":stager?.arrow?.(selected)==='left'?'left':"down")+"接上","接上選好的零件",`class="primary place-button" ${!selected||before||pushing?"disabled":""}`)}` : ""}
          ${hasNext ? button("next",`<span>下一包 ${icon("arrow")}</span><span>${model.steps[v.nextGrant.packIndex].parts.map(part=>picture(part)).join("")}</span>`,"打開下一包",'class="next-pack"') : !v.remaining.length ? unassigned ? button("allocate",icon("bag")+"開一包","打開下一包",'class="primary next-pack"') : `<div class="rest-mark">${icon("pause")}<span>等新拼裝包再繼續</span>${button("close",icon("left")+"首頁","回首頁")}</div>` : ""}
        </aside></div>
        ${ct && (v.packIndex === 2 || ct.hasWheel(ids)) ? `<div class="ct-tools">${button("mechanism",mechanismView ? miniature(ids,"查看全車半成品")+"全車" : ct.gesture()+"輪組", mechanismView ? "查看全車半成品" : "查看輪組並試轉",`aria-pressed="${mechanismView}" ${before ? "disabled":""}`)}${mechanismView ? ct.controls(shown,{disabled:before || !!selected}):""}</div>`:""}
        ${bb && ([6,7].includes(v.packIndex) || bb.hasPart(ids)) ? `<div class="ct-tools">${button("mechanism",mechanismView ? miniature(ids,"查看全車半成品")+"全車" : bb.gesture()+"門窗",mechanismView ? "查看全車半成品" : "查看門窗並試拉",`aria-pressed="${mechanismView}" ${before?"disabled":""}`)}${mechanismView?bb.controls(shown,{disabled:before || !!selected}):""}</div>`:""}
        ${vehicle ? '' : featureToolbar}
        ${!ct && !bb && !feature && canPush(ids) ? `<div class="milestone">${button("push",(pushing?icon("block"):pushGraphic())+`<span>${pushing?"組裝":"試推"}</span>`,pushing?"回到組裝":"試推看看",`class="push-button" aria-pressed="${pushing}" ${before?"disabled":""}`)}${pushing?`<div class="push-controls">${button("push-left",icon("left"),"往左推")}<input data-push-position type="range" aria-label="車的位置" min="-45" max="45" value="${offset}" step="1">${button("push-right",icon("arrow"),"往右推")}</div>`:""}</div>`:""}`));
    }
    function selectPart(id) {
      const v = view();
      if (inspection || !ready || busy || paused || before || pushing || !v.remaining.some(part => part.id === id)) return;
      selected = id;
      if (bb) {bb.choose(id);mechanismView=bb.isPart(id);render(true);}
      if (ct) {
        const side = ct.isPart(id);
        if (id === "p12-1") ct.align();
        mechanismView = side; render(true);
      }
      if(feature) {feature.choose(id);mechanismView=feature.isPart(id);render(true);}
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
      if(old?.kind === 'feature-slide') {feature.move(old.unit,old.value);feature.update(host);}
      if (old && host.hasPointerCapture?.(old.pointerId)) host.releasePointerCapture(old.pointerId);
      motion?.cancel(); motion = null; floating?.remove(); floating = null; busy = false;
    }
    async function install(id, from = null) {
      const v = view();
      if (inspection || disposed || busy) return;
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
        const entry=stager?.isPart(id)?stager.entry?.(id) || {x:0,y:-13}:{x:0,y:-13};
        const scale=host.querySelector("[data-e500-scene]")?.getScreenCTM?.().a || 1;
        if (ghost.animate) {
          motion = ghost.animate([{transform:`translate(${start.x}px,${start.y}px)`},{transform:`translate(${dest.x+entry.x*scale}px,${dest.y+entry.y*scale}px)`,offset:.75},{transform:`translate(${dest.x}px,${dest.y}px)`}], {duration:from?180:220,easing:"cubic-bezier(.2,.65,.3,1)",fill:"forwards"});
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
      if (stager?.stage?.(id)) {
        sound?.place();cancelInteraction();selected=id;render(true);
        host.querySelector('button[data-e500-action="place"]')?.focus?.({preventScroll:true});return;
      }
      try {
        if (required.every(part => part.id === id || fresh.placed.has(part.id))) onFinalPlacement?.(buildId);
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
    function movePane(kind,value) {
      if(!bb || !mechanismView || before || selected || busy || paused)return;
      bb.sync(view().placed);bb.move(kind,value);bb.update(host);
    }
    function moveFeature(kind,value) {
      if(!feature || !mechanismView || before || selected || busy || paused)return;
      feature.sync(view().placed);feature.move(kind,value);feature.update(host);if(vehicle)render();
    }
    function updateOffset(value) {
      offset = Math.max(-45,Math.min(45,value));
      host.querySelector("[data-movable-train]")?.setAttribute("transform",`translate(${offset} ${-offset*.257})`);
      const slider = host.querySelector("[data-push-position]"); if (slider) slider.value = String(Math.round(offset));
    }
    function queueAssetRender() {
      if (assetRenderQueued || disposed) return;
      assetRenderQueued = true;
      (global.requestAnimationFrame || queueMicrotask)(() => {
        assetRenderQueued = false;
        if (!disposed) render();
      });
    }
    function loadSource(src) {
      if (imageLoads.has(src)) return imageLoads.get(src);
      const load = { status:"pending" };
      imageLoads.set(src,load);
      if (typeof global.Image !== "function") { load.status="error"; return load; }
      const image = new global.Image();
      const timer = global.setTimeout(() => finish(false),15000); imageTimers.add(timer);
      function finish(ok) {
        global.clearTimeout(timer); imageTimers.delete(timer); image.onload=null; image.onerror=null;
        if (disposed || imageLoads.get(src) !== load) return;
        load.status = ok ? "ready" : "error";
        queueAssetRender();
      }
      image.onload=()=>finish(true); image.onerror=()=>finish(false); image.src=src;
      if (image.complete && image.naturalWidth > 0) finish(true);
      return load;
    }
    function ensureAssets(v) {
      // The current pack's variants allow any placement order. Future packs and
      // unused occlusion variants must not block an earned, visible pack.
      const ids = visibleIds(v.placed);
      const sources = new Set(parts.filter(part=>ids.has(part.id)).flatMap(part=>sourcesIn(artwork(part,ids))));
      for (const part of v.pack) for (const svg of [part.svg,...(part.variants || []).map(variant=>variant.svg)])
        for (const src of sourcesIn(svg)) sources.add(src);
      if (bb && mechanismView) for (const src of bb.sources) sources.add(src);
      if (feature && mechanismView) for (const src of feature.sourcesFor?.(ids) || feature.sources || []) sources.add(src);
      const statuses = [...sources].map(src=>loadSource(src).status);
      assetError = statuses.includes("error");
      ready = !assetError && !statuses.includes("pending");
    }
    function retryAssets() {
      for (const [src,load] of imageLoads) if (load.status === "error") imageLoads.delete(src);
      render();
    }
    listen(host,"click",event => {
      pointerTap = null;
      queueMicrotask(()=>{if(renderPending)render();});
      if (Date.now() < suppressClickUntil) return;
      const featureControl=event.target.closest?.('[data-train-action]');
      if(featureControl && feature) {
        if(featureControl.disabled || !mechanismView || before || selected || busy || paused)return;
        if(featureControl.dataset.trainAction === 'unit') feature.choose(featureControl.dataset.part);
        else feature.trial(featureControl.dataset.trainAction,featureControl.dataset.kind);
        render();return;
      }
      const control = event.target.closest?.("[data-e500-action]");
      if (!control || control.disabled) return;
      const action = control.dataset.e500Action;
      if(inspection && ['part','place','allocate','flush','next','before','push','pause'].includes(action)) return;
      if (busy && !motion && ["allocate","flush"].includes(action)) return;
      if (action === "part") { if (event.detail === 0) selectPart(control.dataset.part); return; }
      if (action === "place") { if (selected) void install(selected); return; }
      if(action === "bb-unit") {if(!busy && !before){cancelInteraction();selected=null;bb.choose(control.dataset.part);render();}return;}
      if(action === "bb-open" || action === "bb-close") {movePane(control.dataset.kind,bb.value(control.dataset.kind)+(action === "bb-open"?.25:-.25));return;}
      if(action === "bb-detach") {if(bb && mechanismView && !before && !selected && !busy){bb.trial(control.dataset.kind);render();}return;}
      if (action === "ct-prev" || action === "ct-next") { turnWheel(ct.chosen, action === "ct-prev" ? -90 : 90); return; }
      if (action === "ct-detach") { if (ct && mechanismView && !before && !selected && !busy) { ct.trial(); render(); } return; }
      if (action === "sound") { audioEnabled=!audioEnabled; onSound?.(audioEnabled); render(); return; }
      if (action === "push-left" || action === "push-right") { updateOffset(offset+(action === "push-left"?-20:20)); return; }
      cancelInteraction(); selected = null;
      if (action === "mechanism") { mechanismView=!mechanismView; mechanism.endTrial(); pushing=false; }
      if (action === "retry") { retryAssets(); return; }
      if (action === "close") { feature?.endTrial(); onClose?.(); return; }
      if (action === "shelf") { feature?.endTrial(); onShelf?.(); return; }
      if (action === "pause") { feature?.endTrial(); paused=true; pushing=false; before=false; offset=0; }
      if (action === "resume") paused=false;
      if (action === "before") { before=!before; pushing=false; offset=0; mechanism?.endTrial(); }
      if (action === "push") { pushing=!pushing; before=false; offset=0; }
      if (action === "next") { heldPack=null; before=false; pushing=false; offset=0; mechanismView=autoMechanism();bb?.choose(view().remaining.find(part=>bb.isPart(part.id))?.id);feature?.choose(view().remaining.find(part=>feature.isPart(part.id))?.id); mechanism?.endTrial(); }
      if (action === "allocate" || action === "flush") {
        busy=true;
        Promise.resolve().then(()=>action === "allocate" ? collection.allocate():collection.flush()).catch(error=>{localError=error?.message || "請再試一次";}).finally(()=>{busy=false;snapshot=collection.snapshot();render();});
      }
      render();
      (action === "next" ? host.querySelector('.part-button:not(:disabled)') : host.querySelector(`[data-e500-action="${paused?"resume":action === "resume"?"pause":action}"]`))?.focus?.({preventScroll:true});
    });
    listen(host,"keydown",event => {
      const featurePane=event.target.closest?.('[data-train-operate]');
      if(featurePane && feature) {
        const kind=featurePane.dataset.trainOperate,vertical=feature.axis?.(kind)==='vertical';
        const direction=feature.direction?.(kind) || 1;
        const delta=vertical ? {ArrowUp:.1,ArrowDown:-.1} : {ArrowRight:.1*direction,ArrowLeft:-.1*direction};
        if(delta[event.key]!==undefined || ['Home','End'].includes(event.key)){event.preventDefault();moveFeature(kind,event.key==='Home'?0:event.key==='End'?1:feature.value(kind)+delta[event.key]);return;}
      }
      const pane=event.target.closest?.("[data-bb-operate]");
      if(pane && bb) {
        const kind=pane.dataset.bbOperate,delta=kind==="window"?{ArrowUp:.1,ArrowDown:-.1}:{ArrowLeft:.1,ArrowRight:-.1};
        if(delta[event.key]!==undefined || ["Home","End"].includes(event.key)){event.preventDefault();movePane(kind,event.key==="Home"?0:event.key==="End"?1:bb.value(kind)+delta[event.key]);return;}
      }
      const wheel=event.target.closest?.("[data-ct-wheel]");
      if(wheel && ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)) {
        event.preventDefault(); turnWheel(Number(wheel.dataset.ctWheel),["ArrowLeft","ArrowDown"].includes(event.key)?-15:15);return;
      }
      if (event.key === "Escape") { event.preventDefault();cancelInteraction();feature?.clearStaged?.();selected=null;render();host.querySelector('.part-button:not(:disabled)')?.focus?.({preventScroll:true}); }
      if ((event.key === "Enter" || event.key === " ") && event.target.closest?.('rect[data-e500-action="place"]')) { event.preventDefault(); if (selected) void install(selected); }
    });
    listen(host,"input",event => {
      if(event.target.matches?.('[data-train-range]')) moveFeature(event.target.dataset.trainRange,Number(event.target.value)/100);
      if (event.target.matches?.("[data-bb-range]")) movePane(event.target.dataset.bbRange,Number(event.target.value)/100);
      if (event.target.matches?.("[data-push-position]")) updateOffset(Number(event.target.value));
      if (event.target.matches?.("[data-ct-angle]")) turnWheel(ct.chosen,Number(event.target.value)-ct.angle);
    });
    listen(host,"pointerdown",event => {
      if (event.button > 0 || event.isPrimary === false || busy || drag) return;
      if (event.target.closest?.("[data-e500-action], [data-ct-angle], [data-bb-range], [data-train-action], [data-train-range]")) pointerTap = event.pointerId;
      const featurePane=event.target.closest?.('[data-train-operate]');
      if(featurePane && feature && mechanismView && !before && !selected && !paused && featurePane.getAttribute?.('aria-disabled')!=='true') {
        const kind=featurePane.dataset.trainOperate;
        drag={kind:'feature-slide',pointerId:event.pointerId,unit:kind,startX:event.clientX,startY:event.clientY,value:feature.value(kind),scale:host.querySelector('[data-e500-scene]').getScreenCTM().a};
        host.setPointerCapture?.(event.pointerId);return;
      }
      const pane=event.target.closest?.("[data-bb-operate]");
      if(pane && bb && mechanismView && !before && !selected && pane.getAttribute?.("aria-disabled")!=="true") {
        const kind=pane.dataset.bbOperate;
        drag={kind:"bb-slide",pointerId:event.pointerId,unit:kind,startX:event.clientX,startY:event.clientY,value:bb.value(kind),scale:host.querySelector("[data-e500-scene]").getScreenCTM().a};
        host.setPointerCapture?.(event.pointerId);return;
      }
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
      if(drag.kind === 'feature-slide') {
        event.preventDefault();const distance=feature.axis?.(drag.unit)==='vertical'?drag.startY-event.clientY:event.clientX-drag.startX;
        const travel=typeof feature.travel==='function'?feature.travel(drag.unit):feature.travel?.[drag.unit] || 100;
        moveFeature(drag.unit,drag.value+distance*(feature.direction?.(drag.unit) || 1)/(drag.scale*travel));return;
      }
      if(drag.kind === "bb-slide") {
        event.preventDefault();const distance=drag.unit==="window"?drag.startY-event.clientY:drag.startX-event.clientX;
        movePane(drag.unit,drag.value+distance/(drag.scale*bb.travel[drag.unit]));return;
      }
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
      if (["push","ct-turn","bb-slide","feature-slide"].includes(released.kind)) {suppressClickUntil=Date.now()+400;if(renderPending)render();return;}
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
    render();
    return {
      update(next) {snapshot=inspection ? {...next,activeBuild:initialBuild} : next;render();},
      destroy() {disposed=true;cancelInteraction();feature?.endTrial();for(const timer of imageTimers)global.clearTimeout(timer);imageTimers.clear();for(const remove of listeners)remove();},
    };
  }
  global.KidsTrainWorkshop = Object.freeze({ describe, mount });
})();
