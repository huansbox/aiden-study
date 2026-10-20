/* 每日拼裝規則；只接新的練習事件，與舊累計及其重置世代分開。 */
(() => {
  // 舊作品的 ID 仍需保留，讓既有半成品與舊版離線操作能繼續同步。
  const PACK_COUNTS = Object.freeze({ car: 14, train: 14, plane: 14, e500: 14, emu3000: 12, r200: 12, '700t': 12, n700s: 12, emu900: 12, 'breezy-blue': 12, ct273: 14, 'jet-plane': 11, excavator: 10, 'snow-blower': 10, 'mobile-crane': 10, 'cement-mixer': 10, 'recycling-truck': 10 });
  const MODELS = Object.keys(PACK_COUNTS);
  const MODERN_MODELS = MODELS.filter((id) => !["car", "train", "plane"].includes(id));
  // 新作品只開放已交付素材與圖形工坊的作品；歷史模型與資料仍完整保留。
  const AVAILABLE_MODELS = Object.freeze(["jet-plane", "excavator", "snow-blower", "mobile-crane", "cement-mixer", "recycling-truck", "e500", "ct273", "breezy-blue", "emu3000", "emu900", "700t", "n700s"]);
  const isModelAvailable = (modelId) => AVAILABLE_MODELS.includes(modelId);
  // 此日期之前的離線事件維持當時規則；不能因新版上線補發歷史獎勵。
  const REPEAT_REWARDS_FROM = "2026-10-19";
  const packStart = (build) => build?.contentVersion === 2 && MODERN_MODELS.includes(build.modelId) ? 1 : 0;
  const packCount = (build) => (PACK_COUNTS[build?.modelId] || 0) - packStart(build);
  const packSourceIndex = (_build, index) => index;
  const packNumber = (build, index) => index - packStart(build) + 1;
  const requiredParts = (build) => Array.from({ length: packCount(build) }, (_, offset) => packStart(build) + offset)
    .flatMap((packIndex) => [1, 2, 3].map((n) => ({ id: `p${packIndex + 1}-${n}`, packIndex })));
  function releaseSummary(view) {
    const build = view.activeBuild || view.builds?.find((b) => b.id === view.activeBuildId) || null;
    const assigned = (view.grants || []).filter((g) => build && g.buildId === build.id);
    const placed = new Set(build?.placed || []);
    const completed = assigned.filter((g) => [1, 2, 3].every((n) => placed.has(`p${g.packIndex + 1}-${n}`))).length;
    const partial = assigned.filter((g) => [1, 2, 3].some((n) => placed.has(`p${g.packIndex + 1}-${n}`)) && ![1, 2, 3].every((n) => placed.has(`p${g.packIndex + 1}-${n}`))).length;
    return { buildId: build?.id || null, modelId: build?.modelId || null, revision: view.revision,
      releasable: !!build && !build.completedAt, total: (view.grants || []).length, assigned: assigned.length,
      completed, partial, waiting: assigned.length - completed - partial,
      unassigned: (view.grants || []).filter((g) => !g.buildId).length };
  }
  function verifyRelease(before, after, buildId) {
    check(Array.isArray(before?.grants) && Array.isArray(before?.builds) && Array.isArray(after?.grants) && Array.isArray(after?.builds), "缺少原始收藏備份，請保留操作識別與備份供家長核對。");
    check(!after.builds.some((b) => b.id === buildId) && !after.grants.some((g) => g.buildId === buildId), "原作品仍有資料殘留，請保留備份核對。");
    const grants = new Map(after.grants.map((g) => [g.id, g]));
    check(grants.size === after.grants.length && before.grants.every((original) => {
      const current = grants.get(original.id);
      // 配包是可變的使用狀態；退回後可合理配給另一件新作品。
      return current && Object.entries(original).filter(([key]) => !["buildId", "packIndex"].includes(key))
        .every(([key, value]) => JSON.stringify(current[key]) === JSON.stringify(value));
    }), "原有拼裝包的 ID、日期或獎勵資料有缺漏，請保留備份核對。");
    check(before.builds.filter((b) => b.completedAt).every((b) => JSON.stringify(b) === JSON.stringify(after.builds.find((current) => current.id === b.id))), "已完成收藏與備份不同，請保留備份核對。");
    return { ...releaseSummary(after), originalTotal: before.grants.length, added: after.grants.length - before.grants.length,
      released: before.grants.filter((g) => g.buildId === buildId).length };
  }
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
  function empty() { return { version: 1, revision: 0, goalRevision: 0, selectionGeneration: 0, configs: [], days: {}, grants: [], builds: [], activeBuildId: null, displayedBuildIds: [] }; }
  function configFor(state, day) { return state.configs.filter((c) => c.effectiveDate <= day).at(-1) || { revision: 0, targets: [] }; }
  function dayFor(state, day) {
    if (!state.days[day]) {
      const config = configFor(state, day);
      state.days[day] = { rewardVersion: day >= REPEAT_REWARDS_FROM ? 3 : 2, goalRevision: config.revision, targets: copy(config.targets), counts: {}, rounds: 0 };
    }
    return state.days[day];
  }
  function daily(state, day) {
    const data = state.days[day] || { targets: configFor(state, day).targets, counts: {}, rounds: 0 };
    const repeatable = day >= REPEAT_REWARDS_FROM && (data.rewardVersion === 3 || !state.days[day]);
    const earned = state.grants.filter((g) => g.date === day).length;
    const entitled = data.targets.reduce((sum, t) => sum + Math.floor((data.counts[t.entryId]?.[t.metric] || 0) / t.quantity), 0);
    const rewardOffset = Math.max(0, earned - entitled);
    const targets = data.targets.map((t) => {
      const progress = data.counts[t.entryId]?.[t.metric] || 0, portions = Math.floor(progress / t.quantity);
      return { ...t, label: ENTRIES[t.entryId].label, progress, done: progress >= t.quantity,
        portions, bonusProgress: progress % t.quantity, bonusCompleted: Math.max(0, portions - 1),
        rewardOffset, nextRewardRemaining: (rewardOffset + 1) * t.quantity - progress % t.quantity };
    });
    // 舊版 first/all 包與取消目標前已領的包保留，且計入當天額度。
    return { date: day, targets, earned, repeatable, rewardOffset, limit: repeatable && targets.length ? null : Math.max(targets.length || 1, earned), first: earned > 0, all: targets.length > 0 && targets.every((t) => t.done) };
  }
  function award(state, day, today) {
    const data = dayFor(state, day);
    if (day === today && day >= REPEAT_REWARDS_FROM) data.rewardVersion = 3;
    const view = daily(state, day);
    // 舊日期的延遲事件沿用原規則；不能因補送無關作答而回溯補包。
    if (!data.rewardVersion && day < today) {
      const first = view.targets.length ? view.targets.some((t) => t.done) : data.rounds > 0;
      const all = view.targets.length > 0 && view.targets.every((t) => t.done);
      for (const [kind, earned] of [["first", first], ["all", all]]) if (earned && !state.grants.some((g) => g.id === `${day}:${kind}`)) state.grants.push({ id: `${day}:${kind}`, date: day, kind, buildId: null, packIndex: null });
      return;
    }
    data.rewardVersion ||= 2;
    const entitled = view.targets.length ? view.targets.reduce((sum, t) => sum + (data.rewardVersion === 3 ? t.portions : Number(t.done)), 0) : Number(data.rounds > 0);
    for (let n = view.earned + 1; n <= entitled; n++) {
      const kind = view.targets.length ? "goal" : "first";
      state.grants.push({ id: kind === "goal" ? `${day}:goal:${n}` : `${day}:first`, date: day, kind, buildId: null, packIndex: null });
    }
  }
  function reconcile(previous, now = new Date()) {
    const state = copy(previous), day = dateKey(now);
    if (state.days[day]) award(state, day, day);
    if (state.grants.length !== previous.grants.length || state.days[day]?.rewardVersion !== previous.days[day]?.rewardVersion) state.revision++;
    return state;
  }
  function allocate(state) {
    const build = state.builds.find((b) => b.id === state.activeBuildId);
    if (!build || build.completedAt) return;
    let count = state.grants.filter((g) => g.buildId === build.id).length;
    for (const grant of state.grants) if (!grant.buildId && count < packCount(build)) { grant.buildId = build.id; grant.packIndex = packStart(build) + count++; }
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
      // 家長可解除今日無內容的目標；已領的包保留，清空不加發。
      if (state.days[today]) { state.days[today].targets = list; state.days[today].goalRevision = state.goalRevision; award(state, today, today); }
    } else if (command.type === "record" || command.type === "round") {
      const event = command.event;
      check(event && ENTRIES[event.entryId] && typeof event.occurredAt === "string" && Number.isFinite(Date.parse(event.occurredAt)) && Date.parse(event.occurredAt) <= new Date(now).getTime() + 300000, "練習事件不正確");
      if (command.type === "round") check(command.hasPractice === true && typeof event.roundId === "string", "空回合不能計入目標");
      const day = dateKey(event.occurredAt), data = dayFor(state, day);
      data.counts[event.entryId] ||= { answered: 0, rounds: 0 };
      if (command.type === "record" && event.answered === true) data.counts[event.entryId].answered++;
      if (command.type === "round") { data.counts[event.entryId].rounds++; data.rounds++; }
      award(state, day, today);
    } else if (command.type === "select-model") {
      check(MODELS.includes(command.modelId), "請選擇拼裝作品");
      const generation = command.expectedSelectionGeneration ?? 0;
      check(Number.isSafeInteger(generation) && generation >= 0 && generation === (state.selectionGeneration || 0), "作品選擇狀態已更新，請重新讀取後再選作品。", 409);
      const active = state.builds.find((b) => b.id === state.activeBuildId);
      if (active && !active.completedAt) check(active.modelId === command.modelId, "另一個入口已選好作品，先完成目前作品。", 409);
      else {
        check(isModelAvailable(command.modelId), "這件作品尚未開放新選，請重新選擇目前開放的作品。", 409);
        check(!state.builds.some((b) => b.modelId === command.modelId), "這件作品已在收藏裡");
        const contentVersion = MODERN_MODELS.includes(command.modelId) ? 2 : 1;
        // 不重用已撤回作品的身分；舊裝置補送 place 也不能寫入重選的同款車。
        const build = { id: `${command.modelId}:${command.commandId || crypto.randomUUID()}`, modelId: command.modelId, contentVersion, placed: [], completedAt: null };
        state.builds.push(build); state.activeBuildId = build.id;
        state.selectionGeneration = (state.selectionGeneration || 0) + 1;
      }
      allocate(state);
    } else if (command.type === "allocate") allocate(state);
    else if (command.type === "release-build") {
      check(Number.isSafeInteger(command.expectedRevision) && command.expectedRevision === state.revision, "收藏已更新，請重新備份並核對版本。", 409);
      check(typeof command.expectedActiveBuildId === "string" && command.expectedActiveBuildId === state.activeBuildId, "目前作品已變更，不能撤回。", 409);
      const build = state.builds.find((b) => b.id === state.activeBuildId);
      check(build && !build.completedAt, "只能撤回目前未完成的作品。", 409);
      for (const grant of state.grants) if (grant.buildId === build.id) { grant.buildId = null; grant.packIndex = null; }
      state.builds = state.builds.filter((b) => b.id !== build.id);
      state.displayedBuildIds = state.displayedBuildIds.filter((id) => id !== build.id);
      state.activeBuildId = null;
      state.selectionGeneration = (state.selectionGeneration || 0) + 1;
    }
    else if (command.type === "place") {
      const build = state.builds.find((b) => b.id === command.buildId), grant = state.grants.find((g) => g.id === command.grantId);
      check(build && Number.isInteger(command.packIndex) && command.packIndex >= packStart(build) && command.packIndex < PACK_COUNTS[build.modelId] && requiredParts(build).some((part) => part.id === command.partId && part.packIndex === command.packIndex), "零件位置不正確");
      check(grant && grant.buildId === build.id && grant.packIndex === command.packIndex, "這包尚未配給目前作品，請先連線讀取。", 409);
      if (!build.placed.includes(command.partId)) build.placed.push(command.partId);
      if (requiredParts(build).every((part) => build.placed.includes(part.id)) && !build.completedAt) build.completedAt = new Date(now).toISOString();
    } else if (command.type === "display") {
      check(state.builds.some((b) => b.id === command.buildId && b.completedAt), "完成作品後才能展示");
      check(typeof command.displayed === "boolean", "展示設定不正確");
      state.displayedBuildIds = state.displayedBuildIds.filter((id) => id !== command.buildId);
      if (command.displayed) state.displayedBuildIds.push(command.buildId);
    } else check(false, "不支援的收藏操作");
    // 新版上線當天已有達標進度時，只補當天新規則的差額。
    if (command.type !== "release-build" && state.days[today]) award(state, today, today);
    state.revision++;
    return state;
  }
  function snapshot(state, day = dateKey()) {
    check(validDate(day), "日期不正確");
    return { version: 1, revision: state.revision, goalRevision: state.goalRevision, selectionGeneration: state.selectionGeneration || 0, goals: copy(state.configs.at(-1) || { revision: 0, targets: [], effectiveDate: null }), daily: daily(state, day), grants: copy(state.grants), activeBuild: copy(state.builds.find((b) => b.id === state.activeBuildId) || null), builds: copy(state.builds), displayedBuildIds: [...state.displayedBuildIds] };
  }
  globalThis.KidsCollectionCore = { MODELS, PACK_COUNTS, MODERN_MODELS, AVAILABLE_MODELS, isModelAvailable, REPEAT_REWARDS_FROM, packStart, packCount, packSourceIndex, packNumber, requiredParts, releaseSummary, verifyRelease, ENTRIES, dateKey, validDate, targets, empty, apply, reconcile, snapshot, check };
})();
