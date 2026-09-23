import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// The approved cab specimen's grid and solid brick construction, shared by
// the full locomotive authoring model. This module has no renderer or assets.
export function createBrickTools(material) {
  const seam = .9;
  const studGeometry = new THREE.LatheGeometry([
    [0, 0], [4.35, 0], [4.8, .45], [4.8, 3.8], [4.35, 4.35], [0, 4.35],
  ].map(([r, y]) => new THREE.Vector2(r, y)), 32);

  function mesh(group, name, geometry, color, position, kind = 'plastic') {
    const item = new THREE.Mesh(geometry, material(color, kind));
    item.name = name;
    item.position.set(...position);
    item.castShadow = true;
    item.receiveShadow = true;
    group.add(item);
    return item;
  }
  function rounded(group, name, centre, size, color, radius = .9, kind = 'plastic') {
    return mesh(group, name, new RoundedBoxGeometry(...size, 3,
      Math.min(radius, ...size.map(n => n / 5))), color, centre, kind);
  }
  function stud(group, x, y, z, color) {
    return mesh(group, '圓柱凸點', studGeometry, color, [x, y, z]);
  }
  function brick(group, name, x, y, z, length, height, width, color, studs = false) {
    const piece = new THREE.Group();
    piece.name = name;
    piece.userData.brick = true;
    group.add(piece);
    rounded(piece, name + '・磚體', [x + length / 2, y + height / 2, z + width / 2],
      [length - seam, height - seam, width - seam], color);
    if (studs) for (let sx = x + 8; sx < x + length; sx += 16) {
      for (let sz = z + 8; sz < z + width; sz += 16) stud(piece, sx, y + height - seam / 2, sz, color);
    }
    return piece;
  }
  function cylinder(group, name, centre, radius, depth, color, axis = 'z') {
    const item = mesh(group, name, new THREE.CylinderGeometry(radius, radius, depth, 32), color, centre);
    if (axis === 'z') item.rotation.x = Math.PI / 2;
    if (axis === 'x') item.rotation.z = Math.PI / 2;
    return item;
  }
  function slope(group, name, points, z, width, color) {
    const centre = points.reduce((s, p) => [s[0] + p[0] / points.length, s[1] + p[1] / points.length], [0, 0]);
    const shape = new THREE.Shape();
    points.forEach(([x, y], i) => {
      const p = [centre[0] + (x - centre[0]) * .974, centre[1] + (y - centre[1]) * .974];
      if (i) shape.lineTo(...p); else shape.moveTo(...p);
    });
    shape.closePath();
    const item = mesh(group, name, new THREE.ExtrudeGeometry(shape, {
      depth: width - 1.9, bevelEnabled: true, bevelSize: .45,
      bevelThickness: .45, bevelSegments: 2, steps: 1,
    }), color, [0, 0, z + .95]);
    item.userData.brick = true;
    return item;
  }
  function bar(group, name, a, b, radius, color) {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
    const delta = to.clone().sub(from);
    const item = mesh(group, name, new THREE.CylinderGeometry(radius, radius, delta.length(), 16),
      color, from.clone().add(to).multiplyScalar(.5).toArray());
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return item;
  }
  function beam(group, name, a, b, width, color) {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
    const delta = to.clone().sub(from);
    const item = rounded(group, name, from.clone().add(to).multiplyScalar(.5).toArray(),
      [width, delta.length(), width], color);
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return item;
  }
  return { mesh, rounded, stud, brick, cylinder, slope, bar, beam };
}
