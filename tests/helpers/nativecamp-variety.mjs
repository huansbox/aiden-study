import { readFileSync } from "node:fs";

export function varietyFixture() {
  const lesson = JSON.parse(readFileSync(new URL("../../docs/nativecamp/lessons/2026-09-15.json", import.meta.url), "utf8"));
  for (const concept of lesson.concepts) {
    const question = (index, stage, answerText) => ({
      id: `${concept.id}-v2-try-${index}`, stage,
      prompt: index === 2 ? "Now: Mia only. Pencils." : "What are they doing?",
      instruction: stage === "fix" ? "Fix one word." : stage === "change" ? "Change the sentence." : "Build a sentence.",
      scene: { kind: "word-card", text: index === 2 ? "They are counting pens." : 'Mia and Leo: "One pen, two pens..."' },
      answerText, audio: { question: `audio/${concept.id}-v2-${index}-q.mp3`, answer: `audio/${concept.id}-v2-${index}-a.mp3` },
    });
    const ordered = (index, stage, answerText, text) => ({ ...question(index, stage, answerText), type: "order",
      tokens: text.map((text, index) => ({ id: `w${index}`, text })), acceptedOrders: [["w0", "w1", "w2", "w3"]] });
    concept.tryRevision = { id: "variety-v1", questions: [
      ordered(1, "build", "They are counting pens.", ["They", "are", "counting", "pens", "count"]),
      ordered(2, "change", "She is counting pencils.", ["She", "is", "counting", "pencils", "They", "are"]),
      { ...question(3, "fix", "They are counting rulers."), type: "repair",
        sentence: ["They", "is", "counting", "rulers."].map((text, index) => ({ id: `s${index}`, text })),
        choices: [{ id: "am", text: "am" }, { id: "are", text: "are" }], answer: { wordId: "s1", choiceId: "are" } },
    ] };
  }
  return lesson;
}
