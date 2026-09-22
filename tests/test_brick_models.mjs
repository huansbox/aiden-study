import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("../docs/shared/brick-models.js", import.meta.url),
  "utf8",
);
const context = vm.createContext({});
vm.runInContext(source, context);
const catalog = context.KidsBrickModels;

test("catalog publishes three complete transport models with stable pack part ids", () => {
  assert.equal(catalog.version, 1);
  assert.deepEqual(
    Array.from(catalog.models, (model) => model.id),
    ["car", "train", "plane"],
  );

  for (const model of catalog.models) {
    assert.equal(model.viewBox, "0 0 800 500");
    assert.equal(model.steps.length, 14, `${model.id} pack count`);
    assert.equal(
      model.steps.reduce((count, step) => count + step.parts.length, 0),
      42,
      `${model.id} part count`,
    );
    assert.deepEqual(
      Array.from(model.steps, (step) =>
        Array.from(step.parts, (part) => part.id),
      ),
      Array.from({ length: 14 }, (_, stepIndex) =>
        Array.from({ length: 3 }, (_, partIndex) =>
          `p${stepIndex + 1}-${partIndex + 1}`,
        ),
      ),
    );
    assert.equal(catalog.get(model.id), model);
  }
  assert.equal(catalog.get("missing"), null);
});

test("all 126 parts expose touch-friendly target geometry and vector artwork", () => {
  const allParts = catalog.models.flatMap((model) =>
    model.steps.flatMap((step) => step.parts),
  );
  assert.equal(allParts.length, 126);

  for (const model of catalog.models) {
    const names = new Set();
    for (const step of model.steps) {
      assert.ok(step.title.trim(), `${model.id} has an untitled pack`);
      assert.equal(step.parts.length, 3, `${model.id} ${step.title}`);
      for (const part of step.parts) {
        assert.ok(part.name.trim());
        assert.ok(!names.has(part.name), `${model.id} duplicate name ${part.name}`);
        names.add(part.name);
        assert.match(part.svg, /<(?:g|path|circle|ellipse|rect)\b/);
        assert.ok(
          !/<(?:image|svg)\b/i.test(part.svg),
          `${model.id}/${part.id} embeds a whole image`,
        );
        assert.ok(Number.isInteger(part.z), `${model.id}/${part.id}.z`);
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

test("each model combines silhouettes, round mechanisms, and layered detail", () => {
  for (const model of catalog.models) {
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
