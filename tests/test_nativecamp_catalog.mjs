import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "../docs/nativecamp/core.js";
import "../docs/nativecamp/catalog.js";
const C = globalThis.NativeCampCore, L = globalThis.NativeCampCatalog;
const catalogData = JSON.parse(readFileSync(new URL("../docs/nativecamp/lessons/catalog.json", import.meta.url)));
const original = JSON.parse(readFileSync(new URL("../docs/nativecamp/lessons/2026-09-15.json", import.meta.url)));
const catalog = L.validateCatalog(catalogData);
const fixture = (id) => ({ ...structuredClone(original), id, date: id });

test("catalog defaults to newest date independently of file order and preserves explicit older lessons", () => {
  const sorted = L.validateCatalog({ ...catalogData, lessons: [...catalogData.lessons].reverse() });
  assert.equal(L.select(sorted, "?child=bingpu").id, "2026-09-16");
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
      return new Response(JSON.stringify(path.endsWith("catalog.json") ? catalogData : fixture(id)));
    } });
    assert.equal(loaded.lesson.id, id);
    assert.deepEqual(calls, [`${base}/lessons/catalog.json`, `${base}/lessons/${id}.json`]);
  }
});

test("old lesson reviews stay visible, only become due on their scheduled date, and navigation never mutates progress", () => {
  let progress = C.createProgress();
  const concept = original.concepts[0];
  for (const q of concept.try.slice(0, 2)) progress = C.submitTry(progress, original, "2026-09-17", concept.id, q.id, q.answer).progress;
  const before = JSON.stringify(progress);
  assert.equal(L.reviewReady(progress, original.id, "2026-09-17"), false);
  assert.equal(L.reviewReady(progress, original.id, "2026-09-18"), true);
  const html = L.navigation(catalog, "2026-09-16", { child: "bingpu", progress, date: "2026-09-18" });
  assert.match(html, /href="\.\/\?child=bingpu&amp;lesson=2026-09-15"[^>]*>.*?Silvana.*?Review ready/);
  assert.equal((html.match(/Review ready/g) || []).length, 1);
  assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
  assert.equal(JSON.stringify(progress), before);
  assert.equal(L.href("preview.html", "bingpu", "2026-09-14"), "preview.html?child=bingpu&lesson=2026-09-14");
});

test("new lesson first answers and old lesson deferred reviews coexist through save and reload", () => {
  const newer = fixture("2026-09-16"), older = fixture("2026-09-14");
  let progress = C.createProgress();
  const concept = original.concepts[0];
  for (const q of concept.try.slice(0, 2)) progress = C.submitTry(progress, original, "2026-09-17", concept.id, q.id, q.answer).progress;
  const oldState = structuredClone(progress.lessons[original.id]);
  for (const lesson of [newer, older]) {
    const q = lesson.concepts[0].try[0];
    progress = C.submitTry(progress, lesson, "2026-09-18", concept.id, q.id, q.answer).progress;
  }
  progress = C.validateProgress(JSON.parse(JSON.stringify(progress)));
  assert.deepEqual(progress.lessons[original.id], oldState);
  const next = C.nextQuestion(progress, original, "try", "2026-09-18", concept.id);
  assert.equal(next.phase, "deferred");
  const freshState = structuredClone(progress.lessons[newer.id]);
  progress = C.submitTry(progress, original, "2026-09-18", concept.id, next.question.id, next.question.type === "choice" ? next.question.answer : next.question.acceptedOrders[0]).progress;
  assert.deepEqual(progress.lessons[newer.id], freshState);
  assert.equal(L.reviewReady(progress, original.id, "2026-09-18"), false);
  assert.equal(Object.keys(progress.lessons).length, 3);
});
