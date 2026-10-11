import { trainParts } from './train-parts.js';

export function createBreezyBlueModel(material) {
  const {model,pack,track,wheel,bogie,chassis,wall,belt,roof,coupler,brick,rounded,bar} =
    trainParts(material,'藍皮解憂號・復古客車');
  const blue='#245f9b', darkBlue='#194775', cream='#ede5c9', gray='#6e787e', frame='#b9c3c4', black='#252c34', glass='#29434d';
  track();
  pack('組裝前轉向架',[
    ['前轉向架第一輪軸',g=>wheel(g,96)],['前轉向架第二輪軸',g=>wheel(g,144)],
    ['前轉向架粗側梁',g=>bogie(g,80)]
  ]);
  pack('組裝後轉向架',[
    ['後轉向架第一輪軸',g=>wheel(g,432)],['後轉向架第二輪軸',g=>wheel(g,480)],
    ['後轉向架粗側梁',g=>bogie(g,416)]
  ]);
  pack('接好復古客車底盤',[[0,192],[192,384],[384,576]].map(([a,b],i)=>[
    ['前段客車底盤','中段客車底盤','後段客車底盤'][i],g=>chassis(g,a,b)
  ]));
  pack('裝上車底設備箱',[
    ['前段黑色電池箱',g=>{for(const x of [176,208])brick(g,'電池箱短磚',x,29,-48,32,27,96,black,true);}],
    ['中央銀灰設備箱',g=>{for(const x of [272,304])brick(g,'設備箱短磚',x,31,-48,32,25,96,gray,true);}],
    ['後段黑色儲氣設備',g=>{for(const x of [360,392])brick(g,'儲氣箱短磚',x,29,-48,32,27,96,black,true);}]
  ]);
  pack('疊出浪漫藍車身',[[0,192],[192,384],[384,576]].map(([a,b],i)=>[
    ['前段藍色積木車身','中段藍色積木車身','後段藍色積木車身'][i],g=>{
      wall(g,a,b,blue,72,126);belt(g,a,b,116,cream,7);belt(g,a,b,79,cream,3);
      for(const side of [-1,1]) brick(g,'藍色窗頂長梁',a,188,side<0?-64:48,b-a,12,16,blue,true);
    }
  ]));
  function window(g,x) {
    for(const side of [-1,1]) {
      brick(g,'客窗間藍色窗柱',x-7,126,side<0?-64:48,7,62,16,blue,true);
      rounded(g,'銀色開窗外框',[x+21,156,side*57],[44,61,17],frame,1);
      rounded(g,'復古窗玻璃',[x+21,156,side*66],[36,52,2.5],glass,.7,'glass');
      brick(g,'開窗橫向中框',x+3,154,side<0?-68:67,36,3,2,frame);
    }
  }
  pack('裝上八組復古開窗',[
    ['前三組銀框開窗',g=>[58,115,172].forEach(x=>window(g,x))],
    ['中央三組銀框開窗',g=>[229,286,343].forEach(x=>window(g,x))],
    ['後兩組開窗與窗柱',g=>{
      [400,457].forEach(x=>window(g,x));
      for(const [a,b] of [[44,51],[101,108],[158,165],[215,222],[272,279],[329,336],[386,393],[443,450],[501,532]])wall(g,a,b,blue,126,188);
    }]
  ]);
  function door(g,x) {
    for(const side of [-1,1]) {
      rounded(g,'藍色手拉車門',[x+16,135,side*57],[32,126,17],darkBlue,1);
      rounded(g,'車門細長玻璃',[x+16,164,side*66],[16,46,3],glass,.7,'glass');
      bar(g,'銀色門把',[x+27,123,side*70],[x+27,144,side*70],2,frame);
      for(const y of [48,58,68]) brick(g,'登車階梯',x,y,side<0?-79:63,32,4,16,black,true);
    }
  }
  pack('安裝兩端登車門',[
    ['前端雙側手拉門與階梯',g=>door(g,8)],
    ['後端雙側手拉門與階梯',g=>door(g,536)],
    ['後端藍色端牆與風擋',g=>{
      for(const z of [-64,-32,0,32])brick(g,'後端面藍磚',570,72,z,6,126,32,blue);
      rounded(g,'後端黑色風擋',[580,134,0],[8,112,65],black,2);
      for(const side of [-1,1])brick(g,'後端側柱',568,73,side<0?-66:64,8,125,3,blue);
    }]
  ]);
  pack('拼出灰色弧形車頂',[[0,192],[192,384],[384,576]].map(([a,b],i)=>[
    ['前段灰色弧頂','中央灰色弧頂','後段灰色弧頂'][i],g=>roof(g,a,b,gray)
  ]));
  pack('加上復古細節',[
    ['前半段車頂通風帽',g=>{for(const x of [64,160,256])brick(g,'方形通風帽',x,216,-16,24,9,32,frame,true);}],
    ['後半段車頂通風帽',g=>{for(const x of [352,448,544])brick(g,'方形通風帽',x,216,-16,24,9,32,frame,true);}],
    ['四角銀色上車扶手',g=>{
      for(const side of [-1,1])for(const x of [4,43,532,572])bar(g,'粗銀色扶手',[x,92,side*72],[x,174,side*72],2.5,frame);
    }]
  ]);
  pack('完成客車端面',[
    ['前端藍色分段端牆',g=>{
      for(const z of [-64,-48,32,48])brick(g,'前端藍色立柱',0,72,z,10,126,16,blue,true);
      brick(g,'端門上方藍色橫梁',0,186,-32,10,14,64,blue,true);
    }],
    ['黑色貫通道風擋與端門',g=>{
      for(const z of [-33,26])rounded(g,'風擋厚直框',[-5,132,z],[10,110,9],black,2);
      for(const y of [79,185])rounded(g,'風擋厚橫框',[-5,y,0],[10,9,65],black,2);
      rounded(g,'端面藍色貫通門',[1,133,0],[7,96,44],darkBlue,1);
      rounded(g,'端門玻璃',[-4,154,0],[3,43,23],glass,.8,'glass');
    }],
    ['端面兩側標示燈與把手',g=>{
      for(const side of [-1,1]){
        rounded(g,'車尾小紅燈',[-7,181,side*49],[6,10,10],'#ac4038',2);
        bar(g,'端面扶手',[-8,98,side*48],[-8,154,side*48],2.6,frame);
      }
    }]
  ]);
  pack('藍皮客車準備出發',[
    ['端面下方寬踏板',g=>brick(g,'寬端面踏板',-12,67,-44,24,6,88,gray,true)],
    ['前端黑色防撞梁',g=>brick(g,'厚實防撞梁',-9,52,-55,16,13,110,black)],
    ['客車連結鉤',g=>coupler(g,-23)]
  ]);
  return model;
}

