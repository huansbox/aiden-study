// Drawing + timing helpers shared by both videos. Angles are in degrees, math orientation
// (0 = right, counter-clockwise positive, y up), converted to canvas space inside the helpers.
export const W = 1920, H = 1080, FPS = 30;
export const C = {
  bg: '#FFF7E8', dot: '#F1E4CB', ink: '#2B2D42', red: '#EF476F', blue: '#2A9FD6', yellow: '#FFC43D',
  green: '#06B48A', orange: '#F78C4B', purple: '#8E6BD9', grey: '#B9B1A2', white: '#FFFFFF', soft: '#F3E8D2',
};
export const FONT = '"KidRound", "KidFallback", "Apple Color Emoji"';
export const D2R = Math.PI / 180;

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ease = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const outBack = (x) => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const linear = (x) => clamp(x);
/** Progress 0..1 that starts at time `a` and takes `d` seconds. */
export const pr = (t, a, d = 0.6, f = ease) => f((t - a) / d);
export const lerp = (a, b, k) => a + (b - a) * k;
export const lerpP = (p, q, k) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];
/** Piecewise eased keyframes: [[time, value], ...]; value is a number or a point. */
export function track(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i], [t0, v0] = keys[i - 1];
    if (t <= t1) {
      const k = ease((t - t0) / (t1 - t0));
      return Array.isArray(v0) ? lerpP(v0, v1, k) : lerp(v0, v1, k);
    }
  }
  return keys[keys.length - 1][1];
}

export const dirDeg = (p, q) => Math.atan2(-(q[1] - p[1]), q[0] - p[0]) / D2R;
export const polar = (p, deg, r) => [p[0] + r * Math.cos(deg * D2R), p[1] - r * Math.sin(deg * D2R)];
export const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
export const norm180 = (d) => ((d + 180) % 360 + 360) % 360 - 180;
/** Interior wedge at vertex p between the rays to q and r: {a0, sweep} with signed sweep. */
export function corner(p, q, r) {
  const a0 = dirDeg(p, q);
  return { a0, sweep: norm180(dirDeg(p, r) - a0) };
}

export function background(ctx) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.dot;
  for (let y = 45; y < H; y += 90) for (let x = 45; x < W; x += 90) { ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); }
}

export function text(ctx, str, x, y, o = {}) {
  const { size = 64, color = C.ink, align = 'center', alpha = 1, scale = 1, outline = null, baseline = 'middle' } = o;
  if (alpha <= 0 || scale <= 0) return 0;
  ctx.save();
  ctx.globalAlpha *= clamp(alpha);
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (outline) { ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.22; ctx.strokeStyle = outline; ctx.strokeText(str, 0, 0); }
  ctx.fillStyle = color;
  ctx.fillText(str, 0, 0);
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

/** A row of differently coloured text pieces, centred on x. parts: [[string, color], ...] */
export function richText(ctx, parts, x, y, o = {}) {
  const { size = 64, alpha = 1, scale = 1 } = o;
  if (alpha <= 0 || scale <= 0) return;
  ctx.save();
  ctx.globalAlpha *= clamp(alpha);
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.font = `${size}px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const widths = parts.map(([s]) => ctx.measureText(s).width);
  let cx = -widths.reduce((a, b) => a + b, 0) / 2;
  parts.forEach(([s, color], i) => { ctx.fillStyle = color || C.ink; ctx.fillText(s, cx, 0); cx += widths[i]; });
  ctx.restore();
}

export function poly(ctx, pts, o = {}) {
  const { fill = null, stroke = C.ink, lw = 8, alpha = 1, dash = null, close = true } = o;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= clamp(alpha);
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  if (close) ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = stroke; if (dash) ctx.setLineDash(dash); ctx.stroke(); }
  ctx.restore();
}

export function line(ctx, p, q, o = {}) { poly(ctx, [p, q], { ...o, close: false }); }

/** Filled angle sector with its vertex at p. */
export function wedge(ctx, p, a0, sweep, r, color, o = {}) {
  const { alpha = 1, stroke = C.ink, lw = 6 } = o;
  if (alpha <= 0 || r <= 0) return;
  ctx.save();
  ctx.globalAlpha *= clamp(alpha);
  ctx.beginPath();
  ctx.moveTo(p[0], p[1]);
  if (Math.abs(sweep) > 0.01) ctx.arc(p[0], p[1], r, -a0 * D2R, -(a0 + sweep) * D2R, sweep > 0);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
  ctx.restore();
}

export function circle(ctx, p, r, o = {}) {
  const { fill = C.white, stroke = C.ink, lw = 6, alpha = 1 } = o;
  if (alpha <= 0 || r <= 0) return;
  ctx.save();
  ctx.globalAlpha *= clamp(alpha);
  ctx.beginPath();
  ctx.arc(p[0], p[1], r, 0, 7);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r, o = {}) {
  const { fill = C.white, stroke = C.ink, lw = 6, alpha = 1 } = o;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= clamp(alpha);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
  ctx.restore();
}

/** Text on a rounded white card, centred at (x, y). */
export function card(ctx, str, x, y, o = {}) {
  const { size = 64, color = C.ink, fill = C.white, stroke = C.ink, alpha = 1, scale = 1, padX = 0.7, padY = 0.45 } = o;
  if (alpha <= 0 || scale <= 0) return;
  ctx.save();
  ctx.font = `${size}px ${FONT}`;
  const w = ctx.measureText(str).width + size * padX * 2, h = size * (1 + padY * 2);
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.32, { fill, stroke, alpha });
  ctx.restore();
  text(ctx, str, x, y + size * 0.04, { size, color, alpha, scale });
}

/** A measuring stick from p to q with one tick per `unit` pixels and soft round ends. */
export function stick(ctx, p, q, color, o = {}) {
  const { w = 40, unit = 0, alpha = 1 } = o;
  if (alpha <= 0) return;
  const len = dist(p, q);
  if (len < 1) return;
  ctx.save();
  ctx.globalAlpha *= clamp(alpha);
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink; ctx.lineWidth = w + 12;
  ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
  if (unit) {
    const ux = (q[0] - p[0]) / len, uy = (q[1] - p[1]) / len;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 5; ctx.lineCap = 'butt';
    for (let d = unit; d < len - 1; d += unit) {
      const cx = p[0] + ux * d, cy = p[1] + uy * d;
      ctx.beginPath(); ctx.moveTo(cx - uy * w * 0.3, cy + ux * w * 0.3); ctx.lineTo(cx + uy * w * 0.3, cy - ux * w * 0.3); ctx.stroke();
    }
  }
  ctx.restore();
}

/** Number badge sitting beside the middle of a stick. `side` flips which side it sits on. */
export function stickLabel(ctx, p, q, str, color, o = {}) {
  const { off = 70, alpha = 1, scale = 1, size = 56, side = 1 } = o;
  if (alpha <= 0 || scale <= 0) return;
  const len = dist(p, q) || 1;
  const nx = -(q[1] - p[1]) / len * side, ny = (q[0] - p[0]) / len * side;
  const c = [(p[0] + q[0]) / 2 + nx * off, (p[1] + q[1]) / 2 + ny * off];
  circle(ctx, c, size * 0.75 * scale, { fill: color, alpha });
  text(ctx, str, c[0], c[1] + size * 0.05, { size, color: C.white, alpha, scale });
}

export function mark(ctx, x, y, ok, o = {}) {
  const { scale = 1, alpha = 1, r = 70 } = o;
  if (alpha <= 0 || scale <= 0) return;
  ctx.save();
  ctx.globalAlpha *= clamp(alpha);
  ctx.translate(x, y); ctx.scale(scale, scale);
  circle(ctx, [0, 0], r, { fill: ok ? C.green : C.red, lw: 8 });
  ctx.strokeStyle = C.white; ctx.lineWidth = r * 0.26; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  if (ok) { ctx.moveTo(-r * 0.45, r * 0.02); ctx.lineTo(-r * 0.12, r * 0.36); ctx.lineTo(r * 0.48, -r * 0.34); }
  else { ctx.moveTo(-r * 0.36, -r * 0.36); ctx.lineTo(r * 0.36, r * 0.36); ctx.moveTo(r * 0.36, -r * 0.36); ctx.lineTo(-r * 0.36, r * 0.36); }
  ctx.stroke();
  ctx.restore();
}

/** Little friendly face, used to give shapes some character. */
export function face(ctx, x, y, s = 1, o = {}) {
  const { alpha = 1, look = 0, happy = 1 } = o;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= clamp(alpha);
  ctx.translate(x, y); ctx.scale(s, s);
  for (const ex of [-22, 22]) {
    circle(ctx, [ex, 0], 13, { fill: C.white, lw: 4 });
    circle(ctx, [ex + look * 5, 2], 6, { fill: C.ink, stroke: null });
  }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 18, 16, (90 - 55 * happy) * D2R, (90 + 55 * happy) * D2R); ctx.stroke();
  ctx.restore();
}

export function sparkle(ctx, x, y, k, o = {}) {
  const { color = C.yellow, r = 120, n = 8 } = o;
  if (k <= 0 || k >= 1) return;
  ctx.save();
  ctx.globalAlpha *= 1 - k;
  ctx.strokeStyle = color; ctx.lineWidth = 10; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3;
    const r0 = r * (0.45 + 0.5 * k), r1 = r * (0.7 + 0.6 * k);
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.stroke();
  }
  ctx.restore();
}

/** Scene title chip (top-left) so the viewer always knows which step this is. */
export function chapter(ctx, step, title) {
  ctx.save();
  ctx.font = `44px ${FONT}`;
  const w = ctx.measureText(title).width + 150;
  roundRect(ctx, 50, 40, w, 84, 42, { fill: C.white, lw: 5 });
  circle(ctx, [92, 82], 30, { fill: C.ink, stroke: null });
  text(ctx, String(step), 92, 84, { size: 40, color: C.white });
  text(ctx, title, 140, 85, { size: 44, align: 'left' });
  ctx.restore();
}

/** Three bouncing dots: "take a moment to think". Visible between t0 and t1. */
export function thinking(ctx, t, t0, t1, x, y) {
  if (t < t0 || t > t1) return;
  const a = Math.min(pr(t, t0, 0.25), 1 - pr(t, t1 - 0.25, 0.25));
  for (let i = 0; i < 3; i++) {
    const b = Math.max(0, Math.sin((t - t0) * 5 - i * 0.7)) * 26;
    circle(ctx, [x + (i - 1) * 70, y - b], 20, { fill: [C.red, C.yellow, C.blue][i], lw: 5, alpha: a });
  }
}

/** A pencil lying from `tail` towards direction `deg`; the sharp tip is the far end. */
export function pencil(ctx, tail, deg, len, o = {}) {
  const { alpha = 1, w = 36 } = o;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= clamp(alpha);
  ctx.translate(tail[0], tail[1]);
  ctx.rotate(-deg * D2R);
  ctx.lineJoin = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = C.ink;
  const part = (x0, x1, fill) => { ctx.beginPath(); ctx.rect(x0, -w / 2, x1 - x0, w); ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };
  part(0, len * 0.1, '#F58CA8');
  part(len * 0.1, len * 0.16, C.grey);
  part(len * 0.16, len * 0.78, C.yellow);
  ctx.beginPath(); ctx.moveTo(len * 0.78, -w / 2); ctx.lineTo(len, 0); ctx.lineTo(len * 0.78, w / 2); ctx.closePath();
  ctx.fillStyle = '#F6DDB5'; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(len * 0.93, -w * 0.16); ctx.lineTo(len, 0); ctx.lineTo(len * 0.93, w * 0.16); ctx.closePath();
  ctx.fillStyle = C.ink; ctx.fill(); ctx.stroke();
  ctx.restore();
}
