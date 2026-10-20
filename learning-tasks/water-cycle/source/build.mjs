import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const task = path.dirname(here);
const destination = path.resolve(task, '../../docs/water-cycle');
const check = process.argv.includes('--check');
export function speechJobs(content, lang) {
  return Object.entries(content.voices).filter(([id]) => id.startsWith(`${lang}-`)).map(([id, text]) => ({ file: `${id}.mp3`, text }));
}
async function sync(relative, bytes, base = destination) {
  const target = path.join(base, relative);
  if (check) {
    let existing;
    try { existing = await readFile(target); } catch { throw new Error(`Missing generated file: ${target}`); }
    if (!existing.equals(bytes)) throw new Error(`Generated file differs: ${target}`);
  } else { await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, bytes); }
}
async function copyTree(from, relative = '') {
  for (const item of await readdir(path.join(from, relative), { withFileTypes: true })) {
    // Native audio generation writes a hidden .part before atomically publishing a verified MP3.
    if (item.name.startsWith('.') || item.name.endsWith('.part')) continue;
    const key = path.join(relative, item.name);
    if (item.isDirectory()) await copyTree(from, key);
    else await sync(path.join('assets', key), await readFile(path.join(from, key)));
  }
}
const content = JSON.parse(await readFile(path.join(here, 'content.json'), 'utf8'));
for (const lang of ['zh', 'en']) await sync(`speech-${lang}.json`, Buffer.from(JSON.stringify(speechJobs(content, lang), null, 2) + '\n'), here);
for (const file of ['index.html', 'style.css', 'app.mjs', 'model.mjs', 'art.mjs', 'content.json']) await sync(file, await readFile(path.join(here, file)));
await copyTree(path.join(task, 'assets'));
console.log(check ? 'Water cycle source and output match.' : 'Built docs/water-cycle.');
