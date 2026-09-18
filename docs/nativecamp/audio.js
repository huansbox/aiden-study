/* One cancellable voice/effect sequence for practice and parent preview. */
(function (global) {
  "use strict";
  // Same short feedback patterns used by study and zhuyin.
  const patterns = {
    correct: [[0, 523.25, .11, "triangle", .22], [.09, 659.25, .13, "triangle", .22], [.18, 783.99, .15, "triangle", .18]],
    neutral: [[0, 246.94, .08, "sine", .20], [.10, 196, .14, "sine", .18]],
  };
  const silent = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
  // Existing lesson paths stay stable while replacement OpenAI recordings bypass old browser/CDN caches.
  const recordingVersion = "20260918-openai";
  function create({ makeAudio = () => new Audio(), resolveSource = async (source) => source,
    onStatus = () => {}, makeContext = () => {
      const Constructor = global.AudioContext || global.webkitAudioContext;
      return Constructor ? new Constructor() : null;
    } } = {}) {
    let player = null, context = null, epoch = 0, destroyed = false, unlocked = false;
    let pending = null, releaseSource = null, finishEffect = null;
    const voice = () => player || (player = makeAudio());
    function soundContext() {
      if (!context) context = makeContext();
      if (context?.state === "suspended") context.resume()?.catch?.(() => {});
      return context;
    }
    function stop() {
      epoch++;
      pending?.abort(); pending = null;
      finishEffect?.(false);
      if (player) {
        player.onended = null; player.onerror = null;
        player.pause(); player.removeAttribute?.("src"); player.load?.();
      }
      releaseSource?.(); releaseSource = null;
      onStatus("");
    }
    // Call directly in the user's click, before authentication or saving awaits.
    function unlock() {
      if (destroyed) return;
      try { soundContext(); } catch { /* Feedback effects are optional. */ }
      if (unlocked) return;
      // Do not replace an already playing question with the silent unlock clip.
      if (player && !player.paused) { unlocked = true; return; }
      try {
        const audio = voice(); audio.src = silent;
        unlocked = true;
        const result = audio.play();
        result?.catch?.(() => { unlocked = false; });
      } catch { unlocked = false; }
    }
    function effect(kind, sequence) {
      return new Promise((resolve) => {
        const nodes = [];
        let timer = null, settled = false;
        const finish = (completed) => {
          if (settled) return;
          settled = true; clearTimeout(timer);
          for (const [oscillator, gain] of nodes) {
            oscillator.onended = null;
            try { oscillator.stop(); } catch { /* Already ended. */ }
            oscillator.disconnect(); gain.disconnect();
          }
          if (finishEffect === finish) finishEffect = null;
          resolve(completed);
        };
        finishEffect = finish;
        try {
          const ctx = soundContext(), notes = patterns[kind];
          if (!ctx || !notes || destroyed || sequence !== epoch) { finish(sequence === epoch && !destroyed); return; }
          const start = ctx.currentTime + .01;
          let end = 0;
          for (const [offset, frequency, duration, type, volume] of notes) {
            const osc = ctx.createOscillator(), gain = ctx.createGain();
            nodes.push([osc, gain]);
            osc.type = type; osc.frequency.setValueAtTime(frequency, start + offset);
            gain.gain.setValueAtTime(.0001, start + offset);
            gain.gain.exponentialRampToValueAtTime(volume, start + offset + .018);
            gain.gain.exponentialRampToValueAtTime(.0001, start + offset + duration);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(start + offset); osc.stop(start + offset + duration + .03);
            end = Math.max(end, offset + duration + .03);
          }
          nodes[nodes.length - 1][0].onended = () => finish(true);
          // A suspended or failed Web Audio context must never hold up the answer.
          timer = setTimeout(() => finish(true), (end + .09) * 1000);
        } catch { finish(true); }
      });
    }
    async function play(source, { effect: feedback } = {}) {
      if (destroyed) return;
      stop();
      const sequence = epoch, controller = new AbortController(); pending = controller;
      const current = () => !destroyed && sequence === epoch;
      try {
        if (feedback && !await effect(feedback, sequence)) return;
        if (!current()) return;
        onStatus("Loading sound...");
        const resolved = await resolveSource(source, { signal: controller.signal });
        const resource = typeof resolved === "string" ? { url: resolved } : resolved;
        if (!current()) { resource.release?.(); return; }
        pending = null; releaseSource = resource.release || null;
        const audio = voice(); audio.src = /^audio\/[a-zA-Z0-9/_-]+\.mp3$/.test(resource.url) ? `${resource.url}?v=${recordingVersion}` : resource.url;
        const failed = () => {
          if (!current()) return;
          unlocked = false; stop(); onStatus("Could not play this sound. Tap Listen to try again.");
        };
        audio.onerror = failed;
        audio.onended = () => { if (current()) { stop(); } };
        await audio.play();
        if (current()) { unlocked = true; onStatus("Playing..."); }
      } catch {
        if (current()) { unlocked = false; stop(); onStatus("Could not play this sound. Tap Listen to try again."); }
      }
    }
    async function playEffect(kind) {
      if (destroyed) return;
      stop();
      await effect(kind, epoch);
    }
    return { unlock, play, playEffect, stop, destroy() {
      if (destroyed) return;
      stop(); destroyed = true;
      try { context?.close()?.catch?.(() => {}); } catch { /* Nothing remains to play. */ }
    } };
  }
  global.NativeCampAudio = { create };
})(globalThis);
