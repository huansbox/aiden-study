import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../docs/study/math-geometry.js',import.meta.url),'utf8'),context);
const M=context.StudyMathGeometry;
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jC1sAAAAASUVORK5CYII=';
const copy=x=>JSON.parse(JSON.stringify(x));
export function triangle(kind='apex') {
  return {id:'synthetic-triangle',subject:'math',unit:24,type:'triangle_construct',text:'合成作圖題',subtopic:'合成',source:'synthetic',options:[],answer:'',interaction:{scene:{width:800,height:600,pixelsPerCm:40},given:[{index:0,point:[300,250],label:'A'}],grid:null,constraints:{kind,legs:kind==='apex'?[4,5]:null,angle:kind==='apex'?90:null,reference:kind==='congruent'?[[50,50],[50,170],[170,50]]:null},marks:{labels:[],rightAt:null,angleAt:null},tolerance:{lengthCm:.1,angleDeg:2}}};
}
export function chart() {
  return {id:'synthetic-bars',subject:'math',unit:28,type:'bar_chart_draw',text:'畫合成社團統計圖',subtopic:'合成',source:'synthetic',options:[],answer:'',interaction:{axis:{min:0,max:40,step:10,minor:2,break:false,labels:[0,10,null,null,null],below:[]},bars:[{label:'甲組',value:18,given:false,labelGiven:true},{label:'乙組',value:26,given:false,labelGiven:false},{label:'丙組',value:32,given:true,labelGiven:true}],unit:{text:'人',required:true},title:{text:'社團學生人數',required:true,keywords:[['社團'],['人數','學生數']]}}};
}
export function measure() {
  return {id:'synthetic-measure',subject:'math',unit:24,type:'measure_tool',text:'量一量合成圖',subtopic:'合成',source:'synthetic',options:[],answer:'',interaction:{scene:{width:800,height:600,pixelsPerCm:40,image:png},tools:['ruler','protractor','square'],outputs:[{kind:'number',label:'邊長',answer:5,tolerance:.1,unit:'cm'},{kind:'single',label:'角的分類',options:['直角','鈍角','銳角'],answer:[0]},{kind:'set',label:'相等的邊',options:['甲','乙','丙'],answer:[0,2]}]}};
}
function drawn(q,points) {
  let s=M.initial(q);
  points.forEach((p,i)=>{s=M.update(q,s,'vertex',String(i));s=M.update(q,s,'canvas',{x:p[0],y:p[1]});});
  for(let i=0;i<3;i++) if(!s.edges[i]) s=M.update(q,s,'edge',String(i));
  return s;
}
function fill(q,s,field,value) {return M.update(q,s,'field',{field,value});}
function chartAnswer(q) {
  let s=M.initial(q),it=q.interaction;
  for(let i=0;i<it.bars.length;i++) if(!it.bars[i].given) s=M.update(q,s,'canvas',{x:80+(i+.5)*540/it.bars.length,y:360-(it.bars[i].value-it.axis.min)/(it.axis.max-it.axis.min)*320});
  it.axis.labels.forEach((_,i)=>{s=fill(q,s,`tick:${i}`,String(it.axis.min+i*it.axis.step));});
  it.bars.forEach((b,i)=>{s=fill(q,s,`label:${i}`,b.label);});
  s=fill(q,s,'title','社團學生數');return fill(q,s,'unit',it.unit.text);
}
test('strict type, unit, finite bounds and unknown-key guards',()=>{
  for(const q of [triangle(),chart(),measure()]) {assert.equal(M.validateQuestion(q),true);assert.equal(M.complete(q,M.initial(q)),false);assert.equal(M.grade(q,M.initial(q)),false);}
  for(const mutate of [q=>q.extra=1,q=>q.unit=25,q=>q.interaction.extra=1,q=>q.interaction.scene.pixelsPerCm=null,q=>q.interaction.scene.pixelsPerCm=Infinity,q=>q.interaction.given[0].point=[-1,0],q=>q.interaction.tolerance.lengthCm=5,q=>q.interaction.constraints.legs=[4],q=>q.interaction.constraints.kind='eval']) {const q=triangle();mutate(q);assert.throws(()=>M.validateQuestion(q));}
  const q=measure();q.interaction.scene.image='javascript:alert(1)';assert.throws(()=>M.validateQuestion(q));
  const b=chart();b.interaction.axis.labels[2]=50;assert.throws(()=>M.validateQuestion(b));
});
test('manual construction, fixed origin, connection, 4/5 right angle and equivalent reflection',()=>{
  const q=triangle();
  let s=drawn(q,[[300,250],[460,250],[300,450]]);
  assert.equal(M.grade(q,s),true);
  const unconnected=copy(s);unconnected.edges[1]=false;assert.equal(M.complete(q,unconnected),false);
  s=drawn(q,[[999,999],[300,90],[100,250]]);assert.equal(M.grade(q,s),true);assert.deepEqual(copy(s.points[0]),[300,250]);
  s=drawn(q,[[300,250],[460,250],[500,250]]);assert.equal(M.complete(q,s),true);assert.equal(M.grade(q,s),false);
  s=drawn(q,[[300,250],[460,250],[340,450]]);assert.equal(M.grade(q,s),false);
});
test('independent trigonometry covers free apex and obtuse apex, tolerance and rotation',()=>{
  for(const degrees of [60,115,null]) {
    const q=triangle();q.interaction.constraints.legs=[4,4];q.interaction.constraints.angle=degrees;
    const theta=(degrees??75)*Math.PI/180, rotate=22*Math.PI/180;
    const p=a=>[300+160*Math.cos(a),250+160*Math.sin(a)];
    assert.equal(M.grade(q,drawn(q,[[300,250],p(rotate),p(rotate+theta)])),true);
    if(degrees!==null) assert.equal(M.grade(q,drawn(q,[[300,250],p(rotate),p(rotate+theta+.1)])),false);
  }
  const q=triangle();assert.equal(M.grade(q,drawn(q,[[300,250],[464,250],[300,450]])),true);
  assert.equal(M.grade(q,drawn(q,[[300,250],[464.1,250],[300,450]])),false);
});
test('given segment remains used; arbitrary isosceles and grid right triangle',()=>{
  const q=triangle('isosceles');q.interaction.given=[{index:0,point:[200,300],label:''},{index:1,point:[400,300],label:''}];
  let s=drawn(q,[[0,0],[0,0],[300,120]]);assert.equal(M.grade(q,s),true);assert.equal(s.edges[0],true);
  const fake=copy(s);fake.points[0]=[250,250];fake.edges[0]=false;assert.deepEqual(copy(M.update(q,fake,'noop').points[0]),[200,300]);assert.equal(M.update(q,fake,'noop').edges[0],true);
  const r=triangle('right');r.interaction.given=[];r.interaction.grid=20;
  s=drawn(r,[[201,199],[401,201],[199,399]]);assert.equal(M.grade(r,s),true);assert.deepEqual(copy(s.points),[[200,200],[400,200],[200,400]]);
});
test('congruent source reference uses all sides and specified corresponding angle',()=>{
  const q=triangle('congruent');q.interaction.marks={labels:[{index:1,text:'E'},{index:2,text:'F'}],rightAt:0,angleAt:null};
  let s=drawn(q,[[300,250],[300,370],[420,250]]);assert.equal(M.complete(q,s),false);
  s=fill(q,s,'vertex:1','E');s=fill(q,s,'vertex:2','F');s=M.update(q,s,'right','0');assert.equal(M.grade(q,s),true);
  let wrong=copy(s);wrong.points[1]=[300,410];wrong.points[2]=[460,250];assert.equal(M.grade(q,wrong),false);
  wrong=copy(s);wrong.points[1]=[420,250];wrong.points[2]=[420,370];assert.equal(M.grade(q,wrong),false);
  assert.ok(!M.render(q,M.initial(q)).includes('3 公分')); // reference lengths are not pre-disclosed
});
test('original required marks are produced by child, not automatically awarded',()=>{
  const q=triangle();q.interaction.constraints.legs=[4,4];q.interaction.constraints.angle=90;q.interaction.marks={labels:[{index:0,text:'A'}],rightAt:0,angleAt:{index:0,degrees:90}};
  let s=drawn(q,[[300,250],[460,250],[300,410]]);assert.equal(M.grade(q,s),false);
  s=fill(q,s,'vertex:0','A');s=fill(q,s,'angle:0','90');s=M.update(q,s,'right','0');assert.equal(M.grade(q,s),true);
  s=fill(q,s,'angle:0','89');assert.equal(M.grade(q,s),false);
});
test('bar heights require drawing, tick scale, category, unit and multi-meaning title',()=>{
  const q=chart();let s=chartAnswer(q);assert.equal(M.grade(q,s),true);
  for(const [field,value] of [['tick:2','40'],['label:1','錯組'],['unit','票'],['title','社團無關內容']]) {assert.equal(M.grade(q,fill(q,s,field,value)),false);}
  const before=copy(s);s=M.update(q,s,'bar','0');s=M.update(q,s,'height','1');assert.equal(M.grade(q,s),false);s=M.update(q,s,'height','-1');assert.equal(M.grade(q,s),true);
  s=M.update(q,s,'canvas',{x:530,y:350});assert.equal(s.heights[2],16);assert.deepEqual(copy(before.heights),[9,13,16]);
  assert.equal(M.grade(q,fill(q,s,'title','社團各組人數')),true);
});
test('broken axis drawing uses offset, preserves given bars, given labels do not add work',()=>{
  for(const [min,max,step,minor,values] of [[100,300,50,10,[180,260,220]],[1000,2300,100,100,[1400,1800,2200]],[10,30,2,2,[18,26,22]]]) {
    const q=chart();q.interaction.axis={min,max,step,minor,break:true,labels:Array.from({length:(max-min)/step+1},(_,i)=>min+i*step),below:[0]};
    q.interaction.bars.forEach((b,i)=>{b.value=values[i];b.labelGiven=true;});q.interaction.title.required=false;q.interaction.title.keywords=[];q.interaction.unit.required=false;
    assert.equal(M.validateQuestion(q),true);const s=chartAnswer(q);assert.equal(M.grade(q,s),true);assert.ok(M.render(q,s).includes('M75 371l10 -6'));
    const wrong=copy(s);wrong.heights[0]++;assert.equal(M.grade(q,wrong),false);
  }
});
test('measurement tools and mixed outputs retain independent decisions through reload',()=>{
  const q=measure();let s=M.initial(q);
  s=fill(q,s,'output:0','5');s=M.update(q,s,'choice','1:0');s=M.update(q,s,'choice','2:0');s=M.update(q,s,'choice','2:2');assert.equal(M.complete(q,s),false);
  s=M.update(q,s,'tool','ruler');s=M.update(q,s,'canvas',{x:120,y:180});assert.equal(M.grade(q,s),true);
  s=M.update(q,s,'rotate','10');assert.equal(M.grade(q,copy(s)),true);assert.equal(s.tool.rotation,10);
  s=fill(q,s,'output:0','５.１');assert.equal(M.grade(q,s),true);s=fill(q,s,'output:0','5.101');assert.equal(M.grade(q,s),false);
  s=fill(q,s,'output:0','5');s=M.update(q,s,'choice','2:1');assert.equal(M.grade(q,s),false);s=M.update(q,s,'choice','2:1');assert.equal(M.grade(q,s),true);
});
test('malformed states, immutable transitions, escaping, locking and no reward calls',()=>{
  for(const q of [triangle(),chart(),measure()]) for(const state of [null,[],{},'old', {tool:{x:Infinity,kind:'evil'},points:[null],outputs:[{}],heights:[NaN],labels:['<img>']}]) {
    assert.doesNotThrow(()=>M.render(q,state));assert.doesNotThrow(()=>M.grade(q,state));assert.doesNotThrow(()=>M.update(q,state,'unknown',{}));
    assert.ok(!M.render(q,state,true).includes('data-geometry-action="canvas"'));
  }
  const q=chart(),s=M.initial(q),saved=JSON.stringify(s);M.update(q,s,'height','1');assert.equal(JSON.stringify(s),saved);
  const escaped=fill(q,s,'title','<script>alert(1)</script>');assert.ok(M.render(q,escaped).includes('&lt;script&gt;'));assert.ok(!M.render(q,escaped).includes('<script>'));
  assert.deepEqual(copy(M.read(q,null,escaped)),copy(escaped));
  assert.equal(M.semantic(q),JSON.stringify([q.type,q.interaction]));
  const src=fs.readFileSync(new URL('../docs/study/math-geometry.js',import.meta.url),'utf8');assert.ok(!/\b(?:eval|fetch|Function)\s*\(|family\./.test(src));
});
