import { vehicleParts } from './vehicle-parts.js';

export function createMobileCraneModel(material) {
  const { pack, ground, axle, chassis, brick, rounded, cylinder, cabBase, cabGlass, cabRoof,
    blockBeam, joint, bar, lamps, arch, rail, finish, mesh, THREE } = vehicleParts(material, '工程吊車・伸縮臂與積木箱', 510);
  const yellow = '#edbd32', gray = '#7a898f', dark = '#2c373f', red = '#c74a38';
  ground();
  pack('組裝六輪重型車架', [
    ['前方轉向輪軸', g => axle(g, 150, 27)],
    ['中央承重輪軸', g => axle(g, 326, 27)],
    ['後方承重輪軸', g => axle(g, 392, 27)],
  ]);
  pack('拼好吊車長底盤', [[90, 202], [202, 314], [314, 442]].map(([a, b], i) => [
    ['前段黃色車架', '中段轉台承重車架', '後段吊車車架'][i], g => {
      chassis(g, a, b, 65, dark);
      for (const side of [-1, 1]) brick(g, '車架黃色防撞邊', a, 79, side < 0 ? -66 : 54, b - a, 13, 12, yellow, true);
    },
  ]));
  pack('展開四支落地支撐腳', [
    ['前方左右支撐橫梁', g => {
      for (const side of [-1, 1]) {
        brick(g, '前支撐伸出短梁', 200, 57, side < 0 ? -116 : 60, 27, 17, 56, yellow, true);
        cylinder(g, '前垂直支撐缸', [213, 32, side * 109], 9, 49, gray, 'y');
        brick(g, '前支撐警示條', 199, 64, side < 0 ? -117 : 114, 27, 6, 3, dark);
      }
      g.userData.mechanism = { axis: 'x', pivot: [213, 57, 0] };
    }],
    ['後方左右支撐橫梁', g => {
      for (const side of [-1, 1]) {
        brick(g, '後支撐伸出短梁', 361, 57, side < 0 ? -116 : 60, 27, 17, 56, yellow, true);
        cylinder(g, '後垂直支撐缸', [374, 32, side * 109], 9, 49, gray, 'y');
        brick(g, '後支撐警示條', 360, 64, side < 0 ? -117 : 114, 27, 6, 3, dark);
      }
      g.userData.mechanism = { axis: 'x', pivot: [374, 57, 0] };
    }],
    ['四塊寬支撐腳墊', g => {
      for (const x of [213, 374]) for (const z of [-109, 109])
        brick(g, '支撐腳厚方墊', x - 21, 1, z - 20, 42, 9, 40, dark, true);
    }],
  ]);
  pack('組裝黃色卡車駕駛室', [
    ['駕駛室厚底座與踏板', g => cabBase(g, 91, 193, yellow, 79)],
    ['駕駛室窗框與獨立玻璃', g => cabGlass(g, 91, 193, yellow, 137, 193)],
    ['駕駛室凸點頂蓋與警示燈', g => cabRoof(g, 91, 193, yellow, 201)],
  ]);
  pack('搭起可旋轉吊臂上車', [
    ['吊車中央旋轉轉盤', g => {
      cylinder(g, '黑色下轉盤', [314, 101, 0], 47, 16, dark, 'y');
      cylinder(g, '黃色上轉盤', [314, 114, 0], 43, 11, yellow, 'y');
      for (const z of [-54, 41]) brick(g, '轉台側踏板', 278, 111, z, 75, 9, 13, gray, true);
    }],
    ['吊臂支承與小操作室', g => {
      for (const x of [285, 317, 349]) brick(g, '上車機座短厚磚', x, 121, -52, 32, 26, 104, yellow, true);
      for (const z of [-25, 15]) brick(g, '吊臂根部雙耳支架', 298, 145, z, 35, 31, 10, yellow, true);
      rounded(g, '側方操作室下座', [349, 162, 48], [53, 31, 48], yellow, 3);
      rounded(g, '操作室深色玻璃', [349, 191, 57], [48, 36, 31], '#395d6b', 2, 'glass');
      brick(g, '小操作室頂蓋', 319, 210, 31, 62, 8, 57, yellow, true);
    }],
    ['後方配重短厚磚組', g => {
      for (const x of [382, 414]) for (const z of [-48, -16, 16]) brick(g, '吊車尾部配重磚', x, 122, z, 32, 43, 32, gray, true);
      for (const z of [-45, -13, 19]) brick(g, '配重黃色頂磚', 382, 165, z, 64, 8, 32, yellow, true);
      for (const z of [-43, 29]) brick(g, '配重紅色警示', 447, 138, z, 3, 13, 15, red);
    }],
  ]);
  pack('接上三段伸縮吊臂', [
    ['黃色大臂基段與根部軸', g => {
      blockBeam(g, '基段箱形吊臂', [314, 143, 0], [242, 207, 0], 34, yellow, 36);
      joint(g, '吊臂根部粗轉軸', [314, 143, 0], 15, 62, dark);
      bar(g, '大臂旁油壓缸', [347, 139, 27], [268, 185, 27], 7, gray);
    }],
    ['銀灰中段伸縮臂', g => {
      blockBeam(g, '中段伸縮短厚磚', [242, 207, 0], [170, 271, 0], 25, '#d0d5d0', 28);
      blockBeam(g, '中段黃色端套', [244, 205, 0], [235, 213, 0], 35, yellow, 39);
    }],
    ['黃色外段伸縮臂', g => {
      blockBeam(g, '外段伸縮短厚磚', [170, 271, 0], [94, 334, 0], 18, yellow, 21);
      blockBeam(g, '外段黑色端套', [173, 268, 0], [164, 276, 0], 28, dark, 31);
      for (const z of [-15, 10]) brick(g, '臂端滑輪雙耳', 80, 321, z, 29, 20, 5, yellow);
    }],
  ]);
  pack('穿好吊線並掛上吊鉤', [
    ['臂端轉動滑輪', g => {
      cylinder(g, '吊線頂端粗滑輪', [94, 331, 0], 11, 17, dark);
      cylinder(g, '滑輪銀灰軸扣', [94, 331, 11], 5, 4, gray);
    }],
    ['獨立雙股垂直吊線', g => {
      for (const z of [-6, 6]) bar(g, '黑色粗吊索', [94, 324, z], [94, 118, z], 2.6, dark);
      rounded(g, '吊線下方滑輪座', [94, 111, 0], [25, 18, 20], yellow, 3);
      for (const x of [86, 98]) brick(g, '鉤座黑色警示紋', x, 104, 11, 6, 16, 2, dark);
      g.userData.mechanism = { axis: 'z', base: [94, 324, 0], tip: [94, 111, 0] };
    }],
    ['可獨立升降的粗吊鉤', g => {
      bar(g, '吊鉤頸', [94, 106, 0], [94, 96, 0], 4.5, gray);
      const hook = mesh(g, '開口厚吊鉤', new THREE.TorusGeometry(12, 4.5, 10, 30, Math.PI * 1.6), dark, [94, 87, 0]);
      hook.rotation.z = Math.PI * .1;
      rounded(g, '鉤尖護扣', [104, 89, 0], [7, 7, 9], gray, 1);
    }],
  ]);
  pack('拼出獨立可吊積木箱', [
    ['木色積木箱厚底板', g => {
      for (const x of [20, 52]) brick(g, '箱底短厚磚', x, 6, 40, 32, 12, 64, '#af793f', true);
      for (const z of [48, 86]) brick(g, '箱底滑木', 23, 1, z, 58, 7, 12, dark);
    }],
    ['開口積木箱四面箱壁', g => {
      for (const y of [18, 34, 50]) {
        for (const z of [40, 96]) for (const x of [20, 52]) brick(g, '箱側短木色磚', x, y, z, 32, 16, 8, '#c59454', true);
        for (const x of [20, 76]) brick(g, '箱端短木色磚', x, y, 48, 8, 16, 48, '#c59454', true);
      }
    }],
    ['積木箱提耳與裝載積木', g => {
      for (const x of [29, 75]) {
        bar(g, '吊箱提耳', [x, 61, 48], [x, 83, 72], 3.5, gray);
        bar(g, '吊箱提耳', [x, 83, 72], [x, 61, 96], 3.5, gray);
      }
      for (const [x, y, z] of [[34, 19, 55], [53, 34, 61]]) brick(g, '箱內凸點貨物', x, y, z, 24, 16, 24, '#ba4e3b', true);
      g.userData.mechanism = { axis: 'z', pivot: [75, 83, 72] };
    }],
  ]);
  pack('完成扶手車燈與輪拱', [
    ['車側登台扶手與梯子', g => {
      rail(g, [244, 153, 74], [278, 153, 74], dark);
      for (const y of [82, 100, 118]) brick(g, '車側短梯級', 247, y, 67, 31, 6, 16, gray, true);
    }],
    ['前方頭燈與進氣格柵', g => {
      lamps(g, 88, 105);
      for (const y of [108, 117, 126]) brick(g, '前方黑色進氣格柵', 85, y, -28, 4, 4, 56, dark);
    }],
    ['六輪黃色輪拱', g => arch(g, [150, 326, 392], yellow)],
  ]);
  return finish({ turntable: [314, 107, 0], boom: [314, 143, 0], boomMiddle: [242, 207, 0],
    boomTip: [94, 334, 0], hook: [94, 98, 0], cargo: [52, 40, 72] });
}
