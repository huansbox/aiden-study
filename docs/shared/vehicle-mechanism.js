(() => {
  "use strict";
  const global = typeof window === "undefined" ? globalThis : window;
  const pack = n => [1, 2, 3].map(i => `p${n}-${i}`);
  const span = (from, to) => Array.from({length: to - from + 1}, (_, i) => pack(from + i)).flat();
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"})[ch]);
  // Each unit names the ORIGINAL saved PNG parts and its actual supports.
  // Values are temporary observations; the module has no collection or storage.
  const specs = {
    "jet-plane": {name:"雙引擎噴射客機", units:[
      {id:"wings", title:"機翼接合", required:["p3-2", ...pack(5)], parts:[...span(5,7),"p11-1","p11-2"], motion:"wings", open:"展開", close:"接合", axis:"vertical", packs:[4]},
      {id:"fan-left", title:"左噴射風扇", required:[...pack(5), ...pack(6)], parts:["p6-3"], motion:"spin", open:"試轉", close:"復位", packs:[5]},
      {id:"fan-right", title:"右噴射風扇", required:[...pack(5), ...pack(7)], parts:["p7-3"], motion:"spin", open:"試轉", close:"復位", packs:[6]},
    ]},
    excavator: {name:"怪手", units:[
      {id:"boom", title:"大臂", required:["p4-1", ...pack(7)], parts:[...pack(7), ...pack(8), "p9-1", "p9-2"], motion:"raise", pivot:"p7-3", angle:-24, axis:"vertical", open:"抬起", close:"放低", packs:[6]},
      {id:"stick", title:"小臂", required:[...pack(7), ...pack(8)], parts:[...pack(8), "p9-1", "p9-2"], motion:"raise", pivot:"p8-1", angle:32, axis:"vertical", open:"收臂", close:"伸臂", packs:[7]},
      {id:"bucket", title:"鏟斗", required:[...pack(7), ...pack(8), "p9-1", "p9-2"], parts:["p9-1", "p9-2"], motion:"raise", pivot:"p9-1", angle:-55, axis:"vertical", open:"挖起", close:"倒出", packs:[8]},
      {id:"turntable", title:"旋轉座與上車", required:span(4,10).filter(id=>id!=='p9-3'), parts:span(4,10).filter(id=>id!=='p9-3'), motion:"pose", open:"試轉", close:"回正", packs:[9]},
    ], cargo:"p9-3", cargoUnit:"bucket"},
    "snow-blower": {name:"旋轉拋雪車", units:[
      {id:"auger", title:"螺旋集雪筒", required:[...pack(7), ...pack(8)], parts:["p8-1", "p8-2"], motion:"pose", open:"轉動", close:"復位", packs:[7]},
      {id:"chute", title:"拋雪管", required:[...pack(7), ...pack(8), ...pack(9)], parts:["p9-3"], motion:"raise", pivot:"p9-3", angle:-32, axis:"vertical", open:"調高管口", close:"放低管口", packs:[8]},
      {id:"snow", title:"集雪與拋雪", required:[...span(7,9), "p10-3"], parts:[], motion:"cargo", open:"集雪拋出", close:"回到雪堆", packs:[9]},
    ], cargo:"p10-3", cargoUnit:"snow"},
    "mobile-crane": {name:"伸縮吊車", units:[
      {id:"supports", title:"支撐腳", required:pack(4), parts:pack(4), motion:"pose", frameCount:5, open:"伸出", close:"收回", packs:[3]},
      {id:"telescope", title:"伸縮臂", required:[...pack(4), ...pack(6), ...pack(7)], parts:["p7-2", "p7-3", ...pack(8)], motion:"telescope", depends:"supports", dependsMin:1, open:"伸長", close:"縮回", packs:[6]},
      {id:"hoist", title:"吊鉤與積木箱", required:[...pack(4), ...pack(6), ...span(7,9)], parts:["p8-2","p8-3", ...pack(9)], motion:"hoist", depends:"supports", dependsMin:1, axis:"vertical", open:"吊起", close:"放下", packs:[8]},
    ]},
    "cement-mixer": {name:"水泥攪拌車", units:[
      {id:"drum", title:"攪拌筒", required:[...span(5,8)], parts:span(6,7), motion:"pose", pivot:"p6-2", open:"轉筒", close:"復位", packs:[7]},
      {id:"gutter", title:"卸料槽", required:[...span(5,8)], parts:["p8-2"], motion:"raise", pivot:"p8-2", angle:22, open:"放下", close:"收回", packs:[7]},
      {id:"pour", title:"積木出料", required:[...span(5,8), "p10-3"], parts:[], motion:"cargo", depends:"gutter", open:"出料", close:"復位", packs:[9]},
    ], cargo:"p10-3", cargoUnit:"pour"},
    "recycling-truck": {name:"資源回收車", units:[
      {id:"bin", title:"舉桶倒入", required:[...pack(5), ...pack(6), ...pack(8), ...pack(9)], parts:[...pack(8), ...pack(9)], motion:"bin", pivot:"p8-3", axis:"vertical", open:"舉桶倒入", close:"放回", packs:[8]},
      {id:"tip", title:"抬斗卸料", required:[...span(5,7), "p10-1"], parts:[...span(5,9),"p10-1","p10-2"], motion:"tip", pivot:"p5-1", angle:-24, axis:"vertical", open:"抬斗", close:"放平", packs:[9]},
    ], cargo:"p10-3", cargoUnit:"tip"},
  };
  const sourcesIn = svg => [...(svg || "").matchAll(/href="([^"]+)"/g)].map(match => match[1]);
  const multiply = (a,b) => [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
  const mapped = (m,p) => [m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]];
  const matrixText = matrix => `matrix(${matrix.map(n=>Math.abs(n)<1e-10?0:Number(n.toFixed(8))).join(' ')})`;
  function planeMatrices(motion) {
    const [a,b,c,d]=motion.basis,[x,y]=motion.pivot,det=a*d-b*c;
    return {forward:[a,b,c,d,x,y],inverse:[d/det,-b/det,-c/det,a/det,(c*y-d*x)/det,(b*x-a*y)/det]};
  }
  // A * R * A^-1 turns the original projected plane around its real hinge.
  // In particular, a fan's outer projected ellipse stays on the engine axis.
  function planarRotation(motion, angle) {
    const [a,b,c,d]=motion.basis, [x,y]=motion.pivot, det=a*d-b*c;
    if(!Number.isFinite(det) || Math.abs(det)<1e-8) return [1,0,0,1,0,0];
    const radians=angle*Math.PI/180,cs=Math.cos(radians),sn=Math.sin(radians);
    return multiply(multiply([a,b,c,d,x,y],[cs,sn,-sn,cs,0,0]),[d/det,-b/det,-c/det,a/det,(c*y-d*x)/det,(b*x-a*y)/det]);
  }
  function hingedSurface(motion,angle,face='yz') {
    const [xx,xy,yx,yy]=motion.basis,[x,y]=motion.pivot;
    // The fixed authoring camera is orthographic, one pixel per world unit,
    // looking from positive Z. Recover its third basis column from its rows.
    const zx=Math.sqrt(Math.max(0,1-xx*xx-yx*yx));
    if(zx<1e-5)return planarRotation(motion,angle);
    const zy=-(xx*xy+yx*yy)/zx,r=angle*Math.PI/180,cs=Math.cos(r),sn=Math.sin(r);
    const a=face==='yz'?yx:xx,b=face==='yz'?yy:xy,det=a*zy-b*zx;
    if(Math.abs(det)<1e-8)return planarRotation(motion,angle);
    const next=face==='yz'?[cs*yx-sn*xx,cs*yy-sn*xy]:[cs*xx+sn*yx,cs*xy+sn*yy];
    // The entire long Z hinge stays fixed; only its YZ door or XZ lid moves.
    return multiply([next[0],next[1],zx,zy,x,y],[zy/det,-b/det,-zx/det,a/det,(zx*y-zy*x)/det,(b*x-a*y)/det]);
  }
  function segmentTransform(base,tip,end) {
    const dx=tip[0]-base[0],dy=tip[1]-base[1],length=Math.hypot(dx,dy);
    const nx=end[0]-base[0],ny=end[1]-base[1],nextLength=Math.hypot(nx,ny);
    if(length<1e-5 || nextLength<1e-5) return [1,0,0,1,0,0];
    const original=[dx,dy,-dy/length,dx/length,base[0],base[1]], det=length;
    const inverse=[original[3]/det,-original[1]/det,-original[2]/det,original[0]/det,
      (original[2]*base[1]-original[3]*base[0])/det,(original[1]*base[0]-original[0]*base[1])/det];
    return multiply([nx,ny,-ny/nextLength,nx/nextLength,base[0],base[1]],inverse);
  }
  const fullArt = part => part.variants?.find(variant => variant.mask === 0)?.svg || part.svg;
  const artFor = (part, ids) => {
    const mask = (part.occlusionPeers || []).reduce((sum, id, i) => sum | (ids.has(id) ? 1 << i : 0), 0);
    return part.variants?.find(variant => variant.mask === mask)?.svg || part.svg;
  };
  const hand = '<svg viewBox="0 0 80 60" aria-hidden="true"><path d="M25 45V17c0-7 9-7 9 0v16-9c0-6 9-6 9 0v8-5c0-6 9-6 9 0v10-6c0-6 9-6 9 0v11c0 13-10 17-19 17-7 0-13-4-17-9L15 39c-4-6 3-11 7-6l8 9" fill="#fff1d5" stroke="#397982" stroke-width="3"/><path d="m8 16 7-7 7 7M15 9v17M62 17l9-7 7 7M71 10v17" fill="none" stroke="#397982" stroke-width="3"/></svg>';

  function create(model) {
    const spec = specs[model?.id];
    if (!spec) return null;
    const parts = model.steps.flatMap(step => step.parts).sort((a,b) => a.z-b.z);
    const byId = id => parts.find(part => part.id === id);
    const movableArt = part => model.mechanismArt?.[part.id]?.svg || fullArt(part);
    const units = spec.units;
    const poseSets = model.mechanismPoses || {};
    const poseSource = frame => frame.src || sourcesIn(frame.svg)[0];
    const posesReady = kind => {
      const frames=poseSets[kind]?.frames,expected=units.find(unit=>unit.id===kind)?.frameCount;
      return Array.isArray(frames) && frames.length>=4 && (!expected || frames.length===expected) && frames.every(frame=>poseSource(frame));
    };
    const poseFrame = (kind,amount) => {
      const frames=poseSets[kind].frames,position=amount*(frames.length-1);
      // The fully deployed support image must agree with its unlock gate.
      return frames[kind==='supports' ? Math.floor(position) : Math.round(position)];
    };
    const values = Object.fromEntries(units.map(unit => [unit.id, 0]));
    const featureIds = new Set(units.flatMap(unit => [...unit.required, ...unit.parts]));
    if (spec.cargo) featureIds.add(spec.cargo);
    let placed = new Set(), current = units[0].required.at(-1), trialAnimation = null;
    const reduced = () => global.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
    const installed = (unit, ids = placed) => !!unit && unit.required.every(id => ids.has(id));
    const can = (unit, ids = placed) => installed(unit, ids) && (unit.motion!=='pose' || posesReady(unit.id) && poseSets[unit.id].required.every(id=>ids.has(id))) && !(model.id==='excavator' && unit.id!=='turntable' && values.turntable>0) && (!unit.depends || installed(units.find(item=>item.id===unit.depends),ids) && (unit.dependsMin ? values[unit.depends] >= unit.dependsMin : values[unit.depends] > 0));
    const value = kind => can(units.find(unit => unit.id === kind)) ? values[kind] || 0 : 0;
    const center = id => {
      const b = byId(id)?.box || {x:300,y:190,width:120,height:90};
      return [b.x+b.width/2, b.y+b.height/2];
    };
    const pivot = unit => {
      const motion=byId(unit.pivot || unit.parts[0])?.motion;
      if(motion?.pivot) return motion.pivot;
      const b = byId(unit.pivot || unit.parts[0])?.box;
      if (!b) return [400,250];
      if (unit.id === "tip") return [b.x+b.width*.9, b.y+b.height*.65];
      if (unit.id === "stick") return [b.x+b.width*.7,b.y+b.height*.15];
      return center(unit.pivot || unit.parts[0]);
    };
    function telescopePose(amount) {
      const middle=byId('p7-2')?.motion,outer=byId('p7-3')?.motion;
      const root=middle?.pivot || center('p7-2'),axis=middle?.vector || [-44,-35];
      const outerRoot=outer?.pivot || root.map((n,i)=>n+axis[i]),outerAxis=outer?.vector || axis;
      const shift=axis.map(n=>n*amount*.5),outerShift=outerAxis.map(n=>n*amount*.5);
      return {
        middle:segmentTransform(root,root.map((n,i)=>n+axis[i]),root.map((n,i)=>n+axis[i]+shift[i])),
        outer:multiply([1,0,0,1,...shift],segmentTransform(outerRoot,outerRoot.map((n,i)=>n+outerAxis[i]),outerRoot.map((n,i)=>n+outerAxis[i]+outerShift[i]))),
        end:shift.map((n,i)=>n+outerShift[i]),
      };
    }
    function hoistDelta(amount=value('hoist')) {
      const vector=byId('p8-3')?.motion?.vector || [0,-1];
      return vector.map(n=>n*70*Math.max(0,(amount-.3)/.7));
    }
    function cableArt(raw) {
      const cable=byId('p8-2')?.motion,up=byId('p8-3')?.motion?.vector;
      if(!cable?.base || !cable?.tip || !up)return raw;
      // p8-2 contains the actual cords AND lower pulley housing. Shorten the
      // cord region, while translating the unscaled housing with the hook.
      const split=cable.tip.map((n,i)=>n+up[i]*8),delta=hoistDelta();
      const stem=segmentTransform(cable.base,split,split.map((n,i)=>n+delta[i]));
      const upper='vehicle-crane-cable-upper',lower='vehicle-crane-cable-lower';
      return `<defs><clipPath id="${upper}"><rect x="-1000" y="-1000" width="3000" height="${split[1]+1000+.6}"/></clipPath><clipPath id="${lower}"><rect x="-1000" y="${split[1]-.6}" width="3000" height="2000"/></clipPath></defs><g data-vehicle-cable-stem transform="${matrixText(stem)}"><g clip-path="url(#${upper})">${raw}</g></g><g data-vehicle-cable-housing transform="translate(${delta.join(' ')})"><g clip-path="url(#${lower})">${raw}</g></g>`;
    }
    function beaconArt(raw) {
      const part=byId('p10-2'),b=part.imageBox || part.box,cut=b.y+b.height*.4;
      const motion=byId('p5-1')?.motion,matrix=motion?.basis ? matrixText(planarRotation(motion,value('tip')*-24)) : 'translate(0 0)';
      // One original PNG contains the high body beacon and low chassis strips.
      // The transparent gap separates them without inventing another part.
      return `<defs><clipPath id="vehicle-recycle-beacon"><rect x="-1000" y="-1000" width="3000" height="${cut+1000}"/></clipPath><clipPath id="vehicle-recycle-chassis-lights"><rect x="-1000" y="${cut}" width="3000" height="2000"/></clipPath></defs><g data-vehicle-beacon transform="${matrix}"><g clip-path="url(#vehicle-recycle-beacon)">${raw}</g></g><g data-vehicle-chassis-lights clip-path="url(#vehicle-recycle-chassis-lights)">${raw}</g>`;
    }
    function transform(unit, id, amount) {
      const source=byId(unit.pivot || unit.parts[0]);
      const motion=source?.motion;
      const linkage=byId(id)?.motion;
      if(unit.id==='tip' && id==='p10-2')return 'translate(0 0)';
      if(linkage?.base && linkage?.tip && motion?.basis && Number.isFinite(unit.angle)) {
        const rotation=planarRotation(motion,amount*unit.angle);
        return matrixText(segmentTransform(linkage.base,linkage.tip,mapped(rotation,linkage.tip)));
      }
      if(unit.motion==='spin' && motion?.basis) return `rotate(${amount*540})`;
      if(motion?.basis && ['raise','tip','bin'].includes(unit.motion)) {
        const angle=unit.motion==='bin'?-amount*135:amount*unit.angle;
        let matrix=planarRotation(motion,angle);
        if(unit.id==='tip' && ['p7-1','p7-3'].includes(id) && byId('p7-2')?.motion) matrix=multiply(matrix,hingedSurface(byId('p7-2').motion,amount*70));
        if(unit.id==='bin' && id==='p9-2' && byId('p9-2')?.motion) matrix=multiply(matrix,hingedSurface(byId('p9-2').motion,Math.max(0,amount-.45)*-100,'xz'));
        return matrixText(matrix);
      }
      const [x,y] = unit.motion === "spin" ? center(id) : pivot(unit);
      if (unit.motion === "spin") return `rotate(${amount*540} ${x} ${y})`;
      if (unit.motion === "pose") return "translate(0 0)";
      if (unit.motion === "raise" || unit.motion === "tip") return `rotate(${amount*unit.angle} ${x} ${y})`;
      if (unit.motion === "wings") return `translate(${['p5-1','p11-1',...pack(6)].includes(id) ? -amount*25 : ['p5-2','p11-2',...pack(7)].includes(id) ? amount*25 : 0} ${id === "p5-3" ? -amount*22 : 0})`;
      if (unit.motion === "telescope") {
        const pose=telescopePose(amount);
        return id==='p7-2' ? matrixText(pose.middle) : id==='p7-3' ? matrixText(pose.outer) : `translate(${pose.end.join(' ')})`;
      }
      if (unit.motion === "hoist") {
        const delta=hoistDelta(amount);
        if(id==='p8-2') return 'translate(0 0)';
        if(pack(9).includes(id)) {
          const hookMotion=byId('p8-3')?.motion;
          const hook=hookMotion?.attach || hookMotion?.pivot?.map((n,i)=>n-(hookMotion.vector?.[i] || 0)*11) || center('p8-3'),eye=byId('p9-3')?.motion?.pivot || center('p9-3');
          const extension=telescopePose(value('telescope')).end,join=Math.min(1,amount/.3);
          return `translate(${(hook[0]-eye[0]+extension[0])*join+delta[0]} ${(hook[1]-eye[1]+extension[1])*join+delta[1]})`;
        }
        return `translate(${delta[0]} ${delta[1]})`;
      }
      if (unit.motion === "bin") return `rotate(${-amount*135} ${x} ${y})`;
      return "translate(0 0)";
    }
    function movement(unit,id,amount,art,animate) {
      const motion=byId(unit.pivot || unit.parts[0])?.motion;
      const spin=unit.motion==='spin',plane=spin && motion?.basis ? planeMatrices(motion) : null;
      const origin=plane ? '' : ` ${center(id).join(' ')}`;
      const animation=animate && spin ? `<animateTransform data-vehicle-trial attributeName="transform" type="rotate" from="0${origin}" to="540${origin}" dur="1.1s"/>` : '';
      const moving=`<g data-vehicle-move="${unit.id}" data-moving-part="${id}" ${spin ? `data-vehicle-spin="${unit.id}" ` : ''}transform="${transform(unit,id,amount)}">${animation}${plane ? `<g data-vehicle-plane-inverse="${unit.id}" transform="${matrixText(plane.inverse)}">${art}</g>` : art}</g>`;
      // A fixed projected plane surrounds the rotation. SVG can animate its
      // local angle without interpolating matrices or turning the ellipse.
      return plane ? `<g data-vehicle-plane="${unit.id}" transform="${matrixText(plane.forward)}">${moving}</g>` : moving;
    }
    const cargoDelta = amount => {
      if(!spec.cargo)return [0,0];
      const from=center(spec.cargo),to=id=>center(id).map((n,i)=>n-from[i]);
      if (model.id === "snow-blower") {
        const intake=to('p8-2'),outlet=to('p9-3');outlet[0]+=value('chute')*20;outlet[1]-=value('chute')*15;
        if(amount<.35) return intake.map(n=>n*amount/.35);
        if(amount<.6) return intake.map((n,i)=>n+(outlet[i]-n)*(amount-.35)/.25);
        const t=(amount-.6)/.4;return [outlet[0]-t*100,outlet[1]+t*80-Math.sin(t*Math.PI)*35];
      }
      if(model.id === "cement-mixer") {
        if(!amount)return [0,0];const inlet=to('p8-1'),gutter=to('p8-2');
        return amount<.5 ? inlet.map((n,i)=>n+(gutter[i]-n)*amount*2) : gutter.map((n,i)=>n+([70,45][i]-n)*(amount-.5)*2);
      }
      if(model.id === "recycling-truck") {
        const inlet=to('p6-3');
        if(amount>0)return inlet.map((n,i)=>n+([85,60][i]-n)*amount);
        return inlet.map(n=>n*value('bin'));
      }
      const bucket=center('p9-1');let target=bucket;
      for(const key of ['bucket','stick','boom']) {
        const unit=units.find(unit=>unit.id===key),motion=byId(unit.pivot)?.motion;
        if(motion?.basis)target=mapped(planarRotation(motion,value(key)*unit.angle),target);
      }
      return target.map((n,i)=>(n-from[i])*amount);
    };
    const cargoTransform = () => `translate(${cargoDelta(value(spec.cargoUnit)).join(' ')})`;
    const allZero = () => units.every(unit => value(unit.id) === 0);
    const movingPart = id => units.some(unit=>value(unit.id)>0 && unit.parts.includes(id)) || id===spec.cargo && value(spec.cargoUnit)>0;
    const observedArt = (part,ids) => !movingPart(part.id) ? artFor(part,ids)
      : model.id==='mobile-crane' && part.id==='p8-2' && model.mechanismArt?.['p8-2'] ? cableArt(movableArt(part))
      : model.id==='recycling-truck' && part.id==='p10-2' ? beaconArt(fullArt(part)) : movableArt(part);
    function sync(ids) {
      placed = new Set(ids);
      for (const unit of units) if (!can(unit)) values[unit.id] = 0;
    }
    function endTrial() { trialAnimation=null;for (const unit of units) values[unit.id] = 0; }
    function choose(id) { if (featureIds.has(id)) { current=id; endTrial(); } }
    function move(kind, amount) {
      const unit = units.find(item => item.id === kind);
      if (!can(unit) || !Number.isFinite(amount)) return;
      trialAnimation=null;
      let next=Math.max(0,Math.min(1,amount));
      // Ten keyboard steps of .1 can finish a few ULPs short of an endpoint.
      if(kind==='supports') {
        if(next<=Number.EPSILON*8)next=0;
        else if(1-next<=Number.EPSILON*8)next=1;
      }
      values[kind] = next;
      if(kind==='turntable' && amount>0) for(const other of units) if(other.id!==kind) values[other.id]=0;
      for(const other of units) if (!can(other)) values[other.id]=0;
    }
    function trial(action, kind) {
      if(action === "open") {move(kind,1);if(value(kind)>0)trialAnimation=kind;}
      if(action === "close") move(kind, 0);
    }
    function part(id) { return featureIds.has(id) ? byId(id) : null; }
    function sourcesFor(ids) {
      const sources=parts.filter(item => ids.has(item.id)).flatMap(item => sourcesIn(artFor(item,ids)).concat(sourcesIn(fullArt(item))));
      for(const [id,art] of Object.entries(model.mechanismArt || {})) if(ids.has(id)) sources.push(...sourcesIn(art.svg));
      for(const pose of Object.values(poseSets)) if(pose.required.every(id=>ids.has(id))) sources.push(...pose.frames.map(poseSource).filter(Boolean));
      return [...new Set(sources)];
    }
    const gesture = () => `<span class="vehicle-gesture" role="img" aria-label="拖動已接好的零件，或用按鈕與方向鍵操作">${hand}<b aria-hidden="true">↔ ↕</b></span>`;
    function instructions(id) {
      const item = byId(id || current), unit = units.find(unit => unit.required.includes(id || current));
      if(!item) return gesture();
      const b=item.box;
      return `<div class="vehicle-guide" role="img" aria-label="選零件，接到虛線位置。${unit ? esc(unit.title)+"接妥後可試玩" : "接好後再繼續"}"><span><b>1</b><svg viewBox="${b.x} ${b.y} ${b.width} ${b.height}" aria-hidden="true">${fullArt(item)}</svg></span><i aria-hidden="true">→</i><span><b>2</b>${hand}<small>接合</small></span><i aria-hidden="true">→</i><span><b>3</b>${gesture()}<small>${unit ? esc(unit.title) : "接好"}</small></span></div>`;
    }
    function scene(ids, {disabled=false,before=false}={}) {
      const resting = before || allZero();
      const animate=before || reduced() ? null : trialAnimation;trialAnimation=null;
      const activePoses=units.filter(unit=>unit.motion==='pose' && can(unit,ids));
      const bodies = parts.filter(item => ids.has(item.id) && (model.id!=='cement-mixer' || featureIds.has(item.id))).map(item => {
        const poseUnit=activePoses.find(unit=>unit.parts.includes(item.id));
        let poseImage='';
        if(poseUnit) {
          const pose=poseSets[poseUnit.id],frame=poseFrame(poseUnit.id,before?0:value(poseUnit.id));
          const animation=animate===poseUnit.id ? pose.frames.slice(0,-1).map((step,index)=>`<set data-vehicle-trial attributeName="href" to="${esc(poseSource(step))}" begin="${index*.12}s" dur=".12s"/>`).join('') : '';
          // A single transparent PNG is visible at a time, including during
          // the trial; the underlying href already holds the final frame.
          poseImage=item.id===poseUnit.parts.at(-1) ? `<image data-vehicle-pose="${poseUnit.id}" ${poseUnit.id==='drum'?'data-vehicle-drum-pose':''} visibility="${poseUnit.id==='turntable' && !value('turntable') ? 'hidden' : 'visible'}" href="${esc(poseSource(frame))}" x="0" y="0" width="800" height="500">${animation}</image>` : '';
          if(poseUnit.id!=='turntable') return poseImage;
        }
        let art = `<g data-vehicle-part="${item.id}">${resting ? artFor(item,ids) : observedArt(item,ids)}</g>`;
        if (item.id === spec.cargo) return `<g data-vehicle-cargo transform="${before ? 'translate(0 0)' : cargoTransform()}">${art}${animate===spec.cargoUnit ? `<animateTransform attributeName="transform" type="translate" values="${[0,.2,.4,.6,.8,1].map(amount=>cargoDelta(amount).join(' ')).join(';')}" dur="1.1s"/>` : ''}</g>`;
        for (const unit of [...units].sort((a,b)=>(a.id === "tip" ? -1 : b.id === "tip" ? 1 : 0)).reverse()) if (unit.parts.includes(item.id)) art = movement(unit,item.id,before?0:value(unit.id),art,animate===unit.id);
        if(poseUnit?.id==='turntable') art=`<g data-vehicle-pose-rest="turntable" visibility="${value('turntable')?'hidden':'visible'}">${art}</g>`;
        return art+poseImage;
      }).join("");
      const operators = units.filter(unit=>can(unit,ids) && unit.parts.length).map(unit => {
        const boxes=unit.parts.filter(id=>ids.has(id)).map(id=>byId(id).box);
        const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));
        const w=Math.max(...boxes.map(b=>b.x+b.width))-x,h=Math.max(...boxes.map(b=>b.y+b.height))-y;
        return `<g class="vehicle-operate" data-train-operate="${unit.id}" role="slider" tabindex="${disabled?-1:0}" aria-disabled="${disabled}" aria-label="${esc(unit.title)}，拖動或用方向鍵" aria-orientation="${unit.axis || 'horizontal'}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${before?0:Math.round(value(unit.id)*100)}"><rect class="vehicle-focus" x="${x}" y="${y}" width="${Math.max(44,w)}" height="${Math.max(44,h)}" rx="8"/><rect class="vehicle-hit" x="${x}" y="${y}" width="${Math.max(44,w)}" height="${Math.max(44,h)}" rx="8"/></g>`;
      }).reverse().join("");
      return bodies+operators;
    }
    function controls(ids,{disabled=false}={}) {
      return `<div class="vehicle-controls">${units.filter(unit=>installed(unit,ids)).map(unit=> {
        const off=disabled || !can(unit,ids), amount=Math.round(value(unit.id)*100);
        return `<div class="vehicle-unit"><strong>${esc(unit.title)}</strong><button type="button" data-train-action="open" data-kind="${unit.id}" aria-label="${esc(unit.open+unit.title)}，不改拼裝進度" ${off?'disabled':''}>${esc(unit.open)}</button><input data-train-range="${unit.id}" type="range" aria-label="${esc(unit.title)}位置" min="0" max="100" step="1" value="${amount}" ${off?'disabled':''}><button type="button" data-train-action="close" data-kind="${unit.id}" aria-label="${esc(unit.close+unit.title)}，不改拼裝進度" ${off?'disabled':''}>${esc(unit.close)}</button>${unit.motion==='pose' && !posesReady(unit.id) ? '<small>旋轉圖片尚未準備好</small>' : model.id==='excavator' && unit.id!=='turntable' && values.turntable>0 ? '<small>先將旋轉座回正</small>' : unit.depends && !can(unit,ids) ? `<small>先${units.find(other=>other.id===unit.depends).open}${units.find(other=>other.id===unit.depends).title}</small>`:''}</div>`;
      }).join('')}<small class="vehicle-note">拖動、按鈕或方向鍵試玩</small></div>`;
    }
    function update(host) {
      // Direct manipulation supersedes any currently playing trial, including
      // animated href values which would otherwise mask the new slider value.
      for(const animation of host.querySelectorAll('[data-vehicle-trial]')) animation.remove();
      // Replace only the feature internals, keeping the captured pointer's SVG
      // and focusable controls alive through the interaction.
      for(const item of parts) {
        const node=host.querySelector(`[data-vehicle-part="${item.id}"]`);
        if(node) node.innerHTML=observedArt(item,placed);
      }
      for(const unit of units) {
        for(const node of host.querySelectorAll(`[data-vehicle-move="${unit.id}"]`)) node.setAttribute("transform",transform(unit,node.dataset.movingPart,value(unit.id)));
        const slider=host.querySelector(`[data-train-operate="${unit.id}"]`);
        slider?.setAttribute("aria-valuenow",String(Math.round(value(unit.id)*100)));
        const range=host.querySelector(`[data-train-range="${unit.id}"]`);
        if(range) range.value=String(Math.round(value(unit.id)*100));
      }
      host.querySelector('[data-vehicle-cargo]')?.setAttribute('transform',cargoTransform());
      for(const unit of units) if(posesReady(unit.id)) {
        const pose=host.querySelector(`[data-vehicle-pose="${unit.id}"]`);
        pose?.setAttribute('href',poseSource(poseFrame(unit.id,value(unit.id))));
        if(unit.id==='turntable') {pose?.setAttribute('visibility',value(unit.id)?'visible':'hidden');for(const node of host.querySelectorAll('[data-vehicle-pose-rest="turntable"]')) node.setAttribute('visibility',value(unit.id)?'hidden':'visible');}
      }
    }
    const detailParts=model.id==='cement-mixer' ? parts.filter(part=>span(5,8).includes(part.id)) : null;
    const detailBox=detailParts ? {x:Math.min(...detailParts.map(p=>p.box.x))-55,y:Math.min(...detailParts.map(p=>p.box.y))-55,
      right:Math.max(...detailParts.map(p=>p.box.x+p.box.width))+55,bottom:Math.max(...detailParts.map(p=>p.box.y+p.box.height))+80} : null;
    return {sync,choose,part,scene,controls,gesture,instructions,sourcesFor,move,trial,value,endTrial,update,
      isPart:id=>featureIds.has(id),hasPart:ids=>[...featureIds].some(id=>ids.has(id)),
      autoPack:index=>units.some(unit=>unit.packs.includes(index)),
      axis:kind=>units.find(unit=>unit.id===kind)?.axis || 'horizontal',direction:()=>1,travel:()=>110,
      entry:()=>({x:0,y:-24}),arrow:()=>"down",viewBox:detailBox ? `${detailBox.x} ${detailBox.y} ${detailBox.right-detailBox.x} ${detailBox.bottom-detailBox.y}` : "-35 -55 890 620",label:"可動零件特寫",name:spec.name,
      // Describes source-pack stages rather than assuming a twelve-pack train.
      chapters:model.steps.slice(1).map((step,index)=>[step.title,step.parts[0].id,index+1,index+2]),
      get current(){return current;},get sources(){return sourcesFor(placed);},
    };
  }
  global.KidsVehicleMechanism=Object.freeze({create});
})();
