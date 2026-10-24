import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=new URL('../learning-tasks/number-line-difference/source/',import.meta.url);
const read=name=>readFileSync(new URL(name,source),'utf8');

test('數線 HTML、CSS、app 與 ES module imports 共用新版 cache 參數',()=>{
  const html=read('index.html');
  const references=[...html.matchAll(/(?:href|src)=["']([^"']+\.(?:css|js)(?:\?[^"']*)?)["']/g)].map(match=>match[1]).filter(path=>!path.startsWith('../'));
  assert.ok(references.some(path=>path.startsWith('style.css')));
  assert.ok(references.some(path=>path.startsWith('app.js')));
  const versions=new Set();
  for(const reference of references){
    const url=new URL(reference,'https://local/');
    assert.ok(url.searchParams.get('v'),`${reference} 缺 cache 版本`);
    versions.add(url.searchParams.get('v'));
  }
  const pending=['app.js'],seen=new Set();
  while(pending.length){
    const name=pending.pop();if(seen.has(name))continue;seen.add(name);
    for(const match of read(name).matchAll(/(?:from\s*|import\s*\()(['"])(\.\/[^'"]+)\1/g)){
      const url=new URL(match[2],'https://local/');
      assert.ok(url.searchParams.get('v'),`${name} → ${match[2]} 缺 cache 版本`);
      versions.add(url.searchParams.get('v'));pending.push(url.pathname.slice(1));
    }
  }
  assert.ok(seen.has('lesson-core.js')&&seen.has('platform.js'),'包含真正載入的 core 與 platform');
  const bank=read('app.js').match(/fetch\('problems\.json\?v=([^']+)'/);
  assert.ok(bank,'題庫也必須更新 cache 版本');versions.add(bank[1]);
  const platform=read('platform.js'),shared=platform.match(/script\.src='\.\.\/shared\/'\+src\+'\?v=([^']+)'/);
  assert.ok(shared,'家庭模組 loader 必須有 cache 版本');
  assert.match(platform,/'collection-core\.js'/,'包括決定5題完成資格的 collection core');versions.add(shared[1]);
  assert.equal(versions.size,1,'新 app 不能混入不同版本的 ES modules');
  assert.notEqual([...versions][0],'20261024-number-line-task','不可沿用 v1 cache 參數');
  assert.notEqual([...versions][0],'20261024-direct-touch-v2','不可混載仍以六題計算的舊核心或題庫');
});
