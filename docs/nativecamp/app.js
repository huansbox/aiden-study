(function (global) {
  "use strict";
  const C = global.NativeCampCore;
  const Q = global.NativeCampQuestionView;
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  function icon(name, extra = "") { return `<svg class="icon ${extra}" aria-hidden="true"><use href="icons.svg#${name}"></use></svg>`; }
  function button(action, label, style = "secondary", iconName = null, attrs = "") { return `<button type="button" class="${style}" data-action="${action}" ${attrs}>${iconName ? icon(iconName) : ""}${label}</button>`; }
  const dateLabel = (date) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(date + "T00:00:00Z"));
  const modeLabel = (mode) => mode === "try" ? "Try it" : "Say it";
  function mount({ root, lesson, bridge, date = () => C.today(), makeAudio = () => new Audio(), makeAudioController = (options) => global.NativeCampAudio.create(options), eventTarget = global, documentTarget = global.document }) {
    C.validateLesson(lesson);
    let view = "home", mode = null, conceptId = null, selection = null, words = [], feedback = null, correcting = false, correctionChecked = false;
    let busy = false, error = "", audioMessage = "", audioEpoch = 0, lastAudio = "question", lastKey = null, destroyed = false, suspended = false;
    let lastProgress = JSON.stringify(bridge.getProgress());
    const summary = () => C.summarizeLesson(bridge.getProgress(), lesson, date());
    const current = () => mode ? C.nextQuestion(bridge.getProgress(), lesson, mode, date(), mode === "say" ? conceptId : null) : null;
    const questionKey = (q) => q ? `${q.concept.id}/${q.phase}/${q.question.id}` : null;
    const canPlay = () => !destroyed && !suspended && documentTarget?.visibilityState !== "hidden";
    const audio = makeAudioController({
      makeAudio,
      resolveSource: (resource, { signal }) => typeof resource === "string" ? resource : bridge.privateAudio(resource.private, { signal }),
      onStatus(message) {
        if (destroyed) return;
        const retryChanged = audioMessage.startsWith("Could not") !== message.startsWith("Could not");
        audioMessage = message;
        if (retryChanged) render(); else updateAudioStatus();
      },
    });
    function stopAudio() {
      audioEpoch++;
      audio.stop();
      audioMessage = "";
    }
    function resetQuestion() { stopAudio(); selection = null; words = []; feedback = null; correcting = false; correctionChecked = false; error = ""; lastKey = questionKey(current()); }
    function updateStatus() {
      const target = root.querySelector("#sync-message");
      if (target) target.textContent = bridge.status();
    }
    function updateAudioStatus() { const target = root.querySelector("#audio-message"); if (target) target.textContent = audioMessage; }
    function onChange(event = {}) {
      if (destroyed) return;
      updateStatus();
      const fresh = JSON.stringify(bridge.getProgress());
      if (fresh === lastProgress) return;
      lastProgress = fresh;
      if (busy) return;
      let enteredQuestion = false;
      if (view === "practice" && questionKey(current()) !== lastKey) {
        resetQuestion();
        error = "Your saved practice changed. Here is your next question.";
        if (!current()) view = "round";
        else enteredQuestion = true;
      }
      // A status update must never replace selected words or interrupt a recording.
      render();
      if (enteredQuestion) void play("question");
    }
    function header() {
      return `<header class="topbar"><div class="brand"><span class="brand-icon">${icon("book-open")}</span><span>NATIVE CAMP<br>REVIEW</span></div>${view === "home" ? `<a class="nav-link" href="${escape(bridge.homeHref)}">${icon("house")}My home</a>` : button("home", "My lesson", "nav-link", "arrow-left")}</header>`;
    }
    function footer() { return `<footer class="page-footer"><div class="sync-line"><span class="sync-dot" aria-hidden="true"></span><span id="sync-message" role="status">${escape(bridge.status())}</span>${button("sync", "Sync", "text-button", "rotate-ccw")}</div></footer>`; }
    function reviewLabel(dueOn) { return dueOn === C.nextDay(date()) ? "Review tomorrow" : `Review ${dateLabel(dueOn)}`; }
    function modeCard(which, information) {
      const due = information.concepts.filter((x) => x.due).length;
      const waiting = information.concepts.filter((x) => x.dueOn && !x.due).map((x) => x.dueOn).sort()[0];
      const available = C.nextQuestion(bridge.getProgress(), lesson, which, date());
      const action = available ? which === "try" ? "start-try" : "choose-say" : "progress";
      const doneBadge = information.done ? `<span class="pill done">${icon("check")}Done</span>` : information.concepts.some((c) => c.attempted) ? '<span class="pill">In progress</span>' : "";
      return `<article class="mode-card ${which}"><div class="mode-top"><span class="mode-icon">${icon(which === "try" ? "lightbulb" : "message-circle")}</span>${doneBadge}</div><h2>${modeLabel(which)}</h2>${button(action, available ? due ? "Review now" : "Let's start" : "See my progress", "primary", "arrow-right", `data-mode="${which}"`)}${waiting || due ? `<div class="mode-footer">${icon("calendar-days")}${due ? "Review ready" : escape(reviewLabel(waiting))}</div>` : ""}</article>`;
    }
    function homeHtml() {
      const result = summary();
      return `<div class="lesson-heading">${icon("calendar-days")}<div><p>${escape(dateLabel(lesson.date))}</p><h1>${escape(lesson.title)}</h1></div></div><section class="mode-grid" aria-label="Choose a practice mode">${modeCard("try", result.try)}${modeCard("say", result.say)}</section>${footer()}`;
    }
    function progressHtml() {
      const result = summary()[mode];
      const available = C.nextQuestion(bridge.getProgress(), lesson, mode, date());
      return `<h1 class="progress-title">${modeLabel(mode)}</h1>${mode === "say" && available ? '<p class="progress-instruction">Pick one idea.</p>' : ""}<section class="concept-list" aria-label="${modeLabel(mode)} progress">${result.concepts.map((concept) => {
        const next = C.nextQuestion(bridge.getProgress(), lesson, mode, date(), concept.id);
        const text = concept.due ? "Review ready" : concept.dueOn ? reviewLabel(concept.dueOn) : concept.done ? "" : concept.attempted ? "In progress" : "Not started";
        return `<article class="concept-card"><div><h3>${escape(concept.title)}</h3>${text ? `<p>${escape(text)}</p>` : ""}</div><div class="concept-actions">${concept.done ? `<span class="pill done">${icon("check")}Done</span>` : ""}${mode === "say" && next ? button("start-say", concept.due ? "Review now" : "Let's go", "primary", "arrow-right", `data-concept="${escape(concept.id)}"`) : ""}</div></article>`;
      }).join("")}</section>${mode === "try" && available ? `<div class="progress-actions">${button("start-try", result.concepts.some((c) => c.due) ? "Review now" : "Continue", "primary", "arrow-right")}</div>` : ""}${footer()}`;
    }
    function feedbackHtml() {
      const { question, outcome } = feedback;
      const correct = outcome !== "incorrect";
      return `<section class="feedback ${correct ? "" : "retry"}" aria-live="polite"><h3>${icon(correct ? "circle-check" : "lightbulb")}${correct ? outcome === "helped" ? "You did it with help." : "You got it." : "Let's look together."}</h3><p>${escape(question.answerText)}</p>${question.explanation ? `<p class="small-note">${escape(question.explanation)}</p>` : ""}${button("answer-audio", "Listen to the answer", "listen-button", "volume-2")}</section>${correcting ? `<p class="correction-label">Try the same idea once more. Your first answer stays saved.</p>${Q.answerControls(question, selection, words)}${correctionChecked ? '<p class="help-note">That matches. Your first answer has not changed.</p>' : ""}` : ""}<div class="question-actions">${!correct && !correcting ? button("correct", "Try again", "text-button", "rotate-ccw") : '<span class="small-note">First answer saved.</span>'}${correcting && !correctionChecked ? button("check-correction", "Check", "secondary", "check", canCheck(question) ? "" : "disabled") : ""}${button("next", "Continue", "primary", "arrow-right")}</div>`;
    }
    function canCheck(question) { return question.type === "choice" ? selection !== null : words.length === question.tokens.length; }
    function practiceHtml() {
      const next = feedback?.next ?? current();
      if (!next) { view = "round"; return roundHtml(); }
      const q = next.question;
      if (!feedback) lastKey = questionKey(next);
      const pending = next.pending;
      const step = next.phase === "initial" ? `Question ${next.number} · up to 3` : "One short review";
      const progress = Math.round((next.phase === "initial" ? (next.number - 1) / 3 : 0) * 100);
      let body = "";
      if (mode === "try") {
        body = feedback ? feedbackHtml() : `<div class="answer-area">${Q.answerControls(q, selection, words)}</div>${pending?.helped ? `<aside class="help-note"><strong>With help</strong>${escape(q.hint || q.explanation || q.answerText)}</aside>` : ""}<div class="question-actions">${pending?.helped ? '<span class="small-note">Your help is saved.</span>' : button("help", "Show a hint", "text-button", "lightbulb")}${button("check", "Check", "primary", "check", canCheck(q) ? "" : "disabled")}</div>`;
      } else if (!pending?.revealed) {
        body = `<div class="answer-area"><p class="parent-note">Say your answer first.</p><div class="question-actions">${pending?.helped ? '<span class="pill">With help is saved</span>' : button("help", "A hint was given", "text-button", "hand")}${button("reveal", "Show answer", "primary", "arrow-right")}</div></div>`;
      } else {
        body = `<section class="answer-reveal"><p>ONE WAY TO SAY IT</p><h3>${escape(q.answerText)}</h3>${button("answer-audio", "Listen to the answer", "listen-button", "volume-2")}${q.accepted?.length ? `<div class="accepted">You can also say: ${q.accepted.map(escape).join(" / ")}</div>` : ""}</section><p class="parent-label">Grown-up check</p><p class="parent-note">Before showing the answer.</p>${pending.helped ? '<p class="help-note">A hint was given. Choose With help or Not yet.</p>' : ""}<div class="ratings">${button("rate", "Got it", "rating", "check", `data-rating="gotIt" ${pending.helped ? "disabled" : ""}`)}${button("rate", "With help", "rating", "hand", 'data-rating="withHelp"')}${button("rate", "Not yet", "rating", "rotate-ccw", 'data-rating="notYet"')}</div>`;
      }
      return `<div class="session-heading"><div><p class="eyebrow">${modeLabel(mode)}${next.phase !== "initial" ? " · REVIEW" : ""}</p><h1>${escape(next.concept.title)}</h1></div><span class="step-badge">${step}</span></div><div class="progress-track" aria-hidden="true"><span style="width:${progress}%"></span></div><section class="question-card"><div class="question-layout">${Q.sceneHtml(q.scene)}<div class="question-content">${button("question-audio", "Listen", "listen-button", "volume-2")}<h2 id="question-prompt">${escape(q.prompt)}</h2><p class="instruction${mode === "say" ? " speaking-cue" : ""}">${escape(q.instruction)}</p></div></div>${body}<p class="audio-status" id="audio-message" role="status">${escape(audioMessage)}</p>${audioMessage.startsWith("Could not") ? button("retry-audio", "Try the sound again", "text-button", "rotate-ccw") : ""}</section>${footer()}`;
    }
    function roundHtml() {
      const result = summary()[mode || "try"];
      const relevant = mode === "say" ? result.concepts.filter((c) => c.id === conceptId) : result.concepts;
      const waiting = relevant.map((c) => c.dueOn).filter(Boolean).sort()[0];
      const available = mode === "say" && C.nextQuestion(bridge.getProgress(), lesson, "say", date());
      return `<section class="round-card"><span class="round-mark">${icon("circle-check")}</span><p class="eyebrow">${modeLabel(mode)} · ${result.done ? "LESSON DONE" : "ROUND DONE"}</p><h1>Done for now.</h1>${waiting ? `<p>${escape(reviewLabel(waiting))}</p>` : ""}<div class="round-actions">${button("home", "My lesson", "secondary", "arrow-left")}${available ? button("choose-say", "Choose another idea", "primary", "arrow-right") : button("progress", "See my progress", "primary", "arrow-right", `data-mode="${mode}"`)}</div></section>${footer()}`;
    }
    function render() {
      const page = view === "home" ? homeHtml() : view === "progress" ? progressHtml() : view === "practice" ? practiceHtml() : roundHtml();
      root.innerHTML = header() + (error ? `<p class="error" role="alert">${escape(error)}</p>` : "") + page;
      bridge.setActive?.(view === "practice" && canPlay());
      if (busy) root.querySelectorAll("button").forEach((element) => { element.disabled = true; });
    }
    async function persist(progress, activity) {
      busy = true;
      root.querySelectorAll("button").forEach((element) => { element.disabled = true; });
      try { await bridge.saveProgress(progress, activity); lastProgress = JSON.stringify(bridge.getProgress()); }
      finally { busy = false; }
    }
    async function play(kind, options) {
      const next = feedback?.next ?? current();
      if (!canPlay() || view !== "practice" || !next || kind === "answer" && !feedback && !(mode === "say" && next.pending?.revealed)) return;
      lastAudio = kind;
      await audio.play(next.question.audio[kind], options);
    }
    async function handle(action, data = {}) {
      if (busy || destroyed) return;
      error = "";
      let nextSound = null;
      try {
        if (action === "sync") { await bridge.syncNow(); updateStatus(); return; }
        if (action === "home" || action === "progress" || action === "choose-say") {
          if (action === "progress" && !["try", "say"].includes(data.mode)) return;
          stopAudio(); feedback = null;
          if (action !== "home") { mode = action === "choose-say" ? "say" : data.mode; conceptId = null; }
          view = action === "home" ? "home" : "progress"; render(); return;
        }
        if (action === "start-try" || action === "start-say") {
          mode = action === "start-try" ? "try" : "say"; conceptId = mode === "say" ? data.concept : null;
          view = "practice"; resetQuestion(); if (!current()) view = "round"; render(); await play("question"); return;
        }
        if (view !== "practice") return;
        if (!feedback && lastKey !== questionKey(current())) { resetQuestion(); error = "Your saved practice changed. Please try this question."; render(); await play("question"); return; }
        const next = feedback?.next ?? current();
        if (!next) { view = "round"; render(); return; }
        const q = next.question;
        if (action === "question-audio" || action === "answer-audio" || action === "retry-audio") { await play(action === "retry-audio" ? lastAudio : action === "answer-audio" ? "answer" : "question"); return; }
        if (action === "pick") selection = data.choice;
        else if (action === "add-word" && !words.includes(data.word) && q.tokens?.some((t) => t.id === data.word)) words.push(data.word);
        else if (action === "remove-word") words = words.filter((word) => word !== data.word);
        else if ((action === "help" || action === "reveal") && !feedback) {
          stopAudio();
          const epoch = audioEpoch;
          await persist(C.markPending(bridge.getProgress(), lesson, mode, date(), next.concept.id, q.id, action === "help" ? "help" : "reveal"));
          if (action === "reveal" && epoch === audioEpoch) nextSound = () => play("answer");
        } else if (action === "check" && mode === "try" && !feedback) {
          const result = C.submitTry(bridge.getProgress(), lesson, date(), next.concept.id, q.id, q.type === "choice" ? selection : words);
          if (result.recorded) {
            stopAudio(); const epoch = audioEpoch;
            await persist(result.progress, { answered: true, correct: result.outcome === "independent" });
            feedback = { next, question: q, outcome: result.outcome };
            if (epoch === audioEpoch) nextSound = () => play("answer", { effect: result.outcome === "incorrect" ? "neutral" : "correct" });
          } else resetQuestion();
        } else if (action === "rate" && mode === "say" && !feedback) {
          const result = C.submitSay(bridge.getProgress(), lesson, date(), next.concept.id, q.id, data.rating);
          if (result.recorded) {
            stopAudio(); const epoch = audioEpoch;
            await persist(result.progress, { answered: false });
            const audible = epoch === audioEpoch && canPlay();
            resetQuestion(); if (!current()) view = "round";
            if (audible) nextSound = view === "practice" ? () => play("question", data.rating === "gotIt" ? { effect: "correct" } : undefined) : data.rating === "gotIt" ? () => audio.playEffect("correct") : null;
          }
        } else if (action === "next" && feedback) { resetQuestion(); if (!current()) view = "round"; else nextSound = () => play("question"); }
        else if (action === "correct" && feedback) { stopAudio(); correcting = true; selection = null; words = []; correctionChecked = false; }
        else if (action === "check-correction" && feedback && correcting) {
          correctionChecked = C.checkAnswer(q, q.type === "choice" ? selection : words);
          if (!correctionChecked) error = "Look at the example and try once more, or continue.";
          nextSound = () => play("answer", { effect: correctionChecked ? "correct" : "neutral" });
        }
        if (destroyed) return;
        render();
        if (nextSound && canPlay()) await nextSound();
      } catch (caught) { if (!destroyed) { error = caught?.message || "Something went wrong. Please try again."; render(); } }
    }
    const clicked = (event) => {
      const element = event.target.closest?.("button[data-action]");
      if (!element || element.disabled) return;
      audio.unlock();
      void handle(element.dataset.action, element.dataset);
    };
    const leave = () => { suspended = true; stopAudio(); bridge.setActive?.(false); };
    const visible = () => { suspended = documentTarget?.visibilityState === "hidden"; if (suspended) leave(); else bridge.setActive?.(view === "practice"); };
    root.addEventListener("click", clicked);
    eventTarget.addEventListener?.("pagehide", leave);
    eventTarget.addEventListener?.("pageshow", visible);
    documentTarget?.addEventListener?.("visibilitychange", visible);
    render();
    return { onChange, handle, destroy() {
      destroyed = true; stopAudio(); audio.destroy(); bridge.setActive?.(false); root.removeEventListener("click", clicked);
      eventTarget.removeEventListener?.("pagehide", leave); eventTarget.removeEventListener?.("pageshow", visible);
      documentTarget?.removeEventListener?.("visibilitychange", visible);
    } };
  }
  async function boot() {
    const root = document.getElementById("nativecamp");
    let app;
    try {
      if (!C || !Q || !global.NativeCampAudio || !global.NativeCampPlatform) throw Error("This page did not finish loading. Please reload.");
      const response = await fetch("lessons/2026-09-15.json", { cache: "no-cache" });
      if (!response.ok) throw Error("Your lesson could not be loaded. Please try again.");
      const lesson = C.validateLesson(await response.json());
      const bridge = await global.NativeCampPlatform.boot(lesson, (event) => app?.onChange(event));
      app = mount({ root, lesson, bridge });
      global.addEventListener("pagehide", () => bridge.setActive?.(false));
    } catch (error) {
      root.innerHTML = `<section class="loading-card"><p class="eyebrow">NATIVE CAMP REVIEW</p><h1>Let's try again.</h1><p class="error" role="alert">${escape(error?.message || "This page could not be opened.")}</p>${button("reload", "Try again", "primary", "rotate-ccw")} <a class="nav-link" href="../">${icon("house")}My home</a></section>`;
      root.querySelector('[data-action="reload"]')?.addEventListener("click", () => location.reload());
    }
    return app;
  }
  global.NativeCampApp = { mount, boot };
})(globalThis);
