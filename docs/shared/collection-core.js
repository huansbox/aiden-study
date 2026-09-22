/* 每日拼裝規則；只接新的練習事件，與舊累計及其重置世代分開。 */
(() => {
  const MODELS = ["car", "train", "plane"];
  const ENTRIES = {
    "study:math": { label: "題庫數學", metric: "answered" },
    "study:science": { label: "題庫自然", metric: "answered" },
    "study:social": { label: "題庫社會", metric: "answered" },
    "study:chinese": { label: "題庫國語", metric: "answered" },
    math: { label: "長除法", metric: "answered" },
    spelling: { label: "英文拼字", metric: "rounds" },
    nativecamp: { label: "Native Camp Review", metric: "rounds" },
    zhuyin: { label: "注音", metric: "rounds" },
    nonogram: { label: "數織", metric: "rounds" },
  };
  const copy = (v) => JSON.parse(JSON.stringify(v));
  const dateKey = (now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));
  const validDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
  function check(ok, message, status = 400) { if (!ok) { const e = Error(message); e.status = status; throw e; } }
  function targets(value) {
    check(Array.isArray(value) && value.length <= 12, "每日目標格式不正確");
    const result = value.map((t) => {
      check(t && ENTRIES[t.entryId] && t.metric === ENTRIES[t.entryId].metric && Number.isInteger(t.quantity) && t.quantity >= 1 && t.quantity <= 100, "請選擇活動並填寫 1 到 100 的份量");
      return { entryId: t.entryId, metric: t.metric, quantity: t.quantity };
    });
    check(new Set(result.map((t) => t.entryId)).size === result.length, "活動不能重複");
    return result;
  }
  function empty() { return { version: 1, revision: 0, goalRevision: 0, configs: [], days: {}, grants: [], builds: [], activeBuildId: null, displayedBuildIds: [] }; }
  function configFor(state, day) { return state.configs.filter((c) => c.effectiveDate <= day).at(-1) || { revision: 0, targets: [] }; }
  function dayFor(state, day) {
    if (!state.days[day]) {
      const config = configFor(state, day);
      state.days[day] = { goalRevision: config.revision, targets: copy(config.targets), counts: {}, rounds: 0 };
    }
    return state.days[day];
  }
  function daily(state, day) {
    const data = state.days[day] || { targets: configFor(state, day).targets, counts: {}, rounds: 0 };
    return { date: day, targets: data.targets.map((t) => { const progress = data.counts[t.entryId]?.[t.metric] || 0; return { ...t, label: ENTRIES[t.entryId].label, progress, done: progress >= t.quantity }; }), first: state.grants.some((g) => g.id === day + ":first"), all: state.grants.some((g) => g.id === day + ":all") };
  }
  function award(state, day) {
    const view = daily(state, day), data = dayFor(state, day);
    const first = view.targets.length ? view.targets.some((t) => t.done) : data.rounds > 0;
    const all = view.targets.length > 0 && view.targets.every((t) => t.done);
    for (const [kind, earned] of [["first", first], ["all", all]]) if (earned && !state.grants.some((g) => g.id === day + ":" + kind)) state.grants.push({ id: day + ":" + kind, date: day, kind, buildId: null, packIndex: null });
  }
  function allocate(state) {
    const build = state.builds.find((b) => b.id === state.activeBuildId);
    if (!build || build.completedAt) return;
    let count = state.grants.filter((g) => g.buildId === build.id).length;
    for (const grant of state.grants) if (!grant.buildId && count < 14) { grant.buildId = build.id; grant.packIndex = count++; }
  }
  function apply(previous, command, now = new Date()) {
    const state = copy(previous), today = dateKey(now);
    check(command && typeof command.type === "string", "收藏操作不正確");
    if (command.type === "goals") {
      check(command.expectedGoalRevision === state.goalRevision, "每日目標已在另一個入口更新，請重新讀取。", 409);
      const list = targets(command.targets);
      const effectiveDate = today;
      state.goalRevision++;
      state.configs.push({ revision: state.goalRevision, effectiveDate, targets: list });
      // 家長可解除今日無內容的目標；已領的包保留，空清單不補全完成獎。
      if (state.days[today]) { state.days[today].targets = list; state.days[today].goalRevision = state.goalRevision; award(state, today); }
    } else if (command.type === "record" || command.type === "round") {
      const event = command.event;
      check(event && ENTRIES[event.entryId] && typeof event.occurredAt === "string" && Number.isFinite(Date.parse(event.occurredAt)) && Date.parse(event.occurredAt) <= new Date(now).getTime() + 300000, "練習事件不正確");
      if (command.type === "round") check(command.hasPractice === true && typeof event.roundId === "string", "空回合不能計入目標");
      const day = dateKey(event.occurredAt), data = dayFor(state, day);
      data.counts[event.entryId] ||= { answered: 0, rounds: 0 };
      if (command.type === "record" && event.answered === true) data.counts[event.entryId].answered++;
      if (command.type === "round") { data.counts[event.entryId].rounds++; data.rounds++; }
      award(state, day);
    } else if (command.type === "select-model") {
      check(MODELS.includes(command.modelId), "請選擇交通工具");
      const active = state.builds.find((b) => b.id === state.activeBuildId);
      if (active && !active.completedAt) check(active.modelId === command.modelId, "另一個入口已選好作品，先完成目前作品。", 409);
      else {
        check(!state.builds.some((b) => b.modelId === command.modelId), "這件作品已在收藏裡");
        const build = { id: command.modelId, modelId: command.modelId, contentVersion: 1, placed: [], completedAt: null };
        state.builds.push(build); state.activeBuildId = build.id;
      }
      allocate(state);
    } else if (command.type === "allocate") allocate(state);
    else if (command.type === "place") {
      const build = state.builds.find((b) => b.id === command.buildId), grant = state.grants.find((g) => g.id === command.grantId);
      check(build && grant && grant.buildId === build.id && grant.packIndex === command.packIndex, "這包尚未配給目前作品，請先連線讀取。", 409);
      check(Number.isInteger(command.packIndex) && command.packIndex >= 0 && command.packIndex < 14 && [1, 2, 3].some((n) => command.partId === `p${command.packIndex + 1}-${n}`), "零件位置不正確");
      if (!build.placed.includes(command.partId)) build.placed.push(command.partId);
      if (build.placed.length === 42 && !build.completedAt) build.completedAt = new Date(now).toISOString();
    } else if (command.type === "display") {
      check(state.builds.some((b) => b.id === command.buildId && b.completedAt), "完成作品後才能展示");
      check(typeof command.displayed === "boolean", "展示設定不正確");
      state.displayedBuildIds = state.displayedBuildIds.filter((id) => id !== command.buildId);
      if (command.displayed) state.displayedBuildIds.push(command.buildId);
    } else check(false, "不支援的收藏操作");
    state.revision++;
    return state;
  }
  function snapshot(state, day = dateKey()) {
    check(validDate(day), "日期不正確");
    return { version: 1, revision: state.revision, goalRevision: state.goalRevision, goals: copy(state.configs.at(-1) || { revision: 0, targets: [], effectiveDate: null }), daily: daily(state, day), grants: copy(state.grants), activeBuild: copy(state.builds.find((b) => b.id === state.activeBuildId) || null), builds: copy(state.builds), displayedBuildIds: [...state.displayedBuildIds] };
  }
  globalThis.KidsCollectionCore = { MODELS, ENTRIES, dateKey, validDate, targets, empty, apply, snapshot, check };
})();
