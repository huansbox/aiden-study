/* 收藏獨立 outbox；成功儲存本機後才呈現離線放置，正式分包由伺服器決定。 */
(() => {
  const C = globalThis.KidsCollectionCore;
  if (!C) return;
  const clients = new Map();
  function create(child) {
    if (clients.has(child)) return clients.get(child);
    const F = window.KidsFamily, key = `collection:v1:${child}`, outPrefix = `collection:outbox:${child}:`;
    let base = F.read(key) || C.snapshot(C.empty()), status = "offline", message = "尚未連線讀取收藏", pushing = null;
    const listeners = new Set(), rounds = new Map(), rejected = new Map();
    let lastQueued = 0;
    const uuid = () => crypto.randomUUID();
    function pending() {
      const result = [];
      try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(outPrefix)) { const value = F.read(k); if (value) result.push(value); } } } catch { /* 本機寫入會回報具體錯誤 */ }
      return result.sort((a, b) => a.queuedAt - b.queuedAt || a.commandId.localeCompare(b.commandId));
    }
    function snapshot() {
      const view = JSON.parse(JSON.stringify(base));
      view.taskRewards = C.taskRewards(view);
      if (view.daily.date !== C.dateKey()) view.daily = { date: C.dateKey(), targets: (view.goals?.targets || []).map((t) => ({ ...t, label: C.ENTRIES[t.entryId].label, progress: 0, done: false, portions: 0, bonusProgress: 0, bonusCompleted: 0, rewardOffset:0, nextRewardRemaining:t.quantity })), earned: 0, rewardOffset:0, repeatable: C.dateKey() >= C.REPEAT_REWARDS_FROM, limit: view.goals?.targets?.length && C.dateKey() >= C.REPEAT_REWARDS_FROM ? null : 1, first: false, all: false };
      for (const command of pending()) if (command.type === "place") {
        const build = view.builds.find((b) => b.id === command.buildId);
        if (build && !build.placed.includes(command.partId)) build.placed.push(command.partId);
        // 離線可以拼好；永久完成章等雲端確認，不假裝已同步。
      }
      for (const command of pending()) if (command.type === "task-complete" && view.taskRewards[command.event.taskId]?.status !== "earned") {
        view.taskRewards[command.event.taskId] = { status: "pending", completedAt: command.event.occurredAt };
      }
      view.activeBuild = view.builds.find((b) => b.id === view.activeBuild?.id) || null;
      const selection = pending().find((command) => command.type === "select-model");
      view.pendingSelection = selection ? { modelId:selection.modelId, commandId:selection.commandId } : null;
      view.sync = { status, message, pending: pending().length };
      return view;
    }
    function changed() { for (const fn of listeners) fn(snapshot()); window.dispatchEvent(new CustomEvent("kids:collection", { detail: { child } })); }
    function adopt(value) {
      if (value.revision >= base.revision) {
        if (!F.write(key, value)) throw Error("這台裝置無法保存收藏，請家長協助。");
        base = value;
      }
    }
    async function refresh() {
      try { adopt(await F.request(`/v1/collection/${child}`)); status = "ready"; message = ""; }
      catch (e) { status = e.status && e.status !== 503 ? "error" : "offline"; message = e.message; }
      changed(); return snapshot();
    }
    async function flush() {
      if (pushing) return pushing;
      if (!pending().length) return snapshot();
      pushing = (async () => {
        status = "saving"; changed();
        try {
          while (pending().length) for (const command of pending()) {
            try {
              const { queuedAt, ...body } = command;
              const result = await F.request(`/v1/collection/${child}/${command.type}`, { method: "POST", body: JSON.stringify(body) });
              adopt(result.snapshot);
              localStorage.removeItem(outPrefix + command.commandId);
            } catch (e) {
              if (e.status === 409 && e.generation !== undefined && ["record", "round"].includes(command.type)) {
                // 舊世代事件不重新標成新世代；收藏本身維持不變。
                localStorage.removeItem(outPrefix + command.commandId);
                message = e.message;
                continue;
              }
              if (e.status === 400 || e.status === 409 || e.status === 404) {
                rejected.set(command.commandId, e);
                localStorage.removeItem(outPrefix + command.commandId);
                if (command.type === "select-model" && e.status === 409) {
                  // 明確拒絕後讀回最新選作品世代；仍保留原拒絕訊息，不用舊世代反覆重選。
                  try { adopt(await F.request(`/v1/collection/${child}`)); } catch { /* 先保留明確拒絕；稍後可重新讀取。 */ }
                }
              }
              throw e;
            }
          }
          status = "ready"; if (!pending().length) message = "";
        } catch (e) { status = e.status && e.status !== 503 ? "error" : "offline"; message = e.message; }
        changed(); return snapshot();
      })().finally(() => { pushing = null; });
      return pushing;
    }
    function queue(command) {
      lastQueued = Math.max(Date.now(), lastQueued + 1);
      command = { ...command, commandId: command.commandId || uuid(), queuedAt: lastQueued };
      if (!F.write(outPrefix + command.commandId, command)) { status = "error"; message = "這台裝置無法保存新的成果，請家長協助。"; changed(); throw Error(message); }
      changed(); void flush(); return command;
    }
    function selectionPending(command) {
      const error = Error("正在等連線確認作品選擇；此選擇已保存，連線後會重試同一筆操作。");
      error.code = "selection-pending";
      error.pendingSelection = { modelId:command.modelId, commandId:command.commandId };
      return error;
    }
    async function online(type, details = {}) {
      await flush();
      if (type === "select-model") {
        const selection = pending().find((command) => command.type === "select-model");
        if (selection) throw selectionPending(selection);
        details = { ...details, expectedSelectionGeneration:base.selectionGeneration || 0 };
      }
      const command = { ...details, commandId: uuid(), type };
      // 線上操作也先保存操作身分；回應遺失時必須重送同一份內容。
      queue(command);
      await flush();
      if (rejected.has(command.commandId)) throw rejected.get(command.commandId);
      if (pending().some((c) => c.commandId === command.commandId)) {
        if (type === "select-model") throw selectionPending(command);
        throw Error(message || "請連線後再選作品或分包。");
      }
      return snapshot();
    }
    function beginRound({ roundId, entryId }) {
      if (!roundId || !C.ENTRIES[entryId]) return;
      rounds.set(roundId, { entryId, count: 0, done: false, generation: null, invalid: false });
    }
    function record({ entryId, answered = false, roundId, eventId, occurredAt = new Date().toISOString(), generation = F.read("family:generation:" + child, 0) }) {
      if (!C.ENTRIES[entryId]) return;
      const r = rounds.get(roundId);
      if (r && r.generation !== null && r.generation !== generation) r.invalid = true;
      const activeRound = r && r.entryId === entryId && !r.invalid && !r.done;
      const command = queue({ type: "record", commandId: eventId || uuid(), generation, event: { entryId, answered: !!answered, roundId: activeRound ? roundId : undefined, occurredAt } });
      // 第一筆成功保存的作答固定回合世代；重置後必須重新開始回合。
      if (activeRound) { r.generation = generation; r.count++; }
      return command.commandId;
    }
    async function finishRound({ roundId, entryId } = {}) {
      const r = rounds.get(roundId);
      if (r && r.generation !== null && r.generation !== F.read("family:generation:" + child, 0)) r.invalid = true;
      if (r && r.entryId === entryId && r.count > 0 && !r.done && !r.invalid) {
        queue({ type: "round", commandId: "round:" + roundId, generation: r.generation, event: { roundId, entryId, occurredAt: new Date().toISOString() } });
        r.done = true;
      }
      return flush();
    }
    async function completeTask({ taskId, completedQuestionIds, occurredAt = new Date().toISOString() } = {}) {
      const event = { taskId, completedQuestionIds, occurredAt };
      C.validateTaskCompletion(event);
      if (C.taskRewards(base)[taskId].status === "earned") return snapshot();
      if (!pending().some((command) => command.type === "task-complete" && command.event.taskId === taskId)) queue({ type: "task-complete", event });
      await flush();
      return snapshot();
    }
    const client = { snapshot, refresh, flush, beginRound, record, finishRound, completeTask,
      saveGoals: (targets) => online("goals", { expectedGoalRevision: base.goalRevision, targets: C.targets(targets) }),
      selectModel: (modelId) => online("select-model", { modelId }),
      allocate: () => online("allocate"),
      releaseBuild: (expectedActiveBuildId, expectedRevision) => online("release-build", { expectedActiveBuildId, expectedRevision }),
      async placePart(details) {
        // 檢查伺服器已確認分配的包，避免未取得使用權就顯示成功。
        const grant = base.grants.find((g) => g.id === details.grantId);
        const build = base.builds.find((b) => b.id === details.buildId);
        C.check(build && Number.isInteger(details.packIndex) && details.packIndex >= C.packStart(build) && details.packIndex < C.PACK_COUNTS[build.modelId] && grant && grant.buildId === build.id && grant.packIndex === details.packIndex && C.requiredParts(build).some((part) => part.id === details.partId && part.packIndex === details.packIndex), "請先連線取得這包零件。");
        queue({ type: "place", ...details }); return snapshot();
      },
      setDisplayed: (buildId, displayed) => online("display", { buildId, displayed }),
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    };
    clients.set(child, client);
    client.ready = refresh().then(() => flush());
    window.addEventListener("online", () => refresh().then(flush));
    window.addEventListener("storage", (event) => { if (event.key === key) { const cached = F.read(key); if (cached && cached.revision >= base.revision) base = cached; changed(); } });
    return client;
  }
  window.KidsCollection = { create, core: C };
})();
