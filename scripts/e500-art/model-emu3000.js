import * as THREE from 'three';
import { createBrickTools } from './brick-geometry.js';

// An ED3000 driving trailer: one leading passenger car, not a whole train.
// The original train's broad, quiet surfaces are assembled from short toy bricks.
export function createEmu3000Model(material) {
  const model = new THREE.Group();
  model.name = '臺鐵 EMU3000 新自強號・駕駛車';
  model.userData = { length: 576, width: 128, studPitch: 16, authoringVersion: 1 };
  const { brick, rounded, slope, cylinder, bar } = createBrickTools(material);
  const white = '#f2f1e9', ivory = '#fffdf4', shade = '#d7dbd9';
  const black = '#242932', glass = '#34424a', frame = '#393d43';
  const gray = '#778087', metal = '#a5aaab', red = '#be333a';

  function part(pack, number, name, packTitle, build) {
    const group = new THREE.Group();
    group.name = name;
    group.userData = { id: `p${pack}-${number}`, name, packTitle, z: (pack - 1) * 3 + number - 1 };
    model.add(group);
    build(group);
  }

  function wheel(group, x) {
    cylinder(group, '粗輪軸', [x, 20, 0], 5, 104, black);
    for (const side of [-1, 1]) {
      cylinder(group, '厚積木車輪', [x, 20, side * 48], 20, 13, black);
      cylinder(group, '灰色輪圈', [x, 20, side * 55], 14.5, 2.5, gray);
      cylinder(group, '輪心圓扣', [x, 20, side * 57], 5.5, 3, metal);
      brick(group, '方形軸箱', x - 9, 24, side < 0 ? -64 : 50, 18, 15, 14, frame);
      cylinder(group, '軸箱圓蓋', [x, 31, side * 65], 4.5, 2, gray);
    }
  }

  function bogieFrame(group, start) {
    for (const side of [-1, 1]) {
      const z = side < 0 ? -65 : 49;
      for (const x of [start, start + 32, start + 64]) {
        brick(group, '分段轉向架側梁', x, 39, z, 32, 12, 16, frame, true);
      }
      for (const x of [start + 17, start + 67]) {
        cylinder(group, '彈簧粗圓盤', [x, 38, side * 66], 8, 4, gray);
      }
    }
    for (const x of [start + 8, start + 56]) {
      brick(group, '轉向架橫梁', x, 42, -48, 16, 10, 96, black, true);
    }
  }

  function chassis(group, start) {
    for (let x = start; x < start + 192; x += 64) {
      brick(group, '4×8 底盤厚板', x, 54, -64, 64, 11, 128, frame, true);
      for (const side of [-1, 1]) {
        brick(group, '車底邊緣短板', x, 59, side < 0 ? -68 : 60, 32, 7, 8, black);
        brick(group, '車底邊緣短板', x + 32, 59, side < 0 ? -68 : 60, 32, 7, 8, black);
      }
    }
  }

  function sideWall(group, start, end) {
    for (const side of [-1, 1]) {
      const z = side < 0 ? -64 : 48;
      for (let y = 66, row = 0; y < 174; y += 18, row++) {
        for (let x = start; x < end;) {
          const length = Math.min(row % 2 ? 32 : 48, end - x);
          brick(group, '白色車身分段磚', x, y, z, length, 18, 16,
            (row + Math.floor(x / 32)) % 5 ? white : ivory, row === 5);
          x += length;
        }
      }
      for (let x = start; x < end; x += 32) {
        brick(group, '下方灰色裙邊', x, 66, side < 0 ? -65 : 49,
          Math.min(32, end - x), 6, 16, shade);
      }
    }
  }

  function passengerWindows(group, side, starts) {
    const z = side * 64.8;
    for (const x of starts) {
      rounded(group, '獨立深色客窗', [x + 13, 144, z], [27, 23, 2.8], glass, 1.1, 'glass');
      brick(group, '客窗下方短黑線', x, 129, side < 0 ? -66 : 64, 28, 2, 2, frame);
      brick(group, '客窗上方短黑線', x, 158, side < 0 ? -66 : 64, 28, 2, 2, frame);
    }
    // These short strips read as a window belt while the white pillars stay visible.
    const first = starts[0] - 8;
    const end = starts.at(-1) + 28;
    for (let x = first; x < end; x += 32) {
      brick(group, '細黑色窗帶', x, 161, side < 0 ? -65 : 64,
        Math.min(32, end - x), 3, 1.6, frame);
    }
  }

  function door(group, side, x) {
    const z = side * 65.3;
    rounded(group, '白色乘客門', [x + 11, 113, z], [23, 92, 2.8], ivory, 1.2);
    rounded(group, '車門窄窗', [x + 11, 144, side * 67], [9, 24, 2.5], glass, .7, 'glass');
    brick(group, '門邊深色直線', x - 1, 67, side < 0 ? -68 : 67, 2, 92, 1.5, frame);
    brick(group, '門邊深色直線', x + 23, 67, side < 0 ? -68 : 67, 2, 92, 1.5, frame);
    brick(group, '登車踏板', x, 63, side < 0 ? -75 : 62, 24, 5, 13, frame, true);
  }

  function roof(group, start, end) {
    for (let x = start; x < end; x += 32) {
      const length = Math.min(32, end - x);
      for (const z of [-48, -16, 16]) {
        brick(group, '分段白色凸點屋頂', x, 174, z, length, 8, 32, white, true);
      }
      for (const side of [-1, 1]) {
        slope(group, '屋頂側緣斜磚', [[x, 174], [x + length, 174],
          [x + length, 182], [x, 182]], side < 0 ? -64 : 48, 16, shade);
      }
    }
  }

  function vent(group, x, length = 64) {
    for (let at = x; at < x + length; at += 32) {
      brick(group, '車頂空調厚板', at, 183, -32, 32, 7, 64, shade, true);
    }
    for (let at = x + 8; at < x + length - 6; at += 12) {
      brick(group, '空調格柵短磚', at, 190, -25, 5, 3, 50, gray);
    }
  }

  // The same three E500 track foundations make the assembly camera compatible.
  [-48, 176, 400].forEach((start, i) => part(1, i + 1,
    ['前段展示軌道', '中段展示軌道', '後段展示軌道'][i], '鋪好展示軌道', group => {
      for (let x = start; x < start + 224; x += 64) {
        brick(group, '軌道底座厚板', x, -14, -88, Math.min(64, start + 224 - x), 8, 176, frame);
      }
      for (let x = start + 8; x < start + 224; x += 32) {
        brick(group, '寬枕木磚', x, -6, -80, 16, 4, 160, '#a89270');
      }
      for (const z of [-49, 43]) for (let x = start; x < start + 224; x += 32) {
        brick(group, '短鋼軌板', x, -2.4, z, 32, 2.4, 6, metal);
      }
    }));

  part(2, 1, '前轉向架第一輪軸', '組裝前轉向架', group => wheel(group, 96));
  part(2, 2, '前轉向架第二輪軸', '組裝前轉向架', group => wheel(group, 144));
  part(2, 3, '前轉向架側梁與彈簧', '組裝前轉向架', group => bogieFrame(group, 72));
  part(3, 1, '後轉向架第一輪軸', '組裝後轉向架', group => wheel(group, 432));
  part(3, 2, '後轉向架第二輪軸', '組裝後轉向架', group => wheel(group, 480));
  part(3, 3, '後轉向架側梁與彈簧', '組裝後轉向架', group => bogieFrame(group, 408));

  [0, 192, 384].forEach((start, i) => part(4, i + 1,
    ['前段承重底盤', '中段承重底盤', '後段承重底盤'][i], '拼接長形底盤',
    group => chassis(group, start)));

  part(5, 1, '前車底煞車與設備箱', '安裝車底設備', group => {
    for (const x of [176, 208]) brick(group, '分段煞車設備箱', x, 31, -43, 30, 21, 86, frame, true);
  });
  part(5, 2, '中央空調與電源箱', '安裝車底設備', group => {
    for (const x of [256, 288, 320]) brick(group, '中央設備箱', x, 29, -48, 32, 25, 96, gray, true);
    for (const side of [-1, 1]) for (const x of [264, 296, 328]) {
      brick(group, '設備箱側面小蓋', x, 35, side < 0 ? -52 : 48, 18, 14, 4, frame);
    }
  });
  part(5, 3, '後車底儲氣筒與設備', '安裝車底設備', group => {
    for (const x of [360, 392]) brick(group, '後段設備箱', x, 31, -42, 30, 23, 84, frame, true);
    cylinder(group, '粗圓儲氣筒', [382, 33, 0], 9, 78, gray);
  });

  [[80, 256], [256, 416], [416, 576]].forEach(([start, end], i) => part(6, i + 1,
    ['前段白色車身積木牆', '中段白色車身積木牆', '後段白色車身積木牆'][i],
    '疊出白色長車身', group => sideWall(group, start, end)));

  part(7, 1, '白色階梯形流線車鼻', '搭建流線車頭', group => {
    for (const z of [-64, -32, 0, 32]) {
      slope(group, '白色下鼻分段斜磚', [[-9, 64], [80, 64], [80, 118], [14, 118], [-9, 94]], z, 32, white);
      brick(group, '鼻端下方短凸點磚', 0, 65, z, 32, 8, 32, ivory, true);
    }
  });
  part(7, 2, '兩側白色駕駛室肩線', '搭建流線車頭', group => {
    for (const side of [-1, 1]) {
      const z = side < 0 ? -64 : 48;
      slope(group, '駕駛室斜白肩磚', [[12, 112], [80, 112], [80, 177], [63, 177]], z, 16, ivory);
      brick(group, '側肩凸點短磚', 64, 165, z, 16, 9, 16, white, true);
    }
  });
  part(7, 3, '分段黑色駕駛室面罩', '搭建流線車頭', group => {
    for (const z of [-48, -16, 16]) {
      slope(group, '黑色斜面罩積木片', [[13, 119], [63, 119], [80, 180], [55, 180]], z, 32, black);
    }
    for (const z of [-48, 0]) {
      slope(group, '深色前擋風玻璃積木片', [[27, 141], [61, 141], [68, 171], [47, 171]],
        z + 1, 47, '#30363d');
    }
    for (const side of [-1, 1]) {
      slope(group, '黑色側面罩三角磚', [[46, 123], [111, 128], [94, 173], [68, 174]], side < 0 ? -65 : 49, 16, black);
    }
  });

  part(8, 1, '前半段雙側黑色客窗', '裝上客窗與窗帶', group => {
    for (const side of [-1, 1]) {
      passengerWindows(group, side, [184, 224, 264, 304, 344]);
      brick(group, '前段細紅識別條', 191, 119, side < 0 ? -65.5 : 64, 32, 3, 1.5, red);
    }
  });
  part(8, 2, '後半段雙側黑色客窗', '裝上客窗與窗帶', group => {
    for (const side of [-1, 1]) {
      passengerWindows(group, side, [384, 424, 464, 496]);
      brick(group, '後段細紅識別條', 416, 119, side < 0 ? -65.5 : 64, 32, 3, 1.5, red);
    }
  });
  part(8, 3, '兩側駕駛室小側窗', '裝上客窗與窗帶', group => {
    for (const side of [-1, 1]) {
      rounded(group, '駕駛室深色側窗', [112, 151, side * 66.2], [35, 27, 2.5], glass, 1, 'glass');
      brick(group, '駕駛室側窗下沿', 94, 135, side < 0 ? -67 : 65, 38, 3, 2, black);
    }
  });

  part(9, 1, '前側兩扇白色乘客門', '安裝乘客門與車尾', group => {
    for (const side of [-1, 1]) door(group, side, 150);
  });
  part(9, 2, '後側兩扇白色乘客門', '安裝乘客門與車尾', group => {
    for (const side of [-1, 1]) door(group, side, 536);
  });
  part(9, 3, '後端黑色連通門與風擋', '安裝乘客門與車尾', group => {
    for (const z of [-64, -32, 0, 32]) brick(group, '後端白色端面磚', 568, 69, z, 8, 106, 32, white);
    rounded(group, '後端黑色風擋框', [577, 119, 0], [6, 100, 75], black, 1.5);
    rounded(group, '後端深色連通門', [581, 122, 0], [4, 83, 37], glass, 1, 'glass');
    // The camera sees the near side, so the final end has a visible corner too.
    for (const side of [-1, 1]) {
      brick(group, '車尾側邊深色收口', 562, 70, side < 0 ? -67 : 65, 7, 97, 2, frame);
      brick(group, '車尾角落厚踏板', 558, 62, side < 0 ? -76 : 63, 18, 5, 13, black, true);
    }
  });

  part(10, 1, '駕駛室頂短凸點磚', '鋪設分段白色屋頂', group => {
    for (let x = 80; x < 176; x += 32) for (const z of [-48, -16, 16]) {
      brick(group, '駕駛室頂白色短磚', x, 174, z, 32, 8, 32, white, true);
    }
  });
  part(10, 2, '中段白色凸點屋頂', '鋪設分段白色屋頂', group => roof(group, 176, 384));
  part(10, 3, '後段白色凸點屋頂', '鋪設分段白色屋頂', group => roof(group, 384, 576));

  part(11, 1, '前段小天線與通風片', '加上車頂設備', group => {
    brick(group, '駕駛室上方設備基座', 111, 182, -16, 32, 5, 32, shade, true);
    bar(group, '短粗車頂天線', [127, 187, 0], [127, 202, 0], 3, frame);
    cylinder(group, '天線圓帽', [127, 203, 0], 5, 3, metal, 'y');
    vent(group, 192, 48);
  });
  part(11, 2, '中央兩組分段空調格柵', '加上車頂設備', group => {
    vent(group, 272, 64);
    vent(group, 352, 64);
  });
  part(11, 3, '後端空調與細小天線', '加上車頂設備', group => {
    vent(group, 448, 64);
    brick(group, '後端天線基座', 528, 182, -16, 16, 5, 32, shade, true);
    bar(group, '後端短天線', [536, 187, 0], [536, 200, 0], 2.5, frame);
  });

  part(12, 1, '車頭上方兩盞圓形頭燈', '完成新自強號車頭', group => {
    for (const z of [-17, 17]) {
      cylinder(group, '上燈黑色圓座', [58, 178, z], 7.2, 3, black, 'x');
      cylinder(group, '上燈乳白圓片', [55.8, 178, z], 5.1, 1.8, '#fff5d3', 'x');
    }
  });
  part(12, 2, '車頭兩側下方燈組', '完成新自強號車頭', group => {
    for (const side of [-1, 1]) {
      const z = side * 44;
      cylinder(group, '下燈黑色圓座', [16, 126, z], 8.5, 3.5, black, 'x');
      cylinder(group, '下燈乳白圓片', [13.5, 126, z], 5.5, 2, '#fff5d3', 'x');
      cylinder(group, '小紅色尾燈', [17, 115, z], 3.6, 2, red, 'x');
    }
  });
  part(12, 3, '車鼻中央車鉤與前端裙板', '完成新自強號車頭', group => {
    slope(group, '前端厚積木裙板', [[-16, 48], [15, 48], [20, 65], [-8, 65]], -48, 96, shade);
    brick(group, '前端黑色防撞梁', -14, 48, -48, 15, 10, 96, frame);
    brick(group, '前端車鉤連接塊', -17, 43, -12, 28, 15, 24, frame, true);
    brick(group, '短厚玩具車鉤', -29, 45, -8, 15, 10, 16, black);
  });

  return model;
}
