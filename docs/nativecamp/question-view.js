/* Shared question presentation only: no progress, storage, or activity effects. */
(function (global) {
  "use strict";
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  function icon(name) { return `<svg class="icon " aria-hidden="true"><use href="icons.svg#${name}"></use></svg>`; }
  function button(action, label, style, attrs) { return `<button type="button" class="${style}" data-action="${action}" ${attrs}>${label}</button>`; }
  function sceneHtml(scene) {
    const pictures = { cats: "cat", dogs: "dog", trees: "tree-pine", books: "book-open", toys: "toy-brick" };
    const hat = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18c4-3 14-3 18 0M6 16l2-10h8l2 10M7 13h10M3 18c1 4 17 4 18 0"/></svg>';
    const count = scene.count ?? 0;
    const label = scene.number !== undefined ? String(scene.number) : `${count} ${scene.kind}`;
    const image = scene.number !== undefined ? `<span class="scene-number">${scene.number}</span>` : `<div class="scene-grid ${count > 6 ? "many" : ""}">${Array.from({ length: count }, () => scene.kind === "hats" ? hat : icon(pictures[scene.kind] || "toy-brick")).join("")}${count === 0 ? '<span class="scene-number">0</span>' : ""}</div>`;
    return `<div class="scene ${escape(scene.kind)}"><div role="img" aria-label="${escape(label)}">${image}</div>${scene.heading ? `<p class="scene-heading">${escape(scene.heading)}</p>` : ""}</div>`;
  }
  function answerControls(question, selection, words) {
    if (question.type === "choice") return `<div class="choices">${question.choices.map((choice) => button("pick", escape(choice.text), "choice", `data-choice="${escape(choice.id)}" aria-pressed="${selection === choice.id}"`)).join("")}</div>`;
    return `<div class="word-tray" aria-label="Your sentence">${words.map((id) => button("remove-word", escape(question.tokens.find((t) => t.id === id).text), "word", `data-word="${escape(id)}" aria-label="Remove ${escape(question.tokens.find((t) => t.id === id).text)}"`)).join("")}</div><div class="word-bank" aria-label="Word cards">${question.tokens.filter((token) => !words.includes(token.id)).map((token) => button("add-word", escape(token.text), "word", `data-word="${escape(token.id)}"`)).join("")}</div>`;
  }
  global.NativeCampQuestionView = { sceneHtml, answerControls };
})(globalThis);
