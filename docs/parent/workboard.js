/* Read-only work catalog. This module owns only #workboard, never the settings form. */
(() => {
  const STATUS = { unknown: "未標記", "in-progress": "製作中", complete: "已完成", paused: "暫停" };
  const AVAILABILITY = { available: "有可用成品", "source-only": "來源與說明", private: "私用素材", unknown: "待確認" };
  const AUDIENCE = { aiden: "哥哥", bingpu: "弟弟" };
  const MAX_AGE = 48 * 60 * 60 * 1000;
  const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const date = (value) => value === null || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
  function safeURL(value, base) {
    if (typeof value !== "string" || !value.trim()) throw Error("Invalid catalog URL");
    const url = new URL(value, base);
    if (url.username || url.password || !(url.protocol === "https:" || (url.protocol === "http:" && url.origin === new URL(base).origin))) throw Error("Unsafe catalog URL");
    return value;
  }
  function readCatalog(body, base) {
    if (!body || body.schemaVersion !== 1 || !Array.isArray(body.works)) throw Error("Invalid work catalog");
    const ids = new Set();
    for (const work of body.works) {
      if (!work || typeof work.id !== "string" || !work.id || ids.has(work.id) || !["app", "task"].includes(work.type) || typeof work.name !== "string" || !work.name.trim() || !Object.hasOwn(STATUS, work.status) || !Object.hasOwn(AVAILABILITY, work.availability) || typeof work.location !== "string" || !Array.isArray(work.audience) || !work.audience.every((id) => typeof id === "string") || !date(work.created) || !date(work.updated)) throw Error("Invalid catalog work");
      ids.add(work.id);
      if (!work.source || typeof work.source.repo !== "string" || typeof work.source.ref !== "string" || !Array.isArray(work.source.paths) || !work.source.paths.every((path) => typeof path === "string") || typeof work.source.remote !== "boolean") throw Error("Invalid work source");
      if (work.groupId != null && (typeof work.groupId !== "string" || !work.groupId || typeof work.groupName !== "string" || !work.groupName.trim())) throw Error("Invalid work group");
      if (!work.freshness || !["current", "stale", "unknown"].includes(work.freshness.state) || (work.freshness.checkedAt != null && !Number.isFinite(Date.parse(work.freshness.checkedAt)))) throw Error("Invalid work freshness");
      safeURL(work.sourceUrl, base);
      if (!Array.isArray(work.links)) throw Error("Invalid work links");
      for (const link of work.links) {
        if (!link || typeof link.label !== "string") throw Error("Invalid work link");
        safeURL(link.url, base);
      }
      for (const key of ["audienceLabel", "statusNote", "description"]) if (work[key] != null && typeof work[key] !== "string") throw Error("Invalid work text");
      if (work.eventDate != null && typeof work.eventDate !== "string") throw Error("Invalid event date");
    }
    return body.works;
  }
  function groups(works) {
    const grouped = new Map();
    for (const work of works) {
      const id = work.groupId ? "group:" + work.groupId : work.id;
      if (!grouped.has(id)) grouped.set(id, []);
      grouped.get(id).push(work);
    }
    return [...grouped].map(([id, members]) => {
      const primary = members.find((work) => work.type === "app") || members[0];
      const created = members.map((work) => work.created).filter(Boolean).sort();
      const updated = members.map((work) => work.updated).filter(Boolean).sort();
      return { ...primary, id, primary, members, name: members.length > 1 ? primary.groupName : primary.name, created: created[0] || null, updated: updated.at(-1) || null };
    });
  }
  function matches(work, state) {
    return (state.audience === "all" || (state.audience === "other" ? !work.audience.length : work.audience.includes(state.audience))) &&
      (state.type === "all" || state.type === work.type) &&
      (state.status === "all" || state.status === work.status) &&
      [work.name, work.location, work.description, work.statusNote, work.groupName, work.source.repo, work.source.ref].join(" ").toLocaleLowerCase().includes(state.search.trim().toLocaleLowerCase());
  }
  function filterGroups(items, state) {
    return items.filter((item) => item.members.some((work) => matches(work, state))).sort((a, b) =>
      (state.sort === "name" ? a.name.localeCompare(b.name, "zh-Hant") : String(b.updated || "").localeCompare(a.updated || "")) || a.name.localeCompare(b.name, "zh-Hant"));
  }
  function freshness(work, now = Date.now()) {
    if (work.freshness.state === "stale") return "stale";
    if (work.freshness.state === "unknown") return "unknown";
    if (work.source.remote) {
      if (!work.freshness.checkedAt) return "unknown";
      if (now - Date.parse(work.freshness.checkedAt) > MAX_AGE) return "stale";
    }
    return "current";
  }
  const displayDate = (value) => value ? `<time datetime="${esc(value)}">${esc(value)}</time>` : '<span title="來源日期未知" aria-label="來源日期未知">—</span>';
  const badge = (work) => `<span class="wb-badge ${work.status}">${STATUS[work.status]}</span>`;
  const audience = (work) => work.audienceLabel || work.audience.map((id) => AUDIENCE[id] || id).join("、") || "未設定";
  const locationLink = (work) => `<a class="wb-location" href="${esc(work.sourceUrl)}" target="_blank" rel="noopener noreferrer" aria-label="來源位置 ${esc(work.location)}">${esc(work.location).replaceAll("/", "/<wbr>")}</a>`;
  function freshnessHTML(members) {
    const states = members.map((work) => freshness(work));
    return states.includes("stale") ? '<span class="wb-freshness stale">可能過期</span>' : states.includes("unknown") ? '<span class="wb-freshness unknown">來源尚未查核</span>' : "";
  }
  function mount(root, { fetcher = window.fetch.bind(window), base = location.href } = {}) {
    const state = { search: "", audience: "all", type: "all", status: "all", sort: "recent" };
    const expanded = new Set();
    const filterCollapsed = new Set();
    const filtering = () => Boolean(state.search.trim() || state.audience !== "all" || state.type !== "all" || state.status !== "all");
    const autoExpanded = (item) => filtering() && item.members.some((work) => matches(work, state));
    const isExpanded = (item) => autoExpanded(item) ? !filterCollapsed.has(item.id) : expanded.has(item.id);
    let works = null, items = [], sequence = 0, phase = "loading", lastFocus;
    root.innerHTML = `<div class="wb-summary" id="wb-summary" role="group" aria-label="依工作狀態篩選"></div>
      <div class="wb-toolbar"><label class="wb-search"><span class="wb-sr-only">搜尋作品或來源位置</span><input id="wb-search" type="search" placeholder="搜尋作品或位置"></label>
      <label><span class="wb-sr-only">對象</span><select id="wb-audience" aria-label="對象"><option value="all">全部對象</option><option value="aiden">哥哥</option><option value="bingpu">弟弟</option><option value="other">家長／未設定</option></select></label>
      <label><span class="wb-sr-only">類型</span><select id="wb-type" aria-label="類型"><option value="all">全部類型</option><option value="app">App</option><option value="task">學習任務</option></select></label>
      <label><span class="wb-sr-only">排序</span><select id="wb-sort" aria-label="排序"><option value="recent">update 新到舊</option><option value="name">作品名稱</option></select></label><button id="wb-reset" type="button" class="wb-reset">清除</button></div>
      <div class="wb-result-meta"><span id="wb-count" role="status"></span><div><button id="wb-date-help" type="button" class="wb-text-button">日期說明</button><button id="wb-refresh" type="button" class="wb-text-button">重新載入白板</button></div></div>
      <p id="wb-load-status" class="wb-load-status" role="status"></p><div id="wb-results"></div><dialog id="wb-detail" aria-labelledby="wb-detail-title"></dialog>`;
    const find = (selector) => root.querySelector(selector);
    const dialog = find("#wb-detail");
    dialog.addEventListener("close", () => (lastFocus?.isConnected === false ? find("#wb-search") : lastFocus)?.focus());
    function showDialog(html, trigger) {
      lastFocus = trigger;
      dialog.innerHTML = `<div class="wb-dialog-top"><span>作品資料</span><button type="button" id="wb-detail-close" aria-label="關閉詳情">×</button></div>${html}`;
      dialog.querySelector("#wb-detail-close").onclick = () => dialog.close();
      dialog.showModal();
    }
    function productURL(value) {
      const target = new URL(value, base), preview = new URL("../nativecamp/preview.html", base);
      if (target.origin !== preview.origin || target.pathname !== preview.pathname) return value;
      const selected = document.getElementById("parent")?.querySelector('[data-child][aria-pressed="true"]')?.dataset.child;
      const fromURL = new URL(location.href).searchParams.get("child");
      const child = [selected, fromURL].find((id) => id === "aiden" || id === "bingpu") || "aiden";
      target.searchParams.set("child", child);
      target.searchParams.delete("k");
      return "../nativecamp/preview.html" + target.search + target.hash;
    }
    function detail(work, trigger) {
      const checked = work.freshness.checkedAt ? new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", dateStyle: "medium", timeStyle: "short" }).format(new Date(work.freshness.checkedAt)) : "—";
      showDialog(`<h2 id="wb-detail-title">${esc(work.name)}</h2><p class="wb-detail-kind">${work.type === "app" ? "App" : "學習任務"} · ${esc(audience(work))}</p><div class="wb-detail-badges">${badge(work)}<span>${AVAILABILITY[work.availability]}</span>${freshnessHTML([work])}</div>
        ${work.statusNote ? `<p class="wb-detail-note">${esc(work.statusNote)}</p>` : ""}${work.description ? `<p class="wb-detail-note">${esc(work.description)}</p>` : ""}
        <dl><div><dt>create</dt><dd>${displayDate(work.created)}</dd></div><div><dt>update</dt><dd>${displayDate(work.updated)}</dd></div>${work.eventDate ? `<div><dt>活動日期</dt><dd>${esc(work.eventDate)}</dd></div>` : ""}<div><dt>來源位置</dt><dd>${locationLink(work)}</dd></div><div><dt>來源分支</dt><dd>${esc(work.source.ref)}</dd></div>${work.source.remote ? `<div><dt>成功查核</dt><dd>${esc(checked)}（臺灣時間）</dd></div>` : ""}</dl>
        ${freshness(work) === "stale" ? '<p class="wb-detail-note">遠端查核失敗，或超過 48 小時未成功查核；目前保留上次已知資料，可能過期。</p>' : freshness(work) === "unknown" ? '<p class="wb-detail-note">尚未取得可確認的來源資料；未知不代表沒有作品。</p>' : ""}
        <p class="wb-detail-note">工作狀態不等於 App 上下架或孩子完成練習。可用成品不代表來源分支已合併；家中未推送的修改不會出現在白板。</p><div class="wb-detail-links">${work.links.map((link) => `<a href="${esc(productURL(link.url))}" target="_blank" rel="noopener noreferrer">${esc(link.label)}</a>`).join("")}<a href="${esc(work.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看來源</a></div>`, trigger);
    }
    function row(work, { group, member = false } = {}) {
      const grouped = group && group.members.length > 1;
      const primary = group ? group.primary : work;
      return `<tr${member ? ' class="wb-member"' : ""}><td><button type="button" class="wb-title-button" data-wb-detail="${esc(primary.id)}">${esc(work.name)}</button>${member && filtering() && matches(work, state) ? '<span class="wb-match">符合篩選</span>' : ""}${locationLink(primary)}${grouped ? `<button type="button" class="wb-expand" data-wb-expand="${esc(group.id)}" aria-expanded="${isExpanded(group)}" aria-controls="wb-members-${encodeURIComponent(group.id)}">${isExpanded(group) ? "收合" : "展開"} ${group.members.length} 份作品／素材</button>` : ""}</td><td>${esc(audience(primary))}</td><td>${badge(primary)}${grouped ? '<span class="wb-cell-note">主項目；各份見展開</span>' : ""}</td><td class="wb-availability">${AVAILABILITY[primary.availability]}${freshnessHTML(group ? group.members : [work])}</td><td class="wb-date">${displayDate(work.created)}</td><td class="wb-date">${displayDate(work.updated)}</td></tr>`;
    }
    function renderResults(focusGroup) {
      const filtered = filterGroups(items, state);
      find("#wb-count").textContent = works ? `${filtered.length} / ${items.length} 列 · 共 ${works.length} 份作品／素材` : "";
      find("#wb-summary").hidden = works === null;
      find("#wb-summary").innerHTML = works === null ? "" : [["all", "全部"], ...Object.entries(STATUS)].map(([key, label]) => `<button type="button" data-wb-status="${key}" aria-pressed="${state.status === key}">${label}<span>${key === "all" ? items.length : items.filter((item) => item.members.some((work) => work.status === key)).length}</span></button>`).join("");
      find("#wb-summary").querySelectorAll("[data-wb-status]").forEach((button) => {
        button.onclick = () => { state.status = button.dataset.wbStatus; filterCollapsed.clear(); renderResults(); find(`[data-wb-status="${state.status}"]`).focus(); };
      });
      const results = find("#wb-results");
      if (!works) results.innerHTML = "";
      else if (!filtered.length) results.innerHTML = `<div class="wb-empty"><p>${works.length ? "沒有符合的作品，請調整搜尋或篩選。" : "目前沒有已登錄作品。"}</p></div>`;
      else results.innerHTML = `<div class="wb-table-wrap" tabindex="0" role="region" aria-label="作品清單，可左右捲動"><table class="wb-table"><colgroup><col class="wb-col-project"><col class="wb-col-audience"><col class="wb-col-status"><col class="wb-col-version"><col class="wb-col-date"><col class="wb-col-date"></colgroup><thead><tr><th scope="col">作品 / 位置</th><th scope="col">對象</th><th scope="col">狀態</th><th scope="col">可用版本</th><th scope="col" title="目前來源範圍首次 Git 收錄">create</th><th scope="col" title="來源範圍最近 Git 變更">update</th></tr></thead>${filtered.map((item) => `<tbody>${row(item, { group: item })}</tbody>${item.members.length > 1 ? `<tbody id="wb-members-${encodeURIComponent(item.id)}"${isExpanded(item) ? "" : " hidden"}>${item.members.map((member) => row(member, { member: true })).join("")}</tbody>` : ""}`).join("")}</table></div>`;
      results.querySelectorAll("[data-wb-detail]").forEach((button) => { button.onclick = () => detail(works.find((work) => work.id === button.dataset.wbDetail), button); });
      results.querySelectorAll("[data-wb-expand]").forEach((button) => {
        button.onclick = () => {
          const id = button.dataset.wbExpand;
          if (autoExpanded(items.find((item) => item.id === id))) {
            if (filterCollapsed.has(id)) filterCollapsed.delete(id); else filterCollapsed.add(id);
          } else if (expanded.has(id)) expanded.delete(id); else expanded.add(id);
          renderResults(id);
        };
      });
      if (focusGroup) [...results.querySelectorAll("[data-wb-expand]")].find((button) => button.dataset.wbExpand === focusGroup)?.focus();
    }
    function showLoadState() {
      find("#wb-refresh").setAttribute("aria-disabled", String(phase === "loading"));
      find("#wb-load-status").textContent = phase === "loading" ? (works ? "正在重新載入；目前仍顯示上次清單。" : "作品清單載入中⋯") : phase === "error" ? (works ? "白板更新失敗；保留上次清單，資料可能過期。請重新載入。" : "無法載入作品清單；這不代表沒有作品。請重新載入，或切換到孩子設定。") : "";
    }
    async function refresh() {
      const current = ++sequence;
      phase = "loading";
      showLoadState();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetcher(new URL("./work-catalog.json", base).href, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw Error("Catalog load failed");
        const next = readCatalog(await response.json(), base);
        if (current !== sequence) return;
        works = next;
        items = groups(works);
        phase = "ready";
        renderResults();
      } catch {
        if (current !== sequence) return;
        phase = "error";
      } finally {
        clearTimeout(timeout);
        if (current === sequence) showLoadState();
      }
    }
    find("#wb-search").oninput = (event) => {
      state.search = event.target.value;
      filterCollapsed.clear();
      renderResults();
    };
    for (const field of ["audience", "type", "sort"]) find(`#wb-${field}`).onchange = (event) => { state[field] = event.target.value; if (field !== "sort") filterCollapsed.clear(); renderResults(); };
    find("#wb-reset").onclick = () => {
      Object.assign(state, { search: "", audience: "all", type: "all", status: "all", sort: "recent" });
      for (const field of ["search", "audience", "type", "sort"]) find(`#wb-${field}`).value = state[field];
      filterCollapsed.clear();
      renderResults();
    };
    find("#wb-date-help").onclick = (event) => showDialog('<h2 id="wb-detail-title">create / update</h2><dl><div><dt>create</dt><dd>目前來源位置首次收錄於 Git 的日期，不保證是搬移前最早誕生日。</dd></div><div><dt>update</dt><dd>來源範圍最近一次 Git 變更，包含文件與素材。</dd></div></dl><p class="wb-detail-note">系列 create 取最早已知日期，update 取最新已知日期；展開可看各份來源。未知日期顯示「—」，不混入活動日、部署日、孩子作答或同步檢查時間。</p><p class="wb-detail-note">外部來源每天查核；失敗或超過 48 小時未成功查核時標示可能過期。這不是住家電腦的即時開發狀態。</p>', event.target);
    find("#wb-refresh").onclick = () => { if (phase !== "loading") return refresh(); };
    renderResults();
    refresh();
    return { refresh };
  }
  function start() {
    const root = document.getElementById("workboard"), parent = document.getElementById("parent"), nav = document.getElementById("parent-views");
    if (!root || !parent || !nav) return;
    mount(root);
    nav.hidden = false;
    const buttons = nav.querySelectorAll("[data-parent-view]");
    function select(view) {
      root.hidden = view !== "workboard";
      parent.hidden = view !== "settings";
      buttons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.parentView === view)));
    }
    buttons.forEach((button) => { button.onclick = () => select(button.dataset.parentView); });
    const query = new URL(location.href).searchParams;
    // Existing links open a child's settings or return from a specific lesson preview.
    select(["child", "lesson"].some((key) => query.has(key)) ? "settings" : "workboard");
    const connection = nav.querySelector("#wb-connection-help"), auth = window.KidsAuth;
    function showConnection() {
      const status = auth?.state.status;
      connection.hidden = !auth || status === "connected" || status === "checking";
      connection.textContent = status === "required" ? "家庭尚未連線" : "檢查家庭連線";
    }
    connection.onclick = () => { select("settings"); parent.querySelector('[name="key"]')?.focus(); };
    window.addEventListener("kids:connection", showConnection);
    auth?.ready.then(showConnection, showConnection);
    showConnection();
  }
  window.KidsWorkboard = { readCatalog, groups, filterGroups, freshness, mount };
  if (typeof document !== "undefined") start();
})();
