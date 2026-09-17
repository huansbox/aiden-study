/* Shared lesson selection. Navigation never changes saved learning progress. */
(function (global) {
  "use strict";
  const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const dateLabel = (date) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(date + "T00:00:00Z"));
  function validateCatalog(value) {
    if (value?.schemaVersion !== 1 || !Array.isArray(value.lessons) || !value.lessons.length || value.lessons.length > 200) throw Error("The lesson list could not be read.");
    const seen = new Set();
    for (const item of value.lessons) {
      if (!item || typeof item.id !== "string" || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(item.id) || seen.has(item.id) ||
          typeof item.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !Number.isFinite(Date.parse(item.date + "T00:00:00Z")) || new Date(item.date + "T00:00:00Z").toISOString().slice(0, 10) !== item.date ||
          typeof item.teacher !== "string" || !item.teacher.trim() || item.teacher.length > 80) throw Error("The lesson list could not be read.");
      seen.add(item.id);
    }
    return [...value.lessons].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }
  function select(catalog, search) {
    const requested = new URLSearchParams(search).get("lesson");
    const selected = requested === null ? catalog[0] : catalog.find((item) => item.id === requested);
    if (!selected) throw Error("This lesson is not available. Open Native Camp Review from Home.");
    return selected;
  }
  function childFrom(search) {
    const child = new URLSearchParams(search).get("child") || "aiden";
    return /^(aiden|bingpu|test-[a-z0-9-]{1,25})$/.test(child) ? child : "aiden";
  }
  const href = (page, child, lessonId) => `${page}?child=${encodeURIComponent(child)}&lesson=${encodeURIComponent(lessonId)}`;
  async function readJSON(path, fetchImpl) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetchImpl(path, { cache: "no-cache", signal: controller.signal });
      if (!response.ok) throw Error("Your lesson could not be loaded. Please try again.");
      return await response.json();
    } finally { clearTimeout(timer); }
  }
  async function readCatalog({ base = ".", fetchImpl = (...args) => fetch(...args) } = {}) {
    return validateCatalog(await readJSON(`${base}/lessons/catalog.json`, fetchImpl));
  }
  async function readLesson(entry, { base = ".", fetchImpl = (...args) => fetch(...args) } = {}) {
    const lesson = global.NativeCampCore.validateLesson(await readJSON(`${base}/lessons/${entry.id}.json`, fetchImpl));
    if (lesson.id !== entry.id || lesson.date !== entry.date) throw Error("The lesson does not match the selected date. Please try again.");
    return lesson;
  }
  async function load({ search = global.location?.search || "", ...options } = {}) {
    const catalog = await readCatalog(options), entry = select(catalog, search);
    return { catalog, entry, lesson: await readLesson(entry, options) };
  }
  // Callers supply validated progress; no extra lesson fetches or new schedule are needed.
  function reviewReady(progress, lessonId, date) {
    const saved = progress?.lessons[lessonId];
    return ["try", "say"].some((mode) => Object.values(saved?.[mode] || {}).some((state) => state.dueOn && state.dueOn <= date));
  }
  function navigation(catalog, selectedId, { page = "./", child = "aiden", progress, date = global.NativeCampCore.today(), buttons = false } = {}) {
    if (!catalog?.length) return "";
    return `<nav class="lesson-picker" aria-label="Lessons">${catalog.map((entry) => {
      const active = entry.id === selectedId;
      const text = `<span>${esc(dateLabel(entry.date))}</span><span class="lesson-teacher">${esc(entry.teacher)}</span>${reviewReady(progress, entry.id, date) ? '<span class="lesson-due">Review ready</span>' : ""}`;
      return buttons ? `<button type="button" class="lesson-link" data-lesson="${esc(entry.id)}" aria-pressed="${active}">${text}</button>` : `<a class="lesson-link" href="${esc(href(page, child, entry.id))}"${active ? ' aria-current="page"' : ""}>${text}</a>`;
    }).join("")}</nav>`;
  }
  global.NativeCampCatalog = { validateCatalog, select, childFrom, href, readCatalog, readLesson, load, reviewReady, navigation };
})(globalThis);
