(function (root) {
  "use strict";

  // The tune finishes early in the six-second train animation; the last two
  // quiet notes leave room for the train to arrive without constant sound.
  const fanfare = [
    [0, 392, 0.23, 0.024], [0.16, 440, 0.22, 0.025],
    [0.32, 523.25, 0.24, 0.027], [0.51, 587.33, 0.25, 0.027],
    [0.72, 659.25, 0.28, 0.029], [0.98, 783.99, 0.35, 0.03],
    [1.28, 523.25, 0.62, 0.012], [1.28, 659.25, 0.62, 0.012],
    [1.28, 783.99, 0.62, 0.012],
    [2.55, 783.99, 0.2, 0.012], [3.15, 659.25, 0.22, 0.011],
    [4.5, 1046.5, 0.2, 0.009],
  ];

  function create() {
    let context = null;
    let pendingResume = null;
    let enabled = true;
    let destroyed = false;
    let generation = 0;
    const voices = new Set();
    const wallTime = () => (root.performance?.now?.() ?? Date.now()) / 1000;

    function tone(frequency, start, duration, volume, endFrequency) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const envelope = gain.gain;
      const finish = start + duration;
      const voice = {
        cancel() {
          try {
            envelope.cancelScheduledValues(context.currentTime);
            envelope.setValueAtTime(0, context.currentTime);
            oscillator.stop(context.currentTime);
          } catch {}
          cleanup();
        },
      };
      function cleanup() {
        if (!voices.delete(voice)) return;
        oscillator.disconnect();
        gain.disconnect();
      }
      voices.add(voice);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration * 0.7);
      envelope.setValueAtTime(0.0001, start);
      envelope.linearRampToValueAtTime(volume, start + Math.min(0.025, duration / 3));
      envelope.exponentialRampToValueAtTime(0.0001, finish);
      oscillator.connect(gain).connect(context.destination);
      oscillator.addEventListener("ended", cleanup, { once: true });
      oscillator.start(start);
      oscillator.stop(finish + 0.01);
    }

    function stop() {
      generation += 1;
      for (const voice of [...voices]) voice.cancel();
    }

    function unlock() {
      if (destroyed) return Promise.resolve(false);
      try {
        if (!context) {
          const Audio = root.AudioContext || root.webkitAudioContext;
          if (!Audio) return Promise.resolve(false);
          context = new Audio();
        }
        if (context.state === "running") return Promise.resolve(true);
        // A touch pointerdown can leave resume pending before user activation.
        // Retry on the later pointerup/click gesture instead of reusing that wait.
        const activeContext = context;
        const result = activeContext.resume(); // Called only by the real user-input handler.
        const attempt = Promise.resolve(result)
          .then(() => !destroyed && context === activeContext && activeContext.state === "running", () => false)
          .finally(() => { if (pendingResume === attempt) pendingResume = null; });
        pendingResume = attempt;
        return attempt;
      } catch {
        return Promise.resolve(false);
      }
    }

    function play(schedule) {
      if (!enabled || destroyed || !context) return;
      const token = generation;
      const invokedAt = wallTime();
      const activeContext = context;
      const ready = () => {
        if (token !== generation || !enabled || destroyed || context !== activeContext || activeContext.state !== "running") return;
        try { schedule(activeContext.currentTime, Math.max(0, wallTime() - invokedAt)); } catch {}
      };
      if (activeContext.state === "running") ready();
      else if (pendingResume) pendingResume.then(ready);
    }

    function place() {
      stop();
      play((now, delay) => {
        if (delay > 0.15) return; // A late unlock must not play a stale tap.
        tone(480, now, 0.1, 0.045, 720);
      });
    }

    function celebrate(elapsedSeconds = 0) {
      stop();
      const elapsed = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
      play((now, delay) => {
        const position = elapsed + delay;
        for (const [at, frequency, duration, volume] of fanfare) {
          const remaining = duration - Math.max(0, position - at);
          if (remaining > 0) tone(frequency, now + Math.max(0, at - position), remaining, volume);
        }
      });
    }

    function setEnabled(value) {
      enabled = !!value;
      if (!enabled) stop();
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      const oldContext = context;
      context = null;
      try { oldContext?.close?.()?.catch?.(() => {}); } catch {}
    }

    return { unlock, place, celebrate, setEnabled, stop, destroy };
  }

  root.KidsBrickAudio = { create };
})(typeof window === "undefined" ? globalThis : window);
