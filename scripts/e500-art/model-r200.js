import * as THREE from 'three';
import { createBrickTools } from './brick-geometry.js';

// TRA R200 (Stadler SALi): two full-width driving cabs, six axles, a long
// navy engine-room side and a white shell. Same 16-unit toy grid as E500.
export function createR200Model(material) {
  const model = new THREE.Group();
  model.name = '台鐵 R200 型柴電機車';
  model.userData = { length: 576, width: 128, studPitch: 16, authoringVersion: 1 };
  const L = 576;
  const white = '#f0f1ec', warmWhite = '#faf9f2', navy = '#153b59';
  const blue = '#22516d', blueLight = '#2b5b76', black = '#20272d';
  const charcoal = '#343e46', gray = '#68747a', silver = '#a7afb0';
  const orange = '#dd792b', glass = '#314952';
  const { mesh, rounded, brick, cylinder, slope, bar } = createBrickTools(material);

  function part(pack, number, name, packTitle, build) {
    const group = new THREE.Group();
    group.name = name;
    group.userData = { id: `p${pack}-${number}`, name, packTitle, z: (pack - 1) * 3 + number - 1 };
    model.add(group);
    build(group);
  }
  function end(group, rear, build) {
    const local = new THREE.Group();
    local.name = rear ? '後端駕駛室' : '前端駕駛室';
    if (rear) { local.position.x = L; local.rotation.y = Math.PI; }
    group.add(local);
    build(local);
  }
  function wheelset(group, x) {
    cylinder(group, '粗輪軸', [x, 20, 0], 5.5, 104, black);
    brick(group, '輪軸承重橫磚', x - 8, 28, -48, 16, 12, 96, charcoal);
    for (const side of [-1, 1]) {
      const tyre = mesh(group, '厚玩具輪胎', new THREE.CylinderGeometry(20, 20, 12, 40), '#171d22', [x, 20, side * 49]);
      tyre.rotation.x = Math.PI / 2;
      cylinder(group, '厚輪圈', [x, 20, side * 56], 15, 3, gray);
      cylinder(group, '輪圈內盤', [x, 20, side * 58], 10.8, 2, black);
      cylinder(group, '凸起輪心', [x, 20, side * 60], 5.4, 4, silver);
      brick(group, '獨立軸箱磚', x - 7.5, 26, side < 0 ? -66 : 52, 15, 14, 14, charcoal);
      cylinder(group, '軸箱圓蓋', [x, 32, side * 67], 4.6, 2, gray);
    }
  }
  function bogie(group, start) {
    for (const side of [-1, 1]) {
      const z = side < 0 ? -65 : 49;
      for (let x = start; x < start + 144; x += 32)
        brick(group, '轉向架分段側框', x, 38, z, Math.min(32, start + 144 - x), 13, 16, black, true);
      for (const x of [start + 40, start + 88]) {
        brick(group, '彈簧厚座磚', x, 26, z + 2, 16, 11, 12, charcoal);
        cylinder(group, '懸吊圓扣', [x + 8, 29, side * 67], 4.5, 2, silver);
      }
    }
    for (const x of [start, start + 48, start + 96]) brick(group, '轉向架橫梁', x, 44, -40, 32, 8, 80, black);
  }
  function sideWall(group, start, endAt, bottom, rows, color) {
    for (const side of [-1, 1]) {
      const z = side < 0 ? -64 : 48;
      for (let row = 0; row < rows; row++) {
        let x = start;
        const lengths = row % 2 ? [16, 32, 32, 32, 16] : [32, 32, 32, 32];
        while (x < endAt) {
          for (const width of lengths) {
            if (x >= endAt) break;
            const length = Math.min(width, endAt - x);
            brick(group, '可見磚縫的車身側牆', x, bottom + row * 16, z, length, 16, 16,
              (row + Math.floor(x / 32)) % 4 ? color : color === navy ? blue : color, row === rows - 1 && row % 2 === 0);
            x += length;
          }
        }
      }
    }
  }
  function lowerCab(group) {
    for (let row = 0; row < 3; row++) {
      let z = -64;
      const widths = row % 2 ? [16, 32, 32, 32, 16] : [32, 32, 32, 32];
      widths.forEach((width, i) => {
        brick(group, '白色前臉小磚', 2, 64 + row * 16, z, 16, 16, width, i % 3 ? white : warmWhite, row === 2);
        z += width;
      });
    }
    for (const side of [-1, 1]) {
      const z = side < 0 ? -64 : 48;
      for (const x of [16, 48, 80]) for (const y of [64, 80, 96])
        brick(group, '駕駛室側面白磚', x, y, z, 32, 16, 16, (x + y) % 3 ? white : warmWhite);
      for (const x of [16, 48, 80]) brick(group, '駕駛室側面中層白磚', x, 112, z, 32, 16, 16, white);
      brick(group, '側邊深色底座', 16, 59, side < 0 ? -66 : 50, 96, 6, 16, black);
    }
  }
  function upperCab(group) {
    for (const side of [-1, 1]) {
      const z = side < 0 ? -64 : 48;
      slope(group, '駕駛室白色斜角積木', [[16, 128], [112, 128], [112, 184], [42, 184], [28, 164]], z, 16, white);
      brick(group, '車門外柱白磚', 96, 128, z, 16, 56, 16, warmWhite);
      brick(group, '側窗白色下框磚', 48, 128, z - (side < 0 ? 0 : 0), 48, 9, 16, white);
      brick(group, '側窗白色上框磚', 48, 177, z, 48, 7, 16, white);
    }
    // Faceted white frame around the broad, sloping black windscreen.
    slope(group, '前擋風窗下方白色斜磚', [[2, 112], [18, 112], [27, 134], [12, 134]], -64, 128, white);
    slope(group, '擋風窗上緣白色斜磚', [[27, 178], [43, 178], [45, 186], [34, 186]], -64, 128, white);
  }
  function frontWindows(group) {
    slope(group, '前擋風窗黑色厚框', [[11, 132], [27, 132], [43, 179], [27, 179]], -55, 110, black);
    slope(group, '前擋風玻璃', [[14, 136], [26, 136], [39, 175], [28, 175]], -48, 96, glass);
    for (const z of [-56, 47]) slope(group, '粗白色窗邊柱', [[10, 129], [22, 129], [41, 181], [29, 181]], z, 9, white);
    brick(group, '擋風窗黑色中柱', 25, 133, -2.5, 10, 46, 5, black);
    brick(group, '上方目的地顯示框', 36, 174, -32, 6, 11, 64, black);
    for (const z of [-30, -14, 2, 18]) brick(group, '駕駛室顯示燈點', 35, 179, z, 2, 3, 8, warmWhite);
  }
  function sideWindows(group) {
    for (const side of [-1, 1]) {
      rounded(group, '駕駛室側窗黑框', [69, 153, side * 64.5], [44, 43, 3], black, 1.1);
      rounded(group, '駕駛室側窗玻璃', [69, 153, side * 66], [35, 34, 2], glass, .8, 'glass');
      rounded(group, '側窗粗中框', [66, 153, side * 67.6], [4, 36, 3], black, .5);
      rounded(group, '車門上方小窗', [101, 156, side * 64.7], [12, 26, 2.4], glass, .6, 'glass');
      bar(group, '車門直立扶手', [106, 94, side * 69], [106, 151, side * 69], 2.3, silver);
      for (const y of [93, 150]) cylinder(group, '扶手固定圓扣', [106, y, side * 68], 3.6, 5, gray);
      for (const y of [57, 64, 71]) brick(group, '車門登車踏階', 88, y, side < 0 ? -74 : 62, 24, 5, 12, charcoal);
    }
  }
  function roof(group, start, endAt, color = black) {
    for (let x = start; x < endAt; x += 32) {
      const length = Math.min(32, endAt - x);
      for (const z of [-64, -32, 0, 32]) brick(group, '車頂凸點短板', x, 184, z, length, 8, 32, color, true);
    }
  }
  function vents(group, start, count) {
    for (let i = 0; i < count; i++) {
      const x = start + i * 16;
      brick(group, '車頂獨立散熱格柵座', x, 192, -40, 16, 5, 80, black);
      for (const z of [-34, -18, -2, 14, 30]) brick(group, '凸起格柵小磚', x + 3, 197, z, 10, 3, 5, gray);
    }
  }
  function lamps(group) {
    for (const side of [-1, 1]) {
      const z = side * 46;
      brick(group, '前端方形黑燈座', -2, 99, z - 13, 7, 22, 26, black);
      brick(group, '前端白色方燈', -4, 106, z - 9, 3, 8, 18, '#fff0ce');
      brick(group, '前端紅色尾燈', -4, 100, z - 7, 3, 4, 6, '#aa3031');
    }
    brick(group, '擋風窗上方燈座', 31, 179, -18, 7, 7, 36, black);
    for (const z of [-12, 4]) brick(group, '上方白色頭燈', 29, 181, z, 3, 3, 9, '#fff1cc');
  }
  function frontFinish(group) {
    brick(group, '前端黑色格柵上磚', -1, 66, -34, 8, 27, 68, black);
    for (const y of [68, 76, 84]) brick(group, '前端格柵水平條磚', -4, y, -30, 4, 3, 60, gray);
    brick(group, '前端防撞梁', -8, 50, -56, 16, 12, 112, black, true);
    slope(group, '排障器兩側厚斜磚', [[-15, 13], [-6, 13], [1, 34], [-8, 34]], -55, 110, charcoal);
    brick(group, '玩具車鉤連接磚', -24, 38, -12, 28, 14, 24, black, true);
    brick(group, '玩具車鉤厚端', -29, 36, -15, 12, 9, 30, charcoal);
    for (const side of [-1, 1]) {
      bar(group, '厚扶手', [0, 62, side * 60], [7, 109, side * 60], 2.1, silver);
      brick(group, '端部橘色細節', -5, 47, side < 0 ? -54 : 46, 5, 6, 8, orange);
    }
  }
  function sideBadgeAndRail(group) {
    for (const side of [-1, 1]) {
      brick(group, '白色 R201 車號牌', 91, 110, side < 0 ? -66 : 64, 22, 11, 2, warmWhite);
      for (let i = 0; i < 4; i++)
        brick(group, '車號深色字塊', 94 + i * 5, 113, side < 0 ? -67 : 66, 3, 5, 1, navy);
      bar(group, '側面車門長扶手', [114, 84, side * 67], [114, 152, side * 67], 2, silver);
    }
  }

  // Three foundations match E500's celebration rails exactly.
  [-48, 176, 400].forEach((start, i) => part(1, i + 1,
    ['前段展示軌道', '中段展示軌道', '後段展示軌道'][i], '鋪好展示軌道', g => {
      for (let x = start; x < start + 224; x += 64) brick(g, '軌道底座厚板', x, -14, -88, Math.min(64, start + 224 - x), 8, 176, charcoal);
      for (let x = start + 8; x < start + 224; x += 32) brick(g, '寬枕木磚', x, -6, -80, 16, 4, 160, '#a89270');
      for (const z of [-49, 43]) for (let x = start; x < start + 224; x += 32) brick(g, '短鋼軌板', x, -2.4, z, 32, 2.4, 6, silver);
    }));
  [72, 116, 160].forEach((x, i) => part(2, i + 1, `前轉向架・第${['一', '二', '三'][i]}輪軸`, '前轉向架的三根輪軸', g => wheelset(g, x)));
  [416, 460, 504].forEach((x, i) => part(3, i + 1, `後轉向架・第${['一', '二', '三'][i]}輪軸`, '後轉向架的三根輪軸', g => wheelset(g, x)));
  [0, 192, 384].forEach((start, i) => part(4, i + 1,
    ['前段承重底盤', '中央承重底盤', '後段承重底盤'][i], '連成長長的底盤', g => {
      for (let x = start; x < start + 192; x += 64) {
        brick(g, '4×8底盤厚板', x, 53, -64, 64, 11, 128, charcoal, true);
        brick(g, '近側踏板邊磚', x, 54, 60, 32, 8, 8, black);
        brick(g, '遠側踏板邊磚', x, 54, -68, 32, 8, 8, black);
      }
    }));
  part(5, 1, '前轉向架懸吊框', '裝上車底設備', g => bogie(g, 48));
  part(5, 2, '中央油箱與設備箱', '裝上車底設備', g => {
    for (const x of [224, 256, 288, 320]) {
      brick(g, '獨立油箱厚磚', x, 29, -48, 32, 24, 96, black, true);
      for (const side of [-1, 1]) brick(g, '油箱外蓋', x + 3, 33, side < 0 ? -53 : 48, 26, 16, 5, gray);
    }
    cylinder(g, '灰色圓形氣缸', [208, 40, 0], 9, 80, gray);
  });
  part(5, 3, '後轉向架懸吊框', '裝上車底設備', g => bogie(g, 384));
  [96, 224, 352].forEach((start, i) => part(6, i + 1,
    ['前段引擎室下車身', '中段引擎室下車身', '後段引擎室下車身'][i], '拼起引擎室下半身', g => {
      sideWall(g, start, start + 128, 64, 2, navy);
      for (let x = start; x < start + 128; x += 32) brick(g, '黑色底部設備列', x, 64, -48, 32, 16, 96, black);
    }));
  [96, 224, 352].forEach((start, i) => part(7, i + 1,
    ['前段深藍引擎室', '中段深藍引擎室', '後段深藍引擎室'][i], '裝上深藍色長側板', g => {
      sideWall(g, start, start + 128, 96, 4, navy);
      for (const side of [-1, 1]) {
        const z = side < 0 ? -65 : 64;
        brick(g, '白色下側條紋短磚', start, 92, z - 1, 64, 5, 4, white);
        brick(g, '白色下側條紋短磚', start + 64, 92, z - 1, 64, 5, 4, white);
      }
    }));
  part(8, 1, '前駕駛室白色下車身', '裝上雙端白色駕駛室', g => end(g, false, lowerCab));
  part(8, 2, '後駕駛室白色下車身', '裝上雙端白色駕駛室', g => end(g, true, lowerCab));
  part(8, 3, '兩端駕駛室白色斜角上牆', '裝上雙端白色駕駛室', g => { end(g, false, upperCab); end(g, true, upperCab); });
  part(9, 1, '前端大擋風玻璃與側窗', '嵌入黑框大玻璃', g => end(g, false, q => { frontWindows(q); sideWindows(q); }));
  part(9, 2, '後端大擋風玻璃與側窗', '嵌入黑框大玻璃', g => end(g, true, q => { frontWindows(q); sideWindows(q); }));
  part(9, 3, '兩側引擎室通風小磚', '嵌入黑框大玻璃', g => {
    for (const side of [-1, 1]) for (const start of [144, 272, 400]) {
      for (let x = start; x < start + 64; x += 16) for (const y of [120, 130, 140])
        brick(g, '深藍通風縫小磚', x, y, side < 0 ? -65.5 : 64.5, 12, 2.5, 2, blueLight);
    }
  });
  part(10, 1, '前端駕駛室凸點屋頂', '蓋上分段深色車頂', g => roof(g, 40, 112));
  part(10, 2, '中央引擎室凸點屋頂', '蓋上分段深色車頂', g => {
    for (const side of [-1, 1]) for (let x = 112; x < 464; x += 32) {
      const z = side < 0 ? -64 : 48;
      brick(g, '白色車頂下緣短磚', x, 160, z, 32, 16, 16, white);
      brick(g, '深色屋簷短磚', x, 176, z, 32, 8, 16, black);
    }
    roof(g, 112, 464);
  });
  part(10, 3, '後端駕駛室凸點屋頂', '蓋上分段深色車頂', g => roof(g, 464, 536));
  part(11, 1, '前段柴油機散熱格柵', '裝上柴油機車頂設備', g => vents(g, 128, 6));
  part(11, 2, '中央排氣口與橘色機件', '裝上柴油機車頂設備', g => {
    for (const x of [256, 288, 320]) {
      brick(g, '柴油機排氣座積木', x, 192, -24, 24, 11, 48, charcoal, true);
      cylinder(g, '圓形排氣蓋', [x + 12, 205, 0], 9, 5, black, 'y');
    }
    for (const x of [272, 304]) brick(g, '橘色柴油設備短磚', x, 193, -50, 16, 9, 12, orange, true);
  });
  part(11, 3, '後段柴油機散熱格柵', '裝上柴油機車頂設備', g => vents(g, 368, 6));
  part(12, 1, '雙端方形頭燈與側面車號', '完成 R201 車頭細節', g => {
    end(g, false, q => { lamps(q); sideBadgeAndRail(q); });
    end(g, true, lamps);
  });
  part(12, 2, '後端格柵、防撞梁與車號', '完成 R201 車頭細節', g =>
    end(g, true, q => { frontFinish(q); sideBadgeAndRail(q); }));
  part(12, 3, '前端格柵、防撞梁與車鉤', '完成 R201 車頭細節', g => end(g, false, frontFinish));

  return model;
}
