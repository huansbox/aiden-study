(() => {
  const F = window.KidsFamily,
    root = document.getElementById("hub");
  const auth = window.KidsAuth;
  if (!F || !window.KidsSyncV1) {
    root.textContent = "頁面載入不完整，請重新整理。";
    return;
  }
  if (restoreForwardTarget(location.search, location.hash)) return;
  let storage;
  try {
    storage = localStorage;
  } catch {}
  const identity = KidsSyncV1.bootIdentity(location.search, storage);
  if (new URLSearchParams(location.search).get("view") === "parent") {
    location.replace("parent/" + location.search);
    return;
  }
  const C = F.core,
    esc = (s) =>
      String(s).replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
  const names = {
    study: "題庫",
    math: "長除法",
    spelling: "英文",
    nativecamp: "Native Camp Review",
    nonogram: "數織",
    zhuyin: "注音",
    "animal-fight": "動物守護者",
  };
  let reg,
    child,
    settingsState = F.cachedSettings(),
    config = settingsState.data,
    view = ["stats", "results", "collection"].includes(new URLSearchParams(location.search).get("view")) ? "results" : "home",
    loading = false;
  let resultsTab = "collection", collection, workshop;
  const collectionState = () => collection?.snapshot();
  const profile = () => config.children[child.id];
  const minutes = (n) => Math.floor(n / 60);
  function header() {
    const s = F.summary(child.id);
    return `<header class="family-header"><div class="family-person"><img class="family-avatar" src="${F.avatar(child.id, profile().avatar)}" alt=""><h1>${esc(child.name)}</h1></div><button class="family-stats-link" data-view="results">我的成果 →<br><small>今天 ${s.today.answered} 題 · ${minutes(s.today.seconds)} 分鐘</small></button></header>`;
  }
  function stats() {
    const s = F.summary(child.id),
      earned = new Set(C.earnedBadges(s).map((b) => b.id));
    return `<section class="family-panel"><h2>今天</h2><div class="family-metrics"><div class="family-metric"><strong>${s.today.answered}</strong><span>題</span></div><div class="family-metric"><strong>${minutes(s.today.seconds)}</strong><span>分鐘</span></div></div></section><section class="family-panel"><h2>累計</h2><div class="family-metrics"><div class="family-metric"><strong>${s.total.answered}</strong><span>題</span></div><div class="family-metric"><strong>${minutes(s.total.seconds)}</strong><span>分鐘</span></div></div><p style="margin-top:20px">${s.finishedTasks} 個任務完成</p></section><section class="family-panel"><h2>各項練習</h2><table class="family-detail"><thead><tr><th>活動</th><th>作答</th><th>閱讀卡片</th><th>分鐘</th></tr></thead><tbody>${
      Object.entries(s.apps)
        .map(
          ([id, v]) =>
            `<tr><td>${esc(names[id] || id)}</td><td>${v.answered}</td><td>${v.completed - v.answered}</td><td>${minutes(v.seconds)}</td></tr>`,
        )
        .join("") || '<tr><td colspan="4">完成練習就會出現在這裡。</td></tr>'
    }</tbody></table></section><h2 style="margin:26px 0 16px">里程碑</h2><div class="family-badges">${C.BADGES.map((b) => `<div class="family-badge ${earned.has(b.id) ? "" : "locked"}"><span class="family-brick ${b.color}" aria-hidden="true"></span><strong>${b.label}</strong><small>${earned.has(b.id) ? "已達成" : `${b.goal} ${b.metric === "tasks" ? "個任務" : "題"}`}</small></div>`).join("")}</div>`;
  }
  function dailyGoals() {
    const state = collectionState();
    if (!state?.daily) return '<section class="family-panel daily-goals"><h2>今天的目標</h2><p role="status">正在讀取每日目標⋯</p></section>';
    const entries = C.homeEntries(config, child.id, reg);
    const goals = state.daily.targets || [];
    const earned = Number(Boolean(state.daily.first)) + Number(Boolean(state.daily.all));
    const build = state.activeBuild;
    const title = window.KidsBrickModels?.get(build?.modelId)?.title;
    const totalParts = window.KidsCollectionCore.PACK_COUNTS[build?.modelId] * 3;
    return `<section class="family-panel daily-goals"><div class="family-row"><h2>今天的目標</h2><span class="daily-pack-count">今日拼裝包 ${earned} / ${goals.length ? 2 : 1}</span></div><p class="daily-explanation">${goals.length ? "完成一項領一包，全部完成再領一包。內容由你選。" : "自由練習完整一輪，就能領一包。"}</p><div class="daily-goal-list">${goals.map(goal => {
      const entry = entries.find(e => e.id === goal.entryId);
      const label = entry?.title || goal.label || names[goal.entryId] || goal.entryId;
      const content = `<span>${esc(label)}</span><strong>${Math.min(goal.quantity, goal.progress)} / ${goal.quantity} ${goal.metric === "answered" ? "題" : "輪"}${goal.done ? " · 完成" : ""}</strong>`;
      return entry ? `<a class="daily-goal ${goal.done ? "done" : ""}" href="${esc(F.entryHref(entry, child.id))}">${content}</a>` : `<div class="daily-goal unavailable">${content}<small>活動未開放，請家長調整每日目標。</small></div>`;
    }).join("")}</div>${build ? `<p class="daily-build">${build.completedAt ? "已完成" : "正在拼"}：${esc(title || "積木作品")} · 已放上 ${build.placed.length} / ${totalParts} 組部件</p>` : ""}${state.sync?.status === "offline" || state.sync?.status === "error" ? `<p class="family-connection-notice" role="status">${esc(state.sync.message || "目前離線，已保存的成果會在連線後同步。")}</p>` : ""}</section>`;
  }
  function results() {
    return `<div class="family-row"><button data-view="home">← 首頁</button><h1>我的成果</h1></div><nav class="results-tabs" aria-label="成果分類"><button data-results-tab="collection" aria-pressed="${resultsTab === "collection"}">我的收藏</button><button data-results-tab="records" aria-pressed="${resultsTab === "records"}">學習紀錄</button></nav>${resultsTab === "records" ? stats() : '<div id="collection-workshop"></div>'}`;
  }
  function home() {
    const s = F.summary(child.id),
      tasks = C.todayTasks(profile());
    const entries = C.homeEntries(config, child.id, reg);
    const cards = entries
      .map((entry) => {
        const assigned = tasks.filter((t) => C.taskEntryId(t) === entry.id);
        const href = F.entryHref(entry, child.id);
        const external = new URL(href).origin !== F.base.origin;
        const target = external
          ? ' target="_blank" rel="noopener noreferrer"'
          : "";
        return `<article class="family-activity" data-entry="${esc(entry.id)}">
        <a class="activity-heading" href="${esc(href)}"${target}><h2>${esc(entry.title)}</h2>${entry.id === "nativecamp" ? `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="${esc(new URL("nativecamp/icons.svg#book-open", F.base).href)}"></use></svg>` : entry.mark ? `<span class="symbol" aria-hidden="true">${esc(entry.mark)}</span>` : ""}</a>
        ${entry.id === "mind-map" ? '<button class="activity-history" data-view="mind-maps">過去文章</button>' : ""}
        ${
          assigned.length
            ? `<div class="activity-tasks">${assigned
                .map((t) => {
                  const done = Boolean(s.done[t.occurrence]);
                  const label = `<strong>${esc(C.taskLabel(t))}</strong><span>${done ? "已完成" : `${Math.min(s.tasks[t.occurrence] || 0, t.quantity)} / ${t.quantity} →`}</span>`;
                  return done
                    ? `<div class="activity-task completed">${label}</div>`
                    : `<a class="activity-task" href="${esc(F.taskHref(t, child.id, reg))}">${label}</a>`;
                })
                .join(
                  "",
                )}</div><a class="activity-free" href="${esc(href)}"${target}>自由練習 →</a>`
            : ""
        }
      </article>`;
      })
      .join("");
    return (
      header() +
      dailyGoals() +
      `<div class="family-grid activity-grid">${cards}</div>${!entries.length ? '<p class="family-panel">今天先休息。</p>' : ""}<footer class="family-footer"><span>累計 ${s.total.answered} 題</span></footer>`
    );
  }
  function mindMapHistory() {
    const articles = C.mindMapArticles(reg).slice(1);
    return `<div class="family-row"><button data-view="home">← 首頁</button><h1>過去文章</h1></div><div class="family-articles">${
      articles.map((article) => `<a class="family-article" href="${esc(F.entryHref(article, child.id))}"><strong>${esc(article.title)}</strong><time datetime="${esc(article.date)}">${esc(article.date.replaceAll("-", "/"))}</time></a>`).join("") || '<p class="family-panel">還沒有過去文章。</p>'
    }</div>`;
  }
  function render() {
    if (
      auth &&
      child &&
      auth.state.status === "connected" &&
      !settingsState.available
    ) {
      root.innerHTML = settingsState.offline
        ? '<section class="family-panel"><p role="status">尚未取得家庭設定，請稍後重試。</p><button id="settings-retry">重試</button></section>'
        : '<p role="status">正在讀取家庭設定⋯</p>';
      root.querySelector("#settings-retry")?.addEventListener("click", recover);
      return;
    }
    if (
      auth &&
      child &&
      (auth.state.status === "required" ||
        (!settingsState.available && auth.state.status !== "connected"))
    ) {
      document.title = `${child.name}學習`;
      if (!root.querySelector("#connect-family"))
        auth.renderConnection(root, refresh);
      return;
    }
    if (!child) {
      root.innerHTML = `<h1>選擇入口</h1><div class="family-grid" style="margin-top:28px">${reg.children.map((c) => `<a class="family-tile" href="?child=${c.id}"><img class="family-avatar" src="${F.avatar(c.id, config.children[c.id].avatar)}" alt=""><strong>${esc(c.name)}</strong></a>`).join("")}</div><footer class="family-footer"><a href="parent/">家長後台</a></footer>`;
      return;
    }
    document.title = `${child.name}學習`;
    let icon = document.querySelector('link[rel="apple-touch-icon"]');
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "apple-touch-icon";
      document.head.appendChild(icon);
    }
    icon.href = F.avatar(child.id, profile().avatar);
    if (view === "mind-maps" && !profile().mindMap.enabled) view = "home";
    // 工作台自行訂閱收藏變更；首頁背景更新不得拆掉正在拖曳的零件。
    if (view === "results" && resultsTab === "collection" && workshop && root.querySelector("#collection-workshop")) return;
    workshop?.destroy();
    workshop = null;
    root.innerHTML = view === "results" ? results() : view === "mind-maps" ? mindMapHistory() : home();
    if (view === "results" && resultsTab === "collection") {
      if (collection && window.KidsBrickWorkshop) workshop = window.KidsBrickWorkshop.mount(root.querySelector("#collection-workshop"), {collection, onClose: () => {view = "home"; render();}});
      else root.querySelector("#collection-workshop").textContent = "收藏載入不完整，請重新整理。";
    }
    root.querySelectorAll("[data-results-tab]").forEach(button => button.addEventListener("click", () => {
      resultsTab = button.dataset.resultsTab;
      render();
    }));
    if (settingsState.offline) {
      const notice = document.createElement("p");
      notice.className = "family-connection-notice";
      notice.setAttribute("role", "status");
      notice.textContent = settingsState.error + " ";
      const retry = document.createElement("button");
      retry.textContent = "重試";
      retry.onclick = recover;
      notice.append(retry);
      root.prepend(notice);
    }
    root.querySelectorAll("[data-view]:not([data-action])").forEach((b) =>
      b.addEventListener("click", () => {
        view = b.dataset.view;
        render();
        window.scrollTo(0, 0);
      }),
    );
  }
  async function refresh() {
    if (loading || !reg) return;
    loading = true;
    try {
      settingsState = await F.settings();
      config = settingsState.data;
      render();
      if (collection && (!auth || auth.state.status === "connected")) void collection.refresh().then(() => collection.flush());
      if (child && (!auth || auth.state.status === "connected"))
        F.activity(child.id).then(() => {
          if (!root.querySelector("#connect-family")) render();
        });
    } finally {
      loading = false;
    }
  }
  async function recover() {
    if (!reg) return;
    if (auth) await auth.refresh();
    await refresh();
  }
  const release = document.querySelector?.('meta[name="kids-home-release"]')?.content;
  fetch("registry.json" + (release ? "?v=" + release : ""), { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw Error();
      return r.json();
    })
    .then(async (value) => {
      reg = value;
      child = reg.children.find((c) => c.id === identity.child);
      if (auth) await auth.ready;
      if (child && window.KidsCollection) {
        collection = window.KidsCollection.create(child.id);
        collection.subscribe(() => { if (reg && child) render(); });
      }
      render();
      refresh();
    })
    .catch(() => {
      root.textContent = "頁面載入不完整，請重新整理。";
    });
  window.addEventListener("online", recover);
  window.addEventListener("pageshow", (event) => {
    if (event.persisted && reg) recover();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && reg) recover();
  });
  setInterval(() => {
    if (
      document.visibilityState === "visible" &&
      !root.querySelector("#connect-family")
    )
      refresh();
  }, 30000);
})();
