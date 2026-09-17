/** Local-only private audio loader. It does not contain a deployment client. */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const CLIP_ID = /^[a-z0-9-]{1,80}$/;
const MAX_BYTES = 2 * 1024 * 1024;

export async function readPrivateAudioPack(packPath) {
  const input = await readFile(packPath, 'utf8');
  if (Buffer.byteLength(input) > 8 * 1024 * 1024) throw new Error('Private audio pack is too large');
  const pack = JSON.parse(input);
  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) throw new Error('Audio pack must be an object');
  const entries = Object.entries(pack);
  if (entries.length < 1 || entries.length > 20) throw new Error('Audio pack must contain 1–20 clips');
  for (const [id, value] of entries) {
    if (!CLIP_ID.test(id)) throw new Error('Invalid private audio clip id');
    if (!value || value.contentType !== 'audio/mpeg' || typeof value.base64 !== 'string'
        || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.base64)) {
      throw new Error(`Invalid MP3 payload: ${id}`);
    }
    const bytes = Buffer.from(value.base64, 'base64');
    const mp3 = bytes.subarray(0, 3).toString() === 'ID3'
      || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
    if (bytes.length < 128 || bytes.length > MAX_BYTES || !mp3) throw new Error(`Invalid MP3 bytes: ${id}`);
  }
  return pack;
}

export async function loadPrivateAudioPack(kv, packPath) {
  const pack = await readPrivateAudioPack(packPath);
  for (const [id, payload] of Object.entries(pack)) {
    await kv.put(`c:nativecamp:audio:${id}`, JSON.stringify(payload));
  }
  return Object.keys(pack);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw new Error('Usage: node load_nativecamp_audio.mjs LOCAL_PACK.json');
  const pack = await readPrivateAudioPack(process.argv[2]);
  console.log(`Validated ${Object.keys(pack).length} local private audio clip(s). No remote writes performed.`);
}
