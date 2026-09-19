(() => {
  const auth = window.KidsAuth;
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
    nativecamp: "Native Camp Review",
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
    child = C.CHILDREN.includes(new URLSearchParams(location.search).get("child")) ? new URLSearchParams(location.search).get("child") : "aiden",
    schedule = "weekly",
    day = "1",
    date = C.dateKey(),
    dirty = false,
    saving = false,
    writeId = null,
    status = "",
    settingsAvailable = false,
    taskApp = "study";
  const sync = { phase: "idle", snapshot: null, checkedAt: null, requestId: 0 };
  const syncTime = (value) =>
    new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(value));
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
  function needsConnection() {
    return auth &&
      auth.state.status !== "connected" &&
      !(auth.state.status === "offline" && F.cachedSettings().available);
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
    if (needsConnection()) {
      if (!root.querySelector("#parent-connection")) {
        root.innerHTML = '<div id="parent-connection"></div>';
        auth.renderConnection(root.querySelector("#parent-connection"), async () => {
          if (dirty) {
            status = "已重新連接，調整尚未儲存。";
            render();
            refreshSync();
          } else await load();
        });
      }
      return;
    }
    if (auth && !settingsAvailable) {
      root.innerHTML =
        '<section class="family-panel"><p role="status">尚未取得家庭設定，請稍後重試。</p><button id="settings-retry">重試</button></section>';
      root.querySelector("#settings-retry").addEventListener("click", load);
      return;
    }
    root.innerHTML = `<section class="family-panel"><p>此入口已記住家庭連線。Safari 與主畫面圖示可能需要各連接一次。</p><button id="disconnect" type="button">中斷此入口連線</button></section><nav class="family-row" aria-label="管理哪個孩子">${reg.children.map((c) => `<button data-child="${c.id}" aria-pressed="${c.id === child}">${esc(c.name)}</button>`).join("")}<a href="${F.homeHref(child)}" style="margin-left:auto">預覽孩子首頁 →</a></nav><section class="family-panel"><h2>頭像</h2><div class="family-row">${["lego", "flat"].map((style) => `<label class="avatar-choice"><img class="family-avatar" src="${F.avatar(child, style)}" alt="${style === "lego" ? "LEGO" : "扁平角色"}"><span><input type="radio" name="avatar" value="${style}" ${profile.avatar === style ? "checked" : ""}> ${style === "lego" ? "LEGO 人偶" : "扁平角色"}</span></label>`).join("")}</div><p class="muted" style="margin-top:16px">網站頭像會套用新設定。已安裝的 iPad 圖示若未更新，需重新加入主畫面。</p></section><section class="family-panel"><h2>首頁活動</h2>${ordered.map((a) => `<div class="app-row"><label><input type="checkbox" data-app="${a.id}" ${profile.apps.includes(a.id) ? "checked" : ""}>${esc(names[a.id])}${a.url ? "<small>外部網站，未納入累計</small>" : ""}</label></div>`).join("")}</section><section class="family-panel"><h2>題庫學期</h2><div class="family-row">${C.TERMS.map((t) => `<label><input type="checkbox" data-term="${t}" ${profile.terms.includes(t) ? "checked" : ""}> ${t === "g4-s1" ? "四上" : "三下"}</label>`).join("")}</div><p class="muted">隱藏後不出現在孩子題庫；舊內容和進度仍保留。至少選一個學期。</p></section>${homeSettings()}<section class="family-panel family-stack"><h2>安排練習（選填）</h2><p class="muted">不安排也可以直接練習。有安排時，進度會顯示在該活動卡內。</p><div class="family-row"><button data-schedule="weekly" aria-pressed="${schedule === "weekly"}">固定週表</button><button data-schedule="overrides" aria-pressed="${schedule === "overrides"}">指定日期</button></div>${schedule === "weekly" ? `<label class="family-field">星期<select id="schedule-day">${days.map((d, i) => `<option value="${i}" ${day === String(i) ? "selected" : ""}>星期${d}</option>`).join("")}</select></label>` : `<label class="family-field">日期<input type="date" id="schedule-date" value="${date}"></label><p class="muted">${Object.hasOwn(profile.overrides, date) ? "當天以這份安排取代週表；留空表示休息。" : "當天沿用週表。加入任務或設定休息後，會取代當天週表。"}</p><div class="family-row"><button id="rest-day">當天休息</button><button id="restore-weekly" ${Object.hasOwn(profile.overrides, date) ? "" : "disabled"}>恢復週表</button></div>`}<div class="family-stack">${
      list()
        .map(
          (t, i) =>
            `<div class="app-row"><span style="flex:1">${esc(names[t.app])} · ${esc(C.taskLabel(t))}${!C.availableTask(t, profile) ? " <small>已隱藏，不會派發</small>" : ""}</span><button data-remove="${i}" aria-label="移除第 ${i + 1} 項任務">移除</button></div>`,
        )
        .join("") || '<p class="muted">這份安排沒有任務。</p>'
    }</div><div id="task-fields" class="family-stack">${taskFields()}</div><p class="muted">以完成練習量計算，不要求全對。孩子仍可自由選其他活動。跨日不累積欠交。</p></section><section class="family-panel"><h2>累計紀錄</h2><div id="parent-stats">讀取中⋯</div><p class="muted">分鐘是頁面使用中的估計值；進入背景、停留超過兩分鐘未操作不計。新累計從改版後開始，既有 App 進度另行保留。</p></section><section class="family-panel"><h2>內容與維護</h2><p class="muted">試玩頁只讀取家庭題包，不會載入或保存孩子進度。</p><div class="family-row" style="margin-top:16px"><a class="button" href="../study/preview.html?child=${child}">四上數學試玩</a>${reg.apps
      .filter((a) => a.path && a.id !== "nonogram")
      .map(
        (a) =>
          a.id === "nativecamp"
            ? `<a class="button" href="../nativecamp/preview.html?child=${child}">Native Camp · Preview questions</a>`
            : `<a class="button" href="../${a.path}?child=${child}&parent=1">${esc(names[a.id])}維護</a>`,
      )
      .join(
        "",
      )}</div></section><div class="savebar"><button id="save" class="primary" ${saving ? "disabled" : ""}>${saving ? "儲存中⋯" : "儲存全部設定"}</button><button id="reload" ${saving ? "disabled" : ""}>重新讀取</button><span id="save-status" role="status">${esc(status)}</span></div>`;
    bind();
    renderStats();
    let syncPanel = document.getElementById("parent-sync");
    if (!syncPanel) {
      syncPanel = document.createElement("section");
      syncPanel.id = "parent-sync";
      syncPanel.className = "family-panel family-stack";
      document.getElementById("parent-stats").closest("section").before(syncPanel);
    }
    renderSync();
    window.NativeCampParent?.mount(root, child);
  }
  function syncSnapshot(body) {
    if (!body || !Array.isArray(body.keys)) throw Error("invalid status");
    const records = new Map();
    for (const record of body.keys) {
      if (
        !record ||
        typeof record.child !== "string" ||
        typeof record.app !== "string"
      )
        throw Error("invalid status");
      // 只使用已知孩子與 App 的進度 metadata；累計串流不代表完整存檔。
      if (!C.CHILDREN.includes(record.child) || !C.APPS.includes(record.app))
        continue;
      const key = record.child + ":" + record.app;
      if (
        records.has(key) ||
        !(
          record.rev === null ||
          (Number.isSafeInteger(record.rev) && record.rev >= 0)
        ) ||
        !(
          record.lastWrite === null ||
          (typeof record.lastWrite === "string" &&
            Number.isFinite(Date.parse(record.lastWrite)) &&
            new Date(record.lastWrite).toISOString() === record.lastWrite)
        )
      )
        throw Error("invalid status");
      records.set(key, { lastWrite: record.lastWrite });
    }
    return records;
  }
  function renderSync() {
    const panel = document.getElementById("parent-sync");
    if (!panel) return;
    const apps = p().apps
      .map((id) => reg.apps.find((a) => a.id === id && a.status === "active"))
      .filter(Boolean);
    const message = {
      idle: "尚未查詢雲端進度。",
      loading: "查詢中⋯",
      ready: "查詢完成。",
      offline: "目前無法連線，請確認網路後重新查詢。",
      error: "同步狀態服務暫時無法使用，請稍後重新查詢。",
      invalid: "同步狀態回應不完整，請稍後重新查詢。",
      required: "家庭連線已失效，請重新連接後再查詢。",
    }[sync.phase];
    panel.innerHTML = `<h2>${esc(reg.children.find((c) => c.id === child).name)}的進度同步</h2>
      <p class="muted">這是雲端收到 App 進度的時間；其他裝置仍可能有尚未上傳的資料。</p>
      <p class="muted">依目前勾選的首頁活動顯示${dirty ? "（含尚未儲存的調整）" : ""}；以下時間皆為臺灣時間。</p>
      <div class="family-row"><button id="sync-refresh" type="button" ${sync.phase === "loading" || saving ? "disabled" : ""}>重新查詢</button>${sync.phase === "required" && auth ? '<button id="sync-reconnect" type="button">重新連接家庭</button>' : ""}<p id="sync-status" role="status">${esc(message)}</p></div>
      ${sync.checkedAt ? `<p class="muted">${sync.phase === "ready" ? "最近查詢" : "上次查詢"}：${esc(syncTime(sync.checkedAt))}${sync.phase === "ready" ? "" : "（舊資料，尚未更新）"}</p>` : ""}
      <dl class="family-sync-list">${apps.map((app) => {
        const record = sync.snapshot?.get(child + ":" + app.id);
        const detail = app.sync !== true
          ? app.url
            ? "外部網站，進度未納入同步。"
            : app.id === "nonogram"
              ? "原有過關進度僅存在本機；新累計另行同步。"
              : "進度僅存在本機。"
          : !sync.snapshot
            ? "尚未取得雲端紀錄"
            : !record
              ? "尚無雲端進度紀錄"
              : record.lastWrite === null
                ? "已有雲端紀錄，接收時間不明"
                : "雲端收到進度：" + syncTime(record.lastWrite);
        return `<div data-sync-app="${esc(app.id)}"><dt>${esc(names[app.id] || app.name)}</dt><dd>${esc(detail)}</dd></div>`;
      }).join("")}</dl>${apps.length ? "" : '<p class="muted">目前未開放首頁活動。</p>'}<div id="sync-connect"></div>`;
    panel.querySelector("#sync-refresh").onclick = refreshSync;
    panel.querySelector("#sync-reconnect")?.addEventListener("click", () => {
      auth.renderConnection(panel.querySelector("#sync-connect"), refreshSync);
    });
  }
  async function refreshSync() {
    if (!document.getElementById("parent-sync")) return;
    const requestId = ++sync.requestId;
    sync.phase = "loading";
    renderSync();
    try {
      const body = await F.request("/v1/status");
      if (requestId !== sync.requestId) return;
      try {
        sync.snapshot = syncSnapshot(body);
      } catch {
        sync.phase = "invalid";
        return;
      }
      sync.checkedAt = new Date().toISOString();
      sync.phase = "ready";
    } catch (error) {
      if (requestId !== sync.requestId) return;
      sync.phase =
        error.status === 401
          ? "required"
          : error.status
            ? "error"
            : error.name === "SyntaxError"
              ? "invalid"
              : "offline";
    } finally {
      // 只更新這一區，保留表單焦點與尚未加入安排的輸入。
      if (requestId === sync.requestId) renderSync();
    }
  }
  function homeSettings() {
    const entries = C.homeEntries(config, child, reg),
      map = p().mindMap,
      latest = C.mindMapArticles(reg)[0];
    return `<section class="family-panel family-stack"><h2>心智圖</h2>
      <label><input id="map-enabled" type="checkbox" ${map.enabled ? "checked" : ""}> 顯示在 ${esc(reg.children.find((c) => c.id === child).name)} 首頁</label>
      <p>${latest ? `最新文章：${esc(latest.title)}` : "尚無文章"}</p>
      <p class="muted">新文章上線後自動更新。孩子可從「過去文章」選舊篇，不會改變首頁預設。新文章內容仍需先製作。</p>
    </section><section class="family-panel family-stack"><h2>常用網站</h2><p class="muted">兩個孩子共用這份清單，可分別勾選顯示對象。外站另開視窗，使用時間與作答不納入累計。</p>
      ${config.websites
        .map(
          (
            site,
          ) => `<fieldset class="website-editor"><legend>${esc(site.title || "新網站")}</legend>
        <label class="family-field">網站名稱<input data-site="${site.id}" data-field="title" maxlength="60" value="${esc(site.title)}"></label>
        <label class="family-field">網站網址<input data-site="${site.id}" data-field="url" inputmode="url" value="${esc(site.url)}" placeholder="https://"></label>
        <div class="family-row">${reg.children.map((c) => `<label><input type="checkbox" data-site-child="${site.id}" data-audience="${c.id}" ${site.children.includes(c.id) ? "checked" : ""}> ${esc(c.name)}</label>`).join("")}<button data-delete-site="${site.id}">移除網站</button></div>
      </fieldset>`,
        )
        .join(
          "",
        )}<button id="add-site" ${config.websites.length >= 30 ? "disabled" : ""}>新增網站</button>
    </section><section class="family-panel"><h2>首頁排序</h2><p class="muted">以下就是目前孩子首頁的卡片；科目依開放學期顯示。</p>
      ${entries.map((entry, i) => `<div class="app-row"><span style="flex:1">${esc(entry.title)}</span><button data-move="${esc(entry.id)}" data-offset="-1" aria-label="${esc(entry.title)}上移" ${i === 0 ? "disabled" : ""}>↑</button><button data-move="${esc(entry.id)}" data-offset="1" aria-label="${esc(entry.title)}下移" ${i === entries.length - 1 ? "disabled" : ""}>↓</button></div>`).join("") || '<p class="muted">沒有顯示中的活動。</p>'}
    </section>`;
  }
  function renderStats() {
    if (!document.getElementById("parent-stats")) return;
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
          refreshSync();
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
          const order = C.homeEntries(config, child, reg).map(
            (entry) => entry.id,
          );
          const i = order.indexOf(b.dataset.move),
            j = i + Number(b.dataset.offset);
          [order[i], order[j]] = [order[j], order[i]];
          p().homeOrder = [
            ...order,
            ...p().homeOrder.filter((id) => !order.includes(id)),
          ];
          change();
          render();
        }),
    );
    document.getElementById("map-enabled").onchange = (e) => {
      p().mindMap.enabled = e.target.checked;
      change();
      render();
    };
    root.querySelectorAll("[data-site]").forEach((input) => {
      input.oninput = () => {
        config.websites.find((s) => s.id === input.dataset.site)[
          input.dataset.field
        ] = input.value;
        change();
      };
    });
    root.querySelectorAll("[data-site-child]").forEach((input) => {
      input.onchange = () => {
        const site = config.websites.find(
            (s) => s.id === input.dataset.siteChild,
          ),
          audience = input.dataset.audience;
        site.children = input.checked
          ? [...site.children, audience]
          : site.children.filter((c) => c !== audience);
        change();
        render();
      };
    });
    root.querySelectorAll("[data-delete-site]").forEach((button) => {
      button.onclick = () => {
        const id = button.dataset.deleteSite;
        config.websites = config.websites.filter((s) => s.id !== id);
        for (const c of C.CHILDREN)
          config.children[c].homeOrder = config.children[c].homeOrder.filter(
            (key) => key !== "website:" + id,
          );
        change();
        render();
      };
    });
    document.getElementById("add-site").onclick = () => {
      config.websites.push({
        id: crypto.randomUUID(),
        title: "",
        url: "",
        children: [child],
      });
      change();
      render();
      [...root.querySelectorAll('[data-site][data-field="title"]')]
        .at(-1)
        ?.focus();
    };
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
    document.getElementById("disconnect").onclick = async () => {
      if (dirty && !confirm("尚有未儲存的調整，仍要中斷這個入口的連線？"))
        return;
      try {
        await auth.disconnect();
        ++sync.requestId;
        sync.snapshot = sync.checkedAt = null;
        sync.phase = "idle";
        dirty = false;
        render();
      } catch (e) {
        document.getElementById("save-status").textContent = e.message;
      }
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
      refreshSync();
    }
  }
  async function load() {
    // 首次連接尚未完成時保留可操作的金鑰表單；成功回呼會再載入設定。
    if (needsConnection()) {
      render();
      return;
    }
    root
      .querySelectorAll("button,input,select")
      .forEach((el) => (el.disabled = true));
    const saveStatus = document.getElementById("save-status");
    if (saveStatus) saveStatus.textContent = "讀取中⋯";
    const result = await F.settings();
    settingsAvailable = result.available;
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
    refreshSync();
    await F.activity(child);
    renderStats();
  }
  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  fetch("../registry.json", { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw Error();
      return r.json();
    })
    .then(async (value) => {
      reg = value;
      if (auth) await auth.ready;
      const cache = F.cachedSettings();
      config = cache.data;
      settingsAvailable = cache.available;
      rev = cache.rev;
      render();
      load();
    })
    .catch(() => {
      root.textContent = "無法讀取活動目錄，請重新整理。";
    });
})();
