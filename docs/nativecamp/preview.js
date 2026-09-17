/* Parent question preview: memory-only answers; no learning store or activity client. */
(function (global) {
  "use strict";
  const C = global.NativeCampCore, V = global.NativeCampQuestionView;
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="icons.svg#${name}"></use></svg>`;
  const button = (action, label, style = "secondary", attrs = "", iconName = "") => `<button type="button" class="${style}" data-action="${action}" ${attrs}>${iconName ? icon(iconName) : ""}${label}</button>`;
  function childFrom(search) {
    const child = new URLSearchParams(search).get("child") || "aiden";
    return /^(aiden|bingpu|test-[a-z0-9-]{1,25})$/.test(child) ? child : "aiden";
  }
  const parentHref = (child) => `../parent/?child=${encodeURIComponent(child)}`;
  function mount({ root, lesson, child = "aiden", auth = global.KidsAuth, makeAudio = () => new Audio(),
    makeContext, createObjectURL = (blob) => URL.createObjectURL(blob), revokeObjectURL = (url) => URL.revokeObjectURL(url) }) {
    C.validateLesson(lesson);
    let mode = "try", concept = lesson.concepts[0], questionIndex = 0;
    let selection = null, words = [], revealed = false, result = null, error = "", audioMessage = "", lastAudio = "question";
    let destroyed = false;
    const audio = global.NativeCampAudio.create({ makeAudio, makeContext, resolveSource, onStatus: audioStatus });
    const question = () => concept[mode][questionIndex];
    const canCheck = () => question().type === "choice" ? selection !== null : words.length === question().tokens.length;
    function stopAudio() {
      audio.stop(); audioStatus("");
    }
    function reset() { stopAudio(); selection = null; words = []; revealed = false; result = null; error = ""; }
    function heading() {
      return `<header class="preview-heading"><div><p class="eyebrow">NATIVE CAMP REVIEW</p><h1>Preview questions <span class="pill">Preview</span></h1><p class="preview-note">Nothing is saved. This does not change your child's practice.</p></div><a class="nav-link" href="${escape(parentHref(child))}">${icon("arrow-left")}Back to parent</a></header>`;
    }
    function render() {
      if (destroyed) return;
      const q = question();
      const modeButtons = ["try", "say"].map((value) => button("mode", value === "try" ? "Try it" : "Say it", "secondary", `data-mode="${value}" aria-pressed="${value === mode}"`)).join("");
      const concepts = lesson.concepts.map((value) => button("concept", escape(value.title), "secondary", `data-concept="${escape(value.id)}" aria-pressed="${value.id === concept.id}"`)).join("");
      const questions = concept[mode].map((value, index) => button("question", `Question ${index + 1}`, "secondary", `data-question="${escape(value.id)}" aria-pressed="${index === questionIndex}"`)).join("");
      const answers = mode === "try" ? `<div class="answer-area">${V.answerControls(q, selection, words)}</div>` : `<div class="answer-area"><p class="speaking-cue">${escape(q.instruction)}</p></div>`;
      const solution = revealed ? `<section class="answer-reveal"><p>EXAMPLE ANSWER</p><h3>${escape(q.answerText)}</h3>${q.explanation ? `<p>${escape(q.explanation)}</p>` : ""}${q.accepted?.length ? `<div class="accepted">You can also say: ${q.accepted.map(escape).join(" / ")}</div>` : ""}${button("answer-audio", "Listen to the answer", "listen-button", "", "volume-2")}</section>` : "";
      root.innerHTML = `${heading()}<p class="preview-lesson">${escape(lesson.date)} · <strong>${escape(lesson.title)}</strong></p><nav class="preview-controls" aria-label="Choose a question"><fieldset><legend>Mode</legend><div class="preview-options">${modeButtons}</div></fieldset><fieldset><legend>Concept</legend><div class="preview-options">${concepts}</div></fieldset><fieldset><legend>Question</legend><div class="preview-options">${questions}</div></fieldset></nav><section class="question-card"><p class="preview-question-label">${mode === "try" ? "Try it" : "Say it"} · ${escape(concept.title)} · ${questionIndex + 1} of ${concept[mode].length}</p><div class="question-layout">${V.sceneHtml(q.scene)}<div class="question-content">${button("question-audio", "Listen", "listen-button", "", "volume-2")}<h2>${escape(q.prompt)}</h2>${mode === "try" ? `<p class="instruction">${escape(q.instruction)}</p>` : ""}</div></div>${answers}${result !== null ? `<p class="preview-result" role="status">${result ? "That matches." : "Look at the example, then try again."}</p>` : ""}<div class="preview-actions">${!revealed ? button("reveal", "Show answer", "secondary", "", "arrow-right") : ""}${mode === "try" ? button("check", "Check", "primary", canCheck() ? "" : "disabled", "check") : ""}</div>${solution}${error ? `<p class="error" role="alert">${escape(error)}</p>` : ""}<p class="audio-status" id="preview-audio-message" role="status">${escape(audioMessage)}</p>${audioMessage.startsWith("Could not") ? button("retry-audio", "Try the sound again", "text-button", "", "rotate-ccw") : ""}</section><p class="preview-footer">All ${lesson.concepts.reduce((total, item) => total + item.try.length + item.say.length, 0)} questions are available here, including questions saved for another day.</p>`;
    }
    function audioStatus(message) {
      if (destroyed) return;
      const hadRetry = audioMessage.startsWith("Could not");
      audioMessage = message;
      if (hadRetry !== message.startsWith("Could not")) { render(); return; }
      const target = root.querySelector("#preview-audio-message");
      if (target) target.textContent = message;
    }
    async function resolveSource(source, { signal }) {
      if (typeof source === "string") return source;
      const controller = new AbortController(), cancel = () => controller.abort();
      signal.addEventListener("abort", cancel, { once: true });
      if (signal.aborted) cancel();
      const timeout = setTimeout(cancel, 12000);
      try {
        const response = await auth.fetch(`/v1/nativecamp-audio/${source.private}`, { signal: controller.signal });
        if (!response.ok || response.headers.get("Content-Type") !== "audio/mpeg") throw Error();
        const blob = await response.blob();
        if (blob.size < 4 || blob.size > 2097152) throw Error();
        const url = createObjectURL(blob);
        return { url, release: () => revokeObjectURL(url) };
      } finally {
        clearTimeout(timeout); signal.removeEventListener("abort", cancel);
      }
    }
    async function play(kind, effect) {
      if (destroyed || global.document?.visibilityState === "hidden") return;
      if (kind === "answer" && !revealed) return;
      lastAudio = kind;
      await audio.play(question().audio[kind], { effect });
    }
    async function handle(action, data = {}) {
      if (destroyed) return;
      try {
        const q = question(); let nextSound = null, effect;
        if (["question-audio", "answer-audio", "retry-audio"].includes(action)) {
          await play(action === "retry-audio" ? lastAudio : action === "answer-audio" ? "answer" : "question"); return;
        }
        if (action === "mode" && ["try", "say"].includes(data.mode)) { reset(); mode = data.mode; questionIndex = 0; nextSound = "question"; }
        else if (action === "concept") {
          const next = lesson.concepts.find((item) => item.id === data.concept);
          if (!next) return;
          reset(); concept = next; questionIndex = 0; nextSound = "question";
        } else if (action === "question") {
          const index = concept[mode].findIndex((item) => item.id === data.question);
          if (index < 0) return;
          reset(); questionIndex = index; nextSound = "question";
        } else if (action === "pick" && mode === "try" && q.choices?.some((item) => item.id === data.choice)) { selection = data.choice; result = null; }
        else if (action === "add-word" && mode === "try" && q.tokens?.some((item) => item.id === data.word) && !words.includes(data.word)) { words.push(data.word); result = null; }
        else if (action === "remove-word" && mode === "try") { words = words.filter((word) => word !== data.word); result = null; }
        else if (action === "check" && mode === "try" && canCheck()) { result = C.checkAnswer(q, q.type === "choice" ? selection : words); revealed = true; nextSound = "answer"; effect = result ? "correct" : "neutral"; }
        else if (action === "reveal") { revealed = true; nextSound = "answer"; }
        else return;
        error = ""; render();
        if (nextSound === "question") void play(nextSound);
        else if (nextSound) await play(nextSound, effect);
      } catch { error = "This answer could not be checked. Choose the question again and retry."; render(); }
    }
    const clicked = (event) => {
      const target = event.target.closest?.("button[data-action]");
      if (target && !target.disabled) { audio.unlock(); void handle(target.dataset.action, target.dataset); }
    };
    const hidden = () => { if (global.document?.visibilityState === "hidden") { stopAudio(); audioStatus(""); } };
    root.addEventListener("click", clicked);
    global.addEventListener?.("pagehide", stopAudio);
    global.document?.addEventListener("visibilitychange", hidden);
    render();
    void play("question");
    return { handle, stopAudio, destroy() {
      destroyed = true; audio.destroy(); root.removeEventListener("click", clicked);
      global.removeEventListener?.("pagehide", stopAudio);
      global.document?.removeEventListener("visibilitychange", hidden);
    } };
  }
  let mounted = null;
  let bootSequence = 0;
  async function boot({ root = document.getElementById("nativecamp-preview"), auth = global.KidsAuth,
    fetchImpl = (...args) => fetch(...args), search = location.search, ...options } = {}) {
    const child = childFrom(search), sequence = ++bootSequence;
    mounted?.destroy(); mounted = null;
    root.innerHTML = `<section class="loading-card" aria-live="polite"><p class="eyebrow">PREVIEW</p><h1>Loading questions...</h1><a class="nav-link" href="${escape(parentHref(child))}">${icon("arrow-left")}Back to parent</a></section>`;
    try {
      if (!C || !V || !global.NativeCampAudio || !auth) throw Error("The page did not finish loading. Please try again.");
      await auth.ready;
      await auth.refresh();
      if (sequence !== bootSequence) return null;
      if (auth.state.status === "required") throw Error("Connect your family from the parent page, then try again.");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      let response;
      try { response = await fetchImpl("lessons/2026-09-15.json", { cache: "no-cache", signal: controller.signal }); }
      finally { clearTimeout(timeout); }
      if (!response.ok) throw Error("The questions could not be loaded. Please try again.");
      const lesson = C.validateLesson(await response.json());
      if (sequence !== bootSequence) return null;
      mounted = mount({ root, lesson, child, auth, ...options });
    } catch (error) {
      if (sequence !== bootSequence) return null;
      const message = auth?.state.status === "required" ? "Connect your family from the parent page, then try again." : "The preview could not be loaded. Please try again.";
      root.innerHTML = `<section class="loading-card"><p class="eyebrow">PREVIEW</p><h1>Let's try again.</h1><p class="error" role="alert">${message}</p>${button("retry-preview", "Try again", "primary", "", "rotate-ccw")} <a class="nav-link" href="${escape(parentHref(child))}">${icon("arrow-left")}Back to parent</a></section>`;
      root.querySelector('[data-action="retry-preview"]')?.addEventListener("click", () => boot({ root, auth, fetchImpl, search, ...options }));
    }
    return mounted;
  }
  global.NativeCampPreview = { mount, boot };
})(globalThis);
