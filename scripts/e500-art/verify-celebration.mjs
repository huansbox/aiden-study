// Run against the memory-only authoring preview, never a family's collection.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { connectBrowser } from '../../tests/helpers/collection-browser.mjs';
const [endpoint, origin = 'http://127.0.0.1:8878', modelId = 'e500'] = process.argv.slice(2);
if (!['e500','emu3000','r200'].includes(modelId)) throw Error('Unknown train');
const lastPart = modelId === 'e500' ? 'p14-3' : 'p12-3';
const previewUrl = origin + '/celebration.html?model=' + modelId;
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) throw Error('Local preview only');
if (!(await fetch(origin + '/celebration.html').then(r => r.text())).includes('celebration-preview.js')) throw Error('Memory-only preview required');
const b = await connectBrowser(endpoint, origin);
await b.send('Page.bringToFront');
const checks = [];
const pass = text => { checks.push(text); console.log('PASS ' + text); };
await mkdir('.scratch/collection-e2e', { recursive: true });
const { identifier } = await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `
  (() => {
  window.__brickAudioProbe = [];
  const NativeAudio = window.AudioContext || window.webkitAudioContext;
  window.AudioContext = class extends NativeAudio {
    constructor(...args) {
      super(...args);
      this.probe = this.createAnalyser();
      this.probe.connect(this.destination);
      this.voices = new Set();
      window.__brickAudioProbe.push(this);
    }
    createGain() {
      const gain = super.createGain(), connect = gain.connect.bind(gain);
      gain.connect = destination => connect(destination === this.destination ? this.probe : destination);
      return gain;
    }
    createOscillator() {
      const oscillator = super.createOscillator();
      this.voices.add(oscillator);
      oscillator.addEventListener('ended', () => this.voices.delete(oscillator));
      return oscillator;
    }
  };
  window.__brickPeak = () => {
    const samples = new Float32Array(2048);
    window.__brickAudioProbe.at(-1)?.probe.getFloatTimeDomainData(samples);
    return Math.max(...samples.map(Math.abs));
  };
  })();
` });
try {
  await b.send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: true });
  await b.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await b.navigate(previewUrl);
  await b.waitFor('document.querySelector(".brick-target-guide__hit")');
  assert.equal(await b.evaluate('__brickAudioProbe.length'), 0, 'no audio context before a gesture');
  assert.match(await b.evaluate('document.querySelector(".brick-target-guide").textContent'), /最後一片，放這裡/);
  await b.screenshot(`.scratch/collection-e2e/${modelId}-final-target-preview.png`, { fullPage: true });
  await b.click(`[data-action="part"][data-part="${lastPart}"]`, true);
  await b.click('.brick-target-guide__hit', true);
  await b.waitFor('document.querySelector("[data-celebration]")');
  await b.waitFor('__brickPeak() > 0.001');
  assert.equal(await b.evaluate('__brickAudioProbe.length'), 1, 'placement and fanfare share one context');
  pass('gold final target accepts a touch tap; completion produces actual WebAudio signal');

  await b.click('.brick-celebration__sound', true);
  await b.waitFor('__brickPeak() < 0.00001 && __brickAudioProbe.at(-1).voices.size === 0');
  assert.equal(await b.evaluate('[...document.querySelectorAll("[data-action=sound]")].every(e => e.getAttribute("aria-pressed") === "false")'), true);
  await b.click('.brick-celebration__sound', true);
  await b.waitFor('__brickPeak() > 0.001');
  await b.click('[data-action="celebration-skip"]', true);
  await b.waitFor('document.querySelector("[data-action=display]") && __brickPeak() < 0.00001 && __brickAudioProbe.at(-1).voices.size === 0');
  pass('mute cancels current and scheduled notes; unmute resumes; skip stops the fanfare');

  await b.click('[data-action="celebration-replay"]', true);
  await b.waitFor('__brickPeak() > 0.001');
  await b.waitFor('Math.abs(new DOMMatrix(getComputedStyle(document.querySelector(".brick-celebration__train")).transform).m41) < 12');
  await b.screenshot(`.scratch/collection-e2e/${modelId}-celebration-forward-preview.png`);
  await b.waitFor('document.querySelector("[data-action=display]")');
  assert.equal(await b.evaluate('__brickAudioProbe.length'), 1);
  await b.waitFor('__brickAudioProbe.at(-1).voices.size === 0');
  pass('six-second replay finishes without allocating another audio context or retaining notes');

  await b.send('Emulation.setDeviceMetricsOverride', { width: 768, height: 1024, deviceScaleFactor: 1, mobile: true });
  await b.click('#restart', true);
  await b.waitFor('document.querySelector(".brick-target-guide__hit")');
  assert.equal(await b.evaluate('__brickAudioProbe[0].state'), 'closed');
  assert.equal(await b.evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  await b.drag(`[data-action="part"][data-part="${lastPart}"]`, '.brick-target-guide__hit', { touch: true });
  await b.waitFor('document.querySelector("[data-celebration]") && __brickPeak() > 0.001');
  await b.click('#restart', true);
  await b.waitFor('document.querySelector(".brick-target-guide__hit") && __brickAudioProbe.at(-1).state === "closed"');
  pass('portrait Pad drag reaches the highlighted target; reset closes audio during celebration');
} finally {
  await b.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
  await b.send('Emulation.clearDeviceMetricsOverride');
  await b.navigate(previewUrl);
  await writeFile(`.scratch/collection-e2e/${modelId}-celebration-result.json`, JSON.stringify({ modelId, checks, physicalIPad: false, at: new Date().toISOString() }, null, 2));
  b.close();
}
