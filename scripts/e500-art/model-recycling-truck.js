import { vehicleParts } from './vehicle-parts.js';

export function createRecyclingTruckModel(material) {
  const { pack, ground, axle, chassis, brick, rounded, cylinder, cabBase, cabGlass, cabRoof,
    blockBeam, joint, hydraulic, lamps, bar, looseBricks, finish } = vehicleParts(material, '回收車・升桶與抬斗卸料', 540);
  const green = '#4a9364', light = '#d9e6cd', yellow = '#edbd36', dark = '#2d3b42', gray = '#809197';
  ground();
  pack('組裝六輪回收車底架', [
    ['前方轉向輪軸', g => axle(g, 126, 27)],
    ['後方第一承重輪軸', g => axle(g, 323, 27)],
    ['後方第二承重輪軸', g => axle(g, 389, 27)],
  ]);
  pack('拼好綠色底盤與輪拱', [[74, 194], [194, 314], [314, 434]].map(([a, b], i) => [
    ['前段駕駛室車架', '中央抬斗車架', '後段卸料車架'][i], g => {
      chassis(g, a, b, 65, dark);
      for (const side of [-1, 1]) brick(g, '綠色短車架側板', a, 79, side < 0 ? -67 : 54, b - a, 12, 13, green, true);
      const x = [126, 323, 389][i];
      for (const side of [-1, 1]) brick(g, '綠色輪拱頂磚', x - 31, 59, side < 0 ? -80 : 61, 62, 9, 19, green, true);
    },
  ]));
  pack('完成明亮駕駛室', [
    ['奶白駕駛室下半與踏板', g => cabBase(g, 75, 194, light, 80)],
    ['綠色窗柱與深色玻璃', g => cabGlass(g, 75, 194, green, 138, 194)],
    ['綠色凸點車頂與前車燈', g => { cabRoof(g, 75, 194, green, 202); lamps(g, 71, 106); }],
  ]);
  pack('搭起可以抬升的車斗', [
    ['車斗厚底板與後端轉軸', g => {
      for (let x = 218; x < 426; x += 32) brick(g, '車斗厚底短磚', x, 91, -61, Math.min(32, 426 - x), 16, 122, gray, true);
      joint(g, '抬斗後端粗轉軸', [416, 88, 0], 13, 142, dark);
    }],
    ['遠側分段綠色斗壁', g => {
      for (let x = 218; x < 426; x += 32) for (const y of [108, 132, 156, 180])
        brick(g, '遠側短厚斗壁磚', x, y, -65, Math.min(32, 426 - x), 24, 13, green, y === 180);
      for (const x of [231, 295, 359]) brick(g, '遠側奶白色帶', x, 157, -68, 48, 14, 3, light);
    }],
    ['近側分段綠色斗壁', g => {
      for (let x = 218; x < 426; x += 32) for (const y of [108, 132, 156, 180])
        brick(g, '近側短厚斗壁磚', x, y, 52, Math.min(32, 426 - x), 24, 13, green, y === 180);
      for (const x of [231, 295, 359]) brick(g, '近側奶白色帶', x, 157, 66, 48, 14, 3, light);
      // Simple code-native recycling loop: three chunky connected arrows.
      for (const [a, b] of [[[292, 183, 71], [313, 193, 71]], [[313, 193, 71], [330, 174, 71]], [[330, 174, 71], [292, 174, 71]]])
        blockBeam(g, '回收環形箭頭', a, b, 5, light, 4);
    }],
  ]);
  pack('封好車斗前壁與弧形頂蓋', [
    ['車斗前方厚擋板', g => {
      for (const z of [-52, -20, 12]) for (const y of [108, 140, 172]) brick(g, '前壁短厚磚', 218, y, z, 13, 32, 32, green, true);
      for (const z of [-48, -16, 16]) brick(g, '車斗前上緣磚', 218, 204, z, 13, 18, 32, green, true);
    }],
    ['綠色分段弧形車斗頂蓋', g => {
      for (let x = 231; x < 426; x += 32) {
        const length = Math.min(32, 426 - x);
        for (const [z, y, w] of [[-63, 207, 19], [-44, 217, 28], [-16, 221, 32], [16, 217, 28], [44, 207, 19]])
          rounded(g, '弧形車斗短頂磚', [x + length / 2, y, z + w / 2], [length - .9, 13, w - .9], green, 3);
        brick(g, '頂蓋中央凸點脊', x, 227, -16, length, 5, 32, green, true);
      }
    }],
    ['車斗後上方厚門框', g => {
      for (const z of [-65, 52]) brick(g, '後方直門框', 426, 106, z, 14, 114, 13, dark, true);
      for (const z of [-52, -20, 12]) brick(g, '後方上橫框', 426, 207, z, 14, 15, 32, green, true);
    }],
  ]);
  pack('接上能掀開的後門', [
    ['獨立分段後門板', g => {
      for (const z of [-51, -19, 13]) for (const y of [108, 132, 156, 180])
        brick(g, '後門短厚板磚', 439, y, z, 12, 24, 32, green, true);
      for (const y of [123, 165]) brick(g, '後門橫向加強梁', 451, y, -47, 5, 10, 94, gray);
      for (const z of [-35, 17]) brick(g, '後門黃色反光片', 457, 142, z, 3, 12, 18, yellow);
      // The door wraps around both rear corners. Its near return stays visible
      // from the shared front-three-quarter camera before the gate is opened.
      for (const z of [-77, 65]) for (const y of [108, 132, 156, 180])
        brick(g, '後門可見包角短磚', 433, y, z, 20, 24, 12, light, true);
    }],
    ['後門上方粗鉸鏈轉軸', g => {
      cylinder(g, '後門上方連續轉軸', [434, 218, 0], 8, 137, gray);
      for (const z of [-47, 34]) brick(g, '後門厚鉸鏈耳', 432, 205, z, 23, 20, 13, gray, true);
    }],
    ['後門左右鎖扣與下橫梁', g => {
      for (const z of [-56, 48]) {
        brick(g, '後門粗鎖扣', 450, 112, z, 12, 31, 8, yellow, true);
        cylinder(g, '後門鎖扣圓軸', [458, 124, z + 4], 5, 11, dark);
      }
      brick(g, '後門下方防撞橫梁', 443, 96, -66, 14, 11, 132, dark, true);
    }],
  ]);
  pack('裝上雙臂升桶裝置', [
    ['雙側升桶叉臂', g => {
      for (const z of [-54, 63]) blockBeam(g, '升桶短厚臂', [414, 132, z], [478, 67, z], 12, yellow, 13);
    }],
    ['升桶轉軸與雙側油壓缸', g => {
      for (const z of [-54, 63]) joint(g, '升桶主轉軸', [414, 132, z], 12, 19, gray);
      for (const z of [-59, 73]) hydraulic(g, '升桶油壓', [427, 90, z], [458, 91, z], gray);
    }],
    ['雙叉升桶抱架與上橫梁', g => {
      brick(g, '升桶裝置抱架橫梁', 469, 60, -56, 15, 12, 116, yellow, true);
      for (const z of [-36, 30]) brick(g, '升桶短抱叉', 474, 51, z, 38, 9, 9, dark, true);
      cylinder(g, '抱架頂部粗橫軸', [477, 73, 3], 6, 115, gray);
    }],
  ]);
  pack('拼出獨立可移動垃圾桶', [
    ['藍色開口回收桶本體', g => {
      brick(g, '垃圾桶厚底板', 469, 9, 7, 47, 9, 53, '#3e87a4', true);
      for (const z of [7, 53]) for (const y of [18, 34, 50]) brick(g, '回收桶短側壁', 469, y, z, 47, 16, 7, '#3e87a4', true);
      for (const x of [469, 509]) for (const y of [18, 34, 50]) brick(g, '回收桶短端壁', x, y, 14, 7, 16, 39, '#3e87a4', true);
      brick(g, '回收桶奶白識別牌', 488, 35, 61, 19, 14, 3, light);
    }],
    ['獨立垃圾桶蓋與粗把手', g => {
      for (const x of [465, 493]) brick(g, '回收桶厚蓋短磚', x, 66, 3, 28, 7, 61, '#2f657e', true);
      bar(g, '桶蓋粗把手', [487, 79, 29], [505, 79, 29], 3, dark);
      for (const x of [487, 505]) bar(g, '桶蓋把手柱', [x, 74, 29], [x, 79, 29], 3, dark);
      cylinder(g, '桶蓋後轉軸', [516, 67, 34], 4, 61, dark);
    }],
    ['垃圾桶雙輪與後握把', g => {
      for (const z of [8, 60]) {
        cylinder(g, '垃圾桶厚輪', [511, 12, z], 11, 8, dark);
        cylinder(g, '垃圾桶輪心', [511, 12, z + 5], 4, 3, gray);
      }
      bar(g, '垃圾桶後握把', [521, 52, 15], [521, 52, 53], 3.5, dark);
      for (const z of [15, 53]) bar(g, '桶把連接短柱', [514, 52, z], [521, 52, z], 3, dark);
    }],
  ]);
  pack('完成抬斗油壓與回收工作積木', [
    ['外露抬斗液壓桿', g => {
      for (const z of [-71, 77]) hydraulic(g, '抬斗油壓', [250, 80, z], [293, 129, z], gray);
      for (const z of [-71, 77]) joint(g, '油壓桿底座軸', [250, 80, z], 8, 9, dark);
      g.userData.mechanism = { type: 'linkage', axis: 'z', base: [250, 80, 77], tip: [293, 129, 77] };
    }],
    ['後方警示燈與反光短標', g => {
      for (const z of [-58, 45]) {
        brick(g, '後方紅色尾燈', 438, 83, z, 7, 12, 13, '#bd4b3b');
        for (const x of [237, 285, 333, 381]) brick(g, '車側黃色反光短標', x, 96, z < 0 ? -70 : 68, 24, 5, 3, yellow);
      }
      cylinder(g, '車斗後上警示燈', [419, 236, 0], 7, 12, '#f5a335', 'y');
    }],
    ['待回收的彩色積木', g => {
      looseBricks(g, [[485, 1, 88], [452, 1, 98]], '#d79e43');
      looseBricks(g, [[466, 15, 92]], '#8ab1c0');
    }],
  ]);
  return finish({ body: [416, 88, 0], rearDoor: [434, 218, 0], binLift: [414, 132, 63],
    bin: [493, 38, 34], lid: [516, 67, 34] });
}
