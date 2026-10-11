import { trainParts } from './train-parts.js';

export function createEmu900Model(material) {
  const {model,pack,track,wheel,bogie,chassis,wall,belt,roof,vent,coupler,brick,rounded,slope,cylinder} =
    trainParts(material,'臺鐵 EMU900・單節先頭車');
  const silver='#c7cdce', light='#dde0dd', gray='#879397', green='#79b934', black='#252c34', glass='#29434d';
  track();
  pack('組裝前轉向架',[
    ['前轉向架第一輪軸',g=>wheel(g,112)],['前轉向架第二輪軸',g=>wheel(g,160)],
    ['前轉向架側梁與軸箱',g=>bogie(g,96)]
  ]);
  pack('組裝後轉向架',[
    ['後轉向架第一輪軸',g=>wheel(g,432)],['後轉向架第二輪軸',g=>wheel(g,480)],
    ['後轉向架側梁與軸箱',g=>bogie(g,416)]
  ]);
  pack('拼出銀灰車底',[[0,192],[192,384],[384,576]].map(([a,b],i)=>[
    ['前段底盤與裙邊','中段底盤與設備','後段底盤與設備'][i],g=>{
      chassis(g,a,b);
      if(i===1) for(const x of [208,256,304,352]) brick(g,'車底設備箱',x,30,-48,32,26,96,gray,true);
    }
  ]));
  pack('疊出銀色長車身',[[80,256],[256,416],[416,576]].map(([a,b],i)=>[
    ['前段銀色車身','中段銀色車身','後段銀色車身'][i],g=>{
      wall(g,a,b,silver);belt(g,a,b,115,green,10);
      for(const side of [-1,1]) brick(g,'車身上緣長梁',a,190,side<0?-64:48,b-a,10,16,silver,true);
    }
  ]));
  pack('組成綠色微笑車頭',[
    ['銀灰階梯形下車鼻',g=>{
      for(const z of [-64,-32,0,32]) slope(g,'下鼻短斜磚',[[0,72],[80,72],[80,132],[22,132],[0,100]],z,32,silver);
    }],
    ['黑色駕駛室斜面與側肩',g=>{
      for(const z of [-48,-16,16]) slope(g,'黑色駕駛面短磚',[[18,130],[80,130],[80,202],[64,202]],z,32,black);
      for(const side of [-1,1]) slope(g,'銀色駕駛室側肩',[[20,125],[96,125],[96,200],[68,200]],side<0?-64:48,16,light);
    }],
    ['亮綠色微笑腰帶',g=>{
      for(const z of [-48,-16,16]) slope(g,'車頭綠色微笑橫磚',[[9,112],[31,112],[38,131],[21,131]],z,32,green);
      for(const side of [-1,1]) slope(g,'微笑兩側上揚綠磚',[[10,113],[80,115],[80,132],[27,140]],side<0?-66:62,4,green);
    }]
  ]);
  const doorStarts=[132,300,492], windows=[[196,241],[365,414],[551]];
  function window(g,x,width=36) {
    for(const side of [-1,1]) {
      rounded(g,'銀灰窗框',[x+width/2,156,side*57],[width+6,62,17],light,1);
      rounded(g,'深色客窗',[x+width/2,156,side*66],[width,51,3],glass,1,'glass');
    }
  }
  pack('裝上通勤客窗',windows.map((starts,i)=>[
    ['前段雙側大客窗','中段雙側大客窗','後段客窗與窗柱'][i],g=>{
      for(const x of starts) window(g,x,x===551?17:36);
      // Visible structural pillars between doors/windows; no solid wall behind glazing.
      const ranges=[[80,132],[184,196],[232,241],[277,300],[352,365],[401,414],[450,492],[544,551],[568,576]];
      if(i===2) for(const [a,b] of ranges) wall(g,a,b,silver,124,190);
    }
  ]));
  pack('安裝三組雙扇乘客門',doorStarts.map((x,i)=>[
    ['前段雙扇乘客門','中央雙扇乘客門','後段雙扇乘客門'][i],g=>{
      for(const side of [-1,1]) {
        brick(g,'乘客門框',x-2,73,side<0?-66:49,54,120,17,gray);
        for(const dx of [0,26]) {
          rounded(g,'獨立銀色門片',[x+dx+12,132,side*66],[24,116,3],silver,1);
          rounded(g,'門片深色窄窗',[x+dx+12,161,side*68],[12,46,2],glass,.7,'glass');
          brick(g,'門片綠色腰帶',x+dx,115,side<0?-70:68,24,10,2,green);
        }
        brick(g,'寬登車踏板',x,67,side<0?-75:63,52,5,12,black,true);
      }
    }
  ]));
  pack('封好車頂與車尾',[
    ['駕駛室上方凸點屋頂',g=>roof(g,80,224,silver)],
    ['中央分段弧形屋頂',g=>roof(g,224,416,silver)],
    ['後段弧頂與連通門',g=>{
      roof(g,416,576,silver);
      for(const z of [-64,-32,0,32]) brick(g,'車尾端面磚',570,74,z,6,128,32,silver);
      rounded(g,'車尾風擋',[579,137,0],[7,115,72],black,2);
      for(const side of [-1,1]) brick(g,'車尾端面側收口',568,75,side<0?-67:65,8,120,2,gray);
    }]
  ]);
  pack('裝上灰色車頂設備',[
    ['前段厚磚空調機',g=>vent(g,192,gray)],
    ['後段厚磚空調機',g=>vent(g,424,gray)],
    ['駕駛室天線與通風蓋',g=>{
      brick(g,'天線底板',96,214,-16,32,5,32,gray,true);
      cylinder(g,'短天線',[112,231,0],4,24,black,'y');
      for(const x of [288,352,536]) brick(g,'車頂小通風蓋',x,214,-16,24,7,32,gray,true);
    }]
  ]);
  pack('完成黑色駕駛窗',[
    ['分片深色前擋風玻璃',g=>{
      for(const z of [-43,1]) {
        // Mount the glass in front of the sloping cab face, with a readable rim.
        slope(g,'前擋玻璃窄灰框',[[27,149],[32,149],[60,194],[55,194]],z,42,gray);
        slope(g,'可見前擋玻璃斜片',[[28,153],[31,153],[55,190],[52,190]],z+3,36,glass);
      }
      for(const z of [-30,18]) brick(g,'窗下短雨刷',27,144,z,12,4,22,black);
    }],
    ['兩側駕駛窗與乘務門',g=>{
      for(const side of [-1,1]) {
        rounded(g,'駕駛側窗',[95,164,side*67],[32,42,3],glass,1,'glass');
        rounded(g,'乘務門窄窗',[119,157,side*67],[13,48,3],glass,1,'glass');
      }
    }],
    ['車頭上方目的地顯示框',g=>{
      slope(g,'黑色目的地顯示外框',[[54,190],[70,190],[77,201],[64,201]],-35,70,black);
      slope(g,'深灰目的地顯示片',[[52,191],[55,191],[66,198],[63,198]],-27,54,gray);
    }]
  ]);
  pack('EMU900 準備出發',[
    ['車頭兩側圓形燈組',g=>{
      for(const side of [-1,1]) {
        cylinder(g,'頭燈底座',[18,136,side*40],9,5,black,'x');
        cylinder(g,'明亮頭燈',[14,136,side*40],6,3,'#fff2cd','x');
      }
    }],
    ['車頭下方防撞裙板',g=>{
      slope(g,'銀灰裙板斜磚',[[-9,48],[22,48],[30,73],[0,73]],-56,112,gray);
      brick(g,'黑色防撞厚梁',-7,51,-48,12,10,96,black);
    }],
    ['前端中央玩具車鉤',g=>coupler(g,-17)]
  ]);
  return model;
}

