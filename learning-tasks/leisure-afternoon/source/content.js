'use strict';
const TITLE = '悠閒午後';
const STORAGE_KEY = 'aiden_mind_map_leisure_20260915_v1';
// 官方 v1.500 預設「相」為去聲；本頁相通／相機讀一聲。
const LEISURE_READINGS = [['相通',{0:1}],['相機',{0:1}],['看得懂',{1:1}],['一行詩',{1:1}],['重新',{0:1}]];
const BRANCHES = [
  {id:'visit',label:'行程',question:'作者去哪裡拍照？',prompt:'選一組你想抄的說法。',min:1,max:1,
    hint:'天氣晴朗，作者獨自帶著相機，到南海路的植物園拍照。文章也說，他每年夏季都會來。',
    choices:[{id:'visit-photo',words:['植物園','作者拍照']},{id:'visit-camera',words:['植物園','獨自攝影']}]},
  {id:'garden',label:'園景',question:'你想看哪些園景？',prompt:'選兩個，放進圖裡。',min:2,max:2,
    hint:'植物園的生態很豐富。作者看見荷花、荷葉、群鴨和肥魚；拍累了能在樹蔭休息，運氣好還有松鼠。這些都是他喜歡來的原因。',
    choices:[{id:'lotus',words:['荷花含苞']},{id:'leaves',words:['荷葉輕搖']},{id:'ducks',words:['群鴨戲水']},{id:'fish',words:['肥魚漫游']},{id:'shade',words:['樹蔭休息']},{id:'squirrel',words:['松鼠探訪']}]},
  {id:'poem',label:'杜甫詩',question:'詩裡有哪四種景物？',prompt:'四種都留下，選一組短詞。',min:1,max:1,
    hint:'杜甫的詩寫初夏四景：楊花鋪在小路上，荷葉像青銅錢，嫩筍冒出土，小鴨依著母鴨睡。下面兩組都留下這四種景物。',
    choices:[{id:'poem-things',words:['楊花荷葉','嫩筍小鴨']},{id:'poem-actions',words:['花落葉疊','筍冒鴨眠']}]},
  {id:'connection',label:'相通',question:'詩句和照片，哪裡很像？',prompt:'選一組你看得懂的說法。',min:1,max:1,
    hint:'一行詩像一幅畫，每張照片也各自取景。把它們合起來，就能呈現對一個地方的完整印象。',
    choices:[{id:'connection-scenes',words:['一句一景','合成全景']},{id:'connection-impression',words:['分別取景','合成印象']}]},
  {id:'feeling',label:'心意',question:'他們怎麼表達對自然的喜愛？',prompt:'選一組表達心意。',min:1,max:1,fixed:['喜愛自然'],
    hint:'杜甫用詩句寫出對自然的深情；作者選擇用鏡頭表達對植物園的感情。他們表達的方法不同，都有對自然的喜愛。',
    choices:[{id:'feeling-people',words:['杜甫寫詩','作者攝影']},{id:'feeling-expression',words:['詩傳情意','照片傳情']}]}
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
if(typeof module!=='undefined')module.exports={TITLE,STORAGE_KEY,BRANCHES,LEISURE_READINGS,isReady,cleanState,branchWords,mapWordCount};
