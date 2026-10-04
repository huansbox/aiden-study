// Execute both complete inline scripts: no separate preview learning implementation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const html = read('docs/zhuyin/index.html');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const content = JSON.parse(read('docs/zhuyin/content.json'));

async function harness(search = '?preview=1&child=bingpu&k=synthetic&parent=1', { blocked = false, headGate = null } = {}) {
  const nodes = new Map(), requests = [], adapters = [], writes = [], timers = new Map();
  let timerId = 0, now = 0, saved = JSON.stringify({ schemaVersion: 1, cards: {
    'sym:ㄅ': { introduced: true, wrong: false, practiced: 3, correct: 3 },
    'sym:ㄇ': { introduced: true, wrong: false, practiced: 3, correct: 3 },
    'sym:ㄚ': { introduced: true, wrong: false, practiced: 3, correct: 3 },
  } });
  function node(id = '') {
    const classes = new Set(/^(screen-(?!home)|preview-bar|preview-options)/.test(id) ? ['hidden'] : []);
    const children = new Map();
    return { innerHTML: '', textContent: '', value: '', dataset: {}, disabled: false, isConnected: true,
      handlers: {}, addEventListener(name, fn) { this.handlers[name] = fn; },
      replaceChildren() { this.innerHTML = ''; },
      querySelectorAll() { return []; },
      querySelector(selector) { if (!children.has(selector)) children.set(selector, node()); return children.get(selector); },
      closest() { return this; },
      classList: { add: (...xs) => xs.forEach((x) => classes.add(x)), remove: (...xs) => xs.forEach((x) => classes.delete(x)),
        contains: (x) => classes.has(x), toggle: (x, on) => on ? classes.add(x) : classes.delete(x) },
    };
  }
  const get = (id) => { if (!nodes.has(id)) nodes.set(id, node(id)); return nodes.get(id); };
  get('preview-start').value = 'learned'; get('preview-mode').value = 'all';
  const document = { body: node(), getElementById: get, querySelector: get,
    querySelectorAll: (selector) => selector === '#app > .screen'
      ? ['home', 'parent', 'card', 'break', 'msg'].map((id) => get('screen-' + id)) : [],
    write: (source) => writes.push(source),
  };
  Object.defineProperty(document, 'cookie', { get() { throw Error('Preview accessed cookies'); } });
  const sync = { boot: async () => adapters.push('boot'), markDirty: () => adapters.push('dirty') };
  const wiring = {
    currentChild: 'bingpu', store: { progressKey: () => 'zhuyin:progress:bingpu' },
    identityUnresolvable: () => blocked,
    safeGet: () => { adapters.push('read'); return saved; },
    safeSet: (_, json) => { adapters.push('write'); saved = json; return true; },
    seedLegacy: () => { adapters.push('seed'); return true; },
    anchorLocalWrite: () => adapters.push('anchor'), renderChildBadge: () => adapters.push('badge'),
    initSync: () => { adapters.push('sync'); return sync; }, attachPageshowGuard: () => adapters.push('pageshow'),
    refreshSyncStatus: () => adapters.push('health'),
  };
  const family = { ready: Promise.resolve(), allowed: () => true, task: () => null,
    setActive: () => {}, beginRound: () => adapters.push('begin'), record: () => adapters.push('record'),
    finishRound: () => adapters.push('finish'),
  };
  const window = { location: { search } };
  for (const [key, value] of Object.entries({
    KidsWiringV1: { createWiring: () => { adapters.push('wiring'); return wiring; } },
    KidsFamily: { mount: () => { adapters.push('mount'); return family; } },
  })) Object.defineProperty(window, key, { get() {
    if (search.includes('preview=1')) throw Error('Preview accessed formal global ' + key);
    return value;
  } });
  const globals = { window, document, URLSearchParams, console, performance: { now: () => now },
    crypto: { randomUUID: () => 'synthetic-round' }, Image: class {},
    Audio: class { addEventListener() {} pause() {} play() { return Promise.resolve(); } },
    setTimeout: (fn, ms) => { timers.set(++timerId, { fn, ms }); return timerId; },
    clearTimeout: (id) => timers.delete(id),
    fetch: async (url, init) => {
      requests.push({ url, method: init?.method || 'GET' });
      if (url === 'content.json') return { ok: true, json: async () => structuredClone(content) };
      if (url === '../shared/rewards.json') return { ok: true, json: async () => ({ pools: {} }) };
      if (url.startsWith('assets/audio/') && init?.method === 'HEAD') { if (headGate) await headGate; return { ok: true }; }
      throw Error('Unexpected network request: ' + url);
    },
  };
  for (const name of ['localStorage', 'sessionStorage', 'indexedDB']) {
    const descriptor = { get() { throw Error('Preview accessed ' + name); } };
    Object.defineProperty(globals, name, descriptor); Object.defineProperty(window, name, descriptor);
  }
  const context = vm.createContext(globals);
  for (const script of scripts) vm.runInContext(script, context);
  const ready = vm.runInContext('ready', context);
  if (!headGate) await ready;
  const app = vm.runInContext('app', context);
  const run = (source) => vm.runInContext(source, context);
  const click = (id, event) => { now += 1000; return get(id).handlers.click?.(event); };
  const fire = (ms) => {
    const entry = [...timers].find(([, timer]) => timer.ms === ms);
    assert.ok(entry, `Expected ${ms}ms pending timer`);
    timers.delete(entry[0]); now += ms; entry[1].fn();
  };
  return { app, get, node, run, click, fire, requests, adapters, writes, timers, ready, saved: () => saved };
}

test('explicit preview loads no formal scripts or adapters despite child, k, parent and blocked browser storage', async () => {
  const h = await harness();
  assert.equal(h.writes.length, 0);
  assert.deepEqual(h.adapters, []);
  assert.ok(h.app.content);
  assert.equal(h.get('preview-bar').classList.contains('hidden'), false);
  assert.equal(h.get('preview-options').classList.contains('hidden'), false);
  assert.deepEqual(h.requests.map((r) => r.method).sort(), ['GET', ...Array(14).fill('HEAD')].sort());
  assert.ok(h.requests.every((r) => r.url === 'content.json' || r.url.startsWith('assets/audio/')));
  await h.click('btn-export'); await h.click('btn-import'); await h.click('btn-reset');
  h.run('initSyncClient(); saveProgress(); renderParent(); finishBatch();');
  assert.deepEqual(h.adapters, []);
});

test('preview selections use official batch quotas; new, learned, weak, mode changes and reset stay in memory', async () => {
  const h = await harness();
  h.get('preview-mode').value = 'build';
  h.get('preview-mode').handlers.change();
  await h.click('btn-start');
  assert.equal(h.app.queue.length, 5);
  assert.ok(h.app.queue.every((c) => c.kind === 'syl'));
  h.get('preview-start').value = 'weak'; h.get('preview-start').handlers.change();
  await h.click('btn-start');
  assert.equal(h.app.queue.length, 5);
  assert.equal(h.app.queue.filter((c) => h.app.progress.cards[c.id]?.wrong).length, 2);
  assert.equal(h.app.queue.filter((c) => !h.app.progress.cards[c.id]?.introduced).length, 1);
  h.get('preview-start').value = 'new'; h.get('preview-start').handlers.change();
  await h.click('btn-start');
  assert.equal(h.app.queue.length, 0);
  assert.match(h.get('msg-text').textContent, /先認符號/);
  h.get('preview-mode').value = 'listen'; h.get('preview-mode').handlers.change();
  await h.click('btn-start');
  assert.equal(h.app.queue.length, 1);
  const glyph = h.app.queue[0].glyph;
  await h.click('btn-intro-next');
  assert.equal(h.app.progress.cards['sym:' + glyph].introduced, true);
  assert.equal(h.get('screen-break').classList.contains('hidden'), false);
  await h.click('btn-preview-reset');
  assert.deepEqual(Object.keys(h.app.progress.cards), []);
  assert.equal(h.get('screen-home').classList.contains('hidden'), false);
  assert.deepEqual(h.adapters, []);
  const reload = await harness();
  assert.ok(Object.values(reload.app.progress.cards).every((s) => s.practiced === 2 && s.correct === 2));
});

test('preview listen event: first wrong → one retry → second wrong demonstrates without third attempt or correct credit', async () => {
  const h = await harness();
  h.get('preview-mode').value = 'listen'; h.get('preview-mode').handlers.change();
  await h.click('btn-start');
  const first = h.app.queue[0];
  const wrong = h.node(); wrong.dataset.g = first.glyph === 'ㄅ' ? 'ㄇ' : 'ㄅ';
  const right = h.node(); right.dataset.g = first.glyph;
  await h.click('choices', { target: wrong }); await h.click('choices', { target: right }); h.fire(1100);
  // Complete remaining original cards through their real scoring callback; retry remains at batch tail.
  while (!h.app.queue[0].repractice) {
    const correct = h.node(); correct.dataset.g = h.app.queue[0].glyph;
    await h.click('choices', { target: correct }); h.fire(1100);
  }
  assert.equal(h.app.queue[0].id, first.id);
  await h.click('choices', { target: wrong });
  assert.match(h.get('card-area').innerHTML, /一起聽一次，下一題再試/);
  assert.ok(h.get('card-area').innerHTML.includes(first.glyph));
  h.fire(8000); h.fire(700); // recording stalls: existing audio watchdog still completes
  assert.equal(h.app.queue.length, 0);
  assert.equal(h.app.progress.cards[first.id].practiced, 4);
  assert.equal(h.app.progress.cards[first.id].correct, 2);
  assert.equal(h.app.progress.cards[first.id].wrong, true);
  assert.equal(h.get('screen-break').classList.contains('hidden'), false);
  assert.deepEqual(h.adapters, []);
});

test('formal mode retains synchronous script order, real save, sync dirty and batch-end family reward wiring', async () => {
  const h = await harness('?child=bingpu');
  assert.equal(h.writes.length, 1);
  const paths = [...h.writes[0].matchAll(/src="([^"]+)"/g)].map((m) => m[1].split('?')[0]);
  assert.deepEqual(paths, ['device-auth', 'sync-v1', 'wiring-v1', 'family-core', 'collection-core', 'collection-client', 'family-client', 'family-app'].map((s) => '../shared/' + s + '.js'));
  for (const expected of ['wiring', 'mount', 'seed', 'sync', 'anchor', 'boot', 'read', 'pageshow']) assert.ok(h.adapters.includes(expected), expected);
  await h.click('btn-start');
  assert.ok(!h.adapters.includes('finish'));
  const beforePracticed = h.app.progress.cards[h.app.queue[0].id]?.practiced || 0;
  h.run('recordScored(app.queue[0], true)');
  assert.ok(h.adapters.includes('record')); assert.ok(h.adapters.includes('write')); assert.ok(h.adapters.includes('dirty'));
  const saved = JSON.parse(h.saved());
  assert.equal(saved.cards[h.app.queue[0].id].practiced, beforePracticed + 1);
  h.run('finishBatch()'); assert.equal(h.adapters.filter((x) => x === 'finish').length, 1);
});

test('formal identity failure still blocks before progress read, seed, sync and content fetch', async () => {
  const h = await harness('?child=unknown', { blocked: true });
  assert.equal(h.app.content, null);
  assert.deepEqual(h.requests, []);
  assert.ok(!h.adapters.some((x) => ['read', 'seed', 'sync'].includes(x)));
});

test('study entry survives pack UI replacement and parent retains other preview and maintenance entry points', () => {
  const study = read('docs/study/preview.html');
  const link = study.indexOf('href="../zhuyin/?preview=1"');
  assert.ok(link > 0 && link < study.indexOf('<main id="study-preview"'));
  assert.match(study, /注音不需家庭登入/);
  const parent = read('docs/parent/parent.js');
  assert.match(parent, /href="\.\.\/zhuyin\/\?preview=1"/);
  assert.match(parent, /study\/preview\.html/);
  assert.match(parent, /nativecamp\/preview\.html/);
  assert.match(parent, /parent=1/);
});


test('changing start and mode while audio HEAD is pending uses latest selections at readiness', async () => {
  let release;
  const headGate = new Promise((resolve) => { release = resolve; });
  const h = await harness('?preview=1&child=aiden&parent=1&k=synthetic', { headGate });
  // Wait for content parsing and all HEAD starts, exactly where the former seed-before-HEAD race lived.
  for (let i = 0; i < 10 && h.requests.filter((r) => r.method === 'HEAD').length < 14; i++) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(h.requests.filter((r) => r.method === 'HEAD').length, 14);
  assert.equal(h.app.content, null);
  h.get('preview-start').value = 'new'; h.get('preview-start').handlers.change();
  h.get('preview-mode').value = 'listen'; h.get('preview-mode').handlers.change();
  await h.click('btn-preview-reset');
  release(); await h.ready;
  assert.deepEqual(Object.keys(h.app.progress.cards), []);
  assert.equal(h.app.practiceMode, 'listen');
  await h.click('btn-start');
  assert.equal(h.app.queue.length, 1);
  assert.equal(h.app.queue[0].kind, 'sym');
  assert.deepEqual(h.adapters, []);
});
