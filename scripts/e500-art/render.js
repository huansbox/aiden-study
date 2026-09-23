import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createE500Model } from './model.js';

const mount=document.querySelector('#scene');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
mount.replaceChildren(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#f6f1e8');
const environment=new THREE.PMREMGenerator(renderer);
scene.environment=environment.fromScene(new RoomEnvironment(),.035).texture;scene.environmentIntensity=.55;
const camera=new THREE.OrthographicCamera(-400,400,250,-250,.1,4000);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.enablePan=false;controls.minZoom=.65;controls.maxZoom=2.7;controls.maxPolarAngle=Math.PI*.49;
const cache=new Map();
function material(color,kind='plastic'){
 const key=color+kind;
 if(!cache.has(key))cache.set(key,new THREE.MeshPhysicalMaterial({color:kind==='glass'?'#29434d':color,roughness:kind==='glass'?.12:.28,metalness:kind==='glass'?.16:0,clearcoat:1,clearcoatRoughness:.17,side:THREE.DoubleSide}));
 return cache.get(key);
}
const model=createE500Model(material);scene.add(model);
model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
const assemblyGroups=model.children;
if(assemblyGroups.length!==42)throw Error('E500 must have 42 assembly groups');
const target=new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
const ambient=new THREE.HemisphereLight(0xfff7e6,0x655e58,.65);scene.add(ambient);
const key=new THREE.DirectionalLight(0xfff5e6,2.7);key.position.set(target.x-350,640,420);
key.castShadow=true;key.shadow.mapSize.set(4096,4096);Object.assign(key.shadow.camera,{left:-500,right:500,top:500,bottom:-500,near:1,far:1800});
key.shadow.normalBias=.18;key.shadow.bias=-.00007;key.shadow.radius=3;key.target.position.copy(target);scene.add(key,key.target);
const fill=new THREE.DirectionalLight(0xe8f0ff,1);fill.position.set(target.x+400,350,-300);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),new THREE.MeshStandardMaterial({color:'#f3ebdd',roughness:.94}));floor.rotation.x=-Math.PI/2;floor.position.y=-25;floor.receiveShadow=true;scene.add(floor);
const cameraOffset=new THREE.Vector3(-720,430,950);
let count=42;
function home(){controls.target.copy(target);camera.position.copy(target).add(cameraOffset);camera.zoom=1;camera.updateProjectionMatrix();controls.update();renderer.render(scene,camera);}
function resize(){const {width,height}=mount.getBoundingClientRect();renderer.setSize(width,height);const half=Math.max(250,400*height/width);camera.left=-half*width/height;camera.right=half*width/height;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.render(scene,camera);}
function setCount(value){count=Number(value);assemblyGroups.forEach((g,i)=>g.visible=i<count);document.querySelector('#progress').value=count;document.querySelector('#progress-label').textContent=`${count} / 42 組`;renderer.render(scene,camera);}
document.querySelector('#progress').addEventListener('input',e=>setCount(e.target.value));
document.querySelector('#reset-view').addEventListener('click',home);
document.querySelectorAll('[data-count]').forEach(b=>b.addEventListener('click',()=>setCount(b.dataset.count)));
new ResizeObserver(resize).observe(mount);resize();home();
controls.addEventListener('change',()=>renderer.render(scene,camera));
renderer.setAnimationLoop(()=>controls.update());
const descriptor={id:'e500',title:'台鐵 E500 型電力機車',series:'臺灣火車系列',viewBox:'0 0 800 500',steps:[]};
assemblyGroups.forEach((g,i)=>{if(i%3===0)descriptor.steps.push({title:g.userData.packTitle,parts:[]});descriptor.steps.at(-1).parts.push({id:g.userData.id,name:g.userData.name||g.name,z:g.userData.z});});
window.e500={renderer,scene,camera,model,assemblyGroups,descriptor,home,setCount,
 renderSelection(indices,{occludeWith=[]}={}){
  // Export always uses the same orthographic camera, regardless of preview edits.
  const oldSize=renderer.getSize(new THREE.Vector2()),oldRatio=renderer.getPixelRatio();
  const oldCamera=camera.clone(),oldVisible=assemblyGroups.map(g=>g.visible),oldBackground=scene.background;
  renderer.setPixelRatio(1);renderer.setSize(3200,2000,false);
  camera.left=-400;camera.right=400;camera.top=250;camera.bottom=-250;camera.zoom=1;
  camera.position.copy(target).add(cameraOffset);camera.lookAt(target);camera.updateProjectionMatrix();
  const occluders=new Set(occludeWith),restore=[];
  floor.visible=false;scene.background=null;renderer.setClearColor(0,0);
  assemblyGroups.forEach((g,i)=>{
   g.visible=indices.includes(i)||occluders.has(i);
   if(!occluders.has(i))return;
   // Earlier placements hide only the surfaces they already cover. Future
   // pieces never mask an unfinished build. Draw depth before this new piece.
   g.traverse(o=>{
    const state={object:o,renderOrder:o.renderOrder,material:o.material};restore.push(state);o.renderOrder=-1;
    if(o.isMesh){o.material=o.material.clone();o.material.colorWrite=false;}
   });
  });
  renderer.render(scene,camera);const png=renderer.domElement.toDataURL('image/png').split(',')[1];
  for(const {object,renderOrder,material} of restore){object.renderOrder=renderOrder;if(object.isMesh){object.material.dispose();object.material=material;}}
  assemblyGroups.forEach((g,i)=>g.visible=oldVisible[i]);scene.background=oldBackground;floor.visible=true;camera.copy(oldCamera);
  renderer.setPixelRatio(oldRatio);renderer.setSize(oldSize.x,oldSize.y,false);renderer.render(scene,camera);
  return png;
 }
};
window.renderReady=true;
