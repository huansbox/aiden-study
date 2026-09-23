import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, preserveDrawingBuffer:true });
renderer.setSize(1600,1000);
renderer.setPixelRatio(2);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
document.body.append(renderer.domElement);
const scene=new THREE.Scene();
scene.background=new THREE.Color('#eee3d1');
const environment=new THREE.PMREMGenerator(renderer);
scene.environment=environment.fromScene(new RoomEnvironment(),.03).texture;
scene.environmentIntensity=.45;
const camera=new THREE.OrthographicCamera(-435,435,272,-272,1,4000);
camera.position.set(665,537,-930);
camera.lookAt(-283,75,42);
camera.zoom=1.38;camera.updateProjectionMatrix();
const ambient=new THREE.HemisphereLight(0xfff7e8,0x71665a,.85);scene.add(ambient);
const key=new THREE.DirectionalLight(0xfff4df,3.0);key.position.set(320,780,-410);
key.castShadow=true;key.shadow.mapSize.set(4096,4096);key.shadow.camera.left=-650;key.shadow.camera.right=650;key.shadow.camera.top=550;key.shadow.camera.bottom=-550;key.shadow.camera.near=20;key.shadow.camera.far=1800;key.shadow.normalBias=.6;key.shadow.bias=-.0001;key.shadow.radius=5;scene.add(key);
key.target.position.set(-260,45,45);scene.add(key.target);
const rim=new THREE.DirectionalLight(0xe4eefb,1.2);rim.position.set(-620,390,260);scene.add(rim);
const bounce=new THREE.DirectionalLight(0xffddbe,.7);bounce.position.set(-400,160,300);scene.add(bounce);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(6000,6000),new THREE.MeshStandardMaterial({color:'#d6c6ae',roughness:.88}));floor.rotation.x=-Math.PI/2;floor.position.y=-9;floor.receiveShadow=true;scene.add(floor);
const V=p=>new THREE.Vector3(-p[0],p[2],p[1]);
const matCache=new Map();
function material(color,kind='plastic'){
  const key=color+kind;
  if(matCache.has(key))return matCache.get(key);
  const dark=/^#(?:1|2|3|4)/.test(color);
  const options={color,roughness:kind==='glass'?.15:dark?.3:.29,metalness:kind==='metal'?.58:.03,clearcoat:kind==='glass'?1:.48,clearcoatRoughness:.18,side:THREE.DoubleSide};
  if(kind==='glass'){options.color='#263944';options.metalness=.32;options.clearcoat=1;options.roughness=.14;}
  const m=new THREE.MeshPhysicalMaterial(options);matCache.set(key,m);return m;
}
function add(geo,mat,pos){const mesh=new THREE.Mesh(geo,mat);if(pos)mesh.position.copy(pos);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;}
function cylinder(p,r,h,plane,color,kind='plastic'){
 const mesh=add(new THREE.CylinderGeometry(r,r,h,32,1),material(color,kind),V(p));
 if(plane==='xz')mesh.rotation.x=Math.PI/2;
 if(plane==='yz')mesh.rotation.z=Math.PI/2;
 return mesh;
}
let groupName='';
let ordinal=0;
const assemblyGroups=[];
for(const group of await(await fetch('./geometry.json')).json()){
 const firstObject=scene.children.length;
 groupName=group.name;
 for(const s of group.shapes){ordinal++;
  if(s.type==='brick'){
   const geo=new RoundedBoxGeometry(s.length,s.height,s.width,2,Math.min(.65,s.height/5,s.width/5,s.length/5));
   add(geo,material(s.colors[0],['steel'].includes(s.color)?'metal':'plastic'),V([s.x+s.length/2,s.y+s.width/2,s.z+s.height/2]));
  }else if(s.type==='stud'){
   const profile=[[0,0],[s.r-.45,0],[s.r,.45],[s.r,3.6],[s.r-.35,4.15],[s.r-1,4.25],[0,4.25]].map(([x,y])=>new THREE.Vector2(x,y));
   add(new THREE.LatheGeometry(profile,32),material(s.colors[0]),V([s.x,s.y,s.z+.2]));
   const rim=new THREE.Mesh(new THREE.TorusGeometry(s.r-.6,.12,6,32),material(s.colors[1]));rim.rotation.x=Math.PI/2;rim.position.copy(V([s.x,s.y,s.z+4.27]));scene.add(rim);
  }else if(s.type==='disk'){
   const wheel=/輪軸/.test(groupName),metal=wheel&&s.fill!=='#151c21';
   cylinder([s.x,s.y,s.z],s.radius,wheel?1.4:.42,s.plane,s.fill,metal?'metal':'plastic');
  }else if(s.type==='ring'){
   const m=add(new THREE.TorusGeometry(s.radius,.65,8,36),material(s.fill),V([s.x,s.y,s.z]));
   if(s.plane==='xy')m.rotation.x=Math.PI/2;if(s.plane==='yz')m.rotation.y=Math.PI/2;
  }else if(s.type==='line'){
   if(s.width<1.1)continue;
   const points=s.vertices.map(p=>V(/前擋風玻璃/.test(groupName)?[p[0]-1.5,p[1],p[2]]:p));
   for(let j=1;j<points.length;j++){
    const delta=points[j].clone().sub(points[j-1]),mid=points[j].clone().add(points[j-1]).multiplyScalar(.5);
    const m=add(new THREE.CylinderGeometry(s.width*.43,s.width*.43,delta.length(),10),material(s.color),mid);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
   }
  }else if(s.type==='face'){
   // The original strips are already a shaded facade; physical light shades
   // the face here. Retain geometric glazing and roof bevels, omit fake reflections.
   if(['#536975','#627780'].includes(s.fill))continue;
   const corrected=s.vertices.map(p=>[...p]);
   if(/前擋風玻璃/.test(groupName))for(const p of corrected)p[0]-=s.fill==='#829196'?1.1:.9;
   if(/前端斜面深灰/.test(groupName))for(const p of corrected)if(p[1]===0)p[1]-=.12;
   const pts=corrected.map(V);if(pts.length<3)continue;
   const u=pts[1].clone().sub(pts[0]).normalize();
   const normal=new THREE.Vector3().crossVectors(u,pts[2].clone().sub(pts[0])).normalize();
   if(normal.length()<.5)continue;
   const v=new THREE.Vector3().crossVectors(normal,u);
   const p2=pts.map(p=>{const d=p.clone().sub(pts[0]);return new THREE.Vector2(d.dot(u),d.dot(v));});
   const triangles=THREE.ShapeUtils.triangulateShape(p2,[]),flat=triangles.flatMap(t=>t.flatMap(i=>pts[i].toArray()));
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(flat,3));geometry.computeVertexNormals();
   const isGlass=['#344953','#263e4b','#3d505b'].includes(s.fill);
   const roof=/屋頂|車頂/.test(groupName)&&/^#(?:6|7|8|9|a)/i.test(s.fill);
   const faceColor=roof?new THREE.Color(s.fill).multiplyScalar(.63).getStyle():s.fill;
   const m=material(faceColor,isGlass?'glass':'plastic').clone();m.polygonOffset=true;m.polygonOffsetFactor=-1;m.polygonOffsetUnits=-1;
   if(s.fill==='#829196'){m.transparent=true;m.opacity=.14;m.depthWrite=false;}
   add(geometry,m);
  }else if(s.type==='text'){
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;const ctx=canvas.getContext('2d');ctx.fillStyle=s.fill;ctx.font='bold 110px Arial';ctx.fillText(s.value,5,119);
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
   const m=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide});
   const mesh=add(new THREE.PlaneGeometry(s.value.length*s.size*.69,s.size*1.35),m,V([s.x+s.value.length*s.size*.345,s.y-.15,s.z+s.size*.28]));mesh.rotation.y=Math.PI;mesh.castShadow=false;
  }
 }
 assemblyGroups.push({name:group.name,objects:scene.children.slice(firstObject)});
}
// A quiet contact shadow helps the toy sit on the photographic studio surface.
renderer.render(scene,camera);
window.e500={renderer,scene,camera,primitiveCount:ordinal,assemblyGroups,
 renderSelection(indices){
  floor.visible=false;scene.background=null;renderer.setClearColor(0,0);
  assemblyGroups.forEach((g,i)=>g.objects.forEach(object=>object.visible=indices.includes(i)));
  renderer.render(scene,camera);
  return renderer.domElement.toDataURL('image/png').split(',')[1];
 }
};
window.renderReady=true;
