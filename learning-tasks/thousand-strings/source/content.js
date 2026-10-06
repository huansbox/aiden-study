'use strict';
const TITLE = '一千根琴弦';
const STORAGE_KEY = 'aiden_mind_map_thousand_strings_20261006_v1';
// 字嗨 v1.500 官方選音表；選音只用於畫面。
const STRINGS_READINGS = [['彈琴',{0:1}],['彈斷',{0:1}],['重見',{0:1}],['重新',{0:1}],['興趣',{0:1}],['相依',{0:1}],['磨難',{1:1}],['處境',{0:1}],['因為',{1:1}],['為什麼',{0:1}],['不倒下',{1:1}],['老少',{1:1}],['答應',{0:1,1:1}],['變得',{1:1}],['孩子',{1:1}]];
const BRANCHES = [
  {id:'xiaoya',label:'小雅',question:'小雅遇到什麼困難？',prompt:'選一組，留下她的處境。',min:1,max:1,
    hint:'小雅因為幼年的意外，行動不方便，心裡覺得自己不如別人。她不能上體育課，也對其他活動提不起興趣。新老師注意到了。',
    choices:[{id:'xiaoya-feelings',words:['行動不便','自卑無趣']},{id:'xiaoya-confidence',words:['行動不便','失去信心']}]},
  {id:'mentors',label:'師徒',question:'故事裡，師徒怎麼生活？',prompt:'選一組，記住生活與練琴。',min:1,max:1,
    hint:'這是老師說的故事。老少兩位盲人互相依靠，彈琴賣藝生活。師父去世後，徒弟記住約定，一直練琴，把彈斷的弦一根根收好。',
    choices:[{id:'mentors-art',words:['盲人賣藝','勤練琴藝']},{id:'mentors-practice',words:['盲人賣藝','不停練琴']}]},
  {id:'promise',label:'秘方',question:'師父留下什麼秘方？',prompt:'這是師父說的約定，選一組。',min:1,max:1,
    hint:'師父說，要彈斷一千根琴弦，才能拿出琴盒裡的秘方，讓眼睛重新看見。徒弟流著淚答應了。先記住這個約定，下一步會看到結果。',
    choices:[{id:'promise-light',words:['彈斷千弦','重見光明']},{id:'promise-see',words:['斷弦一千','重新看見']}]},
  {id:'meaning',label:'領悟',question:'白紙讓徒弟懂了什麼？',prompt:'白紙與希望，兩個都留下。',min:1,max:1,
    hint:'徒弟年老時，終於彈斷第一千根琴弦，打開琴盒，才知道秘方是空白的紙。師父是要他懷抱希望，面對磨難也不倒下，變得更堅強。秘方沒有治好他的眼睛。',
    choices:[{id:'meaning-paper',words:['秘方白紙','希望給力量']},{id:'meaning-empty',words:['秘方空白','希望給力量']}]},
  {id:'encouragement',label:'鼓勵',question:'老師想怎麼幫小雅？',prompt:'留下「不放棄」，再選一組。',min:1,max:1,fixed:['不放棄'],
    hint:'老師用故事鼓勵小雅保有希望，並說有適合她的運動，邀請她一起上體育課。文章寫的是老師的邀請，還沒有說小雅已答應。你也可以想想，自己要怎麼陪伴同學。',
    choices:[{id:'encouragement-class',words:['合適運動','一起上課']},{id:'encouragement-join',words:['適合運動','一起參加']}]}
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
if(typeof module!=='undefined')module.exports={TITLE,STORAGE_KEY,BRANCHES,STRINGS_READINGS,isReady,cleanState,branchWords,mapWordCount};
