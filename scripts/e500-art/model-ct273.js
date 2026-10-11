import * as THREE from 'three';
import { trainParts } from './train-parts.js';

export function createCT273Model(material) {
  const {model,pack,track,wheel,chassis,coupler,brick,rounded,cylinder,bar,slope,stud} =
    trainParts(material,'臺鐵 CT273・蒸汽機車與煤水車');
  const black='#24292e', dark='#191e23', gray='#657077', silver='#acb4b5', brass='#ba984d';
  track();
  pack('組裝前後小輪組',[
    ['前方兩軸導輪組',g=>{
      wheel(g,32,16);wheel(g,66,16);
      for(const side of [-1,1])brick(g,'導輪粗側梁',19,27,side<0?-62:50,64,9,12,gray,true);
    }],
    ['駕駛室下方從輪組',g=>{
      wheel(g,374,22);
      for(const side of [-1,1])brick(g,'從輪粗側梁',358,37,side<0?-62:50,32,12,12,black,true);
    }],
    ['前後小輪支架與汽缸座',g=>{
      brick(g,'導輪中央轉軸',39,35,-32,32,24,64,black,true);
      brick(g,'從輪承重座',355,47,-32,40,23,64,black,true);
      for(const side of [-1,1])brick(g,'汽缸承重座',79,37,side<0?-64:32,40,34,32,gray,true);
    }]
  ]);
  function driver(g,x) {
    cylinder(g,'大輪粗輪軸',[x,36,0],6,112,dark);
    for(const side of [-1,1]) {
      cylinder(g,'黑色大動輪厚輪胎',[x,36,side*49],36,13,dark);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(30.5,2.2,8,32),material(gray));
      ring.position.set(x,36,side*57);g.add(ring);
      cylinder(g,'大輪深色輪盤',[x,36,side*56],28,3,black);
      for(let a=0;a<8;a++) {
        const angle=a*Math.PI/4;
        bar(g,'大動輪粗輻條',[x,36,side*59],[x+Math.cos(angle)*27,36+Math.sin(angle)*27,side*59],2.7,gray);
      }
      cylinder(g,'大動輪輪心',[x,36,side*61],9,4,silver);
    }
  }
  pack('裝上三組大動輪',[
    ['第一組大型輻條動輪',g=>driver(g,144)],['第二組大型輻條動輪',g=>driver(g,218)],
    ['第三組大型輻條動輪',g=>driver(g,292)]
  ]);
  pack('接起機車與煤水車底盤',[
    ['前半段機車厚底盤',g=>chassis(g,8,208,76)],
    ['後半段機車厚底盤',g=>chassis(g,208,408,76)],
    ['煤水車底盤與連結梁',g=>{
      chassis(g,424,584,54);
      brick(g,'機車與煤水車連結梁',402,57,-10,27,10,20,gray,true);
    }]
  ]);
  function boiler(g,start,end) {
    for(let x=start;x<end;x+=24){
      const length=Math.min(24,end-x);
      cylinder(g,'分段圓弧鍋爐磚',[x+length/2,134,0],40,length-1,black,'x');
      for(const z of [-8,8])stud(g,x+length/2,173,z,black);
    }
  }
  pack('組起分段圓弧鍋爐',[
    ['鍋爐前段厚弧形磚',g=>boiler(g,112,184)],
    ['鍋爐中段厚弧形磚',g=>boiler(g,184,256)],
    ['鍋爐後段厚弧形磚',g=>boiler(g,256,328)]
  ]);
  pack('裝好煙箱與除煙板',[
    ['車頭圓形煙箱筒',g=>{
      for(const x of [82,97])cylinder(g,'煙箱分段黑磚',[x+7,134,0],41,14,dark,'x');
      brick(g,'煙箱上方凸點',88,175,-16,16,4,32,black,true);
    }],
    ['圓形煙箱門與中央把手',g=>{
      cylinder(g,'煙箱門粗外框',[77,134,0],41,8,gray,'x');
      cylinder(g,'煙箱門黑色圓片',[71,134,0],36,6,black,'x');
      cylinder(g,'門中央黃銅扣',[66,134,0],7,5,brass,'x');
      bar(g,'煙箱門短把手',[62,120,0],[62,146,0],2.5,silver);
    }],
    ['左右直立除煙板',g=>{
      for(const side of [-1,1]){
        brick(g,'除煙板下厚磚',73,91,side<0?-65:58,72,38,7,black,true);
        brick(g,'除煙板上厚磚',73,129,side<0?-65:58,72,51,7,black,true);
      }
    }]
  ]);
  pack('裝上汽缸與側面走道',[
    ['左右粗汽缸與活塞導架',g=>{
      for(const side of [-1,1]){
        cylinder(g,'短粗汽缸',[97,55,side*51],18,35,black,'x');
        cylinder(g,'汽缸銀灰前蓋',[78,55,side*51],15,4,gray,'x');
        bar(g,'粗活塞導架',[104,43,side*62],[153,43,side*62],5,gray);
      }
    }],
    ['前半段雙側積木走道',g=>{
      for(const side of [-1,1])for(let x=144;x<240;x+=32)brick(g,'前走道短凸點板',x,88,side<0?-69:45,32,7,24,gray,true);
    }],
    ['後半段雙側積木走道',g=>{
      for(const side of [-1,1])for(let x=240;x<336;x+=32)brick(g,'後走道短凸點板',x,88,side<0?-69:45,32,7,24,gray,true);
    }]
  ]);
  pack('搭起黑色駕駛室',[
    ['駕駛室雙側磚牆與方窗',g=>{
      for(const side of [-1,1]){
        for(let x=336;x<400;x+=32)brick(g,'駕駛室下段短磚',x,89,side<0?-64:48,32,53,16,black,true);
        for(const x of [336,386])brick(g,'窗邊粗立柱',x,142,side<0?-64:48,14,52,16,black,true);
        rounded(g,'駕駛室深色窗',[368,164,side*59],[32,43,10],'#314049',1,'glass');
        brick(g,'窗頂厚橫磚',336,185,side<0?-64:48,64,10,16,black,true);
      }
    }],
    ['駕駛室前牆與後端門框',g=>{
      for(const z of [-64,-32,0,32])brick(g,'駕駛室前牆',327,93,z,9,100,32,black,true);
      for(const side of [-1,1])brick(g,'駕駛室後門側柱',399,90,side<0?-64:48,9,105,16,black,true);
      brick(g,'後門上框',399,184,-48,9,11,96,gray,true);
    }],
    ['駕駛室厚磚弧形屋頂',g=>{
      for(let x=320;x<416;x+=32){
        rounded(g,'黑色弧頂磚',[x+16,203,0],[31,19,132],black,6);
        brick(g,'屋頂凸點厚板',x,211,-32,32,4,64,black,true);
      }
    }]
  ]);
  pack('組裝煤水車四軸輪組',[
    ['煤水車前兩組輪軸',g=>{wheel(g,446,20);wheel(g,478,20);}],
    ['煤水車後兩組輪軸',g=>{wheel(g,534,20);wheel(g,566,20);}],
    ['煤水車轉向架側梁',g=>{
      for(const side of [-1,1])for(const x of [430,518]){
        brick(g,'煤水車側梁',x,35,side<0?-63:49,64,13,14,black,true);
        for(const dx of [16,48])cylinder(g,'煤水車軸箱圓扣',[x+dx,29,side*65],7,4,gray);
      }
    }]
  ]);
  pack('疊出煤水車車身',[
    ['煤水車下層厚磚箱',g=>{
      for(const side of [-1,1])for(let x=424;x<584;x+=32)brick(g,'下層煤水箱短磚',x,67,side<0?-64:48,32,47,16,black,true);
      for(const x of [424,568])brick(g,'煤水箱端面',x,67,-48,16,47,96,black,true);
    }],
    ['煤水車上層箱壁',g=>{
      for(const side of [-1,1])for(let x=424;x<584;x+=32)brick(g,'上層煤水箱短磚',x,114,side<0?-64:48,32,52,16,black,true);
      for(const x of [424,568])brick(g,'煤水箱上端壁',x,114,-48,16,52,96,black,true);
      brick(g,'煤塊底座',440,142,-48,128,10,96,dark,true);
    }],
    ['煤水車黑色凸點煤堆',g=>{
      for(let x=448;x<566;x+=16)for(let z=-40;z<48;z+=16){
        const h=8+((x+z)/16%3+3)%3*6;
        brick(g,'可辨識凸點煤塊',x,151,z,16,h,16,dark,true);
      }
    }]
  ]);
  pack('豎起煙囪與蒸汽圓頂',[
    ['分段高煙囪',g=>{
      for(const [y,r,h] of [[183,15,17],[202,11,22],[216,16,7]])cylinder(g,'煙囪粗圓磚',[102,y,0],r,h,black,'y');
      cylinder(g,'煙囪頂部深色孔',[102,220,0],10,2,dark,'y');
    }],
    ['前方蒸汽圓頂',g=>{
      cylinder(g,'圓頂粗底座',[203,179,0],25,10,gray,'y');
      rounded(g,'蒸汽圓頂厚磚',[203,193,0],[40,29,40],black,9);
      cylinder(g,'圓頂黃銅帽',[203,211,0],7,8,brass,'y');
    }],
    ['後方砂箱與汽笛',g=>{
      rounded(g,'後圓頂厚磚',[269,190,0],[32,29,34],black,8);
      cylinder(g,'砂箱上圓扣',[269,209,0],8,8,gray,'y');
      for(const x of [302,315])cylinder(g,'短黃銅汽笛',[x,190,-12],4,30,brass,'y');
    }]
  ]);
  pack('連起動輪與鍋爐管線',[
    ['左右三大動輪連桿',g=>{
      for(const side of [-1,1]){
        bar(g,'厚實銀色動輪連桿',[144,26,side*66],[292,26,side*66],5,silver);
        for(const x of [144,218,292])cylinder(g,'連桿圓形軸扣',[x,26,side*68],8,5,silver);
      }
    }],
    ['鍋爐雙側銀灰扶手',g=>{
      for(const side of [-1,1]){
        bar(g,'鍋爐粗長扶手',[150,150,side*42],[328,150,side*42],2.8,silver);
        for(const x of [160,224,288])bar(g,'扶手短支架',[x,139,side*35],[x,150,side*42],2.5,gray);
      }
    }],
    ['駕駛室上車梯與扶手',g=>{
      for(const side of [-1,1]){
        for(const y of [39,53,67])brick(g,'駕駛室梯級',386,y,side<0?-78:62,24,4,16,gray,true);
        for(const x of [388,407])bar(g,'駕駛室銀色扶手',[x,70,side*70],[x,171,side*70],2.5,silver);
      }
    }]
  ]);
  pack('加上 CT273 專屬細節',[
    ['煤水車上沿與水箱蓋',g=>{
      for(const side of [-1,1])for(let x=424;x<584;x+=32)brick(g,'煤水箱上沿短磚',x,167,side<0?-68:52,32,7,16,gray,true);
      brick(g,'煤水車前水箱蓋',430,174,-32,32,5,64,black,true);
    }],
    ['煤水車後端平台與手把',g=>{
      brick(g,'煤水車後端踏板',572,62,-68,22,6,136,gray,true);
      for(const side of [-1,1])bar(g,'煤水車側面後扶手',[579,82,side*69],[579,151,side*69],3,silver);
      brick(g,'煤水車後車鉤',584,44,-12,16,15,24,black,true);
    }],
    ['雙側 CT273 黃銅號牌',g=>{
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=112;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#bfa35f';ctx.fillRect(0,0,256,112);
      ctx.fillStyle='#272c31';ctx.fillRect(7,7,242,98);
      ctx.fillStyle='#f1d49a';ctx.font='bold 64px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('CT273',128,60);
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      for(const side of [-1,1]){
        rounded(g,'黃銅號牌厚底',[368,117,side*66],[49,25,4],brass,1);
        const plate=new THREE.Mesh(new THREE.PlaneGeometry(46,21),new THREE.MeshBasicMaterial({map:texture}));
        plate.position.set(368,117,side*69);if(side<0)plate.rotation.y=Math.PI;g.add(plate);
      }
    }]
  ]);
  pack('CT273 蒸汽機車出發',[
    ['車頭前端厚踏板與排障板',g=>{
      brick(g,'前端橫向踏板',12,78,-64,54,7,128,gray,true);
      for(const z of [-48,-16,16])slope(g,'前排障板短斜磚',[[0,14],[24,14],[32,44],[11,44]],z,32,black);
    }],
    ['車頭上方金框大燈',g=>{
      cylinder(g,'頭燈黑色燈殼',[64,176,0],14,16,black,'x');
      cylinder(g,'頭燈金色外圈',[54,176,0],12,4,brass,'x');
      cylinder(g,'頭燈乳白燈面',[50,176,0],9,3,'#fff2ce','x');
    }],
    ['車頭中央連結鉤與防撞梁',g=>{
      brick(g,'車頭防撞梁',2,43,-54,18,14,108,black,true);
      coupler(g,-12);
    }]
  ]);
  return model;
}

