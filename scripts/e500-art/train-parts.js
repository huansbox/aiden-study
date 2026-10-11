import * as THREE from 'three';
import { createBrickTools } from './brick-geometry.js';

// Shared only by the three 2026-10 additions; existing artwork is unchanged.
export function trainParts(material, name) {
  const model = new THREE.Group();
  model.name = name;
  model.userData = { length: 576, width: 128, studPitch: 16, authoringVersion: 1 };
  const t = createBrickTools(material);
  const { brick, rounded, cylinder } = t;
  const black = '#252b31', gray = '#6f7980', metal = '#aab0b2';
  let count = 0;
  function pack(title, parts) {
    if (parts.length !== 3) throw Error('A pack needs three groups');
    const number = ++count;
    parts.forEach(([label, build], i) => {
      const group = new THREE.Group();
      group.name = label;
      group.userData = { id: `p${number}-${i+1}`, name: label, packTitle: title, z: (number-1)*3+i };
      model.add(group);
      build(group);
    });
  }
  function track() {
    pack('鋪好展示軌道', [-48,176,400].map((start,i) => [[ '前段展示軌道','中段展示軌道','後段展示軌道'][i], g => {
      for (let x=start;x<start+224;x+=64) brick(g,'軌道厚底板',x,-14,-88,Math.min(64,start+224-x),8,176,black);
      for (let x=start+8;x<start+224;x+=32) brick(g,'寬枕木',x,-6,-80,16,4,160,'#a89270');
      for (const z of [-49,43]) for(let x=start;x<start+224;x+=32) brick(g,'分段鋼軌',x,-2.4,z,32,2.4,6,metal);
    }]));
  }
  function wheel(g,x,r=23,y=r) {
    cylinder(g,'粗輪軸',[x,y,0],5,104,black);
    for (const side of [-1,1]) {
      cylinder(g,'厚塑膠車輪',[x,y,side*48],r,13,black);
      cylinder(g,'銀灰輪圈',[x,y,side*55],r*.73,2.5,gray);
      cylinder(g,'輪心凸扣',[x,y,side*58],r*.27,4,metal);
    }
  }
  function bogie(g,x) {
    for (const side of [-1,1]) {
      for (let at=x;at<x+96;at+=32) brick(g,'凸點轉向架側梁',at,38,side<0?-64:50,32,13,14,black,true);
      for (const at of [x+17,x+65]) {
        rounded(g,'軸箱',[at,31,side*64],[16,18,8],gray,1.4);
        cylinder(g,'軸箱圓扣',[at,31,side*69],5,3,metal);
      }
    }
    brick(g,'轉向架中央橫梁',x+32,44,-48,32,11,96,black,true);
  }
  function chassis(g,start,end,y=58) {
    for(let x=start;x<end;x+=32) brick(g,'短底盤厚板',x,y,-64,Math.min(32,end-x),12,128,black,true);
  }
  function wall(g,start,end,color,bottom=72,top=124) {
    for(const side of [-1,1]) for(let y=bottom,row=0;y<top;y+=18,row++) {
      for(let x=start;x<end;) {
        const n=Math.min(row%2?32:48,end-x);
        brick(g,'交錯車身短磚',x,y,side<0?-64:48,n,Math.min(18,top-y),16,color,true);
        x+=n;
      }
    }
  }
  function belt(g,start,end,y,color,height=8) {
    for(const side of [-1,1]) for(let x=start;x<end;x+=32)
      brick(g,'分段車身色帶',x,y,side<0?-65:64,Math.min(32,end-x),height,2,color);
  }
  function roof(g,start,end,color,top=202) {
    for(let x=start;x<end;x+=32) {
      const length=Math.min(32,end-x);
      // Cross-section made from stepped curved toy plates, with a studded spine.
      for(const [z,width,y] of [[-64,16,top-11],[-48,32,top-4],[-16,32,top],[16,32,top-4],[48,16,top-11]])
        rounded(g,'分段弧頂磚',[x+length/2,y,z+width/2],[length-.9,12,width-.9],color,4);
      brick(g,'屋頂中央凸點板',x,top+5,-16,length,5,32,color,true);
    }
  }
  function vent(g,x,color=gray) {
    brick(g,'空調底座',x,214,-32,64,7,64,color,true);
    rounded(g,'厚實空調外殼',[x+32,230,0],[60,22,58],color,3);
    for(let at=x+8;at<x+58;at+=10) brick(g,'通風格柵',at,242,-24,5,3,48,black);
  }
  function coupler(g,x) {
    brick(g,'車鉤座',x,46,-13,20,16,26,gray,true);
    brick(g,'玩具車鉤',x-12,46,-9,16,11,18,black);
  }
  return { model, pack, track, wheel, bogie, chassis, wall, belt, roof, vent, coupler, ...t };
}
