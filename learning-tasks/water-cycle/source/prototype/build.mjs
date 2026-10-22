import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const source = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(source, '../../../../docs/water-cycle/prototype');
const check = process.argv.includes('--check');
const expected = new Set();
async function sync(relative, bytes, base = output) {
  const destination = path.join(base, relative);
  if (base === output) expected.add(relative.replaceAll('\\','/'));
  if (check) {
    let actual;
    try { actual = await readFile(destination); } catch { throw new Error(`Missing prototype output: ${destination}`); }
    if (!actual.equals(bytes)) throw new Error(`Prototype output differs: ${destination}`);
  } else {
    await mkdir(path.dirname(destination), { recursive:true });
    await writeFile(destination,bytes);
  }
}
async function copy(relative) {
  for (const entry of await readdir(path.join(source,relative),{withFileTypes:true})) {
    if (entry.name.startsWith('.') || entry.name.endsWith('.wav')) continue;
    const key = path.join(relative,entry.name);
    if (entry.isDirectory()) await copy(key);
    else await sync(key,await readFile(path.join(source,key)));
  }
}
const narration = JSON.parse(await readFile(path.join(source,'narration.json'),'utf8'));
const speechScript = Buffer.from('window.WATER_NARRATION = '+JSON.stringify(narration,null,2)+';\n');
await sync('narration.js',speechScript,source);
for (const file of ['index.html','style.css','model.js','app.js','narration.js']) await sync(file,await readFile(path.join(source,file)));
for (const name of ['sky-warm-cool.png','cloud-garden.png','characters.png']) await readFile(path.join(source,'assets/art',name));
for (const id of Object.keys(narration)) await readFile(path.join(source,'assets/audio',id+'.mp3'));
await copy('assets');
async function verifyExtras(dir='', found=[]) {
  for(const entry of await readdir(path.join(output,dir),{withFileTypes:true})) {
    const key=path.join(dir,entry.name);
    if(entry.isDirectory())await verifyExtras(key,found);
    else if(!expected.has(key.replaceAll('\\','/')))found.push(key);
  }
  return found;
}
const extras=await verifyExtras();
if(extras.length)throw new Error('Unexpected prototype output files (inspect before removing): '+extras.join(', '));
console.log(check ? 'Water cycle prototype source and output match.' : 'Built docs/water-cycle/prototype (standalone file:// compatible).');
