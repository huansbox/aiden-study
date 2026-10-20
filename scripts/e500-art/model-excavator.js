import { vehicleParts } from './vehicle-parts.js';

export function createExcavatorModel(material) {
  const { pack, ground, tread, chassis, brick, rounded, cylinder, blockBeam, joint, hydraulic,
    cabGlass, rail, looseBricks, finish, slope } = vehicleParts(material, '履帶怪手・可動挖掘機', 480);
  const yellow = '#eeb628', dark = '#323d43', gray = '#758189', glass = '#375c6a';
  ground();
  pack('拼出兩條厚履帶', [
    ['遠側履帶與支承輪', g => tread(g, -62)],
    ['近側履帶與支承輪', g => tread(g, 62)],
    ['履帶中央橫軸與底座', g => {
      for (const x of [222, 350]) brick(g, '履帶中央連接短磚', x, 42, -48, 40, 22, 96, dark, true);
      cylinder(g, '下方中央轉盤', [302, 69, 0], 49, 14, gray, 'y');
    }],
  ]);
  pack('搭好履帶上方平台', [[190, 270], [270, 350], [350, 422]].map(([a, b], i) => [
    ['前段底座與防滑板', '中央承重厚底座', '後段底座與踏階'][i], g => {
      chassis(g, a, b, 76, dark, 126);
      for (const side of [-1, 1]) brick(g, '履帶上緣黃色短板', a, 90, side < 0 ? -74 : 58, b - a, 8, 16, yellow, true);
    },
  ]));
  pack('組成可旋轉上車', [
    ['上車旋轉盤與前支架', g => {
      cylinder(g, '可見旋轉厚盤', [302, 103, 0], 51, 17, dark, 'y');
      for (const x of [210, 242, 274, 306]) brick(g, '旋轉平台短厚磚', x, 111, -59, 32, 16, 118, yellow, true);
      for (const z of [-22, 12]) brick(g, '大臂根部雙耳', 205, 126, z, 33, 31, 10, yellow, true);
    }],
    ['後方厚配重與紅色反光片', g => {
      for (const x of [338, 370, 402]) for (const z of [-60, -28, 4, 36])
        brick(g, '配重短厚磚', x, 109, z, 32, 40, 32, yellow, true);
      for (const z of [-43, 31]) brick(g, '後方紅色反光片', 435, 127, z, 3, 9, 14, '#b94835');
    }],
    ['黑灰引擎罩與散熱格柵', g => {
      for (const x of [340, 372, 404]) brick(g, '引擎罩短磚', x, 149, -60, 32, 22, 64, yellow, true);
      for (const x of [349, 363, 377, 391, 405, 419]) brick(g, '近側引擎通風槽', x, 153, 5, 7, 14, 3, dark);
    }],
  ]);
  pack('搭出駕駛艙骨架', [
    ['駕駛艙地板與後牆', g => {
      for (const x of [274, 306, 338]) brick(g, '駕駛艙黃色地板', x, 127, 10, 32, 12, 64, yellow, true);
      for (const z of [10, 42]) brick(g, '駕駛艙後牆', 360, 139, z, 12, 75, 32, yellow, true);
    }],
    ['駕駛艙粗窗柱與門檻', g => {
      for (const x of [275, 356]) for (const z of [10, 67]) brick(g, '粗直立窗柱', x, 139, z, 11, 85, 11, yellow, true);
      brick(g, '車門門檻', 286, 139, 69, 70, 13, 11, yellow, true);
    }],
    ['藍灰座椅與雙控制桿', g => {
      rounded(g, '座椅坐墊', [327, 157, 43], [30, 13, 36], dark, 3);
      rounded(g, '座椅靠背', [343, 178, 43], [12, 36, 36], dark, 3);
      for (const z of [22, 65]) { cylinder(g, '獨立控制桿', [305, 167, z], 3, 29, dark, 'y');
        rounded(g, '控制桿頭', [305, 183, z], [9, 7, 9], gray, 2); }
    }],
  ]);
  pack('裝上駕駛艙玻璃與屋頂', [
    ['前方與近側獨立玻璃', g => {
      rounded(g, '駕駛艙前擋玻璃', [273, 183, 43], [3, 61, 46], glass, 1, 'glass');
      rounded(g, '駕駛艙近側玻璃', [321, 186, 80], [65, 57, 3], glass, 1, 'glass');
      brick(g, '駕駛門把', 342, 151, 81, 16, 5, 4, dark);
    }],
    ['凸點駕駛艙屋頂', g => {
      for (const x of [269, 301, 333]) brick(g, '屋頂短厚磚', x, 223, 2, 32, 12, 85, yellow, true);
    }],
    ['引擎排氣管與空濾蓋', g => {
      cylinder(g, '排氣粗底座', [403, 178, -37], 9, 13, gray, 'y');
      cylinder(g, '黑色直排氣管', [403, 199, -37], 6, 37, dark, 'y');
      rounded(g, '排氣管帽', [403, 220, -37], [20, 6, 14], dark, 2);
      cylinder(g, '空氣濾清器', [369, 182, -33], 12, 18, gray, 'y');
    }],
  ]);
  pack('接上可抬起的大臂', [
    ['黃色分段大臂主體', g => {
      blockBeam(g, '大臂雙側短磚', [220, 124, 0], [120, 278, 0], 27, yellow, 34);
      blockBeam(g, '大臂背部加強梁', [227, 143, -20], [132, 275, -20], 11, dark, 8);
    }],
    ['大臂外露油壓缸', g => {
      hydraulic(g, '大臂油壓', [249, 130, 28], [148, 234, 28], gray);
      g.userData.mechanism = { type: 'linkage', axis: 'z', base: [249, 130, 28], tip: [148, 234, 28] };
    }],
    ['大臂根部與頂端轉軸', g => {
      joint(g, '大臂底部轉軸', [220, 124, 0], 15, 53, dark);
      joint(g, '大臂頂端轉軸', [120, 278, 0], 14, 46, dark);
    }],
  ]);
  pack('連接小臂與鏟斗連桿', [
    ['黃色小臂主體', g => blockBeam(g, '小臂短厚磚', [120, 278, 0], [44, 140, 0], 24, yellow, 28)],
    ['鏟斗雙連桿與小臂軸扣', g => {
      for (const z of [-23, 23]) blockBeam(g, '鏟斗控制連桿', [72, 191, z], [25, 146, z], 9, dark, 9);
      joint(g, '小臂底端轉軸', [44, 140, 0], 12, 50, gray);
    }],
    ['小臂亮銀油壓桿', g => {
      hydraulic(g, '小臂油壓', [125, 262, 25], [61, 169, 25], gray);
      g.userData.mechanism = { type: 'linkage', axis: 'z', base: [125, 262, 25], tip: [61, 169, 25] };
    }],
  ]);
  pack('裝上能挖積木的鏟斗', [
    ['獨立厚壁開口鏟斗', g => {
      // Three real walls leave an open scoop; no single solid bucket block.
      for (const z of [-40, 31]) slope(g, '鏟斗厚側頰', [[-12, 102], [42, 111], [53, 140], [33, 151], [-14, 122]], z, 9, dark);
      slope(g, '鏟斗彎折底板', [[-15, 102], [37, 110], [42, 120], [-13, 113]], -31, 62, gray);
      brick(g, '鏟斗背部厚梁', 31, 117, -31, 12, 28, 62, dark, true);
    }],
    ['鏟斗前緣四顆獨立斗齒', g => {
      for (const z of [-33, -13, 7, 27]) slope(g, '凸出的短斗齒', [[-30, 100], [-9, 103], [-8, 113], [-27, 108]], z, 12, '#aeb8bd');
    }],
    ['待鏟取的三塊土色積木', g => looseBricks(g, [[-38, 1, 42], [-8, 1, 54], [-22, 16, 45]])],
  ]);
  pack('完成安全扶手與工作燈', [
    ['引擎平台安全扶手', g => { rail(g, [342, 195, 28], [426, 195, 28], dark); rail(g, [426, 195, 28], [426, 195, -44], dark); }],
    ['大臂根部雙工作燈', g => {
      for (const z of [-43, 35]) { rounded(g, '粗工作燈框', [234, 159, z], [21, 17, 14], dark, 2);
        rounded(g, '奶白工作燈', [222, 160, z], [3, 11, 10], '#fff0bc', 1); }
    }],
    ['近側登車雙踏板', g => {
      for (const [x, y] of [[338, 106], [350, 93]]) brick(g, '近側防滑踏板', x, y, 74, 48, 8, 22, gray, true);
      cylinder(g, '車頂警示燈', [355, 244, 48], 7, 12, '#ff9733', 'y');
    }],
  ]);
  return finish({ turntable: [302, 103, 0], boom: [220, 124, 0], stick: [120, 278, 0], bucket: [44, 140, 0] });
}
