export function lessonFixture(id = "2026-09-15", concepts = ["is-are", "odd-even", "too-many"]) {
  return { schemaVersion: 1, id, date: id, title: "Three ideas", concepts: concepts.map((name) => ({
    id: name, title: name,
    try: [1, 2, 3].map((n) => ({ id: `${name}-try-${n}`, type: "choice", prompt: "There ___ a cat.", instruction: "Choose a word.", scene: { kind: "cats", count: n }, choices: [{ id: "is", text: "is" }, { id: "are", text: "are" }], answer: "is", answerText: "There is a cat.", audio: { question: "audio/question.mp3", answer: "audio/answer.mp3" } })),
    say: [1, 2, 3].map((n) => ({ id: `${name}-say-${n}`, prompt: "What can you see?", instruction: "Start with There.", scene: { kind: "cats", count: n }, answerText: "There is a cat.", accepted: ["There is one cat."], audio: { question: "audio/question.mp3", answer: "audio/answer.mp3" } })),
  })) };
}
export function weeklyFixture() {
  const lesson = lessonFixture("2026-09-20", ["weekly-known", "weekly-weak", "weekly-unknown", "weekly-older", "weekly-other"]);
  lesson.id = "weekly-2026-09-14"; lesson.kind = "weekly";
  lesson.weekly = { weekStart: "2026-09-14", weekEnd: "2026-09-20", opensOn: "2026-09-20", conceptCount: 3, earlierCount: 1 };
  const ids = ["is-are", "odd-even", "too-many", "earlier", "other"];
  lesson.concepts.forEach((concept, i) => { concept.sourceConcept = { lessonId: i === 3 ? "2026-09-13" : "2026-09-15", conceptId: ids[i], date: i === 3 ? "2026-09-13" : "2026-09-15" }; });
  return lesson;
}
export function legacyProgress() {
  const attempt = (questionId, date, outcome) => ({ questionId, date, outcome, helped: outcome === "helped" || outcome === "withHelp" });
  const state = (initial, extras = {}) => ({ initial, reviews: [], completedOn: null, dueOn: null, deferredQuestionId: null, pending: null, ...extras });
  return { schemaVersion: 1, lessons: { "2026-09-15": { try: {
    "is-are": state([attempt("is-are-try-1", "2026-09-17", "independent"), attempt("is-are-try-2", "2026-09-17", "independent")], { completedOn: "2026-09-17", dueOn: "2026-09-18", deferredQuestionId: "is-are-try-3", pending: { questionId: "is-are-try-3", phase: "deferred", date: "2026-09-18", helped: true, revealed: false } }),
    "odd-even": state([attempt("odd-even-try-1", "2026-09-17", "incorrect"), attempt("odd-even-try-2", "2026-09-17", "independent"), attempt("odd-even-try-3", "2026-09-17", "independent")], { completedOn: "2026-09-17", reviews: [attempt("odd-even-try-1", "2026-09-18", "independent")] }),
    "too-many": state([attempt("too-many-try-1", "2026-09-17", "helped")], { pending: { questionId: "too-many-try-2", phase: "initial", date: "2026-09-18", helped: true, revealed: false } }),
  }, say: {} } } };
}
