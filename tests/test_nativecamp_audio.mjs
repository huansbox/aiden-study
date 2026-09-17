import test from "node:test";
import assert from "node:assert/strict";
import "../docs/nativecamp/audio.js";
const A = globalThis.NativeCampAudio;
const tick = () => new Promise((resolve) => setImmediate(resolve));
function harness({ resolveSource = async (source) => source, effects = true } = {}) {
  const played = [], statuses = [], oscillators = [], requests = [];
  let players = 0, fail = false;
  const player = { src: "", paused: true,
    async play() { played.push(this.src); if (fail) throw Error("blocked"); this.paused = false; },
    pause() { this.paused = true; }, removeAttribute() { this.src = ""; }, load() {},
  };
  const parameter = () => ({ setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const context = { state: "running", currentTime: 0, destination: {},
    createOscillator() {
      const osc = { frequency: parameter(), stopCalls: 0, connect() {}, disconnect() {}, start() {},
        stop() { this.stopCalls++; }, end() { this.onended?.(); } };
      oscillators.push(osc); return osc;
    },
    createGain: () => ({ gain: parameter(), connect() {}, disconnect() {} }),
    close() { return Promise.resolve(); },
  };
  const audio = A.create({ makeAudio: () => { players++; return player; },
    resolveSource: (source, options) => { requests.push({ source, signal: options.signal }); return resolveSource(source, options); },
    makeContext: () => effects ? context : null, onStatus: (message) => statuses.push(message) });
  return { audio, player, played, statuses, oscillators, requests, get players() { return players; },
    fail(value) { fail = value; }, endEffect() { oscillators.at(-1).end(); } };
}

test("correct and neutral feedback finish before the complete answer starts; one voice is reused", async () => {
  const h = harness();
  await h.audio.play("question.mp3");
  for (const kind of ["correct", "neutral"]) {
    const count = h.played.length;
    const sequence = h.audio.play("answer.mp3", { effect: kind });
    assert.equal(h.player.paused, true);
    assert.equal(h.played.length, count);
    assert.equal(h.requests.length, count, "The answer waits for the feedback sound.");
    h.endEffect(); await sequence;
    assert.equal(h.played.at(-1), "answer.mp3");
    assert.equal(h.statuses.at(-1), "Playing...");
  }
  assert.equal(h.players, 1);
  h.audio.destroy();
});

test("navigation cancels queued answers and scheduled tones", async () => {
  const h = harness();
  const old = h.audio.play("old-answer.mp3", { effect: "correct" });
  h.audio.stop(); await old;
  assert.deepEqual(h.played, []);
  assert.ok(h.oscillators.every((osc) => osc.stopCalls === 2));
  const obsolete = h.audio.play("another-old-answer.mp3", { effect: "neutral" });
  await h.audio.play("new-question.mp3"); await obsolete;
  assert.deepEqual(h.played, ["new-question.mp3"]);
  h.audio.destroy();
});

test("late private audio is aborted and released without overriding a new question", async () => {
  let deliver;
  let released = 0;
  const h = harness({ resolveSource: (source) => source === "private" ? new Promise((resolve) => { deliver = resolve; }) : Promise.resolve(source) });
  const old = h.audio.play("private");
  const oldSignal = h.requests[0].signal;
  await h.audio.play("new.mp3");
  assert.equal(oldSignal.aborted, true);
  deliver({ url: "blob:old", release() { released++; } }); await old;
  assert.deepEqual(h.played, ["new.mp3"]);
  assert.equal(released, 1);
  assert.equal(h.player.paused, false);
  h.audio.destroy();
});

test("blocked playback remains retryable and each private source is released once", async () => {
  let released = 0;
  const h = harness({ resolveSource: async () => ({ url: "blob:question", release() { released++; } }) });
  h.fail(true); await h.audio.play("private");
  assert.match(h.statuses.at(-1), /^Could not/);
  assert.equal(released, 1);
  h.fail(false); h.audio.unlock(); await h.audio.play("private");
  assert.equal(h.players, 1);
  assert.equal(h.player.src, "blob:question");
  h.player.onended();
  assert.equal(released, 2);
  h.audio.destroy();
  assert.equal(released, 2);
});

test("a late play rejection cannot stop the next voice, and effects are optional", async () => {
  const h = harness({ effects: false });
  let rejectOld;
  const normalPlay = h.player.play;
  h.player.play = function () {
    if (this.src === "old.mp3") return new Promise((resolve, reject) => { rejectOld = reject; });
    return normalPlay.call(this);
  };
  const old = h.audio.play("old.mp3"); await tick();
  await h.audio.play("new.mp3", { effect: "correct" });
  rejectOld(Error("late rejection")); await old;
  assert.equal(h.player.src, "new.mp3");
  assert.equal(h.player.paused, false);
  assert.equal(h.statuses.at(-1), "Playing...");
  h.audio.destroy();
});

test("standalone Got it effect never replays a voice and is cancellable", async () => {
  const h = harness();
  const done = h.audio.playEffect("correct");
  h.endEffect(); await done;
  assert.deepEqual(h.played, []);
  const cancelled = h.audio.playEffect("correct");
  h.audio.destroy(); await cancelled;
  assert.deepEqual(h.played, []);
});
