import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const source = new URL('./source/', import.meta.url);
const output = new URL('../../docs/grandmas-secret-box-mind-map/', import.meta.url);
const files = ['index.html', 'style.css', 'app.js', 'content.js', 'app.webmanifest'];
const check = process.argv.includes('--check');

if (!check) await mkdir(output, {recursive: true});
for (const name of files) {
  const data = await readFile(new URL(name, source));
  const target = new URL(name, output);
  if (check) {
    const built = await readFile(target).catch(() => null);
    if (!built?.equals(data)) {
      throw new Error(`Stale output: ${name}. Run node learning-tasks/grandmas-secret-box/build.mjs`);
    }
  } else {
    await writeFile(target, data);
  }
}
console.log(`${check ? 'Verified' : 'Built'} ${fileURLToPath(output)}`);
