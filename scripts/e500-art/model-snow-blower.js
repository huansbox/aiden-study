import { vehicleParts } from './vehicle-parts.js';

export function createSnowBlowerModel(material) {
  const { pack, ground, wheel, cylinder, chassis, brick, rounded, cabBase, cabGlass, cabRoof,
    lamps, rail, joint, bar, looseBricks, mesh, finish, THREE } = vehicleParts(material, '旋轉拋雪車・螺旋集雪與拋雪管', 470);
  const red = '#d95a32', yellow = '#f3bc37', gray = '#7e9098', dark = '#2c3941', white = '#eaf1ee';
  ground();
  pack('裝好雪地寬輪胎', [
    ['遠側前後雪地胎', g => { wheel(g, 154, -66, 29); wheel(g, 355, -66, 29); }],
    ['近側前後雪地胎', g => { wheel(g, 154, 66, 29); wheel(g, 355, 66, 29); }],
    ['兩根粗輪軸與差速箱', g => {
      for (const x of [154, 355]) { cylinder(g, '雪地車粗輪軸', [x, 31, 0], 7, 128, dark);
        rounded(g, '中央差速箱', [x, 31, 0], [32, 25, 32], gray, 4); }
    }],
  ]);
  pack('組裝短厚工作底盤', [[95, 207], [207, 319], [319, 431]].map(([a, b], i) => [
    ['前端工具承座', '中央車架與踏板', '後端引擎底盤'][i], g => {
      chassis(g, a, b, 66, dark);
      for (const side of [-1, 1]) brick(g, '橘紅底盤側板', a, 80, side < 0 ? -66 : 54, b - a, 14, 12, red, true);
    },
  ]));
  pack('搭好後方引擎罩', [
    ['引擎罩中央短厚磚', g => {
      for (const x of [303, 335, 367, 399]) brick(g, '橘紅引擎罩短磚', x, 94, -47, 32, 54, 94, red, true);
    }],
    ['遠側引擎百葉與後燈', g => {
      for (const x of [314, 336, 358, 380, 402]) brick(g, '遠側散熱短格柵', x, 111, -53, 12, 24, 5, dark);
      for (const z of [-41, 33]) brick(g, '後紅色燈組', 432, 110, z, 4, 14, 14, '#b63c31');
      // A raised real intake belongs to this engine-vent assembly. Its top and
      // front face remain visible when both other hood groups are installed.
      brick(g, '引擎頂部凸起進氣盒', 362, 158, -36, 48, 15, 40, gray, true);
      for (const x of [368, 379, 390, 401]) brick(g, '進氣盒頂部厚散熱格柵', x, 176, -31, 5, 5, 30, dark);
    }],
    ['近側引擎百葉與凸點蓋', g => {
      for (const x of [314, 336, 358, 380, 402]) brick(g, '近側散熱短格柵', x, 111, 49, 12, 24, 5, dark);
      for (const x of [316, 348, 380]) brick(g, '引擎頂蓋短板', x, 149, -33, 32, 7, 64, red, true);
    }],
  ]);
  pack('架起高視野駕駛室', [
    ['橘紅駕駛艙底座與踏板', g => cabBase(g, 169, 291, red, 94)],
    ['粗駕駛艙窗柱與後板', g => {
      for (const x of [169, 280]) for (const z of [-58, 48]) brick(g, '高駕駛室窗柱', x, 147, z, 11, 81, 11, red, true);
      for (const z of [-48, -16, 16]) brick(g, '駕駛艙後板短磚', 280, 147, z, 11, 80, 32, red);
    }],
    ['深灰駕駛座與方向盤', g => {
      rounded(g, '駕駛座坐墊', [249, 154, 17], [31, 14, 38], dark, 3);
      rounded(g, '駕駛座靠背', [265, 176, 17], [12, 35, 38], dark, 3);
      cylinder(g, '方向盤', [208, 174, 17], 14, 5, dark, 'x');
      bar(g, '方向盤立柱', [211, 174, 17], [228, 149, 17], 4, gray);
    }],
  ]);
  pack('完成駕駛室車窗與頂燈', [
    ['寬前窗與兩側玻璃', g => cabGlass(g, 169, 291, red, 162, 219)],
    ['凸點屋頂與橘色警示燈', g => cabRoof(g, 169, 291, red, 230)],
    ['駕駛室前方雙工作燈', g => lamps(g, 164, 139)],
  ]);
  pack('搭起前方集雪筒外架', [
    ['弧形集雪筒背板與工具連接架', g => {
      for (let z = -76; z < 76; z += 32) brick(g, '集雪筒背部短厚磚', 57, 38, z, 14, 75, Math.min(32, 76 - z), red, true);
      for (const z of [-34, 20]) brick(g, '工具連接粗支架', 71, 74, z, 55, 14, 14, dark, true);
    }],
    ['遠側集雪筒圓端厚框', g => {
      cylinder(g, '遠側厚圓端框', [32, 64, -83], 43, 12, red);
      joint(g, '遠側集雪筒軸承', [32, 64, -91], 11, 7, gray);
    }],
    ['近側集雪筒圓端厚框', g => {
      // An open cross-braced end keeps the helical auger visibly exposed.
      const ring = mesh(g, '近側開口厚端環', new THREE.TorusGeometry(38, 5, 10, 36), red, [32, 64, 83]);
      for (const a of [0, Math.PI / 2]) { const dx = Math.cos(a) * 33, dy = Math.sin(a) * 33;
        bar(g, '近側端環支條', [32 - dx, 64 - dy, 83], [32 + dx, 64 + dy, 83], 3, red); }
      joint(g, '近側集雪筒軸承', [32, 64, 87], 10, 9, gray);
    }],
  ]);
  pack('放入真正螺旋集雪葉片', [
    ['可旋轉螺旋葉片與粗軸', g => {
      cylinder(g, '橫向集雪粗軸', [32, 64, 0], 8, 158, dark);
      // Two handed helical ribbons transport snow toward the central intake.
      // Each ribbon is a thick quad strip, not a decorative flat disc.
      for (const side of [-1, 1]) {
        const positions = [], indices = [], steps = 80;
        for (let i = 0; i <= steps; i++) {
          const u = i / steps, z = side * (10 + u * 64), angle = u * Math.PI * 4 * side;
          for (const [r, dz] of [[10, -2.5], [34, -2.5], [10, 2.5], [34, 2.5]])
            positions.push(32 + Math.cos(angle) * r, 64 + Math.sin(angle) * r, z + dz);
          if (i < steps) { const n = i * 4;
            for (const [a, b, c, d] of [[0, 1, 5, 4], [2, 6, 7, 3], [0, 4, 6, 2], [1, 3, 7, 5]])
              indices.push(n + a, n + b, n + c, n + a, n + c, n + d);
          }
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices); geometry.computeVertexNormals();
        mesh(g, '雙向厚螺旋集雪葉', geometry, yellow, [0, 0, 0]);
      }
    }],
    ['中央進雪旋轉齒盤', g => {
      cylinder(g, '中央進雪厚盤', [32, 64, 0], 27, 13, dark);
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3;
        rounded(g, '中央進雪齒', [32 + Math.cos(a) * 29, 64 + Math.sin(a) * 29, 0], [12, 12, 16], gray, 1); }
    }],
    ['集雪筒底部進雪踏條', g => {
      for (let z = -76; z < 76; z += 32) brick(g, '筒底短進雪踏條', -6, 19, z, 56, 9, Math.min(32, 76 - z), gray, true);
      for (const z of [-71, -39, -7, 25, 57]) brick(g, '短黃色齒', -14, 18, z, 15, 7, 20, yellow);
    }],
  ]);
  pack('接好上方彎曲拋雪管', [
    ['集雪筒上方直立拋雪管', g => {
      cylinder(g, '管座轉向厚環', [74, 117, 0], 27, 10, dark, 'y');
      for (let y = 122; y < 181; y += 20) cylinder(g, '直立分段拋雪管', [74, y + 10, 0], 21, 19, red, 'y');
      for (const y of [124, 161]) cylinder(g, '直管加強扣環', [74, y, 0], 23, 5, gray, 'y');
    }],
    ['朝前轉彎的厚彎管', g => {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(74, 175, 0), new THREE.Vector3(72, 193, 0), new THREE.Vector3(52, 205, 0), new THREE.Vector3(31, 205, 0)]);
      mesh(g, '四分之一轉彎拋雪管', new THREE.TubeGeometry(curve, 20, 21, 20, false), red, [0, 0, 0]);
      cylinder(g, '彎管中段扣環', [54, 203, 0], 23, 7, yellow, 'x');
    }],
    ['可轉向開口拋雪管嘴', g => {
      cylinder(g, '管嘴外圈', [17, 205, 0], 25, 28, red, 'x');
      // Deep dark aperture and visible rim communicate an open discharge pipe.
      cylinder(g, '深色管口內腔', [1.5, 205, 0], 19, 3, dark, 'x');
      const lip = mesh(g, '厚實開口管唇', new THREE.TorusGeometry(22, 3.5, 10, 32), yellow, [-.6, 205, 0]);
      lip.rotation.y = Math.PI / 2;
      brick(g, '管口上方導雪短罩', -12, 228, -19, 35, 7, 38, red, true);
      g.userData.mechanism = { axis: 'z', pivot: [31, 205, 0] };
    }],
  ]);
  pack('放好工作扶手與待清白雪', [
    ['車側爬梯與扶手', g => {
      for (const y of [86, 108, 130]) brick(g, '近側防滑階梯', 265, y, 65, 42, 7, 17, gray, true);
      rail(g, [287, 177, 82], [305, 177, 82], dark);
    }],
    ['後方排氣管與輪胎防滑紋', g => {
      cylinder(g, '粗黑排氣管', [396, 179, -36], 6, 47, dark, 'y');
      rounded(g, '排氣帽', [396, 204, -36], [20, 6, 16], dark, 2);
      for (const x of [154, 355]) for (const z of [-82, 82]) for (const dx of [-14, 0, 14])
        brick(g, '可見雪地胎鏈橫塊', x + dx - 4, 48, z < 0 ? z - 2 : z, 8, 7, 4, gray);
    }],
    ['三塊待拋出的白雪積木', g => looseBricks(g, [[-58, 1, 38], [-26, 1, 61], [-43, 16, 43]], white)],
  ]);
  return finish({ auger: [32, 64, 0], chute: [74, 117, 0], outlet: [1, 205, 0] });
}
