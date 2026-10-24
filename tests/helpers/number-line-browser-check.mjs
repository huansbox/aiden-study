// 真 Pad UI → Cookie session → 真 Worker/SQLite DO。只接受 localhost 隔離 server。
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const {chromium}=createRequire(import.meta.url)(process.env.CODEX_PLAYWRIGHT_PACKAGE || 'playwright');
const base=process.argv[2] || 'http://127.0.0.1:8794';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Use isolated serve-family localhost only');
const output=resolve(process.argv[3] || '.scratch/number-line-browser');
const problems=JSON.parse(await readFile(new URL('../../learning-tasks/number-line-difference/source/problems.json',import.meta.url))).sets.pad;
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true}), report=[];
const contexts=[];
const text=(p,s)=>[...s].map(id=>p.points.find(point=>point.id===id).label).join('');
async function number(page,value){for(const digit of String(value))await page.locator(`[data-key="${digit}"]`).tap();await page.locator('#number-form button[type="submit"]').tap();}
async function point(page,id,svg=false){await page.locator(`${svg?'.number-line':'.point-buttons'} [data-point="${id}"]`).tap();}
async function solve(page,{routes={},wrong=false,reload=false,stopBeforeFinish=false,onQuestion=async()=>{}}={}){
  for(let i=0;i<problems.length;i++){
    const p=problems[i];
    await page.locator('h1').filter({hasText:`求 ${text(p,p.target)}`}).waitFor();
    if(i===0&&wrong){
      assert.equal(await page.locator('.hint').textContent(),'');
      assert.equal(await page.locator('.point.hinted').count(),0);
      await point(page,'B');assert.equal(await page.locator('.point.hinted').count(),0);
      await point(page,'D');assert.equal(await page.locator('.point.hinted').count(),2);
      await page.screenshot({path:resolve(output,'two-errors-hint.png'),fullPage:true});
    }
    for(let g=0;g<p.givens.length;g++){
      const given=p.givens[g];await point(page,given.segment[0],true);
      assert.equal(await page.locator('.point.hinted').count(),0);
      if(i===0&&g===0&&reload){await page.reload();await page.locator('#instruction').filter({hasText:'再點'}).waitFor();assert.equal(await page.locator('.point.selected').count(),1);}
      await point(page,given.segment[1],true);
      if(i===0&&g===0&&wrong){await number(page,99);assert.equal(await page.locator('.hint').textContent(),'');await number(page,99);assert.match(await page.locator('.hint').textContent(),/把這個數/);}
      await number(page,given.length);
    }
    const route=p.routes.find(r=>r.id===(routes[p.id] || p.preferredRoute)) || p.routes[0];
    for(const step of route.steps){
      await page.locator(`[data-segment="${step.long}"]`).tap();
      if(i===2&&step===route.steps[0]&&wrong){
        await page.locator('[data-segment="AC"]').tap();
        await page.locator('[data-segment="AC"]').tap();
        assert.match(await page.locator('.hint').textContent(),/共用同一個端點/);
        assert.equal(await page.locator('[data-segment="BD"].hinted').count(),1);
      }
      await page.locator(`[data-segment="${step.short}"]`).tap();
      await number(page,step.value);
      await point(page,step.result[0],true);await point(page,step.result[1],true);await number(page,step.value);
    }
    assert.match(await page.locator('#instruction').textContent(),new RegExp(`${p.answer}`));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await onQuestion(i);
    if(i===5){await page.screenshot({path:resolve(output,`advanced-${page.viewportSize().width}.png`),fullPage:true});if(stopBeforeFinish)return;}
    await page.locator('#next').tap();
  }
  await page.locator('.finish-card h1').filter({hasText:'畫線、相減'}).waitFor();
}
async function snapshot(context){const response=await context.request.get(base+'/api/v1/collection/aiden');assert.equal(response.status(),200);return response.json();}
try{
  for(const [width,height] of [[768,1024],[1024,768]]){
    const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true});contexts.push(context);
    const page=await context.newPage(),errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()!=='GET'&&r.url().includes('/api/'))writes.push({method:r.method(),path:new URL(r.url()).pathname});});
    await page.goto(base+'/number-line-difference/?child=aiden&k=test-token');await page.locator('.point-buttons').waitFor();
    const baseline=await snapshot(context),taskGrantsBefore=baseline.grants.filter(g=>g.kind==='task').length;
    await solve(page,{routes:width===768?{p5:'left',p6:'left-reordered'}:{p5:'right',p6:'left-chain'},wrong:true,reload:true,stopBeforeFinish:true,onQuestion:async index=>{if(index<5)assert.equal((await snapshot(context)).grants.filter(g=>g.kind==='task').length,taskGrantsBefore,'題內不能發包');}});
    assert.equal((await snapshot(context)).grants.filter(g=>g.kind==='task').length,taskGrantsBefore,'第六題已作完但結束畫面前不能發包');
    if(width===768)await context.request.get(base+'/test/mode?offline=1');
    await page.locator('#next').tap();await page.locator('#reward').waitFor();
    if(width===768){
      await page.waitForFunction(()=>document.querySelector('#reward').textContent.includes('等待同步'));
      await page.screenshot({path:resolve(output,'offline-pending.png'),fullPage:true});
      await context.request.get(base+'/test/mode?offline=0');await page.locator('#retry').tap();
    }
    await page.waitForFunction(()=>document.querySelector('#reward').textContent.includes('已存入收藏'));
    let after=await snapshot(context);assert.equal(after.grants.filter(g=>g.kind==='task').length,1);assert.equal(after.daily.earned,baseline.daily.earned);assert.equal(after.taskRewards['number-line-difference'].status,'earned');
    await page.reload();await page.locator('#reward').waitFor();await page.waitForFunction(()=>document.querySelector('#reward').textContent.includes('已存入收藏'));
    await page.locator('[data-review="5"]').tap();assert.equal(await page.locator('.arc.derived').count(),3);await page.locator('#close-review').tap();
    await page.screenshot({path:resolve(output,`finish-${width}.png`),fullPage:true});
    await page.locator('#finish-restart').tap();await page.locator('#confirm-restart').tap();await page.locator('h1').filter({hasText:'求 甲乙'}).waitFor();
    assert.equal((await snapshot(context)).grants.filter(g=>g.kind==='task').length,1);
    const illegal=writes.filter(r=>!['/api/v1/session','/api/v1/collection/aiden/task-complete'].includes(r.path));assert.deepEqual(illegal,[]);assert.deepEqual(errors,[]);
    report.push({viewport:{width,height},wrongEndpointHint:true,wrongSegmentHint:true,reload:true,midRoute:width===768?'left':'right',advancedRoute:width===768?'left-reordered':'left-chain',taskGrants:1,dailyEarned:after.daily.earned,writes});
  }
  const context=await browser.newContext({viewport:{width:768,height:1024},hasTouch:true,isMobile:true});contexts.push(context);
  const page=await context.newPage(),requests=[],errors=[];page.on('request',r=>requests.push(new URL(r.url()).pathname));page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(()=>{localStorage.setItem('learning-task:number-line-difference:v1:aiden','preview-progress-sentinel');localStorage.setItem('collection:v1:aiden','preview-collection-sentinel');});
  await page.goto(base+'/number-line-difference/?child=aiden&preview=1');await solve(page,{routes:{p5:'right',p6:'outer'}});
  assert.match(await page.locator('#reward').textContent(),/不會讀寫/);
  assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('learning-task:number-line-difference:v1:aiden'),localStorage.getItem('collection:v1:aiden')]),['preview-progress-sentinel','preview-collection-sentinel']);
  assert.equal(requests.some(path=>path.startsWith('/api/')||path.startsWith('/shared/')),false);assert.deepEqual(errors,[]);
  for(const name of ['transition','independent','answers']){const response=await context.request.get(`${base}/number-line-difference/print/${name}.pdf`);assert.equal(response.status(),200);assert.equal((await response.body()).subarray(0,5).toString(),'%PDF-');}
  await page.screenshot({path:resolve(output,'preview-finish.png'),fullPage:true});
  report.push({preview:true,completeSix:true,forbiddenRequests:[],sentinelsUnchanged:true,pdfs:3});
  const home=await contexts[0].newPage();
  await home.goto(base+'/?child=aiden');await home.locator('[data-learning-task="number-line-difference"]').waitFor();
  assert.match(await home.locator('[data-learning-task="number-line-difference"]').getAttribute('href'),/number-line-difference\/\?child=aiden/);
  await home.screenshot({path:resolve(output,'home-aiden.png'),fullPage:true});
  await home.goto(base+'/?child=bingpu');await home.locator('.family-header').waitFor();
  assert.equal(await home.locator('[data-learning-task="number-line-difference"]').count(),0);
  report.push({home:true,aidenVisible:true,bingpuHidden:true});
  await writeFile(resolve(output,'report.json'),JSON.stringify({base,checks:report},null,2)+'\n');
  console.log(JSON.stringify({ok:true,checks:report.length,output}));
}finally{for(const context of contexts)await context.close();await browser.close();}
