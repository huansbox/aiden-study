import * as THREE from 'three';
import { createBrickTools } from './brick-geometry.js';

// Authoring specimen for the isolated window/door experiment. Shares the
// formal train's rounded bricks, 16-unit stud grid, palette and plastic finish.
// Front-facing orthographic projection keeps the accepted drag axes unchanged.
export const LAB_VIEW = { width: 900, height: 470, scale: 4, tilt: .24 };
export function createBreezyLabModel(material) {
  const {rounded,brick,bar,cylinder}=createBrickTools(material);
  const colors={blue:'#245f9b',dark:'#194775',cream:'#ede5c9',gray:'#6e787e',frame:'#b9c3c4',black:'#252c34',glass:'#29434d'};
  const model=new THREE.Group(),layers={};
  for(const id of ['body','window-frame','window-upper','window-lower','door-frame','door-pane']){const g=new THREE.Group();g.name=id;model.add(g);layers[id]=g;}
  const s=LAB_VIEW.scale,c=Math.cos(LAB_VIEW.tilt);
  const px=x=>(x-450)/s,py=y=>(235-y)/(s*c);
  function box(g,name,x,y,w,h,depth,color,front=0,radius=.6){
    return rounded(g,name,[px(x+w/2),py(y+h/2),(front-depth/2)/s],[w/s,h/(s*c),depth/s],color,radius);
  }
  function block(g,x,y,w,h,color,depth=64,front=0,studs=false){
    return brick(g,'獨立積木',px(x),py(y+h),(front-depth)/s,w/s,h/(s*c),depth/s,color,studs);
  }
  const body=layers.body;
  box(body,'深藍內側車身',63,97,774,321,8,'#153650',-80);
  // Real openings: interrupted courses reveal the interior and the seating
  // until the matching frame and movable pane are attached.
  for(const [a,b] of [[62,142],[432,568],[772,838]]){
    for(let y=98;y<394;y+=37)for(let x=a;x<b;x+=64)block(body,x,y,Math.min(64,b-x),Math.min(37,394-y),colors.blue);
  }
  for(const [a,b,start] of [[142,432,355],[568,772,399]]){
    for(let y=start;y<401;y+=23)for(let x=a;x<b;x+=64)block(body,x,y,Math.min(64,b-x),Math.min(23,401-y),colors.blue);
  }
  for(let x=62;x<838;x+=64){
    block(body,x,78,Math.min(64,838-x),20,colors.blue,64,0,true);
    block(body,x,401,Math.min(64,838-x),15,colors.black,80,5);
  }
  // The window has a blue header; the door reaches the common top beam.
  for(let x=142;x<432;x+=64)block(body,x,98,Math.min(64,432-x),31,colors.blue);
  for(const [a,b] of [[62,568],[772,838]])for(let x=a;x<b;x+=64){
    box(body,'奶油色腰線',x,374,Math.min(64,b-x)-1,6,4,colors.cream,3,.25);
    box(body,'下緣飾條',x,392,Math.min(64,b-x)-1,3,4,colors.cream,3,.18);
  }
  // Separate gray roof plates, exposed studs and warm highlights make the
  // construction legible even before any movable parts have been installed.
  for(let x=54;x<846;x+=64)block(body,x,62,Math.min(64,846-x),16,colors.gray,128,4,true);
  // Recessed carriage interior, assembled from its own blocks.
  box(body,'深色內牆',143,139,288,213,8,'#102d49',-100);
  for(let x=154;x<426;x+=64)block(body,x,273,Math.min(64,426-x),64,'#557558',48,-53,true);
  box(body,'車門內部陰影',570,109,200,288,8,'#173447',-100);
  for(const [y,z] of [[350,-68],[371,-40],[392,-12]])for(let x=585;x<761;x+=64)block(body,x,y,Math.min(64,761-x),13,colors.black,36,z,true);
  // Wheelsets and axles use the same solid cylinders as the formal train.
  for(const x of [137,194,706,763]){
    cylinder(body,'輪胎',[px(x),py(424),-8/s],23/s,17/s,colors.black);
    cylinder(body,'輪心',[px(x),py(424),2/s],12/s,5/s,colors.gray);
    cylinder(body,'軸心',[px(x),py(424),5/s],5/s,6/s,colors.frame);
  }
  for(const [a,b] of [[119,213],[688,782]])box(body,'轉向架側梁',a,408,b-a,13,16,colors.black,9);

  function frame(id,x,y,w,h){
    const g=layers[id],t=15;
    for(const [bx,by,bw,bh] of [[x,y,w,t],[x,y+h-t,w,t],[x,y+t,t,h-2*t],[x+w-t,y+t,t,h-2*t]]){
      box(g,'厚塑膠外框',bx,by,bw,bh,25,colors.frame,8,.6);
    }
    // Molded inner rail instead of the former drawn bolt/screw outline.
    for(const bx of [x+t+1,x+w-t-5])box(g,'滑軌',bx,y+t,4,h-2*t,10,colors.gray,4,.18);
    for(let sx=x+29;sx<x+w-15;sx+=64){
      const stud=new THREE.Mesh(new THREE.CylinderGeometry(4.6,4.6,3.7,32),material(colors.frame));
      stud.position.set(px(sx),py(y)-.1,-8/s);stud.castShadow=stud.receiveShadow=true;g.add(stud);
    }
  }
  frame('window-frame',148,135,278,214);
  frame('door-frame',574,99,192,298);
  box(layers['window-frame'],'窗框中梁',163,237,248,8,24,colors.frame,9,.35);
  function pane(g,x,y,w,h,front=9){
    box(g,'透明塑膠窗面',x+3,y+3,w-6,h-6,5,colors.glass,front,.35).material=material(colors.glass,'glass');
    for(const [bx,by,bw,bh] of [[x,y,w,7],[x,y+h-7,w,7],[x,y+7,7,h-14],[x+w-7,y+7,7,h-14]])box(g,'窗扇塑膠邊',bx,by,bw,bh,13,colors.frame,front+6,.35);
  }
  pane(layers['window-upper'],169,155,236,82);
  pane(layers['window-lower'],169,247,236,82);
  box(layers['window-lower'],'凸出窗把',263,307,48,10,16,colors.frame,25,.7);
  const door=layers['door-pane'];
  box(door,'模製門板',594,119,152,258,22,colors.dark,12,.7);
  pane(door,609,140,120,95,22);
  for(let y=252;y<365;y+=37)box(door,'門板分件',607,y,108,Math.min(35,365-y),5,colors.blue,16,.6);
  for(const y of [261,303])box(door,'門把固定座',718,y,12,10,14,colors.frame,25,.5);
  bar(door,'凸出銀色門把',[px(725),py(266),30/s],[px(725),py(308),30/s],1.35,colors.frame);
  return {model,layers};
}
