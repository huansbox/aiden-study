import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

const run = promisify(execFile);
const publisher = fileURLToPath(new URL('../scripts/publish-taigi-site.mjs',import.meta.url));
const legacy = fileURLToPath(new URL('../learning-tasks/taigi-bitter-melon/publish_site.mjs',import.meta.url));
const lesson = 'taigi-bitter-melon';
const prefix = 'c:'+lesson+':';
const storage = (dir,key) => join(dir,createHash('sha256').update(key).digest('hex'));

const fakeWrangler = `#!/usr/bin/env node
const fs = require('node:fs');
const {createHash} = require('node:crypto');
const {join} = require('node:path');
const [group, kind, action, key, flag, path] = process.argv.slice(2);
const dir = process.env.FAKE_KV;
const file = join(dir,createHash('sha256').update(key).digest('hex'));
const err = status => {
  console.error('Failed to fetch https://api.cloudflare.com/client/v4/accounts/0123456789abcdef0123456789abcdef/storage/kv/namespaces/fedcba9876543210fedcba9876543210/values/'+encodeURIComponent(key)+' - '+status);
  process.exit(1);
};
if (group !== 'kv' || kind !== 'key' || !process.argv.includes('--remote')) throw Error('Unexpected invocation');
fs.appendFileSync(join(dir,'log'),JSON.stringify({action,key})+'\\n');
if (action === 'get') {
  if (key === process.env.FAKE_429_KEY) err('429: Too Many Requests');
  if (!fs.existsSync(file)) err('404: Not Found');
  if (key === process.env.FAKE_INVISIBLE_KEY) err('404: Not Found');
  process.stdout.write(fs.readFileSync(file));
  if (key === process.env.FAKE_DROP_AFTER_GET_KEY) fs.unlinkSync(file);
} else if (action === 'list') {
  if (process.env.FAKE_LIST_FAIL) err('404: Not Found');
  if (key !== '--prefix') throw Error('Missing prefix');
  const names = fs.readdirSync(dir).filter(name=>name.endsWith('.name') && fs.existsSync(join(dir,name.slice(0,-5))))
    .map(name=>fs.readFileSync(join(dir,name),'utf8')).filter(name=>name.startsWith(flag));
  process.stdout.write(JSON.stringify(names.map(name=>({name}))));
} else if (action === 'put') {
  fs.writeFileSync(file,flag === '--path' ? fs.readFileSync(path) : flag);
  fs.writeFileSync(file+'.name',key);
  if (key === process.env.FAKE_COMMITTED_TIMEOUT_KEY) err('504: Gateway Timeout');
} else {
  throw Error('Unexpected operation: '+action);
}
`;

async function setup(t) {
  const dir = await mkdtemp(join(tmpdir(),'taigi-publish-test-'));
  t.after(() => rm(dir,{recursive:true,force:true}));
  const site = join(dir,'site');
  const fake = join(dir,'wrangler');
  const kv = join(dir,'kv');
  const log = join(kv,'log');
  await mkdir(join(site,'assets'),{recursive:true});
  await mkdir(kv);
  await writeFile(join(site,'index.html'),'<html>synthetic fixture</html>');
  await writeFile(join(site,'assets','reading.mp3'),Buffer.from([18,255,0,79]));
  await writeFile(fake,fakeWrangler,{mode:0o700});
  const env = {...process.env,WRANGLER_BIN:fake,FAKE_KV:kv};
  const {stdout} = await run(process.execPath,[publisher,lesson,site,'inspect'],{env});
  const digest = /release ([0-9a-f]{64})/.exec(stdout)[1];
  const execute = (entry=publisher,mode='publish',extra={}) => run(process.execPath,[
    entry,...(entry === publisher ? [lesson] : []),site,mode,digest,
  ],{env:{...env,...extra}});
  const operations = async () => (await readFile(log,'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
  const clear = () => writeFile(log,'');
  return {digest,execute,operations,clear,kv, keys:[
    prefix+digest+':index.html',prefix+digest+':assets/reading.mp3',prefix+'active',
  ]};
}

test('both publishing entrypoints preserve byte checks with zero writes for an identical active release',async t => {
  const {keys, execute, operations, clear} = await setup(t);
  await execute();
  const initial = await operations();
  const writes = initial.filter(x=>x.action === 'put');
  assert.deepEqual(writes.map(x=>x.key).sort(),[...keys].sort());
  assert.equal(writes.at(-1).key,keys.at(-1));
  assert.equal(initial.filter(x=>x.action === 'list').length,1);
  for (const key of keys) {
    const steps = initial.filter(x=>x.key === key).map(x=>x.action);
    assert.deepEqual(steps,['get','put','get']);
  }
  for (const mode of ['publish','verify']) {
    await clear();
    await execute(legacy,mode);
    assert.deepEqual((await operations()).map(x=>[x.action,x.key]).sort(),
      keys.map(key=>['get',key]).sort());
  }
});

test('a timed-out write that committed is only re-read, and partial resumes only fill missing keys',async t => {
  const {keys,execute,operations,clear,kv} = await setup(t);
  await execute(publisher,'publish',{FAKE_COMMITTED_TIMEOUT_KEY:keys[0]});
  const first = (await operations()).filter(x=>x.key===keys[0]).map(x=>x.action);
  assert.deepEqual(first,['get','put','get']);
  await rm(storage(kv,keys[1]));
  await clear();
  await execute();
  const resumed = await operations();
  assert.deepEqual(resumed.filter(x=>x.action==='put').map(x=>x.key),[keys[1]]);
  assert.deepEqual(resumed.filter(x=>x.key===keys[1]).map(x=>x.action),['get','put','get']);
  await rm(storage(kv,keys[2]));
  await clear();
  await execute(publisher,'publish',{FAKE_COMMITTED_TIMEOUT_KEY:keys[2]});
  assert.deepEqual((await operations()).filter(x=>x.key===keys[2]).map(x=>x.action),['get','put','get']);
});

test('quota errors and mismatched immutable keys never become writes or activate another release',async t => {
  const {keys,execute,operations,clear,kv} = await setup(t);
  await execute();
  const old = '0'.repeat(64);
  await writeFile(storage(kv,keys[2]),old);
  await clear();
  await assert.rejects(execute(publisher,'publish',{FAKE_429_KEY:keys[0]}),/Wrangler kv key get failed/);
  assert.ok((await operations()).every(x=>x.action==='get'));
  assert.equal(await readFile(storage(kv,keys[2]),'utf8'),old);
  await writeFile(storage(kv,keys[0]),'wrong bytes');
  await clear();
  await assert.rejects(execute(publisher,'publish',{FAKE_DROP_AFTER_GET_KEY:keys[0]}),
    /Remote byte verification failed: index.html/);
  const mismatch = await operations();
  assert.ok(mismatch.every(x=>x.action==='get'));
  assert.deepEqual(mismatch.filter(x=>x.key===keys[0]).map(x=>x.action),['get']);
  assert.equal(await readFile(storage(kv,keys[2]),'utf8'),old);
});

test('a missing-key response cannot write if namespace list fails or still names that key',async t => {
  const {keys,execute,operations,clear,kv} = await setup(t);
  await assert.rejects(execute(publisher,'publish',{FAKE_LIST_FAIL:'1'}),/Wrangler kv key list failed/);
  assert.ok((await operations()).every(x=>x.action!=='put'));
  await execute();
  const old = '0'.repeat(64);
  await writeFile(storage(kv,keys[2]),old);
  await clear();
  await assert.rejects(execute(publisher,'publish',{FAKE_INVISIBLE_KEY:keys[0]}),/Remote byte verification failed/);
  const invisible = await operations();
  assert.equal(invisible.filter(x=>x.action==='list').length,1);
  assert.ok(invisible.every(x=>x.action!=='put'));
  assert.equal(await readFile(storage(kv,keys[2]),'utf8'),old);
});
