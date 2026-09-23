import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = new URL("../", import.meta.url);
const source = fs.readFileSync(new URL("docs/shared/brick-e500.js", root), "utf8");
const context = vm.createContext({});
vm.runInContext(source, context);
const model = context.KidsBrickE500;
const parts = model.steps.flatMap(step => step.parts);
const assetPath = part => new URL(`docs/shared/bricks/e500-v1/${part.file}`, root);

test("E500 has 14 complete semantic packs and stable placement identities", () => {
  assert.equal(model.id, "e500");
  assert.equal(model.series, "臺灣火車系列");
  assert.equal(model.viewBox, "0 0 800 500");
  assert.equal(model.steps.length, 14);
  assert.equal(parts.length, 42);
  assert.equal(new Set(parts.map(p => p.name)).size, 42);
  model.steps.forEach((step, i) => {
    assert.ok(step.title);
    assert.equal(step.parts.length, 3);
    step.parts.forEach((part, j) => assert.equal(part.id, `p${i + 1}-${j + 1}`));
  });
});

test("every independently cropped image fits its touch target and decodes as transparent PNG", async () => {
  for (const p of parts) {
    const b = p.box, image = p.imageBox;
    assert.ok(Number.isFinite(p.z), p.id);
    assert.ok(Object.values(b).every(Number.isFinite), p.id);
    assert.ok(b.width >= 44 && b.height >= 44, p.id);
    assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.width <= 800 && b.y + b.height <= 500, p.id);
    assert.ok(image.x >= b.x && image.y >= b.y && image.x + image.width <= b.x + b.width && image.y + image.height <= b.y + b.height, p.id);
    assert.ok(image.width < 800 && image.height < 500, `${p.id} is independently cropped`);
    assert.doesNotMatch(p.svg, /NaN|undefined|<script|\bid=|url\(/, p.id);
    assert.equal((p.svg.match(/<image\b/g) || []).length, 1, p.id);
    assert.ok(p.svg.includes(`x="${image.x}" y="${image.y}" width="${image.width}" height="${image.height}"`), p.id);
    const raster = sharp(fs.readFileSync(assetPath(p)));
    const info = await raster.metadata();
    assert.equal(info.format, "png", p.id);
    assert.ok(info.hasAlpha, p.id);
    assert.ok(Math.abs(info.width - image.width * 2) <= 1 && Math.abs(info.height - image.height * 2) <= 1, `${p.id} has a 2x image`);
    const pixels = await raster.ensureAlpha().raw().toBuffer();
    let opaque = 0, transparent = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] > 100) opaque++;
      if (pixels[i] === 0) transparent++;
    }
    assert.ok(opaque > 100 && transparent > 100, `${p.id} has visible artwork and transparent surroundings`);
  }
});

test("each of the 42 placements visibly advances the assembled model", async () => {
  const layers = await Promise.all(parts.map(async part => ({
    id: part.id, z: part.z,
    input: await sharp(fs.readFileSync(assetPath(part))).resize(Math.round(part.imageBox.width), Math.round(part.imageBox.height)).toBuffer(),
    left: Math.round(part.imageBox.x), top: Math.round(part.imageBox.y),
  })));
  const canvas = () => sharp({ create: { width: 800, height: 500, channels: 4, background: "#f3efe5" } });
  let previous = await canvas().raw().toBuffer();
  for (let count = 1; count <= layers.length; count++) {
    const overlays = layers.slice(0, count).sort((a, b) => a.z - b.z).map(({input, left, top}) => ({input, left, top}));
    const current = await canvas().composite(overlays).raw().toBuffer();
    let changed = 0;
    for (let i = 0; i < current.length; i += 4) if (Math.abs(current[i] - previous[i]) + Math.abs(current[i + 1] - previous[i + 1]) + Math.abs(current[i + 2] - previous[i + 2]) > 30) changed++;
    assert.ok(changed > 100, `${layers[count - 1].id}: ${changed} visibly changed pixels`);
    previous = current;
  }
});

test("asset URLs remain local under root and repository-prefixed Pages deployments", () => {
  for (const prefix of ["", "/aiden-study"]) {
    const another = vm.createContext({ window: {}, URL, document: { currentScript: { src: `https://example.test${prefix}/shared/brick-e500.js?v=release` } } });
    vm.runInContext(source, another);
    for (const p of another.window.KidsBrickE500.steps.flatMap(step => step.parts)) {
      assert.ok(p.svg.includes(`href="https://example.test${prefix}/shared/bricks/e500-v1/${p.file}?v=${model.assetVersion}"`), p.id);
    }
  }
});

test("checked-in runtime matches the asset manifest and image bytes", () => {
  execFileSync(process.execPath, [fileURLToPath(new URL("scripts/build-e500-runtime.mjs", root)), "--check"]);
  const another = vm.createContext({ window: {} });
  vm.runInContext(source, another);
  assert.equal(JSON.stringify(another.window.KidsBrickE500), JSON.stringify(model));
});
