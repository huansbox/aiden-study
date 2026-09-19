import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import "../docs/nativecamp/core.js";
import "../docs/nativecamp/catalog.js";
import { lessonFixture } from "./helpers/nativecamp-weekly.mjs";
import { planWeekly, generationBrief } from "../learning-tasks/shared/nativecamp/plan_weekly.mjs";

const C = globalThis.NativeCampCore, L = globalThis.NativeCampCatalog;
const date = "2026-09-19";
function sameDay() {
  const lena = lessonFixture("2026-09-12", ["is-are"]);
  const mel = { ...structuredClone(lena), id: "2026-09-12-mel" };
  const lessons = { [lena.id]: lena, [mel.id]: mel };
  const catalog = L.validateCatalog({ schemaVersion: 1, lessons: [
    { id: lena.id, date: lena.date, teacher: "Lena" },
    { id: mel.id, date: mel.date, teacher: "Mel" },
  ] });
  return { lena, mel, lessons, catalog };
}
function finish(progress, lesson) {
  for (const mode of ["try", "say"]) {
    for (const question of lesson.concepts[0][mode].slice(0, 2)) {
      if (mode === "say") progress = C.markPending(progress, lesson, mode, date, "is-are", question.id, "reveal");
      progress = mode === "try" ? C.submitTry(progress, lesson, date, "is-are", question.id, "is").progress
        : C.submitSay(progress, lesson, date, "is-are", question.id, "gotIt").progress;
    }
  }
  return progress;
}

test("same-day Lena and Mel have separate load, calendar, preview and parent selection entries", async () => {
  const { lena, mel, lessons, catalog } = sameDay();
  const paths = [];
  const loaded = await L.readLessons(catalog, { fetchImpl: async path => {
    paths.push(path);
    return new Response(JSON.stringify(lessons[path.split("/").at(-1).replace(/\.json$/, "")]));
  } });
  assert.deepEqual(loaded, lessons);
  assert.deepEqual(paths.sort(), ["./lessons/2026-09-12-mel.json", "./lessons/2026-09-12.json"]);
  for (const lesson of [lena, mel]) {
    assert.equal(C.validateLesson(lesson), lesson);
    assert.equal(L.select(catalog, `?lesson=${lesson.id}`).id, lesson.id);
  }
  const html = L.calendar(catalog, mel.id, { date, month: "2026-09", childView: true, lessons });
  const cell = html.match(/<td[^>]*data-date="2026-09-12">([\s\S]*?)<\/td>/)[1];
  assert.match(cell, /href="\.\/\?child=aiden&amp;lesson=2026-09-12"[^>]*>.*?<span>Lena<\/span>/);
  assert.match(cell, /href="\.\/\?child=aiden&amp;lesson=2026-09-12-mel" aria-current="page"[^>]*>.*?<span>Mel<\/span>/);
  for (const lesson of [lena, mel]) {
    assert.ok(L.navigation(catalog, mel.id, { page: "preview.html" }).includes(`href="preview.html?child=aiden&amp;lesson=${lesson.id}"`));
    assert.ok(L.navigation(catalog, mel.id, { buttons: true }).includes(`data-lesson="${lesson.id}"`));
  }
  await assert.rejects(L.readLesson(catalog.find(item => item.id === mel.id), { fetchImpl: async () => new Response(JSON.stringify(lena)) }), /does not match/);
});

test("finishing either same-day lesson leaves the other's progress and parent summary independent", () => {
  const data = sameDay();
  const parentWindow = { NativeCampCore: C };
  runInNewContext(readFileSync(new URL("../docs/parent/nativecamp.js", import.meta.url), "utf8"), { window: parentWindow });
  const P = parentWindow.NativeCampParent;
  for (const [finished, remaining] of [[data.lena, data.mel], [data.mel, data.lena]]) {
    let progress = finish(C.createProgress(), finished);
    assert.deepEqual(Object.keys(progress.lessons), [finished.id]);
    assert.equal(P.readSummary({ rev: 1, data: progress }, remaining, date), null);
    progress = C.submitTry(progress, remaining, date, "is-are", "is-are-try-1", "are").progress;
    progress = C.validateProgress(JSON.parse(JSON.stringify(progress)));
    assert.equal(L.finished(progress, finished, date), true);
    assert.equal(L.finished(progress, remaining, date), false);
    assert.equal(C.nextQuestion(progress, remaining, "try", date, "is-are").question.id, "is-are-try-2");
    assert.equal(C.nextQuestion(progress, remaining, "say", date, "is-are").question.id, "is-are-say-1");
    const before = JSON.stringify(progress), options = { date, progress, lessons: data.lessons };
    assert.equal(L.select(data.catalog, "", options).id, remaining.id);
    const child = L.calendar(data.catalog, remaining.id, { ...options, childView: true });
    assert.ok(child.includes(`href="./?child=aiden&amp;lesson=${remaining.id}"`));
    assert.ok(!child.includes(`href="./?child=aiden&amp;lesson=${finished.id}"`));
    assert.match(child, /calendar-finished/);
    const doneSummary = P.readSummary({ rev: 2, data: progress }, finished, date);
    const otherSummary = P.readSummary({ rev: 2, data: progress }, remaining, date);
    assert.equal(doneSummary.try.done, true);
    assert.equal(doneSummary.say.done, true);
    assert.equal(doneSummary.try.concepts[0].needsPractice, false);
    assert.equal(otherSummary.try.done, false);
    assert.equal(otherSummary.try.concepts[0].incorrect, 1);
    assert.equal(otherSummary.say.concepts[0].attempted, 0);
    assert.equal(JSON.stringify(progress), before);
  }
});

test("weekly planning keeps same-day same-named concepts and their difficulties separate", () => {
  const { lena, mel, lessons, catalog } = sameDay();
  let progress = C.submitTry(C.createProgress(), lena, date, "is-are", "is-are-try-1", "are").progress;
  const input = { progress, lessons, catalog, releaseDate: "2026-09-20" };
  const onlyLena = planWeekly(input);
  assert.deepEqual(onlyLena.concepts.map(item => item.sourceConcept.lessonId), [lena.id]);
  progress = C.submitTry(progress, mel, date, "is-are", "is-are-try-1", "is").progress;
  const plan = planWeekly({ ...input, progress });
  assert.equal(plan.concepts.length, 2);
  assert.deepEqual(plan.concepts.map(item => [item.sourceConcept.lessonId, item.sourceConcept.date, item.needsPractice]), [
    [lena.id, lena.date, true], [mel.id, mel.date, false],
  ]);
  const brief = generationBrief(plan, lessons);
  assert.equal(new Set(brief.concepts.map(item => item.id)).size, 2);
  assert.deepEqual(new Set(brief.concepts.map(item => item.sourceConcept.lessonId)), new Set([lena.id, mel.id]));
  const weekly = { ...brief.bundle, concepts: brief.concepts.map(({ originalConcept, ...concept }) => ({
    ...concept,
    ...Object.fromEntries(["try", "say"].map(mode => [mode, originalConcept[mode].map(question => ({ ...question, id: `${concept.id}-${question.id}` }))])),
  })) };
  assert.equal(C.validateLesson(weekly), weekly);
});
