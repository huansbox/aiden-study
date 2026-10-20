const paths = {
  sun: '<circle cx="24" cy="24" r="9"/><path d="M24 3v5m0 32v5M3 24h5m32 0h5M9 9l4 4m22 22 4 4M9 39l4-4m22-22 4-4"/>',
  cloud: '<path d="M10 35a9 9 0 0 1-1-18 12 12 0 0 1 23-3 10 10 0 1 1 5 21Z"/>',
  snow: '<path d="M24 4v40M7 14l34 20M7 34l34-20M18 8l6 6 6-6M18 40l6-6 6 6M8 20l9-3-1-9M40 28l-9 3 1 9M8 28l9 3-1 9M40 20l-9-3 1-9"/>',
  rain: '<path d="M9 24a8 8 0 0 1 1-15 11 11 0 0 1 21 0 8 8 0 1 1 5 15ZM15 31l-4 9m14-9-4 9m14-9-4 9"/>',
  hail: '<path d="M9 24a8 8 0 0 1 1-15 11 11 0 0 1 21 0 8 8 0 1 1 5 15Z"/><circle cx="14" cy="36" r="4"/><circle cx="31" cy="39" r="5"/>',
  drop: '<path d="M24 5C19 14 9 24 9 32a15 15 0 0 0 30 0C39 24 29 14 24 5Z"/>',
  coldDrop: '<path d="M20 5C15 14 6 24 6 31a14 14 0 0 0 28 0c0-7-9-17-14-26Z"/><path d="M38 5v17m-7-13 14 9m-14 0 14-9"/>',
  search: '<circle cx="20" cy="20" r="14"/><path d="m31 31 13 13"/>',
  merge: '<path d="M13 5C9 12 3 17 3 23a10 10 0 0 0 20 0C23 17 17 12 13 5Zm23 0c-4 7-10 12-10 18a10 10 0 0 0 20 0C46 17 40 12 36 5Z"/><path d="m18 40 6 5 7-5"/>',
  up: '<path d="M24 43V6M10 20 24 6l14 14M9 43V29m30 14V29"/>',
  down: '<path d="M24 5v37M10 28l14 14 14-14M6 8h36"/>',
  river: '<path d="M26 3C2 14 45 21 21 30S8 40 25 46M35 3C11 14 54 21 30 30s-13 10 4 16"/>',
  lake: '<ellipse cx="24" cy="30" rx="21" ry="11"/><path d="M11 27q6 5 12 0t13 0M12 34q6 4 12 0t12 0"/>',
  play: '<path d="m15 7 27 17-27 17Z"/>',
  pause: '<path d="M15 8v32M33 8v32"/>',
  replay: '<path d="M9 17a18 18 0 1 1-1 16M8 5v13h13"/>',
  back: '<path d="m29 7-17 17 17 17"/>',
  next: '<path d="m19 7 17 17-17 17"/>',
  home: '<path d="m5 22 19-17 19 17M11 18v25h26V18M20 43V29h9v14"/>',
  people: '<circle cx="15" cy="13" r="7"/><circle cx="34" cy="19" r="6"/><path d="M3 43V31a12 12 0 0 1 24 0v12m3 0V34a9 9 0 0 1 15 0v9"/>',
  sound: '<path d="m5 18 10 0L27 8v32L15 30H5ZM34 16q8 8 0 16m5-23q16 15 0 30"/>',
  slow: '<path d="M6 33h30M12 33a13 13 0 0 1 26 0m-19 0V20M7 39v4m25-4v4m4-13h9v9"/>',
  help: '<circle cx="24" cy="24" r="21"/><path d="M17 17a7 7 0 1 1 10 7q-3 2-3 6m0 5v2"/>',
  check: '<path d="m8 24 11 11L41 11"/>'
};
export function icon(name, cls = '') { return `<svg class="icon ${cls}" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.drop}</svg>`; }
const cloud = (x = 210, y = 55, scale = 1, storm = false) => `<g transform="translate(${x} ${y}) scale(${scale})" filter="url(#shadow)"><path d="M33 151C-14 143-10 79 35 72 24 15 99-10 135 36 167-6 243 3 252 59 306 45 344 100 310 137 294 160 62 166 33 151Z" fill="${storm ? '#819aaa' : '#fffdf5'}" stroke="${storm ? '#627f91' : '#dddccf'}" stroke-width="3"/></g>`;
const dots = (n, fill = '#5baec0', radius = 7, offset = 0) => Array.from({ length: n }, (_, i) => `<circle cx="${280 + (i % 5) * 41 + offset}" cy="${115 + Math.floor(i / 5) * 36}" r="${radius}" fill="${fill}"/>`).join('');
const label = (x, y, txt, size = 23) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="700" fill="#244e55">${txt}</text>`;
const arrow = (d, color = '#d9a641', dash = false) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="9" ${dash ? 'stroke-dasharray="12 12"' : ''} stroke-linecap="round" marker-end="url(#arrow)"/>`;
const snowflake = (x, y, r = 24) => `<g transform="translate(${x} ${y})" stroke="#6a9db2" stroke-width="4" stroke-linecap="round"><path d="M0 ${-r}V${r}M${-r * .87} ${-r / 2} ${r * .87} ${r / 2}M${-r * .87} ${r / 2} ${r * .87} ${-r / 2}"/><circle r="5" fill="#fff"/></g>`;
const drop = (x, y, r = 15) => `<path transform="translate(${x} ${y}) scale(${r / 20})" d="M0-28C-8-16-20-4-20 8a20 20 0 0 0 40 0C20-4 8-16 0-28Z" fill="#4b9fb7" stroke="#fffdf6" stroke-width="3"/>`;
export function sceneArt(s, english = false) {
  const t = (zh, en) => english ? en : zh;
  let art = '';
  if (s.scene === 'evap') {
    art = `<image href="assets/landscape.png" width="800" height="480" preserveAspectRatio="xMidYMid slice"/><path d="M0 370Q160 330 330 365T600 400L640 480H0Z" fill="#d5d6a2"/><ellipse cx="335" cy="389" rx="${s.time ? 101 : 178}" ry="${s.time ? 25 : 42}" fill="#7bbccc" stroke="#e9f5ec" stroke-width="7"/>${label(165, 72, t('小水窪的早晨', 'A little puddle'))}<g transform="translate(654 76)">${iconSVG('sun', '#e0b248')}</g>`;
    if (s.time) art += `<g class="paper-tag"><rect x="65" y="105" rx="15" width="200" height="48" fill="#fff8dc"/>${label(165, 138, t('時間快轉', 'Time passes'), 21)}</g>`;
    if (s.reveal) art += `<path d="M426 346 530 234" stroke="#f9f5df" stroke-width="8"/><circle cx="584" cy="185" r="117" fill="#f5f4dd" stroke="#e3b846" stroke-width="9"/>${[0,1,2,3,4,5].map(i=>`<circle class="vapor-dot" cx="${532 + i%3*50}" cy="${143+Math.floor(i/3)*55}" r="6" fill="#448397"/>`).join('')}<rect x="427" y="309" width="314" height="69" rx="12" fill="#fffbed"/>${label(584, 337, t('看不見的水蒸氣', 'Invisible water vapor'), 21)}${label(584, 365, t('小點只是示意', 'Dots = a model'), 18)}`;
    if (english && s.compareStarted) {
      art = `<path d="M0 310Q200 280 400 310T800 310V480H0Z" fill="#d4d4aa"/>${label(400, 47, 'A fair comparison', 26)}${label(400, 81, 'Same time · Same start · Same air and wind', 19)}<path d="M400 105V385" stroke="#a1b5a1" stroke-width="2" stroke-dasharray="8 9"/>`;
      for (const [x,warm] of [[210,true],[590,false]]) {
        art += `<g transform="translate(${x-28} 112)">${iconSVG(warm?'sun':'snow',warm?'#bf8934':'#6592ac')}</g>${label(x, 221, warm ? 'Warmer water' : 'Cooler water', 23)}<ellipse cx="${x}" cy="310" rx="142" ry="51" fill="#bdb58f"/><ellipse cx="${x}" cy="304" rx="${s.comparePrediction?(warm?63:108):120}" ry="${s.comparePrediction?(warm?24:37):41}" fill="#79b9c7" stroke="#eef5e7" stroke-width="5"/>${s.comparePrediction?label(x,397,warm?'More water lost':'Less water lost',23):label(x,397,'Your guess?',23)}`;
      }
      art += label(400,456,'Qualitative model · Not a measurement',18);
    }
  }
  if (s.scene === 'cloud') {
    art = `<path d="M0 412Q190 315 375 392T800 365V480H0Z" fill="#aac7a2"/>${s.cooled ? cloud() : `<ellipse cx="380" cy="170" rx="193" ry="117" fill="#e4eee9" stroke="#8fb5b7" stroke-width="3" stroke-dasharray="10 10"/>`}${dots(s.cooled ? 15 : 10, s.cooled ? '#65a9bf' : '#9caeaf', s.cooled ? 8 : 4)}${label(400, 320, s.cooled ? t('雲裡的小水滴', 'Tiny cloud drops') : t('潮溼空氣：水蒸氣看不見', 'Wet air: invisible water vapor'))}${label(400, 353, t('放大示意；小點不是真實大小', 'Close-up model; dots are not to scale'), 18)}${s.cooled ? label(400, 420, t('有雲，不一定下雨', 'A cloud. No rain yet.'), 24) : ''}`;
  }
  if (s.scene === 'rain') {
    const rain = s.drops === 3;
    art = `${cloud(190, 25, 1.17)}${rain ? [275,370,455,525].map((x,i)=>`<g class="fall" style="animation-delay:${i*.14}s">${drop(x,270+i%2*50,18)}</g>`).join('') : dots(15-s.drops*5, '#65a9bf',7+s.drops*5)}<path d="M0 430Q400 385 800 430V480H0Z" fill="#adc89c"/>${rain ? '<ellipse cx="397" cy="439" rx="150" ry="22" fill="#72b6c4"/>' : ''}${label(400, 385, rain ? t('雨落到地面', 'Rain reaches the ground') : t('小水滴合併，慢慢長大', 'Tiny drops join and grow'))}${label(400, 464, t('放大、加快示意', 'A fast, close-up model'), 18)}`;
  }
  if (s.scene === 'snow') {
    art = `${cloud(232, -38, .95)}${snowflake(395,100,19)}${label(400, 165, t('冰晶長成雪花', 'Ice crystals grow into snow'), 21)}<path d="M0 195Q200 174 400 195T800 195V353Q400 330 0 353Z" fill="${s.air === 'warm' ? '#f5c57b' : s.air === 'cold' ? '#d2e8e8' : '#e8e5d8'}" opacity=".85"/>${s.air ? label(610, 246, s.air === 'warm' ? t('厚暖空氣層', 'Thick warm air') : t('冷空氣', 'Cold air'),20) : label(400,285,'?',65)}${!s.air ? '' : s.air === 'warm' ? `${snowflake(395,205,23)}${arrow('M395 246V290','#ca994b')}${drop(395,330,21)}` : `${snowflake(395,225,27)}${snowflake(395,330,27)}`}<path d="M0 432Q200 394 400 424T800 414V480H0Z" fill="${s.air === 'cold' ? '#fffdf7' : '#a9c399'}"/>${label(400, 405, s.air ? (snowAtGroundText(s.air, english)) : t('先選下面的空氣，再看結果', 'Choose the air below first'), 24)}`;
  }
  if (s.scene === 'hail') {
    const ice = `<g class="${s.hail ? 'hail-fall' : ''}" transform="translate(0 ${s.hail ? 110 : 0})"><circle cx="380" cy="265" r="${s.hail ? 45 : 16}" fill="#f3fbf8" stroke="#668eaa" stroke-width="4"/>${s.hail ? '<circle cx="380" cy="265" r="31" fill="none" stroke="#95b4c6" stroke-width="3"/><circle cx="380" cy="265" r="17" fill="none" stroke="#95b4c6" stroke-width="3"/>' : ''}</g>`;
    art = `${cloud(180, -8, 1.2, true)}<path d="M213 135Q180 270 265 365Q410 420 560 337Q636 271 558 133Z" fill="#a9bec5" stroke="#7f9ba5" stroke-width="3" filter="url(#shadow)"/>${s.wind ? `${arrow('M315 347Q260 250 317 170','#e0b349')}<path class="up-flow" d="M293 325V210" stroke="#fff7ce" stroke-width="4" stroke-dasharray="8 10"/>` : ''}${s.water ? [0,1,2,3,4,5].map(i=>drop(420+i%3*48,180+Math.floor(i/3)*67,10)).join('') : ''}${ice}${label(399, 442, s.hail ? t('冰雹一層層長大，最後落下', 'Hail grows in layers, then falls') : t('小冰粒，需要兩個條件', 'Small ice needs two things'),22)}${label(400, 470, t('雷雨雲內：放大、加快示意', 'Inside a storm: fast, close-up model'), 18)}`;
  }
  if (s.scene === 'ground') {
    art = `<path d="M0 180Q130 60 265 162T510 150Q650 65 800 160V280H0Z" fill="#9fbe9a"/><path d="M0 252Q180 214 370 261T800 250V480H0Z" fill="#c7ad7d"/><path d="M0 312Q260 270 470 310T800 307V480H0Z" fill="#ac986f"/><path d="M0 430Q160 380 300 420T800 403V480H0Z" fill="#889b91"/><path d="M171 133C310 157 244 206 365 236S456 284 600 267" stroke="#76b7c2" stroke-width="29" fill="none"/><ellipse cx="635" cy="267" rx="115" ry="34" fill="#71adbc"/>${[0,1,2,3,4,5,6,7,8].map(i=>`<ellipse cx="${70+i*84}" cy="${358+i%2*40}" rx="12" ry="7" fill="#899082"/>`).join('')}${label(157, 308, t('土壤', 'Soil'),21)}${label(640, 441, t('岩石縫隙中的地下水', 'Groundwater in spaces'),20)}`;
    if(s.path==='river') art += `${arrow('M260 183Q300 230 428 252','#f7df83')}${label(550, 139, t('地表逕流', 'Over the ground'))}`;
    if(s.path==='soil') art += `${arrow('M341 263V355','#4c9cb6')}${arrow('M366 373Q430 410 511 386','#4c9cb6',true)}${label(383, 218, t('滲入，再慢慢移動', 'Soak in. Move slowly.'),21)}`;
    if(s.path==='lake') art += `<ellipse cx="635" cy="267" rx="129" ry="47" fill="none" stroke="#f7df83" stroke-width="8" stroke-dasharray="14 9"/>${label(628, 195, t('暫時停留', 'Stay for a while'))}`;
  }
  return `<svg class="science-scene" viewBox="0 0 800 480" role="img" aria-label="${description(s,english)}"><defs><filter id="shadow" x="-20%" y="-20%" width="150%" height="150%"><feDropShadow dx="3" dy="5" stdDeviation="3" flood-color="#647c72" flood-opacity=".18"/></filter><marker id="arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse"><path d="m0 0 10 5-10 5Z" fill="context-stroke"/></marker></defs><rect width="800" height="480" fill="#e8efdf"/>${art}</svg>`;
}
function iconSVG(name, color) { return `<svg width="80" height="80" viewBox="0 0 48 48" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round">${paths[name]}</svg>`; }
function snowAtGroundText(air, en) { return en ? air === 'warm' ? 'Rain below' : 'Snow below' : air === 'warm' ? '到地面：雨' : '到地面：雪'; }
function description(s, en) {
  const zh = {evap: s.reveal ? '水窪變小；放大圈裡的小點只是看不見水蒸氣的示意。' : '晴朗山谷裡的小水窪。',cloud:s.cooled?'放大的雲內有許多小水滴，沒有下雨。':'潮溼空氣的示意範圍，水蒸氣本身不可見。',rain:s.complete?'水滴長大並落到地面。':'雲內小水滴合併、長大。',snow:!s.air?'雲中保留冰晶，下方空氣尚未選擇，問號等待你的決定。':s.air==='warm'?'雪花穿過厚暖層，融化成雨。':'冰晶長成雪花，通過冷空氣。',hail:s.hail?'上升氣流托住冰粒，過冷水滴在表面凍成多層冰雹。':'雷雨雲中有小冰粒；條件可開關。',ground:'地面剖面圖：溪流、湖泊、土壤和岩石縫隙。'};
  if (en && s.scene==='snow' && !s.air) return 'Ice crystals in the cloud. The air below has not been chosen.';
  return en ? `Interactive diagram: ${s.scene}. ${s.cue.replaceAll('-',' ')}.` : zh[s.scene];
}
