// Publish the approved private site to the existing KV namespace. The active
// release only changes after every immutable file has been read back byte-for-byte.
import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readdir, readFile, realpath} from 'node:fs/promises';
import {join, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {contentType, prefix} from '../../worker/taigi-bitter-melon.mjs';

const run = promisify(execFile);
const config = fileURLToPath(new URL('../../worker/wrangler.jsonc', import.meta.url));
const repo = await realpath(fileURLToPath(new URL('../../', import.meta.url)));
const [input, mode='inspect', expected] = process.argv.slice(2);
if (!input || !['inspect','publish','verify'].includes(mode) || (mode !== 'inspect' && !/^[0-9a-f]{64}$/.test(expected || ''))) {
  throw Error('Usage: node publish_site.mjs <private site directory> [inspect | publish <release digest> | verify <release digest>]');
}
const site = await realpath(resolve(input));
if (site === repo || site.startsWith(repo + sep)) throw Error('Use the private delivery directory outside the checkout.');
const limit = 25 * 1024 * 1024;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest=[];
async function list(relative='') {
  for (const entry of await readdir(join(site,relative),{withFileTypes:true})) {
    const path = relative + entry.name;
    if (entry.isDirectory() && (path === 'assets' || path.startsWith('assets/'))) { await list(path+'/'); continue; }
    if (!entry.isFile() || !contentType(path)) throw Error('Unexpected private delivery file: '+path);
    const bytes = await readFile(join(site,path));
    if (!bytes.length || bytes.length > limit) throw Error('Invalid size: '+path);
    manifest.push({path, bytes:bytes.length, hash:hash(bytes)});
  }
}
await list();
if (!manifest.some(file => file.path === 'index.html')) throw Error('Missing index.html');
manifest.sort((a,b)=>a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
const release = hash(JSON.stringify(manifest));
console.log(`${manifest.length} files, ${manifest.reduce((n,file)=>n+file.bytes,0)} bytes, release ${release}`);
if (mode === 'inspect') process.exit(0);
if (expected !== release) throw Error('The approved site digest differs from the current files.');
const wrangler = process.env.WRANGLER_BIN || 'wrangler';
async function cli(args) {
  try {
    const result = await run(wrangler, [...args,'--binding','KV','--remote','--config',config],
      {encoding:'buffer',maxBuffer:limit+1024*1024, env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
    return result.stdout;
  } catch (error) {
    throw Error(`Wrangler ${args.slice(0,3).join(' ')} failed (exit ${error.code}); release was not confirmed.`);
  }
}
for (const file of manifest) {
  const key = `${prefix}${release}:${file.path}`;
  if (mode === 'publish') await cli(['kv','key','put',key,'--path',join(site,file.path)]);
  const bytes = await cli(['kv','key','get',key]);
  if (hash(bytes) !== file.hash) throw Error('Remote byte verification failed: '+file.path);
}
if (mode === 'publish') await cli(['kv','key','put',prefix+'active',release]);
const active = (await cli(['kv','key','get',prefix+'active'])).toString('ascii');
if (active !== release) throw Error('The active release does not match.');
console.log('All private assets and the active release verified.');
