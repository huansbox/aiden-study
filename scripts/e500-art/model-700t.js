import * as THREE from 'three';
import { createBrickTools } from './brick-geometry.js';

// A single 700T leading car. Every shell course is made from short, separate
// toy bricks; the stepped duckbill and its orange lower jaw belong to this car.
export function create700TModel(material) {
  const model = new THREE.Group();
  model.name = '台灣高鐵 700T・先頭車';
  model.userData = { length: 576, width: 128, studPitch: 16, authoringVersion: 1 };
  const { brick, rounded, slope, cylinder } = createBrickTools(material);
  const white = '#f6f4eb', warmWhite = '#fffaf0', shadow = '#d8d9d4';
  const orange = '#ee651e', orangeLight = '#fa7929';
  const black = '#242831', glass = '#273a45', steel = '#8d969a';
  const frame = '#454b50', equipment = '#697278', lamp = '#fff2cb';

  function part(pack, number, name, packTitle, build) {
    const group = new THREE.Group();
    group.name = name;
    group.userData = { id: `p${pack}-${number}`, name, packTitle, z: (pack - 1) * 3 + number - 1 };
    model.add(group);
    build(group);
  }

  function wheel(group, x) {
    cylinder(group, '玩具輪軸', [x, 20, 0], 5, 104, black);
    for (const side of [-1, 1]) {
      cylinder(group, '厚黑色車輪', [x, 20, side * 47], 20, 13, black);
      cylinder(group, '銀灰輪圈', [x, 20, side * 55], 14, 2.5, equipment);
      cylinder(group, '凸起輪心', [x, 20, side * 57], 5.5, 3, steel);
      brick(group, '方磚軸箱', x - 8, 25, side < 0 ? -64 : 50, 16, 14, 14, frame);
      cylinder(group, '軸箱圓蓋', [x, 32, side * 65], 4, 2, steel);
    }
  }

  function bogieFrame(group, start) {
    for (const side of [-1, 1]) {
      const z = side < 0 ? -64 : 48;
      for (const x of [start, start + 32, start + 64])
        brick(group, '轉向架分段側梁', x, 38, z, 32, 12, 16, frame, true);
      for (const x of [start + 22, start + 74])
        cylinder(group, '粗彈簧圓座', [x, 37, side * 65], 7, 4, equipment);
    }
    for (const x of [start + 8, start + 56])
      brick(group, '轉向架橫梁', x, 42, -48, 16, 10, 96, black, true);
  }

  function chassis(group, start) {
    for (let x = start; x < start + 192; x += 64) {
      brick(group, '底盤厚板', x, 54, -64, 64, 11, 128, frame, true);
      for (const side of [-1, 1]) for (const dx of [0, 32])
        brick(group, '底盤外緣短磚', x + dx, 58, side < 0 ? -68 : 60, 32, 8, 8, black);
    }
  }

  function wall(group, start, end, lower) {
    for (const side of [-1, 1]) {
      const z = side < 0 ? -64 : 48;
      const rows = lower ? [67, 85, 103] : [121, 139, 157];
      for (const [row, y] of rows.entries()) {
        for (let x = start; x < end;) {
          const length = Math.min((row + Math.floor(x / 32)) % 2 ? 32 : 48, end - x);
          brick(group, lower ? '下層白色車身磚' : '上層白色車身磚',
            x, y, z, length, 18, 16, (row + Math.floor(x / 48)) % 4 ? white : warmWhite,
            !lower && row === 2);
          x += length;
        }
      }
    }
  }

  function stripe(group, start, end) {
    for (const side of [-1, 1]) {
      const z = side < 0 ? -66.5 : 64.5;
      for (let x = start; x < end; x += 32) {
        const length = Math.min(32, end - x);
        brick(group, '橘色寬腰帶短磚', x, 98, z, length, 17, 2, (x / 32) % 3 ? orange : orangeLight);
        brick(group, '腰帶下方細黑線', x, 95, side < 0 ? -67 : 65, length, 2, 2, black);
      }
    }
  }

  function sideWindows(group, starts) {
    for (const side of [-1, 1]) {
      for (const x of starts) {
        rounded(group, '獨立深色客窗', [x + 14, 146, side * 65.2], [27, 22, 3], glass, 1, 'glass');
        brick(group, '客窗下方細框', x, 133, side < 0 ? -67 : 65, 28, 2, 2, frame);
        brick(group, '客窗上方細框', x, 159, side < 0 ? -67 : 65, 28, 2, 2, frame);
      }
    }
  }

  function door(group, x) {
    for (const side of [-1, 1]) {
      const z = side * 65.5;
      rounded(group, '白色乘客門', [x + 12, 118, z], [24, 88, 3], warmWhite, 1.2);
      rounded(group, '乘客門窄窗', [x + 12, 147, side * 67.3], [9, 22, 2.5], glass, .7, 'glass');
      for (const edge of [x - 1, x + 24])
        brick(group, '車門直縫', edge, 74, side < 0 ? -68 : 67, 2, 85, 1.5, frame);
      brick(group, '登車厚踏板', x, 63, side < 0 ? -76 : 63, 24, 5, 13, frame, true);
    }
  }

  function roof(group, start, end) {
    for (let x = start; x < end; x += 32) {
      const length = Math.min(32, end - x);
      for (const z of [-48, -16, 16])
        brick(group, '白色分段車頂凸點磚', x, 175, z, length, 8, 32, white, true);
      for (const side of [-1, 1])
        slope(group, '車頂邊緣斜短磚', [[x, 173], [x + length, 173],
          [x + length, 183], [x, 183]], side < 0 ? -64 : 48, 16, shadow);
    }
  }

  // The three track foundations match the collection's assembly stage.
  [-48, 176, 400].forEach((start, i) => part(1, i + 1,
    ['前段展示軌道', '中段展示軌道', '後段展示軌道'][i], '鋪好展示軌道', group => {
      for (let x = start; x < start + 224; x += 64)
        brick(group, '軌道底座厚板', x, -14, -88, Math.min(64, start + 224 - x), 8, 176, frame);
      for (let x = start + 8; x < start + 224; x += 32)
        brick(group, '寬枕木磚', x, -6, -80, 16, 4, 160, '#a89270');
      for (const z of [-49, 43]) for (let x = start; x < start + 224; x += 32)
        brick(group, '短鋼軌板', x, -2.4, z, 32, 2.4, 6, steel);
    }));

  part(2, 1, '前轉向架第一輪軸', '組裝前轉向架', group => wheel(group, 112));
  part(2, 2, '前轉向架第二輪軸', '組裝前轉向架', group => wheel(group, 160));
  part(2, 3, '前轉向架側梁與彈簧', '組裝前轉向架', group => bogieFrame(group, 88));
  part(3, 1, '後轉向架第一輪軸', '組裝後轉向架', group => wheel(group, 432));
  part(3, 2, '後轉向架第二輪軸', '組裝後轉向架', group => wheel(group, 480));
  part(3, 3, '後轉向架側梁與彈簧', '組裝後轉向架', group => bogieFrame(group, 408));

  [0, 192, 384].forEach((start, i) => part(4, i + 1,
    ['前段承重底盤', '中段承重底盤', '後段承重底盤'][i], '拼接長形底盤',
    group => chassis(group, start)));

  part(5, 1, '前車底煞車箱', '安裝車底設備', group => {
    for (const x of [192, 224]) brick(group, '煞車設備厚磚', x, 29, -44, 30, 24, 88, frame, true);
  });
  part(5, 2, '中央電源與空調設備箱', '安裝車底設備', group => {
    for (const x of [264, 296, 328]) {
      brick(group, '電源設備方磚', x, 28, -48, 32, 25, 96, equipment, true);
      for (const side of [-1, 1]) brick(group, '設備箱小蓋', x + 5, 34,
        side < 0 ? -51 : 48, 21, 14, 3, frame);
    }
  });
  part(5, 3, '後車底儲氣筒', '安裝車底設備', group => {
    brick(group, '後段設備厚磚', 368, 29, -46, 32, 24, 92, frame, true);
    cylinder(group, '粗圓儲氣筒', [400, 35, 0], 9, 76, equipment);
  });

  [[112, 272], [272, 416], [416, 576]].forEach(([start, end], i) => part(6, i + 1,
    ['前段白色下車身', '中段白色下車身', '後段白色下車身'][i],
    '疊出白色下車身', group => wall(group, start, end, true)));

  // Unlike the EMU3000's tall, pointed mask, the 700T has a broad low jaw.
  part(7, 1, '鴨嘴前端白色短厚磚', '拼出 700T 鴨嘴車頭', group => {
    brick(group, '寬扁鴨嘴端磚', -18, 80, -32, 32, 17, 64, white, true);
    for (const z of [-48, -16, 16])
      slope(group, '車鼻向後展寬斜磚', [[-8, 76], [48, 70], [48, 110], [8, 101]], z, 32, white);
  });
  part(7, 2, '鴨嘴兩側橘色下顎', '拼出 700T 鴨嘴車頭', group => {
    for (const side of [-1, 1]) {
      const z = side < 0 ? -64 : 48;
      slope(group, '橘色鼻側厚斜磚', [[24, 72], [112, 66], [112, 103], [50, 105]], z, 16, orange);
      brick(group, '橘色鼻側凸點磚', 80, 69, z, 32, 8, 16, orangeLight, true);
    }
    for (const z of [-32, 0])
      slope(group, '橘色前端短下顎', [[-11, 72], [25, 66], [42, 81], [-4, 88]], z, 32, orange);
  });
  part(7, 3, '鴨嘴上方階梯斜白磚', '拼出 700T 鴨嘴車頭', group => {
    for (const z of [-64, -32, 0, 32])
      slope(group, '車鼻上緣獨立斜磚', [[32, 109], [112, 107], [112, 157], [88, 157]], z, 32, warmWhite);
    for (const side of [-1, 1]) {
      const z = side < 0 ? -64 : 48;
      brick(group, '車鼻肩線凸點磚', 96, 149, z, 16, 8, 16, white, true);
    }
  });

  [[112, 272], [272, 416], [416, 576]].forEach(([start, end], i) => part(8, i + 1,
    ['前段白色上車身', '中段白色上車身', '後段白色上車身'][i],
    '疊出白色上車身', group => wall(group, start, end, false)));

  part(9, 1, '前段雙側橘色寬腰帶', '裝上橘色識別腰帶', group => stripe(group, 112, 272));
  part(9, 2, '中段雙側橘色寬腰帶', '裝上橘色識別腰帶', group => stripe(group, 272, 416));
  part(9, 3, '後段雙側橘色寬腰帶', '裝上橘色識別腰帶', group => stripe(group, 416, 576));

  part(10, 1, '駕駛室黑色斜窗框', '安裝駕駛窗與客窗', group => {
    for (const z of [-48, -16, 16])
      slope(group, '黑色窗框分段斜磚', [[65, 136], [104, 136], [119, 177], [91, 177]], z, 32, black);
    for (const side of [-1, 1])
      slope(group, '駕駛窗側邊黑磚', [[89, 139], [133, 141], [121, 174], [105, 176]],
        side < 0 ? -65 : 49, 16, black);
  });
  part(10, 2, '雙片深色前擋與側窗', '安裝駕駛窗與客窗', group => {
    for (const z of [-39, 8])
      slope(group, '獨立深色前擋玻璃', [[78, 143], [108, 143], [117, 170], [96, 170]],
        z, 31, glass);
    for (const side of [-1, 1])
      rounded(group, '駕駛室側窗', [135, 150, side * 66.2], [29, 25, 2.6], glass, .9, 'glass');
  });
  part(10, 3, '前後雙側獨立客窗', '安裝駕駛窗與客窗', group =>
    sideWindows(group, [190, 227, 264, 301, 338, 375, 412, 449, 486]));

  part(11, 1, '前段乘客門與凸點屋頂', '完成車門與白色屋頂', group => {
    door(group, 160);
    roof(group, 112, 272);
  });
  part(11, 2, '中央分段白色屋頂', '完成車門與白色屋頂', group => roof(group, 272, 416));
  part(11, 3, '後段乘客門與屋頂', '完成車門與白色屋頂', group => {
    door(group, 536);
    roof(group, 416, 576);
  });

  part(12, 1, '車鼻兩側嵌入式頭燈', '完成 700T 車鼻', group => {
    // The nose surface rises 9 units over a 40-unit run. Keep each lamp's
    // shallow face parallel to that slope instead of standing it on end.
    const noseAngle = Math.atan(9 / 40);
    for (const side of [-1, 1]) {
      const z = side * 41;
      const seat = cylinder(group, '貼合斜面的深色頭燈座', [22, 105.1, z], 7.5, 2, black, 'y');
      seat.rotation.z = noseAngle;
      const lens = cylinder(group, '貼合斜面的乳白頭燈片', [21.65, 106.55, z], 5.2, .9, lamp, 'y');
      lens.rotation.z = noseAngle;
      cylinder(group, '小紅尾燈', [25, 94, z], 3.5, 2, '#c6322c', 'x');
    }
  });
  part(12, 2, '車鼻中央白色檢修蓋', '完成 700T 車鼻', group => {
    // A shallow inset hatch on the nose tip. Its dark rim is visible around
    // all four sides, so adding this pack reads clearly against the white jaw.
    brick(group, '檢修蓋深色外框', -21, 81, -24, 3, 16, 48, black);
    brick(group, '前端白色檢修蓋', -22, 83, -21, 3, 12, 42, warmWhite);
    brick(group, '檢修蓋中央細把手', -23, 88, -8, 2, 2, 16, frame);
  });
  part(12, 3, '車鼻前端橘色裙板', '完成 700T 車鼻', group => {
    slope(group, '前端橘色厚裙板', [[-23, 52], [7, 52], [16, 72], [-14, 72]], -40, 80, orange);
    brick(group, '前端黑色防撞短梁', -19, 49, -30, 14, 9, 60, frame);
    brick(group, '玩具車鉤連接塊', -20, 43, -12, 17, 11, 24, frame, true);
  });

  return model;
}
