// Small story outcomes: no score or required route blocks a page.
export function newScene(scene) {
  return { scene, cue: scene + '-intro', touches: 0, puddle: 1, cloud: false, rain: false, snow: 0, caught: false, melted: false, ice: 0, falling: false, icePhase: 'seed', iceGrowth: false, landed: false, path: null, paths: [] };
}
export function interact(previous, action) {
  const s = { ...previous, paths: [...previous.paths], touches: previous.touches + 1, iceGrowth: false };
  if (s.scene === 'pond' && action === 'sun') { s.puddle = Math.max(.35, s.puddle - .22); s.cue = 'pond-sun'; }
  if (s.scene === 'pond' && action === 'puddle') s.cue = 'pond-puddle';
  if (s.scene === 'clouds' && action === 'cloud') { s.cloud = true; s.cue = 'clouds-touch'; }
  if (s.scene === 'rain' && action === 'merge') { s.rain = true; s.cue = 'rain-merge'; }
  if (s.scene === 'rain' && action === 'leaf') s.cue = 'rain-leaf';
  if (s.scene === 'snow' && action === 'snowflake') { s.snow++; s.cue = 'snow-touch'; }
  if (s.scene === 'snow' && action === 'mitten') { s.snow++; s.caught = true; s.melted = false; s.cue = 'snow-catch'; }
  if (s.scene === 'snow' && action === 'warm' && s.caught) { s.melted = true; s.cue = 'snow-warm'; }
  if (s.scene === 'storm' && ['ice','ice-up','ice-down'].includes(action)) {
    if (action === 'ice-up' && s.icePhase === 'grown') { s.cue='storm-grow'; return s; }
    if (action === 'ice-down' && s.icePhase !== 'grown') return s;
    if ((action === 'ice' || action === 'ice-down') && s.icePhase === 'grown') {
      s.icePhase='fallen'; s.ice=2; s.falling=true; s.landed=true; s.cue='storm-fall';
    } else if (action === 'ice' && s.icePhase === 'held') {
      s.icePhase='grown'; s.iceGrowth=true; s.ice=2; s.falling=false; s.cue='storm-grow';
    } else {
      s.icePhase='held'; s.ice=1; s.falling=false; s.cue='storm-lift';
    }
  }
  if (s.scene === 'river' && ['river', 'soil', 'pool'].includes(action)) {
    s.path = action; if (!s.paths.includes(action)) s.paths.push(action); s.cue = 'river-' + action;
  }
  return s;
}
