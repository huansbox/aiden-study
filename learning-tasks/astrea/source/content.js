'use strict';
const TITLE = '正義女神阿絲特蕾亞';
const STORAGE_KEY = 'aiden_mind_map_astrea_20261110_v1';
// 字嗨選音只用於畫面。
const ASTREA_READINGS = [['長出',{0:1}]];
const BRANCHES = [
  {id:'opening',label:'離開',question:'眾神為什麼離開人間？',prompt:'選一組，留下人間的變化與女神的決定。',min:1,max:1,
    hint:'人類開始弱肉強食，眾神回到仙界。阿絲特蕾亞先留在人間，直到人類引發戰爭才回天上。',
    choices:[{id:'opening-war',words:['人間爭鬥','戰起回天']},{id:'opening-return',words:['弱肉強食','戰起返天']}]},
  {id:'contest',label:'比賽',question:'女神要求道歉後，赫拉想出什麼辦法？',prompt:'選一組，記住兩人怎麼比，以及道歉的約定。',min:1,max:1,
    hint:'女神相信和平與幸福最可貴，波塞頓卻嘲諷她。她要求道歉。宙斯左右為難，赫拉提議兩人各做一件作品。作品較好的一方獲勝。波塞頓輸了就要道歉，女神輸了就取消道歉之約。',
    choices:[{id:'contest-work',words:['比作品','道歉約定']},{id:'contest-match',words:['做作品','輸贏約定']}]},
  {id:'spring',label:'清泉',question:'波塞頓怎麼讓清泉出現？',prompt:'選一組，留下他的動作和作品。',min:1,max:1,
    hint:'波塞頓舉起巨叉，重重擊打地面，清泉立刻湧出，眾神高興地鼓掌。',
    choices:[{id:'spring-strike',words:['巨叉擊地','清泉湧出']},{id:'spring-flow',words:['巨叉重擊','湧出清泉']}]},
  {id:'olive',label:'橄欖樹',question:'女神的橄欖樹讓大家有什麼感覺？',prompt:'選一組，留下樹的樣子與大家的感受。',min:1,max:1,
    hint:'阿絲特蕾亞揮舞雙手，長出一棵橄欖樹。樹上結滿金色果子，樹葉泛銀光，樹幹是紅褐色。看著這棵樹，大家感到祥和。',
    choices:[{id:'olive-fruit',words:['金色果子','祥和']},{id:'olive-leaves',words:['葉泛銀光','祥和']}]},
  {id:'ending',label:'女神獲勝',question:'女神獲勝後，波塞頓懂了什麼？',prompt:'選一組，記住波塞頓的改變。',min:1,max:1,
    hint:'宙斯和眾神一致判阿絲特蕾亞獲勝。波塞頓明白她追求的和平與幸福最值得努力，心悅誠服地向女神道歉。',
    choices:[{id:'ending-apology',words:['和平幸福','向她道歉']},{id:'ending-sorry',words:['和平幸福','誠心道歉']}]}
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
if(typeof module!=='undefined')module.exports={TITLE,STORAGE_KEY,BRANCHES,ASTREA_READINGS,isReady,cleanState,branchWords,mapWordCount};
