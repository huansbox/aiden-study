import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "../docs/nativecamp/core.js";
import "../docs/nativecamp/catalog.js";
import { legacyProgress, weeklyFixture, lessonFixture } from "./helpers/nativecamp-weekly.mjs";
const C = globalThis.NativeCampCore, L = globalThis.NativeCampCatalog;
const catalogData = JSON.parse(readFileSync(new URL("../docs/nativecamp/lessons/catalog.json", import.meta.url)));
const original = JSON.parse(readFileSync(new URL("../docs/nativecamp/lessons/2026-09-15.json", import.meta.url)));
const catalog = L.validateCatalog(catalogData);
const fixture = (id) => ({ ...structuredClone(original), id, date: id });

test("catalog defaults to newest date independently of file order and preserves explicit older lessons", () => {
  const sorted = L.validateCatalog({ ...catalogData, lessons: [...catalogData.lessons].reverse() });
  assert.equal(L.select(sorted, "?child=bingpu", { date: "2026-09-18" }).id, sorted.find((entry) => C.isOpen(entry, "2026-09-18")).id);
  assert.equal(L.select(sorted, "?child=bingpu&lesson=2026-09-14").id, "2026-09-14");
  assert.equal(L.select(sorted, "?lesson=2026-09-15").teacher, "Silvana");
  assert.throws(() => L.select(sorted, "?lesson=missing"), /not available/);
  assert.equal(L.childFrom("?child=test-learner&lesson=2026-09-14"), "test-learner");
  assert.equal(L.childFrom("?child=other"), "aiden");
});

test("invalid catalogs and identity mismatches fail without opening another lesson", async () => {
  for (const bad of [
    { ...catalogData, lessons: [] },
    { ...catalogData, lessons: [...catalogData.lessons, catalogData.lessons[0]] },
    { ...catalogData, lessons: [{ ...catalogData.lessons[0], id: "../secret" }] },
    { ...catalogData, lessons: [{ ...catalogData.lessons[0], date: "2026-02-30" }] },
  ]) assert.throws(() => L.validateCatalog(bad));
  await assert.rejects(L.load({ search: "?lesson=2026-09-14", fetchImpl: async (path) => new Response(JSON.stringify(path.endsWith("catalog.json") ? catalogData : original)) }), /does not match/);
  await assert.rejects(L.readCatalog({ fetchImpl: async () => new Response("unavailable", { status: 503 }) }), /could not be loaded/);
});

test("all consumers load only the selected bundle from the same catalog, using bounded read-only requests", async () => {
  for (const base of [".", "../nativecamp"]) for (const id of catalog.map((item) => item.id)) {
    const calls = [];
    const loaded = await L.load({ base, search: `?child=bingpu&lesson=${id}`, fetchImpl: async (path, init) => {
      calls.push(path); assert.equal(init.cache, "no-cache"); assert.ok(init.signal); assert.equal(init.method, undefined);
      return new Response(JSON.stringify(path.endsWith("catalog.json") ? catalogData : JSON.parse(readFileSync(new URL(`../docs/nativecamp/lessons/${id}.json`, import.meta.url)))));
    } });
    assert.equal(loaded.lesson.id, id);
    assert.deepEqual(calls, [`${base}/lessons/catalog.json`, `${base}/lessons/${id}.json`]);
  }
});

test("old due dates never reopen reviews and navigation never mutates progress", () => {
  let progress = C.createProgress();
  const concept = original.concepts[0];
  for (const q of concept.try.slice(0, 2)) progress = C.submitTry(progress, original, "2026-09-17", concept.id, q.id, q.answer).progress;
  const before = JSON.stringify(progress);
  assert.equal(L.reviewReady(progress, original.id, "2026-09-17"), false);
  assert.equal(L.reviewReady(progress, original.id, "2026-09-18"), false);
  const html = L.navigation(catalog, "2026-09-16", { child: "bingpu", progress, date: "2026-09-18" });
  assert.match(html, /href="\.\/\?child=bingpu&amp;lesson=2026-09-15"[^>]*>.*?Silvana/);
  assert.equal((html.match(/Review ready/g) || []).length, 0);
  assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
  assert.equal(JSON.stringify(progress), before);
  assert.equal(L.href("preview.html", "bingpu", "2026-09-14"), "preview.html?child=bingpu&lesson=2026-09-14");
});

test("new lesson first answers coexist with retained old history through save and reload", () => {
  const newer = fixture("2026-09-16"), older = fixture("2026-09-14");
  let progress = C.validateProgress(legacyProgress());
  const concept = original.concepts[0];
  const oldState = structuredClone(progress.lessons[original.id]);
  for (const lesson of [newer, older]) {
    const q = lesson.concepts[0].try[0];
    progress = C.submitTry(progress, lesson, "2026-09-18", concept.id, q.id, q.answer).progress;
  }
  progress = C.validateProgress(JSON.parse(JSON.stringify(progress)));
  assert.deepEqual(progress.lessons[original.id], oldState);
  const next = C.nextQuestion(progress, original, "try", "2026-09-18", concept.id);
  assert.equal(next, null);
  const freshState = structuredClone(progress.lessons[newer.id]);
  assert.equal(C.submitTry(progress, original, "2026-09-18", concept.id, "is-are-try-3", "is").recorded, false);
  assert.deepEqual(progress.lessons[newer.id], freshState);
  assert.equal(L.reviewReady(progress, original.id, "2026-09-18"), false);
  assert.equal(Object.keys(progress.lessons).length, 3);
});

test("child catalog prioritizes open unfinished lessons, folds finished cards and keeps parent access", () => {
  const weekly = weeklyFixture();
  const entries = L.validateCatalog({ schemaVersion: 1, lessons: [{ id: original.id, date: original.date, teacher: "Silvana" }, { id: weekly.id, date: weekly.date, kind: "weekly", weekly: weekly.weekly }] });
  let progress = C.createProgress();
  for (const mode of ["try", "say"]) for (const concept of original.concepts) for (const q of concept[mode].slice(0, 2)) {
    if (mode === "say") progress = C.markPending(progress, original, mode, "2026-09-18", concept.id, q.id, "reveal");
    progress = mode === "try" ? C.submitTry(progress, original, "2026-09-18", concept.id, q.id, q.type === "choice" ? q.answer : q.acceptedOrders[0]).progress : C.submitSay(progress, original, "2026-09-18", concept.id, q.id, "gotIt").progress;
  }
  const lessons = { [original.id]: original, [weekly.id]: weekly }, options = { progress, lessons, date: "2026-09-20" };
  assert.equal(L.select(entries, "", options).id, weekly.id);
  const child = L.navigation(entries, weekly.id, { ...options, childView: true });
  assert.match(child, /<details class="finished-lessons"><summary>Finished/);
  assert.doesNotMatch(child, /href="[^"]*lesson=2026-09-15"/);
  assert.match(child, /lesson=weekly-2026-09-14/);
  const closed = L.navigation(entries, weekly.id, { ...options, date: "2026-09-19", childView: true });
  assert.doesNotMatch(closed, /<a /);
  assert.match(closed, /Opens Sep 20/);
  assert.match(L.navigation(entries, original.id, { ...options, page: "preview.html" }), /preview.html\?child=aiden&amp;lesson=2026-09-15/);
});

test("weekly source references must resolve to distinct ordinary taught lessons", async () => {
  const weekly = weeklyFixture(), current = lessonFixture("2026-09-15", ["is-are", "odd-even", "too-many", "other"]), older = lessonFixture("2026-09-13", ["earlier"]);
  const bundles = [weekly, current, older];
  const entries = L.validateCatalog({ schemaVersion: 1, lessons: bundles.map((lesson) => ({ id: lesson.id, date: lesson.date, teacher: "Teacher", ...(lesson.kind ? { kind: lesson.kind, weekly: lesson.weekly } : {}) })) });
  const fetchImpl = async (path) => new Response(JSON.stringify(bundles.find((bundle) => path.endsWith(`/${bundle.id}.json`))));
  assert.equal(Object.keys(await L.readLessons(entries, { fetchImpl })).length, 3);
  weekly.concepts[0].sourceConcept.conceptId = "missing";
  await assert.rejects(L.readLessons(entries, { fetchImpl }), /source concepts/);
});

test("calendar uses Monday columns, leap days and Taipei today across month boundaries", () => {
  const cells = (html) => [...html.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((match) => match[1]);
  const leap = L.calendar(catalog, "2026-09-15", { month: "2024-02", date: "2024-02-29" });
  const leapCells = cells(leap);
  assert.match(leap, /<th scope="col">Mon<\/th>.*<th scope="col">Sun<\/th>/);
  assert.equal(leapCells.length, 35);
  assert.ok(leapCells.slice(0, 3).every((cell) => cell === ""));
  assert.match(leapCells[3], /datetime="2024-02-01"/);
  assert.match(leapCells[31], /datetime="2024-02-29" aria-current="date"/);
  assert.doesNotMatch(L.calendar(catalog, null, { month: "2023-02" }), /2023-02-29/);
  assert.equal(cells(L.calendar(catalog, null, { month: "2021-02" })).length, 28);
  assert.equal(cells(L.calendar(catalog, null, { month: "2024-09" })).length, 42);
  assert.equal(L.shiftMonth("2026-12", 1), "2027-01");
  assert.equal(L.shiftMonth("2026-01", -1), "2025-12");
  const taipeiDate = C.today(new Date("2026-08-31T16:01:00Z"));
  const entry = { date: "2026-08-15" };
  assert.equal(L.initialMonth(entry, "?child=bingpu", taipeiDate), "2026-09");
  assert.equal(L.initialMonth(entry, "?child=bingpu&lesson=2026-08-15", taipeiDate), "2026-08");
  assert.match(L.calendar(catalog, null, { date: taipeiDate }), /datetime="2026-09-01" aria-current="date"/);
});

test("calendar retains every same-day lesson, short labels and unchanged parent navigation", () => {
  const entries = [{ id: "2026-09-20-a", date: "2026-09-20", teacher: "Ann & Lee" }, { id: "2026-09-20-b", date: "2026-09-20", teacher: "Michael" }, ...catalog];
  const html = L.calendar(entries, "2026-09-20-a", { child: "bingpu", date: "2026-09-20" });
  const row = html.match(/<tr>(?:(?!<\/tr>)[\s\S])*data-date="2026-09-20"(?:(?!<\/tr>)[\s\S])*<\/tr>/)[0];
  const sunday = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)][6][1];
  assert.match(sunday, /lesson=2026-09-20-a" aria-current="page" aria-label="Sep 20, 2026, Ann &amp; Lee"/);
  assert.match(sunday, /lesson=2026-09-20-b/);
  assert.match(sunday, /lesson=weekly-2026-09-14.*icons.svg#calendar-days.*<span>Review<\/span>/);
  assert.match(html, /child=bingpu&amp;lesson=2026-09-20-a/);
  assert.doesNotMatch(html, /\p{Extended_Pictographic}|[\u3400-\u9fff]/u);
  const parent = L.navigation(entries, "2026-09-20-a", { buttons: true });
  assert.match(parent, /<nav class="lesson-picker"/);
  assert.match(parent, /data-lesson="2026-09-20-a" aria-pressed="true"/);
  assert.doesNotMatch(parent, /lesson-calendar|calendar-month/);
  const twice = L.calendar([{ ...entries[0], teacher: "Edon" }, { ...entries[1], teacher: "Edon" }], entries[0].id, { date: "2026-09-20" });
  assert.match(twice, /aria-label="Sep 20, 2026, Edon 1".*<span>Edon 1<\/span>/);
  assert.match(twice, /aria-label="Sep 20, 2026, Edon 2".*<span>Edon 2<\/span>/);
});

test("calendar blocks finished and unopened child lessons while Preview remains read-only and selectable", () => {
  let progress = C.createProgress();
  for (const mode of ["try", "say"]) for (const concept of original.concepts) for (const q of concept[mode].slice(0, 2)) {
    if (mode === "say") progress = C.markPending(progress, original, mode, "2026-09-18", concept.id, q.id, "reveal");
    progress = mode === "try" ? C.submitTry(progress, original, "2026-09-18", concept.id, q.id, q.type === "choice" ? q.answer : q.acceptedOrders[0]).progress : C.submitSay(progress, original, "2026-09-18", concept.id, q.id, "gotIt").progress;
  }
  const before = JSON.stringify(progress), options = { progress, lessons: { [original.id]: original }, date: "2026-09-18" };
  const child = L.calendar(catalog, original.id, { ...options, childView: true });
  assert.match(child, /calendar-finished" aria-current="page" aria-label="Sep 15, 2026, Silvana, Finished" aria-disabled="true".*icons.svg#check/);
  assert.doesNotMatch(child, /href="[^"]*lesson=2026-09-15"|href="[^"]*lesson=weekly-2026-09-14"/);
  assert.match(child, /calendar-locked.*Weekly Review, Opens Sep 20, 2026/);
  assert.match(child, /href="[^"]*lesson=2026-09-16"/);
  const preview = L.calendar(catalog, original.id, { ...options, page: "preview.html" });
  assert.match(preview, /href="preview.html\?child=aiden&amp;lesson=2026-09-15"/);
  assert.match(preview, /href="preview.html\?child=aiden&amp;lesson=weekly-2026-09-14"/);
  assert.doesNotMatch(preview, /calendar-finished|calendar-locked|aria-disabled/);
  assert.equal(JSON.stringify(progress), before);
});
