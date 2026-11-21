// Video 1: why the three angles of a triangle add up to 180 degrees.
// Answer first, then a quick special case (half a rectangle), then the pencil-turning argument for any triangle.
import {
  C, W, D2R, clamp, outBack, pr, lerpP, track, polar, corner,
  text, richText, poly, line, wedge, circle, roundRect, card, face, sparkle, pencil,
} from './lib.mjs';

const COL = [C.red, C.blue, C.yellow]; // top, left, right corner

/** Triangle (top A, left B, right C) with coloured corner marks kept inside the shape. */
function tri(ctx, A, B, Cc, o = {}) {
  const { r = 80, fill = C.white, alpha = 1, wedges = 1, lw = 8 } = o;
  poly(ctx, [A, B, Cc], { fill, alpha, lw });
  if (wedges > 0) {
    const cs = [corner(A, B, Cc), corner(B, Cc, A), corner(Cc, A, B)];
    ctx.save();
    ctx.beginPath(); ctx.moveTo(...A); ctx.lineTo(...B); ctx.lineTo(...Cc); ctx.closePath(); ctx.clip();
    [A, B, Cc].forEach((p, i) => wedge(ctx, p, cs[i].a0, cs[i].sweep, r * wedges, COL[i], { alpha, lw: 5 }));
    ctx.restore();
    poly(ctx, [A, B, Cc], { alpha, lw });
  }
}
const angles = (A, B, Cc) => [corner(A, B, Cc), corner(B, Cc, A), corner(Cc, A, B)].map((c) => Math.abs(c.sweep));

const s1 = {
  id: 'answer', title: '先講答案',
  lines: [
    { id: 'a', text: '先告訴你答案：不管什麼形狀的三角形，三個角加起來，一定是一百八十度。' },
    { id: 'b', text: '為什麼呢？我們一起來看看。' },
  ],
  sfx: (s) => [{ t: 0.9, k: 'pop' }, { t: 1.4, k: 'pop' }, { t: 1.9, k: 'pop' }, { t: s.L.a + 5.2, k: 'ding' }],
  draw(ctx, { t, L }) {
    const shapes = [
      { pts: [[400, 250], [170, 610], [630, 610]], at: 0.9 },
      { pts: [[960, 170], [860, 610], [1060, 610]], at: 1.4 },
      { pts: [[1700, 300], [1250, 610], [1560, 610]], at: 1.9 },
    ];
    for (const sh of shapes) {
      const k = outBack(pr(t, sh.at, 0.5));
      if (k <= 0) continue;
      const cx = (sh.pts[0][0] + sh.pts[1][0] + sh.pts[2][0]) / 3, cy = (sh.pts[0][1] + sh.pts[1][1] + sh.pts[2][1]) / 3;
      const bob = Math.sin(t * 2.2 + cx) * 6;
      const pts = sh.pts.map((p) => [cx + (p[0] - cx) * k, cy + bob + (p[1] - cy) * k]);
      tri(ctx, ...pts, { r: 62, wedges: pr(t, L.a + 3.2, 0.5) });
      face(ctx, cx, cy + bob + 40, 0.9 * k, { look: Math.sin(t * 1.3) });
    }
    text(ctx, '三個角加起來', W / 2, 770, { size: 90, alpha: pr(t, L.a + 3.4, 0.4) });
    richText(ctx, [['● ', C.red], ['＋ ', C.ink], ['● ', C.blue], ['＋ ', C.ink], ['● ', C.yellow], ['＝ 180°', C.ink]], W / 2, 920, { size: 130, scale: outBack(pr(t, L.a + 5.2, 0.5)) });
    for (const [x, y, d] of [[745, 380, 0], [1155, 380, 0.25], [1790, 230, 0.5]]) {
      text(ctx, '？', x, y + Math.sin(t * 3 + x) * 8, { size: 120, color: C.orange, scale: outBack(pr(t, L.b + d, 0.45)) });
    }
  },
};

// Half a rectangle: a quick special case that already gives 180.
const RX0 = 300, RX1 = 1100, RY0 = 340, RY1 = 790;
const TL = [RX0, RY0], TR = [RX1, RY0], BR = [RX1, RY1], BL = [RX0, RY1], RC = [(RX0 + RX1) / 2, (RY0 + RY1) / 2];
const LOW = '#BFE3F5', UP = '#FFE3A3'; // the two halves
const rot = (p, c, deg) => { const a = -deg * D2R, x = p[0] - c[0], y = p[1] - c[1]; return [c[0] + x * Math.cos(a) - y * Math.sin(a), c[1] + x * Math.sin(a) + y * Math.cos(a)]; };
const shift = (pts, d) => pts.map((p) => [p[0] + d[0], p[1] + d[1]]);
function cornerMark(ctx, p, q, r, color, o = {}) { const c = corner(p, q, r); wedge(ctx, p, c.a0, c.sweep, o.r ?? 78, color, { lw: 5, alpha: o.alpha ?? 1 }); }
const s2 = {
  id: 'rect', title: '長方形切一半',
  lines: [
    { id: 'a', text: '先看長方形。長方形有四個角，每個都是直角，九十度。' },
    { id: 'b', text: '四個九十度加起來，是三百六十度。' },
    { id: 'c', text: '沿著對角線切一刀，變成兩個三角形。' },
    { id: 'd', text: '把其中一個轉半圈疊上去，剛好一模一樣。' },
    { id: 'e', text: '長方形的四個角，全部分給了這兩個三角形，沒有多，也沒有少。' },
    { id: 'f', text: '兩個一樣的三角形平分三百六十度，所以每一個是一百八十度。' },
    { id: 'g', text: '不過，這個三角形裡面有一個直角。那沒有直角、歪歪的三角形，也是一百八十度嗎？', gap: 0.8 },
  ],
  sfx: (s) => [
    ...[0, 1, 2, 3].map((i) => ({ t: s.L.a + 2.4 + i * 0.5, k: 'pop' })), { t: s.L.b + 3.0, k: 'pop' }, { t: s.L.c + 1.6, k: 'pop' },
    { t: s.L.d + 3.4, k: 'ding' }, { t: s.L.f + 4.2, k: 'ding' },
  ],
  draw(ctx, { t, L }) {
    const cut = pr(t, L.c + 1.6, 0.6), spin = track(t, [[L.d + 0.8, 0], [L.d + 3.2, 180], [L.e - 0.6, 180], [L.e + 0.5, 360]]);
    const lone = pr(t, L.g + 0.3, 0.6); // only the lower triangle stays for the closing question
    const gap = 16 * cut * (1 - pr(t, L.d + 0.6, 0.3) + pr(t, L.e + 0.5, 0.3));
    const dLow = [-gap, gap], dUp = [gap, -gap];
    const low = shift([TL, BL, BR], dLow);
    const upHome = shift([TL, TR, BR], dUp);
    const up = upHome.map((p) => rot(p, [RC[0] + dUp[0], RC[1] + dUp[1]], spin));
    if (cut <= 0) {
      poly(ctx, [TL, TR, BR, BL].map((p) => lerpP(RC, p, outBack(pr(t, 0.4, 0.6)))), { fill: C.white });
      const dg = pr(t, L.c + 0.4, 1.0);
      if (dg > 0) line(ctx, TL, lerpP(TL, BR, dg), { lw: 8, stroke: C.red, dash: [22, 16] });
    } else {
      poly(ctx, low, { fill: LOW });
      poly(ctx, up, { fill: UP, alpha: (1 - lone) * (spin > 1 && spin < 359 ? 0.82 : 1) });
    }
    // right-angle marks while we are still counting the rectangle's corners
    [[TL, 1, 1], [TR, -1, 1], [BR, -1, -1], [BL, 1, -1]].forEach(([p, sx, sy], i) => {
      const k = outBack(pr(t, L.a + 2.4 + i * 0.5, 0.4)) * (1 - pr(t, L.c + 0.2, 0.3));
      if (k <= 0) return;
      poly(ctx, [[p[0] + 64 * sx, p[1]], [p[0] + 64 * sx, p[1] + 64 * sy], [p[0], p[1] + 64 * sy]], { close: false, stroke: C.red, lw: 7, alpha: k });
      text(ctx, '90°', p[0] + 130 * sx, p[1] + 100 * sy, { size: 54, color: C.red, scale: k });
    });
    // which corner piece belongs to which triangle
    if (t >= L.e + 0.5) {
      const [lTL, lBL, lBR] = low, [uTL, uTR, uBR] = upHome, keep = 1 - lone;
      const a1 = pr(t, L.e + 0.9, 0.4), a2 = pr(t, L.e + 2.6, 0.4), a3 = pr(t, L.e + 3.6, 0.4);
      cornerMark(ctx, lBL, lBR, lTL, C.blue, { alpha: a1 }); cornerMark(ctx, uTR, uTL, uBR, C.orange, { alpha: a1 * keep });
      cornerMark(ctx, lTL, lBL, lBR, C.blue, { alpha: a2, r: 110 }); cornerMark(ctx, uTL, uBR, uTR, C.orange, { alpha: a2 * keep, r: 110 });
      cornerMark(ctx, lBR, lTL, lBL, C.blue, { alpha: a3, r: 110 }); cornerMark(ctx, uBR, uTR, uTL, C.orange, { alpha: a3 * keep, r: 110 });
      poly(ctx, low, { fill: null }); poly(ctx, upHome, { fill: null, alpha: keep });
    }
    card(ctx, '一模一樣！', RC[0], 210, { size: 68, fill: C.green, color: C.white, scale: outBack(pr(t, L.d + 3.4, 0.5)) * (1 - pr(t, L.e - 0.3, 0.3)) });
    // running sums on the right
    const X = 1520, eqOut = 1 - lone;
    richText(ctx, [['90°', C.red], [' × 4', C.ink]], X, 400, { size: 96, alpha: pr(t, L.b + 0.6, 0.4) * eqOut });
    text(ctx, '＝ 360°', X, 530, { size: 120, scale: outBack(pr(t, L.b + 3.0, 0.5)), alpha: eqOut });
    text(ctx, '÷ 2', X, 680, { size: 96, color: C.blue, alpha: pr(t, L.f + 1.6, 0.4) * eqOut });
    text(ctx, '＝ 180°', X, 820, { size: 140, color: C.red, scale: outBack(pr(t, L.f + 4.2, 0.5)), alpha: eqOut });
    if (lone > 0) {
      const k = outBack(pr(t, L.g + 3.6, 0.5));
      ctx.save(); ctx.translate(1480, 600); ctx.scale(k, k);
      poly(ctx, [[-60, -190], [-330, 190], [330, 190]], { fill: C.white });
      ctx.restore();
      text(ctx, '180°？', 1480, 250, { size: 120, color: C.orange, scale: outBack(pr(t, L.g + 5.4, 0.5)) });
      text(ctx, '180°', 620, 230, { size: 110, color: C.red, alpha: lone });
    }
  },
};

// The pencil argument: turn through each corner in the same direction and the pencil ends up reversed.
const PL = 300;
/** Pencil pose after `u` steps (0..5): turn at B, slide to A, turn at A, slide backwards to C, turn at C. */
function pencilRun(A, B, Cc, u, len = PL) {
  const [a, b, c] = angles(A, B, Cc);
  const k = (i) => clamp(u - i);
  const dir = b * k(0) + a * k(2) + c * k(4);
  let tail;
  if (u <= 1) tail = B;
  else if (u <= 2) tail = lerpP(B, polar(A, b + 180, len), k(1));          // slide forward until the tip reaches A
  else if (u <= 3) tail = polar(A, dir + 180, len);                        // the tip stays on A while turning
  else if (u <= 4) tail = lerpP(polar(A, b + a + 180, len), Cc, k(3));     // slide backwards until the tail reaches C
  else tail = Cc;
  const turning = (u > 0 && u < 1) || (u > 2 && u < 3) || (u > 4 && u < 5);
  return { tail, dir, turned: [b * k(0), a * k(2), c * k(4)], pivot: u <= 1 ? B : u <= 3 ? A : Cc, turning };
}
function dial(ctx, p, turned, alpha = 1) {
  if (alpha <= 0) return;
  const r = 190;
  ctx.save(); ctx.globalAlpha = alpha;
  circle(ctx, p, r, { fill: C.white, lw: 6 });
  line(ctx, [p[0] - r, p[1]], [p[0] + r, p[1]], { lw: 4, stroke: C.grey, dash: [10, 10] });
  let a0 = 0;
  [C.blue, C.red, C.yellow].forEach((col, i) => { if (turned[i] > 0.05) wedge(ctx, p, a0, turned[i], r, col, { lw: 5 }); a0 += turned[i]; });
  line(ctx, p, polar(p, a0, r + 26), { lw: 12, stroke: C.ink });
  circle(ctx, p, 14, { fill: C.ink, stroke: null });
  text(ctx, '鉛筆轉了多少', p[0], p[1] + r + 60, { size: 46 });
  ctx.restore();
}
const T1 = { A: [620, 330], B: [300, 830], C: [1100, 830] }, T2 = { A: [640, 640] };
const DP = [1540, 470];
const s3 = {
  id: 'pencil', title: '鉛筆轉一轉',
  lines: [
    { id: 'a', text: '拿一枝鉛筆來檢查看看。先記得：轉半圈，就是一百八十度。' },
    { id: 'b', text: '把鉛筆放在三角形的底邊上，筆尖朝右。' },
    { id: 'c', text: '在第一個角，照著角的大小轉過去，貼到另一條邊上。' },
    { id: 'd', text: '沿著邊滑到第二個角，一樣往同一邊轉。', gap: 1.0 },
    { id: 'e', text: '再倒退著滑到第三個角，再轉一次。', gap: 1.5 },
    { id: 'f', text: '鉛筆回到底邊了，可是你看，筆尖變成朝左！' },
    { id: 'g', text: '頭尾顛倒，就是轉了半圈。三個角加起來，剛好是半圈，一百八十度。' },
    { id: 'h', text: '換一個扁扁的三角形再試一次。還是頭尾顛倒，還是一百八十度。', gap: 1.9 },
  ],
  sfx: (s) => [{ t: s.L.a + 5.6, k: 'ding' }, { t: s.L.c + 3.4, k: 'pop' }, { t: s.L.d + 4.2, k: 'pop' }, { t: s.L.e + 4.4, k: 'pop' }, { t: s.L.f + 2.6, k: 'ding' }, { t: s.L.g + 5.0, k: 'ding' }, { t: s.E.h + 0.4, k: 'ding' }],
  draw(ctx, { t, L, E }) {
    if (t < L.b - 0.15) { // a lone pencil making a half turn
      const turn = track(t, [[L.a + 3.6, 0], [L.a + 5.6, 180]]), c = [960, 600], a = outBack(pr(t, 0.5, 0.5)) * (1 - pr(t, L.b - 0.5, 0.3));
      if (a <= 0) return;
      wedge(ctx, c, 0, Math.max(turn, 0.01), 210, C.yellow, { lw: 5, alpha: 0.7 * a });
      pencil(ctx, polar(c, turn + 180, PL * 0.75 * a), turn, PL * 1.5 * a, { alpha: a });
      text(ctx, `${Math.round(turn)}°`, 960, 290, { size: 150, alpha: pr(t, L.a + 3.4, 0.3) * a });
      card(ctx, '轉半圈 ＝ 180°', 960, 900, { size: 84, fill: C.green, color: C.white, scale: outBack(pr(t, L.a + 5.6, 0.5)) * (a > 0.5 ? 1 : 0) });
      return;
    }
    const second = t >= L.h;
    const A = lerpP(T1.A, T2.A, pr(t, L.h + 0.2, 0.8)), B = T1.B, Cc = T1.C;
    const h1 = (E.h + 0.4 - (L.h + 1.4)) / 5;
    const u = second
      ? track(t, [[L.h + 1.4, 0], ...[1, 2, 3, 4, 5].map((i) => [L.h + 1.4 + h1 * i, i])])
      : track(t, [[L.c + 1.2, 0], [L.c + 3.4, 1], [L.d + 0.2, 1], [L.d + 1.8, 2], [L.d + 2.4, 2], [L.d + 4.2, 3], [L.e + 0.3, 3], [L.e + 2.2, 4], [L.e + 2.7, 4], [L.e + 4.4, 5]]);
    const run = pencilRun(A, B, Cc, u);
    tri(ctx, A, B, Cc, { r: 96, alpha: pr(t, L.b - 0.1, 0.4) });
    if (u >= 5 && !second) pencil(ctx, B, 0, PL, { alpha: 0.28 * pr(t, L.f + 2.2, 0.4) }); // where it started
    if (run.turning) { // a small arrow showing which way the pencil is turning
      const c = run.pivot, end = run.dir + (run.pivot === A ? 180 : 0) + 34, R = PL + 40;
      ctx.save(); ctx.strokeStyle = C.orange; ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(c[0], c[1], R, -(end - 30) * D2R, -end * D2R, true); ctx.stroke();
      ctx.restore();
      const tip = polar(c, end, R);
      poly(ctx, [polar(tip, end - 90 + 40, 40), tip, polar(tip, end - 90 - 40, 40)], { close: false, lw: 12, stroke: C.orange });
    }
    pencil(ctx, run.tail, run.dir, PL, { alpha: pr(t, L.b + 1.0, 0.5) });
    card(ctx, '倒退滑', (A[0] + Cc[0]) / 2 + 160, (A[1] + Cc[1]) / 2 - 90, { size: 52, alpha: second ? 0 : pr(t, L.e + 0.4, 0.3) * (1 - pr(t, L.e + 2.4, 0.3)) });
    dial(ctx, DP, run.turned, pr(t, L.c + 0.2, 0.5));
    if (u >= 5) {
      const tipP = polar(run.tail, run.dir, PL);
      sparkle(ctx, tipP[0], tipP[1], pr(t, second ? E.h + 0.4 : L.f + 2.6, 0.8, (x) => clamp(x)), { r: 130 });
      if (!second) {
        const hide = 1 - pr(t, L.h - 0.3, 0.3);
        card(ctx, '筆尖朝左', tipP[0] + 40, tipP[1] + 110, { size: 52, color: C.red, scale: outBack(pr(t, L.f + 2.6, 0.4)) * hide });
        text(ctx, '一開始', B[0] + 150, B[1] - 70, { size: 44, color: C.grey, alpha: pr(t, L.f + 2.2, 0.4) * hide });
      }
    }
    const done = second ? pr(t, E.h + 0.4, 0.4) : pr(t, L.g + 5.0, 0.4) * (1 - pr(t, L.h, 0.3));
    text(ctx, '半圈 ＝ 180°', DP[0], 160, { size: 100, color: C.red, scale: outBack(done) });
  },
};

const s4 = {
  id: 'wrap', title: '換你試試看',
  lines: [
    { id: 'a', text: '記住囉：三角形三個角加起來，一定是一百八十度。' },
    { id: 'b', text: '換你試試看：畫一個三角形，拿鉛筆在三個角各轉一次，看看筆尖是不是也掉頭了。', gap: 1.4 },
  ],
  sfx: (s) => [{ t: s.L.a + 2.6, k: 'ding' }, { t: s.L.b + 1.6, k: 'pop' }, { t: s.L.b + 3.4, k: 'pop' }, { t: s.L.b + 5.6, k: 'pop' }],
  draw(ctx, { t, L }) {
    const out = pr(t, L.b - 0.2, 0.4);
    const k = outBack(pr(t, 0.4, 0.6)) * (1 - out);
    if (k > 0) {
      ctx.save(); ctx.translate(520, 580); ctx.scale(k, k);
      tri(ctx, [0, -260], [-330, 220], [330, 220], { r: 100 });
      face(ctx, 0, 80, 1.6, { look: Math.sin(t * 1.5) });
      ctx.restore();
      text(ctx, '三個角加起來', 1320, 420, { size: 104, scale: k });
      text(ctx, '＝ 180°', 1320, 620, { size: 220, color: C.red, scale: outBack(pr(t, L.a + 2.6, 0.5)) * (1 - out) * (1 + 0.03 * Math.sin(t * 5)) });
      sparkle(ctx, 1320, 620, pr(t, L.a + 2.6, 1.0, (x) => clamp(x)), { r: 420, n: 12 });
    }
    const A = [-30, -140], B = [-180, 120], Cc = [180, 120], small = 150;
    const cards = [
      { x: 370, at: L.b + 1.6, label: '① 畫一個三角形' },
      { x: 960, at: L.b + 3.4, label: '② 鉛筆放在底邊' },
      { x: 1550, at: L.b + 5.6, label: '③ 三個角各轉一次' },
    ];
    cards.forEach((cd, i) => {
      const q = outBack(pr(t, cd.at, 0.5));
      if (q <= 0) return;
      ctx.save(); ctx.translate(cd.x, 500); ctx.scale(q, q);
      roundRect(ctx, -250, -250, 500, 500, 44, { fill: C.white });
      tri(ctx, A, B, Cc, { r: 54, wedges: i === 0 ? 0 : 1, fill: C.bg });
      if (i === 1) pencil(ctx, B, 0, small, { w: 24 });
      if (i === 2) {
        const loop = clamp((((t - cd.at - 0.6) % 4.6) + 4.6) % 4.6 / 4.6 * 5.8, 0, 5);
        const run = pencilRun(A, B, Cc, t < cd.at + 0.6 ? 0 : loop, small);
        pencil(ctx, run.tail, run.dir, small, { w: 24 });
      }
      ctx.restore();
      text(ctx, cd.label, cd.x, 830, { size: 54, alpha: pr(t, cd.at + 0.2, 0.3) });
    });
  },
};

export default { id: 'triangle-angles-180', title: '為什麼三角形的三個角加起來是 180 度？', scenes: [s1, s2, s3, s4] };
