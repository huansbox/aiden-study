import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createExcavatorModel } from '../scripts/e500-art/model-excavator.js';
import { createSnowBlowerModel } from '../scripts/e500-art/model-snow-blower.js';
import { createMobileCraneModel } from '../scripts/e500-art/model-mobile-crane.js';
import { createCementMixerModel } from '../scripts/e500-art/model-cement-mixer.js';
import { createRecyclingTruckModel } from '../scripts/e500-art/model-recycling-truck.js';
import { vehicleArtModels, vehiclePoseDefinitions } from '../scripts/e500-art/vehicle-catalog.js';

const factories = { excavator: createExcavatorModel, 'snow-blower': createSnowBlowerModel,
  'mobile-crane': createMobileCraneModel, 'cement-mixer': createCementMixerModel,
  'recycling-truck': createRecyclingTruckModel };
const materialCache = new Map();
function material(color) {
  if (!materialCache.has(color)) materialCache.set(color, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
  return materialCache.get(color);
}

// Small orthographic software depth rasterizer. This checks visible surface
// area after earlier packs AND both same-pack peers have been installed. That
// is the strongest occlusion case across all six within-pack placement orders.
// Rasterization uses real triangle geometry, including holes, helices and studs.
function renderDepth(group, camera, width = 200, height = 125) {
  const depth = new Float64Array(width * height).fill(Infinity);
  const p = new THREE.Vector3(), transform = new THREE.Matrix4();
  group.traverse(o => {
    if (!o.isMesh) return;
    transform.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(o.matrixWorld);
    const attr = o.geometry.getAttribute('position'), indices = o.geometry.index;
    const projected = new Float64Array(attr.count * 3);
    for (let i = 0; i < attr.count; i++) {
      p.fromBufferAttribute(attr, i).applyMatrix4(transform);
      projected[i * 3] = (p.x + 1) * width / 2;
      projected[i * 3 + 1] = (1 - p.y) * height / 2;
      projected[i * 3 + 2] = p.z;
    }
    const count = indices ? indices.count : attr.count;
    for (let i = 0; i < count; i += 3) {
      const a = (indices ? indices.getX(i) : i) * 3,
        b = (indices ? indices.getX(i + 1) : i + 1) * 3,
        c = (indices ? indices.getX(i + 2) : i + 2) * 3;
      const ax = projected[a], ay = projected[a + 1], bx = projected[b], by = projected[b + 1],
        cx = projected[c], cy = projected[c + 1];
      const denominator = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (Math.abs(denominator) < 1e-9) continue;
      const left = Math.max(0, Math.floor(Math.min(ax, bx, cx))), right = Math.min(width - 1, Math.ceil(Math.max(ax, bx, cx))),
        top = Math.max(0, Math.floor(Math.min(ay, by, cy))), bottom = Math.min(height - 1, Math.ceil(Math.max(ay, by, cy)));
      for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
        const u = ((by - cy) * (x + .5 - cx) + (cx - bx) * (y + .5 - cy)) / denominator;
        const v = ((cy - ay) * (x + .5 - cx) + (ax - cx) * (y + .5 - cy)) / denominator;
        if (u < 0 || v < 0 || u + v > 1) continue;
        const z = u * projected[a + 2] + v * projected[b + 2] + (1 - u - v) * projected[c + 2];
        const pixel = y * width + x;
        if (z < depth[pixel]) depth[pixel] = z;
      }
    }
  });
  return depth;
}

for (const [id, create] of Object.entries(factories)) {
  const model = create(material);
  model.updateMatrixWorld(true);
  const centre = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
  centre.add(new THREE.Vector3(...(vehicleArtModels[id].targetOffset || [0, 0, 0])));
  const camera = new THREE.OrthographicCamera(-400, 400, 250, -250, .1, 4000);
  camera.position.copy(centre).add(new THREE.Vector3(...(vehicleArtModels[id].cameraOffset || [-720, 430, 950])));
  camera.lookAt(centre); camera.updateMatrixWorld(true);

  test(`${id}: ten ordered three-part source packs and only first-pack fixed scenery`, () => {
    assert.equal(model.children.length, 30);
    assert.equal(new Set(model.children.map(g => g.userData.name)).size, 30);
    for (let i = 0; i < 30; i++) {
      const g = model.children[i];
      assert.equal(g.userData.id, `p${Math.floor(i / 3) + 1}-${i % 3 + 1}`);
      assert.equal(g.userData.z, i);
      assert.ok(g.userData.packTitle && g.userData.name);
      assert.ok(g.children.length > 0, `${g.userData.id} has authored geometry`);
      if (i % 3) assert.equal(g.userData.packTitle, model.children[i - 1].userData.packTitle);
      if (i < 3) assert.match(g.userData.name, /底板/);
    }
  });

  test(`${id}: every actual vertex is finite and inside the fixed 800 × 500 export frame`, () => {
    const p = new THREE.Vector3();
    model.traverse(o => {
      if (!o.isMesh) return;
      const attr = o.geometry.getAttribute('position');
      for (let i = 0; i < attr.count; i++) {
        p.fromBufferAttribute(attr, i).applyMatrix4(o.matrixWorld).project(camera);
        assert.ok([p.x, p.y, p.z].every(Number.isFinite), o.name);
        assert.ok(p.x >= -.98 && p.x <= .98 && p.y >= -.98 && p.y <= .98,
          `${o.name} projects outside export frame: ${p.toArray()}`);
      }
    });
    for (const anchor of Object.values(model.userData.mechanismAnchors))
      assert.ok(anchor.length === 3 && anchor.every(Number.isFinite));
  });

  test(`${id}: every group visibly advances after earlier packs and both same-pack peers`, () => {
    const depths = model.children.map(g => renderDepth(g, camera));
    const earlier = new Float64Array(depths[0].length).fill(Infinity);
    const failures = [];
    for (let pack = 0; pack < 10; pack++) {
      for (let part = 0; part < 3; part++) {
        const index = pack * 3 + part, target = depths[index];
        let visible = 0;
        for (let pixel = 0; pixel < target.length; pixel++) {
          if (!Number.isFinite(target[pixel]) || target[pixel] > earlier[pixel] + 1e-8) continue;
          if ([0, 1, 2].every(peer => peer === part || target[pixel] <= depths[pack * 3 + peer][pixel] + 1e-8)) visible++;
        }
        if (visible < 3) failures.push(`${model.children[index].userData.id} ${model.children[index].name}: ${visible} visible samples (~${visible * 16} pixels at export size)`);
      }
      for (let peer = 0; peer < 3; peer++) for (let pixel = 0; pixel < earlier.length; pixel++)
        earlier[pixel] = Math.min(earlier[pixel], depths[pack * 3 + peer][pixel]);
    }
    assert.deepEqual(failures, []);
  });
}

test('cement-mixer: eight real X-axis drum poses stay on the same support rings and inside the export frame', () => {
  const model = createCementMixerModel(material);
  model.updateMatrixWorld(true);
  const pivot = new THREE.Vector3(...model.userData.mechanismAnchors.drum);
  const centre = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
  const camera = new THREE.OrthographicCamera(-400, 400, 250, -250, .1, 4000);
  camera.position.copy(centre).add(new THREE.Vector3(-720, 430, 950));
  camera.lookAt(centre); camera.updateMatrixWorld(true);
  const rollers = [];
  model.children[14].traverse(o => { if (o.isMesh && o.name === '攪拌筒小滾輪') rollers.push(o); });
  assert.equal(rollers.length, 4);
  // Actual roller surfaces are tangent to the two 59-unit support rings,
  // allowing the 3-unit seam used by the chunky toy construction.
  for (const roller of rollers) {
    const radial = Math.hypot(roller.position.y - pivot.y, roller.position.z - pivot.z);
    const gap = radial - roller.geometry.parameters.radiusTop - 59;
    assert.ok(gap >= -1 && gap <= 3, `roller/drum radial gap ${gap}`);
    assert.ok([270, 352].includes(roller.position.x));
  }
  const moving = model.children.slice(15, 21), p = new THREE.Vector3();
  for (let pose = 0; pose < 8; pose++) {
    const matrix = new THREE.Matrix4().makeTranslation(...pivot.toArray())
      .multiply(new THREE.Matrix4().makeRotationX(pose * Math.PI / 4))
      .multiply(new THREE.Matrix4().makeTranslation(...pivot.clone().negate().toArray()));
    for (const group of moving) group.traverse(o => {
      if (!o.isMesh) return;
      const attr = o.geometry.getAttribute('position');
      for (let i = 0; i < attr.count; i++) {
        p.fromBufferAttribute(attr, i).applyMatrix4(o.matrixWorld).applyMatrix4(matrix).project(camera);
        assert.ok(Math.abs(p.x) < .98 && Math.abs(p.y) < .98, `pose ${pose} cropped ${o.name}`);
      }
    });
  }
});

for (const [id, expectation] of Object.entries({
  excavator: { axis: 'y', angles: [0, 10, 20, 30, 40], fixed: [0, 1, 2, 3, 4, 5, 6, 7, 8, 26],
    hub: '可見旋轉厚盤' },
  'snow-blower': { axis: 'z', angles: [0, 45, 90, 135, 180, 225, 270, 315],
    fixed: [18, 19, 20, 23], hub: '橫向集雪粗軸' },
})) {
  test(`${id}: all catalog poses keep the actual axle and support geometry fixed inside the 800 × 500 frame`, t => {
    const definition = vehiclePoseDefinitions[id], model = factories[id](material);
    assert.equal(definition.axis, expectation.axis);
    assert.deepEqual(definition.angles, expectation.angles);
    for (const index of expectation.fixed) assert.ok(!definition.moving.includes(index), `fixed ${model.children[index].userData.id}`);
    model.updateMatrixWorld(true);
    const pivot = new THREE.Vector3(...model.userData.mechanismAnchors[definition.anchor]);
    let actualHub;
    model.traverse(o => { if (o.isMesh && o.name === expectation.hub) actualHub = o; });
    assert.ok(actualHub);
    const actualCentre = actualHub.getWorldPosition(new THREE.Vector3());
    assert.ok(actualCentre.distanceTo(pivot) < 1e-8, 'catalog pivot matches the authored axle centre');
    const centre = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
    centre.add(new THREE.Vector3(...(vehicleArtModels[id].targetOffset || [0, 0, 0])));
    const camera = new THREE.OrthographicCamera(-400, 400, 250, -250, .1, 4000);
    camera.position.copy(centre).add(new THREE.Vector3(...(vehicleArtModels[id].cameraOffset || [-720, 430, 950])));
    camera.lookAt(centre); camera.updateMatrixWorld(true);
    const staticMatrices = new Map();
    expectation.fixed.forEach(index => model.children[index].traverse(o => {
      if (o.isMesh) staticMatrices.set(o, o.matrixWorld.elements.slice());
    }));
    const axis = new THREE.Vector3(); axis[definition.axis] = 1;
    const fixedAxisEnd = pivot.clone().addScaledVector(axis, 50);
    const p = new THREE.Vector3();
    for (const angle of definition.angles) {
      const rotation = new THREE.Matrix4().makeRotationAxis(axis, angle * Math.PI / 180);
      const transform = new THREE.Matrix4().makeTranslation(...pivot.toArray()).multiply(rotation)
        .multiply(new THREE.Matrix4().makeTranslation(...pivot.clone().negate().toArray()));
      assert.ok(pivot.clone().applyMatrix4(transform).distanceTo(pivot) < 1e-8, `${angle}° pivot drifts`);
      assert.ok(fixedAxisEnd.clone().applyMatrix4(transform).distanceTo(fixedAxisEnd) < 1e-8, `${angle}° axle drifts`);
      for (const index of definition.moving) {
        const group = model.children[index];
        group.matrix.copy(transform); group.matrixAutoUpdate = false;
      }
      model.updateMatrixWorld(true);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      model.traverse(o => {
        if (!o.isMesh) return;
        const attr = o.geometry.getAttribute('position');
        for (let i = 0; i < attr.count; i++) {
          p.fromBufferAttribute(attr, i).applyMatrix4(o.matrixWorld).project(camera);
          minX = Math.min(minX, (p.x + 1) * 400); maxX = Math.max(maxX, (p.x + 1) * 400);
          minY = Math.min(minY, (1 - p.y) * 250); maxY = Math.max(maxY, (1 - p.y) * 250);
          assert.ok(Math.abs(p.x) < .98 && Math.abs(p.y) < .98, `${angle}° ${o.name} cropped: ${p.toArray()}`);
        }
      });
      for (const [object, matrix] of staticMatrices) assert.deepEqual(object.matrixWorld.elements, matrix, `${angle}° ${object.name} moved`);
      assert.ok(actualHub.getWorldPosition(new THREE.Vector3()).distanceTo(pivot) < 1e-8);
      t.diagnostic(`${angle}° bounds x=${minX.toFixed(1)}..${maxX.toFixed(1)}, y=${minY.toFixed(1)}..${maxY.toFixed(1)}`);
    }
  });
}
