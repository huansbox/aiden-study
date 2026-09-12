// Run the actual app, wiring and sync scripts with synthetic storage and DOM ports.
// This is a behavior harness, not a browser/HTML-parser substitute.
import { readFileSync } from "node:fs";
import vm from "node:vm";
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
export const publicQuestions = JSON.parse(read("docs/study/questions.json"));
export function storage() {
  const map = new Map();
  return { map, writes: [], fail: () => false,
    getItem(key) { return map.get(key) ?? null; },
    setItem(key, value) { if (this.fail(key)) throw Error("QuotaExceededError"); this.writes.push(key); map.set(key, String(value)); },
    removeItem(key) { map.delete(key); }
  };
}
export async function boot(st = storage(), child = "test-child") {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) {
      const classes = new Set(["hidden"]);
      nodes.set(id, { id, innerHTML: "", textContent: "", value: "", style: {}, dataset: {},
        classList: { add: (...xs) => xs.forEach(x => classes.add(x)), remove: (...xs) => xs.forEach(x => classes.delete(x)), contains: x => classes.has(x), toggle: (x, yes) => yes ? classes.add(x) : classes.delete(x) },
        querySelectorAll: () => [], setAttribute() {}, focus() {}, select() {}
      });
    }
    return nodes.get(id);
  };
  const document = { getElementById: node, querySelector: () => null,
    querySelectorAll: sel => sel === "#app > div" ? ["page-home", "page-quiz", "page-summary", "page-error"].map(node) : [],
    createElement: tag => node(`created-${tag}`), body: { prepend(n) { nodes.set(n.id, n); } }, addEventListener() {}, activeElement: null };
  const errors = [];
  const requests = [];
  const ctx = vm.createContext({ document, localStorage: st, location: { search: `?child=${child}`, hash: "", pathname: "/study/", reload() {} },
    console: { log() {}, warn() {}, error: (...e) => errors.push(e) }, TextEncoder, TextDecoder, structuredClone, URL, URLSearchParams, Blob, AbortController,
    setTimeout: () => 1, clearTimeout() {}, addEventListener() {}, scrollTo() {},
    fetch: async url => { requests.push(url); return { ok: true, json: async () => url === "./questions.json" ? structuredClone(publicQuestions) : {} }; },
  });
  ctx.window = ctx;
  vm.runInContext(read("docs/shared/sync-v1.js"), ctx);
  let syncConfig;
  const originalClient = ctx.KidsSyncV1.createSyncClient;
  ctx.KidsSyncV1.createSyncClient = cfg => { syncConfig = cfg; return originalClient(cfg); };
  vm.runInContext(read("docs/shared/wiring-v1.js"), ctx);
  vm.runInContext(read("docs/study/private-pack.js"), ctx);
  const inline = read("docs/study/index.html").match(/<script>([\s\S]*?)<\/script>/)[1];
  const expose = `globalThis.app = { init, State, Storage, Picker, quiz, importPrivatePack, currentScope, startQuiz, submitAnswer, advance, leaveQuiz, skipCurrentQuestion, renderHome, renderQuiz, buildReportUrl, renderFlaggedSection, buildBackupText, parseBackup, wiring, unitNum, STUDY_TERMS,
    get state() { return state; }, get activePack() { return activePack; }, get map() { return questionMap; }, get saveFailed() { return progressSaveFailed; } };`;
  vm.runInContext(inline.replace(/\ninit\(\);\s*\n\}\)\(\);/, `\n${expose}\n})();`), ctx);
  await ctx.app.init();
  if (errors.length) throw Error(errors.map(e => e.join(" ")).join("\n"));
  return { app: ctx.app, window: ctx, st, nodes, node, requests, syncConfig, child };
}
