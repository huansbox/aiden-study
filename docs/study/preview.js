/* 四上家長試玩：題包、選題與答案只存在此頁記憶體。 */
(function(root) {
  "use strict";

  const UNITS = new Map([
    [15, "第 1 單元：一億以內的數"],
    [16, "第 2 單元：整數的乘法"],
    [17, "第 3 單元：角度"],
    [18, "第 4 單元：整數的除法"],
    [19, "第 5 單元：公里"],
    [20, "第 1 單元：地表的靜與動"],
    [21, "第 2 單元：水生生物與環境"],
  ]);
  const SUBJECTS = new Map([["math", "數學"], ["science", "自然"]]);
  const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const childFrom = (search) => {
    const child = new URLSearchParams(search || "").get("child");
    return child === "bingpu" ? "bingpu" : "aiden";
  };
  const parentHref = (child) => `../parent/?child=${encodeURIComponent(child)}`;
  const answerLabel = (q) => q.type === "multiple_choice"
    ? `${q.answer}. ${q.options[Number(q.answer) - 1]}`
    : q.type === "true_false" ? (q.answer === "true" ? "O（正確）" : "X（錯誤）")
    : q.type === "grouped_choice" ? q.parts.map((part, index) => `${part.id}：${q.options[Number(q.answer[index]) - 1]}`).join("；")
    : q.blanks.map((blank, index) => `第 ${index + 1} 空：${blank.answer}`).join("；");

  let bootSequence = 0;
  let currentController = null;
  let currentAbort = null;
  let currentStatusCleanup = null;
  let currentPageCleanup = null;

  function releaseRuntime() {
    currentStatusCleanup?.();
    currentStatusCleanup = null;
    currentController?.destroy();
    currentController = null;
    currentAbort?.abort();
    currentAbort = null;
  }

  function clearCurrent() {
    currentPageCleanup?.();
    currentPageCleanup = null;
    releaseRuntime();
  }

  function statusHTML(child, title, message, retry = false) {
    return `<section class="preview-status" role="${title === "無法載入題包" ? "alert" : "status"}">
      <h1>${esc(title)}</h1><p>${esc(message)}</p>
      <div class="preview-actions">${retry ? '<button type="button" data-action="retry">重新載入題包</button>' : ""}
      <a class="preview-button secondary" href="${parentHref(child)}">返回家長後台</a></div></section>`;
  }

  function mount({ root: host, pack: initialPack, child = "aiden", onRetry = null, documentRef = document }) {
    if (!host) throw Error("找不到試玩頁容器。");
    let pack = initialPack;
    const state = { pack, subject: "math", unit: StudyPrivatePack.UNITS[0], subtopic: "", questionIndex: 0, partIndex: 0, values: [], result: "", revealed: false, destroyed: false };
    const unitsForSubject = () => StudyPrivatePack.UNITS.filter((unit) => state.subject === "science" ? unit >= 20 : unit <= 19);
    const questionsForUnit = () => pack.questions.filter((q) => q.unit === state.unit);
    const filtered = () => questionsForUnit().filter((q) => StudyScienceTopics.matches(q, state.subtopic));
    const current = () => filtered()[state.questionIndex] || null;
    function clearAnswer() {
      state.partIndex = 0;
      state.values = [];
      state.result = "";
      state.revealed = false;
    }
    function resetQuestion(index = 0) {
      state.questionIndex = index;
      clearAnswer();
    }
    function normalizeSelection() {
      const unitQuestions = questionsForUnit();
      if (state.subtopic && !unitQuestions.some((q) => StudyScienceTopics.matches(q, state.subtopic))) state.subtopic = "";
      const list = filtered();
      if (state.questionIndex < 0 || state.questionIndex >= list.length) state.questionIndex = 0;
      const q = current();
      const answerCount = q?.type === "fill_in_blank" ? q.blanks.length : q?.type === "grouped_choice" ? q.parts.length : 1;
      if (q && state.values.length !== answerCount) state.values = Array(answerCount).fill("");
    }
    function answerArea(q) {
      if (q.type === "multiple_choice") return `<div class="preview-options">${q.options.map((option, index) => `<button type="button" class="preview-option" data-action="answer-choice" data-value="${index + 1}" aria-pressed="${state.values[0] === String(index + 1)}"><span>${index + 1}</span><span>${esc(option)}</span></button>`).join("")}</div>`;
      if (q.type === "true_false") return `<div class="preview-options">${[["true", "O", "正確"], ["false", "X", "錯誤"]].map(([value, label, caption]) => `<button type="button" class="preview-option" data-action="answer-choice" data-value="${value}" aria-pressed="${state.values[0] === value}"><span>${label}</span><span>${caption}</span></button>`).join("")}</div>`;
      if (q.type === "grouped_choice") {
        const index = state.partIndex, part = q.parts[index];
        return `<div class="preview-group"><div class="preview-group-part"><span class="preview-group-question">${esc(part.text)}</span><div class="preview-options">${q.options.map((option, choice) => `<button type="button" class="preview-option" data-action="answer-group" data-index="${index}" data-value="${choice + 1}" aria-pressed="${state.values[index] === String(choice + 1)}"><span>${choice + 1}</span><span>${esc(option)}</span></button>`).join("")}</div>${state.result ? `<span class="preview-group-feedback">${state.values[index] === q.answer[index] ? "答對" : `正解：${esc(q.options[Number(q.answer[index]) - 1])}`}</span>` : ""}</div><nav class="preview-group-nav" aria-label="小題導覽"><button type="button" class="secondary" data-action="previous-part" ${index === 0 ? "disabled" : ""}>上一小題</button><span>小題 ${index + 1}／${q.parts.length}</span><button type="button" class="secondary" data-action="next-part" ${index === q.parts.length - 1 ? "disabled" : ""}>下一小題</button></nav></div>`;
      }
      return `<div class="preview-blanks">${q.blanks.map((blank, index) => `<label class="preview-blank"><span>第 ${index + 1} 空（${blank.input === "comparison" ? "比較符號" : "數字"}）</span>${blank.input === "comparison" ? `<span class="preview-compare">${[">", "<", "="].map((value) => `<button type="button" data-action="answer-compare" data-index="${index}" data-value="${value}" aria-pressed="${state.values[index] === value}">${value}</button>`).join("")}</span>` : `<input class="preview-number" data-action="answer-number" data-index="${index}" inputmode="decimal" autocomplete="off" value="${esc(state.values[index] || "")}" aria-label="第 ${index + 1} 空答案" />`}</label>`).join("")}</div>`;
    }
    function focusControl(action) {
      if (!action) return;
      if (["previous-part", "next-part"].includes(action)) {
        const other = action === "previous-part" ? "next-part" : "previous-part";
        (host.querySelector?.(`[data-action="${action}"]:not(:disabled)`) || host.querySelector?.(`[data-action="${other}"]:not(:disabled)`) || host.querySelector?.('.preview-group-part .preview-option'))?.focus?.({ preventScroll: true });
        return;
      }
      const enabled = ["previous-question", "next-question"].includes(action)
        ? host.querySelector?.(`[data-action="${action}"]:not(:disabled)`)
        : host.querySelector?.(`[data-action="${action}"]`);
      const target = enabled || host.querySelector?.('[data-action="question"]');
      target?.focus?.({ preventScroll: true });
    }
    function render(focusAction = "") {
      if (state.destroyed) return;
      normalizeSelection();
      const unitQuestions = questionsForUnit();
      const scienceTopics = StudyScienceTopics.topicsForUnit(state.unit);
      const concepts = scienceTopics.length
        ? scienceTopics.filter((topic) => unitQuestions.some((q) => StudyScienceTopics.matches(q, topic.key)))
          .map((topic) => [topic.key, topic.label])
        : [...new Set(unitQuestions.map((q) => q.subtopic))].map((concept) => [concept, concept]);
      const list = filtered(), q = current();
      host.innerHTML = `<header class="preview-top"><h1>四上家長試玩</h1>
        <p class="preview-notice">家長試玩，不記錄孩子進度</p>
        <div class="preview-actions"><a class="preview-button secondary" href="${parentHref(child)}">返回家長後台</a><button type="button" class="danger" data-action="reset">重設本頁作答</button></div></header>
        <section class="preview-filters" aria-label="選擇試玩題目">
          <label>科目<select data-action="subject">${[...SUBJECTS].map(([subject, label]) => `<option value="${subject}" ${state.subject === subject ? "selected" : ""}>${label}</option>`).join("")}</select></label>
          <label>單元<select data-action="unit">${unitsForSubject().map((unit) => `<option value="${unit}" ${state.unit === unit ? "selected" : ""}>${esc(UNITS.get(unit))}</option>`).join("")}</select></label>
          <label>${scienceTopics.length ? "練習主題" : "概念"}<select data-action="subtopic"><option value="">${scienceTopics.length ? "整單元練習" : "全部概念"}</option>${concepts.map(([key, label]) => `<option value="${esc(key)}" ${state.subtopic === key ? "selected" : ""}>${esc(label)}</option>`).join("")}</select></label>
        </section>
        ${list.length ? `<nav class="preview-question-nav" aria-label="題目導覽">
          <button type="button" class="secondary" data-action="previous-question" ${state.questionIndex === 0 ? "disabled" : ""}>上一題</button>
          <label class="preview-question-jump"><span class="preview-visually-hidden">跳到題目</span><select data-action="question" aria-label="跳到題目，目前第 ${state.questionIndex + 1} 題，共 ${list.length} 題">${list.map((_, index) => `<option value="${index}" ${state.questionIndex === index ? "selected" : ""}>第 ${index + 1} 題／共 ${list.length} 題</option>`).join("")}</select></label>
          <button type="button" data-action="next-question" ${state.questionIndex === list.length - 1 ? "disabled" : ""}>下一題</button>
        </nav>` : ""}
        ${q ? `<article class="preview-card${q.type === "grouped_choice" ? " preview-group-card" : ""}"><p class="preview-meta">${esc(UNITS.get(q.unit))}／${esc(StudyScienceTopics.topicForQuestion(q)?.label || (scienceTopics.length ? "整單元練習" : q.subtopic))}／${q.type === "multiple_choice" ? "四選一" : q.type === "true_false" ? "是非題" : q.type === "grouped_choice" ? `整組選答（${q.parts.length} 小題）` : `填空（${q.blanks.length} 空）`}</p>
          ${q.type === "grouped_choice" ? '<div class="preview-group-context">' : ""}${StudyMaterial.render(q.material)}<div class="preview-question">${esc(q.text)}</div>${q.type === "grouped_choice" ? '</div><div class="preview-group-work">' : ""}${answerArea(q)}
          <div class="preview-answer-actions"><button type="button" data-action="check" ${state.values.every((value) => String(value).trim()) ? "" : "disabled"}>確認答案</button><button type="button" class="secondary" data-action="reveal">揭答與解說</button><button type="button" class="secondary" data-action="retry-answer">清除重試</button></div>
          ${state.result ? `<p class="preview-feedback ${state.result}">${state.result === "correct" ? "答對了。這只是家長試玩，不會留下紀錄。" : "還沒答對，可以修改後再試一次，或查看答案與解說。"}</p>` : ""}
          ${state.revealed || state.result === "correct" ? `<section class="preview-reveal"><h2>答案</h2><p>${esc(answerLabel(q))}</p><h2>解說</h2><p>${esc(pack.explanations[q.id])}</p></section>` : ""}${q.type === "grouped_choice" ? '</div>' : ""}</article>` : `<section class="preview-card preview-empty" role="status"><h2>這個篩選目前沒有題目</h2><p>請改選其他單元或概念。上一題的作答與解說已清除。</p></section>`}`;
      focusControl(focusAction);
      StudyMaterial.bind(host);
    }
    function check() {
      const q = current();
      if (!q || state.values.some((value) => !String(value).trim())) return;
      const correct = q.type === "grouped_choice"
        ? q.parts.every((_, index) => state.values[index] === q.answer[index])
        : q.type === "multiple_choice" || q.type === "true_false"
        ? state.values[0] === q.answer
        : q.blanks.every((blank, index) => StudyAnswer.isBlankCorrect(blank, state.values[index]));
      state.result = correct ? "correct" : "wrong";
      render();
    }
    function handle(action, data = {}) {
      if (state.destroyed) return;
      if (action === "subject") { state.subject = SUBJECTS.has(data.value) ? data.value : "math"; state.unit = unitsForSubject()[0]; state.subtopic = ""; resetQuestion(); render(); }
      else if (action === "unit") { state.unit = Number(data.value); state.subtopic = ""; resetQuestion(); render(); }
      else if (action === "subtopic") { state.subtopic = String(data.value || ""); resetQuestion(); render(); }
      else if (action === "question") { resetQuestion(Number(data.value ?? data.index)); render("question"); }
      else if (action === "previous-question") { if (state.questionIndex > 0) resetQuestion(state.questionIndex - 1); render("previous-question"); }
      else if (action === "next-question") { if (state.questionIndex < filtered().length - 1) resetQuestion(state.questionIndex + 1); render("next-question"); }
      else if (action === "answer-choice") { state.values[0] = String(data.value); state.result = ""; state.revealed = false; render(); }
      else if (action === "answer-compare") { state.values[Number(data.index)] = String(data.value); state.result = ""; state.revealed = false; render(); }
      else if (action === "answer-number") { state.values[Number(data.index)] = String(data.value); state.result = ""; state.revealed = false; }
      else if (action === "previous-part" || action === "next-part") { const step = action === "previous-part" ? -1 : 1; state.partIndex = Math.max(0, Math.min(current()?.parts?.length - 1 || 0, state.partIndex + step)); render(action); }
      else if (action === "answer-group") { state.values[Number(data.index)] = String(data.value); state.result = ""; state.revealed = false; render(); host.querySelector?.('.preview-group-part [aria-pressed="true"]')?.focus?.({ preventScroll: true }); }
      else if (action === "check") check();
      else if (action === "reveal") { state.revealed = true; render(); }
      else if (action === "retry-answer" || action === "reset") { resetQuestion(action === "reset" ? 0 : state.questionIndex); render(); }
      else if (action === "retry") onRetry?.();
    }
    const onClick = (event) => {
      const button = event.target.closest?.("[data-action]");
      if (!button || button.disabled) return;
      if (["answer-number", "subject", "unit", "subtopic", "question"].includes(button.dataset.action)) return;
      handle(button.dataset.action, button.dataset);
    };
    const onChange = (event) => {
      const control = event.target.closest?.("[data-action]");
      if (!control) return;
      if (["subject", "unit", "subtopic", "question"].includes(control.dataset.action)) handle(control.dataset.action, { value: control.value, index: control.dataset.index });
    };
    const onInput = (event) => {
      const input = event.target.closest?.('[data-action="answer-number"]');
      if (!input) return;
      handle("answer-number", { index: input.dataset.index, value: input.value });
      host.querySelectorAll?.(".preview-feedback, .preview-reveal").forEach((element) => element.remove());
      const checkButton = host.querySelector?.('[data-action="check"]');
      if (checkButton) checkButton.disabled = !state.values.every((value) => String(value).trim());
    };
    host.addEventListener("click", onClick);
    host.addEventListener("change", onChange);
    host.addEventListener("input", onInput);
    render();
    return { handle, render, get state() { return state; }, destroy() {
      if (state.destroyed) return;
      state.destroyed = true;
      clearAnswer();
      state.pack = null;
      pack = null;
      host.removeEventListener("click", onClick);
      host.removeEventListener("change", onChange);
      host.removeEventListener("input", onInput);
    } };
  }

  async function boot(options = {}) {
    const host = options.root || document.getElementById("study-preview");
    const auth = options.auth || root.KidsAuth;
    const parser = options.parser || root.StudyPrivatePack;
    const sequence = ++bootSequence;
    const child = childFrom(options.search ?? root.location.search);
    clearCurrent();
    if (!host || !auth || !parser || !root.StudyAnswer) {
      if (host) host.innerHTML = statusHTML(child, "無法載入題包", "試玩頁缺少必要程式，請重新整理後再試。", true);
      return null;
    }
    const windowRef = options.windowRef || root;
    let leftPage = false;
    const removePageLifecycle = () => {
      windowRef.removeEventListener("pagehide", onPageHide);
      windowRef.removeEventListener("pageshow", onPageShow);
    };
    const onPageHide = () => {
      leftPage = true;
      ++bootSequence;
      releaseRuntime();
      host.innerHTML = statusHTML(child, "四上家長試玩", "返回頁面後會重新載入家庭題包。");
    };
    const onPageShow = (event) => {
      if (!leftPage || !event.persisted) return;
      removePageLifecycle();
      if (currentPageCleanup === removePageLifecycle) currentPageCleanup = null;
      boot(options);
    };
    windowRef.addEventListener("pagehide", onPageHide);
    windowRef.addEventListener("pageshow", onPageShow);
    currentPageCleanup = removePageLifecycle;
    host.innerHTML = statusHTML(child, "四上家長試玩", "正在載入家庭題包⋯");
    const controller = new AbortController();
    currentAbort = controller;
    let timer;
    try {
      const timeoutMs = options.timeoutMs ?? 8000;
      const timeout = new Promise((_, reject) => {
        timer = (options.setTimer || setTimeout)(() => {
          controller.abort();
          reject(Error("取得題包逾時，請確認網路後重試。"));
        }, timeoutMs);
      });
      const raw = await Promise.race([
        parser.fetchRemote(auth.endpoint, null, controller.signal),
        timeout,
      ]);
      if (sequence !== bootSequence) return null;
      const pack = parser.parse(raw);
      if (sequence !== bootSequence) return null;
      currentController = mount({ root: host, pack, child, onRetry: () => boot(options), documentRef: options.documentRef || document });
      return currentController;
    } catch (error) {
      if (sequence !== bootSequence) return null;
      host.innerHTML = statusHTML(child, "無法載入題包", error?.message || "題包回應無法讀取，請稍後重試。", true);
      const retry = (event) => {
        const button = event.target.closest?.('[data-action="retry"]');
        if (button) { currentStatusCleanup?.(); boot(options); }
      };
      host.addEventListener("click", retry);
      currentStatusCleanup = () => host.removeEventListener("click", retry);
      return null;
    } finally {
      (options.clearTimer || clearTimeout)(timer);
      if (sequence === bootSequence) currentAbort = null;
      controller.abort();
    }
  }

  root.StudyPreview = { boot, mount, childFrom, parentHref };
  if (root.document?.getElementById?.("study-preview")) boot();
})(globalThis);
