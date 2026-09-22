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
  function createProgress() { return { schemaVersion: 2, lessons: {}, weekly: {} }; }
  function emptyConcept() { return { initial: [], reviews: [], completedOn: null, dueOn: null, deferredQuestionId: null, pending: null }; }
  function validateProgress(input) {
    requireValue(object(input) && [1, 2].includes(input.schemaVersion) && object(input.lessons));
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
          if (input.schemaVersion === 1 || state.dueOn || state.deferredQuestionId || state.reviews.length || state.pending && state.pending.phase !== "initial") validateSchedule(normalizedState, mode);
          else validatePractice(normalizedState, mode);
          normalized[mode][conceptId] = normalizedState;
        }
      }
      result.lessons[lessonId] = normalized;
    }
    if (input.schemaVersion === 2) {
      requireValue(object(input.weekly) && Object.keys(input.weekly).length <= 200);
      for (const [id, state] of Object.entries(input.weekly)) {
        requireValue(validId(id) && object(state) && validDate(state.startedOn) && object(state.selected) && object(state.sources));
        const saved = { startedOn: state.startedOn, selected: {}, sources: {} };
        for (const mode of MODES) {
          const ids = state.selected[mode];
          requireValue(Array.isArray(ids) && ids.length > 0 && ids.length <= 30 && ids.every(validId) && new Set(ids).size === ids.length);
          saved.selected[mode] = [...ids];
          for (const conceptId of ids) {
            const source = state.sources[conceptId];
            validateSource(source);
            requireValue(source.date <= state.startedOn);
            saved.sources[conceptId] = { lessonId: source.lessonId, conceptId: source.conceptId, date: source.date };
          }
          requireValue(Object.keys(result.lessons[id]?.[mode] || {}).every((conceptId) => ids.includes(conceptId)));
        }
        result.weekly[id] = saved;
      }
    }
    return result;
  }
  function validateSource(source) {
    requireValue(object(source) && validId(source.lessonId) && validId(source.conceptId) && validDate(source.date), "This review needs a taught source concept.");
  }
  function validateWeekly(weekly) {
    if (weekly?.schemaVersion === 2) {
      requireValue(validDate(weekly.practiceStart) && validDate(weekly.practiceEnd) && validDate(weekly.opensOn), "This review needs its practice window and opening date.");
      requireValue(new Date(weekly.practiceStart + "T00:00:00Z").getUTCDay() === 0 && (Date.parse(weekly.practiceEnd) - Date.parse(weekly.practiceStart)) / 86400000 === 7 && weekly.opensOn === weekly.practiceEnd, "This review needs a Sunday to Sunday practice window.");
      requireValue(Number.isInteger(weekly.conceptCount) && weekly.conceptCount >= 1 && weekly.conceptCount <= 4, "This review needs at most four planned concepts.");
      return weekly;
    }
    requireValue(weekly?.schemaVersion === undefined || weekly.schemaVersion === 1, "This review version is not available.");
    requireValue(object(weekly) && validDate(weekly.weekStart) && validDate(weekly.weekEnd) && validDate(weekly.opensOn), "This review needs its week and opening date.");
    requireValue(new Date(weekly.weekStart + "T00:00:00Z").getUTCDay() === 1 && (Date.parse(weekly.weekEnd) - Date.parse(weekly.weekStart)) / 86400000 === 6 && weekly.opensOn >= weekly.weekEnd, "This review needs a Monday to Sunday week.");
    requireValue(Number.isInteger(weekly.conceptCount) && weekly.conceptCount >= 1 && weekly.conceptCount <= 30 && Number.isInteger(weekly.earlierCount) && weekly.earlierCount >= 0 && weekly.earlierCount < weekly.conceptCount, "This review needs a practice amount.");
    return weekly;
  }
  function validateLesson(lesson) {
    requireValue(object(lesson) && lesson.schemaVersion === 1 && validId(lesson.id) && validDate(lesson.date), "This lesson could not be opened.");
    const text = (value) => typeof value === "string" && value.trim().length > 0 && value.length <= 1500;
    requireValue(text(lesson.title) && Array.isArray(lesson.concepts) && lesson.concepts.length > 0 && lesson.concepts.length <= 30, "This lesson is incomplete.");
    requireValue(lesson.kind === undefined || ["lesson", "weekly"].includes(lesson.kind), "This lesson type is not available.");
    if (lesson.kind === "weekly") {
      validateWeekly(lesson.weekly);
      requireValue(lesson.date === (lesson.weekly.schemaVersion === 2 ? lesson.weekly.opensOn : lesson.weekly.weekEnd), "This review date must match its week.");
      if (lesson.weekly.schemaVersion === 2) requireValue(lesson.concepts.length === lesson.weekly.conceptCount, "This review must contain its planned concepts.");
    }
    const ids = new Set();
    const addId = (id) => { requireValue(typeof id === "string" && ID.test(id) && !ids.has(id), "This lesson has repeated or invalid questions."); ids.add(id); };
    const audio = (value) => typeof value === "string" ? /^audio\/[a-zA-Z0-9/_-]+\.(mp3|wav|ogg)$/.test(value) : object(value) && validId(value.private);
    for (const concept of lesson.concepts) {
      addId(concept.id);
      requireValue(text(concept.title), "This lesson needs a concept title.");
      if (lesson.kind === "weekly") {
        validateSource(concept.sourceConcept);
        requireValue((lesson.weekly.schemaVersion === 2 ? concept.sourceConcept.date < lesson.weekly.practiceEnd : concept.sourceConcept.date <= lesson.weekly.weekEnd) && concept.sourceConcept.lessonId !== lesson.id, "This review includes a source that has not been taught.");
      }
      const groups = MODES.map((mode) => ({ mode, questions: concept[mode] }));
      if (concept.tryRevision !== undefined) {
        requireValue(object(concept.tryRevision) && validId(concept.tryRevision.id) && Array.isArray(concept.tryRevision.questions) && concept.tryRevision.questions.length === 3, "This update needs three practice questions.");
        groups.push({ mode: "try", questions: concept.tryRevision.questions });
      }
      for (const { mode, questions } of groups) {
        requireValue(Array.isArray(questions) && questions.length >= 3, "This lesson needs three practice questions.");
        if (mode === "try" && (questions === concept.tryRevision?.questions || questions.some((q) => q.stage !== undefined))) requireValue(questions.length === 3 && questions.every((q, index) => q?.stage === ["build", "change", "fix"][index] && q.type === (index === 2 ? "repair" : "order")), "This practice needs Build, Change, and Fix questions.");
        for (const q of questions) {
          addId(q.id);
          requireValue(text(q.prompt) && text(q.instruction) && text(q.answerText), "This question is incomplete.");
          requireValue(object(q.scene) && ["cats", "dogs", "trees", "books", "toys", "numbers", "hats", "word-card", "family-link"].includes(q.scene.kind), "This picture could not be opened.");
          if (["word-card", "family-link"].includes(q.scene.kind)) {
            const shortText = (value, max) => text(value) && value.length <= max;
            requireValue(q.scene.heading === undefined || shortText(q.scene.heading, 100), "This picture needs a short heading.");
            if (q.scene.kind === "word-card") requireValue(shortText(q.scene.text, 160), "This word card needs text.");
            else requireValue(shortText(q.scene.relation, 100) && shortText(q.scene.name, 40) && (q.scene.pronoun === undefined || shortText(q.scene.pronoun, 12)), "This family picture needs a relation and name.");
          }
          requireValue(q.scene.count === undefined || Number.isInteger(q.scene.count) && q.scene.count >= 0 && q.scene.count <= 30, "This picture has an invalid count.");
          requireValue(q.scene.number === undefined || Number.isInteger(q.scene.number) && q.scene.number >= 0 && q.scene.number <= 10000, "This number is not valid.");
          requireValue(object(q.audio) && audio(q.audio.question) && audio(q.audio.answer), "This question needs its recordings.");
          if (mode === "try") {
            requireValue(["choice", "order", "repair"].includes(q.type), "This question type is not supported.");
            requireValue(q.stage === undefined || ["build", "change", "fix"].includes(q.stage), "This practice step is not supported.");
            const options = q.type === "order" ? q.tokens : q.choices;
            requireValue(Array.isArray(options) && options.length >= 2 && options.length <= 18 && options.every((x) => object(x) && typeof x.id === "string" && ID.test(x.id) && text(x.text)) && new Set(options.map((x) => x.id)).size === options.length, "This question needs valid choices.");
            if (q.type === "choice") requireValue(options.some((x) => x.id === q.answer), "This question needs an answer.");
            else if (q.type === "order") requireValue(Array.isArray(q.acceptedOrders) && q.acceptedOrders.length > 0 && q.acceptedOrders.every((order) => Array.isArray(order) && order.length > 0 && order.length <= options.length && options.length - order.length <= 2 && new Set(order).size === order.length && order.every((id) => options.some((x) => x.id === id))), "This sentence needs a complete answer.");
            else {
              requireValue(Array.isArray(q.sentence) && q.sentence.length >= 2 && q.sentence.length <= 18 && q.sentence.every((word) => object(word) && validId(word.id) && text(word.text) && !/\s/.test(word.text)) && new Set(q.sentence.map((word) => word.id)).size === q.sentence.length, "This repair needs a sentence of word cards.");
              requireValue(options.length <= 3 && options.every((choice) => !/\s/.test(choice.text)) && new Set(options.map((choice) => choice.text)).size === options.length, "Choose one replacement word.");
              const word = q.sentence.find((item) => item.id === q.answer?.wordId), replacement = options.find((item) => item.id === q.answer?.choiceId);
              requireValue(word && replacement && word.text !== replacement.text, "This sentence needs one word to fix.");
              const corrected = q.sentence.map((item) => item.id === word.id ? replacement.text : item.text).join(" ");
              const normalize = (value) => value.trim().replace(/[.!?]+$/, "").replace(/\s+/g, " ");
              requireValue(normalize(corrected) === normalize(q.answerText), "The repaired sentence must match its answer recording.");
            }
          }
        }
      }
    }
    return lesson;
  }
  function conceptState(progress, lessonId, mode, conceptId) { return progress.lessons[lessonId]?.[mode]?.[conceptId] ?? emptyConcept(); }
  function questionsForConcept(progress, lesson, mode, concept) {
    if (mode !== "try" || !concept.tryRevision) return concept[mode];
    const state = conceptState(progress, lesson.id, mode, concept.id);
    const ids = [...state.initial, ...state.reviews].map((attempt) => attempt.questionId);
    if (state.pending) ids.push(state.pending.questionId);
    if (state.deferredQuestionId) ids.push(state.deferredQuestionId);
    const original = new Set(concept.try.map((question) => question.id));
    const updated = new Set(concept.tryRevision.questions.map((question) => question.id));
    requireValue(ids.every((id) => original.has(id) || updated.has(id)), "This practice changed. Ask a parent for help before continuing.");
    // An older offline device may return with an original pending or first answer.
    // Keep that entire concept on its original questions; never reinterpret its score.
    return ids.some((id) => original.has(id)) ? concept.try : concept.tryRevision.questions;
  }
  function independent(mode, outcome) { return outcome === (mode === "try" ? "independent" : "gotIt"); }
  function validatePractice(state, mode) {
    const first = state.initial;
    for (const attempt of first) {
      requireValue(!independent(mode, attempt.outcome) || !attempt.helped);
      requireValue(!["helped", "withHelp"].includes(attempt.outcome) || attempt.helped);
    }
    for (let i = 1; i < first.length; i++) requireValue(first[i].date >= first[i - 1].date);
    const early = first.length >= 2 && first.slice(0, 2).every((attempt) => independent(mode, attempt.outcome));
    requireValue(state.completedOn === (early ? first[1].date : first.length === 3 ? first[2].date : null));
    if (state.pending) requireValue(!state.completedOn && state.pending.phase === "initial" && !first.some((attempt) => attempt.questionId === state.pending.questionId) && (!first.length || state.pending.date >= first.at(-1).date) && (mode === "say" || !state.pending.revealed));
  }
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
    const questions = questionsForConcept(progress, lesson, mode, concept).slice(0, 3);
    let question, phase;
    if (!state.completedOn) {
      question = questions[state.initial.length];
      phase = "initial";
    }
    if (!question) return null;
    return { question, concept, phase, pending: state.pending?.questionId === question.id && state.pending.phase === phase ? state.pending : null,
      number: phase === "initial" ? state.initial.length + 1 : 1, total: phase === "initial" ? 3 : 1 };
  }
  function nextQuestion(progress, lesson, mode, date, conceptId = null) {
    requireValue(MODES.includes(mode) && validDate(date), "Please choose a practice mode and date.");
    if (!isOpen(lesson, date)) return null;
    let concepts = practiceConcepts(progress, lesson, mode);
    if (conceptId) concepts = concepts.filter((c) => c.id === conceptId);
    const candidates = concepts.map((concept) => nextForConcept(progress, lesson, mode, concept, date)).filter(Boolean);
    // Updated practice spaces each concept's Build, then Change, then needed Fix.
    // An entirely original session keeps its established ordering.
    if (mode === "try" && !conceptId) {
      const interleave = candidates.some((next) => next.question.stage);
      candidates.sort((a, b) => interleave ? a.number - b.number : Number(a.number === 3) - Number(b.number === 3));
    }
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
    progress = startLesson(progress, lesson, date);
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
    if (question.type === "repair") {
      requireValue(object(answer) && question.sentence.some((word) => word.id === answer.wordId) && question.choices.some((choice) => choice.id === answer.choiceId), "Choose a word to fix, then a replacement.");
      return answer.wordId === question.answer.wordId && answer.choiceId === question.answer.choiceId;
    }
    requireValue(Array.isArray(answer) && answer.length > 0 && answer.length <= question.tokens.length && new Set(answer).size === answer.length && answer.every((id) => question.tokens.some((t) => t.id === id)), "Choose words for your sentence. Use each card once.");
    const textFor = (id) => question.tokens.find((token) => token.id === id).text;
    return question.acceptedOrders.some((order) => order.length === answer.length && order.every((id, i) => textFor(id) === textFor(answer[i])));
  }
  function finishAttempt(progress, lesson, mode, date, next, outcome) {
    const change = writable(progress, lesson, mode, next.concept.id);
    const state = change.state;
    const attempt = { questionId: next.question.id, date, outcome, helped: Boolean(next.pending?.helped || outcome === "withHelp" || outcome === "helped") };
    const previousDate = [...state.initial, ...state.reviews].map((a) => a.date).sort().at(-1);
    requireValue(!previousDate || date >= previousDate, "Please check the practice date.");
    state.initial.push(attempt);
    state.pending = null;
    const early = state.initial.length === 2 && state.initial.every((a) => independent(mode, a.outcome));
    if (early || state.initial.length === 3) {
      state.completedOn = date;
      state.dueOn = null;
      state.deferredQuestionId = null;
    }
    return { progress: change.progress, recorded: true, outcome, correct: mode === "try" ? outcome !== "incorrect" : outcome === "gotIt", phase: next.phase };
  }
  function submitTry(progress, lesson, date, conceptId, questionId, answer) {
    progress = startLesson(progress, lesson, date);
    const next = nextQuestion(progress, lesson, "try", date, conceptId);
    if (!next || next.question.id !== questionId) return { progress, recorded: false };
    const correct = checkAnswer(next.question, answer);
    const outcome = correct ? next.pending?.helped ? "helped" : "independent" : "incorrect";
    return finishAttempt(progress, lesson, "try", date, next, outcome);
  }
  function submitSay(progress, lesson, date, conceptId, questionId, rating) {
    requireValue(OUTCOMES.say.includes(rating), "Choose a parent rating.");
    progress = startLesson(progress, lesson, date);
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
      const concepts = practiceConcepts(progress, lesson, mode).map((concept) => {
        const state = conceptState(progress, lesson.id, mode, concept.id);
        const summary = { id: concept.id, title: concept.title, attempted: state.initial.length, due: false, done: Boolean(state.completedOn), dueOn: null,
          reviews: state.reviews.length, reviewSuccesses: state.reviews.filter((a) => independent(mode, a.outcome)).length };
        for (const outcome of OUTCOMES[mode]) summary[outcome] = state.initial.filter((a) => a.outcome === outcome).length;
        summary.needsPractice = lesson.kind === "weekly" ? state.initial.some((a) => !independent(mode, a.outcome)) : sourcePerformance(progress, { lessonId: lesson.id, conceptId: concept.id }, mode).needsPractice;
        return summary;
      });
      result[mode] = { done: concepts.length > 0 && concepts.every((c) => c.done), concepts };
    }
    return result;
  }
  function isOpen(lesson, date) { return date >= (lesson.kind === "weekly" ? lesson.weekly.opensOn : lesson.date); }
  function sourcePerformance(progress, source, mode, excludeId) {
    const attempts = [...conceptState(progress, source.lessonId, mode, source.conceptId).initial];
    for (const [id, weekly] of Object.entries(progress.weekly || {})) {
      if (id === excludeId) continue;
      for (const [conceptId, origin] of Object.entries(weekly.sources)) {
        if (origin.lessonId === source.lessonId && origin.conceptId === source.conceptId) attempts.push(...conceptState(progress, id, mode, conceptId).initial);
      }
    }
    return { attempted: attempts.length, needsPractice: attempts.some((a) => !independent(mode, a.outcome)) };
  }
  function selectWeekly(progress, lesson, mode) {
    // New packs were selected from actual practice by the offline planner.
    // Re-ranking by lesson dates here would silently drop late-practised lessons.
    if (lesson.weekly.schemaVersion === 2) return lesson.concepts.map((concept) => concept.id);
    const { weekStart, conceptCount, earlierCount } = lesson.weekly;
    const rank = (concept) => {
      const result = sourcePerformance(progress, concept.sourceConcept, mode, lesson.id);
      return result.needsPractice ? 2 : result.attempted ? 0 : 1;
    };
    const take = (pool, count) => {
      if (!count) return [];
      const sorted = [...pool].sort((a, b) => rank(b) - rank(a));
      const chosen = sorted.slice(0, count);
      // Include a successful sample when there is room alongside weaker ideas.
      const successful = sorted.find((concept) => rank(concept) === 0);
      if (count > 1 && successful && chosen.length === count && !chosen.includes(successful)) chosen[count - 1] = successful;
      return chosen;
    };
    const older = lesson.concepts.filter((concept) => concept.sourceConcept.date < weekStart);
    const current = lesson.concepts.filter((concept) => concept.sourceConcept.date >= weekStart);
    const oldSelected = take(older, earlierCount);
    return [...take(current, conceptCount - oldSelected.length), ...oldSelected].map((concept) => concept.id);
  }
  function practiceConcepts(progress, lesson, mode) {
    if (lesson.kind !== "weekly") return lesson.concepts;
    const ids = progress.weekly?.[lesson.id]?.selected[mode] || selectWeekly(progress, lesson, mode);
    return ids.map((id) => {
      const concept = lesson.concepts.find((item) => item.id === id);
      requireValue(concept, "This review changed. Ask a parent for help before continuing.");
      const source = progress.weekly?.[lesson.id]?.sources[id];
      requireValue(!source || source.lessonId === concept.sourceConcept.lessonId && source.conceptId === concept.sourceConcept.conceptId && source.date === concept.sourceConcept.date, "This review source changed. Ask a parent for help.");
      return concept;
    });
  }
  function startLesson(progress, lesson, date) {
    requireValue(validDate(date), "Please check the practice date.");
    requireValue(isOpen(lesson, date), "This review is not open yet.");
    if (lesson.kind !== "weekly" || progress.weekly?.[lesson.id]) return progress;
    const next = validateProgress(progress), selected = {}, sources = {};
    for (const mode of MODES) {
      selected[mode] = selectWeekly(next, lesson, mode);
      requireValue(selected[mode].length > 0, "This review has no taught concepts yet.");
      for (const id of selected[mode]) sources[id] = { ...lesson.concepts.find((c) => c.id === id).sourceConcept };
    }
    next.weekly[lesson.id] = { startedOn: date, selected, sources };
    return next;
  }
  root.NativeCampCore = { createProgress, validateProgress, validateLesson, validateWeekly, summarizeLesson, sourcePerformance, practiceConcepts, questionsForConcept, startLesson, isOpen, today, nextDay, nextQuestion, markPending, checkAnswer, submitTry, submitSay };
})(globalThis);
