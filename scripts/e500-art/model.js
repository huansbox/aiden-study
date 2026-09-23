import * as THREE from 'three';
import { createBrickTools } from './brick-geometry.js';

// Full E500, built from the approved prototype's 16-unit stud grid. A long
// locomotive is more small bricks, never a stretched version of one large box.
export function createE500Model(material) {
  const model = new THREE.Group();
  model.name = '台鐵 E500 型電力機車';
  model.userData = { length: 576, width: 128, studPitch: 16, authoringVersion: 2 };
  const L = 576;
  const orange = '#f46a16', orangeLight = '#fa731b';
  const charcoal = '#30363d', dark = '#20272c', gray = '#59636c', lightGray = '#88939b';
  const { mesh, rounded, stud, brick, cylinder, slope, bar, beam } = createBrickTools(material);

  function part(pack, number, name, packTitle, build) {
    const group = new THREE.Group();
    group.name = name;
    group.userData = { id: `p${pack}-${number}`, name, packTitle, z: (pack - 1) * 3 + number - 1 };
    model.add(group);
    build(group);
    return group;
  }
  function cab(group, rear, build) {
    const local = new THREE.Group();
    local.name = rear ? '後端對稱駕駛室' : '前端駕駛室';
    if (rear) { local.position.x = L; local.rotation.y = Math.PI; }
    group.add(local);
    build(local);
  }

  function wheelset(group, x) {
    cylinder(group, '粗輪軸', [x, 20, 0], 5.3, 104, dark);
    brick(group, '輪軸承重橫磚', x - 8, 28, -48, 16, 12, 96, charcoal);
    for (const side of [-1, 1]) {
      const profile = [[0, -6], [17.6, -6], [19.3, -4.8], [20, -3.4],
        [20, 3.4], [19.3, 4.8], [17.6, 6], [0, 6]].map(([r, y]) => new THREE.Vector2(r, y));
      const tyre = mesh(group, '厚玩具輪胎', new THREE.LatheGeometry(profile, 40), '#1b2026', [x, 20, side * 46]);
      tyre.rotation.x = Math.PI / 2;
      cylinder(group, '厚輪圈', [x, 20, side * 53], 15.2, 3.2, gray);
      cylinder(group, '輪圈凹槽', [x, 20, side * 55], 11.8, 1.5, dark);
      for (let spoke = 0; spoke < 6; spoke++) {
        const angle = spoke * Math.PI / 3;
        const item = rounded(group, '粗輪輻', [x + Math.cos(angle) * 8.7, 20 + Math.sin(angle) * 8.7, side * 56], [3.7, 8.6, 2], lightGray, .65);
        item.rotation.z = angle - Math.PI / 2;
      }
      cylinder(group, '凸起輪心', [x, 20, side * 57.3], 6.4, 4.2, charcoal);
      cylinder(group, '輪心圓蓋', [x, 20, side * 59.6], 3.7, 1.1, lightGray);
      brick(group, '外側軸箱', x - 7.5, 25, side < 0 ? -64 : 50, 15, 13, 14, charcoal);
      cylinder(group, '軸箱圓蓋', [x, 31.5, side * 65], 4.3, 2.3, gray);
    }
  }
  function suspension(group, start) {
    for (const side of [-1, 1]) {
      const z = side < 0 ? -64 : 48;
      for (let x = start; x < start + 144; x += 32) {
        brick(group, '分段懸吊框磚', x, 39, z, Math.min(32, start + 144 - x), 12, 16, charcoal, true);
      }
      for (const x of [start + 43, start + 87]) {
        brick(group, '懸吊扣座上塊', x - 5, 26, z, 10, 8, 16, gray);
        brick(group, '懸吊扣座下塊', x - 5, 20, z + 2, 10, 6, 12, charcoal);
      }
    }
    for (const x of [start, start + 48, start + 96]) brick(group, '轉向架跨梁', x, 42, -40, 32, 9, 80, dark, true);
  }
  function lowerCab(group) {
    for (let row = 0; row < 4; row++) {
      const widths = row % 2 ? [16, 32, 32, 32, 16] : [32, 32, 32, 32];
      let z = -64;
      for (const [i, width] of widths.entries()) {
        brick(group, '橘色前臉小磚', 0, 64 + row * 12, z, 16, 12, width, (row + i) % 3 ? orange : orangeLight, row === 3);
        z += width;
      }
    }
    for (const side of [-1, 1]) {
      const z = side < 0 ? -64 : 48;
      for (let row = 0; row < 4; row++) for (const x of [16, 48]) {
        brick(group, '駕駛室下方小磚', x, 64 + row * 12, z, 32, 12, 16, row % 2 ? orangeLight : orange);
      }
      for (const y of [64, 80, 96]) brick(group, '車門下方磚', 80, y, z, 16, 16, 16, orange);
    }
  }
  function upperCab(group) {
    for (const side of [-1, 1]) {
      const z = side < 0 ? -64 : 48;
      // Both faces of the orange backing sit one unit inside the dark frame instead
      // of sharing its inner or outer face, including before the roof is placed.
      slope(group, '駕駛室橘色三角斜磚', [[16, 112], [48, 112], [48, 170], [29, 170]], z + 1, 14, orange);
      for (const y of [112, 128, 144, 160]) brick(group, '車門外柱', 80, y, z, 16, 16, 16, orangeLight);
      brick(group, '側窗底部橘磚', 48, 112, z, 32, 12, 16, orangeLight);
      brick(group, '側窗頂部橘磚', 48, 164, z, 32, 12, 16, orange);
    }
  }
  function windowFrame(group) {
    for (const z of [-64, 48]) {
      slope(group, '下半窗框斜磚', [[0, 112], [32, 112], [32, 143], [14.5, 143]], z, 16, charcoal);
      slope(group, '上半窗框斜磚', [[14.5, 143], [48, 143], [48, 174], [29, 174]], z, 16, charcoal);
    }
    for (const z of [-48, -16, 16]) brick(group, '擋風窗下緣短磚', 0, 112, z, 13, 12, 32, dark, true);
    for (const z of [-64, -32, 0, 32]) brick(group, '擋風窗上緣短磚', 29, 170, z, 16, 12, 32, charcoal);
    for (const side of [-1, 1]) {
      const z = side * 65;
      rounded(group, '側窗左框', [48.5, 144, z], [5, 40, 5], charcoal, .7);
      rounded(group, '側窗右框', [77.5, 144, z], [5, 40, 5], charcoal, .7);
      rounded(group, '側窗上框', [63, 162, z], [32, 5, 5], charcoal, .7);
      rounded(group, '側窗下框', [63, 126, z], [32, 5, 5], charcoal, .7);
    }
  }
  function windshield(group) {
    const shape = new THREE.Shape();
    shape.moveTo(5.6, 124); shape.lineTo(27, 168.8); shape.lineTo(30, 168.8); shape.lineTo(8.6, 124); shape.closePath();
    mesh(group, '整片厚前擋玻璃', new THREE.ExtrudeGeometry(shape, {
      depth: 94, bevelEnabled: true, bevelSize: .45, bevelThickness: .45, bevelSegments: 2,
    }), '#344954', [0, 0, -47], 'glass');
    brick(group, '車內儀表臺凸點板', 14, 116, -40, 16, 8, 80, dark, true);
    for (const z of [-27, 11]) {
      brick(group, '座椅座磚', 42, 121, z, 16, 8, 16, charcoal);
      brick(group, '座椅靠背磚', 54, 128, z, 8, 21, 16, charcoal);
    }
  }
  function sideWindows(group) {
    for (const side of [-1, 1]) {
      rounded(group, '側面透明窗片', [63, 144, side * 64.1], [25, 31, 2.5], '#344954', .65, 'glass');
      rounded(group, '車門小窗', [88, 150, side * 64.2], [8, 19, 2.8], '#344954', .65, 'glass');
      bar(group, '粗橘色車門扶手', [94, 82, side * 69], [94, 143, side * 69], 2.5, orangeLight);
      for (const y of [84, 139]) cylinder(group, '扶手圓扣', [94, y, side * 67], 3.8, 6, orange);
    }
  }
  function roofSection(group, start, end, color = gray) {
    for (let x = start; x < end; x += 32) {
      const length = Math.min(32, end - x);
      for (const z of [-32, 0]) brick(group, '車頂凸點板', x, 176, z, length, 8, 32, color, true);
      for (const side of [-1, 1]) {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0); shape.lineTo(2.5, 0); shape.lineTo(2.5, 4.7);
        shape.lineTo(13.5, 4.7); shape.lineTo(13.5, 0); shape.lineTo(32, 0);
        shape.lineTo(32, 8); shape.lineTo(16, 8); shape.lineTo(0, 4.8); shape.closePath();
        const item = mesh(group, '帶底部連接凹槽的屋頂斜磚', new THREE.ExtrudeGeometry(shape, {
          depth: length - 1.5, bevelEnabled: true, bevelSize: .5, bevelThickness: .5, bevelSegments: 2,
        }), color, [x + .75, 176, side < 0 ? -64 : 64]);
        item.rotation.y = side < 0 ? -Math.PI / 2 : Math.PI / 2;
        if (side < 0) item.position.x = x + length - .75;
        item.userData.brick = true;
      }
    }
  }
  function grille(group, x, length = 48) {
    brick(group, '車頂格柵底磚', x, 184, -24, length, 5, 48, dark);
    for (let at = x + 6; at < x + length - 4; at += 10) brick(group, '厚格柵條磚', at, 189, -20, 5, 3.5, 40, charcoal);
  }
  function insulatorBase(group, x) {
    brick(group, '集電弓支承底板', x - 32, 184, -40, 64, 5, 80, dark, true);
    for (const dx of [-20, 20]) for (const z of [-24, 24]) {
      cylinder(group, '粗絕緣支承柱', [x + dx, 193, z], 5.5, 9, lightGray, 'y');
      cylinder(group, '絕緣柱凸環', [x + dx, 195, z], 7.4, 2.2, gray, 'y');
    }
  }
  function pantograph(group, x, raised) {
    brick(group, '集電弓長方基座', x - 32, 198, -32, 64, 6, 64, charcoal, true);
    const elbowX = x + (raised ? 32 : 27), elbowY = raised ? 234 : 216;
    const shoeX = x - 15, shoeY = raised ? 265 : 230;
    for (const z of [-24, 24]) {
      beam(group, 'Z形下臂粗連桿', [x - 8, 207, z], [elbowX, elbowY, z], 7.5, gray);
      beam(group, 'Z形上臂粗連桿', [elbowX, elbowY, z], [shoeX, shoeY, z], 7.5, charcoal);
      cylinder(group, '集電弓大圓轉軸', [x - 8, 207, z], 6.4, 11, lightGray);
      cylinder(group, '集電弓肘部圓軸', [elbowX, elbowY, z], 6, 11, gray);
      cylinder(group, '肘部凸圓蓋', [elbowX, elbowY, z + (z > 0 ? 6 : -6)], 3.4, 1.8, lightGray);
    }
    rounded(group, '厚集電接觸橫桿', [shoeX, shoeY + 2, 0], [9, 7, 96], lightGray, 1.3);
    rounded(group, '接觸條上層短磚', [shoeX, shoeY + 6, 0], [12, 4, 80], gray, .8);
  }
  function topLamps(group) {
    brick(group, '車頂雙燈底座磚', 24, 174, -16, 16, 16, 32, charcoal, true);
    for (const z of [-8, 8]) {
      cylinder(group, '上方黑色圓燈座', [23.2, 182, z], 7, 3.5, dark, 'x');
      cylinder(group, '上方灰色燈圈', [20.8, 182, z], 5.6, 2, lightGray, 'x');
      cylinder(group, '上方乳白燈片', [19.4, 182, z], 4.35, 1.8, '#fff3ca', 'x');
    }
  }
  function lowerLamps(group) {
    for (const side of [-1, 1]) {
      brick(group, '前臉雙燈連接磚', -3, 87, side < 0 ? -56 : 24, 5, 16, 32, dark);
      for (const [offset, color] of [[0, '#fff4d5'], [13, '#c72f27']]) {
        const z = side * (48 - offset);
        cylinder(group, '下方黑色圓燈座', [-4, 95, z], 7, 4, dark, 'x');
        cylinder(group, '下方灰色圓燈圈', [-6.5, 95, z], 5.4, 1.6, lightGray, 'x');
        cylinder(group, '下方圓燈片', [-7.65, 95, z], 4, 1.25, color, 'x');
      }
    }
    // Small white, moulded railway emblem on the central orange brick.
    const shape = new THREE.Shape();
    [[-10, 101], [8, 101], [13, 96], [5, 96], [10, 88], [3, 88], [-3, 96], [-10, 90], [-15, 90], [-7, 98]].forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));
    shape.closePath();
    const mark = mesh(group, '白色車頭標誌', new THREE.ExtrudeGeometry(shape,{depth:.35,bevelEnabled:false}), '#fff4d5', [-.4,0,0]);
    mark.rotation.y = -Math.PI / 2;
  }
  function plow(group) {
    for (const side of [-1, 1]) brick(group, '橘色前端角磚', -3, 51, side < 0 ? -65 : 49, 16, 13, 16, orangeLight);
    slope(group, '厚灰色排障斜板', [[-16, 15], [-8, 15], [3, 32], [-5, 32]], -48, 96, gray);
  }
  function coupler(group) {
    brick(group, '前端厚防撞梁', -8, 49, -48, 16, 10, 96, dark);
    brick(group, '玩具車鉤連接塊', -17, 37, -12, 24, 14, 24, charcoal, true);
    brick(group, '玩具車鉤上顎', -26, 40, -12, 12, 11, 24, dark);
    brick(group, '玩具車鉤左顎', -29, 36, -12, 9, 9, 8, charcoal);
    brick(group, '玩具車鉤右顎', -29, 36, 4, 9, 9, 8, charcoal);
  }
  function stepsAndBadge(group) {
    const glyphs = {
      E: [[0,0,1,7],[0,6,4,1],[0,3,3,1],[0,0,4,1]],
      5: [[0,6,4,1],[0,3,1,4],[0,3,4,1],[3,0,1,4],[0,0,4,1]],
      0: [[0,0,1,7],[3,0,1,7],[0,6,4,1],[0,0,4,1]],
      1: [[2,0,1,7],[1,5,1,1],[1,0,3,1]],
    };
    for (const side of [-1, 1]) {
      for (const y of [56,64,72]) brick(group,'車門踏階厚板',80,y,side<0?-74:62,16,5,12,charcoal);
      [...'E501'].forEach((letter,index)=>glyphs[letter].forEach(([x,y,w,h])=>{
        const glyphX = side > 0 ? 48 + index * 6 + x + w / 2 : 72 - index * 6 - x - w / 2;
        rounded(group,'E501 車號字形',[glyphX,82+y+h/2,side*64.15],[w,h,.3],'#fff4d5',.08);
      }));
    }
  }

  // 1. Three genuinely separate track foundations, built from short ties and
  // rail plates. Wheel bottoms at Y0 meet the rail top at Y0.
  [-48,176,400].forEach((start,i)=>part(1,i+1,['前段展示軌道','中段展示軌道','後段展示軌道'][i],'鋪好展示軌道',g=>{
    for(let x=start;x<start+224;x+=64)brick(g,'軌道底座厚板',x,-14,-88,Math.min(64,start+224-x),8,176,charcoal);
    for(let x=start+8;x<start+224;x+=32)brick(g,'寬枕木磚',x,-6,-80,16,4,160,'#a89270');
    for(const z of [-49,43])for(let x=start;x<start+224;x+=32)brick(g,'短鋼軌板',x,-2.4,z,32,2.4,6,lightGray);
  }));
  [72,116,160].forEach((x,i)=>part(2,i+1,`前轉向架・第${['一','二','三'][i]}輪軸`,'前轉向架的三根輪軸',g=>wheelset(g,x)));
  [416,460,504].forEach((x,i)=>part(3,i+1,`後轉向架・第${['一','二','三'][i]}輪軸`,'後轉向架的三根輪軸',g=>wheelset(g,x)));
  [0,192,384].forEach((x,i)=>part(4,i+1,['前段承重底盤','中央承重底盤','後段承重底盤'][i],'連成長長的底盤',g=>{
    for(let at=x;at<x+192;at+=64){
      brick(g,'4×8底盤厚板',at,53,-64,64,11,128,charcoal,true);
      brick(g,'近側踏板邊磚',at,54,60,32,8,8,dark);
      brick(g,'遠側踏板邊磚',at,54,-68,32,8,8,dark);
    }
  }));
  part(5,1,'前轉向架分段懸吊框','懸吊與車底設備',g=>suspension(g,48));
  part(5,2,'後轉向架分段懸吊框','懸吊與車底設備',g=>suspension(g,384));
  part(5,3,'中央電池箱與圓風缸','懸吊與車底設備',g=>{
    for(const x of [224,256,288,320]){
      brick(g,'電池箱獨立方磚',x,29,-48,32,24,96,charcoal,true);
      for(const side of [-1,1])brick(g,'電池箱蓋板',x+3,32,side<0?-52:48,26,17,4,gray);
    }
    cylinder(g,'厚圓風缸',[208,42,0],10,88,gray);
  });
  part(6,1,'前駕駛室橘色下車身','裝上橘色下車身',g=>cab(g,false,lowerCab));
  part(6,2,'中央橘色裙板磚列','裝上橘色下車身',g=>{
    for(const z of [-64,48])for(let x=96;x<480;x+=32)brick(g,'中央下層橘磚',x,64,z,32,28,16,orange);
  });
  part(6,3,'後駕駛室下車身與車鉤','裝上橘色下車身',g=>cab(g,true,q=>{lowerCab(q);plow(q);coupler(q);}));
  [96,224,352].forEach((start,i)=>part(7,i+1,['前段機械室積木牆','中央機械室積木牆','後段機械室積木牆'][i],'拼起長形機車車身',g=>{
    for(const z of [-64,48])for(let row=0;row<3;row++){
      const lengths=row%2?[16,32,32,32,16]:[32,32,32,32];let x=start;
      lengths.forEach((length,j)=>{brick(g,'獨立橘色側牆磚',x,92+row*28,z,length,28,16,j%2?orangeLight:orange,row===2);x+=length;});
    }
    for(let x=start;x<start+128;x+=32)brick(g,'內部上梁積木',x,164,-48,32,12,96,orange,true);
  }));
  part(8,1,'前駕駛室橘色斜牆與門柱','兩端駕駛室骨架',g=>cab(g,false,upperCab));
  part(8,2,'後駕駛室斜牆與厚窗框','兩端駕駛室骨架',g=>cab(g,true,q=>{upperCab(q);windowFrame(q);}));
  part(8,3,'前駕駛室厚實斜窗框','兩端駕駛室骨架',g=>cab(g,false,windowFrame));
  part(9,1,'前端整片玻璃與儀表臺','透明車窗與扶手',g=>cab(g,false,windshield));
  part(9,2,'前側窗與粗橘色扶手','透明車窗與扶手',g=>cab(g,false,sideWindows));
  part(9,3,'後端玻璃窗組與扶手','透明車窗與扶手',g=>cab(g,true,q=>{windshield(q);sideWindows(q);}));
  part(10,1,'前駕駛室凸點屋頂','分段積木車頂',g=>roofSection(g,40,96,charcoal));
  part(10,2,'前半機械室斜磚屋頂','分段積木車頂',g=>roofSection(g,96,288));
  part(10,3,'後半屋頂與後駕駛室頂','分段積木車頂',g=>{roofSection(g,288,480);cab(g,true,q=>roofSection(q,40,96,charcoal));});
  part(11,1,'前端散熱格柵與絕緣座','車頂散熱與高壓設備',g=>{grille(g,104,32);insulatorBase(g,168);});
  part(11,2,'中央雙組厚磚散熱格柵','車頂散熱與高壓設備',g=>{grille(g,240,48);grille(g,304,48);});
  part(11,3,'後端散熱格柵與絕緣座','車頂散熱與高壓設備',g=>{insulatorBase(g,408);grille(g,448,32);});
  part(12,1,'前端升起的粗 Z 形集電弓','架起兩座單臂集電弓',g=>pantograph(g,168,true));
  part(12,2,'後端收低的粗 Z 形集電弓','架起兩座單臂集電弓',g=>pantograph(g,408,false));
  part(12,3,'黃色絕緣器與高壓連接桿','架起兩座單臂集電弓',g=>{
    for(const x of [208,224,368]){
      cylinder(g,'黃色絕緣柱',[x,197,-42],4.5,18,'#d4a52a','y');
      for(const y of [190,196,202])cylinder(g,'黃色絕緣凸環',[x,y,-42],6.5,2.5,'#e2b631','y');
    }
    rounded(g,'高壓粗連接桿',[288,206,-42],[176,4,4],gray,1);
  });
  part(13,1,'前端上方雙圓頭燈','點亮 E500 的車頭',g=>cab(g,false,topLamps));
  part(13,2,'前端下方雙燈組與標誌','點亮 E500 的車頭',g=>cab(g,false,lowerLamps));
  part(13,3,'後端燈組、踏階與車號','點亮 E500 的車頭',g=>cab(g,true,q=>{topLamps(q);lowerLamps(q);stepsAndBadge(q);}));
  part(14,1,'前端厚灰色排障板','完成車鉤與踏階',g=>cab(g,false,plow));
  part(14,2,'前端短厚玩具車鉤','完成車鉤與踏階',g=>cab(g,false,coupler));
  part(14,3,'前端踏階與 E501 車號','完成車鉤與踏階',g=>cab(g,false,stepsAndBadge));

  return model;
}
