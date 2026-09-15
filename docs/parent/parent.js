(() => {
  const F = window.KidsFamily,
    C = F.core,
    root = document.getElementById("parent");
  let storage;
  try {
    storage = localStorage;
  } catch {}
  const identity = KidsSyncV1.bootIdentity(location.search, storage);
  const esc = (s) =>
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
    study: "題庫練習",
    spelling: "英文拼字",
    math: "長除法",
    nonogram: "數織解謎",
    zhuyin: "注音",
    "animal-fight": "動物守護者",
  };
  const days = ["日", "一", "二", "三", "四", "五", "六"];
  const unitNames = {
    1: "三下 自然 1",
    2: "三下 自然 2",
    3: "三下 自然 3",
    4: "三下 自然 4",
    5: "三下 數學 5",
    6: "三下 數學 6",
    7: "三下 數學 7",
    8: "三下 數學 8",
    9: "三下 數學 9",
    10: "三下 社會 4",
    11: "三下 社會 5",
    12: "三下 社會 6",
    13: "三下 國語 13",
    14: "三下 國語 14",
    15: "四上 數學 1",
    16: "四上 數學 2",
    17: "四上 數學 3",
    18: "四上 數學 4",
    19: "四上 數學 5",
  };
  let config = C.defaults(),
    rev = 0,
    reg,
    child = "aiden",
    schedule = "weekly",
    day = "1",
    date = C.dateKey(),
    dirty = false,
    saving = false,
    writeId = null,
    status = "",
    taskApp = "study";
  const p = () => config.children[child];
  const list = () =>
    schedule === "weekly" ? p().weekly[day] || [] : p().overrides[date] || [];
  function change() {
    dirty = true;
    writeId = null;
    status = "尚未儲存";
    document.getElementById("save-status").textContent = status;
  }
  function setList(value) {
    if (schedule === "weekly") p().weekly[day] = value;
    else p().overrides[date] = value;
    change();
  }
  function eligible() {
    return p().apps.filter((id) => C.APPS.slice(0, 5).includes(id));
  }
  function taskFields() {
    const options = eligible();
    if (!options.includes(taskApp)) taskApp = options[0];
    const units = Object.entries(unitNames).filter(([u]) =>
      p().terms.includes(Number(u) >= 15 ? "g4-s1" : "g3-s2"),
    );
    return `<div class="form-grid"><label class="family-field">活動<select id="task-app">${options.map((id) => `<option value="${id}" ${id === taskApp ? "selected" : ""}>${names[id]}</option>`).join("")}</select></label>${taskApp === "study" ? `<label class="family-field">單元<select id="task-unit">${units.map(([id, name]) => `<option value="${id}">${name}</option>`).join("")}</select></label>` : taskApp === "spelling" ? `<label class="family-field">單字組別<select id="task-batch">${Array.from({ length: 20 }, (_, i) => `<option value="${i}">第 ${i + 1} 組</option>`).join("")}</select></label>` : taskApp === "zhuyin" ? '<label class="family-field">內容<select id="task-mode"><option value="all">混合</option><option value="listen">認符號</option><option value="build">拼音節</option></select></label>' : ""}<label class="family-field">${taskApp === "zhuyin" ? "張卡" : taskApp === "spelling" ? "單字數" : "題數"}<input id="task-quantity" type="number" min="1" max="100" value="5"></label></div><button id="add-task" ${!options.length ? "disabled" : ""}>加入安排</button>`;
  }
  function render() {
    const profile = p(),
      activeApps = reg.apps.filter(
        (a) => a.status === "active" && C.APPS.includes(a.id),
      );
    const ordered = [
      ...profile.apps
        .map((id) => activeApps.find((a) => a.id === id))
        .filter(Boolean),
      ...activeApps.filter((a) => !profile.apps.includes(a.id)),
    ];
    root.innerHTML = `<section class="family-panel"><details ${F.getToken() ? "" : "open"}><summary>家庭金鑰：${F.getToken() ? "已設定" : "尚未設定"}</summary><form id="key-form" class="family-row" style="margin-top:12px"><label class="family-field">輸入家庭金鑰<input id="family-key" type="password" autocomplete="off" required></label><button>儲存並連線</button></form><p class="muted">同一台裝置設定一次即可。金鑰不會顯示在畫面上。</p></details></section><nav class="family-row" aria-label="管理哪個孩子">${reg.children.map((c) => `<button data-child="${c.id}" aria-pressed="${c.id === child}">${esc(c.name)}</button>`).join("")}<a href="${F.homeHref(child)}" style="margin-left:auto">預覽孩子首頁 →</a></nav><section class="family-panel"><h2>頭像</h2><div class="family-row">${["lego", "flat"].map((style) => `<label class="avatar-choice"><img class="family-avatar" src="${F.avatar(child, style)}" alt="${style === "lego" ? "LEGO" : "扁平角色"}"><span><input type="radio" name="avatar" value="${style}" ${profile.avatar === style ? "checked" : ""}> ${style === "lego" ? "LEGO 人偶" : "扁平角色"}</span></label>`).join("")}</div><p class="muted" style="margin-top:16px">網站頭像會套用新設定。已安裝的 iPad 圖示若未更新，需重新加入主畫面。</p></section><section class="family-panel"><h2>首頁活動與排序</h2>${ordered.map((a) => `<div class="app-row"><label><input type="checkbox" data-app="${a.id}" ${profile.apps.includes(a.id) ? "checked" : ""}>${esc(names[a.id])}${a.url ? "<small>外部網站，未納入累計</small>" : ""}</label>${profile.apps.includes(a.id) ? `<button data-move="${a.id}" data-offset="-1" aria-label="${names[a.id]}上移" ${profile.apps.indexOf(a.id) === 0 ? "disabled" : ""}>↑</button><button data-move="${a.id}" data-offset="1" aria-label="${names[a.id]}下移" ${profile.apps.indexOf(a.id) === profile.apps.length - 1 ? "disabled" : ""}>↓</button>` : ""}</div>`).join("")}</section><section class="family-panel"><h2>題庫學期</h2><div class="family-row">${C.TERMS.map((t) => `<label><input type="checkbox" data-term="${t}" ${profile.terms.includes(t) ? "checked" : ""}> ${t === "g4-s1" ? "四上" : "三下"}</label>`).join("")}</div><p class="muted">隱藏後不出現在孩子題庫；舊內容和進度仍保留。至少選一個學期。</p></section><section class="family-panel family-stack"><h2>安排練習</h2><div class="family-row"><button data-schedule="weekly" aria-pressed="${schedule === "weekly"}">固定週表</button><button data-schedule="overrides" aria-pressed="${schedule === "overrides"}">指定日期</button></div>${schedule === "weekly" ? `<label class="family-field">星期<select id="schedule-day">${days.map((d, i) => `<option value="${i}" ${day === String(i) ? "selected" : ""}>星期${d}</option>`).join("")}</select></label>` : `<label class="family-field">日期<input type="date" id="schedule-date" value="${date}"></label><p class="muted">${Object.hasOwn(profile.overrides, date) ? "當天以這份安排取代週表；留空表示休息。" : "當天沿用週表。加入任務或設定休息後，會取代當天週表。"}</p><div class="family-row"><button id="rest-day">當天休息</button><button id="restore-weekly" ${Object.hasOwn(profile.overrides, date) ? "" : "disabled"}>恢復週表</button></div>`}<div class="family-stack">${
      list()
        .map(
          (t, i) =>
            `<div class="app-row"><span style="flex:1">${esc(names[t.app])} · ${esc(C.taskLabel(t))}${!C.availableTask(t, profile) ? " <small>已隱藏，不會派發</small>" : ""}</span><button data-remove="${i}" aria-label="移除第 ${i + 1} 項任務">移除</button></div>`,
        )
        .join("") || '<p class="muted">這份安排沒有任務。</p>'
    }</div><div id="task-fields" class="family-stack">${taskFields()}</div><p class="muted">以完成練習量計算，不要求全對。孩子仍可自由選其他活動。跨日不累積欠交。</p></section><section class="family-panel"><h2>累計紀錄</h2><div id="parent-stats">讀取中⋯</div><p class="muted">分鐘是頁面使用中的估計值；進入背景、停留超過兩分鐘未操作不計。新累計從改版後開始，既有 App 進度另行保留。</p></section><section class="family-panel"><h2>內容與維護</h2><p>注音正式錄音仍待補齊，準備完成前部分卡片無法開始。</p><div class="family-row" style="margin-top:16px">${reg.apps
      .filter((a) => a.path && a.id !== "nonogram")
      .map(
        (a) =>
          `<a class="button" href="../${a.path}?child=${child}&parent=1">${esc(names[a.id])}維護</a>`,
      )
      .join(
        "",
      )}</div></section><div class="savebar"><button id="save" class="primary" ${saving ? "disabled" : ""}>${saving ? "儲存中⋯" : "儲存全部設定"}</button><button id="reload" ${saving ? "disabled" : ""}>重新讀取</button><span id="save-status" role="status">${esc(status)}</span></div>`;
    bind();
    renderStats();
  }
  function renderStats() {
    const s = F.summary(child);
    document.getElementById("parent-stats").innerHTML =
      `<p>${s.total.answered} 題 · ${Math.floor(s.total.seconds / 60)} 分鐘 · ${s.finishedTasks} 個任務</p><p class="muted">今天 ${s.today.answered} 題 · ${Math.floor(s.today.seconds / 60)} 分鐘</p>`;
  }
  function bind() {
    root.querySelectorAll("[data-child]").forEach(
      (b) =>
        (b.onclick = () => {
          child = b.dataset.child;
          render();
          F.activity(child).then(renderStats);
        }),
    );
    root.querySelectorAll("[name=avatar]").forEach(
      (b) =>
        (b.onchange = () => {
          p().avatar = b.value;
          change();
        }),
    );
    root.querySelectorAll("[data-app]").forEach(
      (b) =>
        (b.onchange = () => {
          p().apps = b.checked
            ? [...p().apps, b.dataset.app]
            : p().apps.filter((a) => a !== b.dataset.app);
          change();
          render();
        }),
    );
    root.querySelectorAll("[data-move]").forEach(
      (b) =>
        (b.onclick = () => {
          const i = p().apps.indexOf(b.dataset.move),
            j = i + Number(b.dataset.offset);
          [p().apps[i], p().apps[j]] = [p().apps[j], p().apps[i]];
          change();
          render();
        }),
    );
    root.querySelectorAll("[data-term]").forEach(
      (b) =>
        (b.onchange = () => {
          if (!b.checked && p().terms.length === 1) {
            b.checked = true;
            status = "至少保留一個學期";
            document.getElementById("save-status").textContent = status;
            return;
          }
          p().terms = b.checked
            ? [...p().terms, b.dataset.term]
            : p().terms.filter((t) => t !== b.dataset.term);
          change();
          render();
        }),
    );
    root.querySelectorAll("[data-schedule]").forEach(
      (b) =>
        (b.onclick = () => {
          schedule = b.dataset.schedule;
          render();
        }),
    );
    document.getElementById("schedule-day")?.addEventListener("change", (e) => {
      day = e.target.value;
      render();
    });
    document
      .getElementById("schedule-date")
      ?.addEventListener("change", (e) => {
        if (C.validDate(e.target.value)) {
          date = e.target.value;
          render();
        }
      });
    document.getElementById("rest-day")?.addEventListener("click", () => {
      setList([]);
      render();
    });
    document.getElementById("restore-weekly")?.addEventListener("click", () => {
      delete p().overrides[date];
      change();
      render();
    });
    root.querySelectorAll("[data-remove]").forEach(
      (b) =>
        (b.onclick = () => {
          setList(list().filter((_, i) => i !== Number(b.dataset.remove)));
          render();
        }),
    );
    document.getElementById("task-app").onchange = (e) => {
      taskApp = e.target.value;
      render();
    };
    document.getElementById("add-task").onclick = () => {
      try {
        const task = {
          id: crypto.randomUUID(),
          app: taskApp,
          quantity: Number(document.getElementById("task-quantity").value),
        };
        if (taskApp === "study")
          task.unit = Number(document.getElementById("task-unit").value);
        if (taskApp === "spelling")
          task.batch = Number(document.getElementById("task-batch").value);
        if (taskApp === "zhuyin")
          task.mode = document.getElementById("task-mode").value;
        C.validateTask(task);
        if (list().length >= 12) throw Error("每天最多 12 項任務");
        setList([...list(), task]);
        render();
      } catch (e) {
        document.getElementById("save-status").textContent = e.message;
      }
    };
    document.getElementById("key-form").onsubmit = async (e) => {
      e.preventDefault();
      identity.setToken(document.getElementById("family-key").value.trim());
      document.getElementById("family-key").value = "";
      const url = new URL(location.href);
      url.searchParams.delete("k");
      history.replaceState(null, "", url);
      await load();
    };
    document.getElementById("save").onclick = save;
    document.getElementById("reload").onclick = () => {
      if (!dirty || confirm("放棄尚未儲存的調整，重新讀取雲端設定？")) load();
    };
  }
  async function save() {
    if (saving) return;
    saving = true;
    writeId ||= crypto.randomUUID();
    const snapshot = JSON.parse(JSON.stringify(config));
    root
      .querySelectorAll("button,input,select")
      .forEach((el) => (el.disabled = true));
    document.getElementById("save-status").textContent = "儲存中⋯";
    try {
      const result = await F.saveSettings(snapshot, rev, writeId);
      config = result.data;
      rev = result.rev;
      dirty = false;
      writeId = null;
      status = "已儲存，孩子下次回首頁連線後套用。";
    } catch (e) {
      status =
        e.status === 409
          ? e.message
          : "尚未存到雲端。" + e.message + "；調整仍保留，可再按儲存。";
    } finally {
      saving = false;
      render();
    }
  }
  async function load() {
    root
      .querySelectorAll("button,input,select")
      .forEach((el) => (el.disabled = true));
    document.getElementById("save-status").textContent = "讀取中⋯";
    const result = await F.settings();
    if (result.offline) {
      status = "目前使用已存設定。" + result.error;
    } else {
      config = result.data;
      rev = result.rev;
      dirty = false;
      writeId = null;
      status = "已讀取雲端設定";
    }
    render();
    await F.activity(child);
    renderStats();
  }
  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  fetch("../registry.json")
    .then((r) => {
      if (!r.ok) throw Error();
      return r.json();
    })
    .then((value) => {
      reg = value;
      const cache = F.cachedSettings();
      config = cache.data;
      rev = cache.rev;
      render();
      load();
    })
    .catch(() => {
      root.textContent = "無法讀取活動目錄，請重新整理。";
    });
})();
