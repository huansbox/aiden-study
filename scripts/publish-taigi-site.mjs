// Publish the approved private site to the existing KV namespace. The active
// release only changes after every immutable file has been read back byte-for-byte.
import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtemp, readdir, readFile, realpath, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {promisify} from 'node:util';
import {contentType, practiceFor} from '../worker/taigi-practice.mjs';

const run = promisify(execFile);
const config = fileURLToPath(new URL('../worker/wrangler.jsonc', import.meta.url));
const repo = await realpath(fileURLToPath(new URL('../', import.meta.url)));
export async function publishSite(id, args) {
  const practice = practiceFor(id);
  if (!practice) throw Error('Choose taigi-bitter-melon or taigi-reading.');
  const {prefix} = practice;
  const [input, mode='inspect', expected] = args;
  if (!input || !['inspect','publish','verify'].includes(mode) || (mode !== 'inspect' && !/^[0-9a-f]{64}$/.test(expected || ''))) {
    throw Error('Expected <private site directory> [inspect | publish <release digest> | verify <release digest>]');
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
  for (const required of ['index.html', 'assets/reading.mp3']) {
    if (!manifest.some(file => file.path === required)) throw Error('Missing ' + required);
  }
  manifest.sort((a,b)=>a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const release = hash(JSON.stringify(manifest));
  console.log(`${manifest.length} files, ${manifest.reduce((n,file)=>n+file.bytes,0)} bytes, release ${release}`);
  if (mode === 'inspect') return;
  if (expected !== release) throw Error('The approved site digest differs from the current files.');
  const wrangler = process.env.WRANGLER_BIN || 'wrangler';
  async function cli(args, {allowMissing=false}={}) {
    try {
      const result = await run(wrangler, [...args,'--binding','KV','--remote','--config',config],
        {encoding:'buffer',maxBuffer:limit+1024*1024, env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
      return result.stdout;
    } catch (error) {
      // Wrangler's remote single-key GET uses the HTTP status in its error.
      // No auth, quota, transport, or other failure is evidence of absence.
      const missing = /Failed to fetch (https:\/\/api\.cloudflare\.com\/client\/v4\/accounts\/[a-f0-9]{32}\/storage\/kv\/namespaces\/[a-f0-9]{32}\/values\/[^\s]+) - 404: Not Found\b/i
        .exec(String(error.stderr ?? ''));
      if (allowMissing && args[2] === 'get' &&
          missing?.[1].endsWith('/values/'+encodeURIComponent(args[3]))) return null;
      throw Error(`Wrangler ${args.slice(0,3).join(' ')} failed (exit ${error.code}); release was not confirmed.`);
    }
  }
  const pause = milliseconds => new Promise(done => setTimeout(done,milliseconds));
  let remoteKeys;
  function listRemoteRelease() {
    // Wrangler's remote GET drops the API response body, so its 404 alone
    // cannot distinguish missing keys from a wrong/unavailable namespace.
    // Require one successful lookup of this release prefix as a second signal.
    remoteKeys ??= cli(['kv','key','list','--prefix',prefix+release+':']).then(raw => {
      const listed = JSON.parse(raw.toString('utf8'));
      if (!Array.isArray(listed) || listed.some(item=>typeof item?.name !== 'string')) {
        throw Error('Invalid remote KV key listing.');
      }
      return new Set(listed.map(item=>item.name));
    });
    return remoteKeys;
  }
  async function transfer(file) {
    const key = `${prefix}${release}:${file.path}`;
    const get = () => cli(['kv','key','get',key], {allowMissing:mode === 'publish'});
    let writeAttempted = false;
    for (let attempt=0; ; attempt++) {
      let bytes;
      try {
        bytes = await get();
        if (bytes === null && !writeAttempted && !(await listRemoteRelease()).has(key)) {
          const approved = await readFile(join(site,file.path));
          if (hash(approved) !== file.hash) throw Error('Approved file changed: '+file.path);
          // Upload the verified snapshot, not a source path another process could edit.
          const temporary = await mkdtemp(join(tmpdir(),'taigi-kv-'));
          try {
            const path = join(temporary,'value');
            await writeFile(path,approved,{mode:0o600});
            writeAttempted = true;
            await cli(['kv','key','put',key,'--path',path]);
          } finally {
            await rm(temporary,{recursive:true,force:true});
          }
          bytes = await get();
        }
      } catch (error) {
        if (attempt === 2) throw error;
        await pause(2000 * (attempt+1));
        continue;
      }
      // Seeing other bytes is terminal; even if the next GET would return
      // 404, this immutable key cannot later be treated as new.
      if (bytes !== null) {
        if (hash(bytes) !== file.hash) throw Error('Remote byte verification failed: '+file.path);
        return;
      }
      if (attempt === 2) throw Error('Remote byte verification failed: '+file.path);
      // Retry visibility only. An attempted put is never sent again here.
      await pause(2000 * (attempt+1));
    }
  }
  const concurrency = 4;
  for (let i=0; i<manifest.length; i+=concurrency) {
    const results = await Promise.allSettled(manifest.slice(i,i+concurrency).map(transfer));
    const failure = results.find(result => result.status === 'rejected');
    if (failure) throw failure.reason;
    if ((i+concurrency)%16 === 0) console.log(`Verified ${Math.min(i+concurrency,manifest.length)}/${manifest.length} files`);
  }
  const activeKey = prefix+'active';
  const expectedActive = Buffer.from(release, 'ascii');
  let active = await cli(['kv','key','get',activeKey], {allowMissing:mode === 'publish'});
  if (mode === 'publish' && !active?.equals(expectedActive)) {
    if (active === null) await listRemoteRelease();
    let writeError;
    try {
      await cli(['kv','key','put',activeKey,release]);
    } catch (error) {
      writeError = error;
    }
    active = await cli(['kv','key','get',activeKey], {allowMissing:true});
    if (writeError && !active?.equals(expectedActive)) throw writeError;
  }
  if (!active?.equals(expectedActive)) throw Error('The active release does not match.');
  console.log('All private assets and the active release verified.');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await publishSite(process.argv[2], process.argv.slice(3));
}
