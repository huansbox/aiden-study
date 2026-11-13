// Render one video: node source/render.mjs v1-angles [--frame <sec> ...] [--scene <id>]
// Draws every frame on a canvas, pipes raw frames to ffmpeg, then mixes narration + cues and adds subtitles.
import { GlobalFonts, createCanvas } from '@napi-rs/canvas';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { W, H, FPS, C, background, chapter } from './lib.mjs';
import { ROOT, VARIANT, PRIVATE, audioDir, clipName, loadManifest } from './make_audio.mjs';

const LEAD = 0.5, GAP = 0.4, TAIL = 0.7, FADE = 0.3;
const fonts = join(ROOT, '.cache/fonts');
if (!existsSync(join(fonts, 'YuantiTC-Bold.ttf'))) throw new Error('run `uv run source/extract_fonts.py` first');
GlobalFonts.registerFromPath(join(fonts, 'YuantiTC-Bold.ttf'), 'KidRound');
GlobalFonts.registerFromPath(join(fonts, 'PingFangTC-Semibold.ttf'), 'KidFallback');

/** Scene/line start times derived from the measured narration clips. */
export function timeline(video, variant = VARIANT) {
  const clips = loadManifest(video, variant);
  let at = 0;
  const scenes = video.scenes.map((scene, index) => {
    const L = {}, E = {}, lines = [];
    let t = LEAD;
    for (const line of scene.lines) {
      const clip = clips[clipName(scene, line)];
      if (!clip || clip.text !== line.text) throw new Error(`audio for ${scene.id}-${line.id} is missing or stale; run make_audio`);
      L[line.id] = t; E[line.id] = t + clip.duration;
      lines.push({ ...line, file: join(audioDir(video, variant), clipName(scene, line)), start: at + t, end: at + t + clip.duration });
      t += clip.duration + (line.gap ?? GAP);
    }
    const dur = t - (scene.lines.at(-1).gap ?? GAP) + Math.max(TAIL, scene.lines.at(-1).gap ?? 0);
    const out = { scene, index, start: at, dur, L, E, lines };
    at += dur;
    return out;
  });
  return { scenes, total: at };
}

// Animation cues are written against the default (Edge) narration. Another voice speaks each line at a different
// pace, so its scene time is mapped onto the default one line by line: the drawing code always sees default timing.
function warp(x, from, to) {
  const xs = [0], ys = [0];
  for (const id of Object.keys(from.L)) { xs.push(from.L[id], from.E[id]); ys.push(to.L[id], to.E[id]); }
  xs.push(from.dur); ys.push(to.dur);
  for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return xs[i] === xs[i - 1] ? ys[i] : ys[i - 1] + (ys[i] - ys[i - 1]) * (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
  return ys.at(-1);
}

function drawFrame(ctx, tl, T) {
  const sc = tl.scenes.findLast((s) => T >= s.start) ?? tl.scenes[0];
  const t = T - sc.start, ref = sc.ref ?? sc;
  background(ctx);
  ctx.save();
  sc.scene.draw(ctx, { t: sc.ref ? warp(t, sc, ref) : t, L: ref.L, E: ref.E, dur: ref.dur });
  ctx.restore();
  chapter(ctx, sc.index + 1, sc.scene.title);
  const veil = Math.max(1 - t / FADE, 1 - (sc.dur - t) / FADE, 0);
  if (veil > 0) { ctx.globalAlpha = Math.min(1, veil); ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}

const stamp = (s) => { const ms = Math.round(s * 1000); const p = (n, w = 2) => String(n).padStart(w, '0'); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };

const CUES = { // tiny synthesized sound cues; kept quiet so they never compete with the narration
  pop: 'sine=frequency=660:duration=0.09,afade=t=out:st=0.02:d=0.07,volume=0.22',
  ding: 'sine=frequency=1318:duration=0.7,afade=t=out:st=0.03:d=0.67,volume=0.2',
  buzz: 'sine=frequency=150:duration=0.32,afade=t=out:st=0.15:d=0.17,volume=0.3',
};

async function main() {
  const args = process.argv.slice(2);
  const name = args[0];
  const video = (await import(`./${name}.mjs`)).default;
  const tl = timeline(video);
  if (VARIANT !== 'edge') timeline(video, 'edge').scenes.forEach((ref, i) => { tl.scenes[i].ref = ref; });
  const canvas = createCanvas(W, H), ctx = canvas.getContext('2d');
  const mine = VARIANT === 'clone'; // cloned-voice renders stay in the private folder
  const work = join(ROOT, '.cache/render'), outDir = mine ? join(PRIVATE, 'output') : join(ROOT, 'output');
  mkdirSync(work, { recursive: true }); mkdirSync(outDir, { recursive: true });

  if (args.includes('--times')) {
    for (const s of tl.scenes) console.log(s.scene.id, s.start.toFixed(2), 'dur', s.dur.toFixed(2), Object.entries(s.L).map(([k, v]) => `${k}:${v.toFixed(1)}-${s.E[k].toFixed(1)}`).join(' '));
    console.log('total', tl.total.toFixed(2));
    return;
  }
  const frameAt = args.flatMap((a, i) => (a === '--frame' ? [args[i + 1]] : []));
  if (frameAt.length) { // debugging stills: "<scene>:<local seconds>" or absolute seconds
    for (const spec of frameAt) {
      const [sid, local] = spec.includes(':') ? spec.split(':') : [null, spec];
      const T = sid ? tl.scenes.find((s) => s.scene.id === sid).start + Number(local) : Number(spec);
      drawFrame(ctx, tl, T);
      const file = join(work, `${name}-${spec.replace(':', '_')}.jpg`);
      writeFileSync(file, canvas.toBuffer('image/jpeg', 80));
      console.log(file);
    }
    return;
  }

  const tag = mine ? '-myvoice' : '';
  const silent = join(work, `${name}${tag}-video.mp4`), srt = join(work, `${name}${tag}.srt`), final = join(outDir, `${video.id}${tag}.mp4`);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = Math.ceil(tl.total * FPS);
  for (let f = 0; f < frames; f++) {
    drawFrame(ctx, tl, f / FPS);
    if (!ff.stdin.write(canvas.data())) await once(ff.stdin, 'drain');
    if (f % 600 === 0) console.log(`frame ${f}/${frames}`);
  }
  ff.stdin.end();
  await once(ff, 'close');

  const lines = tl.scenes.flatMap((s) => s.lines);
  writeFileSync(srt, lines.map((l, i) => `${i + 1}\n${stamp(l.start)} --> ${stamp(l.end + 0.15)}\n${l.text}\n`).join('\n'));
  const cues = tl.scenes.flatMap((s) => { const ref = s.ref ?? s; return (s.scene.sfx?.({ L: ref.L, E: ref.E, dur: ref.dur }) ?? []).map((c) => ({ at: s.start + (s.ref ? warp(c.t, ref, s) : c.t), k: c.k })); });
  const inputs = [], filters = [], labels = [];
  lines.forEach((l, i) => { inputs.push('-i', l.file); filters.push(`[${i + 1}:a]adelay=${Math.round(l.start * 1000)}:all=1[a${i}]`); labels.push(`[a${i}]`); });
  cues.forEach((c, j) => { const i = lines.length + j; inputs.push('-f', 'lavfi', '-i', CUES[c.k]); filters.push(`[${i + 1}:a]adelay=${Math.round(c.at * 1000)}:all=1[a${i}]`); labels.push(`[a${i}]`); });
  filters.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0:dropout_transition=0,apad=whole_dur=${tl.total.toFixed(3)},loudnorm=I=-16:TP=-1.5:LRA=11[out]`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', silent, ...inputs, '-i', srt, '-filter_complex', filters.join(';'),
    '-map', '0:v', '-map', '[out]', '-map', `${lines.length + cues.length + 1}:s`, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000',
    '-c:s', 'mov_text', '-metadata:s:s:0', 'language=chi', '-metadata', `title=${video.title}`, '-t', tl.total.toFixed(3), '-movflags', '+faststart', final], { stdio: 'inherit' });
  writeFileSync(join(outDir, `${video.id}${tag}.srt`), lines.map((l, i) => `${i + 1}\n${stamp(l.start)} --> ${stamp(l.end + 0.15)}\n${l.text}\n`).join('\n'));
  console.log(`${final}  ${tl.total.toFixed(1)}s`);
}

await main();
