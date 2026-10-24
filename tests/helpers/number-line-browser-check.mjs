// 真 touch UI → Cookie session → localhost Worker／SQLite DO；不接正式家庭。
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const packagePath=process.env.CODEX_PLAYWRIGHT_PACKAGE || 'playwright';
const engines=createRequire(import.meta.url)(packagePath);
const base=process.argv[2] || 'http://127.0.0.1:8798';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Use isolated serve-family localhost only');
const output=resolve(process.argv[3] || '.scratch/number-line-browser');
const problems=JSON.parse(await readFile(new URL('../../learning-tasks/number-line-difference/source/problems.json',import.meta.url))).sets.pad;
await mkdir(output,{recursive:true});
const report={base,engineVersions:{playwright:createRequire(import.meta.url)(packagePath+'/package.json').version},checks:[],diagramChecks:[],coverage:{touchDrags:0,touchArcHits:0,tapPlacements:0,keyboardPlacements:0,routes:[]}};
const contexts=[],browsers=[],geometry=new WeakMap();
const rejection='任務完成時間不正確 <b data-server-message>請重新同步</b>';
const taskKey=(version,child='aiden')=>`learning-task:number-line-difference:v${version}:${child}`;
const text=(p,s)=>[...s].map(id=>p.points.find(point=>point.id===id).label).join('');
const stage=page=>page.locator('#app').getAttribute('data-stage');
const waitStage=(page,value)=>page.waitForFunction(v=>document.querySelector('#app')?.dataset.stage===v,value);
const cleanHint=async page=>assert.equal((await page.locator('#hint').textContent()).trim(),'','未達兩錯不應先給具體答案提示');
async function activate(locator,mode='tap'){if(mode==='keyboard'){await locator.focus();await locator.press('Enter');}else await locator.tap();}
async function point(page,id,mode='tap'){await activate(page.locator(`.number-line [data-point="${id}"]`),mode);}
async function number(page,value,mode='tap'){
  if(mode==='keyboard'){await page.locator('#number').focus();await page.locator('#number').press('ControlOrMeta+A');await page.locator('#number').press('Backspace');await page.locator('#number').pressSequentially(String(value));await page.locator('#number').press('Enter');}
  else{await page.locator('[data-key="清除"]').tap();for(const digit of String(value))await page.locator(`[data-key="${digit}"]`).tap();await page.locator('#number-form button[type="submit"]').tap();}
}
async function snapshot(context,child='aiden'){
  const response=await context.request.get(`${base}/api/v1/collection/${child}`);assert.equal(response.status(),200);return response.json();
}
const taskGrants=s=>s.grants.filter(g=>g.kind==='task');
async function newPage(browser,{width=768,height=1024,preview=false,child='aiden',init,deny=()=>false}={}){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true});contexts.push(context);
  const page=await context.newPage(),record={errors:[],writes:[],requests:[],blocked:[],denials:0,taskBodies:[]};page.setDefaultTimeout(12000);
  page.on('pageerror',e=>record.errors.push(e.message));
  await context.addInitScript(()=>{window.__numberLineTouchEvents=[];for(const type of ['pointerdown','pointermove','pointerup','pointercancel','click'])document.addEventListener(type,e=>{if(e.pointerType==='touch')window.__numberLineTouchEvents.push({type,trusted:e.isTrusted,target:e.target.closest('[data-point],[data-chip],[data-slot],[data-segment]')?.outerHTML.slice(0,180),stage:document.querySelector('#app')?.dataset.stage});},true);});
  if(init){if(typeof init==='function')await context.addInitScript(init);else await context.addInitScript(init.script,init.arg);}
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());record.requests.push(url.pathname+url.search);
    if(url.origin!==base){record.blocked.push(request.url());await route.abort('blockedbyclient');return;}
    if(request.method()!=='GET'&&url.pathname.startsWith('/api/'))record.writes.push({method:request.method(),path:url.pathname});
    if(url.pathname.endsWith('/task-complete')&&request.method()==='POST')record.taskBodies.push(request.postDataJSON());
    if(url.pathname===`/api/v1/collection/${child}/task-complete`&&deny()){record.denials++;await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:rejection})});return;}
    await route.continue();
  });
  await page.goto(`${base}/number-line-difference/?child=${child}&${preview?'preview=1':'k=test-token'}`);
  await page.waitForFunction(()=>document.querySelector('#app')?.dataset.stage||document.querySelector('.finish-card h1'));
  return {page,context,record,child};
}
function safeRecord(record){assert.deepEqual(record.blocked,[],'瀏覽器不得連到任何外部來源');assert.deepEqual(record.errors,[]);const illegal=record.writes.filter(r=>!['/api/v1/session','/api/v1/collection/aiden/task-complete','/api/v1/collection/bingpu/task-complete'].includes(r.path));assert.deepEqual(illegal,[]);}
async function pairInViewport(page,source,target){
  await source.waitFor({state:'visible'});await target.waitFor({state:'visible'});
  let a=await source.boundingBox(),b=await target.boundingBox();assert.ok(a&&b);
  const top=Math.min(a.y,b.y),bottom=Math.max(a.y+a.height,b.y+b.height),height=page.viewportSize().height;
  assert.ok(bottom-top<=height-20,'數字片與目標框必須同時放得進 viewport');
  await page.evaluate(({top,bottom,height})=>{if(top<10||bottom>height-10)scrollBy(0,(top+bottom-height)/2);},{top,bottom,height});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  a=await source.boundingBox();b=await target.boundingBox();
  for(const box of [a,b])assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=page.viewportSize().width+1&&box.y+box.height<=height+1,'拖曳起點、終點都須完整可見');
  return {a:{x:a.x+a.width/2,y:a.y+a.height/2},b:{x:b.x+b.width/2,y:b.y+b.height/2}};
}
async function drag(page,chip,segment,{cancel=false,empty=false}={}){
  const source=page.locator(`[data-chip="${chip}"]`),target=page.locator(`[data-slot="${segment}"]`);
  const {a,b}=await pairInViewport(page,source,target),end=empty?{x:page.viewportSize().width-8,y:page.viewportSize().height-8}:b;
  const session=await page.context().newCDPSession(page);
  const touch=(type,p)=>session.send('Input.dispatchTouchEvent',{type,touchPoints:p?[{...p,id:1}]:[]});
  try{
    await touch('touchStart',a);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));
    for(let n=1;n<=12;n++){await touch('touchMove',{x:a.x+(end.x-a.x)*n/12,y:a.y+(end.y-a.y)*n/12});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));}
    await touch(cancel?'touchCancel':'touchEnd');
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  }finally{await session.detach();}
  report.coverage.touchDrags++;
}
async function place(page,chip,segment,mode){
  if(mode==='drag')await drag(page,chip,segment);
  else{await activate(page.locator(`[data-chip="${chip}"]`),mode);await activate(page.locator(`[data-slot="${segment}"]`),mode);report.coverage[mode==='keyboard'?'keyboardPlacements':'tapPlacements']++;}
}
async function arc(page,segment,mode='tap'){
  const path=page.locator(`.arc-hit[data-segment="${segment}"]`);assert.equal(await path.count(),1,'圖上的每條已知弧線都保有可點範圍');
  if(mode==='keyboard'){await activate(page.locator(`.segment-label[data-segment="${segment}"]`),'keyboard');return;}
  await path.scrollIntoViewIfNeeded();
  const hit=await path.evaluate(el=>{
    const matrix=el.getScreenCTM(),length=el.getTotalLength();
    for(const t of [.28,.72,.18,.82,.38,.62,.48,.52]){const point=el.getPointAtLength(length*t),p=new DOMPoint(point.x,point.y).matrixTransform(matrix),actual=document.elementFromPoint(p.x,p.y);if(actual===el)return {x:p.x,y:p.y};}
    return null;
  });
  assert.ok(hit,`${segment} 必須有可直接命中的弧線，不能只靠 label`);
  await page.touchscreen.tap(hit.x,hit.y);report.coverage.touchArcHits++;
}
async function geometryCheck(page,key,{remember=true}={}){
  const check=await page.locator('.number-line').evaluate(svg=>{
    const visible=el=>{const b=el.getBBox(),s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&b.width>0&&b.height>0;};
    const labels=[...svg.querySelectorAll('.segment-label,.empty-name,.target-name,.point text,[data-slot]')].filter(visible).map(el=>{const b=el.getBBox();return {id:el.dataset.segment||el.dataset.slot||el.textContent.trim(),kind:el.matches('[data-slot]')?'slot':'label',x:b.x,y:b.y,width:b.width,height:b.height};});
    const overlaps=[];for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){const a=labels[i],b=labels[j],w=Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x),h=Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y);if(w>1.5&&h>1.5)overlaps.push({a:a.id,b:b.id,w,h});}
    const fixed={};for(const el of svg.querySelectorAll('.arc-hit,.segment-label,.baseline,.target-line,[data-slot]')){const id=el.matches('.arc-hit')?'arc:'+el.dataset.segment:el.matches('.segment-label')?'label:'+el.dataset.segment:el.matches('.baseline')?'baseline':el.matches('.target-line')?'target:'+svg.querySelector('.target-slot')?.dataset.slot:'slot:'+el.dataset.slot;const position=el.matches('.segment-label,[data-slot]')?el.querySelector('rect'):el;fixed[id]=Object.fromEntries(['d','x','y','x1','x2','y1','y2','transform'].map(a=>[a,position.getAttribute(a)]));}
    const paths=[...svg.querySelectorAll('path.arc')],textLabels=[...svg.querySelectorAll('.segment-label,.empty-name,[data-slot]')];
    const laterArcPaths=textLabels.reduce((n,label)=>n+paths.filter(path=>label.compareDocumentPosition(path)&Node.DOCUMENT_POSITION_FOLLOWING).length,0);
    return {fixed,labels,overlaps,laterArcPaths,viewBox:svg.getAttribute('viewBox'),overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert.equal(check.overflow,false,`${key} 橫向溢出`);assert.deepEqual(check.overlaps,[],`${key} 數字／端點／框互壓`);assert.equal(check.laterArcPaths,0,'所有弧線須在 label/slot 下層');
  if(remember){const atlas=geometry.get(page)||new Map(),old=atlas.get(key)||{};for(const [id,position] of Object.entries(check.fixed)){if(old[id])assert.deepEqual(position,old[id],`${key}/${id} 在同題變位`);else old[id]=position;}atlas.set(key,old);geometry.set(page,atlas);}
  return check;
}
async function twoWrong(page,run,expectedStage){
  const bounds=()=>page.evaluate(()=>({scrollY,items:[...document.querySelectorAll('.number-line .baseline,.number-line .point')].map(el=>{const b=el.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};})}));
  const before=await bounds();await cleanHint(page);await run();assert.equal(await stage(page),expectedStage);await cleanHint(page);await run();assert.equal(await stage(page),expectedStage);assert.ok((await page.locator('#hint').textContent()).trim(),'同一步兩錯後應有具體提示');
  await page.evaluate(y=>scrollTo(0,y),before.scrollY);const after=await bounds();
  (report.layoutChecks??=[]).push({viewport:page.viewportSize(),stage:expectedStage,before,after});
  assert.equal(after.items.length,before.items.length);for(let i=0;i<before.items.length;i++)for(const name of ['x','y','width','height'])assert.ok(Math.abs(before.items[i][name]-after.items[i][name])<.5,`${expectedStage} 兩錯提示使數線 ${name} 移動`);
}
async function chooseTarget(page,segment,mode='tap'){assert.equal(await stage(page),'target-start');await point(page,segment[0],mode);await waitStage(page,'target-end');await point(page,segment[1],mode);await page.waitForFunction(()=>document.querySelector('#app')?.dataset.stage!=='target-end');}
async function checkScroll(page){
  await page.evaluate(()=>scrollTo(0,0));const before=await page.evaluate(()=>scrollY),height=page.viewportSize().height;
  if(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+5))return false;
  const session=await page.context().newCDPSession(page);
  try{await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:12,y:height-100,id:1}]});for(let i=1;i<=8;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:12,y:height-100-i*35,id:1}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(500);}finally{await session.detach();}
  assert.ok(await page.evaluate(()=>scrollY)>before,'一般頁面可用 touch 手勢正常捲動');await page.evaluate(()=>scrollTo(0,0));return true;
}
async function solve(page,{mode='drag',routes={},wrong=false,reload=false,startIndex=0,stopBeforeFinish=false,prefix='',onQuestion=async()=>{}}={}){
  for(let i=startIndex;i<problems.length;i++){
    const p=problems[i],key=`${p.id}:${page.viewportSize().width}`,inputMode=mode==='keyboard'?'keyboard':'tap';
    await page.locator(`#app[data-question="${p.id}"]`).waitFor();await waitStage(page,'given-start');
    if(i===0&&wrong){await checkScroll(page);await twoWrong(page,()=>point(page,'B'),'given-start');}
    for(let g=0;g<p.givens.length;g++){
      const given=p.givens[g];await point(page,given.segment[0],inputMode);await waitStage(page,'given-end');
      if(i===0&&g===0&&reload){const before=await geometryCheck(page,key);await page.reload();await waitStage(page,'given-end');assert.equal(await page.locator('.point.selected').count(),1);assert.deepEqual((await geometryCheck(page,key)).fixed,before.fixed);}
      await point(page,given.segment[1],inputMode);await waitStage(page,'given-value');
      if(i===0&&g===0)await page.screenshot({path:resolve(output,`${prefix}known-slot-${page.viewportSize().width}.png`),fullPage:true});
      await geometryCheck(page,key);
      if(i===0&&g===0&&wrong){
        const unchanged=await page.locator(`[data-slot="${given.segment}"]`).textContent();
        await drag(page,'given-'+given.segment,given.segment,{empty:true});assert.equal(await stage(page),'given-value');assert.equal(await page.locator(`[data-slot="${given.segment}"]`).textContent(),unchanged);
        await drag(page,'given-'+given.segment,given.segment,{cancel:true});assert.equal(await stage(page),'given-value');assert.equal(await page.locator(`[data-slot="${given.segment}"]`).textContent(),unchanged);
        await twoWrong(page,()=>place(page,'given-BD',given.segment,'drag'),'given-value');
        await page.screenshot({path:resolve(output,prefix+'two-errors-chip.png'),fullPage:true});
      }
      await place(page,'given-'+given.segment,given.segment,mode);await geometryCheck(page,key);
    }
    const route=p.routes.find(r=>r.id===(routes[p.id]||p.preferredRoute))||p.routes[0];
    for(let s=0;s<route.steps.length;s++){
      const step=route.steps[s];await waitStage(page,'target-start');await cleanHint(page);
      if(i===5&&route.id==='right'&&s===1&&wrong){
        await twoWrong(page,()=>chooseTarget(page,'AC'),'target-start');assert.match(await page.locator('.feedback').textContent(),/多算一步|多做一步|超過三次/);
        await page.screenshot({path:resolve(output,prefix+'legal-extra-step.png'),fullPage:true});
      }
      await chooseTarget(page,step.result,inputMode);await waitStage(page,'long');await cleanHint(page);await geometryCheck(page,key);
      if(i===0&&wrong){await twoWrong(page,()=>arc(page,'AC'),'long');}
      await arc(page,step.long,inputMode);await waitStage(page,'short');await cleanHint(page);await geometryCheck(page,key);
      if(i===0&&wrong){await twoWrong(page,()=>arc(page,'AC'),'short');}
      await arc(page,step.short,inputMode);await waitStage(page,'answer');await cleanHint(page);await geometryCheck(page,key);
      const equation=(await page.locator('.action-card').textContent());assert.ok(equation.includes(text(p,step.long))&&equation.includes(text(p,step.short)),'算式須保留長短段身分');
      if(i===0)await page.screenshot({path:resolve(output,`${prefix}selected-operands-${page.viewportSize().width}.png`),fullPage:true});
      if(i===0&&wrong)await twoWrong(page,()=>number(page,99),'answer');
      await number(page,step.value,inputMode);await waitStage(page,'result-place');await cleanHint(page);await geometryCheck(page,key);
      if(i===0&&wrong){await twoWrong(page,()=>activate(page.locator(`[data-slot="${step.result}"]`)),'result-place');}
      await place(page,'result',step.result,mode);assert.notEqual(await stage(page),'result-place');await geometryCheck(page,key);
      if(reload&&i===2&&s===0){const before=await geometryCheck(page,key);await page.reload();await waitStage(page,'target-start');assert.deepEqual((await geometryCheck(page,key)).fixed,before.fixed);}
    }
    await waitStage(page,'question-complete');assert.match(await page.locator('#instruction').textContent(),new RegExp(`${p.answer}`));
    await onQuestion(i);const checks=await geometryCheck(page,key);report.diagramChecks.push({viewport:page.viewportSize(),problem:p.id,route:route.id,mode,...checks});
    if(i>=4)report.coverage.routes.push({width:page.viewportSize().width,mode,problem:p.id,route:route.id});
    if(i===5){await page.screenshot({path:resolve(output,`${prefix}advanced-${page.viewportSize().width}.png`),fullPage:true});if(stopBeforeFinish)return;}
    await activate(page.locator('#next'),inputMode);
  }
  await page.locator('.finish-card h1').filter({hasText:'畫線、相減'}).waitFor();
}
async function rejected(page){
  await page.waitForFunction(message=>document.querySelector('#reward')?.textContent.includes(message),rejection);
  assert.equal(await page.locator('.review-item').count(),6);assert.equal(await page.locator('#reward.pending').count(),0);
  const saved=await page.evaluate(key=>localStorage.getItem(key),taskKey(2,new URL(page.url()).searchParams.get('child')));
  await page.locator('[data-review="5"]').tap();await page.locator('#close-review').tap();
  assert.match(await page.locator('#reward').textContent(),/任務完成時間不正確/);assert.equal(await page.locator('[data-server-message]').count(),0);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),taskKey(2,new URL(page.url()).searchParams.get('child'))),saved);
}
// Frozen v1 protocol：不匯入新版 engine 來生成舊資料，避免測試與移轉實作互相附和。
function legacyLog(count,{partial=false,finish=true}={}){
  const log=[],send=(type,value)=>log.push({type,value});
  for(let i=0;i<count;i++){const p=problems[i];for(const g of p.givens){send('point',g.segment[0]);send('point',g.segment[1]);send('number',g.length);}const route=p.routes.find(r=>r.id===p.preferredRoute)||p.routes[0];for(const s of route.steps){send('segment',s.long);send('segment',s.short);send('number',s.value);send('point',s.result[0]);send('point',s.result[1]);send('number',s.value);}if(i<count-1||count<6||finish)send('next','');}
  if(partial)send('point',problems[count].givens[0].segment[0]);return {version:1,log};
}
async function migrationChecks(browser){
  const partial=JSON.stringify(legacyLog(2,{partial:true}));
  async function seeded(value,legacy){
    return newPage(browser,{init:{script:({value,legacy})=>{if(sessionStorage.getItem('number-line-qa-seeded'))return;if(value!==null)localStorage.setItem('learning-task:number-line-difference:v2:aiden',value);if(legacy!==null)localStorage.setItem('learning-task:number-line-difference:v1:aiden',legacy);sessionStorage.setItem('number-line-qa-seeded','1');},arg:{value,legacy}}});
  }
  const {page}=await seeded(null,partial);await waitStage(page,'given-start');assert.match(await page.locator('h1').textContent(),/乙丙/);assert.equal(await page.locator('progress').getAttribute('value'),'2');assert.match(await page.locator('body').textContent(),/保留完成題.*重新標圖/);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),taskKey(1)),partial);assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).version,taskKey(2)),2);
  await page.screenshot({path:resolve(output,'v1-partial-migration.png'),fullPage:true});await point(page,'A');await page.reload();await waitStage(page,'given-end');assert.equal(await page.evaluate(key=>localStorage.getItem(key),taskKey(1)),partial);
  const full=JSON.stringify(legacyLog(6));const finished=await seeded(null,full);await finished.page.locator('#reward').waitFor();assert.equal(await finished.page.locator('.review-item').count(),6);assert.equal(await finished.page.evaluate(key=>localStorage.getItem(key),taskKey(1)),full);
  const before=await snapshot(finished.context);await finished.page.waitForFunction(()=>document.querySelector('#reward').textContent.includes('已存入收藏'));const after=await snapshot(finished.context);assert.deepEqual(taskGrants(after),taskGrants(before),'v1 完成與已有首次包不重發');
  for(const invalid of [JSON.stringify({version:99,log:[]}),JSON.stringify({version:2,log:'broken'}),'{broken-json','null']){
    const unknown=await seeded(invalid,partial);await unknown.page.getByText('這份進度是其他版本儲存的',{exact:false}).waitFor();assert.equal(await unknown.page.locator('[data-point]').count(),0);assert.equal(await unknown.page.locator('#restart').isVisible(),false);assert.equal(await unknown.page.evaluate(key=>localStorage.getItem(key),taskKey(2)),invalid);assert.equal(await unknown.page.evaluate(key=>localStorage.getItem(key),taskKey(1)),partial);await unknown.page.reload();await unknown.page.getByText('這份進度是其他版本儲存的',{exact:false}).waitFor();assert.equal(await unknown.page.evaluate(key=>localStorage.getItem(key),taskKey(2)),invalid);
  }
  report.checks.push({migration:true,partialCompleted:2,currentQuestionReset:true,v1Unchanged:true,fullCompleted:6,existingGrantPreserved:true,unknownV2Preserved:4});
}
async function previewChecks(browser,width,height,route,{keyboard=false,prefix=''}={}){
  const h=await newPage(browser,{width,height,preview:true,init:()=>{
    const storage=window.localStorage,values={'learning-task:number-line-difference:v1:aiden':'preview-v1-sentinel','learning-task:number-line-difference:v2:aiden':'preview-v2-sentinel','collection:v1:aiden':'preview-collection-sentinel'};
    for(const [key,value]of Object.entries(values))storage.setItem(key,value);
    window.__readPreviewSentinels=()=>Object.fromEntries(Object.keys(values).map(key=>[key,storage.getItem(key)]));window.__previewExpected=values;window.__previewStorageAccesses=[];
    for(const name of ['localStorage','sessionStorage'])Object.defineProperty(window,name,{get(){window.__previewStorageAccesses.push(name);throw Error('Preview accessed '+name);}});
  }});
  await solve(h.page,{mode:keyboard?'keyboard':'tap',wrong:process.env.NUMBER_LINE_PROBE_WRONG==='1',routes:{p5:width===768?'right':'left',p6:route},prefix});assert.match(await h.page.locator('#reward').textContent(),/不會讀寫/);
  assert.deepEqual(await h.page.evaluate(()=>window.__readPreviewSentinels()),await h.page.evaluate(()=>window.__previewExpected));assert.deepEqual(await h.page.evaluate(()=>window.__previewStorageAccesses),[]);
  assert.equal(h.record.requests.some(path=>path.startsWith('/api/')||path.startsWith('/shared/')),false);
  for(const name of ['transition','independent','answers']){const response=await h.context.request.get(`${base}/number-line-difference/print/${name}.pdf`);assert.equal(response.status(),200);assert.equal((await response.body()).subarray(0,5).toString(),'%PDF-');}
  await h.page.screenshot({path:resolve(output,`${prefix}preview-finish-${width}.png`),fullPage:true});safeRecord(h.record);report.checks.push({preview:true,engine:keyboard?'webkit':'chromium',width,height,mode:keyboard?'keyboard':'tap',completeSix:true,storageAccesses:0,v1V2CollectionSentinelsUnchanged:true,forbiddenRequests:[],pdfs:3});
}
try{
  const browser=await engines.chromium.launch({headless:true});browsers.push(browser);report.engineVersions.chromium=browser.version();
  if(process.env.NUMBER_LINE_FORMAT_ONLY==='1')await migrationChecks(browser);
  else if(process.env.NUMBER_LINE_QUICK==='1'){
    if(process.env.NUMBER_LINE_QUICK_WIDTH!=='1024')await previewChecks(browser,768,1024,'outer',{prefix:'quick-768-'});if(process.env.NUMBER_LINE_QUICK_WIDTH!=='768')await previewChecks(browser,1024,768,'left',{prefix:'quick-1024-'});
  }else{
  let firstTaskBody;
  for(const [width,height]of [[768,1024],[1024,768]]){
    let denyTask=false;const h=await newPage(browser,{width,height,deny:()=>denyTask}),{page,context,record}=h;
    const baseline=await snapshot(context),before=taskGrants(baseline).length;
    await solve(page,{mode:'drag',routes:width===768?{p5:'left',p6:'left-reordered'}:{p5:'right',p6:'left-chain'},wrong:true,reload:true,stopBeforeFinish:true,prefix:`drag-${width}-`,onQuestion:async()=>assert.equal(taskGrants(await snapshot(context)).length,before,'題內不能發任務包')});
    const touchEvents=await page.evaluate(()=>window.__numberLineTouchEvents);assert.ok(touchEvents.some(e=>e.type==='pointermove'&&e.trusted),'須有真正 browser touch pointermove');
    assert.equal(taskGrants(await snapshot(context)).length,before,'結束畫面就緒前不能發包');
    if(width===768)await context.request.get(base+'/test/mode?offline=1');await page.locator('#next').tap();await page.locator('#reward').waitFor();
    if(width===768){await page.waitForFunction(()=>document.querySelector('#reward').textContent.includes('等待同步'));await page.screenshot({path:resolve(output,'offline-pending.png'),fullPage:true});denyTask=true;await context.request.get(base+'/test/mode?offline=0');await page.evaluate(()=>window.dispatchEvent(new Event('online')));await rejected(page);assert.ok(record.denials>0);assert.equal(taskGrants(await snapshot(context)).length,0);await page.screenshot({path:resolve(output,'auto-flush-rejected-768.png'),fullPage:true});denyTask=false;await page.locator('#retry').tap();}
    await page.waitForFunction(()=>document.querySelector('#reward').textContent.includes('已存入收藏'));const after=await snapshot(context);assert.equal(taskGrants(after).length,1);assert.equal(taskGrants(after)[0].id,'task:number-line-difference:first');assert.equal(after.daily.earned,baseline.daily.earned);
    if(width===768)firstTaskBody=record.taskBodies.at(-1);
    assert.ok(firstTaskBody,'至少一次真正 UI 完成命令送進 Worker');
    const duplicate=await context.request.post(`${base}/api/v1/collection/aiden/task-complete`,{headers:{Origin:base},data:width===768?firstTaskBody:{...firstTaskBody,commandId:'qa-second-device-'+crypto.randomUUID()}});assert.equal(duplicate.status(),200);const duplicateBody=await duplicate.json();assert.equal(duplicateBody.duplicate,true);assert.equal(taskGrants(duplicateBody.snapshot).length,1);assert.equal(duplicateBody.snapshot.daily.earned,baseline.daily.earned);
    await page.reload();await page.waitForFunction(()=>document.querySelector('#reward')?.textContent.includes('已存入收藏'));await page.locator('[data-review="5"]').tap();assert.equal(await page.locator('path.arc').count(),7);await geometryCheck(page,`p6:${width}`);await page.locator('#close-review').tap();
    await page.screenshot({path:resolve(output,`finish-${width}.png`),fullPage:true});await page.locator('#finish-restart').tap();await page.locator('#confirm-restart').tap();await waitStage(page,'given-start');assert.equal(taskGrants(await snapshot(context)).length,1);
    safeRecord(record);
    report.checks.push({flow:'child-drag',width,height,completeSix:true,reload:true,restart:true,taskGrants:1,dailyEarned:after.daily.earned,cookieSession:true,realWorkerSQLite:true,realTouch:true,offlinePending:width===768,automatic400:width===768,writes:record.writes});
  }
  let denyDirect=true;const direct=await newPage(browser,{child:'bingpu',deny:()=>denyDirect});
  await solve(direct.page,{mode:'tap',routes:{p5:'left',p6:'right'},wrong:true,prefix:'direct-rejection-'});await rejected(direct.page);assert.ok(direct.record.denials>0);assert.equal(taskGrants(await snapshot(direct.context,'bingpu')).length,0);await direct.page.screenshot({path:resolve(output,'direct-rejected-768.png'),fullPage:true});
  denyDirect=false;await direct.page.locator('#retry').tap();await direct.page.waitForFunction(()=>document.querySelector('#reward').textContent.includes('已存入收藏'));await direct.page.reload();await direct.page.waitForFunction(()=>document.querySelector('#reward')?.textContent.includes('已存入收藏'));const recovered=await snapshot(direct.context,'bingpu');assert.equal(taskGrants(recovered).length,1);assert.equal(recovered.daily.earned,0);safeRecord(direct.record);await direct.page.screenshot({path:resolve(output,'direct-recovered-768.png'),fullPage:true});report.checks.push({flow:'direct-rejection',status:400,sixCompletedPreserved:true,escapedReason:true,retryRealWorker:true,reload:true,taskGrants:1});
  await previewChecks(browser,768,1024,'outer',{prefix:'tap-768-'});await previewChecks(browser,1024,768,'left',{prefix:'tap-1024-'});
  assert.deepEqual([...new Set(report.coverage.routes.filter(x=>x.problem==='p6').map(x=>x.route))].sort(),problems[5].routes.map(x=>x.id).sort(),'browser 必須走過全部五條進階最短路');
  assert.deepEqual([...new Set(report.coverage.routes.filter(x=>x.problem==='p5').map(x=>x.route))].sort(),['left','right'],'browser 必須走過中階自選左右兩路');
  await migrationChecks(browser);
  const home=await contexts[0].newPage();await home.goto(base+'/?child=aiden');await home.locator('[data-learning-task="number-line-difference"]').waitFor();assert.match(await home.locator('[data-learning-task="number-line-difference"]').getAttribute('href'),/number-line-difference\/\?child=aiden/);await home.screenshot({path:resolve(output,'home-aiden.png'),fullPage:true});await home.goto(base+'/?child=bingpu');await home.locator('.family-header').waitFor();assert.equal(await home.locator('[data-learning-task="number-line-difference"]').count(),0);report.checks.push({home:true,aidenVisible:true,bingpuHidden:true});
  }
  if(process.env.NUMBER_LINE_WEBKIT==='1'){const webkit=await engines.webkit.launch({headless:true});browsers.push(webkit);report.engineVersions.webkit=webkit.version();await previewChecks(webkit,768,1024,'outer',{keyboard:true,prefix:'webkit-keyboard-'});}
  report.ok=true;await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({ok:true,checks:report.checks.length,coverage:report.coverage,output}));
}catch(error){report.ok=false;report.error=error.stack;for(const [i,context]of contexts.entries()){const page=context.pages().at(-1);if(page&&!page.isClosed()){await page.screenshot({path:resolve(output,`failure-${i}.png`),fullPage:true}).catch(()=>{});report.failureInputs=await page.evaluate(()=>({stage:document.querySelector('#app')?.dataset.stage,events:window.__numberLineTouchEvents})).catch(()=>null);}}await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');throw error;}
finally{for(const context of contexts)await context.close().catch(()=>{});for(const browser of browsers)await browser.close();}
