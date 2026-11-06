/* 四上後半冊：逐格輸入與完整集合選答，保留原題選項。 */
(function(root) {
  "use strict";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  const initial = q => ({ values: q.type === "choice_set" ? [] : q.blanks.map(b => b.input === "fraction_interval" ? Array(b.count).fill("") : ""), active: 0, fractions: {} });
  const complete = (q, state) => q.type === "choice_set" ? state.values.length > 0 : root.StudyAnswer.hasCompleteBlanks(q, state.values);
  function update(q, state, action, value, field) {
    const next = { values: [...state.values], active: state.active, fractions: Object.fromEntries(Object.entries(state.fractions).map(([key, v]) => [key, { ...v }])) };
    if (action === "blank") next.active = Math.max(0, Math.min(q.blanks.length - 1, Number(value)));
    else if (action === "choice") {
      if (q.type === "choice_set") next.values = next.values.includes(value) ? next.values.filter(v => v !== value) : [...next.values, value];
      else next.values[next.active] = value;
    } else if (action === "input") next.values[next.active] = String(value).slice(0, 100);
    else if (action === "fraction") {
      const draft = next.fractions[next.active] ||= { whole: "", numerator: "", denominator: "" };
      const blank = q.blanks[next.active], interval = blank.input === "fraction_interval";
      const [item, part] = interval ? String(field).split(":") : ["", field];
      if (interval && (!/^[0-3]$/.test(item) || Number(item) >= blank.count) || !["whole", "numerator", "denominator"].includes(part)) return next;
      draft[field] = String(value).slice(0, 6);
      const form = blank.form, mixed = ["mixed", "mixed_or_whole"].includes(form), prefix = interval ? item + ":" : "";
      const whole = draft[prefix + "whole"], numerator = draft[prefix + "numerator"], denominator = draft[prefix + "denominator"];
      const entry = form === "mixed_or_whole" && whole && !numerator && !denominator ? whole
        : numerator && denominator && (!mixed || whole) ? `${mixed ? whole + " " : ""}${numerator}/${denominator}` : "";
      if (interval) { next.values[next.active] = [...next.values[next.active]]; next.values[next.active][Number(item)] = entry; }
      else next.values[next.active] = entry;
    }
    return next;
  }
  function render(q, state, disabled = false, results = null) {
    const lock = disabled ? " disabled" : "";
    const choices = selected => `<div class="math-original-choices">${q.options.map((text, index) => `<button type="button" data-math-action="choice" data-math-value="${index + 1}" aria-pressed="${selected(String(index + 1))}"${lock}>${esc(text)}</button>`).join("")}</div>`;
    if (q.type === "choice_set") return `<section class="study-math-input"><p>選出全部符合的選項；再點一次可取消。</p>${choices(value => state.values.includes(value))}</section>`;
    const index = state.active, b = q.blanks[index], draft = state.fractions[index] || {};
    let input;
    if (b.input === "select") input = choices(value => state.values[index] === value);
    else if (b.input === "comparison") input = `<div class="math-original-choices">${[">", "<", "="].map(value => `<button type="button" data-math-action="choice" data-math-value="${value}" aria-pressed="${state.values[index] === value}"${lock}>${esc(value)}</button>`).join("")}</div>`;
    else if (["fraction", "fraction_interval"].includes(b.input)) {
      const mixed = ["mixed", "mixed_or_whole"].includes(b.form);
      const interval = b.input === "fraction_interval";
      const entry = item => {
        const prefix = interval ? item + ":" : "";
        const box = (field, label) => `<input type="text" inputmode="numeric" maxlength="6" data-math-action="fraction" data-math-field="${prefix + field}" aria-label="${interval ? `第 ${item + 1} 個答案 ` : ""}${label}" value="${esc(draft[prefix + field])}"${lock}>`;
        return `<fieldset class="math-fraction-entry"><legend>${interval ? `第 ${item + 1} 個答案` : "分數答案"}</legend><div class="math-fraction">${mixed ? `<label>整數部分${box("whole", "整數部分")}</label>` : ""}<div class="math-fraction-pair"><label>分子${box("numerator", "分子")}</label><label>分母${box("denominator", "分母")}</label></div></div></fieldset>`;
      };
      input = `<p>${interval ? esc(root.StudyAnswer.mathAnswerLabel(b)) : b.form === "proper" ? "填真分數" : b.form === "improper" ? "填假分數" : b.form === "mixed" ? "填帶分數" : b.form === "mixed_or_whole" ? "填帶分數或整數；整數時分子、分母留白" : "填分數"}${b.denominator ? `；分母須為 ${b.denominator}` : ""}</p>${Array.from({ length: interval ? b.count : 1 }, (_, item) => entry(item)).join("")}`;
    } else input = `<label class="math-entry">${b.input === "text" ? "文字答案" : b.input === "decimal" ? "小數答案" : "數字答案"}<input type="text" inputmode="${b.input === "text" ? "text" : b.input === "decimal" ? "decimal" : "numeric"}" maxlength="100" data-math-action="input" aria-label="第 ${index + 1} 空答案" value="${esc(state.values[index])}"${lock}></label>`;
    return `<section class="study-math-input"><nav aria-label="空格導覽">${q.blanks.map((_, i) => `<button type="button" data-math-action="blank" data-math-value="${i}" aria-pressed="${i === index}">第 ${i + 1} 空${results ? (results[i] ? "（答對）" : "（要修正）") : (Array.isArray(state.values[i]) ? state.values[i].every(Boolean) : state.values[i]) ? "（已填）" : ""}</button>`).join("")}</nav><p role="status">目前第 ${index + 1}／${q.blanks.length} 空</p>${input}${results ? `<p class="math-blank-feedback">${results[index] ? "答對" : `正解：${esc(root.StudyAnswer.mathAnswerLabel(b, q.options))}`}</p>` : ""}</section>`;
  }
  root.StudyMathInput = { initial, update, render, complete };
})(globalThis);
