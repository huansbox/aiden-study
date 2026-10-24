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
async function capture(page,options){await page.waitForTimeout(400);return page.screenshot(options);}
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
function safeRecord(record){assert.deepEqual(record.blocked,[],'瀏覽器不得連到任何外部來源');assert.deepEqual(record.errors,[]);const illegal=record.writes.filter(r=>!['/api/v1/session','/api/v1/collection/aiden/task-complete','/api/v1/collection/bingpu/task-complete'].includes(r.path));assert.deepEqual(illegal,[]);report.receipts??=[];report.receipts.push(record);}
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
async function chooseTarget(page,segment,mode='tap'){
  assert.equal(await stage(page),'target-start');await point(page,segment[0],mode);await waitStage(page,'target-end');
  const questionId=await page.locator('#app').getAttribute('data-question'),p=problems.find(p=>p.id===questionId);
  // 宣告的導引路線應在首端點選完後繼續顯示本步目標；自選題則仍讓孩子決定。
  if(p){
    const currentNames=await page.locator('#instruction .current-target').allTextContents();
    if(p.preferredRoute||p.level==='beginner'){
      const stepIndex=await page.locator('.work .written-equation').count(),route=p.routes.find(r=>r.id===p.preferredRoute)||p.routes[0];
      assert.ok(currentNames.includes(text(p,route.steps[stepIndex].result)),'target-end 仍明示並框出導引目標');
    }else assert.deepEqual(currentNames,[],'自選題第一端點不能先揭示路線');
  }
  await point(page,segment[1],mode);await page.waitForFunction(()=>document.querySelector('#app')?.dataset.stage!=='target-end');
}
async function checkScroll(page){
  await page.evaluate(()=>scrollTo(0,0));const before=await page.evaluate(()=>scrollY),height=page.viewportSize().height;
  if(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+5))return false;
  const session=await page.context().newCDPSession(page);
  try{await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:12,y:height-100,id:1}]});for(let i=1;i<=8;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:12,y:height-100-i*35,id:1}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(500);}finally{await session.detach();}
  assert.ok(await page.evaluate(()=>scrollY)>before,'一般頁面可用 touch 手勢正常捲動');await page.evaluate(()=>scrollTo(0,0));return true;
}
// 教學契約以實際 DOM 驗證：本步目標、原因、空框與自動回填都必須看得見。
async function teachingCheck(page,p,step,{completed=false}={}){
  const view=await page.evaluate(()=>({
    why:document.querySelector('.why')?.textContent.trim(),
    whyLabel:document.querySelector('.why')?.getAttribute('aria-label'),
    current:[...document.querySelectorAll('.current-target')].map(el=>({text:el.textContent.trim(),border:getComputedStyle(el).borderStyle,background:getComputedStyle(el).backgroundColor,shadow:getComputedStyle(el).boxShadow})),
    final:document.querySelector('.final-target')?.textContent.trim(),
    slots:[...document.querySelectorAll('.equation-slot')].map(el=>({text:el.textContent.trim(),border:getComputedStyle(el).borderStyle,width:el.getBoundingClientRect().width})),
    resultChips:document.querySelectorAll('[data-chip="result"],.result-chip').length,
  }));
  if(p.level==='intermediate'){
    assert.ok(view.why&&view.why.length>8,`${p.id} 必須有可見的先求原因`);
    assert.equal(view.whyLabel,'為什麼先求這一段');
    assert.ok(view.why.includes(text(p,p.target)),'原因必須連回最終目標');
    const route=p.routes.find(route=>route.steps.some(s=>s.long===step.long&&s.short===step.short)),last=route.steps.at(-1);
    if(!(completed&&step.result===p.target)){
      assert.ok(view.why.includes(`從 ${text(p,last.long)} 拿掉 ${text(p,last.short)}`),'先求原因要說明最後相減的兩段');
      if(completed)assert.match(view.why,/已算出來.*下一步.*回來找/,'中間段完成後要回扣下一步如何找到最終目標');
    }
  }
  assert.ok(view.current.some(item=>item.text.includes(text(p,step.result))),`${p.id} 本步段名需有外框`);
  assert.ok(view.current.some(item=>item.border!=='none'||item.shadow!=='none'||item.background!=='rgba(0, 0, 0, 0)'),`${p.id} 目標需有視覺區別`);
  assert.ok(view.final?.includes(text(p,p.target)),`${p.id} 最終目標需明確`);
  assert.equal(view.resultChips,0,'新流程不能出現 result-chip');
  if(!completed&&await stage(page)==='long'){
    assert.equal(view.slots.length,2);assert.ok(view.slots.every(slot=>slot.text===''&&slot.border!=='none'&&slot.width>=40),'選長段前保留兩個可見空框');
  }
  if(completed){
    const result=page.locator(`.segment-label[data-segment="${step.result}"]`);
    assert.ok((await result.textContent()).includes(String(step.value)),'答對即自動填回圖');
    assert.equal(await result.locator('xpath=..').getAttribute('class').then(c=>c.includes('updated')),true,'自動回填需亮出新弧');
    assert.equal(await page.locator(`[data-slot="${step.result}"]`).count(),0,'自動回填後不能留下結果空框');
    assert.equal(await page.locator('#next').isVisible(),true,'答對停步後需由孩子按下一步');
  }
  report.teachingChecks??=[];report.teachingChecks.push({width:page.viewportSize().width,problem:p.id,result:step.result,completed,...view});
  return view;
}
async function targetHintCheck(page,p,chosen,mode){
  await cleanHint(page);
  const wrong=()=>chooseTarget(page,p.givens[0].segment,mode);
  await wrong();await cleanHint(page);await wrong();
  const hinted=await page.evaluate(()=>({text:document.querySelector('#hint').textContent,points:[...document.querySelectorAll('.point.hinted')].map(e=>e.dataset.point).sort()}));
  assert.equal(hinted.points.length,2);assert.ok(hinted.text.includes(text(p,hinted.points.join(''))),'兩錯才說出具體建議段名');
  report.coverage.targetHints??=[];report.coverage.targetHints.push({problem:p.id,width:page.viewportSize().width,suggested:hinted.points.join(''),chosen});
  if(p.id==='p5'&&chosen!==hinted.points.join(''))report.coverage.alternateAfterHint=true;
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
      if(i===0&&g===0)await capture(page,{path:resolve(output,`${prefix}known-slot-${page.viewportSize().width}.png`),fullPage:true});
      await geometryCheck(page,key);
      if(i===0&&g===0&&wrong){
        const unchanged=await page.locator(`[data-slot="${given.segment}"]`).textContent();
        await drag(page,'given-'+given.segment,given.segment,{empty:true});assert.equal(await stage(page),'given-value');assert.equal(await page.locator(`[data-slot="${given.segment}"]`).textContent(),unchanged);
        await drag(page,'given-'+given.segment,given.segment,{cancel:true});assert.equal(await stage(page),'given-value');assert.equal(await page.locator(`[data-slot="${given.segment}"]`).textContent(),unchanged);
        await twoWrong(page,()=>place(page,'given-BD',given.segment,'drag'),'given-value');
      }
      await place(page,'given-'+given.segment,given.segment,mode);await geometryCheck(page,key);
    }
    const route=p.routes.find(r=>r.id===(routes[p.id]||p.preferredRoute))||p.routes[0];
    for(let index=0;index<route.steps.length;index++){
      const step=route.steps[index];await waitStage(page,'target-start');await cleanHint(page);
      if(wrong&&index===0&&['p3','p4','p5'].includes(p.id))await targetHintCheck(page,p,step.result,inputMode);
      await chooseTarget(page,step.result,inputMode);await waitStage(page,'long');await cleanHint(page);await geometryCheck(page,key);
      await teachingCheck(page,p,step);
      if(p.id==='p4'&&index===0)await capture(page,{path:resolve(output,`${prefix}p4-why-before-${page.viewportSize().width}.png`),fullPage:true});
      if(p.id==='p5')await capture(page,{path:resolve(output,`${prefix}p5-${route.id}-step${index+1}-target-${page.viewportSize().width}.png`),fullPage:true});
      if(i===0&&wrong)await twoWrong(page,()=>arc(page,'AC'),'long');
      await arc(page,step.long,inputMode);await waitStage(page,'short');await cleanHint(page);await geometryCheck(page,key);
      if(i===0&&wrong)await twoWrong(page,()=>arc(page,'AC'),'short');
      await arc(page,step.short,inputMode);await waitStage(page,'answer');await cleanHint(page);await geometryCheck(page,key);
      const equation=await page.locator('.action-card').textContent();assert.ok(equation.includes(text(p,step.long))&&equation.includes(text(p,step.short)),'算式須保留長短段身分');
      if(i===0&&wrong)await twoWrong(page,()=>number(page,99),'answer');
      await number(page,step.value,inputMode);await waitStage(page,'step-complete');await cleanHint(page);await geometryCheck(page,key);
      await teachingCheck(page,p,step,{completed:true});
      if(p.id==='p4'&&index===0)await capture(page,{path:resolve(output,`${prefix}p4-why-after-${page.viewportSize().width}.png`),fullPage:true});
      if(reload&&i===2&&index===0){const before=await geometryCheck(page,key);await page.reload();await waitStage(page,'step-complete');await teachingCheck(page,p,step,{completed:true});assert.deepEqual((await geometryCheck(page,key)).fixed,before.fixed);}
      await onQuestion(i,index);
      if(index===route.steps.length-1){
        assert.match(await page.locator('#instruction').textContent(),new RegExp(`${p.answer}`));
        const checks=await geometryCheck(page,key);report.diagramChecks.push({viewport:page.viewportSize(),problem:p.id,route:route.id,mode,...checks});
        report.coverage.routes.push({width:page.viewportSize().width,mode,problem:p.id,route:route.id});
        if(i===problems.length-1&&stopBeforeFinish)return;
      }
      await activate(page.locator('#next'),inputMode);
    }
  }
  await waitStage(page,'finished');assert.equal(await page.locator('.review-item').count(),5);
}
async function rejected(page){
  await page.waitForFunction(message=>document.querySelector('#reward')?.textContent.includes(message),rejection);
  assert.equal(await page.locator('.review-item').count(),5);assert.equal(await page.locator('#reward.pending').count(),0);
  const key=taskKey(3,new URL(page.url()).searchParams.get('child')),saved=await page.evaluate(key=>localStorage.getItem(key),key);
  await page.locator('[data-review="4"]').tap();await page.locator('#close-review').tap();
  assert.match(await page.locator('#reward').textContent(),/任務完成時間不正確/);assert.equal(await page.locator('[data-server-message]').count(),0);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),saved);
}
// Frozen v1/v2 wire protocols：只產生歷史事件，不呼叫新版狀態機。
const legacySixth={givens:[{segment:'AE',length:14},{segment:'BE',length:11},{segment:'AD',length:12},{segment:'CD',length:5}],routes:[{id:'left',steps:[{long:'AE',short:'BE',result:'AB',value:3},{long:'AD',short:'CD',result:'AC',value:7},{long:'AC',short:'AB',result:'BC',value:4}]}],preferredRoute:'left'};
function legacyLog(version,count,{partial=false,resultPlace=false,finish=true}={}){
  const log=[],send=(type,value)=>log.push({type,value}),old=[...problems,legacySixth];
  for(let i=0;i<count;i++){
    const p=old[i];for(const g of p.givens){send('point',g.segment[0]);send('point',g.segment[1]);if(version===1)send('number',g.length);else{send('chip','given-'+g.segment);send('place',g.segment);}}
    const route=p.routes.find(r=>r.id===p.preferredRoute)||p.routes[0];
    for(const s of route.steps){
      if(version===2){send('point',s.result[0]);send('point',s.result[1]);}
      send('segment',s.long);send('segment',s.short);send('number',s.value);
      if(resultPlace&&i===count-1)return {version,log};
      if(version===1){send('point',s.result[0]);send('point',s.result[1]);send('number',s.value);}else{send('chip','result');send('place',s.result);}
    }
    if(i<count-1||finish)send('next','');
  }
  if(partial)send('point',old[count].givens[0].segment[0]);return {version,log};
}
async function migrationChecks(browser){
  async function seeded(current=null,v2=null,v1=null){return newPage(browser,{init:{script:({current,v2,v1})=>{if(sessionStorage.getItem('number-line-qa-seeded'))return;for(const [version,value]of [[3,current],[2,v2],[1,v1]])if(value!==null)localStorage.setItem(`learning-task:number-line-difference:v${version}:aiden`,value);sessionStorage.setItem('number-line-qa-seeded','1');},arg:{current,v2,v1}}});}
  for(const version of [1,2]){
    const legacy=JSON.stringify(legacyLog(version,2,{partial:true})),h=await seeded(null,version===2?legacy:null,version===1?legacy:null);
    await pageReady(h.page);await waitStage(h.page,version===1?'given-start':'given-end');assert.equal(await h.page.locator('progress').getAttribute('value'),'2');assert.equal(await h.page.locator('#app').getAttribute('data-question'),'p3');
    assert.equal(await h.page.evaluate(key=>localStorage.getItem(key),taskKey(version)),legacy);assert.equal(await h.page.evaluate(key=>JSON.parse(localStorage.getItem(key)).version,taskKey(3)),3);
    if(version===1)await point(h.page,'A');await h.page.reload();await waitStage(h.page,'given-end');assert.equal(await h.page.evaluate(key=>localStorage.getItem(key),taskKey(version)),legacy);
    report.checks.push({migration:`v${version}-partial`,completed:2,legacyUnchanged:true,v3Resume:true});safeRecord(h.record);
  }
  for(const count of [1,3]){
    const resultPlace=JSON.stringify(legacyLog(2,count,{resultPlace:true})),pending=await seeded(null,resultPlace),p=problems[count-1],step=p.routes[0].steps[0];
    await waitStage(pending.page,'step-complete');assert.equal(await pending.page.locator('#app').getAttribute('data-question'),p.id);await teachingCheck(pending.page,p,step,{completed:true});
    assert.equal(await pending.page.evaluate(key=>localStorage.getItem(key),taskKey(2)),resultPlace);await pending.page.locator('#next').tap();
    await waitStage(pending.page,count===1?'given-start':'target-start');assert.equal(await pending.page.locator('#app').getAttribute('data-question'),count===1?'p2':'p3');
    report.checks.push({migration:'v2-result-place',problem:p.id,autoFilled:true,explicitNext:true,legacyUnchanged:true});safeRecord(pending.record);
  }
  for(const [version,count,label]of [[2,5,'at-p6'],[2,6,'finished-six'],[1,6,'v1-finished-six']]){
    const legacy=JSON.stringify(legacyLog(version,count)),h=await seeded(null,version===2?legacy:null,version===1?legacy:null);
    await waitStage(h.page,'finished');await h.page.waitForFunction(()=>document.querySelector('#reward').textContent.includes('已存入收藏'));assert.equal(await h.page.locator('.review-item').count(),5);
    assert.equal(await h.page.evaluate(key=>localStorage.getItem(key),taskKey(version)),legacy);assert.equal(taskGrants(await snapshot(h.context)).length,1);
    report.checks.push({migration:label,version,reviewCount:5,legacyUnchanged:true,taskGrants:1});safeRecord(h.record);
  }
  const fallback=JSON.stringify(legacyLog(1,2));
  for(const invalid of [JSON.stringify({version:99,log:[]}),JSON.stringify({version:3,log:'broken'}),'{broken-json','null']){
    const h=await seeded(invalid,null,fallback);await waitStage(h.page,'unavailable');assert.equal(await h.page.locator('[data-point]').count(),0);assert.equal(await h.page.locator('#restart').isVisible(),false);
    for(let i=0;i<2;i++){assert.equal(await h.page.evaluate(key=>localStorage.getItem(key),taskKey(3)),invalid);assert.equal(await h.page.evaluate(key=>localStorage.getItem(key),taskKey(1)),fallback);await h.page.reload();await waitStage(h.page,'unavailable');}
    report.checks.push({migration:'unknown-v3-protected',invalid,unchanged:true});safeRecord(h.record);
  }
}
async function pageReady(page){await page.waitForFunction(()=>document.querySelector('#app')?.dataset.stage);}
async function previewChecks(browser,width,height,route,{keyboard=false,prefix=''}={}){
  const h=await newPage(browser,{width,height,preview:true,init:()=>{
    const storage=window.localStorage,values={'learning-task:number-line-difference:v1:aiden':'preview-v1','learning-task:number-line-difference:v2:aiden':'preview-v2','learning-task:number-line-difference:v3:aiden':'preview-v3','collection:v1:aiden':'preview-collection'};
    for(const [key,value]of Object.entries(values))storage.setItem(key,value);
    document.cookie='qa_preview_sentinel=unchanged; path=/';const cookie=document.cookie;
    window.__readPreviewSentinels=()=>Object.fromEntries(Object.keys(values).map(key=>[key,storage.getItem(key)]));window.__previewExpected=values;window.__previewCookie=cookie;window.__previewStorageAccesses=[];window.__previewCookieAccesses=[];
    for(const name of ['localStorage','sessionStorage'])Object.defineProperty(window,name,{get(){window.__previewStorageAccesses.push(name);throw Error('Preview accessed '+name);}});
    const descriptor=Object.getOwnPropertyDescriptor(Document.prototype,'cookie');
    Object.defineProperty(document,'cookie',{get(){window.__previewCookieAccesses.push('get');return descriptor.get.call(document);},set(value){window.__previewCookieAccesses.push('set');descriptor.set.call(document,value);}});
  }});
  const cookies=await h.context.cookies();await solve(h.page,{mode:keyboard?'keyboard':'tap',routes:{p5:route},prefix});assert.match(await h.page.locator('#reward').textContent(),/不會讀寫/);
  assert.deepEqual(await h.page.evaluate(()=>window.__readPreviewSentinels()),await h.page.evaluate(()=>window.__previewExpected));assert.deepEqual(await h.page.evaluate(()=>window.__previewStorageAccesses),[]);assert.deepEqual(await h.page.evaluate(()=>window.__previewCookieAccesses),[]);assert.deepEqual(await h.context.cookies(),cookies);
  assert.equal(h.record.requests.some(path=>path.startsWith('/api/')||path.startsWith('/shared/')),false);
  for(const name of ['transition','independent','answers']){const response=await h.context.request.get(`${base}/number-line-difference/print/${name}.pdf`);assert.equal(response.status(),200);assert.equal((await response.body()).subarray(0,5).toString(),'%PDF-');}
  await capture(h.page,{path:resolve(output,`${prefix}preview-finish-${width}.png`),fullPage:true});safeRecord(h.record);report.checks.push({preview:true,engine:keyboard?'webkit':'chromium',width,height,mode:keyboard?'keyboard':'tap',completeFive:true,storageAccesses:0,cookieAccesses:0,forbiddenRequests:[],pdfs:3});
}
async function scrollChecks(browser){for(const [width,height]of [[768,1024],[1024,768]]){const h=await newPage(browser,{width,height,init:{script:legacy=>localStorage.setItem('learning-task:number-line-difference:v2:aiden',legacy),arg:JSON.stringify(legacyLog(2,6))}});await waitStage(h.page,'finished');assert.equal(await checkScroll(h.page),true,'五題總覽溢出時仍可原生touch捲動');assert.equal(await stage(h.page),'finished');safeRecord(h.record);report.checks.push({nativePageScroll:true,width,height,statePreserved:true});}}
try{
  assert.equal(problems.length,5);assert.deepEqual(problems.map(p=>p.id),['p1','p2','p3','p4','p5']);
  const browser=await engines.chromium.launch({headless:true});browsers.push(browser);report.engineVersions.chromium=browser.version();
  if(process.env.NUMBER_LINE_FORMAT_ONLY==='1')await migrationChecks(browser);
  else if(process.env.NUMBER_LINE_SCROLL_ONLY==='1')await scrollChecks(browser);
  else if(process.env.NUMBER_LINE_QUICK==='1'){
    if(process.env.NUMBER_LINE_QUICK_WIDTH!=='1024')await previewChecks(browser,768,1024,'right',{prefix:'quick-768-'});
    if(process.env.NUMBER_LINE_QUICK_WIDTH!=='768')await previewChecks(browser,1024,768,'left',{prefix:'quick-1024-'});
  }else{
    let firstTaskBody;
    for(const [width,height]of [[768,1024],[1024,768]]){
      let denyTask=false;const h=await newPage(browser,{width,height,deny:()=>denyTask}),{page,context,record}=h;
      const baseline=await snapshot(context),before=taskGrants(baseline).length;
      await solve(page,{mode:'drag',routes:{p5:width===768?'right':'left'},wrong:true,reload:true,stopBeforeFinish:true,prefix:`drag-${width}-`,onQuestion:async()=>assert.equal(taskGrants(await snapshot(context)).length,before,'題內不能發任務包')});
      const touchEvents=await page.evaluate(()=>window.__numberLineTouchEvents);assert.ok(touchEvents.some(e=>e.type==='pointermove'&&e.trusted),'須有真正 browser touch pointermove');
      assert.equal(taskGrants(await snapshot(context)).length,before,'結束畫面就緒前不能發包');
      if(width===768)await context.request.get(base+'/test/mode?offline=1');await page.locator('#next').tap();await page.locator('#reward').waitFor();
      if(width===768){await page.waitForFunction(()=>document.querySelector('#reward').textContent.includes('等待同步'));await capture(page,{path:resolve(output,'offline-pending.png'),fullPage:true});denyTask=true;await context.request.get(base+'/test/mode?offline=0');await page.evaluate(()=>window.dispatchEvent(new Event('online')));await rejected(page);assert.ok(record.denials>0);assert.equal(taskGrants(await snapshot(context)).length,0);await capture(page,{path:resolve(output,'auto-flush-rejected-768.png'),fullPage:true});denyTask=false;await page.locator('#retry').tap();}
      await page.waitForFunction(()=>document.querySelector('#reward').textContent.includes('已存入收藏'));const after=await snapshot(context);assert.equal(taskGrants(after).length,1);assert.equal(taskGrants(after)[0].id,'task:number-line-difference:first');assert.equal(after.daily.earned,baseline.daily.earned);
      if(width===768)firstTaskBody=record.taskBodies.at(-1);assert.deepEqual(firstTaskBody.event.completedQuestionIds,['p1','p2','p3','p4','p5']);
      const duplicate=await context.request.post(`${base}/api/v1/collection/aiden/task-complete`,{headers:{Origin:base},data:width===768?firstTaskBody:{...firstTaskBody,commandId:'qa-second-device-'+crypto.randomUUID()}});assert.equal(duplicate.status(),200);const duplicateBody=await duplicate.json();assert.equal(duplicateBody.duplicate,true);assert.equal(taskGrants(duplicateBody.snapshot).length,1);assert.equal(duplicateBody.snapshot.daily.earned,baseline.daily.earned);
      await page.reload();await page.waitForFunction(()=>document.querySelector('#reward')?.textContent.includes('已存入收藏'));await page.locator('[data-review="4"]').tap();assert.equal(await page.locator('path.arc').count(),5);await geometryCheck(page,`p5-review:${width}`);await page.locator('#close-review').tap();
      await capture(page,{path:resolve(output,`finish-${width}.png`),fullPage:true});await page.locator('#finish-restart').tap();await page.locator('#confirm-restart').tap();await waitStage(page,'given-start');assert.equal(taskGrants(await snapshot(context)).length,1);
      safeRecord(record);report.checks.push({flow:'child-drag',width,height,completeFive:true,reload:true,restart:true,taskGrants:1,dailyEarned:after.daily.earned,cookieSession:true,realWorkerSQLite:true,realTouch:true,offlinePending:width===768,automatic400:width===768,writes:record.writes});
    }
    let denyDirect=true;const direct=await newPage(browser,{child:'bingpu',deny:()=>denyDirect});await solve(direct.page,{mode:'tap',routes:{p5:'left'},prefix:'direct-rejection-'});await rejected(direct.page);assert.ok(direct.record.denials>0);assert.equal(taskGrants(await snapshot(direct.context,'bingpu')).length,0);denyDirect=false;await direct.page.locator('#retry').tap();await direct.page.waitForFunction(()=>document.querySelector('#reward').textContent.includes('已存入收藏'));await direct.page.reload();await direct.page.waitForFunction(()=>document.querySelector('#reward')?.textContent.includes('已存入收藏'));const recovered=await snapshot(direct.context,'bingpu');assert.equal(taskGrants(recovered).length,1);assert.equal(recovered.daily.earned,0);safeRecord(direct.record);report.checks.push({flow:'direct-rejection',status:400,fiveCompletedPreserved:true,escapedReason:true,retryRealWorker:true,reload:true,taskGrants:1});
    await previewChecks(browser,768,1024,'left',{prefix:'tap-768-'});await previewChecks(browser,1024,768,'right',{prefix:'tap-1024-'});
    assert.deepEqual([...new Set(report.coverage.routes.filter(x=>x.problem==='p5').map(x=>x.route))].sort(),['left','right']);assert.equal(report.coverage.alternateAfterHint,true,'p5 提示外的另一合法路徑仍可走');
    await migrationChecks(browser);await scrollChecks(browser);
  }
  if(process.env.NUMBER_LINE_WEBKIT==='1'){const webkit=await engines.webkit.launch({headless:true});browsers.push(webkit);report.engineVersions.webkit=webkit.version();await previewChecks(webkit,768,1024,'right',{keyboard:true,prefix:'webkit-keyboard-'});}
  report.ok=true;await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({ok:true,checks:report.checks.length,coverage:report.coverage,output}));
}catch(error){report.ok=false;report.error=error.stack;for(const [i,context]of contexts.entries()){const page=context.pages().at(-1);if(page&&!page.isClosed()){await capture(page,{path:resolve(output,`failure-${i}.png`),fullPage:true}).catch(()=>{});report.failureInputs=await page.evaluate(()=>({stage:document.querySelector('#app')?.dataset.stage,events:window.__numberLineTouchEvents})).catch(()=>null);}}await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');throw error;}
finally{for(const context of contexts)await context.close().catch(()=>{});for(const browser of browsers)await browser.close();}
