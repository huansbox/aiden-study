/* Source-independent geometry activities. No progress, network, or rewards. */
(function(root) {
  'use strict';
  const TYPES = Object.freeze(['triangle_construct', 'bar_chart_draw', 'measure_tool']);
  const TYPE_UNITS = Object.freeze({triangle_construct: Object.freeze([24]), bar_chart_draw: Object.freeze([28]), measure_tool: Object.freeze([24])});
  const COMMON = ['id','subject','unit','type','text','subtopic','source','options','answer','interaction'];
  const obj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const keys = (x, required, optional = []) => obj(x) && required.every(k => Object.hasOwn(x,k)) && Object.keys(x).every(k => required.includes(k) || optional.includes(k));
  const num = (x,a,b) => typeof x === 'number' && Number.isFinite(x) && x >= a && x <= b;
  const integer = (x,a,b) => Number.isInteger(x) && num(x,a,b);
  const str = (x,n) => typeof x === 'string' && x.trim().length > 0 && x.length <= n;
  const arr = (x,a,b,fn) => Array.isArray(x) && x.length >= a && x.length <= b && x.every(fn);
  const esc = x => String(x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const assert = (ok,msg) => { if (!ok) throw new Error(msg); };
  const clone = x => JSON.parse(JSON.stringify(x));
  const norm = x => String(x).normalize('NFKC').replace(/\s+/g,'').toLowerCase();
  const numeric = s => typeof s === 'string' && /^\d{1,7}(?:\.\d{1,3})?$/.test(s.normalize('NFKC').trim()) ? Number(s.normalize('NFKC').trim()) : null;
  const point = (p,s) => arr(p,2,2,(v,i) => num(v,0,i ? s.height : s.width));
  const distance = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
  const angle = (p,i) => {
    const a=p[(i+1)%3], b=p[i], c=p[(i+2)%3], ab=distance(a,b), bc=distance(b,c);
    return ab && bc ? Math.acos(Math.max(-1,Math.min(1,((a[0]-b[0])*(c[0]-b[0])+(a[1]-b[1])*(c[1]-b[1]))/(ab*bc))))*180/Math.PI : 0;
  };
  const edges = [[0,1],[1,2],[2,0]];
  const near = (a,b,t) => Math.abs(a-b) <= t + 1e-8;
  function validateScene(s) {
    assert(keys(s,['width','height','pixelsPerCm'],['image']), '畫布欄位不符。');
    assert(num(s.width,240,2000) && num(s.height,180,1600) && num(s.pixelsPerCm,8,200), '原圖需要已查證的圖上公分比例尺。');
    if (s.image !== undefined) assert(typeof s.image === 'string' && s.image.length <= 6000000 && /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(s.image), '題圖必須是經整合端驗證的 PNG data URL。');
  }
  function validateQuestion(q) {
    assert(keys(q,COMMON,['material']), '幾何題共通欄位不符。');
    assert(q.subject==='math' && TYPES.includes(q.type) && TYPE_UNITS[q.type].includes(q.unit), '幾何題科目、題型或單元不符。');
    assert(str(q.id,120) && str(q.text,1000) && str(q.source,300) && str(q.subtopic,60), '幾何題文字無效。');
    assert(Array.isArray(q.options) && !q.options.length && q.answer==='', '幾何題需空 options 與空 answer。');
    if (q.material !== undefined) assert(obj(q.material),'material 必須是物件。');
    const it=q.interaction;
    if (q.type==='triangle_construct') {
      assert(keys(it,['scene','given','grid','constraints','marks','tolerance']), '作圖契約欄位不符。'); validateScene(it.scene);
      assert(it.grid===null || num(it.grid,4,100), '方格大小無效。');
      assert(arr(it.given,0,2,g=>keys(g,['index','point','label']) && integer(g.index,0,2) && point(g.point,it.scene) && typeof g.label==='string' && g.label.length<=8), '指定點無效。');
      assert(new Set(it.given.map(g=>g.index)).size===it.given.length,'指定點重複。');
      if(it.given.length===2) assert(distance(it.given[0].point,it.given[1].point)>1,'指定邊不可退化。');
      const c=it.constraints;
      assert(keys(c,['kind','legs','angle','reference']) && ['isosceles','right','apex','congruent'].includes(c.kind), '幾何條件無效。');
      assert(c.legs===null || arr(c.legs,2,2,x=>num(x,0.2,20)), '指定邊長無效。');
      assert(c.angle===null || num(c.angle,10,170), '指定角度無效。');
      assert(c.reference===null || arr(c.reference,3,3,p=>point(p,it.scene)), '參考三角形無效。');
      assert(c.kind==='apex' ? it.given.some(g=>g.index===0) && c.legs!==null && c.reference===null : c.legs===null && c.angle===null, '頂角題需指定第 1 點及兩邊長。');
      assert(c.kind==='congruent' ? c.reference!==null && angle(c.reference,0)>5 && angle(c.reference,1)>5 && angle(c.reference,2)>5 && it.given.some(g=>g.index===0) : c.reference===null, '全等題需來源參考座標及指定頂點。');
      const m=it.marks;
      assert(keys(m,['labels','rightAt','angleAt']) && arr(m.labels,0,3,x=>keys(x,['index','text']) && integer(x.index,0,2) && str(x.text,8)) && new Set(m.labels.map(x=>x.index)).size===m.labels.length, '頂點標記無效。');
      assert(m.rightAt===null || integer(m.rightAt,0,2), '直角標記無效。');
      assert(m.angleAt===null || keys(m.angleAt,['index','degrees']) && integer(m.angleAt.index,0,2) && num(m.angleAt.degrees,10,170), '角度標記無效。');
      assert(keys(it.tolerance,['lengthCm','angleDeg']) && num(it.tolerance.lengthCm,0.01,0.2) && num(it.tolerance.angleDeg,0.1,5), '容差超出安全範圍。');
    } else if(q.type==='bar_chart_draw') {
      assert(keys(it,['axis','bars','unit','title']), '長條圖契約欄位不符。');
      const a=it.axis;
      assert(keys(a,['min','max','step','minor','break','labels','below']) && num(a.min,0,100000) && num(a.max,a.min+1,100000) && num(a.step,1,10000) && num(a.minor,1,a.step) && typeof a.break==='boolean', '座標軸範圍無效。');
      const count=(a.max-a.min)/a.step, levels=(a.max-a.min)/a.minor;
      assert(integer(count,1,30) && integer(a.step/a.minor,1,20) && integer(levels,1,100) && (a.break ? a.min>0 : a.min===0), '座標軸間距或斷軸無效。');
      assert(arr(a.labels,count+1,count+1,(v,i)=>v===null || v===a.min+i*a.step) && arr(a.below,0,3,(v,i)=>num(v,0,a.min-1) && (i===0 || v>a.below[i-1])), '座標軸刻度位置無效。');
      assert(a.break || a.below.length===0, '非斷軸不能有下方刻度。');
      assert(arr(it.bars,1,8,b=>keys(b,['label','value','given','labelGiven']) && str(b.label,24) && num(b.value,a.min,a.max) && integer((b.value-a.min)/a.minor,0,100) && typeof b.given==='boolean' && typeof b.labelGiven==='boolean'), '長條資料無效。');
      assert(new Set(it.bars.map(b=>b.label)).size===it.bars.length && it.bars.some(b=>!b.given), '長條類別重複或沒有作答欄位。');
      assert(keys(it.unit,['text','required']) && str(it.unit.text,12) && typeof it.unit.required==='boolean', '單位欄位無效。');
      const t=it.title;
      assert(keys(t,['text','required','keywords']) && str(t.text,60) && typeof t.required==='boolean', '標題欄位無效。');
      assert(t.required ? arr(t.keywords,2,5,g=>arr(g,1,5,w=>str(w,16))) && t.keywords.every(g=>g.some(w=>norm(t.text).includes(norm(w)))) : Array.isArray(t.keywords) && !t.keywords.length, '標題需至少兩組意義條件。');
    } else {
      assert(keys(it,['scene','tools','outputs']), '量測契約欄位不符。'); validateScene(it.scene);
      assert(it.scene.image!==undefined, '量測題必須提供原 PNG 圖。');
      assert(arr(it.tools,1,3,t=>['ruler','protractor','square'].includes(t)) && new Set(it.tools).size===it.tools.length, '量測工具無效。');
      assert(arr(it.outputs,1,8,o=> {
        if(!obj(o) || !str(o.label,80)) return false;
        if(o.kind==='number') return keys(o,['kind','label','answer','tolerance','unit']) && num(o.answer,0,10000) && num(o.tolerance,0,5) && typeof o.unit==='string' && o.unit.length<=12;
        return keys(o,['kind','label','options','answer']) && ['single','set'].includes(o.kind) && arr(o.options,2,10,x=>str(x,24)) && new Set(o.options).size===o.options.length && arr(o.answer,1,o.kind==='single'?1:o.options.length,x=>integer(x,0,o.options.length-1)) && new Set(o.answer).size===o.answer.length;
      }), '量測答案欄位無效。');
    }
    return true;
  }
  function initial(q) {
    const it=q.interaction;
    if(q.type==='bar_chart_draw') return {heights:it.bars.map(b=>b.given?(b.value-it.axis.min)/it.axis.minor:null), labels:it.bars.map(b=>b.labelGiven?b.label:''), ticks:it.axis.labels.map(v=>v===null?'':String(v)), unit:it.unit.required?'':it.unit.text, title:it.title.required?'':it.title.text, active:Math.max(0,it.bars.findIndex(b=>!b.given))};
    const s={tool:{kind:'none',x:it.scene.width/3,y:it.scene.height/2,rotation:0}, used:[], active:0, zoom:1};
    if(q.type==='triangle_construct') return {...s, points:[0,1,2].map(i=>clone(it.given.find(g=>g.index===i)?.point || null)), edges:edges.map(e=>e.every(i=>it.given.some(g=>g.index===i))), labels:['','',''], rights:[false,false,false], angles:['','','']};
    return {...s, outputs:it.outputs.map(o=>o.kind==='number'?'':[])};
  }
  function sanitize(q,raw) {
    const s=initial(q), it=q.interaction;
    if(!obj(raw)) return s;
    const text=(x,n)=>typeof x==='string'?x.slice(0,n):'';
    if(q.type==='bar_chart_draw') {
      s.heights=s.heights.map((h,i)=>it.bars[i].given?h:integer(raw.heights?.[i],0,(it.axis.max-it.axis.min)/it.axis.minor)?raw.heights[i]:null);
      s.labels=s.labels.map((l,i)=>it.bars[i].labelGiven?l:text(raw.labels?.[i],24));
      s.ticks=s.ticks.map((v,i)=>it.axis.labels[i]===null?text(raw.ticks?.[i],12):v);
      s.unit=it.unit.required?text(raw.unit,12):s.unit; s.title=it.title.required?text(raw.title,60):s.title;
      s.active=integer(raw.active,0,it.bars.length-1)?raw.active:s.active; return s;
    }
    const allowed=q.type==='triangle_construct'?['ruler','protractor','square']:it.tools;
    if(obj(raw.tool)) {
      s.tool.kind=['none',...allowed].includes(raw.tool.kind)?raw.tool.kind:'none';
      s.tool.x=num(raw.tool.x,0,it.scene.width)?raw.tool.x:s.tool.x; s.tool.y=num(raw.tool.y,0,it.scene.height)?raw.tool.y:s.tool.y;
      s.tool.rotation=num(raw.tool.rotation,-360,360)?raw.tool.rotation:0;
    }
    s.used=Array.isArray(raw.used)?[...new Set(raw.used.filter(t=>allowed.includes(t)))]:[];
    s.zoom=[1,1.5,2].includes(raw.zoom)?raw.zoom:1;
    s.active=integer(raw.active,0,2)?raw.active:0;
    if(q.type==='triangle_construct') {
      s.points=s.points.map((p,i)=>p || (point(raw.points?.[i],it.scene)?clone(raw.points[i]):null));
      s.edges=s.edges.map((v,i)=>v || raw.edges?.[i]===true && edges[i].every(k=>s.points[k]));
      s.labels=s.labels.map((v,i)=>text(raw.labels?.[i],8)); s.rights=s.rights.map((v,i)=>raw.rights?.[i]===true); s.angles=s.angles.map((v,i)=>text(raw.angles?.[i],8));
    } else s.outputs=it.outputs.map((o,i)=>o.kind==='number'?text(raw.outputs?.[i],12):Array.isArray(raw.outputs?.[i])?[...new Set(raw.outputs[i].filter(v=>integer(v,0,o.options.length-1)))].slice(0,o.kind==='single'?1:o.options.length).sort((a,b)=>a-b):[]);
    return s;
  }
  function field(q,s,name,value) {
    const text=typeof value==='string'?value:'';
    const m=/^(tick|label|vertex|angle|output):(\d+)$/.exec(name);
    if(q.type==='bar_chart_draw') {
      if(name==='title') s.title=text; if(name==='unit') s.unit=text;
      if(m && m[1]==='tick' && Number(m[2])<s.ticks.length) s.ticks[Number(m[2])]=text;
      if(m && m[1]==='label' && Number(m[2])<s.labels.length) s.labels[Number(m[2])]=text;
    } else if(m && q.type==='triangle_construct' && Number(m[2])<3) {
      if(m[1]==='vertex') s.labels[Number(m[2])]=text;
      if(m[1]==='angle') s.angles[Number(m[2])]=text;
    } else if(m && m[1]==='output' && q.interaction.outputs?.[Number(m[2])]?.kind==='number') s.outputs[Number(m[2])]=text;
    return sanitize(q,s);
  }
  function update(q,raw,action,payload) {
    const s=sanitize(q,raw), it=q.interaction, value=typeof payload==='string'?payload:'';
    if(action==='clear') return initial(q);
    if(action==='field' && obj(payload) && typeof payload.field==='string') return field(q,s,payload.field,payload.value);
    if(q.type==='bar_chart_draw') {
      const levels=(it.axis.max-it.axis.min)/it.axis.minor;
      if(action==='bar' && integer(Number(value),0,it.bars.length-1)) s.active=Number(value);
      if(action==='height' && ['-1','1'].includes(value) && !it.bars[s.active].given) s.heights[s.active]=Math.max(0,Math.min(levels,(s.heights[s.active]??0)+Number(value)));
      if(action==='canvas' && obj(payload) && num(payload.x,80,620) && num(payload.y,40,360)) {
        const i=Math.min(it.bars.length-1,Math.floor((payload.x-80)/(540/it.bars.length)));
        if(!it.bars[i].given) {s.active=i;s.heights[i]=Math.round((360-payload.y)/320*levels);}
      }
      return s;
    }
    const allowed=q.type==='triangle_construct'?['ruler','protractor','square']:it.tools;
    if(action==='tool' && ['none',...allowed].includes(value)) s.tool.kind=value;
    if(action==='zoom' && ['1','1.5','2'].includes(value)) s.zoom=Number(value);
    if(action==='rotate' && ['-10','-1','1','10'].includes(value) && s.tool.kind!=='none') {s.tool.rotation=(s.tool.rotation+Number(value)+360)%360; s.used=[...new Set([...s.used,s.tool.kind])];}
    if(action==='vertex' && integer(Number(value),0,2)) {s.active=Number(value);s.tool.kind='none';}
    let p=null;
    if(action==='canvas' && obj(payload) && point([payload.x,payload.y],it.scene)) p=[payload.x,payload.y];
    if(action==='nudge' && ['left','right','up','down'].includes(value)) {
      const old=s.tool.kind==='none'?s.points?.[s.active] || [it.scene.width/2,it.scene.height/2]:[s.tool.x,s.tool.y];
      const step=s.tool.kind==='none'?(it.grid || it.scene.pixelsPerCm/20):it.scene.pixelsPerCm/20;
      p=[old[0]+(value==='left'?-step:value==='right'?step:0),old[1]+(value==='up'?-step:value==='down'?step:0)];
      p=[Math.max(0,Math.min(it.scene.width,p[0])),Math.max(0,Math.min(it.scene.height,p[1]))];
    }
    if(p && s.tool.kind!=='none') {s.tool.x=p[0];s.tool.y=p[1];s.used=[...new Set([...s.used,s.tool.kind])];}
    else if(p && q.type==='triangle_construct' && !it.given.some(g=>g.index===s.active)) {
      if(it.grid) p=p.map(v=>Math.round(v/it.grid)*it.grid);
      if(point(p,it.scene)) s.points[s.active]=p;
    }
    if(q.type==='triangle_construct') {
      if(action==='edge' && integer(Number(value),0,2)) {const i=Number(value);if(edges[i].every(k=>s.points[k]) && !edges[i].every(k=>it.given.some(g=>g.index===k))) s.edges[i]=!s.edges[i];}
      if(action==='right' && integer(Number(value),0,2)) s.rights[Number(value)]=!s.rights[Number(value)];
    } else if(action==='choice') {
      const m=/^(\d+):(\d+)$/.exec(value); if(m) {const i=Number(m[1]),j=Number(m[2]),o=it.outputs[i];
        if(o && o.kind!=='number' && j<o.options.length) s.outputs[i]=o.kind==='single'?[j]:s.outputs[i].includes(j)?s.outputs[i].filter(x=>x!==j):[...s.outputs[i],j].sort((a,b)=>a-b);
      }
    }
    return s;
  }
  function read(q,container,previousState) {
    let s=sanitize(q,previousState);
    if(container && typeof container.querySelectorAll==='function') for(const el of container.querySelectorAll('[data-geometry-field]')) s=field(q,s,el.dataset.geometryField,el.value);
    return s;
  }
  function complete(q,raw) {
    const s=sanitize(q,raw),it=q.interaction;
    if(q.type==='bar_chart_draw') return s.heights.every(x=>x!==null) && s.labels.every(x=>x.trim()) && s.ticks.every(x=>x.trim()) && !!s.unit.trim() && !!s.title.trim();
    if(q.type==='triangle_construct') return s.points.every(Boolean) && s.edges.every(Boolean) && it.marks.labels.every(m=>s.labels[m.index].trim()) && (it.marks.rightAt===null || s.rights[it.marks.rightAt]) && (it.marks.angleAt===null || !!s.angles[it.marks.angleAt.index].trim());
    return s.used.length>0 && it.outputs.every((o,i)=>o.kind==='number'?s.outputs[i].trim():s.outputs[i].length>0);
  }
  function grade(q,raw) {
    const s=sanitize(q,raw),it=q.interaction;
    if(!complete(q,s)) return false;
    if(q.type==='bar_chart_draw') return it.bars.every((b,i)=>it.axis.min+s.heights[i]*it.axis.minor===b.value && norm(s.labels[i])===norm(b.label)) && s.ticks.every((v,i)=>numeric(v)===it.axis.min+i*it.axis.step) && norm(s.unit)===norm(it.unit.text) && (!it.title.required || it.title.keywords.every(g=>g.some(w=>norm(s.title).includes(norm(w)))));
    if(q.type==='measure_tool') return it.outputs.every((o,i)=>o.kind==='number'?numeric(s.outputs[i])!==null && near(numeric(s.outputs[i]),o.answer,o.tolerance):s.outputs[i].length===o.answer.length && o.answer.every(x=>s.outputs[i].includes(x)));
    const p=s.points, c=it.constraints, t=it.tolerance, lengths=edges.map(([a,b])=>distance(p[a],p[b])/it.scene.pixelsPerCm), angles=p.map((_,i)=>angle(p,i));
    if(Math.min(...lengths)<0.2 || Math.min(...angles)<5 || Math.max(...angles)>170) return false;
    let ok=false;
    if(c.kind==='isosceles') ok=near(lengths[0],lengths[1],t.lengthCm)||near(lengths[1],lengths[2],t.lengthCm)||near(lengths[0],lengths[2],t.lengthCm);
    if(c.kind==='right') ok=angles.some(a=>near(a,90,t.angleDeg));
    if(c.kind==='apex') {
      const legs=[lengths[0],lengths[2]].sort((a,b)=>a-b), wanted=[...c.legs].sort((a,b)=>a-b);
      ok=legs.every((x,i)=>near(x,wanted[i],t.lengthCm)) && (c.angle===null || near(angles[0],c.angle,t.angleDeg));
    }
    if(c.kind==='congruent') {
      const wanted=edges.map(([a,b])=>distance(c.reference[a],c.reference[b])/it.scene.pixelsPerCm).sort((a,b)=>a-b);
      ok=[...lengths].sort((a,b)=>a-b).every((x,i)=>near(x,wanted[i],t.lengthCm)) && near(angles[0],angle(c.reference,0),t.angleDeg);
    }
    return ok && it.marks.labels.every(m=>norm(s.labels[m.index])===norm(m.text)) && s.rights.every((v,i)=>!v || near(angles[i],90,t.angleDeg)) && s.angles.every((v,i)=>!v.trim() || numeric(v)!==null && near(numeric(v),angles[i],t.angleDeg)) && (it.marks.angleAt===null || numeric(s.angles[it.marks.angleAt.index])===it.marks.angleAt.degrees);
  }
  function answerText(q) {
    const it=q.interaction;
    if(q.type==='bar_chart_draw') return `${it.bars.map(b=>b.label+'：'+b.value).join('、')}；刻度：${it.axis.labels.map((_,i)=>it.axis.min+i*it.axis.step).join('、')}；單位：${it.unit.text}；標題範例：${it.title.text}`;
    if(q.type==='measure_tool') return it.outputs.map(o=>`${o.label}：${o.kind==='number'?o.answer+o.unit:o.answer.map(i=>o.options[i]).join('、')}`).join('；');
    const c=it.constraints;
    return (c.kind==='isosceles'?'用指定邊畫出至少兩邊等長的三角形。':c.kind==='right'?'畫出一個角為 90 度的三角形。':c.kind==='congruent'?'先量參考圖；在指定頂點畫出對應角相等、三邊分別相等的三角形。':`指定頂點旁的兩邊為 ${c.legs.join('、')} 公分${c.angle===null?'':`，夾角為 ${c.angle} 度`}。`) + '完成題目要求的頂點、角度或直角標記。';
  }
  const semantic=q=>JSON.stringify([q.type,q.interaction]);
  function button(label,action,value,disabled,pressed=false) {return `<button type="button" data-geometry-action="${esc(action)}" data-geometry-value="${esc(value)}"${disabled?' disabled':''} aria-pressed="${pressed}">${esc(label)}</button>`;}
  function input(label,name,value,disabled,max=24,numericMode=false) {return `<label>${esc(label)}<input data-geometry-field="${esc(name)}" aria-label="${esc(label)}" value="${esc(value)}" maxlength="${max}"${numericMode?' inputmode="decimal"':''}${disabled?' disabled':''}></label>`;}
  const textSvg=(x,y,value,extra='')=>`<text x="${x}" y="${y}" ${extra}>${esc(value)}</text>`;
  function toolSvg(scene,t) {
    if(t.kind==='none') return '';
    const cm=scene.pixelsPerCm, len=Math.min(10,Math.floor(scene.width/cm)), r=Math.min(180,scene.width/3), lines=[];
    if(t.kind==='ruler') {
      lines.push(`<rect x="-8" y="0" width="${len*cm+16}" height="44" rx="4" fill="#fff2b8" fill-opacity=".6"/>`);
      for(let n=0;n<=len*10;n++) {const x=n*cm/10;lines.push(`<path d="M${x} 0v${n%10===0?20:n%5===0?14:8}"/>`);if(n%10===0) lines.push(textSvg(x,36,n/10,'text-anchor="middle"'));}
      lines.push(textSvg(5,61,'圖上 cm'));
    } else if(t.kind==='square') {
      const side=Math.min(150,cm*4);lines.push(`<path d="M0 0H${side}L0 ${-side}Z M14 0v-14H0" fill="#caf0fa" fill-opacity=".35"/>`);lines.push(textSvg(22,-18,'90°'));
    } else {
      lines.push(`<path d="M${-r} 0A${r} ${r} 0 0 1 ${r} 0Z" fill="#caf0fa" fill-opacity=".3"/>`);
      for(let d=0;d<=180;d++) {
        const a=d*Math.PI/180, inner=r-(d%10===0?15:d%5===0?10:5), x=Math.cos(a),y=-Math.sin(a);
        lines.push(`<path d="M${x*r} ${y*r}L${x*inner} ${y*inner}"/>`);
        if(d%10===0) {lines.push(textSvg(x*(r-28),y*(r-28)+4,d,'text-anchor="middle"'));lines.push(textSvg(x*(r-49),y*(r-49)+4,180-d,'text-anchor="middle" class="sg-secondary"'));}
      }
      lines.push('<path d="M-8 0H8M0 -8V8"/>');
    }
    return `<g class="sg-tool" pointer-events="none" transform="translate(${t.x} ${t.y}) rotate(${t.rotation})">${lines.join('')}</g>`;
  }
  function triangleSvg(it,s) {
    const out=[];
    if(it.grid) for(let x=0;x<=it.scene.width;x+=it.grid) out.push(`<path class="sg-grid" d="M${x} 0V${it.scene.height}"/>`);
    if(it.grid) for(let y=0;y<=it.scene.height;y+=it.grid) out.push(`<path class="sg-grid" d="M0 ${y}H${it.scene.width}"/>`);
    if(it.constraints.reference && !it.scene.image) {out.push(`<polygon class="sg-reference" points="${it.constraints.reference.map(p=>p.join(',')).join(' ')}"/>`);it.constraints.reference.forEach((p,i)=>out.push(textSvg(p[0]+10,p[1]-10,['A','B','C'][i])));}
    edges.forEach(([a,b],i)=>{if(s.edges[i]&&s.points[a]&&s.points[b]) out.push(`<path class="sg-edge" d="M${s.points[a].join(' ')}L${s.points[b].join(' ')}"/>`);});
    s.points.forEach((p,i)=>{if(!p)return;out.push(`<circle class="sg-point${s.active===i?' sg-active':''}" cx="${p[0]}" cy="${p[1]}" r="6"/>`);out.push(textSvg(p[0]+11,p[1]-12,s.labels[i] || it.given.find(g=>g.index===i)?.label || `點${i+1}`));
      if(s.angles[i]) out.push(textSvg(p[0]+12,p[1]+24,s.angles[i]+'°'));
      if(s.rights[i] && s.points.every(Boolean)) {const a=s.points[(i+1)%3],b=s.points[(i+2)%3],da=distance(a,p),db=distance(b,p);if(da&&db){const u=[(a[0]-p[0])/da*15,(a[1]-p[1])/da*15],v=[(b[0]-p[0])/db*15,(b[1]-p[1])/db*15];out.push(`<path class="sg-edge" d="M${p[0]+u[0]} ${p[1]+u[1]}l${v.join(' ')}l${-u[0]} ${-u[1]}"/>`);}}
    }); return out.join('');
  }
  function geometryRender(q,s,disabled) {
    const it=q.interaction, scene=it.scene, tri=q.type==='triangle_construct', tools=tri?['ruler','protractor','square']:it.tools;
    let h=`<p>${tri?'先選頂點，再點畫布放點；接著連三邊，最後加標記。':'選工具，再點圖上的起點；移動或旋轉工具來檢查。'}</p><div class="sg-controls">`;
    h+=button(tri?'放頂點':'收起工具','tool','none',disabled,s.tool.kind==='none');
    for(const tool of tools) h+=button({ruler:'直尺',protractor:'量角器',square:'三角板'}[tool],'tool',tool,disabled,s.tool.kind===tool);
    h+='</div>';
    if(tri) h+='<div class="sg-controls">'+[0,1,2].map(i=>button(`選頂點 ${i+1}${it.given.some(g=>g.index===i)?'（固定）':''}`,'vertex',i,disabled,s.active===i)).join('')+'</div>';
    h+=`<p class="sg-status">${s.tool.kind==='none'?(tri?`目前選取：頂點 ${s.active+1}`:'尚未選工具'):`工具方向：${s.tool.rotation}°`}。工具的公分以題圖比例為準。</p>`;
    if(s.tool.kind!=='none') h+=`<p>${{ruler:'把 0 刻度放在線段起點，旋轉尺讓尺邊貼齊線段。',protractor:'把中心放在角的頂點，直邊對齊一邊；從這一邊的 0 開始讀另一邊。',square:'把三角板的直角貼在頂點，旋轉看看兩邊是否對齊。'}[s.tool.kind]}</p>`;
    h+='<div class="sg-controls" aria-label="圖與工具一起縮放">'+[['1','看全圖'],['1.5','放大刻度'],['2','再放大']].map(([v,l])=>button(l,'zoom',v,disabled,s.zoom===Number(v))).join('')+'</div>';
    h+=`<div class="sg-scroll"><svg class="sg-canvas" style="min-width:${s.zoom===1?560:Math.max(560,scene.width*s.zoom)}px" viewBox="0 0 ${scene.width} ${scene.height}" width="${scene.width}" height="${scene.height}" role="img" aria-label="${tri?'三角形作圖區':'原圖量測區'}"${disabled?'':' data-geometry-action="canvas"'}><rect width="100%" height="100%" fill="white"/>${scene.image?`<image href="${esc(scene.image)}" x="0" y="0" width="${scene.width}" height="${scene.height}" preserveAspectRatio="none"/>`:''}${tri?triangleSvg(it,s):''}${toolSvg(scene,s.tool)}</svg></div>`;
    h+='<div class="sg-controls" aria-label="位置微調">'+[['left','向左'],['right','向右'],['up','向上'],['down','向下']].map(([v,l])=>button(l,'nudge',v,disabled)).join('')+'</div>';
    h+='<div class="sg-controls" aria-label="旋轉工具">'+[-10,-1,1,10].map(v=>button(`旋轉 ${v>0?'+':''}${v}°`,'rotate',v,disabled || s.tool.kind==='none')).join('')+'</div>';
    if(tri) {
      h+='<div class="sg-controls">'+edges.map(([a,b],i)=>button(`連線 ${a+1}－${b+1}`,'edge',i,disabled || !s.points[a] || !s.points[b] || edges[i].every(k=>it.given.some(g=>g.index===k)),s.edges[i])).join('')+'</div>';
      if(it.marks.labels.length || it.marks.rightAt!==null || it.marks.angleAt!==null) {
        h+='<fieldset><legend>自己加上題目要求的標記</legend>';
        for(const m of it.marks.labels) h+=input(`頂點 ${m.index+1} 名稱`,`vertex:${m.index}`,s.labels[m.index],disabled,8);
        if(it.marks.angleAt!==null) {const i=it.marks.angleAt.index;h+=input(`頂點 ${i+1} 角度（度）`,`angle:${i}`,s.angles[i],disabled,8,true);}
        if(it.marks.rightAt!==null) h+=button(`在頂點 ${it.marks.rightAt+1} 加直角記號`,'right',it.marks.rightAt,disabled,s.rights[it.marks.rightAt]);
        h+='</fieldset>';
      }
    } else {
      h+=`<p class="sg-status">${s.used.length?'已操作量測工具，請填判斷。':'先移動工具檢查原圖，再作答。'}</p>`;
      it.outputs.forEach((o,i)=>{h+=`<fieldset><legend>${esc(o.label)}</legend>`;h+=o.kind==='number'?input(`量得的值（${o.unit}）`,`output:${i}`,s.outputs[i],disabled,12,true):o.options.map((v,j)=>button(v,'choice',`${i}:${j}`,disabled,s.outputs[i].includes(j))).join('');h+='</fieldset>';});
    }
    return h;
  }
  function barRender(q,s,disabled) {
    const it=q.interaction,a=it.axis,levels=(a.max-a.min)/a.minor, n=it.bars.length, bw=540/n;
    let h='<p>依資料表選一根長條，在圖上點高度；可用「加一小格／減一小格」微調。</p><div class="sg-scroll"><table><caption>統計表</caption><thead><tr><th>類別</th>'+it.bars.map(b=>`<th>${esc(b.label)}</th>`).join('')+'</tr></thead><tbody><tr><th>'+esc(it.unit.text)+'</th>'+it.bars.map(b=>`<td>${b.value}</td>`).join('')+'</tr></tbody></table></div>';
    if(it.title.required) h+=input('長條圖標題','title',s.title,disabled,60);
    if(it.unit.required) h+=input('單位','unit',s.unit,disabled,12);
    h+=`<div class="sg-scroll"><svg class="sg-canvas sg-chart" width="660" height="480" viewBox="0 0 660 480" role="img" aria-label="長條圖作圖區"${disabled?'':' data-geometry-action="canvas"'}><rect width="660" height="480" fill="white"/>${textSvg(330,22,s.title || '（請寫標題）','text-anchor="middle"')}${textSvg(5,30,s.unit || '（單位）')}`;
    for(let l=0;l<=levels;l++) h+=`<path class="sg-grid" d="M80 ${360-l/levels*320}H620"/>`;
    h+='<path class="sg-edge" d="M80 40V360H620"/>';
    s.ticks.forEach((v,i)=>{h+=textSvg(70,365-i*a.step/a.minor/levels*320,v || '□','text-anchor="end"');});
    if(a.break) {h+='<path class="sg-edge" d="M75 371l10 -6M75 379l10 -6"/>';a.below.forEach((v,i)=>{h+=textSvg(70,400+(a.below.length-1-i)*20,v,'text-anchor="end"');});}
    s.heights.forEach((v,i)=>{if(v!==null){const height=v/levels*320;h+=`<rect class="sg-bar${it.bars[i].given?' sg-given':''}" x="${80+i*bw+bw*.22}" y="${360-height}" width="${bw*.56}" height="${height}"/>`;}h+=textSvg(80+(i+.5)*bw,452,s.labels[i] || `（類別${i+1}）`,'text-anchor="middle"');});
    h+='</svg></div><div class="sg-controls">'+it.bars.map((b,i)=>button(`第 ${i+1} 根${b.given?'（已畫）':''}`,'bar',i,disabled || b.given,s.active===i)).join('')+'</div>';
    h+='<div class="sg-controls">'+button('減一小格','height','-1',disabled || it.bars[s.active].given)+button('加一小格','height','1',disabled || it.bars[s.active].given)+'</div>';
    if(a.labels.some(v=>v===null)) h+='<fieldset><legend>縱軸刻度（由下往上）</legend>'+a.labels.map((v,i)=>v===null?input(`第 ${i+1} 個刻度`,`tick:${i}`,s.ticks[i],disabled,12,true):`<span class="sg-known">已給：${v}</span>`).join('')+'</fieldset>';
    if(it.bars.some(b=>!b.labelGiven)) h+='<fieldset><legend>類別名稱（由左往右）</legend>'+it.bars.map((b,i)=>b.labelGiven?'':input(`第 ${i+1} 個類別`,`label:${i}`,s.labels[i],disabled,24)).join('')+'</fieldset>';
    return h;
  }
  function render(q,raw,disabled=false) {
    const s=sanitize(q,raw);
    return `<section class="study-geometry" data-geometry-type="${esc(q.type)}">${q.type==='bar_chart_draw'?barRender(q,s,disabled):geometryRender(q,s,disabled)}<div class="sg-controls">${button('重新開始','clear','',disabled)}</div></section>`;
  }
  root.StudyMathGeometry=Object.freeze({TYPES,TYPE_UNITS,validateQuestion,initial,render,update,read,complete,grade,answerText,semantic});
})(typeof window!=='undefined'?window:globalThis);
