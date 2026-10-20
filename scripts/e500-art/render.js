import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createE500Model } from './model.js';
import { vehicleArtModels, vehiclePoseDefinitions } from './vehicle-catalog.js';

const definitions = {
 e500: {title:'台鐵 E500 型電力機車', packs:14, create:createE500Model},
 emu3000: {title:'台鐵 EMU3000 型電聯車', packs:12, create:async material=>(await import('./model-emu3000.js')).createEmu3000Model(material)},
 r200: {title:'台鐵 R200 型柴電機車', packs:12, create:async material=>(await import('./model-r200.js')).createR200Model(material)},
 '700t': {title:'台灣高鐵 700T', series:'臺灣高速鐵路', packs:12, create:async material=>(await import('./model-700t.js')).create700TModel(material)},
 n700s: {title:'日本新幹線 N700S', series:'日本新幹線', packs:12, create:async material=>(await import('./model-n700s.js')).createN700SModel(material)},
 emu900: {title:'台鐵 EMU900 型通勤電聯車', packs:12, create:async material=>(await import('./model-emu900.js')).createEmu900Model(material)},
 'breezy-blue': {title:'藍皮解憂號・復古客車', packs:12, create:async material=>(await import('./model-breezy-blue.js')).createBreezyBlueModel(material)},
 ct273: {title:'台鐵 CT273 蒸汽機車', packs:14, create:async material=>(await import('./model-ct273.js')).createCT273Model(material)},
 ...Object.fromEntries(Object.entries(vehicleArtModels).map(([id, definition]) => [id, {
  ...definition, create:async material=>(await import('./' + definition.module))[definition.create](material),
 }])),
};
const requested = new URLSearchParams(location.search).get('model') || 'e500';
const modelId = Object.hasOwn(definitions, requested) ? requested : 'e500';
const definition = definitions[modelId], total = definition.packs * 3;
document.title = definition.title + '積木模型';
document.querySelector('h1').textContent = '一包一包，拼出 ' + definition.title;
document.querySelector('#model-description').textContent = vehicleArtModels[modelId]
 ? `${definition.packs} 個來源包、${total} 組，首包展示地面會直接備好，接著拼裝 ${definition.packs - 1} 包主體。${modelId === 'jet-plane' ? '藍白厚磚機身、兩側主翼與兩具獨立噴射引擎；風扇裝妥即可試轉。' : '從輪組與底盤開始，逐步裝上工作機構。'}`
 : `${definition.packs} 包、${total} 組，逐步加上輪子、車身與車頂。${['emu3000','700t','n700s','emu900'].includes(modelId) ? '以一節先頭車呈現。' : ''}`;
document.querySelector('#progress').max = total;
document.querySelector('[data-count="42"]').dataset.count = total;
document.querySelector('#celebration-link').href = './celebration.html?model=' + modelId;
document.querySelector('#candidate-link').href = `./candidates/${modelId === 'e500' ? '' : modelId + '/'}index.html`;
if (vehicleArtModels[modelId]) document.querySelector('#celebration-link').hidden = true;

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
const model=await definition.create(material);scene.add(model);
model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
const assemblyGroups=model.children;
if(assemblyGroups.length!==total)throw Error(`${modelId} must have ${total} assembly groups`);
const target=new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
if (definition.targetOffset) target.add(new THREE.Vector3(...definition.targetOffset));
const ambient=new THREE.HemisphereLight(0xfff7e6,0x655e58,.65);scene.add(ambient);
const key=new THREE.DirectionalLight(0xfff5e6,2.7);key.position.set(target.x-350,640,420);
key.castShadow=true;key.shadow.mapSize.set(4096,4096);Object.assign(key.shadow.camera,{left:-500,right:500,top:500,bottom:-500,near:1,far:1800});
key.shadow.normalBias=.18;key.shadow.bias=-.00007;key.shadow.radius=3;key.target.position.copy(target);scene.add(key,key.target);
const fill=new THREE.DirectionalLight(0xe8f0ff,1);fill.position.set(target.x+400,350,-300);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),new THREE.MeshStandardMaterial({color:'#f3ebdd',roughness:.94}));floor.rotation.x=-Math.PI/2;floor.position.y=-25;floor.receiveShadow=true;scene.add(floor);
const cameraOffset=new THREE.Vector3(...(definition.cameraOffset || [-720,430,950]));
let count=total;
function home(){controls.target.copy(target);camera.position.copy(target).add(cameraOffset);camera.zoom=1;camera.updateProjectionMatrix();controls.update();renderer.render(scene,camera);}
function resize(){const {width,height}=mount.getBoundingClientRect();renderer.setSize(width,height);const half=Math.max(250,400*height/width);camera.left=-half*width/height;camera.right=half*width/height;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.render(scene,camera);}
function setCount(value){count=Number(value);assemblyGroups.forEach((g,i)=>g.visible=i<count);document.querySelector('#progress').value=count;document.querySelector('#progress-label').textContent=`${count} / ${total} 組`;renderer.render(scene,camera);}
document.querySelector('#progress').addEventListener('input',e=>setCount(e.target.value));
document.querySelector('#reset-view').addEventListener('click',home);
document.querySelectorAll('[data-count]').forEach(b=>b.addEventListener('click',()=>setCount(b.dataset.count)));
new ResizeObserver(resize).observe(mount);resize();home();setCount(total);
controls.addEventListener('change',()=>renderer.render(scene,camera));
renderer.setAnimationLoop(()=>controls.update());
const descriptor={id:modelId,title:definition.title,series:definition.series||'臺灣火車系列',viewBox:'0 0 800 500',steps:[]};
// Project hinges using the export camera, independent of the preview's aspect or orbit.
const projectionCamera=camera.clone();
Object.assign(projectionCamera,{left:-400,right:400,top:250,bottom:-250,zoom:1});
projectionCamera.position.copy(target).add(cameraOffset);projectionCamera.lookAt(target);
projectionCamera.updateProjectionMatrix();projectionCamera.updateMatrixWorld(true);
const project=point=>{const p=new THREE.Vector3(...point).project(projectionCamera);return [(p.x+1)*400,(1-p.y)*250];};
const roundedPoint=point=>point.map(number=>Math.round(number*1e6)/1e6);
function motionFor(group) {
 const config=definition.motionUnits?.[group.userData.id];
 const mechanism=group.userData.mechanism;
 const source=(mechanism||config)&&{...config,...mechanism,pivot:mechanism?.pivot||config?.pivot||model.userData.mechanismAnchors?.[config?.anchor]||mechanism?.base};
 if(!source?.pivot||!source.axis)return null;
 const pivot=project(source.pivot),axes={x:[[0,1,0],[0,0,1]],y:[[0,0,1],[1,0,0]],z:[[1,0,0],[0,1,0]]};
 const columns=axes[source.axis].map(axis=>project(source.pivot.map((value,index)=>value+axis[index])).map((value,index)=>value-pivot[index]));
 const motion={pivot:roundedPoint(pivot),basis:roundedPoint([...columns[0],...columns[1]])};
 if(source.vector)motion.vector=roundedPoint(project(source.pivot.map((value,index)=>value+source.vector[index])).map((value,index)=>value-pivot[index]));
 if(source.base&&source.tip){motion.base=roundedPoint(project(source.base));motion.tip=roundedPoint(project(source.tip));}
 if(source.attach)motion.attach=roundedPoint(project(source.attach));
 return motion;
}
assemblyGroups.forEach((g,i)=>{if(i%3===0)descriptor.steps.push({title:g.userData.packTitle,parts:[]});const motion=motionFor(g);descriptor.steps.at(-1).parts.push({id:g.userData.id,name:g.userData.name||g.name,z:g.userData.z,...(motion?{motion}:{})});});
window.trainArt={renderer,scene,camera,model,assemblyGroups,descriptor,home,setCount,mechanismArt:definition.mechanismArt||[],mechanismArtRigs:definition.mechanismArtRigs||[],mechanismArtOccluders:definition.mechanismArtOccluders||{},
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
// Retain the original authoring console entry point for E500 tooling.
window.e500=window.trainArt;
function renderMechanismPose(indices,axis,pivotValues,occludeWith,angle){
 const moving=indices.map(index=>assemblyGroups[index]),states=moving.map(group=>({group,matrix:group.matrix.clone(),auto:group.matrixAutoUpdate}));
 const pivot=new THREE.Vector3(...pivotValues);
 const rotation=new THREE.Matrix4().makeTranslation(...pivot.toArray())
  .multiply(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(...{x:[1,0,0],y:[0,1,0],z:[0,0,1]}[axis]),angle*Math.PI/180))
  .multiply(new THREE.Matrix4().makeTranslation(...pivot.clone().negate().toArray()));
 try{
  for(const group of moving){group.matrix.copy(rotation);group.matrixAutoUpdate=false;group.updateMatrixWorld(true);}
  return window.trainArt.renderSelection(indices,{occludeWith});
 }finally{
  for(const {group,matrix,auto} of states){group.matrix.copy(matrix);group.matrixAutoUpdate=auto;group.updateMatrixWorld(true);}
  renderer.render(scene,camera);
 }
}
const poseDefinition=vehiclePoseDefinitions[modelId];
if(poseDefinition){
 window.trainArt.poseDefinition=poseDefinition;
 window.trainArt.renderMechanismPose=angle=>renderMechanismPose(poseDefinition.moving,poseDefinition.axis,model.userData.mechanismAnchors[poseDefinition.anchor],poseDefinition.occludeWith,angle);
}
window.renderReady=true;

await import('./export-ui.js');
