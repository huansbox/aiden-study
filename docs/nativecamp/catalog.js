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
          item.kind !== "weekly" && (typeof item.teacher !== "string" || !item.teacher.trim() || item.teacher.length > 80)) throw Error("The lesson list could not be read.");
      if (item.kind === "weekly") {
        global.NativeCampCore.validateWeekly(item.weekly);
        if (item.date !== (item.weekly.schemaVersion === 2 ? item.weekly.opensOn : item.weekly.weekEnd)) throw Error("The review date does not match its week.");
      } else if (item.kind !== undefined && item.kind !== "lesson") throw Error("The lesson type is not available.");
      seen.add(item.id);
    }
    return [...value.lessons].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }
  function select(catalog, search, { progress, lessons = {}, date = global.NativeCampCore.today() } = {}) {
    const requested = new URLSearchParams(search).get("lesson");
    const selected = requested === null ? catalog.find((item) => global.NativeCampCore.isOpen(item, date) && !finished(progress, lessons[item.id], date)) || catalog[0] : catalog.find((item) => item.id === requested);
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
    if ((lesson.kind === "weekly") !== (entry.kind === "weekly") || lesson.kind === "weekly" && ["schemaVersion", "weekStart", "weekEnd", "practiceStart", "practiceEnd", "opensOn", "conceptCount", "earlierCount"].some((key) => lesson.weekly[key] !== entry.weekly[key])) throw Error("The review does not match its catalog. Please try again.");
    return lesson;
  }
  async function readLessons(catalog, options) {
    const loaded = await Promise.all(catalog.map((entry) => readLesson(entry, options)));
    const lessons = Object.fromEntries(loaded.map((lesson) => [lesson.id, lesson]));
    for (const lesson of loaded.filter((item) => item.kind === "weekly")) {
      const seen = new Set();
      for (const concept of lesson.concepts) {
        const ref = concept.sourceConcept, source = lessons[ref.lessonId], key = `${ref.lessonId}/${ref.conceptId}`;
        if (!source || source.kind === "weekly" || source.date !== ref.date || !source.concepts.some((item) => item.id === ref.conceptId) || seen.has(key)) throw Error("This review needs distinct, taught source concepts.");
        seen.add(key);
      }
    }
    return lessons;
  }
  async function load({ search = global.location?.search || "", ...options } = {}) {
    const catalog = await readCatalog(options), entry = select(catalog, search);
    return { catalog, entry, lesson: await readLesson(entry, options) };
  }
  function finished(progress, lesson, date) {
    if (!progress || !lesson) return false;
    const summary = global.NativeCampCore.summarizeLesson(progress, lesson, date);
    return summary.try.done && summary.say.done;
  }
  // Kept for existing consumers; daily returns have been retired.
  function reviewReady(progress, lessonId, date) {
    return false;
  }
  function navigation(catalog, selectedId, { page = "./", child = "aiden", progress, date = global.NativeCampCore.today(), buttons = false, childView = false, lessons = {} } = {}) {
    if (!catalog?.length) return "";
    const renderEntry = (entry) => {
      const active = entry.id === selectedId;
      const text = `<span>${esc(dateLabel(entry.date))}</span><span class="lesson-teacher">${entry.kind === "weekly" ? "Weekly Review" : esc(entry.teacher)}</span>`;
      if (childView && finished(progress, lessons[entry.id], date)) return `<span class="lesson-link lesson-finished"><svg class="icon" aria-hidden="true"><use href="icons.svg#check"></use></svg>${text}<span class="lesson-teacher">Finished</span></span>`;
      if (childView && !global.NativeCampCore.isOpen(entry, date)) return `<span class="lesson-link lesson-locked">${text}<span class="lesson-teacher">Opens ${esc(dateLabel(entry.weekly?.opensOn || entry.date))}</span></span>`;
      return buttons ? `<button type="button" class="lesson-link" data-lesson="${esc(entry.id)}" aria-pressed="${active}">${text}</button>` : `<a class="lesson-link" href="${esc(href(page, child, entry.id))}"${active ? ' aria-current="page"' : ""}>${text}</a>`;
    };
    if (!childView) return `<nav class="lesson-picker" aria-label="Lessons">${catalog.map(renderEntry).join("")}</nav>`;
    const complete = catalog.filter((entry) => finished(progress, lessons[entry.id], date));
    const remaining = catalog.filter((entry) => !complete.includes(entry));
    return `<nav class="lesson-picker" aria-label="Lessons">${remaining.map(renderEntry).join("")}</nav>${complete.length ? `<details class="finished-lessons"><summary>Finished · ${complete.length}</summary><div class="lesson-picker">${complete.map(renderEntry).join("")}</div></details>` : ""}`;
  }
  function initialMonth(entry, search = "", date = global.NativeCampCore.today()) {
    return (new URLSearchParams(search).has("lesson") ? entry.date : date).slice(0, 7);
  }
  function shiftMonth(month, direction) {
    const value = new Date(`${month}-01T00:00:00Z`);
    value.setUTCMonth(value.getUTCMonth() + direction);
    return value.toISOString().slice(0, 7);
  }
  function calendar(catalog, selectedId, { page = "./", child = "aiden", progress, date = global.NativeCampCore.today(), month = date.slice(0, 7), childView = false, lessons = {} } = {}) {
    if (!catalog?.length) return "";
    const first = new Date(`${month}-01T00:00:00Z`);
    const offset = (first.getUTCDay() + 6) % 7;
    const last = new Date(first); last.setUTCMonth(last.getUTCMonth() + 1); last.setUTCDate(0);
    const title = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
    const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="icons.svg#${name}"></use></svg>`;
    const renderEntry = (entry) => {
      const active = entry.id === selectedId, complete = childView && finished(progress, lessons[entry.id], date);
      const locked = childView && !global.NativeCampCore.isOpen(entry, date);
      const shortLabel = (item) => item.kind === "weekly" ? "Review" : item.teacher;
      const sameLabel = catalog.filter((item) => item.date === entry.date && shortLabel(item) === shortLabel(entry));
      const number = sameLabel.length > 1 ? ` ${sameLabel.indexOf(entry) + 1}` : "";
      const label = shortLabel(entry) + number;
      const state = complete ? ", Finished" : locked ? `, Opens ${dateLabel(entry.weekly?.opensOn || entry.date)}` : "";
      const attributes = `${active ? ' aria-current="page"' : ""} aria-label="${esc(`${dateLabel(entry.date)}, ${entry.kind === "weekly" ? "Weekly Review" : entry.teacher}${number}${state}`)}"`;
      const marker = complete ? icon("check") : locked ? entry.kind === "weekly" ? icon("calendar-days") : "" : '<svg class="icon" aria-hidden="true"><use href="icons.svg?v=20260918-calendar-a#play"></use></svg>';
      const text = `${marker}<span>${esc(label)}</span>`;
      const classes = `calendar-lesson${complete ? " calendar-finished" : locked ? " calendar-locked" : " calendar-available"}`;
      return complete || locked ? `<span class="${classes}"${attributes} aria-disabled="true">${text}</span>` : `<a class="${classes}" href="${esc(href(page, child, entry.id))}"${attributes}>${text}</a>`;
    };
    const cells = [];
    for (let index = 0; index < Math.ceil((offset + last.getUTCDate()) / 7) * 7; index++) {
      const day = index - offset + 1;
      if (day < 1 || day > last.getUTCDate()) { cells.push('<td class="calendar-empty"></td>'); continue; }
      const dayDate = `${month}-${String(day).padStart(2, "0")}`, entries = catalog.filter((entry) => entry.date === dayDate);
      cells.push(`<td class="calendar-day${dayDate === date ? " calendar-today" : ""}${entries.some((entry) => entry.id === selectedId) ? " calendar-selected" : ""}" data-date="${dayDate}"><time datetime="${dayDate}"${dayDate === date ? ` aria-current="date" aria-label="Today, ${esc(dateLabel(dayDate))}"` : ""}>${day}</time><div class="calendar-entries">${entries.map(renderEntry).join("")}</div></td>`);
    }
    const rows = [];
    for (let index = 0; index < cells.length; index += 7) rows.push(`<tr>${cells.slice(index, index + 7).join("")}</tr>`);
    return `<nav class="lesson-calendar" aria-label="Lessons"><div class="calendar-heading"><button type="button" class="calendar-step" data-action="calendar-month" data-direction="-1" aria-label="Previous month">${icon("arrow-left")}</button><h2 id="calendar-month-label" aria-live="polite">${esc(title)}</h2><button type="button" class="calendar-step" data-action="calendar-month" data-direction="1" aria-label="Next month">${icon("arrow-right")}</button></div><table class="calendar-table" aria-labelledby="calendar-month-label"><thead><tr>${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => `<th scope="col">${day}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></nav>`;
  }
  global.NativeCampCatalog = { validateCatalog, select, childFrom, href, readCatalog, readLesson, readLessons, load, finished, reviewReady, navigation, initialMonth, shiftMonth, calendar };
})(globalThis);
