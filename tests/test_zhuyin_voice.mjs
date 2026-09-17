import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../docs/zhuyin/index.html", import.meta.url), "utf8");
const source = html.match(/\/\/ <zhuyin-voice-player>([\s\S]*?)\/\/ <\/zhuyin-voice-player>/)[1];
const createPlayer = new Function(source + "\nreturn createZhuyinVoicePlayer;")();

function harness(available = ["b", "a", "ba4"]) {
  const events = new Map(), timers = new Map(), cues = [], failures = [], played = [];
  let sequence = 0, done = 0, now = 0;
  const emit = (name) => events.get(name)?.();
  const audio = {
    src: "", currentSrc: "", paused: true, ended: false, error: null, readyState: 0,
    addEventListener: (name, fn) => events.set(name, fn),
    pause() { this.paused = true; emit("pause"); },
    play() {
      this.paused = false; this.ended = false; this.error = null;
      played.push(this.src);
      return { catch: (reject) => failures.push(reject) };
    },
  };
  const player = createPlayer(audio, {
    urlFor: (key) => "https://example.test/" + key,
    hasAudio: (key) => available.includes(key),
    delay: (fn, ms) => { timers.set(++sequence, { fn, at: now + ms }); return sequence; },
    cancelDelay: (id) => timers.delete(id),
  });
  function advance(ms) {
    const until = now + ms;
    while (true) {
      const entry = [...timers].sort((a, b) => a[1].at - b[1].at).find(([, t]) => t.at <= until);
      if (!entry) break;
      const [id, t] = entry;
      timers.delete(id); now = t.at; t.fn();
    }
    now = until;
  }
  return {
    audio, player, cues, played, failures, advance, emit,
    start: (keys) => player.play(keys, { onCue: (key) => cues.push(key), onDone: () => done++ }),
    playing: () => { audio.currentSrc = audio.src; audio.readyState = 4; audio.paused = false; emit("playing"); },
    end: () => { audio.ended = true; emit("ended"); },
    done: () => done,
  };
}

test("ㄅ→ㄚ→ㄅㄚˋ只隨真正播放亮起；載入中不提早亮，播完才結束", () => {
  const h = harness();
  h.start(["b", "a", "ba4"]);
  h.advance(1200); // 模擬網路等待，不能拿固定延遲當播放時間
  assert.deepEqual(h.cues.filter(Boolean), []);
  for (const key of ["b", "a", "ba4"]) {
    h.playing();
    assert.equal(h.cues.at(-1), key);
    h.end();
    assert.equal(h.cues.at(-1), null);
    if (key !== "ba4") {
      assert.equal(h.done(), 0);
      h.advance(350);
    }
  }
  assert.equal(h.done(), 1);
  assert.deepEqual(h.cues.filter(Boolean), ["b", "a", "ba4"]);
});

test("緩衝與暫停收起提示，恢復播放才再次亮起", () => {
  const h = harness();
  h.start(["ba4"]); h.playing();
  h.audio.readyState = 2; h.emit("waiting");
  assert.equal(h.cues.at(-1), null);
  h.playing(); assert.equal(h.cues.at(-1), "ba4");
  h.audio.pause(); assert.equal(h.cues.at(-1), null);
  assert.equal(h.done(), 0);
});

test("快速重聽或換卡：舊拒播、ended 與片段間定時器都不能污染新播放", () => {
  const h = harness();
  h.start(["b", "a"]); h.playing();
  h.start(["ba4"]);
  h.failures[0](); h.emit("ended"); h.emit("playing");
  assert.equal(h.done(), 0);
  assert.equal(h.cues.at(-1), null, "舊 src 的 playing 不能亮新符號");
  h.playing(); assert.equal(h.cues.at(-1), "ba4");
  h.player.stop(); h.advance(10000);
  assert.equal(h.audio.paused, true);
  assert.equal(h.done(), 0, "離開題目不能觸發原題的自動換題");
  assert.equal(h.played.length, 2);
  h.start(["b", "a"]); h.end();
  h.player.stop(); h.advance(350);
  assert.equal(h.played.length, 3, "停止後不能播出佇列下一段");
});

test("缺檔、拒播、解碼錯誤與卡住都能結束；不留下亮起的符號或重複換題", () => {
  const missing = harness([]);
  missing.start(["b"]);
  assert.equal(missing.done(), 1);
  assert.deepEqual(missing.played, []);
  for (const failure of ["reject", "error", "timeout"]) {
    const h = harness();
    h.start(["ba4"]);
    if (failure === "reject") h.failures[0]();
    else if (failure === "error") { h.audio.error = {}; h.emit("error"); }
    else h.advance(8000);
    h.end(); h.advance(10000);
    assert.equal(h.done(), 1, failure);
    assert.equal(h.cues.at(-1), null, failure);
    assert.equal(h.audio.paused, true, failure);
  }
});

test("視覺提示對應正在播的聲符、韻符、聲調；空格不揭答案、一聲維持留白", () => {
  const nodes = [];
  function element(textContent = "") {
    const classes = new Set();
    const el = { textContent, isConnected: true, classes, classList: {
      add: (...names) => names.forEach((n) => classes.add(n)),
      remove: (...names) => names.forEach((n) => classes.delete(n)),
    } };
    nodes.push(el);
    return el;
  }
  function syllable(onset, rime, tone) {
    const root = element(), parts = { onset: element(onset), rime: element(rime), tone: element(tone) };
    root.querySelector = (selector) => parts[selector.match(/="(\w+)"/)[1]];
    return { root, parts };
  }
  const document = { querySelectorAll: () => nodes };
  const app = { symbolAudio: { "ㄅ": "b", "ㄚ": "a" } };
  const cueSource = html.slice(html.indexOf("function setVoiceFocus("), html.indexOf("function renderTeaching("));
  const makeCue = new Function("document", "app", cueSource + "\nreturn syllableCue;")(document, app);
  const y = { onset: "ㄅ", rime: "ㄚ", tone: 4, audio: "ba4" };
  const demo = syllable("ㄅ", "ㄚ", "ˋ"), cue = makeCue(demo.root, y);
  const focused = () => nodes.filter((el) => el.classes.has("voice-focus")).map((el) => el.textContent);
  cue("b"); assert.deepEqual(focused(), ["ㄅ"]);
  cue("a"); assert.deepEqual(focused(), ["ㄚ"]);
  cue("ba4"); assert.deepEqual(focused(), ["ˋ"]);
  cue(null); assert.deepEqual(focused(), []);
  const blank = syllable("", "", "");
  makeCue(blank.root, y)("ba4"); assert.deepEqual(focused(), []);
  assert.equal(blank.parts.tone.textContent, "");
  const first = syllable("ㄅ", "ㄚ", "");
  makeCue(first.root, { ...y, tone: 1, audio: "ba1" })("ba1");
  assert.deepEqual(focused(), ["ㄅ", "ㄚ"]);
  assert.equal(first.parts.tone.textContent, "");
  const selected = syllable("ㄅ", "ㄚ", "ˊ");
  makeCue(selected.root, { ...y, tone: 2, audio: "ba2" })("ba2");
  assert.deepEqual(focused(), ["ˊ"]);
  assert.equal(demo.parts.tone.classes.has("voice-focus"), false, "播放選項不亮其他答案");
  demo.root.isConnected = false;
  cue("ba4"); assert.deepEqual(focused(), [], "換卡後不操作舊符號");
});
