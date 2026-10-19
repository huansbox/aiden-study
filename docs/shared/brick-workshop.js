(() => {
  "use strict";

  const global = typeof window === "undefined" ? globalThis : window;
  const escapeHtml = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character],
    );
  const asSet = (value) =>
    new Set(
      value instanceof Set || Array.isArray(value)
        ? value
        : [],
    );
  const modelParts = new WeakMap();
  const allParts = (model) => {
    if (!model) return [];
    if (!modelParts.has(model)) modelParts.set(model, (model.steps || [])
      .flatMap((step, packIndex) => (step.parts || []).map(part => ({...part,packIndex})))
      .sort((left,right) => (left.z || 0)-(right.z || 0)));
    return modelParts.get(model);
  };
  const packStart = build => global.KidsCollectionCore?.packStart?.(build) ?? (build?.contentVersion === 2 ? 1 : 0);
  const requiredParts = (model, build) => allParts(model).filter(part => part.packIndex >= packStart(build));
  const packCount = (model, build) => global.KidsCollectionCore?.packCount?.(build) ?? model.steps.length - packStart(build);
  const packNumber = (build, index) => index - packStart(build) + 1;
  const fixedIds = (model, build) => allParts(model).filter(part => part.packIndex < packStart(build)).map(part => part.id);
  const nextBuild = model => ({modelId:model.id,contentVersion:["e500","emu3000","r200","700t","n700s","emu900","breezy-blue","ct273"].includes(model.id)?2:1});
  const catalogTitle = () => global.KidsBrickModels?.title || "拼裝系列";
  const modelFrom = (modelId) => global.KidsBrickModels?.get?.(modelId);
  const GRAPHICAL_MODELS = Object.freeze(["e500", "ct273", "breezy-blue", "emu3000", "emu900", "700t", "n700s"]);
  const GRAPHICAL_MECHANISMS = Object.freeze({
    emu3000: "KidsEmuMechanism", emu900: "KidsEmuMechanism",
    "700t": "KidsHighspeedMechanism", n700s: "KidsHighspeedMechanism",
  });
  // 家長 preview 使用獨立記憶體 adapter，保留所有舊車的隔離試拼入口。
  const availableModels = (preview = false) => (global.KidsBrickModels?.models || [])
    .filter((model) => preview || global.KidsCollectionCore?.isModelAvailable?.(model.id) === true);
  const catalogModels = (snapshot, preview = false) => (global.KidsBrickModels?.models || [])
    .filter((model) => preview || global.KidsCollectionCore?.isModelAvailable?.(model.id) === true
      || (snapshot.builds || []).some((build) => build.modelId === model.id)
      || snapshot.activeBuild?.modelId === model.id);
  const partArtwork = (part, placed, complete = false) => {
    const peers = part.occlusionPeers || [];
    if (complete || !peers.length) return part.svg;
    const mask = peers.reduce((value, id, index) => value | (placed.has(id) ? 1 << index : 0), 0);
    return part.variants?.find((variant) => variant.mask === mask)?.svg || part.svg;
  };
  const imageSources = (part) =>
    [part.svg, ...(part.variants || []).map((variant) => variant.svg)]
      .flatMap((artwork) => [...(artwork || "").matchAll(/<image\b[^>]*\b(?:href|xlink:href)\s*=\s*["']([^"']+)["']/gi)])
      .map((match) => match[1]);
  const safeError = (error, fallback) =>
    typeof error?.message === "string" && error.message.trim()
      ? error.message.trim()
      : fallback;

  const previewSource = model => model?.assetVersion
    ? imageSources(model.steps[0].parts[0])[0]?.replace(/\/assets\/[^/?]+(?:\?[^"']*)?$/, `/preview.webp?v=${model.assetVersion}`)
    : null;
  const previewParts = model => previewSource(model) ? [{svg:`<image href="${previewSource(model)}"/>`}] : allParts(model).map(part=>({svg:part.svg}));

  function modelSvg(model, placedIds, { targets = [], complete = false, animatedPartId = null } = {}) {
    if (!model) return "";
    const placed = asSet(placedIds);
    const targetIds = asSet(targets);
    return allParts(model)
      .map((part) => {
        if (complete || placed.has(part.id))
          return `<g class="brick-svg-part brick-svg-part--placed${part.id === animatedPartId ? " brick-svg-part--just-placed" : ""}" data-part-id="${escapeHtml(part.id)}">${partArtwork(part, placed, complete)}</g>`;
        if (targetIds.has(part.id))
          return `<g class="brick-svg-part brick-svg-part--target" role="button" tabindex="0" aria-label="放置${escapeHtml(part.name)}" data-action="target" data-part="${escapeHtml(part.id)}">${partArtwork(part, placed)}</g>`;
        return "";
      })
      .join("");
  }

  function thumbnail(
    modelId,
    { placed = [], complete = false, ghosts = true, className = "", animatedPartId = null, build = null } = {},
  ) {
    const model = modelFrom(modelId);
    if (!model)
      return '<span class="brick-thumbnail brick-thumbnail--missing" aria-hidden="true"></span>';
    const preview = complete && previewSource(model);
    if (preview) return `<img class="brick-thumbnail ${escapeHtml(className)}" src="${escapeHtml(preview)}" width="800" height="500" loading="lazy" decoding="async" alt="${escapeHtml(model.title)}">`;
    const placedIds = new Set([...placed, ...fixedIds(model, build)]);
    const parts = allParts(model)
      .map((part) => {
        const visible = complete || placedIds.has(part.id);
        if (!visible && !ghosts) return "";
        return `<g class="${visible ? "brick-thumbnail__placed" : "brick-thumbnail__ghost"}${visible && part.id === animatedPartId ? " brick-svg-part--just-placed" : ""}">${partArtwork(part, placedIds, complete)}</g>`;
      })
      .join("");
    return `<svg class="brick-thumbnail ${escapeHtml(className)}" viewBox="${escapeHtml(model.viewBox)}" role="img" aria-label="${escapeHtml(model.title)}">${parts}</svg>`;
  }

  function targetGuide(model, part, label) {
    const [, , width, height] = model.viewBox.split(/\s+/).map(Number);
    const cx = part.box.x + part.box.width / 2;
    const cy = part.box.y + part.box.height / 2;
    const w = Math.max(76, part.box.width + 18), h = Math.max(70, part.box.height + 18);
    const x = Math.max(5, Math.min(width - w - 5, cx - w / 2));
    const y = Math.max(50, Math.min(height - h - 5, cy - h / 2));
    const labelWidth = label.length * 17 + 28;
    const labelX = Math.max(6, Math.min(width - labelWidth - 6, cx - labelWidth / 2));
    return `<g class="brick-target-guide" data-guide-part="${escapeHtml(part.id)}">
      <rect class="brick-target-guide__hit" x="${x}" y="${y}" width="${w}" height="${h}" rx="13" role="button" tabindex="0" aria-label="放置${escapeHtml(part.name)}" data-action="target" data-part="${escapeHtml(part.id)}"/>
      <g aria-hidden="true">
      <rect class="brick-target-guide__halo" x="${x}" y="${y}" width="${w}" height="${h}" rx="13"/>
      <rect class="brick-target-guide__outline" x="${x}" y="${y}" width="${w}" height="${h}" rx="13"/>
      <rect class="brick-target-guide__label" x="${labelX}" y="${y - 48}" width="${labelWidth}" height="32" rx="10"/>
      <text x="${labelX + labelWidth / 2}" y="${y - 26}" text-anchor="middle">${escapeHtml(label)}</text>
      <path class="brick-target-guide__arrow" d="M${cx} ${y - 14}v9m-5-5 5 5 5-5"/>
      </g>
    </g>`;
  }

  function mount(element, { collection, onClose, preview = false } = {}) {
    if (!element || typeof element.addEventListener !== "function")
      throw new TypeError("workshop mount element is required");
    if (!collection || typeof collection.snapshot !== "function")
      throw new TypeError("collection client is required");

    let disposed = false;
    let view = "workshop";
    let choosingNext = false;
    let candidateModelId = null;
    let observedPendingSelection = null;
    let imageRenderQueued = false;
    let selectedPart = null;
    let localError = "";
    let busy = "";
    let unsubscribe = null;
    let drag = null;
    let pointerFinalizing = false;
    let pointerInteraction = null;
    let pendingPointerRelease = null;
    let renderDeferred = false;
    let suppressClickUntil = 0;
    let audioEnabled = true;
    const sound = global.KidsBrickAudio?.create();
    let placementAnimationTimer = null;
    let celebration = null;
    let pictureWorkshop = null;
    let pictureBuildId = null;
    let inspectionBuildId = null;
    let inspectionReturnView = "workshop";
    const completionCandidates = new Set();
    const celebratedBuilds = new Set();
    const optimisticPlaced = new Set();
    const imageLoads = new Map();
    const listeners = [];

    function queueImageRender() {
      if (imageRenderQueued || disposed) return;
      imageRenderQueued = true;
      (global.requestAnimationFrame || queueMicrotask)(() => {
        imageRenderQueued = false;
        render({ deferForPlacement:true });
      });
    }

    function imageState(parts) {
      let pending = false;
      let failed = false;
      for (const source of new Set(parts.flatMap(imageSources))) {
        let load = imageLoads.get(source);
        if (!load) {
          load = { status: "pending" };
          imageLoads.set(source, load);
          if (typeof global.Image === "function") {
            const image = new global.Image();
            image.onload = () => {
              if (imageLoads.get(source) !== load || disposed) return;
              load.status = "ready";
              queueImageRender();
            };
            image.onerror = () => {
              if (imageLoads.get(source) !== load || disposed) return;
              load.status = "error";
              queueImageRender();
            };
            image.src = source;
            if (image.complete && image.naturalWidth > 0) load.status = "ready";
          } else load.status = "error";
        }
        if (load.status === "pending") pending = true;
        if (load.status === "error") failed = true;
      }
      return failed ? "error" : pending ? "pending" : "ready";
    }

    function artworkNotice(models) {
      const status = imageState(models.flatMap(previewParts));
      if (status === "ready") return "";
      return `<div class="brick-art-notice" role="${status === "error" ? "alert" : "status"}">
        <span>${status === "error" ? "拼裝圖片載入失敗，作品與進度仍會保留。" : "正在載入拼裝圖片…"}</span>
        ${status === "error" ? '<button type="button" data-action="retry-art">重試載入圖片</button>' : ""}
      </div>`;
    }

    const listen = (target, name, handler, options) => {
      target?.addEventListener?.(name, handler, options);
      listeners.push(() => target?.removeEventListener?.(name, handler, options));
    };
    const currentSnapshot = () =>
      collection.snapshot() || {
        version: 1,
        revision: 0,
        grants: [],
        activeBuild: null,
        builds: [],
        displayedBuildIds: [],
        sync: { status: "ready", message: "", pending: 0 },
      };
    const getModel = (modelId) => modelFrom(modelId);
    const partById = (model, partId) =>
      allParts(model).find((part) => part.id === partId);
    const statusText = (snapshot) => {
      if (preview) return "示範進度只留在此頁，不會保存到孩子的收藏。";
      if (snapshot.pendingSelection) return "正在等連線確認選車";
      const sync = snapshot.sync || {};
      if (sync.status === "offline")
        return sync.message || "目前離線，拼裝進度會留在這台裝置並稍後送出。";
      if (sync.status === "error")
        return sync.message || "拼裝進度暫時無法同步，請稍後重試。";
      if (sync.status === "saving" || sync.pending)
        return "正在保存拼裝進度…";
      return "拼裝進度已保存";
    };
    const statusClass = (snapshot) => {
      const status = snapshot.sync?.status;
      return status === "error" ? " is-error" : status === "offline" ? " is-offline" : "";
    };

    function renderHeader(snapshot) {
      return `<header class="brick-workshop__header">
        <div>
          <p class="brick-workshop__eyebrow">${preview ? "火車試拼" : "每日拼裝收藏"}</p>
          <h1>${view === "shelf" ? (preview ? "示範收藏室" : "我的收藏室") : "拼裝工作台"}</h1>
        </div>
        <div class="brick-workshop__header-actions">
          <button class="brick-icon-button" type="button" data-action="sound" aria-pressed="${audioEnabled}" aria-label="${audioEnabled ? "關閉" : "開啟"}拼裝音效">${audioEnabled ? "音效開" : "音效關"}</button>
          <button class="brick-close" type="button" data-action="close">${preview ? "結束試拼" : "稍後再拼"}</button>
        </div>
      </header>
      <nav class="brick-tabs" aria-label="拼裝收藏頁面">
        <button type="button" data-action="view" data-view="workshop" aria-current="${view === "workshop" ? "page" : "false"}" ${snapshot.pendingSelection ? "disabled" : ""}>工作台</button>
        <button type="button" data-action="view" data-view="shelf" aria-current="${view === "shelf" ? "page" : "false"}" ${snapshot.pendingSelection ? "disabled" : ""}>收藏室</button>
      </nav>
      <p class="brick-sync${statusClass(snapshot)}" role="status"><span aria-hidden="true"></span>${escapeHtml(localError || statusText(snapshot))}</p>`;
    }

    function renderPendingSelection(snapshot) {
      const pending = snapshot.pendingSelection, model = getModel(pending.modelId);
      return `<section class="brick-model-confirm" aria-labelledby="brick-pending-title">
        ${model ? thumbnail(model.id,{complete:true,ghosts:false,className:"brick-model-confirm__picture"}) : ""}
        <p class="brick-kicker" role="status">正在等連線確認選車</p>
        <h2 id="brick-pending-title">${escapeHtml(model?.title || pending.modelId)}</h2>
        <p>你已確認選這台。需要先確認結果，才能返回換車。</p>
        <p>可以稍後回來，這筆選車會繼續確認；重試不會另外選一台。</p>
        <div class="brick-complete__actions"><button type="button" data-action="retry-selection" ${busy ? "disabled" : ""}>${busy ? "正在確認選車…" : "重試確認選車"}</button></div>
      </section>`;
    }

    function reconcilePendingSelection(snapshot) {
      if (snapshot.pendingSelection) {
        observedPendingSelection = {...snapshot.pendingSelection};
        localError = "";
        return;
      }
      if (!observedPendingSelection) return;
      const selected = observedPendingSelection;
      observedPendingSelection = null;
      view = "workshop";
      if (snapshot.activeBuild && !snapshot.activeBuild.completedAt) {
        choosingNext = false;
        candidateModelId = null;
        localError = snapshot.activeBuild.modelId === selected.modelId ? "" : snapshot.sync?.message || "另一個入口已選好作品，先接著目前這台。";
      } else {
        choosingNext = true;
        candidateModelId = selected.modelId;
        localError = snapshot.sync?.message || "這筆選車沒有確認成功，請重新選擇。";
      }
    }

    function renderPicker(snapshot) {
      const unassigned = (snapshot.grants || []).filter(
        (grant) => grant.buildId == null,
      ).length;
      const models = availableModels(preview);
      const ownedModelIds = new Set(
        (snapshot.builds || [])
          .filter((build) => build.completedAt)
          .map((build) => build.modelId),
      );
      if (snapshot.activeBuild?.completedAt)
        ownedModelIds.add(snapshot.activeBuild.modelId);
      const candidate = models.find(model => model.id === candidateModelId && !ownedModelIds.has(model.id));
      if (candidate) {
        const planned = nextBuild(candidate), count = packCount(candidate,planned);
        const candidateArt = imageState(previewParts(candidate));
        return `<section class="brick-model-confirm" aria-labelledby="brick-confirm-title">
          ${thumbnail(candidate.id,{complete:true,ghosts:false,className:"brick-model-confirm__picture"})}
          ${artworkNotice([candidate])}
          <p class="brick-kicker">確認這次的作品</p>
          <h2 id="brick-confirm-title">${escapeHtml(candidate.title)}</h2>
          <p>共 ${count} 包 · ${requiredParts(candidate,planned).length} 組部件${packStart(planned) ? "；展示鐵軌已備好" : ""}</p>
          <p class="brick-model-confirm__available">零件盒有 ${unassigned} 包，現在可以拼 ${Math.min(unassigned,count)} 包。</p>
          ${unassigned ? "" : '<p>先選好這台，拿到新包後就能開始拼。</p>'}
          <div class="brick-complete__actions"><button type="button" data-action="confirm-model" data-model="${escapeHtml(candidate.id)}" ${busy || candidateArt !== "ready" ? "disabled" : ""}>${busy ? "正在準備這台…" : "確定，開始拼這台"}</button>
          <button type="button" class="secondary" data-action="cancel-model" ${busy ? "disabled" : ""}>返回換一台</button></div>
        </section>`;
      }
      const notice = artworkNotice(models);
      if (models.length && models.every((model) => ownedModelIds.has(model.id)))
        return `${notice}<section class="brick-series-complete">
          <div class="brick-series-complete__models">${models
            .map((model) => thumbnail(model.id, { complete: true, ghosts: false }))
            .join("")}</div>
          <p class="brick-kicker">${escapeHtml(catalogTitle())}</p>
          <h2>這個系列目前的作品都收集完成了</h2>
          <p>作品已收進收藏室。${unassigned ? `剩下的 ${unassigned} 包` : "之後拿到的拼裝包"}會留在零件盒，等有新作品再使用。</p>
          <button type="button" data-action="view" data-view="shelf">回收藏室看看</button>
        </section>`;
      return `${notice}<section class="brick-picker" aria-labelledby="brick-picker-title">
        <div class="brick-picker__intro">
          <p class="brick-kicker">${escapeHtml(catalogTitle())} · 零件盒有 ${unassigned} 包</p>
          <h2 id="brick-picker-title">這次想拼哪一台？</h2>
          <p>選一台喜歡的，今天就開始拼。每完成一包，作品會再多一點。</p>
        </div>
        <div class="brick-model-grid">
          ${models
            .map((model) => {
              const owned = ownedModelIds.has(model.id);
              return `<button class="brick-model-card${owned ? " is-owned" : ""}" type="button" data-action="start-model" data-model="${escapeHtml(model.id)}" ${busy || owned ? "disabled" : ""}>
                ${thumbnail(model.id, { complete: true, ghosts: false })}
                <span><strong>${escapeHtml(model.title)}</strong><small>${packCount(model,nextBuild(model))} 包 · ${requiredParts(model,nextBuild(model)).length} 組部件</small></span>
                <b>${owned ? "已收藏" : busy === `model:${model.id}` ? "正在準備…" : "選這台"}</b>
              </button>`;
            })
            .join("")}
        </div>
      </section>`;
    }

    function renderEmpty(snapshot) {
      const hasBuilds = (snapshot.builds || []).length > 0;
      return `<section class="brick-empty">
        <div class="brick-empty__box" aria-hidden="true"><span></span><span></span><span></span></div>
        <p class="brick-kicker">零件盒是空的</p>
        <h2>完成今天的練習，就會拿到新的拼裝包</h2>
        <p>已完成的作品和半成品都會保留，不用擔心漏一天。</p>
        ${hasBuilds ? '<button type="button" data-action="view" data-view="shelf">看看我的作品</button>' : ""}
      </section>`;
    }

    function stopCelebration() {
      if (celebration) global.clearTimeout(celebration.timer);
      sound?.stop();
      celebration = null;
    }

    function startCelebration(build, model) {
      if (!global.KidsBrickCelebration?.supports(model) ||
          global.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
      stopCelebration();
      celebration = {
        buildId: build.id,
        startedAt: Date.now(),
        rendered: false,
        timer: global.setTimeout(() => {
          stopCelebration();
          render();
          element.querySelector?.('[data-action="display"]')?.focus?.({ preventScroll: true });
        }, global.KidsBrickCelebration.duration),
      };
      sound?.celebrate();
    }

    function renderWorkbench(snapshot, animatedPartId = null) {
      const build = snapshot.activeBuild;
      const unassigned = (snapshot.grants || []).filter(
        (grant) => grant.buildId == null,
      );
      if (!build || choosingNext) {
        return renderPicker(snapshot);
      }
      const model = getModel(build.modelId);
      if (!model)
        return '<section class="brick-error"><h2>這件作品還沒準備好</h2><p>請重新整理頁面，或稍後再回來看看。</p></section>';
      const savedPlaced = asSet(build.placed);
      const placed = new Set([...savedPlaced, ...optimisticPlaced]);
      const assigned = (snapshot.grants || []).filter(
        (grant) => grant.buildId === build.id && Number.isInteger(grant.packIndex),
      );
      const currentGrant = assigned
        .sort((left, right) => left.packIndex - right.packIndex)
        .find((grant) =>
          (model.steps[grant.packIndex]?.parts || []).some(
            (part) => !placed.has(part.id),
          ),
        );
      const currentStep = currentGrant
        ? model.steps[currentGrant.packIndex]
        : null;
      const currentParts = currentStep?.parts || [];
      const remaining = currentParts.filter((part) => !placed.has(part.id));
      const shown = new Set([...placed, ...fixedIds(model, build)]);
      const wantsCelebration = build.completedAt && completionCandidates.has(build.id) && !celebratedBuilds.has(build.id);
      const placedArtwork = imageState(build.completedAt && !wantsCelebration ? previewParts(model) : allParts(model).filter((part) => shown.has(part.id)).map(part => ({svg:partArtwork(part,shown)})));
      const trayArtwork = imageState(currentParts);
      const total = requiredParts(model,build).length;
      const locallyComplete = placed.size >= total;
      const completed = Boolean(build.completedAt);
      const ownedModelIds = new Set(
        (snapshot.builds || [])
          .filter((entry) => entry.completedAt)
          .map((entry) => entry.modelId),
      );
      if (completed) ownedModelIds.add(build.modelId);
      const hasAnotherModel = availableModels(preview).some(
        (entry) => !ownedModelIds.has(entry.id),
      );

      if (placedArtwork !== "ready")
        return `<section class="brick-art-gate" role="${placedArtwork === "error" ? "alert" : "status"}">
          <p class="brick-kicker">${escapeHtml(model.title)} · ${placed.size} / ${total} 組部件</p>
          <h2>${placedArtwork === "error" ? "拼裝圖片載入失敗" : "正在載入拼裝圖片…"}</h2>
          <p>${placedArtwork === "error" ? "半成品圖片還沒顯示，先不要拼。請重試，已放好的部件會保留。" : "半成品圖片載好後就能繼續拼，已放好的部件會保留。"}</p>
          ${placedArtwork === "error" ? '<button type="button" data-action="retry-art">重試載入圖片</button>' : ""}
        </section>`;

      if (completed && completionCandidates.has(build.id) && !celebratedBuilds.has(build.id)) {
        celebratedBuilds.add(build.id);
        startCelebration(build, model);
      }
      if (completed && celebration?.buildId === build.id) {
        celebration.rendered = true;
        return global.KidsBrickCelebration.render(model, { audioEnabled, build });
      }

      if (completed)
        return `<section class="brick-complete">
          <div class="brick-complete__shine" aria-hidden="true"></div>
          ${thumbnail(model.id, { complete: true, ghosts: false, className: "brick-complete__model" })}
          <p class="brick-kicker">作品完成</p>
          <h2>${escapeHtml(model.title)}已經可以上展示架了</h2>
          ${hasAnotherModel ? "" : `<p class="brick-complete__summary">${escapeHtml(catalogTitle())}目前的作品都收集完成了。${unassigned.length ? `剩下的 ${unassigned.length} 包` : "之後拿到的拼裝包"}會留在零件盒。</p>`}
          <div class="brick-complete__actions">
            <button type="button" data-action="display" data-build="${escapeHtml(build.id)}" data-displayed="true" ${busy ? "disabled" : ""}>${busy?.startsWith("display:") ? "正在放上展示架…" : "放上展示架"}</button>
            ${GRAPHICAL_MECHANISMS[model.id] ? `<button type="button" class="secondary" data-action="inspect-build" data-build="${escapeHtml(build.id)}">玩玩零件</button>` : ""}
            ${global.KidsBrickCelebration?.supports(model) ? '<button type="button" class="secondary brick-celebration-replay" data-action="celebration-replay">再開一次</button>' : ""}
            ${hasAnotherModel && typeof collection.selectModel === "function" ? '<button type="button" class="secondary" data-action="choose-next">選下一台</button>' : '<button type="button" class="secondary" data-action="view" data-view="shelf">看看收藏室</button>'}
          </div>
        </section>`;

      if (locallyComplete)
        return `<section class="brick-complete brick-complete--saving">
          ${thumbnail(model.id, { complete: true, ghosts: false, className: "brick-complete__model", animatedPartId })}
          <p class="brick-kicker">最後一片已放好</p>
          <h2>正在保存完成的${escapeHtml(model.title)}</h2>
          <p>可以稍後再回來，作品不會不見。</p>
          ${snapshot.sync?.status === "error" || snapshot.sync?.status === "offline" ? '<button type="button" data-action="flush">再試一次</button>' : ""}
        </section>`;

      return `<section class="brick-bench">
        <div class="brick-stage-card">
          <div class="brick-stage-card__top">
            <div><p class="brick-kicker">正在拼</p><h2>${escapeHtml(model.title)}</h2></div>
            <strong>${placed.size}<small> / ${total} 組部件</small></strong>
          </div>
          <div class="brick-progress" role="progressbar" aria-label="${escapeHtml(model.title)}拼裝進度" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${placed.size}"><span style="width:${Math.min(100, (placed.size / total) * 100)}%"></span></div>
          <div class="brick-stage" data-stage>
            <svg viewBox="${escapeHtml(model.viewBox)}" role="img" aria-label="${escapeHtml(model.title)}半成品">
              ${modelSvg(model, shown, { targets: trayArtwork === "ready" ? remaining.map((part) => part.id) : [], animatedPartId })}
              ${trayArtwork === "ready" ? remaining.map((part) => `<g data-target-guide="${escapeHtml(part.id)}" ${selectedPart === part.id || (!selectedPart && remaining.length === 1) ? "" : 'style="display:none"'}>${targetGuide(model, part, placed.size === total - 1 ? "最後一片，放這裡" : "放這裡")}</g>`).join("") : ""}
            </svg>
            ${trayArtwork === "ready" && selectedPart ? `<button class="brick-stage__hint brick-stage__place" type="button" data-action="target" data-part="${escapeHtml(selectedPart)}">放到亮起位置：${escapeHtml(partById(model, selectedPart)?.name || "零件")}</button>` : trayArtwork === "ready" ? `<p class="brick-stage__hint">${remaining.length === 1 ? "把零件拖進金色框，也可以點零件再點位置" : "點一下或拿起零件，就會標出要放的位置"}</p>` : ""}
          </div>
        </div>
        <aside class="brick-tray" aria-label="本包部件">
          ${
            currentStep
              ? trayArtwork !== "ready"
                ? `<div class="brick-art-tray" role="${trayArtwork === "error" ? "alert" : "status"}"><p class="brick-kicker">第 ${packNumber(build,currentGrant.packIndex)} 包</p><h3>${trayArtwork === "error" ? "這包圖片載入失敗" : "正在載入這包圖片…"}</h3><p>已拼好的半成品會留在工作台。</p>${trayArtwork === "error" ? '<button type="button" data-action="retry-art">重試載入圖片</button>' : ""}</div>`
                : `<div class="brick-tray__heading"><div><p class="brick-kicker">第 ${packNumber(build,currentGrant.packIndex)} 包</p><h3>${escapeHtml(currentStep.title || "今天的零件")}</h3></div><span>${3 - remaining.length} / 3</span></div>
                <div class="brick-parts">
                  ${currentParts
                    .map((part) => {
                      const done = placed.has(part.id);
                      return `<button class="brick-part${selectedPart === part.id ? " is-selected" : ""}${done ? " is-placed" : ""}" type="button" data-action="part" data-part="${escapeHtml(part.id)}" ${done || busy === `part:${part.id}` ? "disabled" : ""} aria-pressed="${selectedPart === part.id}">
                        <svg viewBox="${escapeHtml(`${part.box.x} ${part.box.y} ${part.box.width} ${part.box.height}`)}" aria-hidden="true">${partArtwork(part, placed)}</svg>
                        <span>${done ? "已放好" : escapeHtml(part.name)}</span>
                      </button>`;
                    })
                    .join("")}
                </div>
                <p class="brick-tray__tip">拖曳零件時會靠近自動吸附；想捲動畫面時，從零件旁的空白處滑動。</p>`
              : unassigned.length
                ? `<div class="brick-next-pack"><div class="brick-pack-icon" aria-hidden="true"><span></span><span></span><span></span></div><p class="brick-kicker">還有 ${unassigned.length} 包</p><h3>準備打開下一包？</h3><p>打開後就能繼續完成${escapeHtml(model.title)}。</p><button type="button" data-action="allocate" ${busy ? "disabled" : ""}>${busy === "allocate" ? "正在保存…" : "打開一包"}</button></div>`
                : '<div class="brick-next-pack"><p class="brick-kicker">先休息一下</p><h3>目前沒有待拼的包</h3><p>半成品已經保存，下次拿到包會接著拼。</p></div>'
          }
        </aside>
      </section>`;
    }

    function renderShelf(snapshot) {
      const builds = snapshot.builds || [];
      const displayed = asSet(snapshot.displayedBuildIds);
      const completed = builds.filter((build) => build.completedAt);
      const ownedModelIds = new Set(completed.map((build) => build.modelId));
      const canChoose = typeof collection.selectModel === "function"
        && (!snapshot.activeBuild || Boolean(snapshot.activeBuild.completedAt))
        && availableModels(preview).some((model) => !ownedModelIds.has(model.id));
      return `<section class="brick-shelf-view">
        ${canChoose ? '<div class="brick-shelf-next"><p>作品已收進收藏室，可以選下一台了。</p><button type="button" data-action="choose-next">選下一台</button></div>' : ""}
        <div class="brick-section-heading"><div><p class="brick-kicker">我的收藏</p><h2>展示架</h2></div><span>${completed.length} 件完成</span></div>
        ${
          completed.length
            ? `<div class="brick-shelf">${completed
                .map((build) => {
                  const model = getModel(build.modelId);
                  if (!model) return "";
                  const isDisplayed = displayed.has(build.id);
                  return `<article class="brick-shelf-item${isDisplayed ? " is-displayed" : ""}">
                    <div class="brick-shelf-item__stage">${thumbnail(model.id, { complete: true, ghosts: false })}</div>
                    <div><strong>${escapeHtml(model.title)}</strong><small>${isDisplayed ? "展示中" : "已收藏"}</small></div>
                    <button type="button" data-action="display" data-build="${escapeHtml(build.id)}" data-displayed="${isDisplayed ? "false" : "true"}" ${busy ? "disabled" : ""}>${isDisplayed ? "收回收藏" : "放上展示架"}</button>
                    ${GRAPHICAL_MECHANISMS[model.id] ? `<button type="button" class="secondary" data-action="inspect-build" data-build="${escapeHtml(build.id)}">玩玩零件</button>` : ""}
                  </article>`;
                })
                .join("")}</div>`
            : '<div class="brick-empty brick-empty--small"><h2>第一件作品正在路上</h2><p>每個零件都會留在半成品上，慢慢拼就好。</p><button type="button" data-action="view" data-view="workshop">回工作台</button></div>'
        }
        ${
          builds.some((build) => !build.completedAt)
            ? `<div class="brick-in-progress"><h3>半成品</h3>${builds
                .filter((build) => !build.completedAt)
                .map((build) => {
                  const model = getModel(build.modelId);
                  return model
                    ? `<button type="button" data-action="view" data-view="workshop">${thumbnail(model.id, { placed: build.placed, build, ghosts: !GRAPHICAL_MODELS.includes(model.id) })}<span><strong>${escapeHtml(model.title)}</strong><small>${(build.placed || []).length} / ${requiredParts(model,build).length} 組部件</small></span><b>繼續拼</b></button>`
                    : "";
                })
                .join("")}</div>`
            : ""
        }
      </section>`;
    }

    function renderCatalog(snapshot) {
      const builds = snapshot.builds || [];
      const models = catalogModels(snapshot, preview);
      return `<section class="brick-catalog">
        <div class="brick-section-heading"><div><p class="brick-kicker">作品圖鑑</p><h2>${escapeHtml(catalogTitle())}</h2></div><span>${models.length} 件作品</span></div>
        <div class="brick-catalog-grid">${models
          .map((model) => {
            const owned = builds.filter(
              (build) => build.modelId === model.id && build.completedAt,
            ).length;
            const active = builds.find(
              (build) => build.modelId === model.id && !build.completedAt,
            );
            return `<article class="brick-catalog-card${owned ? " is-owned" : ""}">
              ${thumbnail(model.id, { complete: true, ghosts: !owned })}
              <div><p>${owned ? "已收藏" : active ? "拼裝中" : "可以選這台"}</p><h3>${escapeHtml(model.title)}</h3><small>${owned ? `${owned} 件完成作品` : active ? `${(active.placed || []).length} / ${requiredParts(model,active).length} 組部件` : "先選好車，拿到新包後開始拼"}</small></div>
            </article>`;
          })
          .join("")}</div>
      </section>`;
    }

    function render({ animatedPartId = null, deferForPlacement = false } = {}) {
      if (disposed) return;
      if (deferForPlacement && placementAnimationTimer) return;
      if (drag?.active || pointerFinalizing || pointerInteraction) {
        renderDeferred = true;
        return;
      }
      renderDeferred = false;
      const snapshot = currentSnapshot();
      reconcilePendingSelection(snapshot);
      if (snapshot.pendingSelection) {
        pictureWorkshop?.destroy(); pictureWorkshop = null; pictureBuildId = null;
        stopCelebration();
        element.innerHTML = `<section class="brick-workshop">${renderHeader(snapshot)}${renderPendingSelection(snapshot)}</section>`;
        return;
      }
      const inspectionBuild = (snapshot.builds || []).find((entry) => entry.id === inspectionBuildId && entry.completedAt);
      if (inspectionBuildId && !inspectionBuild) inspectionBuildId = null;
      const inspecting = Boolean(inspectionBuild);
      const build = inspectionBuild || snapshot.activeBuild;
      const model = getModel(build?.modelId);
      const pictureEligible = GRAPHICAL_MODELS.includes(model?.id) && (inspecting || view === "workshop" && !choosingNext && !build.completedAt && (build.placed || []).length < requiredParts(model,build).length);
      if (pictureEligible && (inspecting || global.KidsTrainWorkshop || GRAPHICAL_MECHANISMS[model.id])) {
        const mechanism = GRAPHICAL_MECHANISMS[model.id];
        if (!global.KidsTrainWorkshop || mechanism && typeof global[mechanism]?.create !== "function") {
          pictureWorkshop?.destroy(); pictureWorkshop = null; pictureBuildId = null;
          element.innerHTML = `<section class="brick-workshop">${renderHeader(snapshot)}<section class="brick-error" role="alert"><h2>拼裝工作台沒有完整載入</h2><p>請重新整理頁面後再繼續，已拼好的作品會保留。</p><button type="button" data-action="reload-workshop">重新載入</button></section></section>`;
          return;
        }
        const pictureKey = `${inspecting ? "inspection" : "build"}:${build.id}`;
        if (pictureBuildId !== pictureKey) {
          pictureWorkshop?.destroy();
          element.innerHTML = '<div data-picture-workshop-host></div>';
          pictureBuildId = pictureKey;
          const inspectionSnapshot = () => ({ ...currentSnapshot(), activeBuild: (currentSnapshot().builds || []).find((entry) => entry.id === build.id) || build });
          const returnToWork = () => { inspectionBuildId = null; view = inspectionReturnView; render(); };
          pictureWorkshop = global.KidsTrainWorkshop.mount(element.querySelector("[data-picture-workshop-host]"), {
            model, collection: inspecting ? { snapshot: inspectionSnapshot } : collection, sound, audioEnabled, inspection: inspecting,
            onSound(enabled) { audioEnabled = enabled; sound?.setEnabled(enabled); if (enabled) sound?.unlock(); },
            onClose: inspecting ? returnToWork : closeWorkshop,
            onShelf: inspecting ? returnToWork : () => { view = "shelf"; render(); },
            ...(!inspecting ? { onFinalPlacement(id, accepted = true) { if (accepted) completionCandidates.add(id); else completionCandidates.delete(id); } } : {}),
          });
        } else pictureWorkshop.update(inspecting ? { ...snapshot, activeBuild: inspectionBuild } : snapshot);
        return;
      }
      if (pictureWorkshop) { pictureWorkshop.destroy(); pictureWorkshop = null; pictureBuildId = null; }
      if (celebration && (view !== "workshop" || choosingNext || build?.id !== celebration.buildId || !build.completedAt)) stopCelebration();
      // Keep the same animation DOM through save/image callbacks. Replacing it
      // would restart a six-second celebration on every collection update.
      if (celebration?.rendered) return;
      if (!global.KidsBrickModels?.models?.length) {
        element.innerHTML = `<section class="brick-workshop"><div class="brick-error" role="alert"><h2>拼裝模型沒有載入</h2><p>請重新整理頁面；如果仍然看不到模型，稍後再試一次。</p><button type="button" data-action="refresh">重新載入</button></div></section>`;
        return;
      }
      for (const partId of [...optimisticPlaced]) {
        if ((snapshot.activeBuild?.placed || []).includes(partId))
          optimisticPlaced.delete(partId);
      }
      element.innerHTML = `<section class="brick-workshop">${renderHeader(snapshot)}${
        view === "shelf"
          ? artworkNotice(catalogModels(snapshot, preview)) + renderShelf(snapshot) + renderCatalog(snapshot)
            : renderWorkbench(snapshot, animatedPartId)
      }</section>`;
      if (celebration?.rendered) {
        element.querySelector?.('[data-celebration]')?.scrollIntoView?.({ block: "center", behavior: "instant" });
        element.querySelector?.('[data-action="celebration-skip"]')?.focus?.({ preventScroll: true });
      }
    }

    function focusControl(action, partId) {
      const controls = element.querySelectorAll?.(`[data-action="${action}"]`) || [];
      const preferred = [...controls].find(
        (control) =>
          control.dataset?.part === partId &&
          (action !== "target" || control.tagName === "BUTTON"),
      );
      const fallback = [...controls].find(
        (control) => control.dataset?.part === partId,
      );
      (preferred || fallback)?.focus?.();
    }

    async function run(key, operation, fallback) {
      if (busy || disposed) return;
      busy = key;
      localError = "";
      render();
      try {
        await operation();
      } catch (error) {
        localError = error?.code === "selection-pending" || currentSnapshot().pendingSelection ? "" : safeError(error, fallback);
      } finally {
        busy = "";
        render();
      }
    }

    function playPlacedSound() {
      sound?.place();
    }

    async function place(partId) {
      const snapshot = currentSnapshot();
      const build = snapshot.activeBuild;
      const model = getModel(build?.modelId);
      const part = partById(model, partId);
      if (!build || !part || (build.placed || []).includes(partId)) return;
      const shown = new Set([...(build.placed || []), ...optimisticPlaced, ...fixedIds(model, build)]);
      const savedArtwork = allParts(model).filter((entry) => shown.has(entry.id))
        .map((entry) => ({ svg: partArtwork(entry, shown) }));
      if (imageState([...savedArtwork, part]) !== "ready") {
        selectedPart = null;
        render();
        return;
      }
      const grant = (snapshot.grants || []).find(
        (entry) =>
          entry.buildId === build.id && entry.packIndex === part.packIndex,
      );
      if (!grant) {
        localError = "這包零件還沒有同步完成，請先重新整理。";
        render();
        return;
      }
      selectedPart = null;
      optimisticPlaced.add(partId);
      // A stale unfinished cache can become complete during the initial refresh.
      // Celebrate only a final placement made in this mounted workshop.
      const placed = new Set([...(build.placed || []), ...optimisticPlaced]);
      if (requiredParts(model,build).every((entry) => placed.has(entry.id))) completionCandidates.add(build.id);
      busy = `part:${partId}`;
      localError = "";
      playPlacedSound();
      if (placementAnimationTimer) global.clearTimeout(placementAnimationTimer);
      placementAnimationTimer = null;
      render({ animatedPartId: partId });
      if (!global.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)
        placementAnimationTimer = global.setTimeout(() => {
          placementAnimationTimer = null;
          render();
        }, 320);
      try {
        await collection.placePart({
          grantId: grant.id,
          buildId: build.id,
          packIndex: part.packIndex,
          partId,
        });
      } catch (error) {
        optimisticPlaced.delete(partId);
        completionCandidates.delete(build.id);
        localError = safeError(error, "這個零件沒有保存成功，請再試一次。");
      } finally {
        busy = "";
        render({ deferForPlacement: true });
      }
    }

    function closeWorkshop() {
      stopCelebration();
      if (typeof onClose === "function") onClose();
      element.dispatchEvent?.(
        new CustomEvent("kids:workshop-close", { bubbles: true }),
      );
    }

    function onClick(event) {
      finishPointerInteraction();
      queueMicrotask(flushDeferredRender);
      const button = event.target?.closest?.("[data-action]");
      if (!button || button.disabled || !element.contains?.(button)) return;
      const action = button.dataset.action;
      if (currentSnapshot().pendingSelection && ["start-model","confirm-model","cancel-model","choose-next","allocate","display","inspect-build","part","target"].includes(action)) return;
      if (action === "reload-workshop") return global.location?.reload?.();
      if (action === "inspect-build") {
        const build = (currentSnapshot().builds || []).find((entry) => entry.id === button.dataset.build && entry.completedAt);
        if (busy || !build || !GRAPHICAL_MECHANISMS[build.modelId]) return;
        inspectionBuildId = build.id; inspectionReturnView = view;
        stopCelebration(); render();
        return;
      }
      if (action === "retry-selection")
        return run("selection-retry", () => collection.flush?.(), "選車結果暫時無法確認，請再試一次。");
      if (["part", "target", "celebration-replay"].includes(action)) sound?.unlock();
      if (action === "part" && Date.now() < suppressClickUntil) return;
      if (action === "close") return closeWorkshop();
      if (action === "celebration-skip") {
        stopCelebration();
        render();
        element.querySelector?.('[data-action="display"]')?.focus?.();
        return;
      }
      if (action === "celebration-replay") {
        const build = currentSnapshot().activeBuild;
        const model = getModel(build?.modelId);
        if (build?.completedAt && imageState(previewParts(model)) === "ready") {
          startCelebration(build, model);
          render();
        }
        return;
      }
      if (action === "sound") {
        audioEnabled = !audioEnabled;
        sound?.setEnabled(audioEnabled);
        if (audioEnabled) {
          sound?.unlock();
          if (celebration) sound?.celebrate((Date.now() - celebration.startedAt) / 1000);
        }
        if (celebration) {
          for (const control of new Set([button, ...(element.querySelectorAll?.('[data-action="sound"]') || [])])) {
            control.textContent = audioEnabled ? "音效開" : "音效關";
            control.setAttribute?.("aria-pressed", String(audioEnabled));
            control.setAttribute?.("aria-label", audioEnabled ? "關閉拼裝音效" : "開啟拼裝音效");
          }
          return;
        }
        return render();
      }
      if (action === "view") {
        view = button.dataset.view;
        selectedPart = null;
        return render();
      }
      if (action === "choose-next") {
        candidateModelId = null;
        view = "workshop";
        choosingNext = true;
        selectedPart = null;
        return render();
      }
      if (action === "refresh")
        return run(
          "refresh",
          () => collection.refresh?.(),
          "重新載入失敗，請檢查連線後再試。",
        );
      if (action === "retry-art") {
        for (const [source, load] of imageLoads)
          if (load.status === "error") imageLoads.delete(source);
        localError = "";
        return render();
      }
      if (action === "flush")
        return run(
          "flush",
          () => collection.flush?.(),
          "作品還沒有保存完成，請檢查連線後再試。",
        );
      if (action === "start-model") {
        if (!preview && global.KidsCollectionCore?.isModelAvailable?.(button.dataset.model) !== true) return;
        if (busy) return;
        const snapshot = currentSnapshot();
        if ((snapshot.builds || []).some(build => build.modelId === button.dataset.model && build.completedAt)) return;
        candidateModelId = button.dataset.model;
        render();
        element.querySelector?.('[data-action="confirm-model"]')?.focus?.({preventScroll:true});
        return;
      }
      if (action === "cancel-model") {
        if (busy) return;
        candidateModelId = null;
        render();
        return;
      }
      if (action === "confirm-model" && candidateModelId === button.dataset.model)
        return run(
          `model:${button.dataset.model}`,
          async () => {
            if (!preview && global.KidsCollectionCore?.isModelAvailable?.(button.dataset.model) !== true) {
              candidateModelId = null;
              throw new Error("這台車尚未開放新選，請重新選擇目前開放的作品。");
            }
            await collection.selectModel(button.dataset.model);
            choosingNext = false;
            candidateModelId = null;
          },
          "這件作品還沒準備好，請再試一次。",
        );
      if (action === "allocate")
        return run(
          "allocate",
          () => collection.allocate(),
          "這包零件沒有打開，請再試一次。",
        );
      if (action === "display")
        return run(
          `display:${button.dataset.build}`,
          async () => {
            await collection.setDisplayed(
              button.dataset.build,
              button.dataset.displayed === "true",
            );
            if (button.dataset.displayed === "true") {
              view = "shelf";
              choosingNext = Boolean(currentSnapshot().activeBuild?.completedAt);
              candidateModelId = null;
            }
          },
          "展示架沒有更新，請再試一次。",
        );
      if (action === "part") {
        const partId = button.dataset.part;
        selectedPart = selectedPart === partId ? null : partId;
        render();
        focusControl(selectedPart ? "target" : "part", partId);
        return;
      }
      if (action === "target" && selectedPart === button.dataset.part)
        return place(selectedPart);
    }

    function onKeyDown(event) {
      if (event.key === "Enter" || event.key === " ") sound?.unlock();
      if (event.key === "Escape" && celebration) {
        event.preventDefault();
        stopCelebration();
        render();
        element.querySelector?.('[data-action="display"]')?.focus?.();
        return;
      }
      if (event.key === "Escape" && selectedPart) {
        const partId = selectedPart;
        selectedPart = null;
        event.preventDefault();
        render();
        focusControl("part", partId);
        return;
      }
      const target = event.target?.closest?.('[data-action="target"]');
      if (!target || !element.contains?.(target)) return;
      if ((event.key === "Enter" || event.key === " ") && selectedPart === target.dataset.part) {
        event.preventDefault();
        place(selectedPart);
      }
    }

    function startDrag(event) {
      const partButton = event.target?.closest?.('[data-action="part"]');
      if (
        drag ||
        pointerFinalizing ||
        (pointerInteraction && pointerInteraction.pointerId !== event.pointerId) ||
        !partButton ||
        !element.contains?.(partButton) ||
        partButton.disabled ||
        event.button > 0
      )
        return;
      const snapshot = currentSnapshot();
      const model = getModel(snapshot.activeBuild?.modelId);
      const part = partById(model, partButton.dataset.part);
      if (!part) return;
      drag = {
        pointerId: event.pointerId,
        partId: part.id,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        active: false,
        source: partButton,
        captureTarget: event.target,
        ghost: null,
        explicitCapture: false,
      };
    }

    function moveDrag(event) {
      if (!drag || drag.pointerId !== event.pointerId) return;
      drag.x = event.clientX;
      drag.y = event.clientY;
      if (
        !drag.active &&
        Math.hypot(drag.x - drag.startX, drag.y - drag.startY) >= 9
      ) {
        drag.active = true;
        selectedPart = drag.partId;
        // Keep pointer capture intact: update only the existing guide visibility.
        for (const guide of element.querySelectorAll?.("[data-target-guide]") || [])
          guide.style.display = guide.dataset.targetGuide === drag.partId ? "" : "none";
        if (event.pointerType !== "touch") {
          drag.source.setPointerCapture?.(event.pointerId);
          drag.explicitCapture = true;
        }
        const snapshot = currentSnapshot();
        const model = getModel(snapshot.activeBuild?.modelId);
        const part = partById(model, drag.partId);
        const ghost = document.createElement("div");
        ghost.className = "brick-drag-ghost";
        const placed = new Set([...(snapshot.activeBuild?.placed || []), ...optimisticPlaced]);
        ghost.innerHTML = `<svg viewBox="${escapeHtml(`${part.box.x} ${part.box.y} ${part.box.width} ${part.box.height}`)}" aria-hidden="true">${partArtwork(part, placed)}</svg>`;
        document.body.append(ghost);
        drag.ghost = ghost;
      }
      if (!drag.active) return;
      event.preventDefault();
      if (drag.ghost)
        drag.ghost.style.transform = `translate3d(${drag.x}px, ${drag.y}px, 0) translate(-50%, -50%)`;
    }

    function finishDrag(event) {
      if (!drag || drag.pointerId !== event.pointerId) return;
      sound?.unlock();
      const completedDrag = drag;
      drag = null;
      completedDrag.ghost?.remove();
      if (!completedDrag.active) return;
      pointerFinalizing = true;
      suppressClickUntil = Date.now() + 400;
      const targets = [...element.querySelectorAll?.('[data-action="target"]') || []];
      const target = targets.find((candidate) => {
        if (candidate.dataset.part !== completedDrag.partId) return false;
        const bounds = candidate.getBoundingClientRect();
        const padding = Math.max(44, Math.min(bounds.width, bounds.height) * 0.45);
        return (
          event.clientX >= bounds.left - padding &&
          event.clientX <= bounds.right + padding &&
          event.clientY >= bounds.top - padding &&
          event.clientY <= bounds.bottom + padding
        );
      });
      afterPointerRelease(completedDrag, () => {
        pointerFinalizing = false;
        finishPointerInteraction(completedDrag.pointerId);
        if (target) place(completedDrag.partId);
        else {
          selectedPart = null;
          render();
        }
      });
    }

    function cancelDrag(event) {
      if (!drag || (event.pointerId != null && drag.pointerId !== event.pointerId))
        return;
      const completedDrag = drag;
      completedDrag.ghost?.remove();
      drag = null;
      selectedPart = null;
      pointerFinalizing = completedDrag.active;
      afterPointerRelease(completedDrag, () => {
        pointerFinalizing = false;
        finishPointerInteraction(completedDrag.pointerId);
        render();
      });
    }

    function afterPointerRelease(completedDrag, callback) {
      const captureTarget = completedDrag.explicitCapture
        ? completedDrag.source
        : completedDrag.captureTarget;
      if (
        captureTarget?.hasPointerCapture?.(completedDrag.pointerId) &&
        captureTarget.addEventListener
      ) {
        const finish = () => {
          if (pendingPointerRelease?.finish !== finish) return;
          captureTarget.removeEventListener?.("lostpointercapture", finish);
          pendingPointerRelease = null;
          callback();
        };
        pendingPointerRelease = {
          target: captureTarget,
          pointerId: completedDrag.pointerId,
          finish,
        };
        captureTarget.addEventListener("lostpointercapture", finish, {
          once: true,
        });
        if (completedDrag.explicitCapture)
          captureTarget.releasePointerCapture?.(completedDrag.pointerId);
        return;
      }
      queueMicrotask(callback);
    }

    function forcePointerRelease() {
      const pending = pendingPointerRelease;
      if (!pending) return;
      pending.target.releasePointerCapture?.(pending.pointerId);
      pending.finish();
    }

    function abortPointerRelease() {
      const pending = pendingPointerRelease;
      if (!pending) return;
      pendingPointerRelease = null;
      pending.target.removeEventListener?.("lostpointercapture", pending.finish);
      pending.target.releasePointerCapture?.(pending.pointerId);
      pointerFinalizing = false;
    }

    function trackPointerDown(event) {
      if (event.button > 0 || !event.target?.closest?.("[data-action]")) return;
      sound?.unlock();
      if (pointerInteraction && !pointerInteraction.ended) return;
      pointerInteraction = { pointerId: event.pointerId, ended: false };
    }

    function trackPointerEnd(event) {
      if (!pointerInteraction || pointerInteraction.pointerId !== event.pointerId)
        return;
      const interaction = pointerInteraction;
      interaction.ended = true;
      if (pointerFinalizing) return;
      const afterPaint = global.requestAnimationFrame || queueMicrotask;
      afterPaint(() => {
        if (pointerInteraction !== interaction || !interaction.ended) return;
        finishPointerInteraction(interaction.pointerId);
        flushDeferredRender();
      });
    }

    function finishPointerInteraction(pointerId) {
      if (
        !pointerInteraction ||
        (pointerId != null && pointerInteraction.pointerId !== pointerId)
      )
        return;
      pointerInteraction = null;
    }

    function flushDeferredRender() {
      if (renderDeferred && !pointerInteraction && !pointerFinalizing) render();
    }

    function onBlur() {
      cancelDrag({});
      forcePointerRelease();
      finishPointerInteraction();
      flushDeferredRender();
    }

    listen(element, "click", onClick);
    listen(element, "keydown", onKeyDown);
    listen(element, "pointerdown", trackPointerDown);
    listen(element, "pointerdown", startDrag);
    listen(element, "pointermove", moveDrag);
    listen(element, "pointerup", finishDrag);
    listen(element, "pointerup", trackPointerEnd);
    listen(element, "pointercancel", cancelDrag);
    listen(element, "pointercancel", trackPointerEnd);
    listen(global, "blur", onBlur);

    try {
      unsubscribe = collection.subscribe?.(() => render({ deferForPlacement: true })) || null;
    } catch (error) {
      localError = safeError(error, "無法讀取拼裝進度。請重新整理。");
    }
    Promise.resolve(collection.ready)
      .then(() => {
        if (!disposed) render();
      })
      .catch((error) => {
        localError = safeError(error, "無法讀取拼裝進度，請稍後再試。");
        render();
      });
    render();

    return {
      destroy() {
        if (disposed) return;
        disposed = true;
        pictureWorkshop?.destroy();
        stopCelebration();
        sound?.destroy();
        if (placementAnimationTimer) global.clearTimeout(placementAnimationTimer);
        cancelDrag({});
        abortPointerRelease();
        finishPointerInteraction();
        for (const remove of listeners.splice(0)) remove();
        if (typeof unsubscribe === "function") unsubscribe();
        element.replaceChildren?.();
      },
      render,
    };
  }

  global.KidsBrickWorkshop = Object.freeze({ mount, thumbnail });
})();
