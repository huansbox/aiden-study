// Isolated Chromium CDP driver used only by the collection E2E runner.
import { writeFile } from 'node:fs/promises';
export async function connectBrowser(endpoint, match = '127.0.0.1') {
  if (!/^ws:\/\/127\.0\.0\.1:\d+\//.test(endpoint)) throw Error('Use an isolated local Chromium endpoint');
  const ws = new WebSocket(endpoint), pending = new Map();
  let serial = 0, session;
  ws.addEventListener('message', e => {
    const value = JSON.parse(e.data), waiter = pending.get(value.id);
    if (waiter) { pending.delete(value.id); value.error ? waiter.reject(Error(JSON.stringify(value.error))) : waiter.resolve(value.result); }
  });
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, {once:true}); ws.addEventListener('error', reject, {once:true}); });
  const send = (method, params = {}, scoped = true) => new Promise((resolve, reject) => {
    const id = ++serial; pending.set(id,{resolve,reject});
    ws.send(JSON.stringify({id,method,params,...(session && scoped ? {sessionId:session} : {})}));
  });
  const {targetInfos} = await send('Target.getTargets',{},false);
  const target = targetInfos.find(t=>t.type==='page' && (typeof match==='string' ? t.url.includes(match) : t.targetId===match.targetId));
  if (!target) { ws.close(); throw Error('Open the isolated test page in agent-browser first'); }
  session=(await send('Target.attachToTarget',{targetId:target.targetId,flatten:true},false)).sessionId;
  await send('Page.enable');
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (expression, limit=15000) => {
    const until=Date.now()+limit;
    while(Date.now()<until) {
      if(await evaluate(expression)) return;
      await new Promise(resolve=>setTimeout(resolve,80));
    }
    throw Error('Timed out: '+expression);
  };
  const point = async selector => {
    await evaluate(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'center',behavior:'instant'})`);
    await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const result=await evaluate(`(() => { const el=document.querySelector(${JSON.stringify(selector)}); if(!el) return null; const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
    if (!result) throw Error('Missing element: '+selector);
    return result;
  };
  const click = async (selector, touch=false) => {
    const p = await point(selector);
    if(touch) {
      await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]});
      await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    } else {
      await send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});
    }
    await evaluate('new Promise(resolve=>requestAnimationFrame(resolve))');
  };
  const drag = async (source,destination,{touch=true,cancel=false}={}) => {
    const a=await point(source), b=await point(destination);
    // Both positions must stay on the same visible workbench.
    const start=await point(source);
    if(touch) await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});
    else await send('Input.dispatchMouseEvent',{type:'mousePressed',...start,button:'left',buttons:1,clickCount:1});
    await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    for(let i=1;i<=12;i++) {
      const p={x:a.x+(b.x-a.x)*i/12,y:a.y+(b.y-a.y)*i/12};
      if(touch) await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...p,id:1}]});
      else await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p,button:'left',buttons:1});
      await evaluate('new Promise(resolve=>requestAnimationFrame(resolve))');
    }
    if(touch) await send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});
    else await send('Input.dispatchMouseEvent',{type:'mouseReleased',...b,button:'left',buttons:0,clickCount:1});
    // Chromium suppresses a rapid tap after a synthetic swipe, even on a static
    // touch-action:none div. A 500 ms inter-gesture gap passes that minimal control.
    // This is test input pacing, not an application delay or human timing result.
    if(touch && !cancel) await new Promise(resolve=>setTimeout(resolve,500));
  };
  return {send,evaluate,waitFor,click,drag,point,
    async navigate(url) { if(!/^http:\/\/127\.0\.0\.1:\d+\//.test(url)) throw Error('E2E navigation is local only'); await send('Page.navigate',{url}); await waitFor(`location.pathname===${JSON.stringify(new URL(url).pathname)} && document.readyState==='complete'`); },
    async screenshot(path,{fullPage=false}={}) {
      const size=fullPage ? (await send('Page.getLayoutMetrics')).cssContentSize : null;
      const {data}=await send('Page.captureScreenshot',{format:'png',...(size ? {captureBeyondViewport:true,clip:{x:0,y:0,width:size.width,height:size.height,scale:1}} : {})});
      await writeFile(path,Buffer.from(data,'base64'));
    },
    close() { ws.close(); }
  };
}
