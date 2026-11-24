import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/worker.mjs';
import {prefix, route} from '../worker/taigi-bitter-melon.mjs';
import {kvStub} from '../worker/kv-stub.mjs';

const origin = 'https://kids.linshuhuan.com';
const release = 'c'.repeat(64);
const base = origin + '/api' + route;
const audio = `${release}/assets/reading.mp3`;

test('私用台語練習的首頁和原音都需要家庭 Cookie，Safari 可取指定音訊區間', async () => {
  const bytes = new Uint8Array([10,20,30,40]);
  const env = {TOKEN:'test-practice', KV:kvStub()};
  await env.KV.put(prefix + 'active', release);
  await env.KV.put(prefix + release + ':index.html', new TextEncoder().encode('practice').buffer);
  await env.KV.put(prefix + release + ':assets/reading.mp3', bytes.buffer);
  for (const path of ['', release + '/index.html', audio]) {
    const result = await worker.fetch(new Request(base + path), env);
    assert.equal(result.status, 401);
  }
  const connect = await worker.fetch(new Request(origin + '/api/v1/session', {method:'POST',
    headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({key:env.TOKEN})}),env);
  const cookie = connect.headers.get('Set-Cookie').split(';')[0];
  const read = (path, headers={}, method='GET') => worker.fetch(new Request(base+path,{method,headers:{Cookie:cookie,...headers}}),env);
  const latest = await read('');
  assert.equal(latest.status,302);
  assert.equal(latest.headers.get('location'),base+release+'/index.html');
  assert.equal(await (await read(release+'/index.html')).text(),'practice');
  const range = await read(audio,{Range:'bytes=0-1'});
  assert.equal(range.status,206);
  assert.equal(range.headers.get('content-type'),'audio/mpeg');
  assert.equal(range.headers.get('content-range'),'bytes 0-1/4');
  assert.equal(range.headers.get('cache-control'),'private, no-store');
  assert.deepEqual(new Uint8Array(await range.arrayBuffer()),bytes.slice(0,2));
  assert.equal((await read(audio,{Range:'bytes=12-'})).status,416);
  assert.equal((await read(audio,{Range:'bytes=0-0,2-3'})).status,200);
  assert.equal((await read(audio,{Range:'items=0-1'})).status,200);
  assert.equal((await read(release+'/assets/reading.js')).status,404);
  assert.match(range.headers.get('content-security-policy'), /connect-src 'none'/);
  assert.equal((await read(audio,{'Sec-Fetch-Site':'cross-site'})).status,403);
  assert.equal((await read(release+'/assets/missing.mp3')).status,404);
  assert.equal((await read(release+'/assets/other.html')).status,404);
  const head = await read(audio,{},'HEAD');
  assert.equal(head.headers.get('content-length'),'4');
  assert.equal(await head.text(),'');
});
