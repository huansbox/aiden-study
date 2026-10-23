import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const base = new URL("../data/study/g4-s1-math-u1/", import.meta.url);
const read = name => JSON.parse(readFileSync(new URL(name, base), "utf8"));
const batch = suffix => read(`social-unit-one-more-paper-${suffix}.json`);
const selection = batch("selection-metadata"), inventory = batch("inventory-metadata"), backlog = batch("backlog-metadata"), sources = batch("source-manifest");
const mapping = read("mapping-metadata.json");
const historical = read("social-unit-two-more-paper-inventory-metadata.json");
const byId = items => new Map(items.map(item => [item.sourceId, item]));
const counts = rows => Object.fromEntries([...new Set(rows.map(r => r.disposition))].map(key => [key, rows.filter(r => r.disposition === key).length]));
const sameSet = (left, right) => assert.deepEqual(new Set(left), new Set(right));

test("exact U1 batch reconciles every one of the historical 90 slots without scope additions or group splitting", () => {
  const prior = historical.rows.filter(r => r.disposition === "earlier_u1_outside_batch");
  assert.equal(prior.length, 90); assert.equal(inventory.sourceAnswerSlots, 90); assert.equal(inventory.rows.length, 90);
  assert.equal(byId(inventory.rows).size, 90);
  sameSet(inventory.rows.map(r => r.sourceId), prior.map(r => r.sourceId));
  const origins = byId(prior), selected = new Map(selection.items.map(i => [i.appId, i]));
  const memberships = new Map();
  for (const row of inventory.rows) {
    const old = origins.get(row.sourceId);
    for (const key of ["paperId", "pdfPage", "questionPage", "printedLocator", "sourceAnswerSlots", "sourceGroupId", "materialDependencyIds", "format", "conceptAxes"]) assert.deepEqual(row[key], old[key]);
    assert.equal(row.sourceAnswerSlots, 1); assert.equal(row.historicalDisposition, "earlier_u1_outside_batch");
    assert.equal(row.officialAnswerAvailable, false);
    if (row.disposition === "candidate_rev22" || row.disposition === "published_rev22") {
      assert.equal(row.candidateAppIds.length + row.publishedAppIds.length, 1);
      const appId = [...row.candidateAppIds, ...row.publishedAppIds][0];
      assert.ok(selected.has(appId)); assert.ok(selected.get(appId).constituentSourceIds.includes(row.sourceId));
      const position = row.activityPartId ? `part:${row.activityPartId}` : row.activityBlankNumber ? `blank:${row.activityBlankNumber}` : "single";
      if (!memberships.has(appId)) memberships.set(appId, new Set());
      assert.ok(!memberships.get(appId).has(position)); memberships.get(appId).add(position);
      assert.equal(row.heldAppIds.length, 0);
      assert.equal(row.answerStatus, "independently_solved_twice_no_official_answer");
    } else {
      assert.equal(row.candidateAppIds.length + row.publishedAppIds.length, 0);
      assert.ok(row.holdReasonCode); assert.equal(row.answerStatus, "not_approved_for_automatic_scoring");
    }
  }
  for (const item of selection.items) assert.equal(memberships.get(item.appId)?.size, item.answerSlots);
  const grouped = new Map();
  for (const row of inventory.rows) {
    if (!grouped.has(row.sourceGroupId)) grouped.set(row.sourceGroupId, []);
    grouped.get(row.sourceGroupId).push(row);
  }
  for (const rows of grouped.values()) assert.equal(new Set(rows.map(r => r.disposition)).size, 1, "a complete source activity cannot be partly selected and partly held");
  assert.deepEqual(inventory.counts, counts(inventory.rows));
  sameSet(backlog.rows.map(r => r.sourceId), inventory.rows.filter(r => !["candidate_rev22", "published_rev22"].includes(r.disposition)).map(r => r.sourceId));
  assert.equal(backlog.sourceAnswerSlots, backlog.rows.length); assert.deepEqual(backlog.counts, counts(backlog.rows));
  assert.equal(selection.newSourceAnswerSlots + backlog.sourceAnswerSlots, 90);
});

test("public counts use complete digital activities, preserve all 419 baseline mapping values and keep U1's three topics", () => {
  assert.equal(selection.newActivities, selection.items.length);
  assert.equal(new Set(selection.items.map(i => i.appId)).size, selection.items.length);
  assert.equal(selection.newSourceAnswerSlots, selection.items.reduce((sum, i) => sum + i.answerSlots, 0));
  assert.ok(mapping.revision >= 22); assert.ok(mapping.items.length >= 419 + selection.newActivities);
  // Immutable rev21 mapping snapshot, independently fixed before appending this batch.
  assert.equal(createHash("sha256").update(JSON.stringify(mapping.items.slice(0, 419))).digest("hex"), "87c5edfe7d01520349c897c4a52c04a855d3b6e8d434f542c109acf271203d46");
  const baselineRows = mapping.items.slice(0, 419);
  assert.equal(baselineRows.filter(i => i.appId.startsWith("math-")).length, 68);
  assert.equal(baselineRows.filter(i => i.appId.startsWith("science-")).length, 217);
  assert.equal(baselineRows.filter(i => i.unit === 23).length, 67);
  const batchIds = new Set(selection.items.map(i => i.appId));
  const newRows = mapping.items.filter(item => batchIds.has(item.appId));
  sameSet(newRows.map(i => i.appId), selection.items.map(i => i.appId));
  assert.ok(newRows.every(i => i.unit === 22 && i.appId.startsWith("social-g4s1-")));
  assert.ok(newRows.every(i => i.reviewStatus === "independently_solved_twice_no_official_answer" && i.answerPage === null));
  assert.equal(selection.candidateAllSubjectActivities, 419 + selection.newActivities);
  assert.equal(selection.candidateSocialActivities, 134 + selection.newActivities);
  assert.equal(selection.candidateSocialSourceAnswerSlots, 231 + selection.newSourceAnswerSlots);
  assert.equal(selection.candidateU1Activities, 67 + selection.newActivities);
  assert.equal(selection.candidateU1SourceAnswerSlots, 101 + selection.newSourceAnswerSlots);
  assert.equal(selection.unchangedU2Activities, 67); assert.equal(selection.unchangedU2SourceAnswerSlots, 130);
  sameSet(Object.keys(selection.topicCounts), ["地圖與位置", "地形與生活", "氣候與水資源"]);
  for (const [topic, total] of Object.entries(selection.topicCounts)) {
    const items = selection.items.filter(i => i.subtopic === topic);
    assert.equal(items.length, total.newActivities); assert.equal(items.reduce((n, i) => n + i.answerSlots, 0), total.newSourceAnswerSlots);
  }
});

test("new projection retains prior published facts and reconciles the five-paper 384-slot inventory separately", () => {
  assert.equal(historical.sourceAnswerSlots, 384); assert.equal(historical.counts.earlier_u1_outside_batch, 90);
  assert.equal(historical.publicationStatus, "published"); assert.equal(historical.candidateRevision, 21);
  const current = inventory.currentFivePaperReconciliation;
  assert.equal(current.originalSourceAnswerSlots, 384); assert.equal(current.publishedRev21SourceAnswerSlots, 103);
  assert.equal(current.candidateRev22U1SourceAnswerSlots, selection.newSourceAnswerSlots);
  assert.equal(current.retainedAfterCandidateSourceAnswerSlots, 281 - selection.newSourceAnswerSlots);
  assert.equal(current.publishedRev21SourceAnswerSlots + current.candidateRev22U1SourceAnswerSlots + current.retainedAfterCandidateSourceAnswerSlots, 384);
  assert.equal(Object.values(current.counts).reduce((n, v) => n + v, 0), 384);
  assert.equal(current.historicalRowsUnchanged, true);
  for (const disposition of ["later_u4", "later_u3", "open_response_outside_u2", "u2_scope_boundary_requires_review"]) assert.equal(current.counts[disposition], historical.counts[disposition]);
  assert.equal(current.counts.hold_complete_activity_source_ambiguity, historical.counts.hold_complete_activity_source_ambiguity + (backlog.counts.hold_complete_activity_source_ambiguity || 0));
  assert.equal(sources.sourceAnswerSlots, 90); assert.equal(sources.originalPdfPages, 8); assert.equal(sources.scopePdfPages, 6);
  assert.deepEqual(Object.fromEntries(sources.papers.map(p => [p.paperId, p.exactBatchSourceAnswerSlots])), { smps112: 15, jdps113: 36, jdps114: 39 });
  assert.ok(sources.papers.every(p => /^[a-f0-9]{64}$/.test(p.questionPdf.sha256)));
});

test("all four public projections expose neutral provenance and fingerprints with honest publication state", () => {
  const forbidden = new Set(["text", "answer", "answers", "options", "parts", "blanks", "material", "data", "aliases", "acceptedAnswers", "sourceActivityText", "originalPrompt", "explanation"]);
  function check(value) {
    if (Array.isArray(value)) return value.forEach(check);
    if (!value || typeof value !== "object") return;
    for (const [key, item] of Object.entries(value)) { assert.ok(!forbidden.has(key), key); check(item); }
  }
  for (const doc of [selection, inventory, backlog, sources]) {
    assert.equal(doc.privatePayloadIncluded, false); assert.equal(doc.formalTargetRangeVerified, false);
    assert.equal(doc.rootSelectionApproved, true); assert.equal(doc.rootContentApproved, true);
    assert.ok(["candidate_not_published", "published"].includes(doc.publicationStatus));
    if (doc.publicationStatus === "candidate_not_published") assert.equal(doc.status, "root_approved_rev22_candidate");
    for (const key of ["selectionSha256", "sourceSha256", "manifestSha256", "independentExpectedSha256"]) assert.match(doc[key], /^[a-f0-9]{64}$/);
    assert.equal(doc.sourceSha256, selection.sourceSha256); assert.equal(doc.manifestSha256, selection.manifestSha256);
    assert.doesNotMatch(JSON.stringify(doc), /data:image|base64|[A-Z]:\\/); check(doc);
  }
});
