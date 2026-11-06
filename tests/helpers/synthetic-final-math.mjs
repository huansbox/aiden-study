export const finalMathQuestion = () => ({
  id: "math-g4s1-synthetic-final-mixed-v1", subject: "math", unit: 27, type: "fill_in_blank",
  text: "Synthetic fields （１）（２）（３）（４）（５）（６）", subtopic: "Synthetic mixed inputs", source: "Synthetic",
  options: ["First original label", "Second original label"], answer: "", blanks: [
    { input: "number", answer: "12" }, { input: "decimal", answer: "0.52" },
    { input: "fraction", answer: "3 3/6", form: "mixed" }, { input: "select", answer: "2" },
    { input: "text", answer: "合成詞語", aliases: ["合成別名"] }, { input: "comparison", answer: ">" },
  ],
});
export const choiceSetQuestion = () => ({
  id: "math-g4s1-synthetic-final-set-v1", subject: "math", unit: 24, type: "choice_set",
  text: "Synthetic: select all matching labels.", subtopic: "Synthetic classification", source: "Synthetic",
  options: ["Original A", "Original B", "Original C"], answer: "", answerSet: ["1", "3"],
});
