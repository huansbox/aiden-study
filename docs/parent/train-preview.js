(() => {
  "use strict";

  // The workshop receives only this in-memory adapter, never a family client.
  function createCollection(model, mode = "first") {
    const parts = model.steps.flatMap(step => step.parts.map(part => part.id));
    const build = { id: "preview-" + model.id, modelId: model.id, completedAt: null,
      placed: mode === "last" ? parts.slice(0, -1) : [] };
    const state = {
      version: 1, revision: 1, activeBuild: build, builds: [build], displayedBuildIds: [],
      grants: model.steps.map((_, packIndex) => ({ id: "preview-pack-" + packIndex,
        buildId: mode === "last" || packIndex === 0 ? build.id : null,
        packIndex: mode === "last" || packIndex === 0 ? packIndex : null })),
      sync: { status: "ready", pending: 0, message: "" },
    };
    const subscribers = new Set();
    const notify = () => { state.revision++; for (const callback of subscribers) callback(); };
    return {
      ready: Promise.resolve(),
      snapshot: () => structuredClone(state),
      subscribe(callback) { subscribers.add(callback); return () => subscribers.delete(callback); },
      async placePart({ packIndex, partId }) {
        if (!state.grants.some(grant => grant.buildId === build.id && grant.packIndex === packIndex) ||
            !model.steps[packIndex]?.parts.some(part => part.id === partId)) throw Error("請先打開這包零件。");
        if (build.placed.includes(partId)) return;
        build.placed.push(partId);
        if (build.placed.length === parts.length) build.completedAt = new Date().toISOString();
        notify();
      },
      async allocate() {
        const assigned = state.grants.filter(grant => grant.buildId === build.id);
        if (assigned.some(grant => model.steps[grant.packIndex].parts.some(part => !build.placed.includes(part.id)))) return;
        const grant = state.grants.find(grant => grant.buildId === null);
        if (!grant) return;
        grant.buildId = build.id;
        grant.packIndex = assigned.length;
        notify();
      },
      async setDisplayed(buildId, displayed) {
        if (buildId !== build.id || !build.completedAt) return;
        state.displayedBuildIds = displayed ? [build.id] : [];
        notify();
      },
    };
  }

  function boot() {
    const host = document.getElementById("train-workshop");
    const select = document.getElementById("train-model");
    const first = document.getElementById("start-first");
    const last = document.getElementById("start-last");
    const params = new URLSearchParams(location.search);
    const models = window.KidsBrickModels.models;
    let mode = params.get("mode") === "last" ? "last" : "first", mounted;
    for (const model of models) {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = `${model.id.toUpperCase()} · ${model.steps.length} 包`;
      select.append(option);
    }
    select.value = models.find(model => model.id === params.get("model"))?.id || models[0].id;
    const child = params.get("child") === "bingpu" ? "bingpu" : "aiden";
    document.getElementById("back-parent").href = "./?child=" + child;
    function start(nextMode) {
      mode = nextMode;
      mounted?.destroy();
      const model = models.find(model => model.id === select.value);
      first.setAttribute("aria-pressed", String(mode === "first"));
      last.setAttribute("aria-pressed", String(mode === "last"));
      document.getElementById("preview-mode").textContent = mode === "last"
        ? "把最後一組放進金色框，就能試看約 6 秒的火車慶祝動畫與音效。"
        : `已備好 ${model.steps.length} 包示範零件。每包拼完按「打開一包」，可以一路試到完成。`;
      mounted = window.KidsBrickWorkshop.mount(host, {
        collection: createCollection(model, mode), preview: true,
        onClose() {
          mounted.destroy();
          host.textContent = "試拼已結束。選上方任一方式，就能重新開始。";
          first.focus();
        },
      });
    }
    first.addEventListener("click", () => start("first"));
    last.addEventListener("click", () => start("last"));
    select.addEventListener("change", () => start(mode));
    window.addEventListener("pagehide", () => mounted?.destroy());
    window.addEventListener("pageshow", event => { if (event.persisted) start(mode); });
    start(mode);
  }
  window.KidsTrainPreview = Object.freeze({ createCollection, boot });
})();
