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
    nonogram: "數織",
    zhuyin: "注音",
    "animal-fight": "動物守護者",
  };
  let reg,
    child,
    settingsState = F.cachedSettings(),
    config = settingsState.data,
    view = "home",
    loading = false;
  const profile = () => config.children[child.id];
  const minutes = (n) => Math.floor(n / 60);
  function header() {
    const s = F.summary(child.id);
    return `<header class="family-header"><div class="family-person"><img class="family-avatar" src="${F.avatar(child.id, profile().avatar)}" alt=""><h1>${esc(child.name)}</h1></div><button class="family-stats-link" data-view="stats">今天 ${s.today.answered} 題 · ${minutes(s.today.seconds)} 分鐘<br>查看累計 →</button></header>`;
  }
  function stats() {
    const s = F.summary(child.id),
      earned = new Set(C.earnedBadges(s).map((b) => b.id));
    return `<div class="family-row"><button data-view="home">← 首頁</button><h1>我的累計</h1></div><section class="family-panel"><h2>今天</h2><div class="family-metrics"><div class="family-metric"><strong>${s.today.answered}</strong><span>題</span></div><div class="family-metric"><strong>${minutes(s.today.seconds)}</strong><span>分鐘</span></div></div></section><section class="family-panel"><h2>累計</h2><div class="family-metrics"><div class="family-metric"><strong>${s.total.answered}</strong><span>題</span></div><div class="family-metric"><strong>${minutes(s.total.seconds)}</strong><span>分鐘</span></div></div><p style="margin-top:20px">${s.finishedTasks} 個任務完成</p></section><section class="family-panel"><h2>各項練習</h2><table class="family-detail"><thead><tr><th>活動</th><th>作答</th><th>閱讀卡片</th><th>分鐘</th></tr></thead><tbody>${
      Object.entries(s.apps)
        .map(
          ([id, v]) =>
            `<tr><td>${esc(names[id] || id)}</td><td>${v.answered}</td><td>${v.completed - v.answered}</td><td>${minutes(v.seconds)}</td></tr>`,
        )
        .join("") || '<tr><td colspan="4">完成練習就會出現在這裡。</td></tr>'
    }</tbody></table></section><h2 style="margin:26px 0 16px">積木收藏</h2><div class="family-badges">${C.BADGES.map((b) => `<div class="family-badge ${earned.has(b.id) ? "" : "locked"}"><span class="family-brick ${b.color}" aria-hidden="true"></span><strong>${b.label}</strong><small>${earned.has(b.id) ? "已收藏" : `${b.goal} ${b.metric === "tasks" ? "個任務" : "題"}`}</small></div>`).join("")}</div>`;
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
        <a class="activity-heading" href="${esc(href)}"${target}><div><h2>${esc(entry.title)}</h2>${entry.subtitle ? `<p>${esc(entry.subtitle)}</p>` : ""}</div><span class="symbol" aria-hidden="true">${esc(entry.mark)}</span></a>
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
      `<div class="family-grid activity-grid">${cards}</div>${!entries.length ? '<p class="family-panel">今天先休息。</p>' : ""}<footer class="family-footer"><span>累計 ${s.total.answered} 題</span><button data-view="stats">積木收藏 →</button></footer>`
    );
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
    root.innerHTML = view === "stats" ? stats() : home();
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
    root.querySelectorAll("[data-view]").forEach((b) =>
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
  fetch("registry.json")
    .then((r) => {
      if (!r.ok) throw Error();
      return r.json();
    })
    .then(async (value) => {
      reg = value;
      child = reg.children.find((c) => c.id === identity.child);
      if (auth) await auth.ready;
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
