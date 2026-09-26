import * as THREE from 'three';
import { createBrickTools } from './brick-geometry.js';

// One N700S leading car. The long, angular Dual Supreme Wing nose is made of
// separate solid wedge bricks, not a single smooth train-shaped shell.
export function createN700SModel(material) {
  const model = new THREE.Group();
  model.name = 'JR 東海 N700S 新幹線・先頭車';
  model.userData = { length: 576, width: 128, studPitch: 16, authoringVersion: 1 };
  const { mesh, brick, rounded, cylinder, slope, stud } = createBrickTools(material);
  const white = '#f6f6f1', pearl = '#ffffff', soft = '#e8ebeb';
  const blue = '#174aa1', brightBlue = '#2866b2', glass = '#27394e';
  const dark = '#292f38', gray = '#69737c', metal = '#aeb5b9';

  function part(pack, number, name, packTitle, build) {
    const group = new THREE.Group();
    group.name = name;
    group.userData = { id: `p${pack}-${number}`, name, packTitle, z: (pack - 1) * 3 + number - 1 };
    model.add(group);
    build(group);
  }

  // A short, solid loft brick between two transverse sections. Each face is
  // wound outwards so the model works with the renderer's ordinary materials.
  function loft(group, name, a, b, color) {
    const x0 = a.x + .45, x1 = b.x - .45;
    const points = [
      [x0, a.low, a.inner], [x0, a.low, a.outer],
      [x0, a.high, a.inner], [x0, a.high, a.outer],
      [x1, b.low, b.inner], [x1, b.low, b.outer],
      [x1, b.high, b.inner], [x1, b.high, b.outer],
    ].map(p => new THREE.Vector3(...p));
    const centre = points.reduce((sum, p) => sum.add(p), new THREE.Vector3()).multiplyScalar(1 / 8);
    const faces = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1],
      [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];
    const vertices = [];
    for (const face of faces) {
      const [p, q, r, s] = face.map(i => points[i]);
      const outward = p.clone().add(q).add(r).add(s).multiplyScalar(.25).sub(centre);
      const normal = q.clone().sub(p).cross(r.clone().sub(p));
      const order = normal.dot(outward) >= 0 ? [p, q, r, p, r, s] : [p, r, q, p, s, r];
      for (const v of order) vertices.push(v.x, v.y, v.z);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    const piece = mesh(group, name, geometry, color, [0, 0, 0]);
    piece.userData.brick = true;
    return piece;
  }

  function wheel(group, x) {
    cylinder(group, '粗輪軸', [x, 20, 0], 5, 104, dark);
    for (const side of [-1, 1]) {
      cylinder(group, '厚玩具車輪', [x, 20, side * 48], 20, 13, dark);
      cylinder(group, '銀灰輪圈', [x, 20, side * 55], 14.5, 2.5, gray);
      cylinder(group, '凸起輪心', [x, 20, side * 57], 5.5, 3, metal);
      brick(group, '獨立方形軸箱', x - 9, 24, side < 0 ? -64 : 50, 18, 15, 14, dark);
    }
  }

  function bogie(group, start) {
    for (const side of [-1, 1]) {
      for (let x = start; x < start + 80; x += 16) {
        brick(group, '短磚轉向架側梁', x, 39, side < 0 ? -65 : 49, 16, 12, 16, dark, true);
      }
      for (const x of [start + 17, start + 65]) {
        cylinder(group, '彈簧粗圓盤', [x, 39, side * 66], 7, 4, gray);
      }
    }
    for (const x of [start + 8, start + 56]) {
      brick(group, '轉向架橫梁', x, 42, -48, 16, 10, 96, gray, true);
    }
  }

  function chassis(group, start) {
    for (let x = start; x < start + 192; x += 64) {
      brick(group, '4×8 承重厚板', x, 53, -64, 64, 12, 128, dark, true);
      for (const side of [-1, 1]) for (const offset of [0, 32]) {
        brick(group, '底盤短邊磚', x + offset, 61, side < 0 ? -68 : 60, 32, 7, 8, gray);
      }
    }
  }

  function sideWall(group, start, end) {
    for (const side of [-1, 1]) {
      const z = side < 0 ? -64 : 48;
      for (let y = 66, row = 0; y < 174; y += 18, row++) {
        for (let x = start; x < end;) {
          const length = Math.min(row % 2 ? 32 : 48, end - x);
          brick(group, '獨立白色側牆磚', x, y, z, length, 18, 16,
            (row + Math.floor(x / 32)) % 4 ? white : pearl, row === 5);
          x += length;
        }
      }
      for (let x = start; x < end; x += 32) {
        brick(group, '下緣灰色裙邊', x, 66, side < 0 ? -65 : 49,
          Math.min(32, end - x), 6, 16, soft);
      }
    }
  }

  const stations = [
    { x: -24, half: 9, base: 78, centre: 83, wing: 85 },
    { x: 8, half: 16, base: 80, centre: 86, wing: 91 },
    { x: 40, half: 27, base: 84, centre: 93, wing: 101 },
    { x: 72, half: 40, base: 90, centre: 102, wing: 114 },
    { x: 104, half: 52, base: 99, centre: 115, wing: 129 },
    { x: 136, half: 61, base: 110, centre: 131, wing: 148 },
    { x: 168, half: 64, base: 121, centre: 150, wing: 163 },
    { x: 184, half: 64, base: 127, centre: 156, wing: 166 },
  ];
  const section = (s, inner, outer, low, high) => ({ x: s.x, inner, outer, low, high });
  function noseSegment(group, index, layer) {
    const a = stations[index], b = stations[index + 1];
    if (layer === 'lower') {
      loft(group, '下層全寬階梯鼻磚', section(a, -a.half, a.half, 61, a.base),
        section(b, -b.half, b.half, 61, b.base), index % 2 ? white : pearl);
    } else if (layer === 'centre') {
      loft(group, '中央低稜鼻磚', section(a, -a.half * .47, a.half * .47, a.base - 1, a.centre),
        section(b, -b.half * .47, b.half * .47, b.base - 1, b.centre), white);
    } else {
      for (const side of [-1, 1]) {
        const innerA = a.half * .45, innerB = b.half * .45;
        loft(group, '兩側高起翼形斜磚',
          section(a, side < 0 ? -a.half : innerA, side < 0 ? -innerA : a.half, a.base - 1, a.wing),
          section(b, side < 0 ? -b.half : innerB, side < 0 ? -innerB : b.half, b.base - 1, b.wing),
          index % 2 ? pearl : white);
      }
    }
  }

  function windows(group, starts) {
    for (const side of [-1, 1]) {
      for (const x of starts) {
        rounded(group, '深藍獨立客窗', [x + 12, 145, side * 65.5], [25, 24, 2.8], glass, 1.2, 'glass');
        brick(group, '短磚窗框下緣', x - 1, 130, side < 0 ? -67 : 65, 27, 2.5, 2, dark);
      }
    }
  }

  function door(group, x) {
    for (const side of [-1, 1]) {
      rounded(group, '白色乘客門', [x + 12, 113, side * 65.4], [24, 92, 3], pearl, 1.2);
      rounded(group, '門上窄窗', [x + 12, 145, side * 67], [9, 25, 2.5], glass, .7, 'glass');
      for (const dx of [-1, 24]) {
        brick(group, '車門直立接縫', x + dx, 67, side < 0 ? -68 : 67, 2, 92, 1.5, gray);
      }
      brick(group, '登車短踏板', x, 63, side < 0 ? -74 : 62, 24, 5, 12, dark, true);
    }
  }

  function roof(group, start, end) {
    for (let x = start; x < end; x += 32) {
      const length = Math.min(32, end - x);
      for (const z of [-48, -16, 16]) {
        brick(group, '分段凸點白屋頂', x, 174, z, length, 8, 32, white, true);
      }
      for (const side of [-1, 1]) {
        slope(group, '屋頂邊緣斜磚', [[x, 174], [x + length, 174],
          [x + length, 181], [x, 181]], side < 0 ? -64 : 48, 16, soft);
      }
    }
  }

  // Three separate foundations retain the E500/EMU3000 assembly camera setup.
  [-48, 176, 400].forEach((start, i) => part(1, i + 1,
    ['前段展示軌道', '中段展示軌道', '後段展示軌道'][i], '鋪好展示軌道', group => {
      for (let x = start; x < start + 224; x += 64) {
        brick(group, '軌道底座厚板', x, -14, -88,
          Math.min(64, start + 224 - x), 8, 176, dark);
      }
      for (let x = start + 8; x < start + 224; x += 32) {
        brick(group, '寬枕木磚', x, -6, -80, 16, 4, 160, '#a89270');
      }
      for (const z of [-49, 43]) for (let x = start; x < start + 224; x += 32) {
        brick(group, '短鋼軌板', x, -2.4, z, 32, 2.4, 6, metal);
      }
    }));

  part(2, 1, '前轉向架第一輪軸', '組裝前轉向架', group => wheel(group, 128));
  part(2, 2, '前轉向架第二輪軸', '組裝前轉向架', group => wheel(group, 176));
  part(2, 3, '前轉向架短磚側梁', '組裝前轉向架', group => bogie(group, 112));
  part(3, 1, '後轉向架第一輪軸', '組裝後轉向架', group => wheel(group, 432));
  part(3, 2, '後轉向架第二輪軸', '組裝後轉向架', group => wheel(group, 480));
  part(3, 3, '後轉向架短磚側梁', '組裝後轉向架', group => bogie(group, 416));

  [0, 192, 384].forEach((start, i) => part(4, i + 1,
    ['前段承重底盤', '中段承重底盤', '後段承重底盤'][i], '拼接長形底盤',
    group => chassis(group, start)));

  part(5, 1, '前車底分段設備箱', '安裝車底設備', group => {
    for (const x of [192, 224]) brick(group, '煞車設備方磚', x, 31, -42, 30, 22, 84, gray, true);
  });
  part(5, 2, '中央設備箱與小蓋', '安裝車底設備', group => {
    for (const x of [272, 304, 336]) {
      brick(group, '中央設備方磚', x, 31, -46, 30, 23, 92, gray, true);
      for (const side of [-1, 1]) {
        brick(group, '設備側邊小蓋', x + 6, 36, side < 0 ? -50 : 46, 18, 13, 4, dark);
      }
    }
  });
  part(5, 3, '後車底設備與儲氣筒', '安裝車底設備', group => {
    for (const x of [376, 408]) brick(group, '後段設備方磚', x, 31, -42, 30, 22, 84, gray, true);
    cylinder(group, '粗圓儲氣筒', [399, 34, 0], 9, 72, dark);
  });

  [[184, 320], [320, 448], [448, 576]].forEach(([start, end], i) => part(6, i + 1,
    ['前段白色車身牆', '中段白色車身牆', '後段白色車身牆'][i], '疊起白色車身',
    group => sideWall(group, start, end)));

  part(7, 1, '長鼻下層階梯楔形磚', '搭出雙翼長車鼻', group => {
    for (let i = 0; i < stations.length - 1; i++) noseSegment(group, i, 'lower');
  });
  part(7, 2, '長鼻中央低稜磚列', '搭出雙翼長車鼻', group => {
    for (let i = 0; i < stations.length - 1; i++) noseSegment(group, i, 'centre');
  });
  part(7, 3, '兩側高起的雙翼折線', '搭出雙翼長車鼻', group => {
    for (let i = 0; i < stations.length - 1; i++) noseSegment(group, i, 'wing');
    // A few visible studs mark the rear joint of the sculpted wedge bricks.
    for (const z of [-40, 40]) stud(group, 176, 164, z, white);
  });

  part(8, 1, '駕駛室兩側厚肩磚', '組裝先頭駕駛室', group => {
    for (const side of [-1, 1]) {
      slope(group, '駕駛室白色斜肩磚', [[150, 131], [184, 131], [216, 174], [190, 174]],
        side < 0 ? -64 : 48, 16, white);
      brick(group, '駕駛室側邊凸點磚', 192, 159, side < 0 ? -64 : 48, 32, 15, 16, pearl, true);
    }
  });
  part(8, 2, '駕駛室分段黑色擋風窗', '組裝先頭駕駛室', group => {
    for (const z of [-48, -16, 16]) {
      slope(group, '分段深色前窗楔磚', [[150, 145], [177, 145], [207, 178], [179, 178]],
        z, 32, glass);
    }
    for (const z of [-48, -16, 16]) {
      brick(group, '前窗上緣白色短磚', 200, 177, z, 16, 6, 32, white);
    }
  });
  part(8, 3, '雙側駕駛室小側窗', '組裝先頭駕駛室', group => {
    for (const side of [-1, 1]) {
      slope(group, '獨立深色駕駛室側窗', [[184, 141], [215, 141], [221, 170], [205, 171]],
        side < 0 ? -66 : 50, 16, glass);
      brick(group, '側窗下緣深色短線', 185, 138, side < 0 ? -68 : 66, 32, 3, 2, dark);
    }
  });

  part(9, 1, '前半段兩側獨立客窗', '裝上客窗與藍帶', group => windows(group, [272, 312, 352]));
  part(9, 2, '後半段兩側獨立客窗', '裝上客窗與藍帶', group => windows(group, [392, 432, 472, 504]));
  part(9, 3, '車身雙藍帶與鼻側 S 折線', '裝上客窗與藍帶', group => {
    for (const side of [-1, 1]) {
      for (let x = 184; x < 576; x += 32) {
        const length = Math.min(32, 576 - x);
        brick(group, '深藍車身帶短磚', x, 115, side < 0 ? -66 : 64, length, 11, 2, blue);
        brick(group, '淺藍細帶短磚', x, 105, side < 0 ? -66 : 64, length, 3, 2, brightBlue);
      }
      for (let i = 2; i < stations.length - 1; i++) {
        const a = stations[i], b = stations[i + 1];
        const rise = i >= 4 ? 5 : 1;
        loft(group, '鼻部 S 形藍色側帶斜磚',
          section(a, side * (a.half - 1), side * (a.half + 1.1), a.base + 2 + rise, a.base + 8 + rise),
          section(b, side * (b.half - 1), side * (b.half + 1.1), b.base + 2 + rise, b.base + 8 + rise), blue);
      }
    }
  });

  part(10, 1, '前部兩側白色乘客門', '安裝車門與車尾', group => door(group, 232));
  part(10, 2, '後部兩側白色乘客門', '安裝車門與車尾', group => door(group, 536));
  part(10, 3, '後端連通門與角落踏板', '安裝車門與車尾', group => {
    for (const z of [-64, -32, 0, 32]) {
      brick(group, '後端白色厚磚', 568, 69, z, 8, 105, 32, white);
    }
    rounded(group, '後端黑色風擋框', [577, 119, 0], [6, 100, 75], dark, 1.5);
    rounded(group, '後端深色連通門', [581, 122, 0], [4, 83, 37], glass, 1, 'glass');
    for (const side of [-1, 1]) {
      brick(group, '車尾角落短收口', 562, 70, side < 0 ? -66 : 64, 10, 8, 2, gray);
      brick(group, '車尾厚踏板', 558, 62, side < 0 ? -75 : 63, 18, 5, 12, dark, true);
    }
  });

  part(11, 1, '駕駛室頂白色凸點磚', '鋪設分段白色屋頂', group => roof(group, 216, 288));
  part(11, 2, '車身中央分段屋頂', '鋪設分段白色屋頂', group => roof(group, 288, 448));
  part(11, 3, '車身後段分段屋頂', '鋪設分段白色屋頂', group => roof(group, 448, 576));

  part(12, 1, '兩側翼根寬 LED 頭燈', '完成 N700S 車頭', group => {
    for (const side of [-1, 1]) {
      const a = stations[3], b = stations[4];
      loft(group, '貼合翼面的寬 LED 深色框',
        section(a, side * (a.half * .62), side * (a.half * .88), a.wing - .5, a.wing + 2.5),
        section(b, side * (b.half * .62), side * (b.half * .88), b.wing - .5, b.wing + 2.5), dark);
      loft(group, '貼合翼面的乳白 LED 燈片',
        { x: 80, inner: side * 29, outer: side * 35, low: 119, high: 120.5 },
        { x: 96, inner: side * 34, outer: side * 42, low: 127, high: 128.5 }, '#fff6da');
    }
  });
  part(12, 2, '前側導流稜與淺灰下鼻蓋', '完成 N700S 車頭', group => {
    for (const side of [-1, 1]) {
      const a = stations[2], b = stations[3];
      loft(group, '貼合鼻側的白色翼尖短磚',
        section(a, side * (a.half * .77), side * (a.half * .94), a.wing - .5, a.wing + 2),
        section(b, side * (b.half * .77), side * (b.half * .94), b.wing - .5, b.wing + 2), pearl);
    }
    // The lower lip remains visible under the white wedges, so this assembly
    // step reads clearly without adding a lamp or an unsupported side bar.
    for (let i = 0; i < 3; i++) {
      const a = stations[i], b = stations[i + 1];
      loft(group, '分段淺灰厚磚下鼻蓋',
        section(a, -a.half - 1, a.half + 1, 56, 65),
        section(b, -b.half - 1, b.half + 1, 56, 65), '#cbd2d5');
    }
  });
  part(12, 3, '長鼻尖中央接縫與防撞厚磚', '完成 N700S 車頭', group => {
    brick(group, '鼻尖厚白色端磚', -27, 69, -8, 6, 12, 16, pearl);
    brick(group, '鼻尖中央深色接縫', -28, 69, -2, 2, 8, 4, gray);
    brick(group, '鼻尖下緣厚防撞磚', -25, 59, -11, 16, 10, 22, soft, true);
  });

  return model;
}
