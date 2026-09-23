import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../docs/shared/brick-audio.js", import.meta.url), "utf8");
const tick = () => new Promise((resolve) => setImmediate(resolve));

function harness({ webkit = false } = {}) {
  const contexts = [];
  let milliseconds = 0;
  class Param {
    events = [];
    setValueAtTime(value, at) { this.events.push(["set", value, at]); }
    linearRampToValueAtTime(value, at) { this.events.push(["linear", value, at]); }
    exponentialRampToValueAtTime(value, at) { this.events.push(["exponential", value, at]); }
    cancelScheduledValues(at) { this.events.push(["cancel", at]); }
  }
  class Oscillator {
    frequency = new Param();
    starts = [];
    stops = [];
    disconnected = 0;
    listeners = new Map();
    connect(node) { return node; }
    disconnect() { this.disconnected++; }
    addEventListener(name, handler) { this.listeners.set(name, handler); }
    start(at) { this.starts.push(at); }
    stop(at) { this.stops.push(at); }
    end() { this.listeners.get("ended")?.(); }
  }
  class Gain {
    gain = new Param();
    disconnected = 0;
    connect(node) { return node; }
    disconnect() { this.disconnected++; }
  }
  class AudioContext {
    state = "suspended";
    currentTime = 10;
    destination = {};
    oscillators = [];
    gains = [];
    resumeCalls = 0;
    closeCalls = 0;
    pending = [];
    constructor() { contexts.push(this); }
    createOscillator() { const oscillator = new Oscillator(); this.oscillators.push(oscillator); return oscillator; }
    createGain() { const gain = new Gain(); this.gains.push(gain); return gain; }
    resume() {
      this.resumeCalls++;
      return new Promise((resolve, reject) => this.pending.push({ resolve, reject }));
    }
    resolveResume() { this.state = "running"; this.pending.shift().resolve(); }
    rejectResume() { this.pending.shift().reject(Error("audio blocked")); }
    close() { this.closeCalls++; this.state = "closed"; return Promise.resolve(); }
  }
  const window = { performance: { now: () => milliseconds } };
  window[webkit ? "webkitAudioContext" : "AudioContext"] = AudioContext;
  vm.runInNewContext(source, { window });
  return {
    audio: window.KidsBrickAudio.create(), contexts,
    advance(seconds) { milliseconds += seconds * 1000; },
  };
}

test("one reusable context plays a short quiet placement sound and releases ended nodes", async () => {
  const h = harness({ webkit: true });
  const ready = h.audio.unlock();
  assert.equal(h.contexts.length, 1);
  h.contexts[0].resolveResume();
  assert.equal(await ready, true);
  h.audio.place();
  const context = h.contexts[0], first = context.oscillators[0];
  assert.ok(Math.abs(first.stops[0] - first.starts[0] - 0.11) < 0.001);
  assert.ok(context.gains[0].gain.events.some(([kind, value]) => kind === "linear" && value === 0.045));
  first.end();
  assert.equal(first.disconnected, 1);
  assert.equal(context.gains[0].disconnected, 1);
  h.audio.place();
  assert.equal(h.contexts.length, 1);
  assert.equal(context.oscillators.length, 2);
  assert.equal(context.resumeCalls, 1);
  h.audio.destroy();
  assert.equal(context.closeCalls, 1);
});

test("celebration skips earlier notes when resumed mid-animation and replay cancels prior notes", async () => {
  const h = harness();
  const ready = h.audio.unlock();
  const context = h.contexts[0];
  context.resolveResume();
  await ready;
  h.audio.celebrate(3);
  assert.equal(context.oscillators.length, 2, "only the two late accents remain after three seconds");
  assert.ok(Math.abs(context.oscillators[0].starts[0] - 10.15) < 0.001);
  assert.ok(Math.abs(context.oscillators[1].starts[0] - 11.5) < 0.001);
  h.audio.celebrate(0);
  assert.equal(context.oscillators[0].disconnected, 1);
  assert.equal(context.oscillators[1].disconnected, 1);
  assert.equal(context.oscillators.length, 14);
  assert.ok(context.gains.every((gain) => gain.gain.events.filter(([kind]) => kind === "linear").every(([, volume]) => volume <= 0.03)));
  h.audio.stop();
  assert.ok(context.oscillators.every((oscillator) => oscillator.disconnected === 1));
  h.audio.destroy();
});

test("mute and stop cancel both sounding and future notes; unmuting does not restart a tune", async () => {
  const h = harness();
  const ready = h.audio.unlock();
  const context = h.contexts[0];
  context.resolveResume();
  await ready;
  h.audio.celebrate();
  const count = context.oscillators.length;
  h.audio.setEnabled(false);
  assert.ok(context.oscillators.every((oscillator) => oscillator.disconnected === 1));
  assert.ok(context.gains.every((gain) => gain.gain.events.some(([kind]) => kind === "cancel")));
  h.audio.place();
  h.audio.celebrate();
  assert.equal(context.oscillators.length, count);
  h.audio.setEnabled(true);
  assert.equal(context.oscillators.length, count);
  h.audio.celebrate(4.4);
  assert.equal(context.oscillators.length, count + 1);
  h.audio.destroy();
});

test("a muted sound-toggle gesture may unlock before enabling playback", async () => {
  const h = harness();
  h.audio.setEnabled(false);
  const ready = h.audio.unlock();
  const context = h.contexts[0];
  h.audio.setEnabled(true);
  context.resolveResume();
  assert.equal(await ready, true);
  h.audio.celebrate(3);
  assert.equal(context.oscillators.length, 2);
  h.audio.destroy();
});

test("a slow resume skips notes that have already passed in the animation", async () => {
  const h = harness();
  const ready = h.audio.unlock();
  h.audio.celebrate();
  h.advance(3);
  const context = h.contexts[0];
  context.resolveResume();
  await ready;
  await tick();
  assert.equal(context.oscillators.length, 2);
  h.audio.destroy();
});

test("a tiny scheduling delay preserves the opening note instead of dropping it", async () => {
  const h = harness();
  const ready = h.audio.unlock();
  h.audio.celebrate();
  h.advance(0.001);
  h.contexts[0].resolveResume();
  await ready;
  await tick();
  assert.equal(h.contexts[0].oscillators.length, 12);
  assert.equal(h.contexts[0].oscillators[0].frequency.events[0][1], 392);
  h.audio.destroy();
});

test("a later activating gesture retries resume while the earlier touch-down attempt is pending", async () => {
  const h = harness();
  const pointerDown = h.audio.unlock();
  const context = h.contexts[0];
  const click = h.audio.unlock();
  assert.equal(context.resumeCalls, 2, "click must retry a touch-down resume that has not been allowed yet");
  h.audio.celebrate();
  context.resolveResume();
  await pointerDown;
  assert.equal(context.oscillators.length, 0, "playback is waiting for the latest resume attempt");
  context.resolveResume();
  await click;
  await tick();
  assert.equal(context.oscillators.length, 12);
  assert.equal(h.contexts.length, 1);
  h.audio.destroy();
});

test("late resume cannot play after stop, mute, or destroy; rejected resume stays silent", async () => {
  for (const cancel of ["stop", "mute", "destroy", "reject"]) {
    const h = harness();
    const ready = h.audio.unlock();
    const context = h.contexts[0];
    h.audio.celebrate();
    if (cancel === "stop") h.audio.stop();
    if (cancel === "mute") h.audio.setEnabled(false);
    if (cancel === "destroy") h.audio.destroy();
    if (cancel === "reject") context.rejectResume();
    else context.resolveResume();
    await ready;
    await tick();
    assert.equal(context.oscillators.length, 0, `${cancel} must suppress deferred notes`);
    if (cancel === "destroy") assert.equal(context.closeCalls, 1);
    h.audio.destroy();
  }
});

test("no WebAudio support is a harmless silent no-op", async () => {
  const window = {};
  vm.runInNewContext(source, { window });
  const audio = window.KidsBrickAudio.create();
  assert.equal(await audio.unlock(), false);
  audio.place();
  audio.celebrate();
  audio.setEnabled(false);
  audio.stop();
  audio.destroy();
});
