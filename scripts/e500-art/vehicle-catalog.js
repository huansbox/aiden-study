// Shared authoring/runtime-build facts. No Three.js dependency is needed to inspect it.
export const vehicleArtModels = {
  'jet-plane': {title:'藍白雙引擎噴射飛機', series:'飛行交通工具', packs:11, global:'KidsBrickJetPlane', module:'model-jet-plane.js', create:'createJetPlaneModel', cameraOffset:[-950,550,720], targetOffset:[0,-30,0]},
  excavator: {title:'履帶挖土機', series:'工作車系列', packs:10, global:'KidsBrickExcavator', module:'model-excavator.js', create:'createExcavatorModel', motionUnits:{'p7-3':{anchor:'boom',axis:'z'},'p8-1':{anchor:'stick',axis:'z'},'p9-1':{anchor:'bucket',axis:'z'}}},
  'snow-blower': {title:'雙螺旋吹雪車', series:'工作車系列', packs:10, global:'KidsBrickSnowBlower', module:'model-snow-blower.js', create:'createSnowBlowerModel', motionUnits:{'p8-1':{anchor:'auger',axis:'z'},'p9-3':{anchor:'outlet',axis:'z'}}},
  'mobile-crane': {title:'伸縮吊臂起重車', series:'工作車系列', packs:10, global:'KidsBrickMobileCrane', module:'model-mobile-crane.js', create:'createMobileCraneModel', targetOffset:[0,-24,0], mechanismArt:['p7-2','p7-3','p8-2'], motionUnits:{'p7-2':{anchor:'boomMiddle',axis:'z',vector:[-72,64,0]},'p7-3':{pivot:[170,271,0],axis:'z',vector:[-76,63,0]},'p8-3':{anchor:'hook',axis:'z',vector:[0,1,0],attach:[94,87,0]}}},
  'cement-mixer': {title:'旋轉滾筒混凝土車', series:'工作車系列', packs:10, global:'KidsBrickCementMixer', module:'model-cement-mixer.js', create:'createCementMixerModel', motionUnits:{'p6-2':{anchor:'drum',axis:'x'},'p8-2':{anchor:'chute',axis:'y'}}},
  'recycling-truck': {title:'側舉式資源回收車', series:'工作車系列', packs:10, global:'KidsBrickRecyclingTruck', module:'model-recycling-truck.js', create:'createRecyclingTruckModel', mechanismArt:['p5-1','p5-2','p5-3','p6-1','p6-2','p6-3','p7-1','p7-2','p7-3'], mechanismArtRigs:[['p5-1','p5-2','p5-3','p6-1','p6-2','p6-3'],['p7-1','p7-2','p7-3']], mechanismArtOccluders:{'p7-2':['p5-1','p5-2','p5-3','p6-1','p6-2','p6-3'],'p7-3':['p7-1']}, motionUnits:{'p5-1':{anchor:'body',axis:'z'},'p7-2':{anchor:'rearDoor',axis:'z'},'p8-3':{anchor:'binLift',axis:'z'},'p9-2':{anchor:'lid',axis:'z'}}},
};

const indices=(start,count)=>Array.from({length:count},(_,index)=>start+index);
const partIds=values=>values.map(index=>`p${Math.floor(index/3)+1}-${index%3+1}`);
export const vehiclePoseDefinitions={
  'cement-mixer':{key:'drum',bundleKey:'mixerPoses',name:'攪拌筒',axis:'x',anchor:'drum',moving:indices(15,6),occludeWith:[12,13,14,21,22,23],required:partIds(indices(12,12)),angles:indices(0,8).map(index=>index*45)},
  'snow-blower':{key:'auger',bundleKey:'augerPoses',name:'螺旋集雪筒',axis:'z',anchor:'auger',moving:[21,22],occludeWith:[18,19,20,23],required:partIds(indices(18,6)),angles:indices(0,8).map(index=>index*45)},
  excavator:{key:'turntable',bundleKey:'turntablePoses',name:'怪手上車轉台',axis:'y',anchor:'turntable',moving:indices(9,21).filter(index=>index!==26),occludeWith:indices(0,9),required:partIds(indices(9,21).filter(index=>index!==26)),angles:[0,10,20,30,40]},
  'mobile-crane':{key:'supports',bundleKey:'supportsPoses',name:'吊車支撐腳',type:'crane-supports',moving:[9,10,11],occludeWith:indices(0,9),required:['p4-1','p4-2','p4-3'],values:[0,.25,.5,.75,1]},
};
