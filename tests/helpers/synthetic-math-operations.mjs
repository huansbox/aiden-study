// Entirely invented data. The line is 200 scene pixels / 40 pixels per cm = 5 cm.
import { deflateSync } from 'node:zlib';
function png() {
  const crc = bytes => { let c=0xffffffff; for (const b of bytes) { c^=b; for(let i=0;i<8;i++) c=(c>>>1)^((c&1)?0xedb88320:0); } return (c^0xffffffff)>>>0; };
  const chunk=(name,data)=>{const body=Buffer.concat([Buffer.from(name),data]),header=Buffer.alloc(4),tail=Buffer.alloc(4);header.writeUInt32BE(data.length);tail.writeUInt32BE(crc(body));return Buffer.concat([header,body,tail]);};
  const w=400,h=300,ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=0;
  const rows=Buffer.alloc((w+1)*h,255);
  for(let y=0;y<h;y++){rows[y*(w+1)]=0;for(let x=0;x<w;x++)if((y>=79&&y<=81&&x>=80&&x<=280)||(x>=79&&x<=81&&y>=80&&y<=240))rows[y*(w+1)+x+1]=0;}
  return 'data:image/png;base64,'+Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]).toString('base64');
}
const base=(type,unit,text,interaction)=>({id:`math-g4s1-synthetic-operation-${type.replaceAll('_','')}-v1`,subject:'math',unit,type,text,subtopic:'合成操作',source:'Synthetic only',options:[],answer:'',interaction});
export function operationQuestions() {
  return [
    base('expression_steps',26,'合成：70－(12＋18)＝（１）＝（２）',{blanks:[{kind:'expression'},{kind:'number'}],solutions:[[{value:'40',expression:'70-30'},{value:'40'}]]}),
    base('vertical_decimal',25,'合成：先算10.5－1.2，再加2.15；用直式算最後一步。',{op:'+',operands:['9.3','2.15'],result:'11.45',setup:[{prompt:'先列式算第一步。',answer:'10.5-1.2',value:'9.3'}]}),
    base('fraction_shade',27,'合成：7/4＝（１），換成帶分數並畫斜線。',{shape:'grid',wholes:2,partsPerWhole:4,grid:{rows:2,cols:2},target:{numerator:7,denominator:4},companion:{form:'mixed'}}),
    base('hundred_grid_select',25,'合成：圈出1.12張百格板。',{pieces:{boards:2,rods:2,units:3},target:'1.12'}),
    base('triangle_construct',24,'合成：在A畫兩邊4與5公分、夾角90度的三角形，標記B、C與直角。',{scene:{width:800,height:600,pixelsPerCm:40},given:[{index:0,point:[300,250],label:'A'}],grid:null,constraints:{kind:'apex',legs:[4,5],angle:90,reference:null},marks:{labels:[{index:1,text:'B'},{index:2,text:'C'}],rightAt:0,angleAt:null},tolerance:{lengthCm:.1,angleDeg:2}}),
    base('bar_chart_draw',28,'合成社團資料：甲組18人、乙組26人、丙組32人。完成圖。',{axis:{min:0,max:40,step:10,minor:2,break:false,labels:[0,10,null,null,null],below:[]},bars:[{label:'甲組',value:18,given:false,labelGiven:true},{label:'乙組',value:26,given:false,labelGiven:false},{label:'丙組',value:32,given:true,labelGiven:true}],unit:{text:'人',required:true},title:{text:'社團學生人數',required:true,keywords:[['社團'],['人數','學生數']]}}),
    base('measure_tool',24,'合成：量橫線長度，判斷夾角，選出指定的甲與丙。',{scene:{width:400,height:300,pixelsPerCm:40,image:png()},tools:['ruler','protractor','square'],outputs:[{kind:'number',label:'橫線長度',answer:5,tolerance:.1,unit:'cm'},{kind:'single',label:'夾角',options:['直角','鈍角','銳角'],answer:[0]},{kind:'set',label:'指定符號',options:['甲','乙','丙'],answer:[0,2]}]}),
  ];
}
// Explicit solutions independently calculated above; no answerState/candidate answer copying.
export const operationResponses = {
  expression_steps:{fields:['70-30','40'],active:0},
  vertical_decimal:{setup:['10.5-1.2'],setupActive:0,rows:[{cells:['','','9','3','0',''],point:2},{cells:['','','2','1','5',''],point:2},{cells:['','1','1','4','5',''],point:2}],active:[0,0]},
  fraction_shade:{selected:[0,1,2,3,4,5,6],companion:{w:'1',n:'3',d:'4'},active:0},
  hundred_grid_select:{boards:[0],rods:[0],units:[0,1]},
  triangle_construct:{points:[[300,250],[460,250],[300,450]],edges:[true,true,true],labels:['','B','C'],rights:[true,false,false],angles:['','',''],active:0},
  bar_chart_draw:{heights:[9,13,16],labels:['甲組','乙組','丙組'],ticks:['0','10','20','30','40'],unit:'人',title:'社團學生數',active:0},
  measure_tool:{tool:{kind:'ruler',x:80,y:80,rotation:0},used:['ruler'],active:0,outputs:['5',[0],[0,2]]},
};
export function wrongOperationResponse(type) {
  const s=structuredClone(operationResponses[type]);
  if(type==='expression_steps')s.fields[0]='40';
  if(type==='vertical_decimal')s.rows[1].point=1;
  if(type==='fraction_shade')s.selected.pop();
  if(type==='hundred_grid_select')s.units.pop();
  if(type==='triangle_construct')s.points[2]=[350,450];
  if(type==='bar_chart_draw')s.ticks[2]='21';
  if(type==='measure_tool')s.outputs[0]='6';
  return s;
}
