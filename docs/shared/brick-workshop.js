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
  const allParts = (model) =>
    (model?.steps || [])
      .flatMap((step, packIndex) =>
        (step.parts || []).map((part) => ({ ...part, packIndex })),
      )
      .sort((left, right) => (left.z || 0) - (right.z || 0));
  const modelFrom = (modelId) => global.KidsBrickModels?.get?.(modelId);
  const safeError = (error, fallback) =>
    typeof error?.message === "string" && error.message.trim()
      ? error.message.trim()
      : fallback;

  function modelSvg(model, placedIds, { targets = [], complete = false } = {}) {
    if (!model) return "";
    const placed = asSet(placedIds);
    const targetIds = asSet(targets);
    return allParts(model)
      .map((part) => {
        if (complete || placed.has(part.id))
          return `<g class="brick-svg-part brick-svg-part--placed" data-part-id="${escapeHtml(part.id)}">${part.svg}</g>`;
        if (targetIds.has(part.id))
          return `<g class="brick-svg-part brick-svg-part--target" role="button" tabindex="0" aria-label="放置${escapeHtml(part.name)}" data-action="target" data-part="${escapeHtml(part.id)}">${part.svg}</g>`;
        return "";
      })
      .join("");
  }

  function thumbnail(
    modelId,
    { placed = [], complete = false, ghosts = true, className = "" } = {},
  ) {
    const model = modelFrom(modelId);
    if (!model)
      return '<span class="brick-thumbnail brick-thumbnail--missing" aria-hidden="true"></span>';
    const placedIds = asSet(placed);
    const parts = allParts(model)
      .map((part) => {
        const visible = complete || placedIds.has(part.id);
        if (!visible && !ghosts) return "";
        return `<g class="${visible ? "brick-thumbnail__placed" : "brick-thumbnail__ghost"}">${part.svg}</g>`;
      })
      .join("");
    return `<svg class="brick-thumbnail ${escapeHtml(className)}" viewBox="${escapeHtml(model.viewBox)}" role="img" aria-label="${escapeHtml(model.title)}">${parts}</svg>`;
  }

  function mount(element, { collection, onClose } = {}) {
    if (!element || typeof element.addEventListener !== "function")
      throw new TypeError("workshop mount element is required");
    if (!collection || typeof collection.snapshot !== "function")
      throw new TypeError("collection client is required");

    let disposed = false;
    let view = "workshop";
    let choosingNext = false;
    let selectedPart = null;
    let localError = "";
    let busy = "";
    let unsubscribe = null;
    let drag = null;
    let suppressClickUntil = 0;
    let audioEnabled = true;
    const optimisticPlaced = new Set();
    const listeners = [];

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
          <p class="brick-workshop__eyebrow">每日拼裝收藏</p>
          <h1>${view === "shelf" ? "我的收藏室" : "拼裝工作台"}</h1>
        </div>
        <div class="brick-workshop__header-actions">
          <button class="brick-icon-button" type="button" data-action="sound" aria-pressed="${audioEnabled}" aria-label="${audioEnabled ? "關閉" : "開啟"}拼裝音效">${audioEnabled ? "音效開" : "音效關"}</button>
          <button class="brick-close" type="button" data-action="close">稍後再拼</button>
        </div>
      </header>
      <nav class="brick-tabs" aria-label="拼裝收藏頁面">
        <button type="button" data-action="view" data-view="workshop" aria-current="${view === "workshop" ? "page" : "false"}">工作台</button>
        <button type="button" data-action="view" data-view="shelf" aria-current="${view === "shelf" ? "page" : "false"}">收藏室</button>
      </nav>
      <p class="brick-sync${statusClass(snapshot)}" role="status"><span aria-hidden="true"></span>${escapeHtml(localError || statusText(snapshot))}</p>`;
    }

    function renderPicker(snapshot) {
      const unassigned = (snapshot.grants || []).filter(
        (grant) => grant.buildId == null,
      ).length;
      const models = global.KidsBrickModels?.models || [];
      const ownedModelIds = new Set(
        (snapshot.builds || [])
          .filter((build) => build.completedAt)
          .map((build) => build.modelId),
      );
      if (snapshot.activeBuild?.completedAt)
        ownedModelIds.add(snapshot.activeBuild.modelId);
      if (models.length && models.every((model) => ownedModelIds.has(model.id)))
        return `<section class="brick-series-complete">
          <div class="brick-series-complete__models">${models
            .map((model) => thumbnail(model.id, { complete: true, ghosts: false }))
            .join("")}</div>
          <p class="brick-kicker">交通工具系列</p>
          <h2>三件作品都收集完成了</h2>
          <p>小汽車、火車和飛機都在你的收藏室裡。</p>
          <button type="button" data-action="view" data-view="shelf">回收藏室看看</button>
        </section>`;
      return `<section class="brick-picker" aria-labelledby="brick-picker-title">
        <div class="brick-picker__intro">
          <p class="brick-kicker">零件盒有 ${unassigned} 包</p>
          <h2 id="brick-picker-title">這次想拼哪一台？</h2>
          <p>選一台喜歡的，今天就開始拼。每完成一包，作品會再多一點。</p>
        </div>
        <div class="brick-model-grid">
          ${models
            .map((model) => {
              const owned = ownedModelIds.has(model.id);
              return `<button class="brick-model-card${owned ? " is-owned" : ""}" type="button" data-action="start-model" data-model="${escapeHtml(model.id)}" ${busy || owned ? "disabled" : ""}>
                ${thumbnail(model.id, { complete: true, ghosts: false })}
                <span><strong>${escapeHtml(model.title)}</strong><small>14 包 · 42 個零件</small></span>
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

    function renderWorkbench(snapshot) {
      const build = snapshot.activeBuild;
      const unassigned = (snapshot.grants || []).filter(
        (grant) => grant.buildId == null,
      );
      if (!build || choosingNext)
        return unassigned.length ? renderPicker(snapshot) : renderEmpty(snapshot);
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
      const total = allParts(model).length;
      const locallyComplete = placed.size >= total;
      const completed = Boolean(build.completedAt);
      const ownedModelIds = new Set(
        (snapshot.builds || [])
          .filter((entry) => entry.completedAt)
          .map((entry) => entry.modelId),
      );
      if (completed) ownedModelIds.add(build.modelId);
      const hasAnotherModel = (global.KidsBrickModels?.models || []).some(
        (entry) => !ownedModelIds.has(entry.id),
      );

      if (completed)
        return `<section class="brick-complete">
          <div class="brick-complete__shine" aria-hidden="true"></div>
          ${thumbnail(model.id, { complete: true, ghosts: false, className: "brick-complete__model" })}
          <p class="brick-kicker">作品完成</p>
          <h2>${escapeHtml(model.title)}已經可以上展示架了</h2>
          <div class="brick-complete__actions">
            <button type="button" data-action="display" data-build="${escapeHtml(build.id)}" data-displayed="true">放上展示架</button>
            ${unassigned.length && hasAnotherModel ? '<button type="button" class="secondary" data-action="choose-next">選下一件作品</button>' : '<button type="button" class="secondary" data-action="view" data-view="shelf">看看收藏室</button>'}
          </div>
        </section>`;

      if (locallyComplete)
        return `<section class="brick-complete brick-complete--saving">
          ${thumbnail(model.id, { complete: true, ghosts: false, className: "brick-complete__model" })}
          <p class="brick-kicker">最後一片已放好</p>
          <h2>正在保存完成的${escapeHtml(model.title)}</h2>
          <p>可以稍後再回來，作品不會不見。</p>
          ${snapshot.sync?.status === "error" || snapshot.sync?.status === "offline" ? '<button type="button" data-action="flush">再試一次</button>' : ""}
        </section>`;

      return `<section class="brick-bench">
        <div class="brick-stage-card">
          <div class="brick-stage-card__top">
            <div><p class="brick-kicker">正在拼</p><h2>${escapeHtml(model.title)}</h2></div>
            <strong>${placed.size}<small> / ${total} 零件</small></strong>
          </div>
          <div class="brick-progress" role="progressbar" aria-label="${escapeHtml(model.title)}拼裝進度" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${placed.size}"><span style="width:${Math.min(100, (placed.size / total) * 100)}%"></span></div>
          <div class="brick-stage" data-stage>
            <svg viewBox="${escapeHtml(model.viewBox)}" role="img" aria-label="${escapeHtml(model.title)}半成品">
              ${modelSvg(model, placed, { targets: remaining.map((part) => part.id) })}
            </svg>
            ${selectedPart ? `<button class="brick-stage__hint brick-stage__place" type="button" data-action="target" data-part="${escapeHtml(selectedPart)}">放到亮起位置：${escapeHtml(partById(model, selectedPart)?.name || "零件")}</button>` : '<p class="brick-stage__hint">可以點零件再點位置，也可以直接拖過去</p>'}
          </div>
        </div>
        <aside class="brick-tray" aria-label="本包零件">
          ${
            currentStep
              ? `<div class="brick-tray__heading"><div><p class="brick-kicker">第 ${currentGrant.packIndex + 1} 包</p><h3>${escapeHtml(currentStep.title || "今天的零件")}</h3></div><span>${3 - remaining.length} / 3</span></div>
                <div class="brick-parts">
                  ${currentParts
                    .map((part) => {
                      const done = placed.has(part.id);
                      return `<button class="brick-part${selectedPart === part.id ? " is-selected" : ""}${done ? " is-placed" : ""}" type="button" data-action="part" data-part="${escapeHtml(part.id)}" ${done || busy === `part:${part.id}` ? "disabled" : ""} aria-pressed="${selectedPart === part.id}">
                        <svg viewBox="${escapeHtml(`${part.box.x} ${part.box.y} ${part.box.width} ${part.box.height}`)}" aria-hidden="true">${part.svg}</svg>
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
      return `<section class="brick-shelf-view">
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
                    ? `<button type="button" data-action="view" data-view="workshop">${thumbnail(model.id, { placed: build.placed })}<span><strong>${escapeHtml(model.title)}</strong><small>${(build.placed || []).length} / ${allParts(model).length} 零件</small></span><b>繼續拼</b></button>`
                    : "";
                })
                .join("")}</div>`
            : ""
        }
      </section>`;
    }

    function renderCatalog(snapshot) {
      const builds = snapshot.builds || [];
      return `<section class="brick-catalog">
        <div class="brick-section-heading"><div><p class="brick-kicker">第一系列</p><h2>交通工具</h2></div><span>3 件作品</span></div>
        <div class="brick-catalog-grid">${(global.KidsBrickModels?.models || [])
          .map((model) => {
            const owned = builds.filter(
              (build) => build.modelId === model.id && build.completedAt,
            ).length;
            const active = builds.find(
              (build) => build.modelId === model.id && !build.completedAt,
            );
            return `<article class="brick-catalog-card${owned ? " is-owned" : ""}">
              ${thumbnail(model.id, { complete: true, ghosts: !owned })}
              <div><p>${owned ? "已收藏" : active ? "拼裝中" : "待解鎖"}</p><h3>${escapeHtml(model.title)}</h3><small>${owned ? `${owned} 件完成作品` : active ? `${(active.placed || []).length} / 42 零件` : "取得拼裝包後可以選擇"}</small></div>
            </article>`;
          })
          .join("")}</div>
      </section>`;
    }

    function render() {
      if (disposed) return;
      const snapshot = currentSnapshot();
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
          ? renderShelf(snapshot) + renderCatalog(snapshot)
            : renderWorkbench(snapshot)
      }</section>`;
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
        localError = safeError(error, fallback);
      } finally {
        busy = "";
        render();
      }
    }

    function playPlacedSound() {
      if (!audioEnabled) return;
      try {
        const Audio = global.AudioContext || global.webkitAudioContext;
        if (!Audio) return;
        const context = new Audio();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(480, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(
          720,
          context.currentTime + 0.07,
        );
        gain.gain.setValueAtTime(0.001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.09);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.1);
        oscillator.addEventListener("ended", () => context.close());
      } catch {}
    }

    async function place(partId) {
      const snapshot = currentSnapshot();
      const build = snapshot.activeBuild;
      const model = getModel(build?.modelId);
      const part = partById(model, partId);
      if (!build || !part || (build.placed || []).includes(partId)) return;
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
      busy = `part:${partId}`;
      localError = "";
      playPlacedSound();
      render();
      try {
        await collection.placePart({
          grantId: grant.id,
          buildId: build.id,
          packIndex: part.packIndex,
          partId,
        });
      } catch (error) {
        optimisticPlaced.delete(partId);
        localError = safeError(error, "這個零件沒有保存成功，請再試一次。");
      } finally {
        busy = "";
        render();
      }
    }

    function closeWorkshop() {
      if (typeof onClose === "function") onClose();
      element.dispatchEvent?.(
        new CustomEvent("kids:workshop-close", { bubbles: true }),
      );
    }

    function onClick(event) {
      const button = event.target?.closest?.("[data-action]");
      if (!button || !element.contains?.(button)) return;
      const action = button.dataset.action;
      if (action === "part" && Date.now() < suppressClickUntil) return;
      if (action === "close") return closeWorkshop();
      if (action === "sound") {
        audioEnabled = !audioEnabled;
        return render();
      }
      if (action === "view") {
        view = button.dataset.view;
        selectedPart = null;
        return render();
      }
      if (action === "choose-next") {
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
      if (action === "flush")
        return run(
          "flush",
          () => collection.flush?.(),
          "作品還沒有保存完成，請檢查連線後再試。",
        );
      if (action === "start-model")
        return run(
          `model:${button.dataset.model}`,
          async () => {
            await collection.selectModel(button.dataset.model);
            choosingNext = false;
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
            if (button.dataset.displayed === "true") view = "shelf";
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
        ghost: null,
      };
      partButton.setPointerCapture?.(event.pointerId);
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
        const snapshot = currentSnapshot();
        const model = getModel(snapshot.activeBuild?.modelId);
        const part = partById(model, drag.partId);
        const ghost = document.createElement("div");
        ghost.className = "brick-drag-ghost";
        ghost.innerHTML = `<svg viewBox="${escapeHtml(`${part.box.x} ${part.box.y} ${part.box.width} ${part.box.height}`)}" aria-hidden="true">${part.svg}</svg>`;
        document.body.append(ghost);
        drag.ghost = ghost;
        render();
      }
      if (!drag.active) return;
      event.preventDefault();
      if (drag.ghost)
        drag.ghost.style.transform = `translate3d(${drag.x}px, ${drag.y}px, 0) translate(-50%, -50%)`;
    }

    function finishDrag(event) {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const completedDrag = drag;
      drag = null;
      completedDrag.source.releasePointerCapture?.(event.pointerId);
      completedDrag.ghost?.remove();
      if (!completedDrag.active) return;
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
      if (target) place(completedDrag.partId);
      else {
        selectedPart = null;
        render();
      }
    }

    function cancelDrag(event) {
      if (!drag || (event.pointerId != null && drag.pointerId !== event.pointerId))
        return;
      drag.ghost?.remove();
      drag = null;
      selectedPart = null;
      render();
    }

    listen(element, "click", onClick);
    listen(element, "keydown", onKeyDown);
    listen(element, "pointerdown", startDrag);
    listen(element, "pointermove", moveDrag);
    listen(element, "pointerup", finishDrag);
    listen(element, "pointercancel", cancelDrag);
    listen(global, "blur", cancelDrag);

    try {
      unsubscribe = collection.subscribe?.(() => render()) || null;
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
        cancelDrag({});
        for (const remove of listeners.splice(0)) remove();
        if (typeof unsubscribe === "function") unsubscribe();
        element.replaceChildren?.();
      },
      render,
    };
  }

  global.KidsBrickWorkshop = Object.freeze({ mount, thumbnail });
})();
