import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const source = dirname(fileURLToPath(import.meta.url));
const target = resolve(source, '../../../../docs/parent/exam2-guide');
const pdfDir = resolve(source, '../../output/pdf');
const data = JSON.parse(readFileSync(resolve(source, 'toy-reference.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(resolve(pdfDir, 'manifest.json'), 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for (const file of ['content.json', 'toy-reference.json', 'build-pdf.py']) {
  if (manifest.inputs[file] !== hash(readFileSync(resolve(source, file), 'utf8').replace(/\r\n/g, '\n'))) throw Error(`PDF source changed: ${file}; run build-pdf.py first`);
}
const cards = data.subjects.map(subject => {
  const pdf = manifest.pdfs.find(pdf => pdf.file === subject.filename);
  if (!pdf) throw Error(`Missing PDF: ${subject.filename}`);
  const href = `${subject.filename}?v=${pdf.sha256.slice(0, 12)}`;
  return `<article class="subject"><div><h2>${esc(subject.name)}</h2><p>${esc(subject.range)} · ${pdf.pages} 頁</p></div>
    <div class="actions"><a class="open" href="${esc(href)}">開啟${esc(subject.name)} PDF</a>
    <a class="download" href="${esc(href)}" download="${esc(subject.filename)}">下載${esc(subject.name)}</a></div></article>`;
}).join('\n');
const html = readFileSync(resolve(source, 'template.html'), 'utf8').replace(/\r\n/g, '\n').replace('{{CARDS}}', cards).replace('{{SCOPE}}', esc(data.scope));
const files = [['index.html', Buffer.from(html)], ['guide.css', Buffer.from(readFileSync(resolve(source, 'guide.css'), 'utf8').replace(/\r\n/g, '\n'))]];
for (const pdf of manifest.pdfs) {
  const bytes = readFileSync(resolve(pdfDir, pdf.file));
  if (hash(bytes) !== pdf.sha256) throw Error(`PDF differs from manifest: ${pdf.file}`);
  files.push([pdf.file, bytes]);
}
if (!process.argv.includes('--check')) mkdirSync(target, { recursive: true });
for (const [file, bytes] of files) {
  const path = resolve(target, file);
  if (process.argv.includes('--check')) {
    const actual = readFileSync(path);
    const matches = file.endsWith('.pdf') ? actual.equals(bytes) : actual.toString('utf8').replace(/\r\n/g, '\n') === bytes.toString('utf8');
    if (!matches) throw Error(`Outdated output: ${file}`);
  } else writeFileSync(path, bytes);
}
console.log(`Parent quick reference: 2 PDFs / ${data.subjects.flatMap(s => s.units.flatMap(u => u.rows)).length} concepts; ${process.argv.includes('--check') ? 'checked' : 'built'}`);
