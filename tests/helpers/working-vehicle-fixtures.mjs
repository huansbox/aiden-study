// Synthetic PNG metadata for behavior tests. Never imported by production.
export const vehicleGlobals = {
  "jet-plane":"KidsBrickJetPlane", excavator:"KidsBrickExcavator", "snow-blower":"KidsBrickSnowBlower",
  "mobile-crane":"KidsBrickMobileCrane", "cement-mixer":"KidsBrickCementMixer", "recycling-truck":"KidsBrickRecyclingTruck",
};
export const vehicleIds=Object.keys(vehicleGlobals);
export function vehicleFixture(id) {
  const count=id === "jet-plane" ? 11 : 10;
  const pose={"cement-mixer":['drum',5,4,8],"snow-blower":['auger',7,2,8],excavator:['turntable',4,7,5],"mobile-crane":['supports',4,1,5]}[id];
  return {id,title:id,series:"飛機與工作車",viewBox:"0 0 800 500",assetVersion:"synthetic",previewFormat:"png",
    ...(pose ? {mechanismPoses:{[pose[0]]:{
      required:Array.from({length:pose[2]},(_,i)=>[1,2,3].map(n=>`p${i+pose[1]}-${n}`)).flat().filter(part=>part!=='p9-3'),
      frames:Array.from({length:pose[3]},(_,i)=>({value:i/(pose[3]-1),src:`shared/bricks/${id}-v1/mechanism-poses/${pose[0]}-${i}.png`}))}}} : {}),
    steps:Array.from({length:count},(_,pack)=>({title:`組裝 ${pack+1}`,parts:[1,2,3].map(n=> {
      const partId=`p${pack+1}-${n}`;
      return {id:partId,name:`synthetic ${partId}`,box:{x:80+pack*24,y:100+n*35,width:90,height:70},z:pack*3+n,
        motion:{pivot:[125+pack*24,135+n*35],basis:[.3,-.9,.8,.25],vector:[-50,-40]},
        svg:`<g><image href="shared/bricks/${id}-v1/assets/${partId}.png" x="0" y="0" width="800" height="500"/></g>`};
    })}))};
}
