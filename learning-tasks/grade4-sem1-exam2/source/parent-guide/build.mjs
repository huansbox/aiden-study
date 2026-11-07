import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const source = dirname(fileURLToPath(import.meta.url));
const target = resolve(source, '../../../../docs/parent/exam2-guide');
const data = JSON.parse(readFileSync(resolve(source, 'content.json'), 'utf8'));
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ids = new Set();
const units = data.units.map(unit => {
  if (!['math', 'science'].includes(unit.subject)) throw Error('Invalid subject');
  const items = unit.items.map(item => {
    if (!/^[a-z0-9-]+$/.test(item.id) || ids.has(item.id)) throw Error(`Invalid item ID: ${item.id}`);
    ids.add(item.id);
    for (const key of ['title','know','prompt','answer','trap','mode']) if (!item[key]) throw Error(`${item.id}: missing ${key}`);
    if (!item.observations?.length) throw Error(`${item.id}: missing observations`);
    return `<article class="item" data-item="${esc(item.id)}">
      <div class="item-heading"><h3>${esc(item.title)}</h3><span class="mode">${esc(item.mode)}</span></div>
      <p class="know">${esc(item.know)}</p>
      <div class="confirm"><h4>簡短確認 · 原創例子</h4><p>${esc(item.prompt)}</p>
        <details class="answer"><summary>看確認重點／答案</summary><p>${esc(item.answer)}</p></details>
      </div>
      <div class="observations"><h4>現有原卷怎麼問</h4><ul>${item.observations.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
      <p class="trap"><strong>易混淆：</strong>${esc(item.trap)}</p>
      <label class="check"><input type="checkbox" data-check="${esc(item.id)}" aria-label="已確認：${esc(item.title)}"><span>已確認能說明或做出來</span><span class="print-check" aria-hidden="true">□</span></label>
    </article>`;
  }).join('\n');
  return `<section id="${esc(unit.id)}" class="unit" data-subject="${esc(unit.subject)}" aria-labelledby="heading-${esc(unit.id)}">
    <div class="unit-heading"><p>${unit.subject === 'math' ? '數學' : '自然'} · ${unit.items.length} 個確認重點</p><h2 id="heading-${esc(unit.id)}">${esc(unit.title)}</h2><p>${esc(unit.summary)}</p></div>
    ${items}
    <a class="to-top" href="#">回到科目與單元選擇</a>
  </section>`;
}).join('\n');
let html = readFileSync(resolve(source, 'template.html'), 'utf8')
  .replace('{{SCOPE}}', esc(data.scope))
  .replace('{{NAV}}', data.units.map(u => `<a href="#${esc(u.id)}" data-subject="${esc(u.subject)}">${esc(u.title)}</a>`).join('\n'))
  .replace('{{UNITS}}', units);
mkdirSync(target, { recursive: true });
for (const [file, content] of [['index.html', html], ...['guide.css','guide.js'].map(f => [f, readFileSync(resolve(source, f), 'utf8')])]) {
  const path = resolve(target, file);
  if (process.argv.includes('--check')) {
    if (readFileSync(path, 'utf8') !== content) throw Error(`Outdated output: ${file}`);
  } else writeFileSync(path, content);
}
console.log(`Parent guide: ${data.units.length} units / ${ids.size} items; ${process.argv.includes('--check') ? 'checked' : 'built'}`);
