export async function openPlatform(preview) {
  if (preview) return {preview:true,child:null,load:()=>null,save:()=>true,reward:()=>({status:'preview'}),subscribe:()=>()=>{},finish:async()=>{},retry:async()=>{}};
  const child=new URLSearchParams(location.search).get('child');
  if (!['aiden','bingpu'].includes(child)) throw Error('請從孩子首頁開啟，或使用家長試玩。');
  // preview 在這個分支之前返回，不載入家庭模組、不接觸孩子 storage。
  for (const src of ['device-auth.js','family-core.js','collection-core.js','family-client.js','collection-client.js']) {
    await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='../shared/'+src+'?v=20261024-number-line-task';script.onload=resolve;script.onerror=()=>reject(Error('家庭連線程式未能載入，請重新整理。'));document.head.append(script);});
  }
  await window.KidsAuth.ready;
  if (window.KidsAuth.state.status === 'required') throw Error('請回孩子首頁，讓家長重新連接家庭。');
  const collection=window.KidsCollection.create(child);
  const key='learning-task:number-line-difference:v1:'+child;
  const reward=()=>{
    const snapshot=collection.snapshot(), task=snapshot.taskRewards?.['number-line-difference'] || {status:'unearned'};
    // 明拒會移除 outbox；訂閱也要看 sync，才能呈現稍後自動補送的拒絕。
    if(task.status==='earned'||task.status==='pending')return task;
    if(snapshot.sync?.status==='error')return {status:'error',message:snapshot.sync.message||'請稍後重新同步。'};
    return task;
  };
  return {
    preview:false,child,
    load(){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}},
    save(value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}},
    reward,subscribe:fn=>collection.subscribe(fn),ready:collection.ready,
    async finish(ids){await collection.ready;return collection.completeTask({taskId:'number-line-difference',completedQuestionIds:ids});},
    async retry(){await window.KidsAuth.refresh();await collection.refresh();return collection.flush();},
  };
}
