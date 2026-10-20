import { vehicleParts } from './vehicle-parts.js';

export function createCementMixerModel(material) {
  const { pack, ground, axle, chassis, brick, rounded, cylinder, cabBase, cabGlass, cabRoof,
    bar, rail, lamps, arch, looseBricks, finish, mesh, THREE } = vehicleParts(material, '預拌混凝土車・轉動攪拌筒', 490);
  const blue = '#347aa2', light = '#e6e5ce', yellow = '#e9b83b', dark = '#2e3c44', gray = '#85959b';
  ground();
  pack('裝上三組重型輪軸', [
    ['前方轉向輪軸', g => axle(g, 130, 27)],
    ['後方第一承重輪軸', g => axle(g, 328, 27)],
    ['後方第二承重輪軸', g => axle(g, 392, 27)],
  ]);
  pack('搭好攪拌車長底盤', [[75, 195], [195, 315], [315, 435]].map(([a, b], i) => [
    ['前段藍色車架', '中央攪拌筒車架', '後段卸料車架'][i], g => {
      chassis(g, a, b, 65, dark);
      for (const side of [-1, 1]) brick(g, '車架藍色側板', a, 79, side < 0 ? -66 : 54, b - a, 12, 12, blue, true);
    },
  ]));
  pack('拼起藍色駕駛室', [
    ['駕駛室下半厚磚與踏板', g => cabBase(g, 76, 190, blue, 80)],
    ['獨立前窗與兩側車窗', g => cabGlass(g, 76, 190, blue, 138, 193)],
    ['凸點藍色屋頂與警示燈', g => cabRoof(g, 76, 190, blue, 201)],
  ]);
  pack('建立攪拌筒雙端支承', [
    ['前方三角筒座', g => {
      for (const z of [-53, 36]) {
        brick(g, '前筒座底磚', 248, 91, z, 44, 15, 17, gray, true);
        bar(g, '前筒座斜支柱', [255, 104, z + 8], [270, 113, z + 8], 7, blue);
        bar(g, '前筒座斜支柱', [286, 104, z + 8], [270, 113, z + 8], 7, blue);
      }
      brick(g, '前筒座橫梁', 256, 94, -44, 29, 13, 88, gray, true);
    }],
    ['後方三角筒座與後平台', g => {
      for (const z of [-53, 36]) {
        brick(g, '後筒座底磚', 330, 91, z, 45, 15, 17, gray, true);
        bar(g, '後筒座斜支柱', [337, 103, z + 8], [352, 113, z + 8], 7, blue);
        bar(g, '後筒座斜支柱', [369, 103, z + 8], [352, 113, z + 8], 7, blue);
      }
      brick(g, '卸料操作平台', 399, 91, -58, 39, 10, 116, gray, true);
    }],
    ['外露滾筒支承輪與傳動箱', g => {
      for (const x of [270, 352]) for (const z of [-48, 48]) cylinder(g, '攪拌筒小滾輪', [x, 114, z], 13, 14, dark, 'x');
      rounded(g, '前方轉筒齒輪箱', [221, 163, 0], [29, 31, 37], gray, 3);
      cylinder(g, '齒輪箱傳動圓軸', [232, 170, 0], 12, 31, dark, 'x');
    }],
  ]);
  // CylinderGeometry's default axis is Y. A quarter-turn makes a longitudinal
  // X-axis drum. Each band is its own chunky, bevel-edged toy segment.
  function drumBand(g, name, x, length, rFront, rBack, color) {
    const body = mesh(g, name, new THREE.CylinderGeometry(rBack, rFront, length - .8, 32, 1, false), color, [x + length / 2, 170, 0]);
    body.rotation.z = -Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const r = (rFront + rBack) / 2 + .8;
      const seam = rounded(g, '筒身短磚接縫扣', [x + length / 2, 170 + Math.cos(a) * r, Math.sin(a) * r],
        [Math.min(18, length - 3), 5, 10], color, 1);
      seam.rotation.x = a;
    }
  }
  pack('拼成三段攪拌筒', [
    ['攪拌筒前方錐段', g => {
      drumBand(g, '前錐短段一', 227, 25, 25, 44, light);
      drumBand(g, '前錐短段二', 252, 25, 44, 62, light);
    }],
    ['攪拌筒中央大肚分段筒身', g => {
      for (const x of [277, 300, 323]) drumBand(g, '中央短筒磚', x, 23, 62, 62, light);
    }],
    ['攪拌筒後方出料錐段', g => {
      drumBand(g, '後錐短段一', 346, 25, 62, 44, light);
      drumBand(g, '後錐短段二', 371, 25, 44, 24, light);
      cylinder(g, '筒尾出料口黑色內腔', [398, 170, 0], 18, 4, dark, 'x');
    }],
  ]);
  pack('扣上轉筒加強環與藍色葉紋', [
    ['前方藍色加強環', g => {
      cylinder(g, '前方厚實藍色環', [270, 170, 0], 59, 7, blue, 'x');
      for (const a of [0, Math.PI]) { const p = rounded(g, '前方斜紋短凸磚', [286, 170 + Math.cos(a) * 62, Math.sin(a) * 62], [35, 6, 15], blue, 1); p.rotation.x = a; }
    }],
    ['中央藍色加強環與凸點', g => {
      cylinder(g, '中央厚實藍色環', [312, 170, 0], 64, 9, blue, 'x');
      for (let a = 0; a < 6; a++) { const t = a * Math.PI / 3;
        cylinder(g, '筒身圓形外扣', [312, 170 + Math.cos(t) * 65, Math.sin(t) * 65], 4.5, 5, yellow, 'x'); }
    }],
    ['後方藍色加強環與斜紋', g => {
      cylinder(g, '後方厚實藍色環', [352, 170, 0], 59, 7, blue, 'x');
      for (const a of [Math.PI / 2, Math.PI * 1.5]) { const p = rounded(g, '後方斜紋短凸磚', [335, 170 + Math.cos(a) * 62, Math.sin(a) * 62], [35, 6, 15], blue, 1); p.rotation.x = a; }
    }],
  ]);
  pack('接上後方漏斗與卸料槽', [
    ['後方開口進料漏斗', g => {
      const hopper = mesh(g, '厚壁漏斗外形', new THREE.CylinderGeometry(29, 15, 31, 4, 1, true), yellow, [416, 184, 0]);
      hopper.rotation.y = Math.PI / 4;
      for (const z of [-22, 17]) brick(g, '漏斗頂端厚邊', 394, 199, z, 44, 6, 5, yellow);
      for (const x of [394, 433]) brick(g, '漏斗頂端厚邊', x, 199, -17, 5, 6, 34, yellow);
      cylinder(g, '漏斗下方出料口', [416, 162, 0], 15, 18, gray, 'y');
    }],
    ['獨立可轉向的三段卸料槽', g => {
      // Thick U-section, open at the top, descending toward the rear.
      for (let i = 0; i < 3; i++) {
        const x = 416 + i * 29, y = 146 - i * 17;
        const base = rounded(g, '卸料槽短底板', [x + 14, y, 0], [34, 7, 34], gray, 1);
        base.rotation.z = -.52;
        for (const z of [-19, 15]) { const side = rounded(g, '卸料槽厚側邊', [x + 14, y + 7, z], [34, 17, 5], yellow, 1); side.rotation.z = -.52; }
      }
    }],
    ['卸料槽轉軸與支撐架', g => {
      cylinder(g, '卸料槽轉向支點', [415, 137, 0], 16, 12, dark, 'y');
      for (const z of [-30, 30]) bar(g, '卸料槽支撐短桿', [404, 99, z], [435, 132, z / 2], 4, blue);
      brick(g, '操作台後緣防撞磚', 427, 90, -61, 13, 12, 122, blue, true);
    }],
  ]);
  pack('完成車側扶手與爬梯', [
    ['近側操作平台扶手', g => {
      rail(g, [371, 167, 78], [424, 167, 78], yellow);
      rail(g, [424, 167, 78], [424, 167, 36], yellow);
    }],
    ['後方防滑爬梯', g => {
      for (const z of [-46, -20]) bar(g, '爬梯粗側桿', [423, 94, z], [423, 197, z], 3.5, gray);
      for (const y of [106, 128, 150, 172, 194]) bar(g, '爬梯橫階', [423, y, -46], [423, y, -20], 3.5, gray);
    }],
    ['藍色傳動引擎與排氣管', g => {
      for (const x of [199, 231]) brick(g, '傳動引擎短磚', x, 91, -61, 32, 26, 28, blue, true);
      for (const x of [207, 222, 237, 252]) brick(g, '引擎通風短槽', x, 97, -64, 7, 15, 3, dark);
      cylinder(g, '黑色短排氣管', [207, 143, -48], 5, 37, dark, 'y');
    }],
  ]);
  pack('放好車燈輪拱與出料積木', [
    ['卡車頭燈與前方格柵', g => {
      lamps(g, 72, 106);
      for (const y of [109, 119, 129]) brick(g, '卡車前格柵', 69, y, -27, 4, 5, 54, dark);
    }],
    ['藍色六輪輪拱', g => arch(g, [130, 328, 392], blue)],
    ['卸料槽下方灰色工作積木', g => looseBricks(g, [[464, 1, 14], [487, 1, 39], [472, 16, 26]], '#b7b9ae')],
  ]);
  return finish({ drum: [312, 170, 0], frontSupport: [270, 114, 0], rearSupport: [352, 114, 0],
    chute: [415, 137, 0], outlet: [504, 100, 0] });
}
