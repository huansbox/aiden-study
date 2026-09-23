import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Style specimen only: a cab, a short body section and one three-axle bogie.
// Native Three.js coordinates: nose at X=0 facing -X; Y up; Z centred at zero.
// Nominal brick grid = 16; body = 192 × 128; wheel bottoms = Y0.
// No resources, renderer, camera, lighting, or existing production model imports.
export function createPrototype(material) {
  const model = new THREE.Group();
  model.name = 'E500・積木語言小樣';
  model.userData.studPitch = 16;
  model.userData.specimen = true;

  const orange = '#f46a16';
  const orangeLight = '#fa731b';
  const charcoal = '#30363d';
  const dark = '#20272c';
  const gray = '#59636c';
  const lightGray = '#88939b';
  const seam = 0.9;
  const pitch = 16;

  function assembly(name, explode) {
    const group = new THREE.Group();
    group.name = name;
    group.userData.explode = explode;
    model.add(group);
    return group;
  }

  const wheels = assembly('輪組', [0, -45, 0]);
  const chassis = assembly('底盤', [0, -14, 0]);
  const body = assembly('橘色車身', [0, 16, 0]);
  const frame = assembly('窗框', [-30, 28, 0]);
  const glazing = assembly('玻璃', [-61, 24, 0]);
  const roof = assembly('屋頂', [0, 75, 0]);
  const lamps = assembly('燈具', [-54, 0, 0]);
  const fittings = assembly('扶手車鉤', [-28, -12, -28]);

  function mesh(group, name, geometry, color, position, kind = 'plastic') {
    const item = new THREE.Mesh(geometry, material(color, kind));
    item.name = name;
    item.position.set(...position);
    item.castShadow = true;
    item.receiveShadow = true;
    group.add(item);
    return item;
  }

  const studProfile = [
    [0, 0], [4.35, 0], [4.8, 0.45], [4.8, 3.8], [4.35, 4.35], [0, 4.35],
  ].map(([radius, y]) => new THREE.Vector2(radius, y));
  const studGeometry = new THREE.LatheGeometry(studProfile, 32);

  function stud(group, x, y, z, color, name = '圓柱凸點') {
    return mesh(group, name, studGeometry, color, [x, y, z]);
  }

  // Each real brick has a separate rounded body and separate studs. The seams
  // come from physical gaps, rather than lines printed on a large body shell.
  function brick(group, name, x, y, z, length, height, width, color, studs = false) {
    const piece = new THREE.Group();
    piece.name = name;
    piece.userData.brick = true;
    group.add(piece);
    mesh(piece, `${name}・磚體`, new RoundedBoxGeometry(
      length - seam, height - seam, width - seam, 3,
      Math.min(0.9, height / 5, width / 5, length / 5),
    ), color, [x + length / 2, y + height / 2, z + width / 2]);
    if (studs) {
      for (let sx = x + 8; sx < x + length; sx += pitch) {
        for (let sz = z + 8; sz < z + width; sz += pitch) {
          stud(piece, sx, y + height - seam / 2, sz, color);
        }
      }
    }
    return piece;
  }

  function cylinder(group, name, centre, radius, depth, color, axis = 'z') {
    const item = mesh(group, name,
      new THREE.CylinderGeometry(radius, radius, depth, 32, 1), color, centre);
    if (axis === 'z') item.rotation.x = Math.PI / 2;
    if (axis === 'x') item.rotation.z = Math.PI / 2;
    return item;
  }

  // A bevelled, solid slope brick, extruded across its actual stud-width.
  function slope(group, name, points, z, width, color) {
    const centre = points.reduce((sum, p) => [sum[0] + p[0] / points.length, sum[1] + p[1] / points.length], [0, 0]);
    const outline = new THREE.Shape();
    points.forEach(([x, y], i) => {
      const p = [centre[0] + (x - centre[0]) * .974, centre[1] + (y - centre[1]) * .974];
      if (i === 0) outline.moveTo(...p); else outline.lineTo(...p);
    });
    outline.closePath();
    const geometry = new THREE.ExtrudeGeometry(outline, {
      depth: width - 1.9, bevelEnabled: true, bevelSize: .45,
      bevelThickness: .45, bevelSegments: 2, steps: 1,
    });
    const item = mesh(group, name, geometry, color, [0, 0, z + .95]);
    item.userData.brick = true;
    return item;
  }

  function bar(group, name, a, b, radius, color) {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const direction = end.clone().sub(start);
    const item = mesh(group, name,
      new THREE.CylinderGeometry(radius, radius, direction.length(), 16),
      color, start.clone().add(end).multiplyScalar(.5).toArray());
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return item;
  }

  // Three complete, thick toy wheelsets: six tyres, six projecting hubs and
  // chunky axle beams. Nothing is a flat circle stuck on a mechanical drawing.
  for (const [index, x] of [72, 116, 160].entries()) {
    cylinder(wheels, `第${index + 1}根粗輪軸`, [x, 20, 0], 5.3, 104, dark);
    brick(wheels, `第${index + 1}輪軸承重橫磚`, x - 8, 28, -48, 16, 12, 96, charcoal);
    for (const side of [-1, 1]) {
      const z = side * 46;
      const tyreProfile = [
        [0, -6], [17.6, -6], [19.3, -4.8], [20, -3.4],
        [20, 3.4], [19.3, 4.8], [17.6, 6], [0, 6],
      ].map(([radius, axis]) => new THREE.Vector2(radius, axis));
      const tyre = mesh(wheels, `輪胎${index + 1}・${side}`, new THREE.LatheGeometry(tyreProfile, 40), '#1b2026', [x, 20, z]);
      tyre.rotation.x = Math.PI / 2;
      cylinder(wheels, '厚輪圈', [x, 20, side * 53], 15.2, 3.2, gray);
      cylinder(wheels, '輪圈凹槽', [x, 20, side * 55], 11.8, 1.5, dark);
      for (let spoke = 0; spoke < 6; spoke++) {
        const angle = spoke * Math.PI / 3;
        const item = mesh(wheels, '粗積木輪輻',
          new RoundedBoxGeometry(3.7, 8.6, 2, 2, .65), lightGray,
          [x + Math.cos(angle) * 8.7, 20 + Math.sin(angle) * 8.7, side * 56]);
        item.rotation.z = angle - Math.PI / 2;
      }
      cylinder(wheels, '凸起圓輪心', [x, 20, side * 57.3], 6.4, 4.2, charcoal);
      cylinder(wheels, '輪心圓蓋', [x, 20, side * 59.6], 3.7, 1.1, lightGray);
      brick(wheels, '外側軸箱積木', x - 7.5, 25, side < 0 ? -64 : 50, 15, 13, 14, charcoal);
      cylinder(wheels, '軸箱圓蓋', [x, 31.5, side * 65], 4.3, 2.3, gray);
    }
  }

  // The suspension is a row of small plates and brackets with visible joins.
  // Short blocks, not tiny brake pipes, carry the visual detail.
  for (const side of [-1, 1]) {
    const z = side < 0 ? -64 : 48;
    for (let x = 48; x < 192; x += 32) {
      brick(wheels, '分段懸吊框磚', x, 39, z, Math.min(32, 192 - x), 12, 16, charcoal, true);
    }
    for (const x of [91, 135]) {
      brick(wheels, '懸吊扣座上塊', x - 5, 26, z, 10, 8, 16, gray);
      brick(wheels, '懸吊扣座下塊', x - 5, 20, z + 2, 10, 6, 12, charcoal);
    }
  }
  for (const x of [48, 96, 144]) brick(wheels, '轉向架跨梁', x, 42, -40, 32, 9, 80, dark, true);

  // Three sturdy base modules remain distinct when the model is exploded.
  for (const x of [0, 64, 128]) {
    brick(chassis, '4×8底盤厚板', x, 53, -64, 64, 11, 128, charcoal, true);
    brick(chassis, '外側踏板邊磚', x, 54, -68, 32, 8, 8, dark);
    brick(chassis, '另一側踏板邊磚', x, 54, 60, 32, 8, 8, dark);
  }

  // Front face: four short brick courses, each genuinely modelled and staggered.
  for (let row = 0; row < 4; row++) {
    const y = 64 + row * 12;
    const widths = row % 2 ? [16, 32, 32, 32, 16] : [32, 32, 32, 32];
    let z = -64;
    for (const [index, width] of widths.entries()) {
      brick(body, '橘色前臉小磚', 0, y, z, 16, 12, width,
        (row + index) % 3 === 0 ? orangeLight : orange, row === 3);
      z += width;
    }
  }

  // Both side walls use individual 1×2 / 1×3 bricks. Door and window openings
  // are left in the geometry, rather than drawn on an unbroken orange box.
  for (const side of [-1, 1]) {
    const z = side < 0 ? -64 : 48;
    for (let row = 0; row < 4; row++) {
      const y = 64 + row * 12;
      for (const x of [16, 48]) brick(body, '駕駛室下方小磚', x, y, z, 32, 12, 16, row % 2 ? orangeLight : orange);
    }
    slope(body, '駕駛室橘色三角斜磚', [[16, 112], [48, 112], [48, 170], [29, 170]], z, 16, orange);
    for (const y of [112, 128, 144, 160]) {
      brick(body, '車門外柱', 80, y, z, 16, 16, 16, orangeLight);
    }
    for (const y of [64, 80, 96]) brick(body, '車門下方磚', 80, y, z, 16, 16, 16, orange);
    brick(body, '側窗底部橘磚', 48, 112, z, 32, 12, 16, orangeLight);
    brick(body, '側窗頂部橘磚', 48, 164, z, 32, 12, 16, orange);
    for (let row = 0; row < 4; row++) {
      const widths = row % 2 ? [16, 32, 32, 16] : [32, 32, 32];
      let x = 96;
      for (const [index, length] of widths.entries()) {
        brick(body, '後接車身短磚', x, 64 + row * 28, z, length, 28, 16,
          index % 2 ? orangeLight : orange, row === 3);
        x += length;
      }
    }
  }
  for (const z of [-48, -16, 16]) brick(body, '車身尾端封口磚', 176, 64, z, 16, 28, 32, orange);
  for (const x of [96, 128, 160]) brick(body, '內部上梁', x, 164, -48, 32, 12, 96, orange, true);

  // Two separate slope bricks form each thick windshield pillar. The broad
  // central glass has no central pillar; the surrounding bricks are the frame.
  for (const z of [-64, 48]) {
    slope(frame, '下半擋風窗框斜磚', [[0, 112], [32, 112], [32, 143], [14.5, 143]], z, 16, charcoal);
    slope(frame, '上半擋風窗框斜磚', [[14.5, 143], [48, 143], [48, 174], [29, 174]], z, 16, charcoal);
  }
  for (const z of [-48, -16, 16]) brick(frame, '擋風窗下緣短磚', 0, 112, z, 13, 12, 32, dark, true);
  for (const z of [-64, -32, 0, 32]) brick(frame, '擋風窗上緣短磚', 29, 170, z, 16, 12, 32, charcoal);

  const glassShape = new THREE.Shape();
  glassShape.moveTo(5.6, 124);
  glassShape.lineTo(27.0, 168.8);
  glassShape.lineTo(30.0, 168.8);
  glassShape.lineTo(8.6, 124);
  glassShape.closePath();
  mesh(glazing, '整片厚透明前擋', new THREE.ExtrudeGeometry(glassShape, {
    depth: 94, bevelEnabled: true, bevelSize: .45, bevelThickness: .45, bevelSegments: 2,
  }), '#344954', [0, 0, -47], 'glass');
  brick(glazing, '車內儀表臺凸點板', 14, 116, -40, 16, 8, 80, dark, true);
  for (const z of [-27, 11]) {
    brick(glazing, '座椅座磚', 42, 121, z, 16, 8, 16, charcoal);
    brick(glazing, '座椅靠背磚', 54, 128, z, 8, 21, 16, charcoal);
  }

  // Side windows are thick framed inserts, with a real recessed pane.
  for (const side of [-1, 1]) {
    const z = side * 65;
    mesh(frame, '側窗左框', new RoundedBoxGeometry(5, 40, 5, 2, .7), charcoal, [48.5, 144, z]);
    mesh(frame, '側窗右框', new RoundedBoxGeometry(5, 40, 5, 2, .7), charcoal, [77.5, 144, z]);
    mesh(frame, '側窗上框', new RoundedBoxGeometry(32, 5, 5, 2, .7), charcoal, [63, 162, z]);
    mesh(frame, '側窗下框', new RoundedBoxGeometry(32, 5, 5, 2, .7), charcoal, [63, 126, z]);
    mesh(glazing, '側面透明窗片', new RoundedBoxGeometry(25, 31, 2.5, 2, .65), '#344954', [63, 144, side * 64.1], 'glass');
    mesh(glazing, '車門小窗', new RoundedBoxGeometry(8, 19, 2.8, 2, .65), '#344954', [88, 150, side * 64.2], 'glass');
  }

  // Exposed studs are part of ordinary roof plates, not random dots added on a
  // smooth shell. Separate side slopes make the roof visibly brick-built.
  for (const x of [40, 72, 104, 136, 168]) {
    const length = Math.min(32, 192 - x);
    for (const z of [-32, 0]) brick(roof, '車頂雙列凸點板', x, 176, z, length, 8, 32, x < 104 ? charcoal : gray, true);
    for (const side of [-1, 1]) {
      // Build the cross-roof slope in local XY, then turn its depth along X.
      const shape = new THREE.Shape();
      // A thick outer heel and a real underside channel receive the orange
      // wall studs. The previous zero-thickness slope tip intersected their
      // outer halves; retain the full studs for the exploded assembly view.
      shape.moveTo(0, 0);
      shape.lineTo(2.5, 0); shape.lineTo(2.5, 4.7);
      shape.lineTo(13.5, 4.7); shape.lineTo(13.5, 0);
      shape.lineTo(32, 0); shape.lineTo(32, 8);
      shape.lineTo(16, 8); shape.lineTo(0, 4.8);
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: length - 1.5, bevelEnabled: true, bevelSize: .5, bevelThickness: .5, bevelSegments: 2 });
      const item = mesh(roof, '獨立車頂肩部斜磚', geometry, x < 104 ? charcoal : gray, [x + .75, 176, side < 0 ? -64 : 64]);
      item.rotation.y = side < 0 ? -Math.PI / 2 : Math.PI / 2;
      if (side < 0) item.position.x = x + length - .75;
      item.userData.brick = true;
    }
  }
  // A small, evidently assembled grille module provides a recognizable E500
  // roof detail without becoming a fine mechanical miniature.
  brick(roof, '車頂格柵底磚', 126, 184, -24, 48, 5, 48, dark);
  for (const x of [132, 142, 152, 162]) brick(roof, '厚格柵條磚', x, 189, -20, 5, 3.5, 40, charcoal);

  // Round lamp housings have several millimetres of depth and toy-sized rims.
  brick(lamps, '車頂雙燈底座磚', 24, 174, -16, 16, 16, 32, charcoal, true);
  for (const z of [-8, 8]) {
    cylinder(lamps, '上方黑色圓燈座', [23.2, 182, z], 7, 3.5, dark, 'x');
    cylinder(lamps, '上方灰色圓燈圈', [20.8, 182, z], 5.6, 2, lightGray, 'x');
    cylinder(lamps, '上方乳白燈片', [19.4, 182, z], 4.35, 1.8, '#fff3ca', 'x');
  }
  for (const side of [-1, 1]) {
    brick(lamps, '前臉雙燈連接磚', -3, 87, side < 0 ? -56 : 24, 5, 16, 32, dark);
    for (const [offset, color] of [[0, '#fff4d5'], [13, '#c72f27']]) {
      const z = side * (48 - offset);
      cylinder(lamps, '下方黑色圓燈座', [-4, 95, z], 7, 4, dark, 'x');
      cylinder(lamps, '下方灰色圓燈圈', [-6.5, 95, z], 5.4, 1.6, lightGray, 'x');
      cylinder(lamps, '下方圓燈片', [-7.65, 95, z], 4, 1.25, color, 'x');
    }
  }

  // Chunky studs, grab bars, step plates and one short coupler finish the toy.
  // Deliberately omit the reference's many small brake hoses and metal tubes.
  for (const side of [-1, 1]) {
    const z = side * 69;
    bar(fittings, '粗橘色車門扶手', [94, 82, z], [94, 143, z], 2.5, orangeLight);
    for (const y of [84, 139]) cylinder(fittings, '扶手圓扣', [94, y, side * 67], 3.8, 6, orange);
    for (const y of [56, 64, 72]) brick(fittings, '車門踏階厚板', 80, y, side < 0 ? -74 : 62, 16, 5, 12, charcoal);
    brick(fittings, '橘色前端角磚', -3, 51, side < 0 ? -64 : 48, 16, 13, 16, orangeLight);
  }
  brick(fittings, '前端厚防撞梁', -8, 49, -48, 16, 10, 96, dark);
  brick(fittings, '玩具車鉤連接塊', -17, 37, -12, 24, 14, 24, charcoal, true);
  brick(fittings, '玩具車鉤上顎', -26, 40, -12, 12, 11, 24, dark);
  brick(fittings, '玩具車鉤左顎', -29, 36, -12, 9, 9, 8, charcoal);
  brick(fittings, '玩具車鉤右顎', -29, 36, 4, 9, 9, 8, charcoal);
  slope(fittings, '厚灰色排障斜板', [[-16, 15], [-8, 15], [3, 32], [-5, 32]], -48, 96, gray);

  model.userData.nominalSize = { length: 221, height: 195, width: 148 };
  return model;
}
