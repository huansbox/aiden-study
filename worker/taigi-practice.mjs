// All material must pass the same-origin device session check in worker.mjs.
const lessons = ['taigi-bitter-melon', 'taigi-reading'];

export function practiceFor(id) {
  if (!lessons.includes(id)) return null;
  return {route: `/v1/${id}/`, prefix: `c:${id}:`};
}
export function contentType(file) {
  if (file === 'index.html') return 'text/html; charset=utf-8';
  if (file === 'assets/reading.mp3') return 'audio/mpeg';
  if (/^assets\/(?:caption|scene)-\d{2,3}\.webp$/.test(file)) return 'image/webp';
  return null;
}
const policy = {
  'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
  'Cross-Origin-Resource-Policy': 'same-origin', 'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self'; media-src 'self' blob:; connect-src 'none'; frame-ancestors 'self'; form-action 'none'; base-uri 'none'",
};
const message = (status, text) => new Response(text, {status, headers: {...policy, 'Content-Type':'text/plain; charset=utf-8'}});

export async function servePractice(request, kv, path, {route, prefix}) {
  if (!['GET', 'HEAD'].includes(request.method)) return message(405, '此頁僅供讀取。');
  if (path === route) {
    const release = await kv.get(prefix + 'active');
    if (!/^[0-9a-f]{64}$/.test(release || '')) return message(503, '教材準備中，請稍後重新開啟。');
    const target = new URL('/api' + route + release + '/index.html', request.url);
    return new Response(null, {status: 302, headers: {...policy, Location: target.href}});
  }
  const [release, ...parts] = path.slice(route.length).split('/');
  const file = parts.join('/');
  const type = contentType(file);
  if (!/^[0-9a-f]{64}$/.test(release) || !type) return message(404, '找不到教材。');
  const value = await kv.get(prefix + release + ':' + file, 'arrayBuffer');
  if (value === null) return message(404, '找不到教材。');
  const headers = {...policy, 'Content-Type': type, 'Content-Length': String(value.byteLength)};
  // Safari seeks using single byte ranges, including a two-byte probe at launch.
  const range = request.headers.get('Range');
  if (type.startsWith('audio/')) {
    headers['Accept-Ranges'] = 'bytes';
    const match = /^bytes=(\d*)-(\d*)$/i.exec(range || '');
    if (match && request.method === 'GET') {
      const start = match[1] ? Number(match[1]) : Math.max(0, value.byteLength - Number(match[2]));
      const end = match[1] && match[2] ? Math.min(value.byteLength - 1, Number(match[2])) : value.byteLength - 1;
      if ((!match[1] && !match[2]) || !Number.isSafeInteger(start) || start >= value.byteLength || end < start) {
        return new Response(null, {status: 416, headers: {...policy, 'Content-Range': 'bytes */' + value.byteLength}});
      }
      headers['Content-Range'] = `bytes ${start}-${end}/${value.byteLength}`;
      headers['Content-Length'] = String(end - start + 1);
      return new Response(value.slice(start, end + 1), {status: 206, headers});
    }
  }
  return new Response(request.method === 'HEAD' ? null : value, {headers});
}
