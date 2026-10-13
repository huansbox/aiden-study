import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {LAB_VIEW,createBreezyLabModel} from './model-breezy-lab.js';

const {width,height,scale,tilt}=LAB_VIEW;
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
renderer.setSize(width*2,height*2,false);renderer.setPixelRatio(1);renderer.setClearColor(0,0);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
document.querySelector('#preview').append(renderer.domElement);
const scene=new THREE.Scene(),environment=new THREE.PMREMGenerator(renderer);
scene.environment=environment.fromScene(new RoomEnvironment(),.035).texture;scene.environmentIntensity=.55;
const cache=new Map();
function material(color,kind='plastic'){
  const key=color+kind;
  if(!cache.has(key))cache.set(key,new THREE.MeshPhysicalMaterial({color,roughness:kind==='glass'?.12:.28,metalness:kind==='glass'?.16:0,clearcoat:1,clearcoatRoughness:.17}));
  return cache.get(key);
}
const {model,layers}=createBreezyLabModel(material);scene.add(model);
const camera=new THREE.OrthographicCamera(-width/scale/2,width/scale/2,height/scale/2,-height/scale/2,.1,2000);
camera.position.set(0,Math.sin(tilt)*900,Math.cos(tilt)*900);camera.lookAt(0,0,0);
scene.add(new THREE.HemisphereLight(0xfff7e6,0x655e58,.65));
const key=new THREE.DirectionalLight(0xfff5e6,2.7);key.position.set(-160,240,220);key.castShadow=true;
key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-170,right:170,top:150,bottom:-150,near:1,far:900});key.shadow.normalBias=.08;key.shadow.bias=-.00005;scene.add(key);
const fill=new THREE.DirectionalLight(0xe8f0ff,1);fill.position.set(180,100,-160);scene.add(fill);
renderer.render(scene,camera);
document.querySelector('#status').textContent='素材就緒：六個獨立透明圖層';
const button=document.querySelector('#export');button.disabled=false;
button.addEventListener('click',()=>{
  const frames={};
  for(const name of Object.keys(layers)){
    for(const [id,group] of Object.entries(layers))group.visible=id===name;
    renderer.render(scene,camera);frames[name]=renderer.domElement.toDataURL('image/png').split(',')[1];
  }
  for(const group of Object.values(layers))group.visible=true;
  renderer.render(scene,camera);
  frames.complete=renderer.domElement.toDataURL('image/png').split(',')[1];
  const blob=new Blob([JSON.stringify({version:1,viewBox:`0 0 ${width} ${height}`,frames})],{type:'application/json'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='breezy-lab-art.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),60000);document.querySelector('#status').textContent='素材已匯出';
});
