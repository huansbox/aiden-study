import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createMobileCraneModel } from '../scripts/e500-art/model-mobile-crane.js';
import { applyCraneSupportPose, CRANE_SUPPORT_TRAVEL } from '../scripts/e500-art/crane-support-poses.js';
import { vehicleArtModels, vehiclePoseDefinitions } from '../scripts/e500-art/vehicle-catalog.js';

const create = () => createMobileCraneModel(color => new THREE.MeshBasicMaterial({color}));
const close = (actual, expected, label) => assert.ok(Math.abs(actual-expected)<.0001,`${label}: ${actual} versus ${expected}`);
const box = object => new THREE.Box3().setFromObject(object);
function snapshot(model) {
  const states=[];
  model.traverse(object=>states.push({object,geometry:object.geometry,position:object.position.toArray(),rotation:object.quaternion.toArray(),scale:object.scale.toArray(),matrix:object.matrixWorld.toArray()}));
  return states;
}
function unchanged(states) {
  for(const state of states){
    assert.equal(state.object.geometry,state.geometry,state.object.name+' geometry');
    assert.deepEqual(state.object.position.toArray(),state.position,state.object.name+' position');
    assert.deepEqual(state.object.quaternion.toArray(),state.rotation,state.object.name+' orientation');
    assert.deepEqual(state.object.scale.toArray(),state.scale,state.object.name+' scale');
    assert.deepEqual(state.object.matrixWorld.toArray(),state.matrix,state.object.name+' world matrix');
  }
}

test('crane supports pose zero uses exactly the installed geometry and transforms',()=>{
  const model=create();model.updateMatrixWorld(true);
  const original=snapshot(model),restore=applyCraneSupportPose(model,0);
  unchanged(original);restore();unchanged(original);
  assert.deepEqual(vehiclePoseDefinitions['mobile-crane'].required,['p4-1','p4-2','p4-3']);
  assert.deepEqual(vehiclePoseDefinitions['mobile-crane'].values,[0,.25,.5,.75,1]);
});

test('all support poses extend only beams while rigid cylinders and pads stay connected to the fixed ground',t=>{
  const model=create();model.updateMatrixWorld(true);
  const definition=vehicleArtModels['mobile-crane'];
  const target=box(model).getCenter(new THREE.Vector3()).add(new THREE.Vector3(...definition.targetOffset));
  const camera=new THREE.OrthographicCamera(-400,400,250,-250,.1,4000);
  camera.position.copy(target).add(new THREE.Vector3(-720,430,950));camera.lookAt(target);camera.updateMatrixWorld(true);
  const original=snapshot(model),stationary=original.filter(state=>{let owner=state.object;while(owner.parent&&owner.parent!==model)owner=owner.parent;return !model.children.slice(9,12).includes(owner);});
  const beams=[],cylinders=[],pads=[];
  for(const group of model.children.slice(9,11))for(const part of group.children){
    if(part.name.endsWith('支撐伸出短梁')){const body=part.children.find(child=>child.isMesh&&child.name.endsWith('・磚體'));beams.push({body,original:box(body)});}
    if(part.name.endsWith('垂直支撐缸'))cylinders.push({body:part,original:box(part),position:part.position.clone()});
  }
  for(const group of model.children[11].children){const body=group.children.find(child=>child.isMesh&&child.name.endsWith('・磚體'));pads.push({group,body,original:box(group),originalBody:box(body)});}
  assert.equal(beams.length,4);assert.equal(cylinders.length,4);assert.equal(pads.length,4);
  for(const value of vehiclePoseDefinitions['mobile-crane'].values){
    const restore=applyCraneSupportPose(model,value),travel=value*CRANE_SUPPORT_TRAVEL;
    unchanged(stationary);
    for(const {body,original:before} of beams){
      const after=box(body),size=after.getSize(new THREE.Vector3()),oldSize=before.getSize(new THREE.Vector3()),side=Math.sign(before.getCenter(new THREE.Vector3()).z);
      close(size.x,oldSize.x,'beam width');close(size.y,oldSize.y,'beam thickness');close(size.z,oldSize.z+travel,'beam length');
      close(side>0?after.min.z:after.max.z,side>0?before.min.z:before.max.z,'beam inner attachment stays fixed');
    }
    for(const cylinder of cylinders){
      const side=Math.sign(cylinder.position.z),after=box(cylinder.body),size=after.getSize(new THREE.Vector3()),before=cylinder.original.getSize(new THREE.Vector3());
      for(const axis of ['x','y','z'])close(size[axis],before[axis],'rigid cylinder '+axis);
      close(cylinder.body.position.x,cylinder.position.x,'cylinder x');close(cylinder.body.position.y,cylinder.position.y,'cylinder height');close(cylinder.body.position.z,cylinder.position.z+side*travel,'cylinder travel');
      const pad=pads.find(item=>{const center=item.originalBody.getCenter(new THREE.Vector3());return Math.abs(center.x-cylinder.position.x)<1&&Math.sign(center.z)===side;});
      const padBox=box(pad.group),padCenter=box(pad.body).getCenter(new THREE.Vector3()),padSize=padBox.getSize(new THREE.Vector3()),oldPadSize=pad.original.getSize(new THREE.Vector3());
      close(padCenter.x,cylinder.body.position.x,'pad/cylinder x connection');close(padCenter.z,cylinder.body.position.z,'pad/cylinder z connection');
      close(padBox.min.y,pad.original.min.y,'pad stays on the original ground height');
      for(const axis of ['x','y','z'])close(padSize[axis],oldPadSize[axis],'rigid pad '+axis);
      assert.ok(after.min.y<=padBox.max.y&&after.min.y>=padBox.min.y,'cylinder foot stays inside its pad');
      const beam=beams.find(item=>Math.abs(item.original.getCenter(new THREE.Vector3()).x-cylinder.position.x)<1&&Math.sign(item.original.getCenter(new THREE.Vector3()).z)===side);
      const beamBox=box(beam.body);
      assert.ok(cylinder.body.position.z>=beamBox.min.z&&cylinder.body.position.z<=beamBox.max.z,'cylinder stays under the beam end');
      close((side>0?beamBox.max.z-cylinder.body.position.z:cylinder.body.position.z-beamBox.min.z),side>0?beam.original.max.z-cylinder.position.z:cylinder.position.z-beam.original.min.z,'beam/end connection');
      assert.ok(beamBox.min.y-after.max.y<2,'only the original brick seam separates beam and cylinder');
    }
    let left=800,right=0,top=500,bottom=0;
    for(const group of model.children.slice(9,12))group.traverse(object=>{
      if(!object.isMesh)return;const vertices=object.geometry.getAttribute('position'),p=new THREE.Vector3();
      for(let index=0;index<vertices.count;index++){
        p.fromBufferAttribute(vertices,index).applyMatrix4(object.matrixWorld).project(camera);
        const x=(p.x+1)*400,y=(1-p.y)*250;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
        assert.ok(x>3&&x<797&&y>3&&y<497,`support ${value} remains in the PNG frame`);
      }
    });
    t.diagnostic(`value ${value}: support bounds ${[left,top,right,bottom].map(number=>number.toFixed(2)).join(', ')}`);
    restore();unchanged(original);
  }
});
