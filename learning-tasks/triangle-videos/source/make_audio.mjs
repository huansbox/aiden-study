// Prepared narration: one clip per script line, regenerated only when its text or voice settings change.
// Uses Microsoft Edge's online neural voices through the `edge-tts` CLI (needs network + uv).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const VOICE = { voice: 'zh-TW-HsiaoChenNeural', rate: '-8%' };
export const VIDEOS = ['v1-angles', 'v2-sides'];
// VOICE=clone switches to the parent's own cloned voice. Those clips are a real person's voice, so they live in
// a private folder outside this public repo (TRIANGLE_PRIVATE_DIR), never under assets/.
export const VARIANT = process.env.VOICE === 'clone' ? 'clone' : 'edge';
export const PRIVATE = process.env.TRIANGLE_PRIVATE_DIR;
if (VARIANT === 'clone' && !PRIVATE) throw new Error('VOICE=clone needs TRIANGLE_PRIVATE_DIR (a private folder outside the repo)');
export const audioDir = (video) => (VARIANT === 'clone' ? join(PRIVATE, 'audio-clone', video.id) : join(ROOT, 'assets/audio', video.id));
export const clipName = (scene, line) => `${scene.id}-${line.id}.mp3`;
const sha = (data) => createHash('sha256').update(data).digest('hex');
const cloneKey = () => [sha(readFileSync(process.env.INDEXTTS_REF)), readFileSync(join(ROOT, 'source/pronunciation.json'), 'utf8')];
const fingerprint = (text, key) => sha(JSON.stringify([key, text])).slice(0, 16);
const TRIM = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.03';
const toClip = (from, to) => execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', from, '-af', `${TRIM},areverse,${TRIM},areverse`, '-ar', '48000', '-ac', '1', '-b:a', '128k', to]);
const duration = (file) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());

export function loadManifest(video) {
  const file = join(audioDir(video), 'manifest.json');
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
}

async function build(name, check) {
  const video = (await import(`./${name}.mjs`)).default;
  const dir = audioDir(video);
  mkdirSync(dir, { recursive: true });
  const old = loadManifest(video), next = {};
  const key = VARIANT === 'clone' ? cloneKey() : VOICE;
  const todo = [];
  for (const scene of video.scenes) for (const line of scene.lines) {
    const file = clipName(scene, line), path = join(dir, file), hash = fingerprint(line.text, key);
    if (old[file]?.hash !== hash || !existsSync(path)) {
      if (check) throw new Error(`${video.id}/${file} is stale; run make_audio without --check`);
      todo.push({ file, path, text: line.text, wav: join(dir, `.raw-${file}.wav`) });
    }
    next[file] = { hash, text: line.text };
  }
  if (todo.length && VARIANT === 'clone') { // one model load for every stale line
    const jobs = join(dir, '.jobs.json');
    writeFileSync(jobs, JSON.stringify(todo));
    execFileSync(process.env.INDEXTTS_PYTHON, [join(ROOT, 'source/clone_tts.py'), process.env.INDEXTTS_RUNTIME, process.env.INDEXTTS_MODELS, process.env.INDEXTTS_REF, jobs], { stdio: 'inherit' });
    rmSync(jobs);
  }
  for (const t of todo) {
    if (VARIANT === 'edge') execFileSync('uvx', ['edge-tts', '--voice', VOICE.voice, `--rate=${VOICE.rate}`, '--text', t.text, '--write-media', t.wav], { stdio: ['ignore', 'ignore', 'inherit'] });
    toClip(t.wav, t.path); // trim the engine's leading/trailing silence so spacing is decided by the script
    rmSync(t.wav);
  }
  for (const [file, clip] of Object.entries(next)) clip.duration = Number(duration(join(dir, file)).toFixed(3));
  const made = todo.length;
  if (!check) for (const f of readdirSync(dir)) if (f.endsWith('.mp3') && !next[f]) rmSync(join(dir, f)); // lines removed from the script
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(next, null, 2) + '\n');
  const total = Object.values(next).reduce((a, c) => a + c.duration, 0);
  console.log(`${video.id}: ${Object.keys(next).length} clips, ${made} generated, speech ${total.toFixed(1)}s`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), check = args.includes('--check');
  const names = args.filter((a) => !a.startsWith('--'));
  for (const name of names.length ? names : VIDEOS) await build(name, check);
}
