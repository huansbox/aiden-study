// #167：以實際事件處理與播放 adapter 驗證有限重練，不碰正式進度或雲端。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../docs/zhuyin/index.html', import.meta.url), 'utf8');
const core = html.match(/\/\/ <zhuyin-core-pure>([\s\S]*?)\/\/ <\/zhuyin-core-pure>/)[1];
const playerSource = html.match(/\/\/ <zhuyin-voice-player>([\s\S]*?)\/\/ <\/zhuyin-voice-player>/)[1];
const section = (start, end) => html.slice(html.indexOf(start), html.indexOf(end));
const handlers = [
  section('function clearTimers()', 'function startBatch()'),
  section('function syllableHtml(', 'function setVoiceFocus('),
  section('function renderQuiz(', '// 真實詞卡：'),
  section('function advanceCard(', '// 批間畫面：'),
].join('\n');
const syl = { onset: 'ㄅ', rime: 'ㄚ', tone: 4, audio: 'syl-ba4' };
const symbols = { 'ㄅ': 'sym-b', 'ㄇ': 'sym-m', 'ㄚ': 'sym-a' };
const state = () => ({ introduced: true, wrong: false, practiced: 0, correct: 0 });
const cardFor = (kind) => kind === 'sym'
  ? { id: 'sym:ㄅ', kind, glyph: 'ㄅ', promptKey: 'sym-b', repractice: true }
  : { id: 'syl:ㄅㄚ4', kind, syl, promptKey: syl.audio, repractice: true };

function harness(card = cardFor('syl')) {
  const records = [], timers = new Map(), events = new Map(), failures = [], played = [];
  let timerId = 0, finished = 0, saves = 0;
  function node() {
    const classes = new Set();
    const el = { innerHTML: '', textContent: '', isConnected: true, handlers: {}, dataset: {},
      addEventListener(name, cb) { this.handlers[name] = cb; },
      querySelector: () => node(),
      classList: { add: (...names) => names.forEach((n) => classes.add(n)), contains: (n) => classes.has(n) },
    };
    return el;
  }
  const nodes = new Map();
  const document = { getElementById: (id) => {
    if (!nodes.has(id)) nodes.set(id, node());
    return nodes.get(id);
  }, querySelectorAll: () => [] };
  const app = { queue: [card], batchSize: 1, doneCount: 1, retryDone: 0, resultRecorded: false,
    answered: false, firstTap: true, wrongThisBatch: new Set(), progress: { schemaVersion: 1, cards: {
      [card.id]: state(), ...Object.fromEntries(Object.keys(symbols).map((g) => ['sym:' + g, state()])),
    } }, symbolAudio: symbols, entryOrder: Object.keys(symbols), syllables: [syl],
    hasAudio: new Set([...Object.values(symbols), syl.audio]), previousBuildChoices: new Map(),
    buildState: { phase: 'onset', hadWrong: false }, stepLock: false,
  };
  const audio = { src: '', paused: true, ended: false,
    addEventListener: (name, cb) => events.set(name, cb),
    pause() { this.paused = true; events.get('pause')?.(); },
    play() { this.paused = false; this.ended = false; played.push(this.src);
      return { catch: (cb) => failures.push(cb) }; },
  };
  const setTimeout = (fn, ms) => { timers.set(++timerId, { fn, ms }); return timerId; };
  const clearTimeout = (id) => timers.delete(id);
  const createPlayer = new Function(playerSource + '\nreturn createZhuyinVoicePlayer;')();
  const player = createPlayer(audio, { urlFor: (key) => key, hasAudio: (key) => app.hasAudio.has(key),
    delay: setTimeout, cancelDelay: clearTimeout });
  const deps = { app, document, family: { record: (result) => records.push(result) },
    setTimeout, clearTimeout, performance: { now: () => 10000 }, TAP_GUARD_MS: 400,
    TONE_MARK: { 1: '', 2: 'ˊ', 3: 'ˇ', 4: 'ˋ' },
    stopChain: () => player.stop(), playSound: () => {},
    playChain: (keys, opts) => player.play(keys, opts), playVoice: (key, opts) => player.play([key], opts),
    syllableCue: () => () => {}, setVoiceFocus: () => {}, tapGuarded: () => false,
    saveProgress: () => saves++,
    renderWordCard: () => { throw new Error('錯誤示範不應進真實詞卡'); },
    renderCard: () => { app.resultRecorded = false; app.answered = false; },
    finishBatch: () => { finished++; player.stop(); },
  };
  const api = new Function('deps', `const { ${Object.keys(deps).join(', ')} } = deps;\n` + core + handlers +
    '\nreturn { demonstrateCorrection, recordScored, completeScored, clearTimers, renderDots, renderQuiz, renderBuild, renderBuildStep, onBuildPick, onTonePick };')(deps);
  function drain() {
    let steps = 0;
    while (timers.size && steps++ < 50) {
      const [id, t] = [...timers].sort((a, b) => a[1].ms - b[1].ms)[0];
      timers.delete(id); t.fn();
    }
    assert.ok(steps < 50, '流程必須有限結束');
  }
  return { api, app, card, document, records, timers, failures, played, drain, node,
    finished: () => finished, saves: () => saves };
}

for (const phase of ['onset', 'rime', 'tone']) {
  test(`重練 ${phase} 答錯：完整示範、單次存檔和錯誤結果；拒播仍結束`, () => {
    const h = harness();
    h.app.buildState.phase = phase;
    const choice = h.node();
    if (phase === 'tone') {
      choice.dataset = { tone: '2', k: '' }; // 缺音錯誤選項也直接示範正解
      h.api.onTonePick(h.card, choice);
    } else {
      choice.dataset.g = 'ㄇ';
      h.api.onBuildPick(h.card, phase === 'onset' ? 'ㄅ' : 'ㄚ', choice);
    }
    assert.equal(h.app.answered, true);
    assert.deepEqual(h.records, [{ mode: 'build', answered: true, correct: false }]);
    assert.equal(h.saves(), 1);
    const display = h.document.getElementById('card-area').innerHTML;
    for (const symbol of ['ㄅ', 'ㄚ', 'ˋ']) assert.ok(display.includes(symbol));
    assert.ok(!display.includes('btn-intro-next'), '示範不要求第三次作答');
    h.api.demonstrateCorrection(h.card); // 殘留事件不能取消示範或重複記錄
    for (let i = 0; i < 3; i++) {
      h.failures[i]();
      if (i < 2) {
        const gap = [...h.timers].find(([, t]) => t.ms === 350);
        h.timers.delete(gap[0]); gap[1].fn();
      }
    }
    h.drain();
    assert.deepEqual(h.played, ['sym-b', 'sym-a', 'syl-ba4']);
    assert.equal(h.finished(), 1);
    assert.equal(h.app.queue.length, 0);
    assert.equal(h.app.progress.cards[h.card.id].practiced, 1);
    assert.equal(h.app.progress.cards[h.card.id].correct, 0);
    assert.equal(h.app.progress.cards[h.card.id].wrong, true);
    assert.equal(h.records.length, 1);
  });
}

test('重練聽音辨認答錯：事件入口直接示範正確符號，卡住時仍完成', () => {
  const h = harness(cardFor('sym'));
  h.api.renderQuiz(h.card, Object.keys(symbols));
  const wrong = h.node(); wrong.dataset.g = 'ㄇ';
  const click = () => h.document.getElementById('choices').handlers.click({ target: { closest: () => wrong } });
  click(); click();
  assert.ok(h.document.getElementById('card-area').innerHTML.includes('correction-card">ㄅ'));
  h.drain(); // 既有 watchdog 結束卡住的播放，然後換題
  assert.equal(h.finished(), 1);
  assert.deepEqual(h.records, [{ mode: 'listen', answered: true, correct: false }]);
});

test('示範時換卡會取消播放／換題 callback；舊題結果不能寫進新題', () => {
  const h = harness();
  h.api.demonstrateCorrection(h.card);
  h.api.clearTimers();
  const next = cardFor('sym'); h.app.queue = [next]; h.app.resultRecorded = false;
  h.failures[0](); h.drain();
  assert.equal(h.finished(), 0);
  assert.deepEqual(h.app.queue, [next]);
  assert.equal(h.api.recordScored(h.card, true), false);
  assert.equal(h.records.length, 1);
});

test('原批進度維持固定 dots，重練另列且不倒退或增加原題數', () => {
  const h = harness();
  h.app.batchSize = 3; h.app.doneCount = 2;
  h.app.queue = [cardFor('sym'), { ...h.card, repractice: false }];
  h.api.renderDots();
  assert.equal((h.document.getElementById('dots').innerHTML.match(/class="dot/g) || []).length, 3);
  h.app.doneCount = 3; h.app.queue = [h.card, cardFor('sym')];
  h.api.renderDots();
  assert.equal(h.document.getElementById('batch-progress').textContent, '原本 3 題已完成 · 再練一次 1 / 2');
  h.app.retryDone = 1; h.app.queue.shift(); h.api.renderDots();
  assert.equal(h.document.getElementById('batch-progress').textContent, '原本 3 題已完成 · 再練一次 2 / 2');
  assert.equal((h.document.getElementById('dots').innerHTML.match(/class="dot on/g) || []).length, 3);
});

test('組字聲韻步取同一排列，重播與首次錯誤不重抽，下次出題重抽', () => {
  const h = harness({ ...cardFor('syl'), repractice: false });
  h.api.renderBuild(h.card);
  const first = h.document.getElementById('build-area').innerHTML;
  h.document.getElementById('btn-replay').handlers.click();
  h.document.getElementById('btn-slow').handlers.click();
  const wrong = h.node(); wrong.dataset.g = 'ㄇ';
  h.api.onBuildPick(h.card, 'ㄅ', wrong);
  assert.equal(h.document.getElementById('build-area').innerHTML, first);
  h.app.buildState.phase = 'rime'; h.api.renderBuildStep(h.card);
  assert.equal(h.document.getElementById('build-area').innerHTML, first);
  const previous = [...h.app.buildChoices];
  h.api.renderBuild(h.card);
  assert.notDeepEqual(h.app.buildChoices, previous);
});
