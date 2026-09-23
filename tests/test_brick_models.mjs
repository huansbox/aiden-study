import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const context = vm.createContext({});
for (const name of ["brick-e500.js", "brick-emu3000.js", "brick-r200.js", "brick-models.js"]) {
  const source = readFileSync(new URL(`../docs/shared/${name}`, import.meta.url), "utf8");
  vm.runInContext(source, context);
}
const catalog = context.KidsBrickModels;
vm.runInContext(readFileSync(new URL("../docs/shared/collection-core.js", import.meta.url), "utf8"), context);

test("catalog offers three Taiwan trains and preserves legacy model identities", () => {
  assert.equal(catalog.version, 1);
  assert.deepEqual(
    Array.from(catalog.models, (model) => model.id),
    ["e500", "emu3000", "r200"],
  );
  assert.equal(catalog.models[0].series, "臺灣火車系列");
  assert.deepEqual(Array.from(catalog.legacyModels, (model) => model.id), ["car", "train", "plane"]);
  assert.notEqual(catalog.get("train"), catalog.get("e500"));

  for (const model of [...catalog.models, ...catalog.legacyModels]) {
    assert.equal(model.viewBox, "0 0 800 500");
    const packs = ["emu3000", "r200"].includes(model.id) ? 12 : 14;
    assert.equal(context.KidsCollectionCore.PACK_COUNTS[model.id], packs, `${model.id} server and artwork agree`);
    assert.equal(model.steps.length, packs, `${model.id} pack count`);
    assert.equal(
      model.steps.reduce((count, step) => count + step.parts.length, 0),
      packs * 3,
      `${model.id} part count`,
    );
    assert.deepEqual(
      Array.from(model.steps, (step) =>
        Array.from(step.parts, (part) => part.id),
      ),
      Array.from({ length: packs }, (_, stepIndex) =>
        Array.from({ length: 3 }, (_, partIndex) =>
          `p${stepIndex + 1}-${partIndex + 1}`,
        ),
      ),
    );
    assert.equal(catalog.get(model.id), model);
  }
  assert.equal(catalog.get("missing"), null);
});

test("all published and legacy parts expose touch-friendly target geometry and independent artwork", () => {
  const allModels = [...catalog.models, ...catalog.legacyModels];
  const allParts = allModels.flatMap((model) =>
    model.steps.flatMap((step) => step.parts),
  );
  assert.equal(allParts.length, 240);

  for (const model of allModels) {
    const names = new Set();
    for (const step of model.steps) {
      assert.ok(step.title.trim(), `${model.id} has an untitled pack`);
      assert.equal(step.parts.length, 3, `${model.id} ${step.title}`);
      for (const part of step.parts) {
        assert.ok(part.name.trim());
        assert.ok(!names.has(part.name), `${model.id} duplicate name ${part.name}`);
        names.add(part.name);
        assert.match(part.svg, /<(?:g|path|circle|ellipse|rect)\b/);
        if (catalog.models.includes(model)) assert.match(part.svg, /<image\b/);
        else assert.doesNotMatch(part.svg, /<(?:image|svg)\b/i, `${model.id}/${part.id} legacy vector`);
        assert.ok(Number.isFinite(part.z), `${model.id}/${part.id}.z`);
        for (const key of ["x", "y", "width", "height"])
          assert.ok(Number.isFinite(part.box[key]), `${model.id}/${part.id}.${key}`);
        assert.ok(part.box.width >= 44, `${model.id}/${part.id} target too narrow`);
        assert.ok(part.box.height >= 44, `${model.id}/${part.id} target too short`);
        assert.ok(
          part.box.x >= 0 && part.box.y >= 0,
          `${model.id}/${part.id} starts outside canvas`,
        );
        assert.ok(
          part.box.x + part.box.width <= 800,
          `${model.id}/${part.id} exceeds canvas width`,
        );
        assert.ok(
          part.box.y + part.box.height <= 500,
          `${model.id}/${part.id} exceeds canvas height`,
        );
      }
    }
  }
});

test("legacy models retain their layered artwork", () => {
  for (const model of catalog.legacyModels) {
    const artwork = model.steps
      .flatMap((step) => step.parts)
      .map((part) => part.svg);
    assert.ok(
      artwork.filter((svg) => /<path\b/.test(svg)).length >= 28,
      `${model.id} path variety`,
    );
    assert.ok(
      artwork.filter((svg) => /<(?:circle|ellipse)\b/.test(svg)).length >= 10,
      `${model.id} round detail`,
    );
    assert.ok(
      new Set(
        model.steps.flatMap((step) => step.parts.map((part) => part.z)),
      ).size >= 6,
      `${model.id} layering`,
    );
  }
});
