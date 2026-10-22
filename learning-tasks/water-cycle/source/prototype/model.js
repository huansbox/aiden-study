(function (root) {
  'use strict';
  // The local Hanhan cool clip is 4.55s. Keep the bird's cold reaction visible
  // for the whole sentence; the player also waits if playback starts late.
  const COOLING_MS = 4800;
  const CLOUD_MS = 1700;
  const RAIN_VOLUME = 4;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const radius = volume => 45 * Math.cbrt(volume);
  function createWind() {
    return { x: 460, y: 420, phase: 'air', coldMs: 0, cloudMs: 0, environment: 'warm', warmResponded: false };
  }
  // A broad cool air region, not a single success hotspot. The sloping edge
  // follows the background's warm lower-left / cool upper-right color field.
  function isCool(x, y) { return x > 700 || (x > 530 && y < 330); }
  function moveWind(wind, x, y) {
    if (wind.phase !== 'air') return [];
    wind.x = clamp(x, 300, 1060); wind.y = clamp(y, 165, 565);
    const next = isCool(wind.x, wind.y) ? 'cool' : 'warm';
    const events = [];
    if (next !== wind.environment) {
      wind.environment = next;
      if (next === 'cool') events.push('cool');
      else { wind.coldMs = 0; events.push('leaveCool'); }
    }
    return events;
  }
  function settleWind(wind) {
    if (wind.phase !== 'air' || wind.environment !== 'warm' || wind.warmResponded) return [];
    wind.warmResponded = true;
    return ['warm'];
  }
  function tickWind(wind, ms, canCondense = true) {
    if (wind.phase === 'air' && wind.environment === 'cool') {
      wind.coldMs += ms;
      if (wind.coldMs >= COOLING_MS && canCondense) { wind.phase = 'droplets'; wind.cloudMs = 0; return ['condense']; }
    } else if (wind.phase === 'droplets') {
      wind.cloudMs += ms;
      if (wind.cloudMs >= CLOUD_MS) { wind.phase = 'cloud'; return ['cloud']; }
    }
    return [];
  }
  function createRain() {
    const specs = [
      [510, 300, 1, true], [360, 210, 1], [760, 220, 2],
      [1000, 280, 1], [360, 430, 2], [700, 440, 1],
      [950, 470, 2], [1010, 155, 2]
    ];
    return { nextId: 9, drops: specs.map(([x,y,volume,hero],i) => ({id:'d'+(i+1),x,y,volume,hero:!!hero,status:'floating',age:0})), meetings: [], landed: [], heroLanded: false, mergeCount: 0, addedVolume: 0 };
  }
  function movable(rain, id) { return rain.drops.find(d => d.id === id && d.status === 'floating'); }
  function moveDrop(rain, id, x, y) {
    const d = movable(rain,id); if (!d) return false;
    d.x = clamp(x, 305, 1070); d.y = clamp(y, 150, 510); return true;
  }
  function beginMerge(rain, aId, bId) {
    const a = movable(rain,aId), b = movable(rain,bId);
    if (!a || !b || a === b) return false;
    a.status = b.status = 'meeting';
    const dx=b.x-a.x,dy=b.y-a.y, dist=Math.hypot(dx,dy)||1;
    const reach = (radius(a.volume)+radius(b.volume))*.72;
    rain.meetings.push({a:a.id,b:b.id,age:0,fromX:a.x,fromY:a.y,toX:b.x-dx/dist*reach,toY:b.y-dy/dist*reach});
    return true;
  }
  function collision(rain, id) {
    const d = movable(rain,id); if (!d) return null;
    return rain.drops.filter(o=>o!==d && o.status==='floating')
      .sort((a,b)=>Math.hypot(d.x-a.x,d.y-a.y)-Math.hypot(d.x-b.x,d.y-b.y))
      .find(o=>Math.hypot(d.x-o.x,d.y-o.y)<(radius(d.volume)+radius(o.volume))*.78)?.id || null;
  }
  function refillRain(rain) {
    // Falling water has already left the cloud. A large growing drop will
    // also leave by itself, so neither can help the remaining small drops.
    const available = rain.drops.filter(d=>d.status!=='falling' && !(d.status==='growing' && d.volume>=RAIN_VOLUME));
    const missing = Math.max(0,RAIN_VOLUME-available.reduce((sum,d)=>sum+d.volume,0));
    const places = [[360,210],[560,195],[780,200],[1000,230],[360,430],[570,455],[800,440],[1000,470]];
    for(let i=0;i<missing;i++) {
      // Choose open space; incoming friends never auto-merge or duplicate the star.
      const distance = ([x,y])=>Math.min(...rain.drops.map(d=>Math.hypot(d.x-x,d.y-y)),Infinity);
      places.sort((a,b)=>distance(b)-distance(a));
      const [x,y]=places.shift();
      rain.drops.push({id:'d'+rain.nextId++,x,y,volume:1,hero:false,status:'floating',age:0});
    }
    rain.addedVolume+=missing;
    return missing;
  }
  function tickRain(rain, ms) {
    const events=[];
    for (const m of [...rain.meetings]) {
      m.age += ms;
      const a=rain.drops.find(d=>d.id===m.a), b=rain.drops.find(d=>d.id===m.b);
      const t=Math.min(1,m.age/440); a.x=m.fromX+(m.toX-m.fromX)*t; a.y=m.fromY+(m.toY-m.fromY)*t;
      if (m.age >= 600) {
        const v=a.volume+b.volume;
        const merged={id:'d'+rain.nextId++,x:(a.x*a.volume+b.x*b.volume)/v,y:(a.y*a.volume+b.y*b.volume)/v,volume:v,hero:a.hero||b.hero,status:'growing',age:0,fromVolume:Math.max(a.volume,b.volume)};
        rain.drops=rain.drops.filter(d=>d!==a&&d!==b);rain.drops.push(merged);
        rain.meetings=rain.meetings.filter(item=>item!==m);rain.mergeCount++;
        events.push({type:'merge',hero:merged.hero,volume:merged.volume});
      }
    }
    for (const d of [...rain.drops]) {
      if (d.status==='growing') {
        d.age+=ms;
        if (d.age >= 1100) {
          d.age=0;
          if(d.volume>=RAIN_VOLUME){d.status='falling';d.startY=d.y;events.push({type:'fall',hero:d.hero});}
          else { d.status='floating'; events.push({type:'small',hero:d.hero,volume:d.volume}); }
        }
      } else if(d.status==='falling') {
        d.age+=ms;const t=Math.min(1,d.age/1450);d.y=d.startY+(722-d.startY)*t*t;
        if(t===1){rain.drops=rain.drops.filter(item=>item!==d);rain.landed.push({...d,status:'landed',age:0});if(d.hero)rain.heroLanded=true;events.push({type:'land',hero:d.hero});}
      }
    }
    if(events.some(event=>event.type==='land')) {
      const count=refillRain(rain);
      if(count)events.push({type:'refill',count});
    }
    for(const d of rain.landed)d.age+=ms;
    return events;
  }
  function createSession(){return{scene:3,wind:createWind(),rain:createRain(),visited:{3:false,4:false}};}
  function replayScene(session){if(session.scene===3)session.wind=createWind();else session.rain=createRain();}
  function setScene(session,scene){if(scene===3||scene===4)session.scene=scene;}
  function rainIntro(rain, madeCloud) {
    if(rain.heroLanded)return 'reunion';
    const hero=rain.drops.find(d=>d.hero);
    if(hero?.status==='falling')return 'heroFall';
    if(hero?.volume>1 && hero.volume<RAIN_VOLUME)return 'small';
    return madeCloud?'intro4':'skip4';
  }
  // At most a short story continuation plus one current piece of feedback.
  // Ordinary simultaneous rain cannot overwrite the star's fall or reunion.
  const protectedCues=new Set(['cool','heroFall','reunion']);
  const storyCues=new Set(['heroFall','reunion','condense']);
  function createNarration(){return {active:null,pending:[]};}
  function clearNarration(voice){voice.active=null;voice.pending=[];}
  function requestNarration(voice,id) {
    if(voice.active && (protectedCues.has(voice.active) || id==='refill' || (voice.active==='merge' && id==='small'))) {
      if(voice.active===id || voice.pending.includes(id))return null;
      const heroStory=['heroFall','reunion'].includes(voice.active) || voice.pending.some(cue=>['heroFall','reunion'].includes(cue));
      if(heroStory && !storyCues.has(id) && id!=='refill')return null;
      if(storyCues.has(id)) {
        voice.pending=voice.pending.filter(cue=>storyCues.has(cue)||cue==='refill');
        const feedback=voice.pending.indexOf('refill');
        voice.pending.splice(feedback<0?voice.pending.length:feedback,0,id);
      } else voice.pending=[...voice.pending.filter(cue=>storyCues.has(cue)),id];
      return null;
    }
    voice.active=id;voice.pending=voice.pending.filter(cue=>cue==='refill'&&id!=='refill');return id;
  }
  function finishNarration(voice){voice.active=voice.pending.shift()||null;return voice.active;}
  const api={COOLING_MS,CLOUD_MS,RAIN_VOLUME,radius,createWind,isCool,moveWind,settleWind,tickWind,createRain,movable,moveDrop,beginMerge,collision,tickRain,createSession,replayScene,setScene,rainIntro,createNarration,clearNarration,requestNarration,finishNarration};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.WaterPrototype=api;
})(typeof globalThis==='object'?globalThis:this);
