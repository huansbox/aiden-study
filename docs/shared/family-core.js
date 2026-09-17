/* 家庭設定、日期與累計規則：瀏覽器與 Worker 共用。 */
(() => {
  const CHILDREN = ["aiden", "bingpu"];
  const APPS = [
    "study",
    "math",
    "spelling",
    "nonogram",
    "zhuyin",
    "animal-fight",
    "nativecamp",
  ];
  const TERMS = ["g3-s2", "g4-s1"];
  const SUBJECTS = {
    math: { title: "數學", mark: "＋−", terms: ["g4-s1", "g3-s2"] },
    social: { title: "社會", mark: "世", terms: ["g3-s2"] },
    science: { title: "自然", mark: "葉", terms: ["g3-s2"] },
    chinese: { title: "國語", mark: "文", terms: ["g3-s2"] },
  };
  const APP_LABELS = {
    math: ["長除法", "÷"],
    spelling: ["英文", "Aa"],
    nonogram: ["數織", "▦"],
    zhuyin: ["注音", "ㄅㄆ"],
    "animal-fight": ["動物守護者", "足"],
    nativecamp: ["Native Camp Review", "Aa"],
  };
  // title/url 保留與既有 Worker 相容；新版入口由文章索引決定。
  const defaultMindMap = (child) => ({
    enabled: child === "aiden",
    title: "悠閒午後",
    url: "/leisure-mind-map/",
  });
  const idRE = /^[a-z0-9-]{1,64}$/;
  const dateRE = /^\d{4}-\d{2}-\d{2}$/;
  const occurrenceRE = /^[a-z0-9-]{1,64}@\d{4}-\d{2}-\d{2}$/;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const integer = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
  function dateKey(now = new Date()) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  }
  function validDate(value) {
    return (
      typeof value === "string" &&
      dateRE.test(value) &&
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value
    );
  }
  function defaults() {
    return {
      version: 1,
      websites: [
        {
          id: "stroke",
          title: "國字筆順",
          url: "https://stroke.gh.miniasp.com/",
          children: [...CHILDREN],
        },
      ],
      children: Object.fromEntries(
        CHILDREN.map((child) => [
          child,
          {
            apps:
              child === "aiden"
                ? ["study", "spelling", "math", "nonogram"]
                : ["zhuyin"],
            terms: child === "aiden" ? ["g4-s1"] : ["g3-s2"],
            avatar: "lego",
            mindMap: defaultMindMap(child),
            homeOrder: [],
            weekly: {},
            overrides: {},
          },
        ]),
      ),
    };
  }
  function validateTask(task) {
    if (
      !task ||
      !idRE.test(task.id) ||
      !APPS.slice(0, 5).includes(task.app) ||
      !integer(task.quantity, 1, 100)
    )
      throw Error("任務格式不正確");
    const out = { id: task.id, app: task.app, quantity: task.quantity };
    if (task.app === "study") {
      if (!integer(task.unit, 1, 19)) throw Error("請選擇題庫單元");
      out.unit = task.unit;
    }
    if (task.app === "spelling") {
      if (!integer(task.batch, 0, 19)) throw Error("請選擇單字組別");
      out.batch = task.batch;
    }
    if (task.app === "zhuyin") {
      if (!["all", "listen", "build"].includes(task.mode))
        throw Error("請選擇注音範圍");
      out.mode = task.mode;
    }
    return out;
  }
  function taskList(value) {
    if (!Array.isArray(value) || value.length > 12)
      throw Error("每天最多安排 12 項任務");
    const result = value.map(validateTask);
    if (new Set(result.map((t) => t.id)).size !== result.length)
      throw Error("任務識別重複");
    return result;
  }
  function validateSettings(value) {
    if (!value || value.version !== 1 || !value.children)
      throw Error("不支援的家庭設定版本");
    const websites = Object.hasOwn(value, "websites")
      ? value.websites
      : defaults().websites;
    if (!Array.isArray(websites) || websites.length > 30)
      throw Error("常用網站最多 30 個");
    const result = {
      version: 1,
      children: {},
      websites: websites.map((site) => {
        if (
          !site ||
          typeof site.id !== "string" ||
          !idRE.test(site.id) ||
          !Array.isArray(site.children) ||
          site.children.some((c) => !CHILDREN.includes(c)) ||
          new Set(site.children).size !== site.children.length
        )
          throw Error("網站設定不正確");
        return {
          id: site.id,
          title: linkTitle(site.title),
          url: linkURL(site.url),
          children: [...site.children],
        };
      }),
    };
    if (
      new Set(result.websites.map((s) => s.id)).size !== result.websites.length
    )
      throw Error("網站識別重複");
    for (const child of CHILDREN) {
      const p = value.children[child];
      if (
        !p ||
        !Array.isArray(p.apps) ||
        p.apps.some((a) => !APPS.includes(a)) ||
        new Set(p.apps).size !== p.apps.length
      )
        throw Error("App 設定不正確");
      if (
        !Array.isArray(p.terms) ||
        !p.terms.length ||
        p.terms.some((t) => !TERMS.includes(t)) ||
        new Set(p.terms).size !== p.terms.length
      )
        throw Error("學期設定不正確");
      if (!["lego", "flat"].includes(p.avatar)) throw Error("頭像設定不正確");
      if (
        !p.weekly ||
        typeof p.weekly !== "object" ||
        Array.isArray(p.weekly) ||
        !p.overrides ||
        typeof p.overrides !== "object" ||
        Array.isArray(p.overrides)
      )
        throw Error("課表格式不正確");
      const weekly = {},
        overrides = {};
      for (const [day, tasks] of Object.entries(p.weekly)) {
        if (!/^[0-6]$/.test(day)) throw Error("星期設定不正確");
        weekly[day] = taskList(tasks);
      }
      if (Object.keys(p.overrides).length > 400)
        throw Error("單日安排最多保留 400 天");
      for (const [day, tasks] of Object.entries(p.overrides)) {
        if (!validDate(day)) throw Error("日期設定不正確");
        overrides[day] = taskList(tasks);
      }
      result.children[child] = {
        apps: [...p.apps],
        terms: [...p.terms],
        avatar: p.avatar,
        mindMap: validateMindMap(
          Object.hasOwn(p, "mindMap") ? p.mindMap : defaultMindMap(child),
        ),
        homeOrder: validateOrder(
          Object.hasOwn(p, "homeOrder") ? p.homeOrder : [],
        ),
        weekly,
        overrides,
      };
    }
    return result;
  }
  function linkTitle(value) {
    if (typeof value !== "string" || !value.trim() || value.trim().length > 60)
      throw Error("名稱請填 1 到 60 個字");
    return value.trim();
  }
  function linkURL(value, internal = false) {
    if (typeof value !== "string" || !value.trim() || value.length > 2048)
      throw Error("請填寫有效網址");
    value = value.trim();
    if (/[\u0000-\u0020\\]/.test(value)) throw Error("網址不能含空白或反斜線");
    const relative =
      internal && value.startsWith("/") && !value.startsWith("//");
    let url;
    try {
      url = new URL(
        value,
        relative ? "https://kids.linshuhuan.com" : undefined,
      );
    } catch {
      throw Error("請填完整 https 網址，站內文章也可填 / 開頭的路徑");
    }
    if (url.protocol !== "https:" || url.username || url.password)
      throw Error("網址需使用 https，且不能包含帳號密碼");
    if (["k", "token"].some((key) => url.searchParams.has(key)))
      throw Error("請移除網址中的金鑰參數");
    return relative ? url.pathname + url.search + url.hash : url.href;
  }
  function validateMindMap(value) {
    if (!value || typeof value.enabled !== "boolean")
      throw Error("心智圖設定不正確");
    return {
      enabled: value.enabled,
      title: linkTitle(value.title),
      url: linkURL(value.url, true),
    };
  }
  function validateOrder(value) {
    if (
      !Array.isArray(value) ||
      value.length > 128 ||
      value.some(
        (id) =>
          typeof id !== "string" ||
          !/^[a-z0-9-]+(?::[a-z0-9-]+)?$/.test(id) ||
          id.length > 80,
      ) ||
      new Set(value).size !== value.length
    )
      throw Error("首頁排序不正確");
    return [...value];
  }
  // 舊版客戶端不認識新增欄位；只在未送出欄位時保留雲端值。
  function preserveHomeFields(incoming, current) {
    const result = clone(incoming);
    if (!Object.hasOwn(result, "websites")) result.websites = current.websites;
    for (const child of CHILDREN) {
      const profile = result.children?.[child];
      if (!profile) continue;
      for (const key of ["mindMap", "homeOrder"])
        if (!Object.hasOwn(profile, key))
          profile[key] = current.children[child][key];
    }
    return result;
  }
  function taskEntryId(task) {
    if (task.app !== "study") return task.app;
    const subject =
      task.unit >= 15 || (task.unit >= 5 && task.unit <= 9)
        ? "math"
        : task.unit <= 4
          ? "science"
          : task.unit <= 12
            ? "social"
            : "chinese";
    return "study:" + subject;
  }
  function homeEntries(settings, child, registry) {
    const profile = settings.children[child],
      entries = [];
    for (const id of profile.apps) {
      const app = registry.apps.find(
        (a) => a.id === id && a.status === "active",
      );
      if (!app) continue;
      if (id === "study") {
        for (const [subject, meta] of Object.entries(SUBJECTS)) {
          const term = meta.terms.find((t) => profile.terms.includes(t));
          if (term)
            entries.push({
              id: "study:" + subject,
              app: id,
              ...meta,
              subject,
              term,
              path: app.path,
            });
        }
      } else
        entries.push({
          id,
          app: id,
          title: APP_LABELS[id][0],
          mark: APP_LABELS[id][1],
          path: app.path,
          url: app.url,
        });
    }
    const latest = mindMapArticles(registry)[0];
    if (profile.mindMap.enabled && latest)
      entries.push({
        id: "mind-map",
        title: "心智圖",
        path: latest.path,
      });
    for (const site of settings.websites)
      if (site.children.includes(child))
        entries.push({
          id: "website:" + site.id,
          title: site.title,
          mark: "↗",
          url: site.url,
        });
    const rank = (id) => {
      const i = profile.homeOrder.indexOf(id);
      return i < 0 ? Infinity : i;
    };
    return entries.sort((a, b) => rank(a.id) - rank(b.id));
  }
  function mindMapArticles(registry) {
    return [...(registry.mindMaps || [])].sort((a, b) =>
      b.date.localeCompare(a.date),
    );
  }
  const taskTerm = (task) =>
    task.app === "study" ? (task.unit >= 15 ? "g4-s1" : "g3-s2") : null;
  const availableTask = (task, profile) =>
    profile.apps.includes(task.app) &&
    (!taskTerm(task) || profile.terms.includes(taskTerm(task)));
  function todayTasks(profile, day = dateKey()) {
    const weekday = new Date(day + "T12:00:00+08:00").getUTCDay();
    const list = Object.hasOwn(profile.overrides, day)
      ? profile.overrides[day]
      : profile.weekly[weekday] || [];
    return list
      .filter((task) => availableTask(task, profile))
      .map((task) => ({ ...task, date: day, occurrence: task.id + "@" + day }));
  }
  function taskLabel(task) {
    if (task.app === "study")
      return `第 ${task.unit >= 15 ? task.unit - 14 : task.unit >= 10 && task.unit <= 12 ? task.unit - 6 : task.unit} 單元 · ${task.quantity} 題`;
    if (task.app === "spelling")
      return `第 ${task.batch + 1} 組 · ${task.quantity} 個字`;
    if (task.app === "zhuyin")
      return `${{ all: "混合", listen: "認符號", build: "拼音節" }[task.mode]} · ${task.quantity} 張卡`;
    return `${task.quantity} 題`;
  }
  function activityGeneration(value = 0) {
    if (!Number.isSafeInteger(value) || value < 0)
      throw Error("統計重置版本不正確");
    return value;
  }
  function emptyStream(generation = 0) {
    return { version: 1, ...(generation ? { generation } : {}), days: {}, tasks: {}, done: {} };
  }
  function validateStream(value) {
    if (!value || value.version !== 1) throw Error("統計版本不正確");
    const result = emptyStream(activityGeneration(value.generation));
    for (const key of ["days", "tasks", "done"]) {
      if (
        !value[key] ||
        typeof value[key] !== "object" ||
        Array.isArray(value[key])
      )
        throw Error("統計格式不正確");
      if (Object.keys(value[key]).length > (key === "days" ? 4000 : 12000))
        throw Error("統計資料過大");
    }
    for (const [day, v] of Object.entries(value.days)) {
      if (
        !validDate(day) ||
        !v ||
        !integer(v.completed, 0, 100000) ||
        !integer(v.answered, 0, v.completed) ||
        !integer(v.correct, 0, v.answered) ||
        !integer(v.seconds, 0, 86400)
      )
        throw Error("每日統計不正確");
      result.days[day] = {
        completed: v.completed,
        answered: v.answered,
        correct: v.correct,
        seconds: v.seconds,
      };
    }
    for (const [id, count] of Object.entries(value.tasks)) {
      if (
        !occurrenceRE.test(id) ||
        !validDate(id.split("@")[1]) ||
        !integer(count, 0, 100000)
      )
        throw Error("任務統計不正確");
      result.tasks[id] = count;
    }
    for (const [id, done] of Object.entries(value.done)) {
      if (!occurrenceRE.test(id) || !validDate(id.split("@")[1]) || done !== 1)
        throw Error("完成紀錄不正確");
      result.done[id] = 1;
    }
    return result;
  }
  function mergeStreams(a, b) {
    // 重置前後的數字不能取最大值合併，否則舊裝置會把已清空的成果加回來。
    const ag = activityGeneration(a.generation), bg = activityGeneration(b.generation);
    if (ag !== bg) return clone(ag > bg ? a : b);
    const result = clone(a);
    for (const [day, v] of Object.entries(b.days)) {
      const prev = result.days[day] || {
        completed: 0,
        answered: 0,
        correct: 0,
        seconds: 0,
      };
      result.days[day] = Object.fromEntries(
        Object.keys(prev).map((k) => [k, Math.max(prev[k], v[k])]),
      );
    }
    for (const [id, n] of Object.entries(b.tasks))
      result.tasks[id] = Math.max(result.tasks[id] || 0, n);
    Object.assign(result.done, b.done);
    return result;
  }
  function summarize(streams, day = dateKey()) {
    const zero = () => ({ completed: 0, answered: 0, correct: 0, seconds: 0 });
    const result = {
      total: zero(),
      today: zero(),
      apps: {},
      days: {},
      tasks: {},
      done: {},
    };
    for (const { app, data } of streams) {
      result.apps[app] ||= zero();
      for (const [date, v] of Object.entries(data.days)) {
        result.days[date] ||= zero();
        for (const key of Object.keys(v)) {
          result.total[key] += v[key];
          result.apps[app][key] += v[key];
          result.days[date][key] += v[key];
          if (date === day) result.today[key] += v[key];
        }
      }
      for (const [id, n] of Object.entries(data.tasks))
        result.tasks[id] = (result.tasks[id] || 0) + n;
      Object.assign(result.done, data.done);
    }
    result.finishedTasks = Object.keys(result.done).length;
    return result;
  }
  const BADGES = [
    {
      id: "questions-10",
      goal: 10,
      metric: "answered",
      label: "第一塊積木",
      color: "blue",
    },
    {
      id: "questions-50",
      goal: 50,
      metric: "answered",
      label: "50 題",
      color: "yellow",
    },
    {
      id: "questions-100",
      goal: 100,
      metric: "answered",
      label: "100 題",
      color: "red",
    },
    {
      id: "questions-250",
      goal: 250,
      metric: "answered",
      label: "250 題",
      color: "green",
    },
    {
      id: "questions-500",
      goal: 500,
      metric: "answered",
      label: "500 題",
      color: "purple",
    },
    {
      id: "tasks-1",
      goal: 1,
      metric: "tasks",
      label: "第一個任務",
      color: "yellow",
    },
    {
      id: "tasks-5",
      goal: 5,
      metric: "tasks",
      label: "5 個任務",
      color: "green",
    },
    {
      id: "tasks-20",
      goal: 20,
      metric: "tasks",
      label: "20 個任務",
      color: "blue",
    },
  ];
  function earnedBadges(summary) {
    return BADGES.filter(
      (b) =>
        (b.metric === "tasks"
          ? summary.finishedTasks
          : summary.total.answered) >= b.goal,
    );
  }
  globalThis.KidsFamilyCore = {
    CHILDREN,
    APPS,
    TERMS,
    BADGES,
    idRE,
    dateKey,
    validDate,
    defaults,
    validateTask,
    validateSettings,
    preserveHomeFields,
    homeEntries,
    mindMapArticles,
    taskEntryId,
    SUBJECTS,
    taskTerm,
    availableTask,
    todayTasks,
    taskLabel,
    emptyStream,
    activityGeneration,
    validateStream,
    mergeStreams,
    summarize,
    earnedBadges,
  };
})();
