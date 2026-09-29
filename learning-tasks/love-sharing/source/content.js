'use strict';
const TITLE = '愛的分享';
const STORAGE_KEY = 'aiden_mind_map_love_sharing_20260929_v1';
// 字嗨 v1.500 選音表：得的輕聲、相的一聲、重的二聲、長的三聲。
const LOVE_READINGS = [['變得',{1:1}],['相處',{0:1}],['重新',{0:1}],['長者',{0:1}]];
const BRANCHES = [
  {id:'change',label:'陳奶奶',question:'奶奶有什麼改變？',prompt:'選一組，留下改變的原因。',min:1,max:1,
    hint:'陳奶奶原本冷漠、獨來獨往。流浪狗嘟嘟的陪伴，讓她變得親切，開始和鄰居打招呼。兩組都說出她前後的改變。',
    choices:[{id:'change-warm',words:['嘟嘟陪伴','冷漠變親切']},{id:'change-neighbors',words:['嘟嘟的愛','冷漠變親切']}]},
  {id:'training',label:'狗醫生',question:'嘟嘟怎麼當醫生？',prompt:'選一組，留下牠的努力。',min:1,max:1,
    hint:'奶奶帶嘟嘟去上狗醫生課程。牠學習服從、遇到變化不驚慌，通過考試，也完成實習，才成為正式狗醫生。',
    choices:[{id:'training-tests',words:['嘟嘟受訓','考試實習']},{id:'training-practice',words:['嘟嘟訓練','考核實習']}]},
  {id:'service',label:'服務',question:'狗醫生去幫助誰？',prompt:'選一組，記住服務的對象。',min:1,max:1,
    hint:'彤彤以為狗醫生是替小狗看病。奶奶說，牠服務的是人，會去安養院和醫院，陪伴需要幫助的人。',
    choices:[{id:'service-places',words:['安養院','醫院病人']},{id:'service-people',words:['服務長者','陪伴病人']}]},
  {id:'help',label:'幫助',question:'嘟嘟帶來什麼幫助？',prompt:'兩種幫助都留下，選一組。',min:1,max:1,
    hint:'嘟嘟能讓病人暫時忘記痛苦、減少寂寞，還能協助復健。陪伴和復健都是重點，不是替病人開藥。',
    choices:[{id:'help-comfort',words:['陪伴解憂','協助復健']},{id:'help-company',words:['減輕孤單','幫忙復健']}]},
  {id:'sharing',label:'分享',question:'奶奶怎麼分享愛？',prompt:'留下「每週六」，再選一組。',min:1,max:1,fixed:['每週六'],
    hint:'嘟嘟的愛改變了奶奶。以後每週六下午，奶奶會帶著穿制服的嘟嘟服務病人，把收到的愛分享給需要的人。',
    choices:[{id:'sharing-together',words:['奶奶帶狗','分享愛心']},{id:'sharing-pass-on',words:['奶奶助人','傳遞關愛']}]}
];
function isReady(branch,picks){return picks.length>=branch.min;}
function cleanState(raw){
  const picks=BRANCHES.map((branch,i)=>Array.isArray(raw?.picks?.[i]) ? [...new Set(raw.picks[i])].filter(id=>branch.choices.some(c=>c.id===id)).slice(0,branch.max) : []);
  const missing=BRANCHES.findIndex((b,i)=>!isReady(b,picks[i]));
  const limit=missing<0?BRANCHES.length-1:missing;
  const step=Number.isInteger(raw?.step)&&raw.step>=0?Math.min(raw.step,limit):limit;
  return {picks,step,finished:missing<0&&raw?.finished===true};
}
function branchWords(branch,picks){
  return [...(picks.length?branch.fixed||[]:[]),...picks.flatMap(id=>branch.choices.find(c=>c.id===id)?.words||[])];
}
function mapWordCount(picks){return TITLE.length+BRANCHES.reduce((n,b,i)=>n+b.label.length+branchWords(b,picks[i]).join('').length,0);}
if(typeof module!=='undefined')module.exports={TITLE,STORAGE_KEY,BRANCHES,LOVE_READINGS,isReady,cleanState,branchWords,mapWordCount};
