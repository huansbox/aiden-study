(() => {
  const F = window.KidsFamily,
    root = document.getElementById("hub");
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
  const marks = {
    study: "＋−",
    math: "÷",
    spelling: "Aa",
    nonogram: "▦",
    zhuyin: "ㄅㄆ",
    "animal-fight": "足",
  };
  let reg,
    child,
    config = F.cachedSettings().data,
    view = "home",
    loading = false;
  const profile = () => config.children[child.id];
  const minutes = (n) => Math.floor(n / 60);
  const appURL = (app) =>
    app.path ? new URL(app.path + "?child=" + child.id, F.base).href : app.url;
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
      apps = profile()
        .apps.map((id) =>
          reg.apps.find((a) => a.id === id && a.status === "active"),
        )
        .filter(Boolean);
    const tasks = C.todayTasks(profile()),
      first = tasks.find((t) => !s.done[t.occurrence]);
    const firstApp = first ? apps.find((a) => a.id === first.app) : apps[0];
    let hero = "";
    if (firstApp) {
      const label =
        firstApp.id === "study" &&
        (first?.unit >= 15 ||
          (!first &&
            profile().terms.length === 1 &&
            profile().terms[0] === "g4-s1"))
          ? "數學"
          : names[firstApp.id];
      hero = `<section class="family-hero"><div><h2>${esc(label)}</h2>${first ? `<p>${esc(C.taskLabel(first))}</p>` : '<div style="height:22px"></div>'}<a class="button primary" href="${esc(first ? F.taskHref(first, child.id, reg) : appURL(firstApp))}">${first ? "開始任務" : "開始練習"} →</a></div><span class="family-mark" aria-hidden="true">${marks[firstApp.id]}</span></section>`;
    }
    return (
      header() +
      hero +
      (tasks.length
        ? `<div class="family-tasks">${tasks.map((t) => `<a class="family-task" href="${esc(F.taskHref(t, child.id, reg))}"><strong>${esc(names[t.app])}　${esc(C.taskLabel(t))}</strong><span class="count">${s.done[t.occurrence] ? "已完成" : `${Math.min(s.tasks[t.occurrence] || 0, t.quantity)} / ${t.quantity}`} →</span></a>`).join("")}</div>`
        : "") +
      `<div class="family-grid">${apps.map((a) => `<a class="family-tile" href="${esc(appURL(a))}"><strong>${esc(names[a.id])}</strong><span class="symbol" aria-hidden="true">${marks[a.id]}</span></a>`).join("")}</div>${!apps.length ? '<p class="family-panel">今天先休息。</p>' : ""}<footer class="family-footer"><span>累計 ${s.total.answered} 題</span><button data-view="stats">積木收藏 →</button></footer>`
    );
  }
  function render() {
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
    root.querySelectorAll("[data-view]").forEach((b) =>
      b.addEventListener("click", () => {
        view = b.dataset.view;
        render();
        window.scrollTo(0, 0);
      }),
    );
  }
  async function refresh() {
    if (loading) return;
    loading = true;
    try {
      const [settings] = await Promise.all([
        F.settings(),
        child ? F.activity(child.id) : Promise.resolve(),
      ]);
      config = settings.data;
      render();
    } finally {
      loading = false;
    }
  }
  fetch("registry.json")
    .then((r) => {
      if (!r.ok) throw Error();
      return r.json();
    })
    .then((value) => {
      reg = value;
      child = reg.children.find((c) => c.id === identity.child);
      render();
      refresh();
    })
    .catch(() => {
      root.textContent = "頁面載入不完整，請重新整理。";
    });
  window.addEventListener("online", refresh);
  window.addEventListener("pageshow", (event) => {
    if (event.persisted && reg) refresh();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && reg) refresh();
  });
})();
