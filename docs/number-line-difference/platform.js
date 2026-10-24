export async function openPlatform(preview) {
  if (preview) return {preview:true,child:null,load:()=>null,save:()=>true,reward:()=>({status:'preview'}),subscribe:()=>()=>{},finish:async()=>{},retry:async()=>{}};
  const child=new URLSearchParams(location.search).get('child');
  if (!['aiden','bingpu'].includes(child)) throw Error('請從孩子首頁開啟，或使用家長試玩。');
  // preview 在這個分支之前返回，不載入家庭模組、不接觸孩子 storage。
  for (const src of ['device-auth.js','family-core.js','collection-core.js','family-client.js','collection-client.js']) {
    await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='../shared/'+src+'?v=20261024-five-why-v3';script.onload=resolve;script.onerror=()=>reject(Error('家庭連線程式未能載入，請重新整理。'));document.head.append(script);});
  }
  await window.KidsAuth.ready;
  if (window.KidsAuth.state.status === 'required') throw Error('請回孩子首頁，讓家長重新連接家庭。');
  const collection=window.KidsCollection.create(child);
  const key='learning-task:number-line-difference:v3:'+child,legacyKey=version=>'learning-task:number-line-difference:v'+version+':'+child;
  const read=key=>{try{const raw=localStorage.getItem(key);if(raw===null)return null;return JSON.parse(raw)??{version:'unreadable'};}catch{return {version:'unreadable'};}};
  const supported=value=>value?.version===3&&Array.isArray(value.log)&&value.log.length<=12000&&value.log.every(e=>e&&['point','chip','place','number','segment','next'].includes(e.type)&&['string','number'].includes(typeof e.value));
  const reward=()=>{
    const snapshot=collection.snapshot(), task=snapshot.taskRewards?.['number-line-difference'] || {status:'unearned'};
    // 明拒會移除 outbox；訂閱也要看 sync，才能呈現稍後自動補送的拒絕。
    if(task.status==='earned'||task.status==='pending')return task;
    if(snapshot.sync?.status==='error')return {status:'error',message:snapshot.sync.message||'請稍後重新同步。'};
    return task;
  };
  return {
    preview:false,child,
    load(){return read(key);},loadLegacy(version=2){return read(legacyKey(version))??(version===2?read(legacyKey(1)):null);},
    save(value){try{const existing=read(key);if(!supported(value)||existing!==null&&!supported(existing))return false;localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}},
    reward,subscribe:fn=>collection.subscribe(fn),ready:collection.ready,
    async finish(ids){await collection.ready;return collection.completeTask({taskId:'number-line-difference',completedQuestionIds:ids});},
    async retry(){await window.KidsAuth.refresh();await collection.refresh();return collection.flush();},
  };
}
