(function (global) {
  "use strict";
  const C = global.NativeCampCore;
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  function icon(name, extra = "") { return `<svg class="icon ${extra}" aria-hidden="true"><use href="icons.svg#${name}"></use></svg>`; }
  function button(action, label, style = "secondary", iconName = null, attrs = "") { return `<button type="button" class="${style}" data-action="${action}" ${attrs}>${iconName ? icon(iconName) : ""}${label}</button>`; }
  const dateLabel = (date) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(date + "T00:00:00Z"));
  const modeLabel = (mode) => mode === "try" ? "Try it" : "Say it";
  function sceneHtml(scene) {
    const pictures = { cats: "cat", dogs: "dog", trees: "tree-pine", books: "book-open", toys: "toy-brick" };
    const hat = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18c4-3 14-3 18 0M6 16l2-10h8l2 10M7 13h10M3 18c1 4 17 4 18 0"/></svg>';
    const count = scene.count ?? 0;
    const label = scene.number !== undefined ? String(scene.number) : `${count} ${scene.kind}`;
    const image = scene.number !== undefined ? `<span class="scene-number">${scene.number}</span>` : `<div class="scene-grid ${count > 6 ? "many" : ""}">${Array.from({ length: count }, () => scene.kind === "hats" ? hat : icon(pictures[scene.kind] || "toy-brick")).join("")}${count === 0 ? '<span class="scene-number">0</span>' : ""}</div>`;
    return `<div class="scene ${escape(scene.kind)}"><div role="img" aria-label="${escape(label)}">${image}</div>${scene.heading ? `<p class="scene-heading">${escape(scene.heading)}</p>` : ""}</div>`;
  }
  function mount({ root, lesson, bridge, date = () => C.today(), makeAudio = () => new Audio() }) {
    C.validateLesson(lesson);
    let view = "home", mode = null, conceptId = null, selection = null, words = [], feedback = null, correcting = false, correctionChecked = false;
    let busy = false, error = "", audioMessage = "", activeAudio = null, audioEpoch = 0, lastAudio = "question", lastKey = null;
    let lastProgress = JSON.stringify(bridge.getProgress());
    const summary = () => C.summarizeLesson(bridge.getProgress(), lesson, date());
    const current = () => mode ? C.nextQuestion(bridge.getProgress(), lesson, mode, date(), mode === "say" ? conceptId : null) : null;
    const questionKey = (q) => q ? `${q.concept.id}/${q.phase}/${q.question.id}` : null;
    function stopAudio() {
      audioEpoch++;
      if (activeAudio) { activeAudio.pause(); activeAudio.removeAttribute?.("src"); activeAudio.load?.(); activeAudio = null; }
      audioMessage = "";
    }
    function resetQuestion() { stopAudio(); selection = null; words = []; feedback = null; correcting = false; correctionChecked = false; error = ""; lastKey = questionKey(current()); }
    function updateStatus() {
      const target = root.querySelector("#sync-message");
      if (target) target.textContent = bridge.status();
    }
    function updateAudioStatus() { const target = root.querySelector("#audio-message"); if (target) target.textContent = audioMessage; }
    function onChange(event = {}) {
      updateStatus();
      const fresh = JSON.stringify(bridge.getProgress());
      if (fresh === lastProgress) return;
      lastProgress = fresh;
      if (busy) return;
      if (view === "practice" && questionKey(current()) !== lastKey) {
        resetQuestion();
        error = "Your saved practice changed. Here is your next question.";
        if (!current()) view = "round";
      }
      // A status update must never replace selected words or interrupt a recording.
      render();
    }
    function header() {
      return `<header class="topbar"><div class="brand"><span class="brand-icon">${icon("book-open")}</span><span>NATIVE CAMP<br>REVIEW</span></div>${view === "home" ? `<a class="nav-link" href="${escape(bridge.homeHref)}">${icon("house")}My home</a>` : button("home", "My lesson", "nav-link", "arrow-left")}</header>`;
    }
    function footer() { return `<footer class="page-footer"><div class="sync-line"><span class="sync-dot" aria-hidden="true"></span><span id="sync-message" role="status">${escape(bridge.status())}</span>${button("sync", "Sync", "text-button", "rotate-ccw")}</div>${button("summary", "Parent summary", "text-button", "book-open")}</footer>`; }
    function modeCard(which, information) {
      const due = information.concepts.filter((x) => x.due).length;
      const waiting = information.concepts.some((x) => x.dueOn && !x.due);
      const available = C.nextQuestion(bridge.getProgress(), lesson, which, date());
      const action = which === "try" ? available ? "start-try" : "summary" : "choose-say";
      const doneBadge = information.done ? `<span class="pill done">${icon("check")}Done</span>` : '<span class="pill">Small steps</span>';
      return `<article class="mode-card ${which}"><div class="mode-top"><span class="mode-icon">${icon(which === "try" ? "lightbulb" : "message-circle")}</span>${doneBadge}</div><h2>${modeLabel(which)}</h2><p>${which === "try" ? "Tap, choose, and build a sentence. You can do this on your own." : "Say your answer out loud. A grown-up helps you check."}</p>${button(action, available ? due ? "Review now" : "Let's start" : "See my progress", "primary", "arrow-right")}<div class="mode-footer">${icon(waiting || due ? "calendar-days" : "check")}${due ? `${due} ${due === 1 ? "short review" : "short reviews"} ready` : waiting ? "A little more another day" : which === "try" ? "3 ideas · 6–9 first questions" : "1 idea at a time · 2–3 questions"}</div></article>`;
    }
    function homeHtml() {
      const result = summary();
      return `<section class="hero"><div><p class="eyebrow">A LITTLE PRACTICE, EVERY DAY</p><h1>Let's try it.<br>Then say it.</h1><p>Your English lesson, one small step at a time.</p></div><div class="lesson-art" aria-hidden="true">${icon("book-open")}<span>${icon("check")}</span></div></section><div class="lesson-heading">${icon("calendar-days")}<span>${escape(dateLabel(lesson.date))} <strong>· ${escape(lesson.title)}</strong></span></div><section class="mode-grid" aria-label="Choose a practice mode">${modeCard("try", result.try)}${modeCard("say", result.say)}</section><div class="concept-tags" aria-label="Lesson ideas">${lesson.concepts.map((c) => `<span class="tag">${escape(c.title)}</span>`).join("")}</div>${footer()}`;
    }
    function chooseHtml() {
      const result = summary().say;
      return `<p class="eyebrow">SAY IT · WITH A GROWN-UP</p><h1>Pick one idea.</h1><p class="summary-intro">Answer out loud, then check together. You can stop after one idea.</p><section class="concept-list">${result.concepts.map((concept) => {
        const next = C.nextQuestion(bridge.getProgress(), lesson, "say", date(), concept.id);
        const text = concept.due ? "One question to try today." : concept.done ? concept.dueOn ? `Done. A little review from ${dateLabel(concept.dueOn)}.` : "Done. This practice is finished." : "A short round of 2–3 questions.";
        return `<article class="concept-card"><div><h3>${escape(concept.title)}</h3><p>${escape(text)}</p></div>${next ? button("start-say", "Let's go", "primary", "arrow-right", `data-concept="${escape(concept.id)}"`) : `<span class="pill done">${icon("check")}Done</span>`}</article>`;
      }).join("")}</section>${footer()}`;
    }
    function answerControls(question) {
      if (question.type === "choice") return `<div class="choices">${question.choices.map((choice) => button("pick", escape(choice.text), "choice", null, `data-choice="${escape(choice.id)}" aria-pressed="${selection === choice.id}"`)).join("")}</div>`;
      return `<div class="word-tray" aria-label="Your sentence">${words.map((id) => button("remove-word", escape(question.tokens.find((t) => t.id === id).text), "word", null, `data-word="${escape(id)}" aria-label="Remove ${escape(question.tokens.find((t) => t.id === id).text)}"`)).join("")}</div><div class="word-bank" aria-label="Word cards">${question.tokens.filter((token) => !words.includes(token.id)).map((token) => button("add-word", escape(token.text), "word", null, `data-word="${escape(token.id)}"`)).join("")}</div>`;
    }
    function feedbackHtml() {
      const { question, outcome } = feedback;
      const correct = outcome !== "incorrect";
      return `<section class="feedback ${correct ? "" : "retry"}" aria-live="polite"><h3>${icon(correct ? "circle-check" : "lightbulb")}${correct ? outcome === "helped" ? "You did it with help." : "You got it." : "Let's look together."}</h3><p>${escape(question.answerText)}</p>${question.explanation ? `<p class="small-note">${escape(question.explanation)}</p>` : ""}${button("answer-audio", "Listen to the answer", "listen-button", "volume-2")}</section>${correcting ? `<p class="correction-label">Try the same idea once more. Your first answer stays saved.</p>${answerControls(question)}${correctionChecked ? '<p class="help-note">That matches. Your first answer has not changed.</p>' : ""}` : ""}<div class="question-actions">${!correct && !correcting ? button("correct", "Try again", "text-button", "rotate-ccw") : '<span class="small-note">First answer saved.</span>'}${correcting && !correctionChecked ? button("check-correction", "Check", "secondary", "check", canCheck(question) ? "" : "disabled") : ""}${button("next", "Continue", "primary", "arrow-right")}</div>`;
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
        body = feedback ? feedbackHtml() : `<div class="answer-area">${answerControls(q)}</div>${pending?.helped ? `<aside class="help-note"><strong>With help</strong>${escape(q.hint || q.explanation || q.answerText)}</aside>` : ""}<div class="question-actions">${pending?.helped ? '<span class="small-note">Your help is saved.</span>' : button("help", "Show a hint", "text-button", "lightbulb")}${button("check", "Check", "primary", "check", canCheck(q) ? "" : "disabled")}</div>`;
      } else if (!pending?.revealed) {
        body = `<div class="answer-area"><p class="parent-note">Say your answer first. Then check it together.</p><div class="question-actions">${pending?.helped ? '<span class="pill">With help is saved</span>' : button("help", "A hint was given", "text-button", "hand")}${button("reveal", "Show answer", "primary", "arrow-right")}</div></div>`;
      } else {
        body = `<section class="answer-reveal"><p>ONE WAY TO SAY IT</p><h3>${escape(q.answerText)}</h3>${button("answer-audio", "Listen to the answer", "listen-button", "volume-2")}${q.accepted?.length ? `<div class="accepted">You can also say: ${q.accepted.map(escape).join(" / ")}</div>` : ""}</section><p class="parent-label">Grown-up check</p><p class="parent-note">How did they answer <strong>before</strong> seeing the answer? Listening or reading it now does not change that.</p>${pending.helped ? '<p class="help-note">A hint was given. Choose With help or Not yet.</p>' : ""}<div class="ratings">${button("rate", "Got it", "rating", "check", `data-rating="gotIt" ${pending.helped ? "disabled" : ""}`)}${button("rate", "With help", "rating", "hand", 'data-rating="withHelp"')}${button("rate", "Not yet", "rating", "rotate-ccw", 'data-rating="notYet"')}</div>`;
      }
      return `<div class="session-heading"><div><p class="eyebrow">${modeLabel(mode)}${next.phase !== "initial" ? " · REVIEW" : ""}</p><h1>${escape(next.concept.title)}</h1></div><span class="step-badge">${step}</span></div><div class="progress-track" aria-hidden="true"><span style="width:${progress}%"></span></div><section class="question-card"><div class="question-layout">${sceneHtml(q.scene)}<div class="question-content">${button("question-audio", "Listen", "listen-button", "volume-2")}<h2 id="question-prompt">${escape(q.prompt)}</h2><p class="instruction">${escape(q.instruction)}</p></div></div>${body}<p class="audio-status" id="audio-message" role="status">${escape(audioMessage)}</p>${audioMessage.startsWith("Could not") ? button("retry-audio", "Try the sound again", "text-button", "rotate-ccw") : ""}</section>${footer()}`;
    }
    function roundHtml() {
      const result = summary()[mode || "try"];
      const relevant = mode === "say" ? result.concepts.filter((c) => c.id === conceptId) : result.concepts;
      const waiting = relevant.map((c) => c.dueOn).filter(Boolean).sort()[0];
      const available = mode === "say" && C.nextQuestion(bridge.getProgress(), lesson, "say", date());
      return `<section class="round-card"><span class="round-mark">${icon("circle-check")}</span><p class="eyebrow">${modeLabel(mode)} · ${result.done ? "LESSON DONE" : "ROUND DONE"}</p><h1>That's enough for now.</h1><p>${mode === "say" ? "You finished this idea. Take a break, or choose another one." : "You finished your practice for now. Take a little break."}</p>${waiting ? `<p>A little review will be ready from <strong>${escape(dateLabel(waiting))}</strong>.</p>` : ""}<p class="small-note">Done means this practice is finished. We can still review another day.</p><div class="round-actions">${button("home", "Back to my lesson", "secondary", "arrow-left")}${available ? button("choose-say", "Choose another idea", "primary", "arrow-right") : ""}</div></section>${footer()}`;
    }
    function summaryHtml() {
      const data = summary();
      return `<p class="eyebrow">PARENT SUMMARY · ${escape(dateLabel(lesson.date))}</p><h1>See the first answers.</h1><p class="summary-intro">Independent answers, help, and mistakes stay separate. An answer shown later never changes the first result. Questions not yet asked are not counted.</p>${["try", "say"].map((which) => `<section class="summary-section"><h2>${modeLabel(which)} ${data[which].done ? '<span class="pill done">Done</span>' : ""}</h2><div class="summary-grid">${data[which].concepts.map((item) => `<article class="summary-card"><h3>${escape(item.title)}</h3>${(which === "try" ? [["Independent", item.independent], ["With help", item.helped], ["Incorrect", item.incorrect]] : [["Got it", item.gotIt], ["With help", item.withHelp], ["Not yet", item.notYet]]).map(([label, value]) => `<div class="stat-row"><span>${label}</span><strong>${value}</strong></div>`).join("")}<div class="stat-row"><span>First answers</span><strong>${item.attempted}</strong></div><span class="pill">${item.due ? "Review ready" : item.dueOn ? `Review from ${escape(dateLabel(item.dueOn))}` : item.done ? "Practice done" : "Still to try"}</span>${item.reviews ? `<p class="review-note">Later reviews: ${item.reviews}. Independent: ${item.reviewSuccesses}. These do not change the first answers.</p>` : ""}</article>`).join("")}</div></section>`).join("")}<p class="summary-intro small-note">Try it and Say it have their own Done status. Done means the practice amount is complete, not that an idea is learned forever.</p>${footer()}`;
    }
    function render() {
      const page = view === "home" ? homeHtml() : view === "choose" ? chooseHtml() : view === "practice" ? practiceHtml() : view === "summary" ? summaryHtml() : roundHtml();
      root.innerHTML = header() + (error ? `<p class="error" role="alert">${escape(error)}</p>` : "") + page;
      bridge.setActive?.(view === "practice");
      if (busy) root.querySelectorAll("button").forEach((element) => { element.disabled = true; });
    }
    async function persist(progress, activity) {
      busy = true;
      root.querySelectorAll("button").forEach((element) => { element.disabled = true; });
      try { await bridge.saveProgress(progress, activity); lastProgress = JSON.stringify(bridge.getProgress()); }
      finally { busy = false; }
    }
    async function play(kind) {
      const next = feedback?.next ?? current();
      if (!next || kind === "answer" && !feedback && !(mode === "say" && next.pending?.revealed)) return;
      stopAudio(); lastAudio = kind;
      const epoch = audioEpoch;
      const resource = next.question.audio[kind];
      audioMessage = "Getting the sound ready..."; updateAudioStatus();
      try {
        let source;
        if (typeof resource === "string") source = resource;
        else source = await bridge.privateAudio(resource.private);
        if (epoch !== audioEpoch) return;
        const player = makeAudio();
        activeAudio = player;
        player.src = source;
        player.onended = () => { if (activeAudio === player) { audioMessage = "You can listen again."; updateAudioStatus(); } };
        player.onerror = () => { if (activeAudio === player) { audioMessage = "Could not play the sound. Please try again."; render(); } };
        await player.play();
        if (epoch !== audioEpoch) { player.pause(); return; }
        audioMessage = "Listening..."; updateAudioStatus();
      } catch { if (epoch === audioEpoch) { audioMessage = "Could not play the sound. Please try again."; render(); } }
    }
    async function handle(action, data = {}) {
      if (busy) return;
      error = "";
      try {
        if (action === "sync") { await bridge.syncNow(); updateStatus(); return; }
        if (action === "home" || action === "summary" || action === "choose-say") {
          stopAudio(); feedback = null; view = action === "home" ? "home" : action === "summary" ? "summary" : "choose"; render(); return;
        }
        if (action === "start-try" || action === "start-say") {
          mode = action === "start-try" ? "try" : "say"; conceptId = mode === "say" ? data.concept : null;
          view = "practice"; resetQuestion(); if (!current()) view = "round"; render(); return;
        }
        if (view !== "practice") return;
        if (!feedback && lastKey !== questionKey(current())) { resetQuestion(); error = "Your saved practice changed. Please try this question."; render(); return; }
        const next = feedback?.next ?? current();
        if (!next) { view = "round"; render(); return; }
        const q = next.question;
        if (action === "question-audio" || action === "answer-audio" || action === "retry-audio") { await play(action === "retry-audio" ? lastAudio : action === "answer-audio" ? "answer" : "question"); return; }
        if (action === "pick") selection = data.choice;
        else if (action === "add-word" && !words.includes(data.word) && q.tokens?.some((t) => t.id === data.word)) words.push(data.word);
        else if (action === "remove-word") words = words.filter((word) => word !== data.word);
        else if ((action === "help" || action === "reveal") && !feedback) {
          stopAudio();
          await persist(C.markPending(bridge.getProgress(), lesson, mode, date(), next.concept.id, q.id, action === "help" ? "help" : "reveal"));
        } else if (action === "check" && mode === "try" && !feedback) {
          const result = C.submitTry(bridge.getProgress(), lesson, date(), next.concept.id, q.id, q.type === "choice" ? selection : words);
          if (result.recorded) {
            stopAudio(); await persist(result.progress, { answered: true, correct: result.outcome === "independent" });
            feedback = { next, question: q, outcome: result.outcome };
          } else resetQuestion();
        } else if (action === "rate" && mode === "say" && !feedback) {
          const result = C.submitSay(bridge.getProgress(), lesson, date(), next.concept.id, q.id, data.rating);
          if (result.recorded) { stopAudio(); await persist(result.progress, { answered: false }); resetQuestion(); if (!current()) view = "round"; }
        } else if (action === "next" && feedback) { resetQuestion(); if (!current()) view = "round"; }
        else if (action === "correct" && feedback) { correcting = true; selection = null; words = []; correctionChecked = false; }
        else if (action === "check-correction" && feedback && correcting) { correctionChecked = C.checkAnswer(q, q.type === "choice" ? selection : words); if (!correctionChecked) error = "Look at the example and try once more, or continue."; }
        render();
      } catch (caught) { error = caught?.message || "Something went wrong. Please try again."; render(); }
    }
    const clicked = (event) => {
      const element = event.target.closest?.("button[data-action]");
      if (!element || element.disabled) return;
      void handle(element.dataset.action, element.dataset);
    };
    root.addEventListener("click", clicked);
    render();
    return { onChange, handle, destroy() { stopAudio(); bridge.setActive?.(false); root.removeEventListener("click", clicked); } };
  }
  async function boot() {
    const root = document.getElementById("nativecamp");
    let app;
    try {
      if (!C || !global.NativeCampPlatform) throw Error("This page did not finish loading. Please reload.");
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
