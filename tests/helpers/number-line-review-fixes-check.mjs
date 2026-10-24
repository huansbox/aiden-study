// 審查修正的真 browser 回歸：只用 localhost preview，不讀寫孩子資料。
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const packagePath=process.env.CODEX_PLAYWRIGHT_PACKAGE||'playwright';
const {chromium}=createRequire(import.meta.url)(packagePath);
const base=process.argv[2]||'http://127.0.0.1:8799';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Use isolated serve-family localhost only');
const output=resolve(process.argv[3]||'.scratch/number-line-review-fixes');
await mkdir(output,{recursive:true});
const problems=JSON.parse(await readFile(new URL('../../learning-tasks/number-line-difference/source/problems.json',import.meta.url))).sets.pad;
const name=(p,s)=>[...s].map(id=>p.points.find(point=>point.id===id).label).join('');
const report={base,checks:[],targetStates:[],feedback:[],alternateRoutes:[],touchTaps:0};
const browser=await chromium.launch({headless:true});
const contexts=[];
const stage=page=>page.locator('#app').getAttribute('data-stage');
const waitStage=(page,value)=>page.waitForFunction(v=>document.querySelector('#app')?.dataset.stage===v,value);
async function tap(page,selector){await page.locator(selector).tap();report.touchTaps++;}
async function point(page,id){await tap(page,`.number-line [data-point="${id}"]`);}
async function target(page,s){await waitStage(page,'target-start');await point(page,s[0]);await point(page,s[1]);}
async function cleanHint(page){assert.equal((await page.locator('#hint').textContent()).trim(),'');}
async function stateView(page){
  return page.evaluate(()=>({
    hint:document.querySelector('#hint').textContent,
    feedback:document.querySelector('.feedback').textContent,
    highlighted:[...document.querySelectorAll('.point.hinted')].map(el=>el.dataset.point).sort(),
    selected:document.querySelector('.point.selected')?.dataset.point||null,
    fixed:[...document.querySelectorAll('.number-line .baseline,.number-line .point')].map(el=>el.outerHTML.replace(/class="[^"]*"/g,''))
  }));
}
async function feedback(page,p,s,reason,width){
  await target(page,s);assert.equal(await stage(page),'target-start');
  const text=await page.locator('.feedback').textContent();
  if(reason==='guided'){
    assert.match(text,/先照上方指示/);assert.doesNotMatch(text,/多算一步|次內|不能直接算/);
  }else if(reason==='known'){
    assert.match(text,/長度已知/);assert.doesNotMatch(text,/不能直接算|多算一步/);
  }else if(reason==='longer'){
    assert.match(text,/算得出.*多算一步/);assert.ok(text.includes(`${p.minSubtractions} 次內`));
    if(p.id==='p5')assert.doesNotMatch(text,/3 次內|三次內/);
  }else{
    assert.match(text,/目前還不能直接算/);assert.doesNotMatch(text,/長度已知|多算一步/);
  }
  report.feedback.push({width,problem:p.id,target:s,reason,text});
}
async function hintCheck(page,p,route,stepIndex,width){
  await cleanHint(page);
  const before=await stateView(page);
  if(p.id==='p5'&&route.id==='left'&&stepIndex===1){
    await feedback(page,p,'CD','longer',width);
    await page.screenshot({path:resolve(output,`p5-two-subtractions-${width}.png`),fullPage:true});
  }else if(p.id==='p6'&&route.id==='right'&&stepIndex===1){
    await feedback(page,p,'AB','longer',width);
    await page.screenshot({path:resolve(output,`p6-three-subtractions-${width}.png`),fullPage:true});
  }else if(stepIndex===0){
    await feedback(page,p,'BC','unavailable',width);
  }else{
    await feedback(page,p,p.givens[0].segment,'known',width);
  }
  await cleanHint(page);
  await feedback(page,p,p.givens[0].segment,'known',width);
  const after=await stateView(page);
  assert.deepEqual(after.fixed,before.fixed,'出現提示不能改動數線幾何');
  assert.equal(after.highlighted.length,2,'兩錯後只亮一條建議目標段的兩端');
  const suggestion=after.highlighted.join('');
  const available=p.routes.filter(candidate=>candidate.steps.slice(0,stepIndex).every((s,i)=>JSON.stringify(s)===JSON.stringify(route.steps[i]))).map(r=>r.steps[stepIndex].result);
  assert.ok(available.includes(suggestion),'提示必須是目前仍可完成最短路的目標');
  assert.ok(after.hint.includes(name(p,suggestion)),'提示必須明確說出建議段名');
  for(const id of after.highlighted)assert.ok(after.hint.includes(name(p,id)));
  report.targetStates.push({width,problem:p.id,route:route.id,step:stepIndex+1,...after});
  if(stepIndex===0)await page.screenshot({path:resolve(output,`${p.id}-${route.id}-two-errors-${width}.png`),fullPage:true});
  // DE 之後只有 BD 可接續；首點 A 應明確教取消。
  if(p.id==='p6'&&route.id==='right'&&stepIndex===1){
    await point(page,'A');const orphan=await stateView(page);
    assert.match(orphan.hint,/再點 A 取消/);assert.match(orphan.hint,/先求 BD/);assert.deepEqual(orphan.highlighted,['A']);
    report.targetStates.push({width,problem:p.id,route:route.id,step:stepIndex+1,orphan:true,...orphan});
    await page.screenshot({path:resolve(output,`cancel-first-point-${width}.png`),fullPage:true});
    await point(page,'A');assert.equal(await stage(page),'target-start');
  }
  const actual=route.steps[stepIndex].result;
  await point(page,actual[0]);
  const first=await stateView(page);
  assert.equal(first.highlighted.length,2);assert.ok(first.highlighted.includes(actual[0]));
  assert.ok(available.includes(first.highlighted.join('')));assert.ok(first.hint.includes(name(p,first.highlighted.join(''))));
  assert.match(first.hint,/已選.*再點/);
  await point(page,actual[1]);await waitStage(page,'long');await cleanHint(page);
  if(actual!==suggestion)report.alternateRoutes.push({width,problem:p.id,route:route.id,step:stepIndex+1,suggestion,accepted:actual});
}
async function finishStep(page,s){
  if(await page.locator('#app').getAttribute('data-question')==='p1'){
    await tap(page,'.segment-label[data-segment="AC"]');assert.equal(await stage(page),'long');
    const text=await page.locator('.feedback').textContent();
    assert.match(text,/相減後留下本步目標的長段/);await cleanHint(page);
    report.feedback.push({width:page.viewportSize().width,problem:'p1',stage:'long',reason:'wrong-long',text});
    await page.screenshot({path:resolve(output,`wrong-long-${page.viewportSize().width}.png`),fullPage:true});
  }
  await tap(page,`.segment-label[data-segment="${s.long}"]`);await waitStage(page,'short');
  if(await page.locator('#app').getAttribute('data-question')==='p1'){
    await tap(page,`.segment-label[data-segment="${s.long}"]`);assert.equal(await stage(page),'short');
    const text=await page.locator('.feedback').textContent();
    assert.match(text,/共用一端.*包含在長段裡.*留下本步目標的短段/);await cleanHint(page);
    report.feedback.push({width:page.viewportSize().width,problem:'p1',stage:'short',reason:'wrong-short',text});
  }
  await tap(page,`.segment-label[data-segment="${s.short}"]`);await waitStage(page,'answer');
  for(const digit of String(s.value))await tap(page,`[data-key="${digit}"]`);
  await tap(page,'#number-form button[type="submit"]');await waitStage(page,'result-place');
  await tap(page,'[data-chip="result"]');await tap(page,`[data-slot="${s.result}"]`);
}
try{
  report.engineVersion=browser.version();
  for(const [width,height]of [[768,1024],[1024,768]])for(const advanced of problems[5].routes){
    const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true});contexts.push(context);
    const page=await context.newPage(),requests=[],errors=[];page.setDefaultTimeout(12000);
    page.on('pageerror',error=>errors.push(error.message));
    await context.addInitScript(()=>{
      const storage=window.localStorage,sentinels={'learning-task:number-line-difference:v1:aiden':'review-v1','learning-task:number-line-difference:v2:aiden':'review-v2','collection:v1:aiden':'review-collection'};
      for(const [key,value]of Object.entries(sentinels))storage.setItem(key,value);
      window.__reviewSentinels=()=>Object.fromEntries(Object.keys(sentinels).map(key=>[key,storage.getItem(key)]));
      window.__reviewExpected=sentinels;window.__reviewStorageAccesses=[];
      window.__reviewTrustedTouchTaps=0;
      document.addEventListener('pointerdown',event=>{if(event.isTrusted&&event.pointerType==='touch')window.__reviewTrustedTouchTaps++;},true);
      for(const key of ['localStorage','sessionStorage'])Object.defineProperty(window,key,{get(){window.__reviewStorageAccesses.push(key);throw Error('preview accessed '+key);}});
    });
    await context.route('**/*',async route=>{
      const url=new URL(route.request().url());requests.push(url.href);
      if(url.origin!==base||url.pathname.startsWith('/api/')||url.pathname.startsWith('/shared/'))return route.abort('blockedbyclient');
      await route.continue();
    });
    await page.goto(`${base}/number-line-difference/?preview=1`);
    const p5Route=advanced.id==='right'||advanced.id==='left-reordered'?'left':'right';
    for(const p of problems){
      await page.locator(`#app[data-question="${p.id}"]`).waitFor();await waitStage(page,'given-start');
      for(const g of p.givens){
        await point(page,g.segment[0]);await point(page,g.segment[1]);await waitStage(page,'given-value');
        await tap(page,`[data-chip="given-${g.segment}"]`);await tap(page,`[data-slot="${g.segment}"]`);
      }
      const route=p.id==='p6'?advanced:p.routes.find(r=>r.id===(p.id==='p5'?p5Route:p.preferredRoute))||p.routes[0];
      if(p.level==='beginner'){
        await feedback(page,p,p.id==='p1'?'CD':'AB','guided',width);
        await feedback(page,p,'AC','known',width);
        await page.screenshot({path:resolve(output,`${p.id}-known-${width}.png`),fullPage:true});
      }
      for(let i=0;i<route.steps.length;i++){
        const s=route.steps[i];
        if(['p5','p6'].includes(p.id)){
          await hintCheck(page,p,route,i,width);
        }else{
          await target(page,s.result);await waitStage(page,'long');
        }
        await finishStep(page,s);
      }
      await waitStage(page,'question-complete');await tap(page,'#next');
    }
    await waitStage(page,'finished');assert.equal(await page.locator('.review-item').count(),6);
    assert.match(await page.locator('#reward').textContent(),/不會讀寫/);
    assert.deepEqual(await page.evaluate(()=>window.__reviewSentinels()),await page.evaluate(()=>window.__reviewExpected));
    assert.deepEqual(await page.evaluate(()=>window.__reviewStorageAccesses),[]);assert.deepEqual(errors,[]);
    assert.equal(requests.some(address=>new URL(address).origin!==base||/\/(api|shared)\//.test(new URL(address).pathname)),false);
    const trustedTouchTaps=await page.evaluate(()=>window.__reviewTrustedTouchTaps);assert.ok(trustedTouchTaps>0);
    report.checks.push({width,height,advancedRoute:advanced.id,p5Route,sixCompleted:true,previewStorageAccesses:0,forbiddenRequests:0,trustedTouchTaps,errors});
    if(advanced.id==='right')await page.screenshot({path:resolve(output,`complete-six-${width}.png`),fullPage:true});
    await context.close();
    console.log(JSON.stringify(report.checks.at(-1)));
  }
  for(const width of [768,1024]){
    assert.equal(report.checks.filter(c=>c.width===width).length,5);
    for(const problem of ['p5','p6'])assert.ok(report.alternateRoutes.some(r=>r.width===width&&r.problem===problem),'提示以外的合法路線仍可通過');
  }
  report.ok=true;
}catch(error){
  report.ok=false;report.error=error.stack;
  for(const [i,context]of contexts.entries()){
    const page=context.pages().at(-1);if(page&&!page.isClosed())await page.screenshot({path:resolve(output,`failure-${i}.png`),fullPage:true}).catch(()=>{});
  }
  throw error;
}finally{
  await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  for(const context of contexts)await context.close().catch(()=>{});
  await browser.close();
}
