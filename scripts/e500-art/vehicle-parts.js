import * as THREE from 'three';
import { createBrickTools } from './brick-geometry.js';

// Authoring helpers shared by the working vehicles. They deliberately reuse
// the train brick primitive, material factory, and stable three-part packs.
export function vehicleParts(material, name, length = 480) {
  const model = new THREE.Group();
  model.name = name;
  model.userData = { length, width: 160, studPitch: 16, authoringVersion: 1 };
  const t = createBrickTools(material);
  const { brick, rounded, cylinder, beam, bar, mesh } = t;
  const black = '#252c32', gray = '#77838a', hub = '#b8c1c4';
  let count = 0;
  function pack(title, parts) {
    if (parts.length !== 3) throw Error('A vehicle pack needs exactly three groups');
    const number = ++count;
    for (const [i, [name, build]] of parts.entries()) {
      const g = new THREE.Group();
      g.name = name;
      g.userData = { id: `p${number}-${i + 1}`, name, packTitle: title, z: (number - 1) * 3 + i };
      model.add(g);
      build(g);
    }
  }
  function ground() {
    pack('準備三塊工作底板', [-24, 168, 360].map((x, i) => [
      ['前方工作底板', '中央工作底板', '後方工作底板'][i], g => {
        brick(g, '分段小底板', x, -12, -92, 160, 10, 184, '#b8c4b4', true);
        for (const at of [x + 8, x + 72, x + 136]) brick(g, '底板邊緣短標線', at, -1, 81, 16, 2, 5, '#eee4be');
      },
    ]));
  }
  function chassis(g, start, end, y = 62, color = black, width = 120) {
    for (let x = start; x < end; x += 32)
      brick(g, '短磚底盤', x, y, -width / 2, Math.min(32, end - x), 14, width, color, true);
  }
  function wheel(g, x, z, r = 26, y = r + 2) {
    cylinder(g, '厚塑膠胎', [x, y, z], r, 21, black);
    cylinder(g, '輪胎外圈', [x, y, z + Math.sign(z) * 11], r * .83, 3, '#374049');
    cylinder(g, '明亮輪圈', [x, y, z + Math.sign(z) * 13], r * .59, 4, hub);
    cylinder(g, '凸起輪心', [x, y, z + Math.sign(z) * 17], r * .23, 5, gray);
    for (let a = 0; a < 8; a++) {
      const angle = a * Math.PI / 4;
      cylinder(g, '輪圈圓扣', [x + Math.cos(angle) * r * .4, y + Math.sin(angle) * r * .4,
        z + Math.sign(z) * 16], 2.3, 2, black);
    }
  }
  function axle(g, x, r = 26) {
    cylinder(g, '粗輪軸', [x, r + 2, 0], 6, 132, black);
    for (const z of [-65, 65]) wheel(g, x, z, r);
  }
  function tread(g, z, start = 190, end = 422) {
    rounded(g, '履帶內層厚架', [(start + end) / 2, 35, z], [end - start - 8, 48, 30], black, 12);
    for (const x of [start + 24, start + 70, start + 116, start + 162, end - 24]) {
      cylinder(g, '履帶支承輪', [x, 35, z + Math.sign(z) * 17], 19, 5, gray);
      cylinder(g, '履帶輪心', [x, 35, z + Math.sign(z) * 20], 7, 4, hub);
    }
    for (let x = start + 16; x < end - 12; x += 17) for (const y of [8, 58])
      brick(g, '獨立履帶鞋', x, y, z - 19, 15, 8, 38, '#39434a', y === 58);
    for (const x of [start + 7, end - 7]) for (const y of [21, 39])
      rounded(g, '彎角履帶鞋', [x, y, z], [10, 15, 38], '#39434a', 2);
  }
  function blockBeam(g, name, a, b, width, color, depth = width) {
    const from = new THREE.Vector3(...a), delta = new THREE.Vector3(...b).sub(from);
    const n = Math.ceil(delta.length() / 32);
    const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
    for (let i = 0; i < n; i++) {
      const p = from.clone().addScaledVector(delta, (i + .5) / n);
      const item = rounded(g, name + '・短厚磚', p.toArray(), [width, delta.length() / n - .8, depth], color, 1.3);
      item.userData.brick = true;
      item.quaternion.copy(rotation);
      cylinder(g, name + '・側面圓扣', [p.x, p.y, p.z + depth / 2 + 1], Math.min(4.5, width / 5), 3, color);
    }
  }
  function joint(g, name, p, r = 13, depth = 40, color = gray) {
    cylinder(g, name, p, r, depth, color);
    for (const side of [-1, 1]) cylinder(g, name + '・軸心凸扣', [p[0], p[1], p[2] + side * (depth / 2 + 2)], r * .47, 5, hub);
  }
  function hydraulic(g, name, a, b, color = gray) {
    const p = new THREE.Vector3(...a), q = new THREE.Vector3(...b), mid = p.clone().lerp(q, .58);
    bar(g, name + '・油缸', p.toArray(), mid.toArray(), 6, color);
    bar(g, name + '・活塞桿', mid.toArray(), q.toArray(), 3.5, hub);
    joint(g, name + '・接頭', a, 7, 15, color);
  }
  function cabBase(g, start, end, color, y = 78) {
    for (let x = start; x < end; x += 32) {
      brick(g, '駕駛室下半短磚', x, y, -58, Math.min(32, end - x), 43, 116, color, true);
      for (const side of [-1, 1]) brick(g, '車門下緣短磚', x, y + 43, side < 0 ? -60 : 50,
        Math.min(32, end - x), 12, 10, color, true);
    }
    for (const side of [-1, 1]) brick(g, '駕駛室登車踏板', start + 22, y - 9,
      side < 0 ? -75 : 60, 48, 8, 15, black, true);
  }
  function cabGlass(g, start, end, color, bottom = 133, top = 192) {
    for (const x of [start, end - 10]) for (const z of [-58, 48])
      brick(g, '駕駛艙粗窗柱', x, bottom - 10, z, 10, top - bottom + 18, 10, color, true);
    rounded(g, '寬前擋風玻璃', [start - 1, (bottom + top) / 2, 0], [4, top - bottom, 94], '#3c6574', 1, 'glass');
    for (const side of [-1, 1]) {
      rounded(g, '兩側獨立車窗', [(start + end) / 2, (bottom + top) / 2, side * 59],
        [end - start - 24, top - bottom, 3], '#3c6574', 1, 'glass');
      brick(g, '車門把手', end - 28, bottom - 6, side < 0 ? -65 : 61, 16, 4, 4, black);
    }
    for (const z of [-35, 15]) brick(g, '短雨刷', start - 4, bottom + 3, z, 3, 4, 25, black);
  }
  function cabRoof(g, start, end, color, top = 199) {
    for (let x = start - 6; x < end + 6; x += 32)
      brick(g, '車頂短厚磚', x, top, -65, Math.min(32, end + 6 - x), 12, 130, color, true);
    cylinder(g, '警示燈座', [end - 18, top + 16, 0], 10, 5, black, 'y');
    cylinder(g, '橘色警示燈', [end - 18, top + 23, 0], 7, 12, '#ffae32', 'y');
  }
  function lamps(g, x, y = 105) {
    for (const z of [-42, 42]) {
      rounded(g, '頭燈深色框', [x, y, z], [7, 19, 25], black, 2);
      rounded(g, '奶白頭燈', [x - 4, y + 1, z], [3, 11, 17], '#fff1bc', 1);
    }
    brick(g, '防撞厚橫梁', x - 12, y - 29, -67, 16, 12, 134, gray, true);
  }
  function arch(g, xs, color) {
    for (const x of xs) for (const side of [-1, 1]) {
      brick(g, '輪拱上緣短磚', x - 30, 59, side < 0 ? -81 : 62, 60, 9, 19, color, true);
      for (const dx of [-30, 23]) brick(g, '輪拱側端', x + dx, 43, side < 0 ? -81 : 62, 8, 22, 19, color);
    }
  }
  function rail(g, a, b, color = hub) {
    bar(g, '粗塑膠扶手', a, b, 3, color);
    for (const p of [a, b]) bar(g, '扶手直柱', p, [p[0], p[1] - 24, p[2]], 3, color);
  }
  function looseBricks(g, positions, color = '#be7b41') {
    positions.forEach(([x, y, z], i) => brick(g, '可搬運凸點積木', x, y, z, 24 + i % 2 * 8, 14, 24, color, true));
  }
  function finish(anchors = {}) {
    if (count !== 10) throw Error(`${name} must have ten source packs`);
    model.userData.mechanismAnchors = anchors;
    return model;
  }
  return { model, pack, ground, chassis, wheel, axle, tread, blockBeam, joint, hydraulic,
    cabBase, cabGlass, cabRoof, lamps, arch, rail, looseBricks, finish, ...t, THREE };
}
