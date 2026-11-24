import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const scriptPath = fileURLToPath(new URL('../learning-tasks/shared/taigi/practice.js', import.meta.url));
const htmlPath = fileURLToPath(new URL('../learning-tasks/shared/taigi/index.html', import.meta.url));

function makeElement(id, tag = 'div') {
  const listeners = new Map();
  const attrs = new Map();
  return {
    id,
    tagName: tag.toUpperCase(),
    textContent: '',
    hidden: false,
    disabled: false,
    open: false,
    dataset: {},
    options: [],
    selectedIndex: 0,
    add(option) { this.options.push(option); },
    replaceChildren(...items) { this.options = items; },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    dispatch(type) {
      for (const fn of listeners.get(type) || []) fn({type, target: this});
    },
    setAttribute(k, v) { attrs.set(k, String(v)); },
    getAttribute(k) { return attrs.has(k) ? attrs.get(k) : null; },
    removeAttribute(k) { attrs.delete(k); },
    getContext() {
      return {
        drawImage() {},
        clearRect() {},
      };
    },
  };
}

function makeAudio(id, readyState = 4) {
  const el = makeElement(id, 'audio');
  el.readyState = readyState;
  el.currentTime = 0;
  el.playbackRate = 1;
  el.muted = false;
  el.paused = true;
  el.ended = false;
  el.src = '';
  el.playCalls = 0;
  el.play = async () => {
    el.playCalls++;
    el.paused = false;
  };
  el.pause = () => { el.paused = true; };
  el.load = () => {};
  return el;
}

async function bootPlayer({readyState = 4, delayNextShot = 0} = {}) {
  const source = await readFile(scriptPath, 'utf8');
  const reading = {
    title: '測試篇',
    start: 4.0,
    end: 14.0,
    intro: [
      {id: 'intro-1', text: '測試篇', start: 4.0, end: 5.0, captionAt: 4.0, sceneKey: 's0',
        karaoke: [{text: '測', start: 4.0}], edges: [1920]},
    ],
    paragraphs: [
      {
        title: '第一段',
        lines: [
          {id: 'p1-01', text: '第一句', start: 5.0, end: 9.0, captionAt: 5.0, sceneKey: 's1',
            meaning: '意思一', karaoke: [{text: '第', start: 5.0}], edges: [1920]},
          {id: 'p1-02', text: '第二句', start: 9.0, end: 13.0, captionAt: 9.0, sceneKey: 's2',
            meaning: '意思二', karaoke: [{text: '第', start: 9.0}], edges: [1920]},
        ],
      },
    ],
    shots: [
      {at: 4.0, key: 's0'},
      {at: 5.0, key: 's1'},
      {at: 9.0 + delayNextShot, key: 's2'},
    ],
  };
  const assets = {
    audio: 'assets/reading.mp3',
    'caption/intro-1': 'assets/caption-01.webp',
    'caption/p1-01': 'assets/caption-02.webp',
    'caption/p1-02': 'assets/caption-03.webp',
    'art/s0': 'assets/scene-01.webp',
    'art/s1': 'assets/scene-02.webp',
    'art/s2': 'assets/scene-03.webp',
  };

  const ids = [
    'frame', 'record-panel', 'record', 'record-status', 'model', 'own',
    'paragraph', 'line', 'speed', 'status', 'previous', 'listen', 'next',
    'whole', 'all', 'hint', 'meaning', 'meaning-panel',
  ];
  const elements = new Map(ids.map(id => [id, makeElement(id)]));
  const player = makeAudio('player', readyState);
  const ownPlayer = makeAudio('own-player', 4);
  elements.set('player', player);
  elements.set('own-player', ownPlayer);
  elements.set('reading', {textContent: JSON.stringify(reading)});
  elements.set('assets', {textContent: JSON.stringify(assets)});

  const loadedImages = [];
  class FakeImage {
    set src(value) {
      this._src = value;
      loadedImages.push(value);
      queueMicrotask(() => this.onload?.());
    }
    get src() { return this._src; }
  }

  const scheduledTimers = [];
  let nextTimerId = 1;
  const windowListeners = new Map();
  const sandbox = {
    document: {
      title: '',
      getElementById: id => elements.get(id) || null,
    },
    window: {
      addEventListener(type, fn) {
        if (!windowListeners.has(type)) windowListeners.set(type, []);
        windowListeners.get(type).push(fn);
      },
    },
    navigator: {},
    HTMLMediaElement: {HAVE_METADATA: 1},
    Option: class Option { constructor(text, value) { this.text = text; this.value = value; } },
    Image: FakeImage,
    URL: {createObjectURL: () => 'blob:fake', revokeObjectURL() {}},
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
    setTimeout(fn, ms) {
      const id = nextTimerId++;
      scheduledTimers.push({id, fn, ms, cleared: false});
      return id;
    },
    clearTimeout(id) {
      const item = scheduledTimers.find(t => t.id === id);
      if (item) item.cleared = true;
    },
    Promise,
    JSON,
    Map,
    Math,
    Object,
    String,
    Boolean,
    Error,
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox, {filename: 'practice.js'});
  return {elements, player, ownPlayer, loadedImages, scheduledTimers};
}

test('共用播放器模板包含語速切換按鈕且位於控制區內', async () => {
  const html = await readFile(htmlPath, 'utf8');
  assert.match(html, /<button id="speed"[^>]*aria-pressed="false"[^>]*>語速：原速<\/button>/);
});

test('選句時自動預載下一句字幕與漫畫圖（含延後切換的 sceneKey）', async () => {
  const {loadedImages} = await bootPlayer({delayNextShot: 0.4});
  assert.ok(loadedImages.includes('assets/caption-02.webp'));
  assert.ok(loadedImages.includes('assets/scene-02.webp'));
  assert.ok(loadedImages.includes('assets/caption-03.webp'));
  assert.ok(loadedImages.includes('assets/scene-03.webp'));
});

test('切換慢速 0.85x 會更新播放速度、按鈕狀態並依語速調整結束計時', async () => {
  const {elements, player, scheduledTimers} = await bootPlayer();
  const speed = elements.get('speed');
  const listen = elements.get('listen');

  assert.equal(player.playbackRate, 1);
  assert.equal(speed.getAttribute('aria-pressed'), 'false');

  listen.dispatch('click');
  await new Promise(r => setImmediate(r));
  const normalDelay = scheduledTimers.at(-1).ms;
  assert.equal(normalDelay, 4000);

  speed.dispatch('click');
  assert.equal(player.playbackRate, 0.85);
  assert.equal(speed.getAttribute('aria-pressed'), 'true');
  assert.match(speed.textContent, /0\.85x/);
  const slowDelay = scheduledTimers.at(-1).ms;
  assert.ok(Math.abs(slowDelay - (4000 / 0.85)) < 1, `expected ~4706ms, got ${slowDelay}`);

  speed.dispatch('click');
  assert.equal(player.playbackRate, 1);
  assert.equal(speed.getAttribute('aria-pressed'), 'false');
});

test('首次載入尚未取得 metadata 時會先靜音，待 loadedmetadata 跳轉後再解除靜音；中途停止亦會解除靜音', async () => {
  const {elements, player} = await bootPlayer({readyState: 0});
  const listen = elements.get('listen');

  listen.dispatch('click');
  await new Promise(r => setImmediate(r));
  assert.equal(player.muted, true);
  assert.equal(player.currentTime, 0);

  player.readyState = 1;
  player.dispatch('loadedmetadata');
  assert.equal(player.currentTime, 5.0);
  assert.equal(player.muted, false);

  // 驗證若在 loadedmetadata 之前就按停止，也不會卡在靜音狀態
  const second = await bootPlayer({readyState: 0});
  second.elements.get('listen').dispatch('click');
  await new Promise(r => setImmediate(r));
  assert.equal(second.player.muted, true);
  second.elements.get('listen').dispatch('click');
  assert.equal(second.player.muted, false);
});
