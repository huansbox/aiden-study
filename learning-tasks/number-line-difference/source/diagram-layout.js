// 座標只依題目全部可接受路線建立；不讀目前步驟、選取或畫面內的弧線。
export function diagramLayout(p){
  const five=p.points.length===5,baseline=176,width=720,height=400;
  const positions=Object.fromEntries(p.points.map((point,i)=>[point.id,62+i*596/(p.points.length-1)]));
  const levels=five?{AE:[-1,118],AD:[-1,74],AB:[-1,32],BD:[-1,32],DE:[-1,32],CE:[-1,74],BE:[1,150],AC:[1,95],CD:[1,40],BC:[1,40]}:{AD:[-1,118],AC:[-1,70],AB:[-1,32],CD:[-1,32],BD:[1,136],BC:[1,40]};
  const all=new Set([...p.givens.map(g=>g.segment),...p.routes.flatMap(r=>r.steps.map(s=>s.result))]);
  const segments=Object.fromEntries([...all].map(s=>{
    const [side,h]=levels[s],a=positions[s[0]],b=positions[s[1]],mid=(a+b)/2;
    const y=baseline+side*8,peak=baseline+side*h;
    return [s,{a,b,mid,side,peak,labelY:peak+side*18,path:`M ${a} ${y} Q ${mid} ${baseline+side*(2*h-8)} ${b} ${y}`,slotX:mid-32,slotY:baseline+43}];
  }));
  // 先用全部路線中「求這一段之前可能已畫的線」找空白區。
  // 不是依當前顯示的線重排，所以加線、重載與重看不會跳位置。
  for(const target of all){
    const before=new Set();
    for(const route of p.routes){
      const known=p.givens.map(g=>g.segment);
      for(const step of route.steps){if(step.result===target)known.forEach(s=>before.add(s));known.push(step.result);}
    }
    if(!before.size)continue;
    const targetLayout=segments[target],samples=[],rects=[];
    for(const s of before){
      const a=segments[s],start=baseline+a.side*8,control=2*a.peak-start;
      for(let n=0;n<=200;n++){const t=n/200;samples.push({x:a.a+(a.b-a.a)*t,y:(1-t)**2*start+2*(1-t)*t*control+t*t*start});}
      rects.push({x:a.mid-49,y:a.labelY-20,w:98,h:36});
    }
    for(const x of Object.values(positions))rects.push({x:x-15,y:baseline+12,w:30,h:25});
    const centers=[];
    for(let cx=targetLayout.a+34;cx<=targetLayout.b-34;cx+=4)centers.push(cx);
    centers.sort((a,b)=>Math.abs(a-targetLayout.mid)-Math.abs(b-targetLayout.mid));
    let found=false;
    for(let top=baseline+43;top<=height-46&&!found;top+=4)for(const cx of centers){
      const r={x:cx-32,y:top,w:64,h:42};
      const hit=samples.some(v=>v.x>=r.x-6&&v.x<=r.x+r.w+6&&v.y>=r.y-6&&v.y<=r.y+r.h+6)||rects.some(v=>r.x<v.x+v.w+6&&r.x+r.w>v.x-6&&r.y<v.y+v.h+6&&r.y+r.h>v.y-6);
      if(!hit){targetLayout.slotX=r.x;targetLayout.slotY=r.y;found=true;break;}
    }
    if(!found)throw Error(`找不到 ${p.id}/${target} 的空格位置`);
  }
  return {width,height,baseline,positions,segments};
}
