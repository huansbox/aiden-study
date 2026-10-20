import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const CRANE_SUPPORT_TRAVEL = 48;

// Authoring only. Keep the installed pose untouched, then extend the horizontal
// beams while translating each rigid cylinder and its matching ground pad.
// The caller restores everything immediately after rendering the PNG.
export function applyCraneSupportPose(model, value) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw Error('Invalid crane support pose');
  if (value === 0) return () => {};
  const travel = value * CRANE_SUPPORT_TRAVEL, positions = [], geometries = [];
  function translate(object, dz) {
    positions.push([object, object.position.clone()]);
    object.position.z += dz;
  }
  for (const index of [9, 10]) for (const part of model.children[index].children) {
    if (part.name.endsWith('支撐伸出短梁')) {
      const body = part.children.find(child => child.isMesh && child.name.endsWith('・磚體'));
      const original = body.geometry;
      original.computeBoundingBox();
      const size = original.boundingBox.getSize(new THREE.Vector3());
      const extended = new RoundedBoxGeometry(size.x, size.y, size.z + travel, 3, .9);
      geometries.push([body, original, extended]);
      body.geometry = extended;
      translate(body, Math.sign(body.position.z) * travel / 2);
    } else if (part.name.endsWith('垂直支撐缸')) {
      translate(part, Math.sign(part.position.z) * travel);
    } else if (part.name.endsWith('支撐警示條')) {
      const body = part.children.find(child => child.isMesh);
      translate(part, Math.sign(body.position.z) * travel);
    }
  }
  for (const pad of model.children[11].children) {
    const body = pad.children.find(child => child.isMesh && child.name.endsWith('・磚體'));
    translate(pad, Math.sign(body.position.z) * travel);
  }
  model.updateMatrixWorld(true);
  return () => {
    for (const [object, position] of positions) object.position.copy(position);
    for (const [body, original, extended] of geometries) { body.geometry = original; extended.dispose(); }
    model.updateMatrixWorld(true);
  };
}
