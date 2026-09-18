import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const context = vm.createContext({ URL, Date });
context.window = context;
vm.runInContext(readFileSync(new URL("../docs/parent/workboard.js", import.meta.url), "utf8"), context);
const { readCatalog, groups, filterGroups, freshness } = context.KidsWorkboard;
const base = "https://kids.linshuhuan.com/parent/";
const work = (overrides = {}) => ({
  id: "app:nativecamp", type: "app", name: "Native Camp Review", audience: ["aiden"], audienceLabel: "哥哥",
  status: "unknown", statusNote: "", availability: "available", location: "aiden-study/docs/nativecamp",
  source: { repo: "huansbox/aiden-study", ref: "master", paths: ["docs/nativecamp"], excludePaths: [], remote: false },
  sourceUrl: "https://github.com/huansbox/aiden-study/tree/master/docs/nativecamp", links: [{ label: "開啟", url: "../nativecamp/preview.html" }], description: "", eventDate: null,
  groupId: "nativecamp", groupName: "Native Camp", created: "2026-09-16", updated: "2026-09-17", freshness: { state: "current", checkedAt: null, error: null }, ...overrides,
});
const fixture = () => [work(), work({ id: "task:weekly", type: "task", name: "Weekly — grandparents", status: "complete", location: "aiden-study/learning-tasks/weekly", created: "2026-09-14", updated: "2026-09-18" }), work({ id: "task:zoo", type: "task", groupId: null, groupName: null, name: "動物園", audience: ["bingpu"], created: null, updated: null })];
const state = (overrides = {}) => ({ search: "", audience: "all", type: "all", status: "all", sort: "recent", ...overrides });

test("workboard accepts its flat catalog contract without deriving a completion state", () => {
  const input = fixture();
  const result = readCatalog({ schemaVersion: 1, works: input }, base);
  assert.equal(result[0].status, "unknown");
  assert.equal(result[2].updated, null);
  assert.equal(result, input);
  assert.equal(readCatalog({ schemaVersion: 1, works: [] }, base).length, 0);
});

test("workboard groups explicit series only and keeps every member with exact known date bounds", () => {
  const list = groups(fixture());
  assert.equal(list.length, 2);
  assert.equal(list[0].name, "Native Camp");
  assert.equal(list[0].primary.id, "app:nativecamp");
  assert.equal(list[0].members.length, 2);
  assert.equal(list[0].created, "2026-09-14");
  assert.equal(list[0].updated, "2026-09-18");
  assert.equal(list[0].status, "unknown");
  assert.equal(list[0].members[1].status, "complete");
  assert.equal(list[1].updated, null);
  assert.equal(groups([work()])[0].name, "Native Camp Review", "只有一份的系列仍使用作品名稱");
});

test("workboard searches member names, locations and refs while applying filters to the same member", () => {
  const list = groups(fixture());
  for (const search of ["GRANDPARENTS", "learning-tasks/weekly", "master"]) assert.equal(filterGroups(list, state({ search }))[0].id, "group:nativecamp");
  assert.equal(filterGroups(list, state({ search: "grandparents", type: "app" })).length, 0);
  assert.equal(filterGroups(list, state({ status: "complete" }))[0].id, "group:nativecamp");
  assert.equal(filterGroups(list, state({ audience: "bingpu" }))[0].id, "task:zoo");
  assert.equal(filterGroups(list, state())[1].updated, null, "unknown dates sort after known dates");
});

test("remote freshness expires after 48 hours without changing Git dates", () => {
  const now = Date.parse("2026-09-18T00:00:00Z");
  const original = work();
  assert.equal(freshness(original, now), "current");
  const remote = work({ source: { ...original.source, remote: true }, freshness: { state: "current", checkedAt: "2026-09-17T00:00:00Z" } });
  assert.equal(freshness(remote, now), "current");
  assert.equal(freshness(remote, now + 2 * 86400000), "stale");
  assert.equal(remote.updated, "2026-09-17");
  assert.equal(freshness({ ...remote, freshness: { state: "stale", checkedAt: "2026-09-18T00:00:00Z" } }, now), "stale");
  assert.equal(freshness({ ...remote, freshness: { state: "current", checkedAt: null } }, now), "unknown");
});

test("malformed dates, duplicate IDs and executable links reject the catalog rather than silently dropping records", () => {
  for (const invalid of [
    { schemaVersion: 2, works: [] }, {}, { schemaVersion: 1, works: [work(), work()] },
    ...[
      { created: "2026-02-30" }, { updated: undefined }, { status: "active" }, { availability: "complete" }, { groupName: "" }, { groupName: "   " },
      { sourceUrl: "javascript:alert(1)" }, { links: [{ label: "開啟", url: "data:text/html,bad" }] },
      { links: [{ label: "開啟", url: "https://secret@example.com" }] }, { freshness: { state: "current", checkedAt: "bad" } },
    ].map((override) => ({ schemaVersion: 1, works: [work(override)] })),
  ]) assert.throws(() => readCatalog(invalid, base));
});

test("mobile workboard text inputs and selects use 16px to avoid Safari focus zoom", () => {
  const css = readFileSync(new URL("../docs/parent/workboard.css", import.meta.url), "utf8");
  const mobile = css.slice(css.indexOf("@media(max-width:650px)"));
  assert.match(mobile, /\.wb-toolbar input:not\(\[type="checkbox"\]\),\.family-page \.wb-toolbar select\{font-size:16px/);
});
