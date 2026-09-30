// Offline QA for the published E500 sprites. No WebGL or authoring model is loaded.
// node scripts/render-e500-model.mjs [output-directory] [metadata.json]
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const repository = fileURLToPath(new URL("../", import.meta.url));
const metadataFile = path.resolve(process.argv[3] || path.join(repository, "docs/shared/bricks/e500-v1/metadata.json"));
const outputDirectory = path.resolve(process.argv[2] || path.join(repository, ".scratch/e500-sprite-qa"));
const assetDirectory = path.dirname(metadataFile);
const model = JSON.parse(await fs.readFile(metadataFile, "utf8"));
assert.ok(["e500", "emu3000", "r200", "700t", "n700s"].includes(model.id));
assert.equal(model.viewBox, "0 0 800 500");
assert.equal(model.steps.length, model.id === "e500" ? 14 : 12);
assert.ok(Number.isInteger(model.scale) && model.scale > 0);
const parts = model.steps.flatMap((step, packIndex) => {
  assert.equal(step.parts.length, 3);
  return step.parts.map((part, partIndex) => {
    assert.equal(part.id, `p${packIndex + 1}-${partIndex + 1}`);
    assert.ok(Number.isFinite(part.z));
    for (const field of ["x", "y", "width", "height"]) assert.ok(Number.isFinite(part.imageBox[field]));
    assert.ok(part.imageBox.x >= 0 && part.imageBox.y >= 0);
    assert.ok(part.imageBox.x + part.imageBox.width <= 800 && part.imageBox.y + part.imageBox.height <= 500);
    const peers = part.occlusionPeers || [];
    assert.ok(Array.isArray(peers) && peers.every((id) => step.parts.slice(0, partIndex).some((earlier) => earlier.id === id)), `${part.id} peers`);
    assert.equal(new Set(peers).size, peers.length, `${part.id} duplicate peers`);
    const variants = part.variants || [];
    const fullMask = (1 << peers.length) - 1;
    assert.ok(Array.isArray(variants));
    variants.forEach((variant, index) => {
      assert.ok(Number.isInteger(variant.mask) && variant.mask >= 0 && variant.mask < fullMask, `${part.id} mask`);
      if (index) assert.ok(variants[index - 1].mask < variant.mask, `${part.id} mask order`);
      assert.equal(variant.file, `assets/${part.id}-v${variant.mask}.png`);
    });
    assert.equal(part.file, `assets/${part.id}.png`);
    return { ...part, occlusionPeers: peers, variants };
  });
});
assert.equal(parts.length, model.steps.length * 3);

const assets = new Map();
for (const part of parts) for (const artwork of [part, ...part.variants]) {
  const filename = path.resolve(assetDirectory, artwork.file);
  assert.ok(filename.startsWith(assetDirectory + path.sep), `${part.id} asset must stay beside metadata`);
  const bytes = await fs.readFile(filename);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), artwork.sha256, `${artwork.file} PNG hash`);
  const expectedWidth = Math.round(part.imageBox.width * model.scale);
  const expectedHeight = Math.round(part.imageBox.height * model.scale);
  const info = await sharp(bytes).metadata();
  assert.equal(info.format, "png", `${artwork.file} format`);
  assert.equal(info.width, expectedWidth, `${artwork.file} width`);
  assert.equal(info.height, expectedHeight, `${artwork.file} height`);
  assert.ok(info.hasAlpha, `${artwork.file} needs transparency`);
  assets.set(artwork.file, bytes);
}
const digest = createHash("sha256")
  .update(parts.flatMap((part) => [
    `${part.id}:${part.sha256}`,
    ...part.variants.map((variant) => `${part.id}@${variant.mask}:${variant.sha256}`),
  ]).join("\n"))
  .digest("hex");
assert.equal(digest, model.assetDigest, "published asset digest");

await fs.mkdir(outputDirectory, { recursive: true });
const width = 800 * model.scale;
const height = 500 * model.scale;
const background = { r: 0, g: 0, b: 0, alpha: 0 };
const artworkFile = (part, placed) => {
  const mask = part.occlusionPeers.reduce((value, id, index) => value | (placed.has(id) ? 1 << index : 0), 0);
  return part.variants.find((variant) => variant.mask === mask)?.file || part.file;
};
const compose = async (selection) => {
  const placed = new Set(selection.map((part) => part.id));
  const layers = [...selection].sort((left, right) => left.z - right.z).map((part) => ({
    input: assets.get(artworkFile(part, placed)),
    left: Math.round(part.imageBox.x * model.scale),
    top: Math.round(part.imageBox.y * model.scale),
  }));
  return sharp({ create: { width, height, channels: 4, background } }).composite(layers).png().toBuffer();
};

const stages = [3, 6, 21, parts.length];
const stageImages = [];
for (const count of stages) {
  const image = await compose(parts.slice(0, count));
  stageImages.push(image);
  await fs.writeFile(path.join(outputDirectory, `${model.id}-stage-${count}.png`), image);
}
await fs.writeFile(path.join(outputDirectory, `${model.id}-composite.png`), stageImages.at(-1));
await sharp(stageImages.at(-1)).flatten({ background: "#eee3d1" }).png()
  .toFile(path.join(outputDirectory, `${model.id}-composite-on-beige.png`));
await sharp({ create: { width: width * 2, height: height * 2, channels: 4, background: "#eee3d1" } })
  .composite(stageImages.map((input, index) => ({ input, left: index % 2 * width, top: Math.floor(index / 2) * height })))
  .png().toFile(path.join(outputDirectory, `${model.id}-stages.png`));

// Keep one out-of-order assembly visible so a published mask is checked in context.
const outOfOrderPart = parts.find((part) => part.variants.length);
if (outOfOrderPart) {
  const sample = outOfOrderPart.variants[0];
  const packIndex = Number(outOfOrderPart.id.match(/^p(\d+)-/)[1]) - 1;
  const selectedPeers = new Set(outOfOrderPart.occlusionPeers.filter((_, index) => sample.mask & (1 << index)));
  const selection = parts.filter((part) => Number(part.id.match(/^p(\d+)-/)[1]) - 1 < packIndex || selectedPeers.has(part.id) || part.id === outOfOrderPart.id);
  assert.equal(artworkFile(outOfOrderPart, new Set(selection.map((part) => part.id))), sample.file);
  await fs.writeFile(path.join(outputDirectory, `${model.id}-out-of-order.png`), await compose(selection));
}

// A contact sheet keeps covered interior groups visible for inspection.
const columns = 6, rows = Math.ceil(parts.length / columns), cellWidth = 220, cellHeight = 220;
const trayLayers = [];
for (const [index, part] of parts.entries()) {
  const left = index % columns * cellWidth;
  const top = Math.floor(index / columns) * cellHeight;
  const picture = await sharp(assets.get(artworkFile(part, new Set())))
    .resize({ width: cellWidth - 24, height: cellHeight - 52, fit: "inside", withoutEnlargement: true })
    .png().toBuffer();
  const info = await sharp(picture).metadata();
  trayLayers.push({ input: picture, left: left + Math.round((cellWidth - info.width) / 2), top: top + 38 + Math.round((cellHeight - 52 - info.height) / 2) });
  const label = Buffer.from(`<svg width="${cellWidth}" height="36" xmlns="http://www.w3.org/2000/svg"><text x="12" y="26" font-family="sans-serif" font-size="20" fill="#27343d">${part.id}</text></svg>`);
  trayLayers.push({ input: label, left, top });
}
await sharp({ create: { width: columns * cellWidth, height: rows * cellHeight, channels: 4, background: "#fbf5e9" } })
  .composite(trayLayers).png().toFile(path.join(outputDirectory, `${model.id}-trays.png`));
console.log(`Verified ${assets.size} PNGs for ${parts.length} groups and wrote offline QA to ${outputDirectory}`);
