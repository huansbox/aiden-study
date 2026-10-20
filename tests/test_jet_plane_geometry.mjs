import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createJetPlaneModel } from '../scripts/e500-art/model-jet-plane.js';
import { vehicleArtModels } from '../scripts/e500-art/vehicle-catalog.js';

const model = createJetPlaneModel(color => new THREE.MeshBasicMaterial({color}));
model.updateMatrixWorld(true);
const parts = model.children;
const definition = vehicleArtModels['jet-plane'];
const target = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3()).add(new THREE.Vector3(...definition.targetOffset));
const camera = new THREE.OrthographicCamera(-400,400,250,-250,.1,4000);
camera.position.copy(target).add(new THREE.Vector3(...definition.cameraOffset));
camera.lookAt(target);
camera.updateMatrixWorld(true);

test('jet plane has one fixed runway pack and ten independently identified aircraft packs', () => {
  assert.equal(parts.length,33);
  assert.equal(model.userData.fixedPacks,1);
  assert.equal(new Set(parts.map(part=>part.name)).size,33);
  for (const [index,part] of parts.entries()) {
    assert.equal(part.userData.id,`p${Math.floor(index/3)+1}-${index%3+1}`);
    assert.equal(part.userData.z,index);
    assert.ok(part.userData.packTitle);
    assert.ok(part.children.length>0);
  }
  assert.ok(parts.slice(0,3).every(part=>part.name.includes('跑道')));
  assert.ok(parts.slice(3,6).every(part=>part.name.includes('起落架')));
});

test('every jet assembly fits the fixed 800 by 500 export camera with crop padding', () => {
  for (const part of parts) {
    let minX=800,minY=500,maxX=0,maxY=0;
    part.traverse(object=>{
      if(!object.isMesh)return;
      const positions=object.geometry.getAttribute('position');
      for(let i=0;i<positions.count;i++) {
        const point=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld).project(camera);
        const x=(point.x+1)*400,y=(1-point.y)*250;
        minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      }
    });
    assert.ok(minX>3&&minY>3&&maxX<797&&maxY<497,`${part.userData.id}: ${[minX,minY,maxX,maxY]}`);
    assert.ok((maxX-minX)*(maxY-minY)>300,`${part.userData.id} has meaningful projected size`);
  }
});

test('two jet nacelles have separate internal fan assemblies rather than propellers', () => {
  for (const [id,side] of [['p6-3',-1],['p7-3',1]]) {
    const part=parts.find(part=>part.userData.id===id);
    assert.deepEqual(part.userData.mechanism,{type:'fan',axis:'x',pivot:[202,77,side*137]});
    const rotor=part.children.find(child=>child.userData.movable);
    assert.ok(rotor);
    const blades=rotor.children.filter(child=>child.name==='獨立銀灰風扇葉片');
    assert.equal(blades.length,9);
    const nacelle=parts.find(part=>part.userData.id===id.replace('-3','-2'));
    assert.equal(nacelle.children.filter(child=>child.geometry?.type==='LatheGeometry').length,3);
    assert.ok(blades.every(blade=>blade.position.length()<25));
  }
  const names=[];model.traverse(object=>names.push(object.name));
  assert.ok(names.includes('圓柱凸點'));
  assert.ok(names.filter(name=>name==='主翼短斜面厚磚').length>=10);
  assert.ok(names.filter(name=>name==='交錯白色機身短磚').length>=40);
  assert.ok(!names.some(name=>name.includes('螺旋槳')));
});

test('both fans and both window packs remain visible after all earlier assemblies', () => {
  const direction=new THREE.Vector3(...definition.cameraOffset).normalize(),ray=new THREE.Raycaster();
  function visible(partId,points) {
    const index=parts.findIndex(part=>part.userData.id===partId),part=parts[index];
    let count=0;
    for(const position of points) {
      const point=new THREE.Vector3(...position);
      ray.set(point.clone().addScaledVector(direction,2000),direction.clone().negate());
      const hit=ray.intersectObjects(parts.slice(0,index+1),true)[0];
      let object=hit?.object;
      while(object&&object.parent!==model)object=object.parent;
      if(object===part)count++;
    }
    assert.ok(count>0,`${partId} must not be completely concealed by previous packs`);
  }
  for(const [partId,side] of [['p6-3',-1],['p7-3',1]])
    visible(partId,[0,1,2,3,4,5,6].map(angle=>[197,77+Math.cos(angle)*12,side*137+Math.sin(angle)*12]));
  visible('p10-2',[140,172,204,236,268].map(x=>[x,136,54]));
  visible('p10-3',[300,332,364,396,428].map(x=>[x,136,54]));
});
