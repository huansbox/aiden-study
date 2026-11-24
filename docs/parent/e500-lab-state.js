(function (root) {
  "use strict";
  const presets = Object.freeze({
    chassis: { start: 9, label: "接上承重底盤", chapter: 0, viewBox: "65 220 680 270", done: "底盤接好了，可以推動了。", next: "接下來：懸吊與車底設備", before: "兩組輪架已就位，還缺把它們連起來的底盤。", after: "輪架連成一體了。車身還沒蓋上，先用手推一推。", shortNames: ["前段底盤", "中央底盤", "後段底盤"] },
    half: { start: 21, label: "造出兩端駕駛室", chapter: 2, viewBox: "65 90 680 400", done: "駕駛室成形了。", next: "接下來：玻璃窗與扶手", before: "底盤與橘色車身已完成，兩端駕駛室仍敞開著。", after: "窗框接上車身了。窗洞留著，下一包再裝玻璃。", shortNames: ["前端斜牆", "後端窗框", "前端窗框"] },
    finish: { start: 39, label: "接好車頭，準備出發", chapter: 4, viewBox: "65 80 680 410", done: "這台 E500 是你造好的。", next: "全部完成：可以把整台車推出去看看", before: "車身、車窗與車頂設備都好了，還缺車頭下方的接合部件。", after: "排障板、車鉤與踏階都就位，整台 E500 完成了。", shortNames: ["排障板", "車鉤", "踏階與車號"] },
  });

  // Exactly one real pack per trial. Both versions get independent adapters.
  // No family clients, network, storage or reward-grant logic is involved.
  function createTrial(model, presetId) {
    const preset = presets[presetId];
    if (!preset || !model?.steps) throw new Error("未知的比較起點");
    const parts = model.steps.flatMap(step => step.parts);
    const packIndex = preset.start / 3;
    const initial = parts.slice(0, preset.start).map(part => part.id);
    const allowed = new Set(model.steps[packIndex].parts.map(part => part.id));
    const placed = new Set(initial);
    const subscribers = new Set();
    let revision = 0;
    let displayed = false;
    const buildId = "lab-e500-" + presetId;
    const snapshot = () => {
      const build = { id: buildId, modelId: model.id, placed: [...placed], completedAt: placed.size === parts.length ? "2026-10-13T00:00:00.000Z" : null };
      return { version: 1, revision, activeBuild: build, builds: [build],
        grants: model.steps.slice(0, packIndex + 1).map((_, index) => ({ id: "lab-pack-" + index, buildId, packIndex: index })),
        displayedBuildIds: displayed ? [buildId] : [], sync: { status: "ready", pending: 0, message: "" } };
    };
    const notify = () => { revision++; for (const fn of subscribers) fn(); };
    return {
      initial: Object.freeze(initial), packIndex, ready: Promise.resolve(), snapshot,
      subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
      async placePart({ packIndex: index, partId }) {
        if (index !== packIndex || !allowed.has(partId)) throw new Error("請使用這一包的零件。");
        if (placed.has(partId)) return;
        placed.add(partId); notify();
      },
      async allocate() {},
      async setDisplayed(id, value) { if (id === buildId && placed.size === parts.length) { displayed = Boolean(value); notify(); } },
    };
  }
  root.KidsE500LabState = Object.freeze({ presets, createTrial });
})(typeof window === "undefined" ? globalThis : window);
