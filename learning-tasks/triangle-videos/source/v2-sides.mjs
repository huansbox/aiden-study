// Video 2: when can three sticks make a triangle? (sum of two sides > third, difference < third)
import {
  C, W, H, D2R, clamp, ease, outBack, pr, lerp, lerpP, track, polar, dist,
  text, richText, poly, line, circle, roundRect, card, stick, stickLabel, mark, sparkle, thinking, face,
} from './lib.mjs';

const BASE = C.blue, LEFT = C.red, RIGHT = C.orange, THIRD = C.purple;

/** A stick described by its centre, direction and length, so it keeps its length while it moves. */
const pose = (c, deg, len) => [polar(c, deg + 180, len / 2), polar(c, deg, len / 2)];
const mixPose = (a, b, k) => ({ c: lerpP(a.c, b.c, k), deg: lerp(a.deg, b.deg, k) });

const s1 = {
  id: 'answer', title: '先講答案',
  lines: [
    { id: 'a', text: '先告訴你答案：三根棒子要圍成三角形，兩根短的加起來，一定要比最長的那根還長。' },
    { id: 'b', text: '為什麼呢？我們拿棒子來試試看。' },
  ],
  sfx: (s) => [{ t: 0.8, k: 'pop' }, { t: 1.1, k: 'pop' }, { t: 1.4, k: 'pop' }, { t: s.L.a + 5.0, k: 'ding' }],
  draw(ctx, { t, L }) {
    const u = 120, P0 = [700, 720], P1 = [1180, 720], P2 = [700, 360];
    const sticks = [
      { from: { c: [420, 480], deg: 20 }, to: { c: [(P0[0] + P1[0]) / 2, 720], deg: 0 }, len: 4 * u, col: LEFT },
      { from: { c: [960, 420], deg: -35 }, to: { c: [700, 540], deg: 90 }, len: 3 * u, col: RIGHT },
      { from: { c: [1480, 520], deg: 50 }, to: { c: [(P1[0] + P2[0]) / 2, (P1[1] + P2[1]) / 2], deg: 180 - Math.atan2(360, 480) / D2R }, len: 5 * u, col: BASE },
    ];
    const join = pr(t, 2.0, 1.4) * (1 - pr(t, L.b + 0.6, 1.2));
    sticks.forEach((s, i) => {
      const k = outBack(pr(t, 0.8 + i * 0.3, 0.5));
      if (k <= 0) return;
      const p = mixPose(s.from, s.to, join), wob = Math.sin(t * 2 + i * 2) * 5 * (1 - join);
      const [a, b] = pose([p.c[0], p.c[1] + wob], p.deg + wob * 0.6, s.len * k);
      stick(ctx, a, b, s.col, { unit: u });
    });
    const rule = outBack(pr(t, L.a + 5.0, 0.5));
    if (rule > 0) {
      ctx.save(); ctx.translate(W / 2, 930); ctx.scale(rule, rule);
      roundRect(ctx, -600, -90, 1200, 180, 50, { fill: C.yellow });
      ctx.restore();
      richText(ctx, [['短', LEFT], [' ＋ ', C.ink], ['短', RIGHT], ['  ＞  ', C.ink], ['最長', BASE]], W / 2, 936, { size: 116, scale: rule });
    }
    text(ctx, '？', 1520, 330, { size: 150, color: C.orange, scale: outBack(pr(t, L.b + 0.2, 0.45)) });
  },
};

// Long stick on the ground, two shorter ones hinged at its ends like arms trying to hold hands.
const U = 120, X0 = 480, X1 = 1440, GY = 760;
function arms(ctx, t, o) {
  const { left, right, aL, aR, labels = 1, baseLabel = 1 } = o;
  const H0 = [X0, GY], H1 = [X1, GY];
  const tipL = polar(H0, aL, left * U), tipR = polar(H1, 180 - aR, right * U);
  stick(ctx, H0, H1, BASE, { unit: U });
  stickLabel(ctx, H0, H1, '8', BASE, { off: 78, scale: baseLabel });
  stick(ctx, H0, tipL, LEFT, { unit: U });
  stick(ctx, H1, tipR, RIGHT, { unit: U });
  circle(ctx, H0, 14, { fill: C.ink, stroke: null }); circle(ctx, H1, 14, { fill: C.ink, stroke: null });
  if (aL > 8) stickLabel(ctx, H0, tipL, String(left), LEFT, { off: 78, side: -1, scale: labels });
  if (aR > 8) stickLabel(ctx, H1, tipR, String(Math.round(right)), RIGHT, { off: 78, side: 1, scale: labels });
  for (const p of [tipL, tipR]) circle(ctx, p, 24, { fill: C.white, lw: 7 }); // "hands"
  return { tipL, tipR };
}
function equation(ctx, parts, k, y = 985) {
  if (k <= 0) return;
  roundRect(ctx, W / 2 - 520, y - 85, 1040, 170, 50, { fill: C.white, alpha: k });
  richText(ctx, parts, W / 2, y + 6, { size: 104, alpha: k });
}

const s2 = {
  id: 'short', title: '太短了，牽不到',
  lines: [
    { id: 'a', text: '這三根棒子，長度是八公分、四公分和兩公分。' },
    { id: 'b', text: '把最長的八公分放在地上，兩根短的接在兩邊，像兩隻手臂。' },
    { id: 'c', text: '兩隻手臂往中間靠，想要牽手……' },
    { id: 'd', text: '牽不到！就算整個躺平，還是差一大截。' },
    { id: 'e', text: '因為四加二只有六，比八還要短。所以圍不成三角形。', gap: 0.8 },
  ],
  sfx: (s) => [{ t: s.L.d + 0.3, k: 'buzz' }, { t: s.L.e + 5.2, k: 'buzz' }],
  draw(ctx, { t, L }) {
    const up = pr(t, L.b + 2.6, 1.2);
    const aL = track(t, [[L.b + 2.6, 0], [L.b + 3.8, 100], [L.c + 0.3, 100], [L.c + 2.2, 38], [L.c + 2.8, 46], [L.c + 3.6, 34], [L.d + 0.8, 34], [L.d + 2.4, 0]]);
    const aR = track(t, [[L.b + 2.6, 0], [L.b + 3.8, 105], [L.c + 0.3, 105], [L.c + 2.2, 40], [L.c + 2.8, 50], [L.c + 3.6, 36], [L.d + 0.8, 36], [L.d + 2.4, 0]]);
    const flat = pr(t, L.d + 2.4, 0.3);
    if (up <= 0) { // the three sticks introduced one by one, before they are put together
      const rows = [[8, BASE, L.a + 2.0], [4, LEFT, L.a + 3.3], [2, RIGHT, L.a + 4.4]];
      rows.forEach(([n, col, at], i) => {
        const k = outBack(pr(t, at, 0.4)); if (k <= 0) return;
        const y = 380 + i * 170, a = [X0, y], b = [X0 + n * U * k, y];
        stick(ctx, a, b, col, { unit: U });
        text(ctx, `${n} 公分`, X0 - 60, y, { size: 64, align: 'right', color: col, alpha: k });
      });
      return;
    }
    const { tipL, tipR } = arms(ctx, t, { left: 4, right: 2, aL, aR, labels: 1 - flat });
    if (flat > 0) {
      const y = GY - 70;
      line(ctx, [tipL[0], y], [tipR[0], y], { lw: 8, stroke: C.red, dash: [18, 16], alpha: flat });
      for (const x of [tipL[0], tipR[0]]) line(ctx, [x, y - 22], [x, y + 22], { lw: 8, stroke: C.red, alpha: flat });
      card(ctx, '差 2 公分', (tipL[0] + tipR[0]) / 2, y - 80, { size: 60, color: C.red, alpha: flat });
      text(ctx, '4', (X0 + tipL[0]) / 2, GY + 96, { size: 64, color: LEFT, alpha: flat });
      text(ctx, '2', (X1 + tipR[0]) / 2, GY + 96, { size: 64, color: RIGHT, alpha: flat });
    }
    const e1 = pr(t, L.e + 0.6, 0.4), e2 = pr(t, L.e + 3.0, 0.4);
    equation(ctx, [['4', LEFT], [' ＋ ', C.ink], ['2', RIGHT], [' ＝ 6', C.ink], ...(e2 > 0 ? [['  ＜  ', C.red], ['8', BASE]] : [])], e1);
    mark(ctx, 1580, 985, false, { scale: outBack(pr(t, L.e + 5.2, 0.5)) });
  },
};

const s3 = {
  id: 'equal', title: '剛剛好，扁掉了',
  lines: [
    { id: 'a', text: '那把兩公分換成四公分呢？四加四，剛好等於八。' },
    { id: 'b', text: '手臂往中間靠……牽到了！可是，要整個躺平才牽得到。' },
    { id: 'c', text: '三根棒子疊成一條線，扁扁的，裡面沒有空間，這不是三角形。', gap: 0.8 },
  ],
  sfx: (s) => [{ t: s.L.a + 1.6, k: 'pop' }, { t: s.L.b + 3.3, k: 'pop' }, { t: s.L.c + 4.6, k: 'buzz' }],
  draw(ctx, { t, L }) {
    const right = lerp(2, 4, outBack(pr(t, L.a + 1.2, 0.8)));
    const a = track(t, [[0, 100], [L.b + 0.2, 100], [L.b + 1.8, 30], [L.b + 3.3, 0]]);
    const flat = pr(t, L.b + 3.3, 0.3);
    const { tipL } = arms(ctx, t, { left: 4, right, aL: a, aR: a + 4 * (1 - flat), labels: 1 - flat });
    sparkle(ctx, tipL[0], tipL[1], pr(t, L.b + 3.3, 0.7, (x) => clamp(x)), { r: 110 });
    text(ctx, '4', (X0 + tipL[0]) / 2, GY + 96, { size: 64, color: LEFT, alpha: flat });
    text(ctx, '4', (X1 + tipL[0]) / 2, GY + 96, { size: 64, color: RIGHT, alpha: flat });
    card(ctx, '扁扁的一條線', W / 2, GY - 150, { size: 64, color: C.red, scale: outBack(pr(t, L.c + 1.8, 0.5)) });
    equation(ctx, [['4', LEFT], [' ＋ ', C.ink], ['4', RIGHT], ['  ＝  ', C.red], ['8', BASE]], pr(t, L.a + 3.2, 0.4));
    mark(ctx, 1580, 985, false, { scale: outBack(pr(t, L.c + 4.6, 0.5)) });
  },
};

const AL = Math.acos((16 + 64 - 36) / (2 * 4 * 8)) / D2R, AR = Math.acos((36 + 64 - 16) / (2 * 6 * 8)) / D2R;
const s4 = {
  id: 'works', title: '夠長了，成功！',
  lines: [
    { id: 'a', text: '再換一根長一點的：六公分。四加六等於十，比八還長。' },
    { id: 'b', text: '這次手臂不用躺平，在半空中就牽到手了！' },
    { id: 'c', text: '中間撐出一個空間，三角形完成！' },
    { id: 'd', text: '跟一開始說的一樣：兩根短的加起來，要比最長的那根還長。', gap: 1.0 },
  ],
  sfx: (s) => [{ t: s.L.a + 1.6, k: 'pop' }, { t: s.L.b + 3.0, k: 'ding' }, { t: s.L.d + 1.2, k: 'pop' }],
  draw(ctx, { t, L }) {
    const right = lerp(4, 6, outBack(pr(t, L.a + 1.2, 0.8)));
    const k = pr(t, L.b + 0.4, 2.6);
    const aL = lerp(105, AL, k), aR = lerp(58, AR, k);
    const done = pr(t, L.c + 0.3, 0.6);
    const apex = polar([X0, GY], AL, 4 * U);
    poly(ctx, [[X0, GY], [X1, GY], apex], { fill: C.green, stroke: null, alpha: 0.35 * done });
    arms(ctx, t, { left: 4, right, aL, aR });
    if (done > 0) face(ctx, apex[0] + 60, GY - 130, 1.5 * outBack(done), { look: Math.sin(t * 1.4) });
    sparkle(ctx, apex[0], apex[1], pr(t, L.b + 3.0, 0.8, (x) => clamp(x)), { r: 150 });
    const rule = pr(t, L.d + 1.2, 0.4);
    equation(ctx, [['4', LEFT], [' ＋ ', C.ink], ['6', RIGHT], [' ＝ 10', C.ink], ...(pr(t, L.a + 5.0, 0.3) > 0 ? [['  ＞  ', C.green], ['8', BASE]] : [])], pr(t, L.a + 3.0, 0.4) * (1 - rule));
    mark(ctx, 1580, 985, true, { scale: outBack(pr(t, L.c + 0.6, 0.5)) * (1 - rule) });
    if (rule > 0) {
      roundRect(ctx, W / 2 - 600, 165, 1200, 170, 50, { fill: C.yellow, alpha: rule });
      richText(ctx, [['短', LEFT], [' ＋ ', C.ink], ['短', RIGHT], ['  ＞  ', C.ink], ['最長', BASE]], W / 2, 256, { size: 110, alpha: rule });
    }
  },
};

// Why: the straight road is always the shortest one.
const HM = [330, 700], SC = [1590, 700], ST = [1050, 270];
const s5 = {
  id: 'why', title: '為什麼？直直走最近',
  lines: [
    { id: 'a', text: '為什麼呢？想想看走路。' },
    { id: 'b', text: '從家裡到學校，直直走是最近的路。' },
    { id: 'c', text: '如果先繞去便利商店，再去學校，一定比較遠。' },
    { id: 'd', text: '三角形也是一樣：繞路的兩條邊加起來，一定比直直走的那條邊長。' },
    { id: 'e', text: '而且三條邊，不管挑哪一條當直路，都是這樣。', gap: 1.0 },
  ],
  sfx: (s) => [{ t: s.L.d + 3.2, k: 'ding' }],
  draw(ctx, { t, L, E }) {
    const pts = [HM, SC, ST];
    const sides = [[HM, SC], [HM, ST], [ST, SC]];
    let straight = 0;
    const cyc = t >= L.e + 1.0 ? Math.min(2, Math.floor((t - (L.e + 1.0)) / ((E.e - L.e - 0.6) / 3))) : -1;
    if (cyc >= 0) straight = [1, 2, 0][cyc];
    sides.forEach(([p, q]) => line(ctx, p, q, { lw: 44, stroke: C.soft }));
    const dK = pr(t, L.b + 1.4, 2.0), rK = pr(t, L.c + 0.6, 3.2);
    if (cyc >= 0) sides.forEach(([p, q], i) => line(ctx, p, q, { lw: 24, stroke: i === straight ? C.green : C.orange }));
    else {
      if (rK > 0) {
        const d1 = dist(HM, ST), d2 = dist(ST, SC), at = rK * (d1 + d2);
        line(ctx, HM, lerpP(HM, ST, clamp(at / d1)), { lw: 24, stroke: C.orange });
        if (at > d1) line(ctx, ST, lerpP(ST, SC, (at - d1) / d2), { lw: 24, stroke: C.orange });
      }
      if (dK > 0) line(ctx, HM, lerpP(HM, SC, dK), { lw: 24, stroke: C.green });
    }
    const icons = [['🏠', '家', HM, 0.8], ['🏫', '學校', SC, 1.2], ['🏪', '便利商店', ST, L.c + 0.2]];
    icons.forEach(([em, name, p, at]) => {
      const k = outBack(pr(t, at, 0.5)); if (k <= 0) return;
      circle(ctx, p, 92 * k, { fill: C.white, lw: 7 });
      text(ctx, em, p[0], p[1] + 6, { size: 104, scale: k });
      text(ctx, name, p[0], p === ST ? p[1] - 140 : p[1] + 150, { size: 54, alpha: k });
    });
    if (cyc < 0) {
      const walker = (p, col) => { circle(ctx, [p[0], p[1] - 62], 30, { fill: col, lw: 6 }); face(ctx, p[0], p[1] - 66, 0.62); };
      if (dK > 0 && dK < 1) walker(lerpP(HM, SC, dK), C.green);
      if (rK > 0 && rK < 1) { const d1 = dist(HM, ST), d2 = dist(ST, SC), at = rK * (d1 + d2); walker(at < d1 ? lerpP(HM, ST, at / d1) : lerpP(ST, SC, (at - d1) / d2), C.orange); }
      card(ctx, '直直走：最近', 960, 800, { size: 58, fill: C.green, color: C.white, scale: outBack(pr(t, L.b + 2.6, 0.4)) * (1 - pr(t, L.d + 2.6, 0.3)) });
      card(ctx, '繞路：比較遠', 540, 400, { size: 58, fill: C.orange, color: C.white, scale: outBack(pr(t, L.c + 3.4, 0.4)) * (1 - pr(t, L.d + 2.6, 0.3)) });
    }
    const rule = outBack(pr(t, L.d + 3.2, 0.5));
    if (rule > 0) {
      ctx.save(); ctx.translate(W / 2, 985); ctx.scale(rule, rule);
      roundRect(ctx, -640, -72, 1280, 144, 46, { fill: C.white });
      ctx.restore();
      richText(ctx, [['繞路的兩邊', C.orange], [' 加起來 ＞ ', C.ink], ['直走的一邊', C.green]], W / 2, 990, { size: 78, scale: rule });
    }
  },
};

// "Difference < third side": a short stick hinged on a long one, opening like a door.
const HG = [520, 650], UU = 110, FAR = [HG[0] + 8 * UU, HG[1]];
const NX = (v) => 360 + v * 100, NY = 930;
const s6 = {
  id: 'door', title: '第三邊可以多長？',
  lines: [
    { id: 'a', text: '還有一個說法：第三邊的長度，一定比另外兩邊相減大，比兩邊相加小。' },
    { id: 'b', text: '看這兩根棒子，八公分和三公分，一頭釘在一起，像一扇門。' },
    { id: 'c', text: '門關起來的時候，兩個尖端最近，距離是八減三，等於五。' },
    { id: 'd', text: '門完全打開的時候，尖端最遠，距離是八加三，等於十一。' },
    { id: 'e', text: '可是關到底，或是開到底，都是扁扁的一條線。' },
    { id: 'f', text: '要變成三角形，門只能開在中間。所以第三邊一定比五大，又比十一小。' },
    { id: 'g', text: '也就是：比兩邊相減大，比兩邊相加小。', gap: 1.0 },
  ],
  sfx: (s) => [{ t: s.L.c + 5.6, k: 'pop' }, { t: s.L.d + 5.6, k: 'pop' }, { t: s.L.f + 1.6, k: 'ding' }],
  draw(ctx, { t, L, E }) {
    const appear = pr(t, L.b + 0.6, 0.6);
    const th = track(t, [
      [L.b + 3.6, 0], [L.b + 4.6, 62], [L.c + 0.4, 62], [L.c + 2.2, 0],
      [L.d + 0.4, 0], [L.d + 3.0, 180], [L.e + 0.3, 180], [L.e + 1.8, 0], [L.e + 2.2, 0], [L.e + 3.8, 180],
      [L.f + 0.3, 180], [L.f + 1.8, 68], [L.g + 0.2, 68], [L.g + 1.6, 30], [L.g + 3.4, 150], [E.g + 0.8, 80],
    ]);
    const tip = polar(HG, th, 3 * UU);
    const d = Math.sqrt(64 + 9 - 48 * Math.cos(th * D2R));
    const isTri = th > 3 && th < 177;
    const showThird = pr(t, L.b + 4.6, 0.4);
    // number line for the length of the third side
    const nl = pr(t, L.c - 0.2, 0.5);
    if (nl > 0) {
      ctx.save(); ctx.globalAlpha = nl;
      text(ctx, '第三邊的長度', NX(0) - 40, NY - 4, { size: 44, align: 'right', color: THIRD });
      roundRect(ctx, NX(5), NY - 26, NX(11) - NX(5), 52, 26, { fill: C.green, stroke: null, alpha: 0.35 * pr(t, L.f + 1.6, 0.5) });
      line(ctx, [NX(0), NY], [NX(12.4), NY], { lw: 8 });
      for (let v = 0; v <= 12; v++) {
        line(ctx, [NX(v), NY - 16], [NX(v), NY + 16], { lw: 6 });
        text(ctx, String(v), NX(v), NY + 58, { size: 44, color: v === 5 || v === 11 ? C.red : C.ink });
      }
      const m = NX(d);
      poly(ctx, [[m, NY - 22], [m - 26, NY - 70], [m + 26, NY - 70]], { fill: THIRD, lw: 6, alpha: showThird });
      ctx.restore();
      const c5 = outBack(pr(t, L.c + 5.6, 0.4)), c11 = outBack(pr(t, L.d + 5.6, 0.4));
      circle(ctx, [NX(5), NY], 20 * c5, { fill: C.bg, stroke: C.red, lw: 8 });
      circle(ctx, [NX(11), NY], 20 * c11, { fill: C.bg, stroke: C.red, lw: 8 });
      card(ctx, '8 − 3', NX(5), NY - 130, { size: 50, color: C.red, scale: c5 });
      card(ctx, '8 ＋ 3', NX(11), NY - 130, { size: 50, color: C.red, scale: c11 });
    }
    if (appear <= 0) {
      const r0 = pr(t, L.a + 2.6, 0.5) * (1 - pr(t, L.b - 0.3, 0.3));
      roundRect(ctx, W / 2 - 640, 150, 1280, 150, 48, { fill: C.yellow, alpha: r0 });
      richText(ctx, [['相減', C.red], ['  ＜  ', C.ink], ['第三邊', THIRD], ['  ＜  ', C.ink], ['相加', C.red]], W / 2, 230, { size: 96, alpha: r0 });
      return;
    }
    poly(ctx, [HG, FAR, tip], { fill: C.green, stroke: null, alpha: 0.3 * pr(t, L.f + 1.6, 0.5) * (isTri ? 1 : 0) });
    if (showThird > 0) {
      const off = isTri ? 0 : (th < 90 ? -74 : -74); // lift the dashed line off the sticks when everything is flat
      line(ctx, [tip[0], tip[1] + off], [FAR[0], FAR[1] + off], { lw: 12, stroke: THIRD, dash: [26, 20], alpha: showThird });
      const mid = [(tip[0] + FAR[0]) / 2, (tip[1] + FAR[1]) / 2 + off];
      card(ctx, d.toFixed(1).replace('.0', ''), mid[0] + (isTri ? 50 : 0), mid[1] - 78, { size: 60, color: THIRD, alpha: showThird });
    }
    stick(ctx, HG, lerpP(HG, FAR, appear), BASE, { unit: UU });
    stick(ctx, HG, lerpP(HG, tip, appear), LEFT, { unit: UU });
    circle(ctx, HG, 22, { fill: C.yellow, lw: 7 });
    text(ctx, '8', (HG[0] + FAR[0]) / 2 + 200, HG[1] + 82, { size: 60, color: BASE, alpha: appear });
    if (isTri) stickLabel(ctx, HG, tip, '3', LEFT, { off: 70, side: -1, size: 46, alpha: appear });
    else text(ctx, '3', (HG[0] + tip[0]) / 2, HG[1] + 82, { size: 60, color: LEFT });
    const flatTag = (th < 2 || th > 178) && t > L.e ? 1 : 0;
    card(ctx, '扁扁的，不是三角形', W / 2, 210, { size: 64, color: C.red, alpha: flatTag * (1 - pr(t, L.f, 0.2)) });
    const rule = Math.max(pr(t, L.g + 0.4, 0.5), pr(t, L.a + 2.6, 0.5) * (1 - pr(t, L.b - 0.3, 0.3)));
    if (rule > 0) {
      roundRect(ctx, W / 2 - 640, 150, 1280, 150, 48, { fill: C.yellow, alpha: rule });
      richText(ctx, [['相減', C.red], ['  ＜  ', C.ink], ['第三邊', THIRD], ['  ＜  ', C.ink], ['相加', C.red]], W / 2, 230, { size: 96, alpha: rule });
    } else if (pr(t, L.f + 3.6, 0.4) > 0) {
      richText(ctx, [['5', C.red], ['  ＜  ', C.ink], ['第三邊', THIRD], ['  ＜  ', C.ink], ['11', C.red]], W / 2, 230, { size: 96, alpha: pr(t, L.f + 3.6, 0.4) });
    }
  },
};

function quiz(ctx, t, o) {
  const { a, b, c, ask, ans, end, ok, sumText } = o;
  if (t < ask - 0.2 || t > end) return;
  const u = 88, x0 = 500, vis = pr(t, ask, 0.4) * (1 - pr(t, end - 0.3, 0.3));
  const k = pr(t, ans, 1.0);
  ctx.save(); ctx.globalAlpha = vis;
  text(ctx, `${a}、${b}、${c} 公分，可以圍成三角形嗎？`, W / 2, 230, { size: 80 });
  const yL = lerp(380, 600, k), yA = lerp(520, 730, k), yB = lerp(660, 730, k);
  const xB = lerp(x0, x0 + a * u, k);
  stick(ctx, [x0, yL], [x0 + c * u, yL], BASE, { unit: u });
  stick(ctx, [x0, yA], [x0 + a * u, yA], LEFT, { unit: u });
  stick(ctx, [xB, yB], [xB + b * u, yB], RIGHT, { unit: u });
  text(ctx, String(c), x0 - 70, yL, { size: 64, color: BASE });
  text(ctx, String(a), lerp(x0 - 70, x0 + a * u / 2, k), lerp(yA, yA + 84, k), { size: 64, color: LEFT });
  text(ctx, String(b), lerp(x0 - 70, x0 + a * u + b * u / 2, k), lerp(yB, yB + 84, k), { size: 64, color: RIGHT });
  if (k >= 1) {
    const xe = x0 + (a + b) * u, xc = x0 + c * u;
    line(ctx, [xc, yL - 60], [xc, yA + 60], { lw: 6, stroke: C.grey, dash: [14, 12] });
    line(ctx, [xe, yL - 60], [xe, yA + 60], { lw: 6, stroke: ok ? C.green : C.red, dash: [14, 12] });
  }
  ctx.restore();
  const r = outBack(pr(t, ans + 1.2, 0.5)) * (1 - pr(t, end - 0.3, 0.3));
  richText(ctx, sumText, W / 2 - 90, 940, { size: 100, scale: r });
  mark(ctx, 1560, 935, ok, { scale: r });
}
const s7 = {
  id: 'quiz', title: '挑戰時間',
  lines: [
    { id: 'a', text: '來挑戰一題！三公分、四公分、八公分，可以圍成三角形嗎？', gap: 3.0 },
    { id: 'b', text: '不行！三加四等於七，比八小，手牽不到。', gap: 0.8 },
    { id: 'c', text: '那五公分、六公分、十公分呢？', gap: 3.0 },
    { id: 'd', text: '可以！五加六等於十一，比十大。', gap: 0.9 },
    { id: 'e', text: '記住囉：兩根短的加起來，比最長的還長，才能圍成三角形。我們下次見！', gap: 1.3 },
  ],
  sfx: (s) => [{ t: s.L.b + 0.1, k: 'buzz' }, { t: s.L.d + 0.1, k: 'ding' }, { t: s.L.e + 1.6, k: 'ding' }],
  draw(ctx, { t, L, E }) {
    quiz(ctx, t, { a: 3, b: 4, c: 8, ask: L.a + 1.4, ans: L.b, end: L.c, ok: false, sumText: [['3', LEFT], [' ＋ ', C.ink], ['4', RIGHT], [' ＝ 7  ＜  ', C.ink], ['8', BASE]] });
    quiz(ctx, t, { a: 5, b: 6, c: 10, ask: L.c, ans: L.d, end: L.e, ok: true, sumText: [['5', LEFT], [' ＋ ', C.ink], ['6', RIGHT], [' ＝ 11  ＞  ', C.ink], ['10', BASE]] });
    thinking(ctx, t, E.a, L.b - 0.1, 1700, 520);
    thinking(ctx, t, E.c, L.d - 0.1, 1700, 520);
    const k = outBack(pr(t, L.e + 0.4, 0.6));
    if (k > 0) {
      const u = 90, P0 = [300, 800], P1 = [300 + 5 * u, 800], P2 = [300, 800 - 12 * u * 0.3];
      ctx.save(); ctx.translate(540, 600); ctx.scale(k, k); ctx.translate(-540, -600);
      const A = [330, 800], B = [830, 800], Cc = [520, 420];
      poly(ctx, [A, B, Cc], { fill: C.green, stroke: null, alpha: 0.3 });
      stick(ctx, A, B, BASE); stick(ctx, A, Cc, LEFT); stick(ctx, B, Cc, RIGHT);
      face(ctx, 560, 660, 1.5, { look: Math.sin(t * 1.5) });
      ctx.restore();
      const r1 = outBack(pr(t, L.e + 1.6, 0.5)), r2 = pr(t, L.e + 5.2, 0.5);
      richText(ctx, [['短', LEFT], [' ＋ ', C.ink], ['短', RIGHT], ['  ＞  ', C.ink], ['最長', BASE]], 1360, 470, { size: 120, scale: r1 });
      richText(ctx, [['相減', C.red], [' ＜ ', C.ink], ['第三邊', THIRD], [' ＜ ', C.ink], ['相加', C.red]], 1360, 680, { size: 70, alpha: r2 });
      sparkle(ctx, 1360, 470, pr(t, L.e + 1.6, 1.0, (x) => clamp(x)), { r: 460, n: 12 });
    }
  },
};

export default { id: 'triangle-sides-rule', title: '三根棒子一定能圍成三角形嗎？', scenes: [s1, s2, s3, s4, s5, s6, s7] };
