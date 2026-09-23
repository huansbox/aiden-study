// Throwaway style study: assembled/exploded/bogie views of one revised model.
// It deliberately does not read or mutate the learning/collection state.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createPrototype } from './prototype-model.js';

const mount=document.querySelector('#scene');
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.9;
mount.replaceChildren(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#f6f1e8');
const env=new THREE.PMREMGenerator(renderer);
scene.environment=env.fromScene(new RoomEnvironment(),.035).texture;
scene.environmentIntensity=.55;
const camera=new THREE.OrthographicCamera(-210,210,160,-160,.1,2200);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.09;controls.enablePan=false;
controls.minZoom=.65;controls.maxZoom=2.5;controls.maxPolarAngle=Math.PI*.49;
const cache=new Map();
function material(color,kind='plastic'){
  const key=color+kind;
  if(!cache.has(key))cache.set(key,new THREE.MeshPhysicalMaterial({
    color:kind==='glass'?'#29434d':color,
    roughness:kind==='glass'?.12:.28,
    metalness:kind==='glass'?.16:0,
    clearcoat:1,clearcoatRoughness:.17,
    side:THREE.DoubleSide,
  }));
  return cache.get(key);
}
const model=createPrototype(material);scene.add(model);
model.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true;}});
const groups=model.children;
const originals=new Map(groups.map(g=>[g,g.position.clone()]));
const ambient=new THREE.HemisphereLight(0xfff7e6,0x655e58,.65);scene.add(ambient);
const key=new THREE.DirectionalLight(0xfff5e6,2.7);key.position.set(-160,440,280);
key.castShadow=true;key.shadow.mapSize.set(4096,4096);key.shadow.camera.left=-300;key.shadow.camera.right=300;key.shadow.camera.top=360;key.shadow.camera.bottom=-300;key.shadow.camera.far=1100;key.shadow.normalBias=.18;key.shadow.bias=-.00007;key.shadow.radius=3;
key.target.position.set(70,80,0);scene.add(key,key.target);
const fill=new THREE.DirectionalLight(0xe8f0ff,1.0);fill.position.set(280,220,-180);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),new THREE.MeshStandardMaterial({color:'#f3ebdd',roughness:.94}));floor.rotation.x=-Math.PI/2;floor.position.y=-2;floor.receiveShadow=true;scene.add(floor);
const labels={assembled:'組合外觀',exploded:'拆開看積木',wheels:'輪組近看'};
let currentView;
function home(){
  const wheels=currentView==='wheels';
  model.updateMatrixWorld(true);
  const bounds=new THREE.Box3();
  for(const group of groups)if(group.visible)bounds.union(new THREE.Box3().setFromObject(group));
  const target=bounds.getCenter(new THREE.Vector3());
  controls.target.copy(target);
  camera.position.copy(target).add(new THREE.Vector3(-350,235,400));
  camera.zoom=currentView==='exploded'?.72:wheels?1.4:1;
  camera.updateProjectionMatrix();controls.update();renderer.render(scene,camera);
}
function resize(){
  const {width,height}=mount.getBoundingClientRect();renderer.setSize(width,height);
  const half=155;camera.left=-half*width/height;camera.right=half*width/height;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.render(scene,camera);
}
function setView(view){
  currentView=labels[view]?view:'assembled';
  for(const group of groups){
    group.position.copy(originals.get(group));
    group.visible=currentView!=='wheels'||/輪|bogie|wheel/i.test(group.name);
    if(currentView==='exploded'){
      group.position.add(new THREE.Vector3(...(group.userData.explode||[0,0,0])));
      group.position.y+=45;
    }
  }
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===currentView)));
  document.querySelector('#view-title').textContent=labels[currentView];
  document.querySelector('#view-state').textContent=currentView==='exploded'?'部件拆開':currentView==='wheels'?'獨立輪組':'組合狀態';
  const url=new URL(location.href);url.searchParams.set('view',currentView);history.replaceState(null,'',url);
  home();renderer.render(scene,camera);
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.querySelector('#reset-view').addEventListener('click',home);
document.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight'].includes(e.key)||e.target.matches('input,textarea,[contenteditable=true]'))return;
  const keys=Object.keys(labels),at=keys.indexOf(currentView);setView(keys[(at+(e.key==='ArrowRight'?1:2))%3]);
});
let meshes=0;model.traverse(o=>{if(o.isMesh)meshes++;});
document.querySelector('#part-count').textContent=`${groups.length} 組可拆部件`;
new ResizeObserver(resize).observe(mount);resize();
setView(new URL(location.href).searchParams.get('view'));
controls.addEventListener('change',()=>renderer.render(scene,camera));
renderer.setAnimationLoop(()=>controls.update());
window.stylePrototype={scene,model,camera,renderer,groups,setView,home,meshCount:meshes};
window.renderReady=true;
