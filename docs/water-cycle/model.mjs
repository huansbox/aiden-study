// A small deterministic model: rendering and audio do not decide the science.
export const sceneIds = ['evap', 'cloud', 'rain', 'snow', 'hail', 'ground'];
export function newExperiment(scene) {
  if (!sceneIds.includes(scene)) throw new Error('Unknown scene');
  return { scene, time: false, reveal: false, cooled: false, drops: 0, air: null,
    wind: false, water: false, hail: false, hailTrials: {}, compareStarted: false, comparePrediction: null,
    path: null, paths: [], complete: false, cue: `${scene}-intro` };
}
export function snowAtGround(air) {
  return air === 'cold' ? 'snow' : air === 'warm' ? 'rain' : null;
}
export function canGrowHail({ wind, water }) { return wind && water; }
export function act(previous, action) {
  const s = { ...previous, paths: [...previous.paths], hailTrials: { ...previous.hailTrials } };
  switch (s.scene) {
    case 'evap':
      if (action === 'time') { s.time = true; s.cue = 'evap-later'; }
      if (action === 'look' && s.time) { s.reveal = true; s.complete = true; s.cue = 'evap-result'; }
      if (action === 'compare' && s.reveal) { s.compareStarted = true; s.comparePrediction = null; s.cue = 'evap-compare-intro'; }
      if (s.compareStarted && ['warmer','cooler'].includes(action)) { s.comparePrediction = action; s.cue = 'evap-compare-result'; }
      break;
    case 'cloud':
      if (action === 'cool') { s.cooled = true; s.complete = true; s.cue = 'cloud-result'; }
      break;
    case 'rain':
      if (action === 'grow') { s.drops = Math.min(3, s.drops + 1); s.complete = s.drops === 3; s.cue = s.complete ? 'rain-result' : 'rain-more'; }
      break;
    case 'snow':
      if (['cold', 'warm'].includes(action)) { s.air = action; s.complete = true; s.cue = `snow-${action}`; }
      break;
    case 'hail':
      if (action === 'wind' || action === 'water') { s[action] = !s[action]; s.hail = false; s.complete = false; s.cue = canGrowHail(s) ? 'hail-ready' : s[action] ? `hail-${action}` : 'hail-missing'; }
      if (action === 'test') { s.hail = canGrowHail(s); s.complete = s.hail; s.cue = s.hail ? 'hail-result' : 'hail-missing'; s.hailTrials[`${Number(s.wind)}${Number(s.water)}`] = s.hail; }
      break;
    case 'ground':
      if (['river', 'soil', 'lake'].includes(action)) {
        s.path = action; s.paths = [...new Set([...s.paths, action])]; s.complete = true; s.cue = `ground-${action}`;
      }
      break;
  }
  return s;
}
