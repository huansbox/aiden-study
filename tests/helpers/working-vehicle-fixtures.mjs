// Synthetic PNG metadata for behavior tests. Never imported by production.
export const vehicleGlobals = {
  "jet-plane":"KidsBrickJetPlane", excavator:"KidsBrickExcavator", "snow-blower":"KidsBrickSnowBlower",
  "mobile-crane":"KidsBrickMobileCrane", "cement-mixer":"KidsBrickCementMixer", "recycling-truck":"KidsBrickRecyclingTruck",
};
export const vehicleIds=Object.keys(vehicleGlobals);
export function vehicleFixture(id) {
  const count=id === "jet-plane" ? 11 : 10;
  return {id,title:id,series:"飛機與工作車",viewBox:"0 0 800 500",assetVersion:"synthetic",previewFormat:"png",
    ...(['cement-mixer','snow-blower','excavator'].includes(id) ? {mechanismPoses:{[id==='cement-mixer'?'drum':id==='snow-blower'?'auger':'turntable']:{
      required:Array.from({length:id==='cement-mixer'?4:id==='snow-blower'?2:7},(_,i)=>[1,2,3].map(n=>`p${i+(id==='cement-mixer'?5:id==='snow-blower'?7:4)}-${n}`)).flat().filter(part=>part!=='p9-3'),
      frames:Array.from({length:id==='excavator'?5:8},(_,i)=>({angle:i*(id==='excavator'?10:45),src:`shared/bricks/${id}-v1/mechanism-poses/${id==='cement-mixer'?'drum':id==='snow-blower'?'auger':'turntable'}-${i}.png`}))}}} : {}),
    steps:Array.from({length:count},(_,pack)=>({title:`組裝 ${pack+1}`,parts:[1,2,3].map(n=> {
      const partId=`p${pack+1}-${n}`;
      return {id:partId,name:`synthetic ${partId}`,box:{x:80+pack*24,y:100+n*35,width:90,height:70},z:pack*3+n,
        motion:{pivot:[125+pack*24,135+n*35],basis:[.3,-.9,.8,.25],vector:[-50,-40]},
        svg:`<g><image href="shared/bricks/${id}-v1/assets/${partId}.png" x="0" y="0" width="800" height="500"/></g>`};
    })}))};
}
