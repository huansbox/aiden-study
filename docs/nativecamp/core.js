(function (root) {
  "use strict";
  const MODES = ["try", "say"];
  const OUTCOMES = { try: ["independent", "helped", "incorrect"], say: ["gotIt", "withHelp", "notYet"] };
  const ID = /^[a-z0-9][a-z0-9-]{0,79}$/;
  const validId = (value) => typeof value === "string" && ID.test(value);
  const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  function requireValue(ok, message = "This saved progress is not valid.") { if (!ok) throw Error(message); }
  function validDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(value + "T00:00:00Z");
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }
  function today(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const part = (name) => parts.find((p) => p.type === name).value;
    return `${part("year")}-${part("month")}-${part("day")}`;
  }
  function nextDay(date) {
    requireValue(validDate(date), "Please check the practice date.");
    const value = new Date(date + "T00:00:00Z");
    value.setUTCDate(value.getUTCDate() + 1);
    return value.toISOString().slice(0, 10);
  }
  function createProgress() { return { schemaVersion: 1, lessons: {} }; }
  function emptyConcept() { return { initial: [], reviews: [], completedOn: null, dueOn: null, deferredQuestionId: null, pending: null }; }
  function validateProgress(input) {
    requireValue(object(input) && input.schemaVersion === 1 && object(input.lessons));
    requireValue(Object.keys(input.lessons).length <= 200);
    const result = createProgress();
    for (const [lessonId, lesson] of Object.entries(input.lessons)) {
      requireValue(ID.test(lessonId) && object(lesson));
      const normalized = { try: {}, say: {} };
      for (const mode of MODES) {
        const concepts = lesson[mode] ?? {};
        requireValue(object(concepts) && Object.keys(concepts).length <= 30);
        for (const [conceptId, state] of Object.entries(concepts)) {
          requireValue(ID.test(conceptId) && object(state));
          requireValue(Array.isArray(state.initial) && state.initial.length <= 3 && Array.isArray(state.reviews) && state.reviews.length <= 2000);
          const normalizedState = emptyConcept();
          for (const list of ["initial", "reviews"]) {
            normalizedState[list] = state[list].map((attempt) => {
              requireValue(object(attempt) && validId(attempt.questionId) && validDate(attempt.date) && OUTCOMES[mode].includes(attempt.outcome) && typeof attempt.helped === "boolean");
              return { questionId: attempt.questionId, date: attempt.date, outcome: attempt.outcome, helped: attempt.helped };
            });
          }
          requireValue(new Set(normalizedState.initial.map((a) => a.questionId)).size === normalizedState.initial.length);
          requireValue(new Set(normalizedState.reviews.map((a) => a.date)).size === normalizedState.reviews.length);
          for (const key of ["completedOn", "dueOn"]) {
            requireValue(state[key] === null || validDate(state[key]));
            normalizedState[key] = state[key];
          }
          requireValue(state.deferredQuestionId === null || validId(state.deferredQuestionId));
          normalizedState.deferredQuestionId = state.deferredQuestionId;
          requireValue(!state.completedOn || state.initial.length >= 2);
          requireValue(!state.dueOn || (state.completedOn && state.dueOn > state.completedOn));
          requireValue(!state.deferredQuestionId || (state.initial.length === 2 && state.completedOn && state.dueOn));
          requireValue(!state.reviews.length || (state.completedOn && !state.deferredQuestionId));
          if (state.pending !== null) {
            const pending = state.pending;
            requireValue(object(pending) && validId(pending.questionId) && ["initial", "deferred", "review"].includes(pending.phase) && typeof pending.helped === "boolean" && typeof pending.revealed === "boolean" && validDate(pending.date));
            normalizedState.pending = { questionId: pending.questionId, phase: pending.phase, helped: pending.helped, revealed: pending.revealed, date: pending.date };
          }
          validateSchedule(normalizedState, mode);
          normalized[mode][conceptId] = normalizedState;
        }
      }
      result.lessons[lessonId] = normalized;
    }
    return result;
  }
  function validateLesson(lesson) {
    requireValue(object(lesson) && lesson.schemaVersion === 1 && validId(lesson.id) && validDate(lesson.date), "This lesson could not be opened.");
    const text = (value) => typeof value === "string" && value.trim().length > 0 && value.length <= 1500;
    requireValue(text(lesson.title) && Array.isArray(lesson.concepts) && lesson.concepts.length > 0 && lesson.concepts.length <= 30, "This lesson is incomplete.");
    const ids = new Set();
    const addId = (id) => { requireValue(typeof id === "string" && ID.test(id) && !ids.has(id), "This lesson has repeated or invalid questions."); ids.add(id); };
    const audio = (value) => typeof value === "string" ? /^audio\/[a-zA-Z0-9/_-]+\.(mp3|wav|ogg)$/.test(value) : object(value) && validId(value.private);
    for (const concept of lesson.concepts) {
      addId(concept.id);
      requireValue(text(concept.title), "This lesson needs a concept title.");
      for (const mode of MODES) {
        requireValue(Array.isArray(concept[mode]) && concept[mode].length >= 3, "This lesson needs three practice questions.");
        for (const q of concept[mode]) {
          addId(q.id);
          requireValue(text(q.prompt) && text(q.instruction) && text(q.answerText), "This question is incomplete.");
          requireValue(object(q.scene) && ["cats", "dogs", "trees", "books", "toys", "numbers", "hats"].includes(q.scene.kind), "This picture could not be opened.");
          requireValue(q.scene.count === undefined || Number.isInteger(q.scene.count) && q.scene.count >= 0 && q.scene.count <= 30, "This picture has an invalid count.");
          requireValue(q.scene.number === undefined || Number.isInteger(q.scene.number) && q.scene.number >= 0 && q.scene.number <= 10000, "This number is not valid.");
          requireValue(object(q.audio) && audio(q.audio.question) && audio(q.audio.answer), "This question needs its recordings.");
          if (mode === "try") {
            requireValue(["choice", "order"].includes(q.type), "This question type is not supported.");
            const options = q.type === "choice" ? q.choices : q.tokens;
            requireValue(Array.isArray(options) && options.length >= 2 && options.length <= 18 && options.every((x) => object(x) && typeof x.id === "string" && ID.test(x.id) && text(x.text)) && new Set(options.map((x) => x.id)).size === options.length, "This question needs valid choices.");
            if (q.type === "choice") requireValue(options.some((x) => x.id === q.answer), "This question needs an answer.");
            else requireValue(Array.isArray(q.acceptedOrders) && q.acceptedOrders.length > 0 && q.acceptedOrders.every((order) => Array.isArray(order) && order.length === options.length && new Set(order).size === order.length && order.every((id) => options.some((x) => x.id === id))), "This sentence needs a complete answer.");
          }
        }
      }
    }
    return lesson;
  }
  function conceptState(progress, lessonId, mode, conceptId) { return progress.lessons[lessonId]?.[mode]?.[conceptId] ?? emptyConcept(); }
  function independent(mode, outcome) { return outcome === (mode === "try" ? "independent" : "gotIt"); }
  // Dates and completion are derived from the saved first answers and spaced
  // reviews. Reject contradictory external snapshots instead of inventing a repair.
  function validateSchedule(state, mode) {
    const first = state.initial;
    for (const attempt of [...first, ...state.reviews]) {
      requireValue(!independent(mode, attempt.outcome) || !attempt.helped);
      requireValue(!["helped", "withHelp"].includes(attempt.outcome) || attempt.helped);
    }
    for (let i = 1; i < first.length; i++) requireValue(first[i].date >= first[i - 1].date);
    const early = first.length >= 2 && first.slice(0, 2).every((attempt) => independent(mode, attempt.outcome));
    let completedOn = null, dueOn = null, phase = "initial", expectedQuestion = null;
    if (early) {
      completedOn = first[1].date;
      dueOn = nextDay(completedOn);
      if (first.length === 2) {
        requireValue(validId(state.deferredQuestionId) && !first.some((a) => a.questionId === state.deferredQuestionId));
        phase = "deferred";
        expectedQuestion = state.deferredQuestionId;
      } else {
        requireValue(first[2].date >= dueOn);
        dueOn = independent(mode, first[2].outcome) ? null : nextDay(first[2].date);
      }
    } else if (first.length === 3) {
      completedOn = first[2].date;
      dueOn = nextDay(completedOn);
    }
    if (!early || first.length === 3) requireValue(state.deferredQuestionId === null);
    for (let i = 0; i < state.reviews.length; i++) {
      const attempt = state.reviews[i];
      requireValue(first.length === 3 && dueOn !== null && attempt.date >= dueOn);
      requireValue(attempt.questionId === first[i % 3].questionId);
      dueOn = independent(mode, attempt.outcome) ? null : nextDay(attempt.date);
    }
    requireValue(state.completedOn === completedOn && state.dueOn === dueOn);
    if (completedOn && !state.deferredQuestionId) {
      phase = "review";
      expectedQuestion = first[state.reviews.length % 3]?.questionId;
    }
    if (state.pending) {
      requireValue(state.pending.phase === phase && (mode === "say" || !state.pending.revealed));
      if (phase === "initial") {
        requireValue(!first.some((attempt) => attempt.questionId === state.pending.questionId));
        requireValue(!first.length || state.pending.date >= first.at(-1).date);
      } else requireValue(dueOn !== null && state.pending.date >= dueOn && state.pending.questionId === expectedQuestion);
    }
  }
  function nextForConcept(progress, lesson, mode, concept, date) {
    const state = conceptState(progress, lesson.id, mode, concept.id);
    const questions = concept[mode].slice(0, 3);
    let question, phase;
    if (!state.completedOn) {
      question = questions[state.initial.length];
      phase = "initial";
    } else if (state.dueOn && state.dueOn <= date) {
      phase = state.deferredQuestionId ? "deferred" : "review";
      question = state.deferredQuestionId ? questions.find((q) => q.id === state.deferredQuestionId) : questions[state.reviews.length % questions.length];
    }
    if (!question) return null;
    return { question, concept, phase, pending: state.pending?.questionId === question.id && state.pending.phase === phase ? state.pending : null,
      number: phase === "initial" ? state.initial.length + 1 : 1, total: phase === "initial" ? 3 : 1 };
  }
  function nextQuestion(progress, lesson, mode, date, conceptId = null) {
    requireValue(MODES.includes(mode) && validDate(date), "Please choose a practice mode and date.");
    let concepts = conceptId ? lesson.concepts.filter((c) => c.id === conceptId) : lesson.concepts;
    const candidates = concepts.map((concept) => nextForConcept(progress, lesson, mode, concept, date)).filter(Boolean);
    // Leave a needed third initial question until the other concepts have had their first two.
    if (mode === "try" && !conceptId) candidates.sort((a, b) => Number(a.phase === "initial" && a.number === 3) - Number(b.phase === "initial" && b.number === 3));
    return candidates[0] ?? null;
  }
  function writable(progress, lesson, mode, conceptId) {
    const copy = validateProgress(progress);
    copy.lessons[lesson.id] ??= { try: {}, say: {} };
    copy.lessons[lesson.id][mode][conceptId] ??= emptyConcept();
    return { progress: copy, state: copy.lessons[lesson.id][mode][conceptId] };
  }
  function markPending(progress, lesson, mode, date, conceptId, questionId, action) {
    requireValue(["help", "reveal"].includes(action) && (action !== "reveal" || mode === "say"), "This action is not available.");
    const next = nextQuestion(progress, lesson, mode, date, conceptId);
    if (!next || next.question.id !== questionId) return progress;
    const change = writable(progress, lesson, mode, conceptId);
    change.state.pending = { questionId, phase: next.phase, date, helped: next.pending?.helped ?? false, revealed: next.pending?.revealed ?? false };
    change.state.pending[action === "help" ? "helped" : "revealed"] = true;
    return change.progress;
  }
  function checkAnswer(question, answer) {
    if (question.type === "choice") {
      requireValue(typeof answer === "string" && question.choices.some((c) => c.id === answer), "Pick an answer first.");
      return answer === question.answer;
    }
    requireValue(Array.isArray(answer) && answer.length === question.tokens.length && new Set(answer).size === answer.length && answer.every((id) => question.tokens.some((t) => t.id === id)), "Use each word once.");
    return question.acceptedOrders.some((order) => order.every((id, i) => id === answer[i]));
  }
  function finishAttempt(progress, lesson, mode, date, next, outcome) {
    const change = writable(progress, lesson, mode, next.concept.id);
    const state = change.state;
    const attempt = { questionId: next.question.id, date, outcome, helped: Boolean(next.pending?.helped || outcome === "withHelp" || outcome === "helped") };
    const previousDate = [...state.initial, ...state.reviews].map((a) => a.date).sort().at(-1);
    requireValue(!previousDate || date >= previousDate, "Please check the practice date.");
    if (next.phase === "review") state.reviews.push(attempt);
    else state.initial.push(attempt);
    state.pending = null;
    if (next.phase === "initial") {
      const early = state.initial.length === 2 && state.initial.every((a) => independent(mode, a.outcome));
      if (early || state.initial.length === 3) {
        state.completedOn = date;
        state.dueOn = nextDay(date);
        state.deferredQuestionId = early ? next.concept[mode][2].id : null;
      }
    } else {
      state.deferredQuestionId = null;
      state.dueOn = independent(mode, outcome) ? null : nextDay(date);
    }
    return { progress: change.progress, recorded: true, outcome, correct: mode === "try" ? outcome !== "incorrect" : outcome === "gotIt", phase: next.phase };
  }
  function submitTry(progress, lesson, date, conceptId, questionId, answer) {
    const next = nextQuestion(progress, lesson, "try", date, conceptId);
    if (!next || next.question.id !== questionId) return { progress, recorded: false };
    const correct = checkAnswer(next.question, answer);
    const outcome = correct ? next.pending?.helped ? "helped" : "independent" : "incorrect";
    return finishAttempt(progress, lesson, "try", date, next, outcome);
  }
  function submitSay(progress, lesson, date, conceptId, questionId, rating) {
    requireValue(OUTCOMES.say.includes(rating), "Choose a parent rating.");
    const next = nextQuestion(progress, lesson, "say", date, conceptId);
    if (!next || next.question.id !== questionId) return { progress, recorded: false };
    requireValue(next.pending?.revealed, "Show the answer before choosing a rating.");
    requireValue(!(next.pending.helped && rating === "gotIt"), "A hint was given. Choose With help or Not yet.");
    return finishAttempt(progress, lesson, "say", date, next, rating);
  }
  function summarizeLesson(progress, lesson, date) {
    requireValue(validDate(date), "Please check the practice date.");
    const result = {};
    for (const mode of MODES) {
      const concepts = lesson.concepts.map((concept) => {
        const state = conceptState(progress, lesson.id, mode, concept.id);
        const summary = { id: concept.id, title: concept.title, attempted: state.initial.length, due: Boolean(state.dueOn && state.dueOn <= date), done: Boolean(state.completedOn), dueOn: state.dueOn,
          reviews: state.reviews.length, reviewSuccesses: state.reviews.filter((a) => independent(mode, a.outcome)).length };
        for (const outcome of OUTCOMES[mode]) summary[outcome] = state.initial.filter((a) => a.outcome === outcome).length;
        return summary;
      });
      result[mode] = { done: concepts.length > 0 && concepts.every((c) => c.done), concepts };
    }
    return result;
  }
  root.NativeCampCore = { createProgress, validateProgress, validateLesson, summarizeLesson, today, nextDay, nextQuestion, markPending, checkAnswer, submitTry, submitSay };
})(globalThis);
