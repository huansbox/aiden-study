import * as THREE from 'three';
import { createBrickTools } from './brick-geometry.js';

// The source has one fixed runway pack followed by ten playable aircraft packs.
// Facing -x keeps both jet intakes readable in the established orthographic view.
export function createJetPlaneModel(material) {
  const model = new THREE.Group();
  model.name = '藍白雙引擎噴射飛機';
  model.userData = { length: 536, width: 416, studPitch: 16, authoringVersion: 1, fixedPacks: 1 };
  const { mesh, brick, rounded, cylinder, slope, stud } = createBrickTools(material);
  const white = '#f0f3ef', blue = '#1977c9', darkBlue = '#144c8a', gray = '#9aa8b2';
  const black = '#26313b', glass = '#315669', silver = '#c9d1d3';
  let count = 0;
  function pack(title, parts) {
    const number = ++count;
    if (parts.length !== 3) throw Error('每包需要三組零件');
    for (const [index, [name, build]] of parts.entries()) {
      const group = new THREE.Group();
      group.name = name;
      group.userData = { id: `p${number}-${index + 1}`, name, packTitle: title, z: (number - 1) * 3 + index };
      model.add(group);
      build(group);
    }
  }
  function horizontal(g, name, points, y, height, color) {
    const shape = new THREE.Shape();
    points.forEach(([x, z], index) => index ? shape.lineTo(x, z) : shape.moveTo(x, z));
    shape.closePath();
    const item = mesh(g, name, new THREE.ExtrudeGeometry(shape, {
      depth: height, bevelEnabled: true, bevelSize: .65, bevelThickness: .65, bevelSegments: 2,
    }), color, [0, y, 0]);
    item.rotation.x = Math.PI / 2;
    item.userData.brick = true;
    return item;
  }
  function gear(g, x, z, nose = false) {
    const radius = nose ? 15 : 20;
    cylinder(g, '厚塑膠起落架輪胎', [x, radius, z], radius, nose ? 13 : 18, black);
    for (const side of [-1, 1]) cylinder(g, '銀灰起落架輪圈', [x, radius, z + side * (nose ? 7 : 10)], radius * .62, 2.5, gray);
    cylinder(g, '起落架粗支柱', [x, (radius + 65) / 2, z], 5.5, 65 - radius, silver, 'y');
    brick(g, '起落架凸點接板', x - 16, 61, z - 16, 32, 9, 32, darkBlue, true);
    brick(g, '輪架側面厚扣', x - 12, radius + 8, z - 8, 24, 12, 16, gray);
  }
  function belly(g, start, end) {
    for (let x = start; x < end; x += 32) {
      brick(g, '藍色短磚機腹', x, 68, -32, Math.min(32, end - x), 18, 64, blue, true);
      for (const side of [-1, 1]) brick(g, '機腹白色側肩', x, 81, side < 0 ? -48 : 32, Math.min(32, end - x), 16, 16, white, true);
    }
  }
  function bodyWall(g, side) {
    for (let y = 97, row = 0; y < 151; y += 18, row++) {
      for (let x = 112; x < 448;) {
        const length = Math.min(row % 2 ? 32 : 48, 448 - x);
        brick(g, '交錯白色機身短磚', x, y, side < 0 ? -48 : 32, length, 18, 16, white, true);
        x += length;
      }
    }
    for (let x = 112; x < 448; x += 32)
      brick(g, '藍色機身腰線', x, 106, side < 0 ? -49.5 : 48, Math.min(32, 448 - x), 9, 2, blue);
  }
  function wing(g, side) {
    for (let span = 48; span < 208; span += 32) {
      const next = Math.min(208, span + 32), lead = 228 + (span - 48) * .45, rear = 375 + (span - 48) * .14;
      horizontal(g, '主翼短斜面厚磚', [[lead, side * span], [lead + (next - span) * .45, side * next], [rear + (next - span) * .14, side * next], [rear, side * span]], 119, 13, white);
      horizontal(g, '主翼後緣藍色厚磚', [[rear - 22, side * span], [rear - 22 + (next - span) * .14, side * next], [rear + (next - span) * .14, side * next], [rear, side * span]], 120, 14, blue);
      for (let x = Math.ceil((lead + 8) / 16) * 16; x < rear - 28; x += 16)
        stud(g, x, 119.8, side * (span + 16), white);
    }
    brick(g, '機翼引擎可接凸點座', 246, 103, side < 0 ? -151 : 119, 48, 12, 32, darkBlue, true);
  }
  function pylon(g, side) {
    const z = side * 137;
    slope(g, '藍色引擎吊架厚斜磚', [[244, 94], [291, 94], [291, 112], [264, 112]], z - 8, 16, blue);
    brick(g, '引擎吊架接合底板', 236, 91, z - 16, 64, 9, 32, gray, true);
    // The wing-top locking shoe stays visible even if its nacelle was placed first.
    brick(g, '吊架穿翼藍色凸點鎖扣', 258, 120, z - 16, 32, 9, 32, blue, true);
  }
  function engine(g, side) {
    const z = side * 137;
    // Open annular nacelle: the separate fan is visible through its real intake.
    const profile = [[24, 0], [31, 0], [33, 8], [33, 56], [28, 70], [22, 70], [24, 56], [25, 8], [24, 0]];
    for (const [start, depth] of [[206, 24], [230, 24], [254, 22]]) {
      const points = profile.map(([radius, x]) => new THREE.Vector2(radius, x * depth / 70));
      const shell = mesh(g, '中空短磚噴射引擎殼', new THREE.LatheGeometry(points, 48), white, [start, 77, z]);
      shell.rotation.z = -Math.PI / 2;
      shell.userData.brick = true;
    }
    const rim = mesh(g, '厚實藍色進氣圓框', new THREE.TorusGeometry(28.5, 4.5, 16, 48), blue, [204, 77, z]);
    rim.rotation.y = Math.PI / 2;
    cylinder(g, '引擎後方深色噴口', [280, 77, z], 20, 9, black, 'x');
    brick(g, '引擎上方凸點短板', 228, 107, z - 8, 32, 5, 16, white, true);
  }
  function fan(g, side) {
    const z = side * 137;
    g.userData.mechanism = { type: 'fan', axis: 'x', pivot: [202, 77, z] };
    const rotor = new THREE.Group();
    rotor.name = side < 0 ? '左引擎獨立風扇轉子' : '右引擎獨立風扇轉子';
    rotor.position.set(202, 77, z);
    rotor.userData.movable = true;
    g.add(rotor);
    cylinder(rotor, '風扇深色內圈', [2, 0, 0], 24, 4, black, 'x');
    for (let blade = 0; blade < 9; blade++) {
      const vane = rounded(rotor, '獨立銀灰風扇葉片', [0, 13, 0], [5, 20, 7], silver, 1.5);
      const angle = blade * Math.PI * 2 / 9;
      vane.position.set(-1, Math.cos(angle) * 13, Math.sin(angle) * 13);
      vane.rotation.x = angle + .3;
    }
    cylinder(rotor, '藍色風扇中心圓扣', [-5, 0, 0], 7.5, 10, blue, 'x');
  }
  function top(g, start, end) {
    for (let x = start; x < end; x += 32) {
      const length = Math.min(32, end - x);
      for (const [z, width, y] of [[-48, 16, 154], [-32, 32, 161], [0, 32, 161], [32, 16, 154]])
        rounded(g, '短磚弧形機頂', [x + length / 2, y, z + width / 2], [length - .9, 16, width - .9], white, 4);
      brick(g, '機頂藍色凸點脊板', x, 169, -16, length, 6, 32, blue, true);
    }
  }
  pack('鋪好飛機展示跑道', [-8, 184, 376].map((x, i) => [
    ['前段展示跑道', '中段展示跑道', '後段展示跑道'][i], g => {
      for (let at = x; at < x + 192; at += 48) brick(g, '跑道厚底板', at, -14, -208, 48, 10, 416, '#667782');
      for (const z of [-186, 180]) brick(g, '跑道白色邊線', x + 4, -3, z, 184, 1.8, 6, white);
      for (let at = x + 24; at < x + 192; at += 64) brick(g, '跑道中央白短線', at, -3, -5, 32, 1.8, 10, white);
    },
  ]));
  pack('先裝起落架', [
    ['前起落架與輪組', g => gear(g, 116, 0, true)],
    ['左主起落架與輪組', g => gear(g, 350, -66)],
    ['右主起落架與輪組', g => gear(g, 350, 66)],
  ]);
  pack('接起藍色機腹與機翼座', [
    ['前段藍色機腹', g => belly(g, 80, 208)],
    ['中央翼盒與凸點接座', g => {
      belly(g, 208, 368);
      for (const side of [-1, 1]) for (let x = 240; x < 336; x += 32) brick(g, '外露機翼凸點接座', x, 93, side < 0 ? -64 : 48, 32, 15, 16, darkBlue, true);
    }],
    ['後段藍色機腹', g => {
      belly(g, 368, 464);
      for (const z of [-32, 0]) slope(g, '收窄機尾斜磚', [[464, 68], [520, 94], [520, 118], [464, 118]], z, 32, blue);
    }],
  ]);
  pack('疊起白色機身與藍色機鼻', [
    ['左側白色機身', g => bodyWall(g, -1)],
    ['右側白色機身', g => bodyWall(g, 1)],
    ['藍白階梯機鼻與座艙', g => {
      for (const [x, y, length, width, color] of [[32, 92, 48, 48, blue], [48, 110, 48, 64, blue], [64, 128, 48, 80, white], [80, 146, 32, 80, blue]])
        brick(g, '機鼻厚實階梯短磚', x, y, -width / 2, length, 18, width, color, true);
      for (const side of [-1, 1]) slope(g, '機鼻側面短斜磚', [[34, 92], [112, 92], [112, 146], [78, 146]], side < 0 ? -48 : 32, 16, white);
    }],
  ]);
  pack('展開兩側厚實主翼', [
    ['左側白藍主翼', g => wing(g, -1)],
    ['右側白藍主翼', g => wing(g, 1)],
    ['主翼中央藍色鎖扣', g => {
      for (let x = 248; x < 344; x += 32) brick(g, '主翼中央凸點鎖扣', x, 110, -32, 32, 18, 64, blue, true);
    }],
  ]);
  pack('組裝左側噴射引擎', [
    ['左引擎藍色吊架', g => pylon(g, -1)],
    ['左引擎中空進氣外殼', g => engine(g, -1)],
    ['左引擎獨立銀灰風扇', g => fan(g, -1)],
  ]);
  pack('組裝右側噴射引擎', [
    ['右引擎藍色吊架', g => pylon(g, 1)],
    ['右引擎中空進氣外殼', g => engine(g, 1)],
    ['右引擎獨立銀灰風扇', g => fan(g, 1)],
  ]);
  pack('封上凸點機頂', [
    ['前段白藍機頂', g => top(g, 112, 224)],
    ['中央白藍機頂', g => top(g, 224, 336)],
    ['後段白藍機頂', g => {
      top(g, 336, 448);
      for (const z of [-32, 0]) slope(g, '機尾上方收口短斜磚', [[448, 117], [520, 118], [480, 163], [448, 166]], z, 32, white);
    }],
  ]);
  pack('接上三片尾翼', [
    ...[-1, 1].map((side, index) => [['左側白藍水平尾翼', '右側白藍水平尾翼'][index], g => {
      for (let span = 32; span < 128; span += 32) {
        const lead = 440 + span * .3;
        horizontal(g, '水平尾翼厚斜磚', [[lead, side * span], [lead + 10, side * (span + 32)], [523, side * (span + 32)], [520, side * span]], 138, 11, index ? blue : white);
        for (let x = Math.ceil((lead + 8) / 16) * 16; x < 514; x += 16) stud(g, x, 138.8, side * (span + 16), index ? blue : white);
      }
    }]),
    ['藍色垂直尾翼', g => {
      for (const [bottom, points] of [[0, [[438, 164], [522, 142], [522, 192], [464, 192]]], [1, [[464, 192], [522, 192], [522, 228], [489, 228]]], [2, [[489, 228], [522, 228], [522, 246], [502, 246]]]])
        slope(g, '垂直尾翼短斜磚', points, -8, 16, bottom === 1 ? white : blue);
      brick(g, '尾翼頂部凸點短板', 504, 245, -8, 16, 5, 16, blue, true);
    }],
  ]);
  pack('裝上座艙與客窗', [
    ['深藍駕駛艙玻璃', g => {
      for (const side of [-1, 1]) {
        slope(g, '駕駛艙前方斜玻璃', [[58, 132], [64, 132], [87, 158], [81, 158]], side < 0 ? -32 : 1, 31, glass);
        rounded(g, '駕駛艙兩側深色玻璃', [98, 148, side * 41], [25, 24, 3], glass, 2, 'glass');
      }
      brick(g, '座艙中央白色窗柱', 69, 147, -3, 18, 13, 6, white);
    }],
    ...[[140,300],[300,432]].map(([start,end], index) => [['前段雙側客艙圓角窗列', '後段雙側客艙圓角窗列'][index], g => {
      for (const side of [-1,1]) for (let x = start; x < end; x += 32) {
        rounded(g, '白色獨立客窗外框', [x, 136, side * 49], [20, 24, 4], silver, 3);
        rounded(g, '深色獨立客艙窗', [x, 136, side * 52], [14, 18, 3], glass, 3, 'glass');
      }
    }]),
  ]);
  pack('完成翼尖與機尾細節', [
    ['左翼尖紅燈與翼梢', g => {
      brick(g, '左翼尖藍色厚翼梢', 301, 119, -215, 48, 17, 15, blue, true);
      rounded(g, '左翼尖紅色航行燈', [302, 132, -211], [18, 12, 12], '#e2463b', 3);
    }],
    ['右翼尖綠燈與翼梢', g => {
      brick(g, '右翼尖藍色厚翼梢', 301, 119, 200, 48, 17, 15, blue, true);
      rounded(g, '右翼尖綠色航行燈', [302, 132, 211], [18, 12, 12], '#4fba7e', 3);
    }],
    ['機尾排氣口與藍色收口', g => {
      brick(g, '機尾藍色厚收口', 516, 106, -24, 16, 24, 48, blue, true);
      cylinder(g, '機尾灰色排氣圓框', [534, 116, 0], 16, 6, gray, 'x');
      cylinder(g, '機尾深色排氣口', [538, 116, 0], 10, 3, black, 'x');
    }],
  ]);
  return model;
}
