/* 家庭設定與各 App 共用的練習紀錄；不改寫各 App 原有進度。 */
(() => {
  const core = window.KidsFamilyCore;
  if (!core) return;
  const base = new URL("../", document.currentScript.src);
  const endpoint =
    window.KidsSyncV1?.DEFAULT_ENDPOINT ||
    "https://aiden-kids-sync.huansbox.workers.dev";
  const storage = (() => {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  })();
  const read = (key, fallback = null) => {
    try {
      const value = storage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  };
  const write = (key, value) => {
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  };
  const getToken = () => {
    try {
      return storage.getItem("kids_sync_token") || "";
    } catch {
      return "";
    }
  };
  const uuid = () => crypto.randomUUID();
  function notifyError(message) {
    let el = document.getElementById("family-notice");
    if (!el) {
      el = document.createElement("p");
      el.id = "family-notice";
      el.className = "family-notice";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = message;
  }
  async function request(path, init = {}) {
    const token = getToken();
    if (!token) throw Error("請先設定家庭金鑰");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(endpoint + path, {
        ...init,
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
          ...init.headers,
        },
        signal: controller.signal,
      });
      const body = await response.json();
      if (!response.ok) {
        const error = Error(
          response.status === 401
            ? "家庭金鑰不正確"
            : body.error || "連線未完成，請稍後再試",
        );
        error.status = response.status;
        throw error;
      }
      return body;
    } finally {
      clearTimeout(timer);
    }
  }
  function cachedSettings() {
    const cache = read("family:settings");
    try {
      if (cache && Number.isInteger(cache.rev))
        return { ...cache, data: core.validateSettings(cache.data) };
    } catch {}
    return { rev: 0, data: core.defaults() };
  }
  async function settings() {
    const cached = cachedSettings();
    try {
      const result = await request("/v1/settings");
      if (!Number.isInteger(result.rev) || result.rev < 0)
        throw Error("設定資料不完整");
      result.data = core.validateSettings(result.data);
      if (result.rev < cached.rev) return { ...cached, offline: false };
      write("family:settings", result);
      return { ...result, offline: false };
    } catch (error) {
      return { ...cached, offline: true, error: error.message };
    }
  }
  async function saveSettings(data, rev, writeId = uuid()) {
    const result = await request("/v1/settings", {
      method: "PUT",
      body: JSON.stringify({ data: core.validateSettings(data), rev, writeId }),
    });
    if (!Number.isInteger(result.rev) || result.rev < 0)
      throw Error("設定回應不完整，請重新讀取確認");
    result.data = core.validateSettings(result.data);
    write("family:settings", result);
    return result;
  }
  const localKey = (child, app, device) =>
    `family:stream:${child}:${app}:${device}`;
  const pendingKey = (child, app, device) =>
    `family:pending:${child}:${app}:${device}`;
  function remove(key) {
    try {
      storage.removeItem(key);
    } catch {}
  }
  function localStreams(child) {
    const streams = [];
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key.startsWith(`family:stream:${child}:`)) continue;
        const [, , , app, device] = key.split(":");
        try {
          streams.push({ app, device, data: core.validateStream(read(key)) });
        } catch {}
      }
    } catch {}
    return streams;
  }
  function mergeLists(...lists) {
    const map = new Map();
    for (const list of lists)
      for (const stream of list) {
        if (!core.APPS.includes(stream.app) || !core.idRE.test(stream.device))
          continue;
        let data;
        try {
          data = core.validateStream(stream.data);
        } catch {
          continue;
        }
        const key = stream.app + ":" + stream.device;
        map.set(key, {
          app: stream.app,
          device: stream.device,
          data: core.mergeStreams(
            map.get(key)?.data || core.emptyStream(),
            data,
          ),
        });
      }
    return [...map.values()];
  }
  function cachedStreams(child) {
    const value = read("family:remote:" + child, []);
    return Array.isArray(value) ? value : [];
  }
  async function activity(child) {
    let remote = cachedStreams(child),
      error = null;
    try {
      // 回首頁也補送離線練習；不要求孩子重新進入原 App。
      for (const stream of localStreams(child)) {
        const pending = pendingKey(child, stream.app, stream.device);
        if (!read(pending)) continue;
        const key = localKey(child, stream.app, stream.device),
          snapshot = JSON.stringify(stream.data);
        const sent = await request(
          `/v1/activity/${child}/${stream.app}/${stream.device}`,
          { method: "PUT", body: snapshot },
        );
        remote = mergeLists(remote, [{ ...stream, data: sent.data }]);
        if (JSON.stringify(read(key)) === snapshot) remove(pending);
      }
      let cursor = null;
      const seen = new Set();
      do {
        const result = await request(
          "/v1/activity/" +
            child +
            (cursor ? "?cursor=" + encodeURIComponent(cursor) : ""),
        );
        if (
          !Array.isArray(result.streams) ||
          (result.nextCursor && typeof result.nextCursor !== "string")
        )
          throw Error("統計資料不完整");
        remote = mergeLists(remote, result.streams);
        cursor = result.nextCursor;
        if (cursor && seen.has(cursor)) throw Error("統計分頁無法繼續");
        seen.add(cursor);
      } while (cursor);
      write("family:remote:" + child, remote);
    } catch (e) {
      error = e.message;
    }
    return { streams: mergeLists(remote, localStreams(child)), error };
  }
  function summary(child) {
    return core.summarize(
      mergeLists(cachedStreams(child), localStreams(child)),
    );
  }
  function avatar(child, style = "lego") {
    return new URL(`assets/avatars/${child}-${style}.png`, base).href;
  }
  function homeHref(child) {
    return new URL("?child=" + encodeURIComponent(child), base).href;
  }
  function taskHref(task, child, registry) {
    const app = registry.apps.find((a) => a.id === task.app);
    const url = new URL(app.path, base);
    url.searchParams.set("child", child);
    url.searchParams.set("task", task.id);
    url.searchParams.set("day", task.date);
    return url.href;
  }
  function showReward(label, child) {
    document.getElementById("family-reward")?.remove();
    const el = document.createElement("div");
    el.id = "family-reward";
    el.className = "family-reward";
    el.setAttribute("role", "status");
    const brick = document.createElement("span");
    brick.className = "family-brick";
    brick.setAttribute("aria-hidden", "true");
    const text = document.createElement("strong");
    text.textContent = label;
    const link = document.createElement("a");
    link.href = homeHref(child);
    link.textContent = "回首頁";
    const close = document.createElement("button");
    close.textContent = "繼續";
    close.addEventListener("click", () => el.remove());
    el.append(brick, text, link, close);
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 7000);
  }
  function attach(app, child) {
    if (!core.APPS.includes(app) || !child) return null;
    // 每次開啟有獨立寫入串流，兩個分頁同時練習不會互相覆蓋累計。
    const device = uuid();
    const key = localKey(child, app, device);
    let stream;
    try {
      stream = core.validateStream(read(key, core.emptyStream()));
    } catch {
      stream = core.emptyStream();
    }
    let config = cachedSettings().data;
    let currentTask = null,
      active = false,
      lastInput = performance.now(),
      lastTick = lastInput,
      fraction = 0,
      dirty = false,
      pushing = false,
      pushTimer = null;
    const search = new URLSearchParams(location.search);
    function profile() {
      return (
        config.children[child] ||
        core.defaults().children[app === "zhuyin" ? "bingpu" : "aiden"]
      );
    }
    function allSummary() {
      return core.summarize(
        mergeLists(cachedStreams(child), localStreams(child), [
          { app, device, data: stream },
        ]),
      );
    }
    function persist() {
      if (!write(key, stream))
        notifyError("這台裝置無法保存新的練習紀錄，請家長協助。");
      dirty = true;
      write(pendingKey(child, app, device), true);
      window.dispatchEvent(new CustomEvent("kids:activity"));
      if (!pushTimer)
        pushTimer = setTimeout(() => {
          pushTimer = null;
          flush();
        }, 1500);
    }
    async function flush() {
      if (!dirty || pushing || !getToken()) return;
      pushing = true;
      const snapshot = JSON.stringify(stream);
      dirty = false;
      try {
        const result = await request(`/v1/activity/${child}/${app}/${device}`, {
          method: "PUT",
          body: snapshot,
        });
        stream = core.mergeStreams(stream, core.validateStream(result.data));
        write(key, stream);
        if (!dirty) remove(pendingKey(child, app, device));
      } catch {
        dirty = true;
      } finally {
        pushing = false;
      }
    }
    function beacon() {
      if ((dirty || pushing) && getToken() && navigator.sendBeacon) {
        // Safari 在背景可能立即凍結；text/plain 不需預檢，重送由 stream 合併去重。
        navigator.sendBeacon(
          `${endpoint}/v1/activity/${child}/${app}/${device}?k=${encodeURIComponent(getToken())}`,
          new Blob([JSON.stringify(stream)], { type: "text/plain" }),
        );
      }
    }
    function tick() {
      const now = performance.now();
      if (active && document.visibilityState !== "hidden") {
        fraction +=
          Math.max(0, Math.min(now, lastInput + 120000) - lastTick) / 1000;
        const seconds = Math.floor(fraction);
        if (seconds > 0) {
          const day = core.dateKey();
          stream.days[day] ||= {
            completed: 0,
            answered: 0,
            correct: 0,
            seconds: 0,
          };
          stream.days[day].seconds = Math.min(
            86400,
            stream.days[day].seconds + seconds,
          );
          fraction -= seconds;
          persist();
        }
      }
      lastTick = now;
    }
    function setActive(value) {
      tick();
      active = !!value;
      lastInput = lastTick = performance.now();
    }
    function matches(details) {
      if (!currentTask || currentTask.date !== core.dateKey()) return false;
      if (app === "study")
        return details.answered && details.unit === currentTask.unit;
      if (app === "spelling")
        return details.answered && details.batch === currentTask.batch;
      if (app === "zhuyin")
        return currentTask.mode === "all" || details.mode === currentTask.mode;
      return true;
    }
    function record(details = {}) {
      tick();
      const before = allSummary(),
        day = core.dateKey();
      stream.days[day] ||= {
        completed: 0,
        answered: 0,
        correct: 0,
        seconds: 0,
      };
      const values = stream.days[day];
      values.completed++;
      if (details.answered) {
        values.answered++;
        if (details.correct) values.correct++;
      }
      if (matches(details))
        stream.tasks[currentTask.occurrence] =
          (stream.tasks[currentTask.occurrence] || 0) + 1;
      let next = allSummary();
      const justDone =
        currentTask &&
        !next.done[currentTask.occurrence] &&
        (next.tasks[currentTask.occurrence] || 0) >= currentTask.quantity;
      if (justDone) {
        stream.done[currentTask.occurrence] = 1;
        next = allSummary();
        showReward("任務完成", child);
      }
      const previous = new Set(core.earnedBadges(before).map((b) => b.id));
      const earned = core.earnedBadges(next).filter((b) => !previous.has(b.id));
      if (earned.length && !justDone)
        showReward("新徽章：" + earned.at(-1).label, child);
      persist();
      return { taskDone: justDone, summary: next };
    }
    const ready = Promise.all([settings(), activity(child)]).then(
      ([result]) => {
        config = result.data;
        const day = search.get("day");
        if (day === core.dateKey())
          currentTask =
            core
              .todayTasks(profile(), day)
              .find((t) => t.id === search.get("task") && t.app === app) ||
            null;
        if (read(key)) dirty = true;
        flush();
        return context;
      },
    );
    const context = {
      ready,
      profile,
      record,
      setActive,
      flush,
      summary: allSummary,
      task: () => currentTask,
      remaining: () =>
        currentTask
          ? Math.max(
              0,
              currentTask.quantity -
                (allSummary().tasks[currentTask.occurrence] || 0),
            )
          : null,
    };
    for (const event of ["pointerdown", "keydown", "touchstart"])
      window.addEventListener(
        event,
        () => {
          tick();
          lastInput = performance.now();
        },
        { passive: true },
      );
    setInterval(() => {
      tick();
      flush();
    }, 15000);
    document.addEventListener("visibilitychange", () => {
      // hidden 事件到達時仍須結清進入背景前的一小段；以事件時點截止。
      if (document.visibilityState === "hidden") {
        const wasActive = active;
        active = false;
        if (wasActive) {
          fraction +=
            Math.max(
              0,
              Math.min(performance.now(), lastInput + 120000) - lastTick,
            ) / 1000;
          const seconds = Math.floor(fraction);
          if (seconds > 0) {
            const day = core.dateKey();
            stream.days[day] ||= {
              completed: 0,
              answered: 0,
              correct: 0,
              seconds: 0,
            };
            stream.days[day].seconds = Math.min(
              86400,
              stream.days[day].seconds + seconds,
            );
            fraction -= seconds;
            persist();
          }
        }
        active = wasActive;
        lastTick = performance.now();
        beacon();
      } else {
        lastTick = lastInput = performance.now();
        flush();
      }
    });
    window.addEventListener("pagehide", () => {
      tick();
      beacon();
    });
    window.addEventListener("online", flush);
    return context;
  }
  window.KidsFamily = {
    core,
    base,
    request,
    getToken,
    settings,
    cachedSettings,
    saveSettings,
    activity,
    summary,
    avatar,
    homeHref,
    taskHref,
    attach,
    read,
    write,
    notifyError,
  };
})();
