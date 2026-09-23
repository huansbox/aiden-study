(() => {
  'use strict';
  const host = document.querySelector('#workshop');
  let mounted;
  let saveTimer;
  const requested = new URLSearchParams(location.search).get('model') || 'e500';
  const model = window.KidsBrickModels.get(requested) || window.KidsBrickModels.get('e500');
  const lastPart = model.steps.at(-1).parts.at(-1).id;
  document.querySelector('#model-link').href = './index.html?model=' + model.id;
  document.title = model.title + '完工試車';
  document.querySelector('#preview-instructions').textContent = `把最後一組積木拖進金色框，${model.id.toUpperCase()} 就會向前駛過，播放約 6 秒的完工慶祝。`;
  function restart() {
    clearTimeout(saveTimer);
    mounted?.destroy();
    const build = {
      id: model.id, modelId: model.id, completedAt: null,
      placed: model.steps.flatMap(step => step.parts.map(part => part.id)).filter(id => id !== lastPart),
    };
    const state = {
      version: 1, revision: 1, activeBuild: build, builds: [build], displayedBuildIds: [],
      grants: model.steps.map((_, packIndex) => ({ id: `preview-${packIndex}`, buildId: build.id, packIndex })),
      sync: { status: 'ready', pending: 0, message: '' },
    };
    const subscribers = new Set();
    const notify = () => { for (const callback of subscribers) callback(state); };
    const collection = {
      ready: Promise.resolve(),
      snapshot: () => state,
      subscribe(callback) { subscribers.add(callback); return () => subscribers.delete(callback); },
      async placePart({ partId }) {
        if (partId !== lastPart || build.placed.includes(partId)) return;
        build.placed.push(partId);
        state.sync = { status: 'saving', pending: 1 };
        notify();
        await new Promise(resolve => { saveTimer = setTimeout(resolve, 350); });
        build.completedAt = new Date().toISOString();
        state.sync = { status: 'ready', pending: 0 };
        notify();
      },
      async setDisplayed(buildId, displayed) {
        state.displayedBuildIds = displayed ? [buildId] : [];
        notify();
      },
    };
    mounted = window.KidsBrickWorkshop.mount(host, { collection, onClose() {
      mounted.destroy();
      host.innerHTML = '<p>預覽已關閉。點「重設為只差最後一片」可再試一次。</p>';
    } });
  }
  document.querySelector('#restart').addEventListener('click', restart);
  restart();
})();
