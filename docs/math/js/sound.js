let ctx = null;

function getContext() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

export function resumeAudio() {
  const c = getContext();
  if (c.state === 'suspended') c.resume();
}

function playTone(freq, type, duration, delay = 0) {
  const c = getContext();
  const osc = c.createOscillator();
  const gain = c.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = 0.15;
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);

  osc.connect(gain);
  gain.connect(c.destination);

  osc.start(c.currentTime + delay);
  osc.stop(c.currentTime + delay + duration);
}

export function playCorrect() {
  playTone(880, 'sine', 0.1);
}

export function playError() {
  playTone(220, 'square', 0.15);
}

export function playComplete() {
  playTone(523, 'sine', 0.12, 0);
  playTone(659, 'sine', 0.12, 0.13);
  playTone(784, 'sine', 0.12, 0.26);
}
