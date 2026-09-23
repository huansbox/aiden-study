// Optional visual QA helper. Requires sharp, available in the development tree.
// node scripts/render-e500-model.mjs [output-directory]
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import sharp from "sharp";

const context = vm.createContext({});
vm.runInContext(await fs.readFile(new URL("./e500-art/model-source.js", import.meta.url), "utf8"), context);
const model = context.KidsBrickE500;
const parts = model.steps.flatMap(s => s.parts);
const out = path.resolve(process.argv[2] || ".scratch/e500-model");
await fs.mkdir(out, { recursive: true });
const draw = (selected) => [...selected].sort((a, b) => a.z - b.z).map(p => p.svg).join("");
const svg = (selected) => `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 800 500"><rect width="800" height="500" fill="#fbf5e9"/>${draw(selected)}</svg>`;
await fs.writeFile(path.join(out, "e500-complete.svg"), svg(parts));
await sharp(Buffer.from(svg(parts))).png().toFile(path.join(out, "e500-complete.png"));
const stages = [3, 6, 21, 42];
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1100" viewBox="0 0 1600 1100"><rect width="1600" height="1100" fill="#fbf5e9"/>${stages.map((count, i) => `<g transform="translate(${i % 2 * 800} ${Math.floor(i / 2) * 550})"><text x="32" y="40" font-family="Arial,sans-serif" font-size="24" fill="#38434a">${count} / 42</text><g transform="translate(0 30)">${draw(parts.slice(0, count))}</g></g>`).join("")}</svg>`;
await fs.writeFile(path.join(out, "e500-stages.svg"), sheet);
await sharp(Buffer.from(sheet)).png().toFile(path.join(out, "e500-stages.png"));
// A full 42-part tray sheet reveals parts hidden by later layers in the train.
const traySheet = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1680"><rect width="1200" height="1680" fill="#fbf5e9"/>${parts.map((p, i) => `<g transform="translate(${i % 6 * 200} ${Math.floor(i / 6) * 240})"><rect x="5" y="5" width="190" height="230" rx="12" fill="#fffdf8" stroke="#dad4c8"/><text x="14" y="28" font-family="Arial,sans-serif" font-size="14" fill="#38434a">${p.id}</text><svg x="14" y="38" width="172" height="170" viewBox="${p.box.x} ${p.box.y} ${p.box.width} ${p.box.height}">${p.svg}</svg></g>`).join("")}</svg>`;
await sharp(Buffer.from(traySheet)).png().toFile(path.join(out, "e500-parts.png"));
console.log(out);
