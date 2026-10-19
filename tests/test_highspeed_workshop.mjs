import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync, existsSync} from 'node:fs';
import {uiHarness} from './helpers/train-workshop-ui.mjs';

const context = vm.createContext({console, Set}); context.window = context;
for (const file of ['brick-700t.js', 'brick-n700s.js', 'highspeed-mechanism.js', 'train-workshop.js'])
  vm.runInContext(readFileSync(new URL(`../docs/shared/${file}`, import.meta.url), 'utf8'), context);
const models = {'700t': context.KidsBrick700T, n700s: context.KidsBrickN700S};
const first = (model, count) => model.steps.flatMap(step => step.parts).slice(0, count).map(part => part.id);
const settle = () => new Promise(resolve => setImmediate(resolve));
const harness = (modelId, placed = [], options = {}) => uiHarness(placed, {modelId, packs: 12, ...options});

for (const [id, model] of Object.entries(models)) {
  test(`${id}: every old-save boundary and arbitrary gaps preserve the exact build and grants`, () => {
    for (const placed of [...Array.from({length: 36}, (_, count) => first(model, count)), [...first(model, 18), 'p7-3'], [...first(model, 33), 'p12-2']]) {
      const snapshot = {activeBuild: {id: 'legacy-build', modelId: id, placed}, grants: Array.from({length: 12}, (_, packIndex) => ({id: `old-${packIndex}`, buildId: 'legacy-build', packIndex}))};
      const previous = JSON.stringify(snapshot), view = context.KidsTrainWorkshop.describe(model, snapshot);
      const expected = model.steps.findIndex(step => step.parts.some(part => !placed.includes(part.id)));
      assert.equal(view.packIndex, expected);
      assert.equal(view.grant.id, `old-${expected}`);
      assert.deepEqual(Array.from(view.remaining, part => part.id), Array.from(model.steps[expected].parts.filter(part => !placed.includes(part.id)), part => part.id));
      assert.equal(JSON.stringify(snapshot), previous);
    }
  });

  for (const contentVersion of [1, 2]) test(`${id} v${contentVersion}: all earned packs finish the original groups once in arbitrary order`, async () => {
    const h = harness(id, [], {contentVersion, packs: contentVersion === 2 ? 11 : 12}); await settle();
    try {
      for (let pack = contentVersion === 2 ? 2 : 1; pack <= 12; pack++) {
        for (const piece of [3, 1, 2]) {
          const count = h.calls.length, part = `p${pack}-${piece}`;
          h.click('part', part); h.click('place'); await settle();
          assert.equal(h.calls.length, count + 1, `${part} saves once`);
          assert.equal(h.calls.at(-1).partId, part);
          h.click('place'); await settle(); assert.equal(h.calls.length, count + 1);
        }
        if (pack < 12) { h.click('next'); await settle(); }
      }
      const expected = contentVersion === 2 ? 33 : 36;
      assert.equal(new Set(h.state.activeBuild.placed).size, expected);
      assert.equal(h.calls.length, expected);
      assert.equal(h.state.grants.length, contentVersion === 2 ? 11 : 12);
      assert.equal(h.finalCandidate, true);
      assert.ok(h.calls.every(call => call.buildId === `existing-${id}` && call.grantId === `earned-${call.packIndex - (contentVersion === 2 ? 1 : 0)}`));
    } finally { h.mounted.destroy(); }
  });

  test(`${id}: current-pack assets and saved mechanisms never request the future finishing pack`, async () => {
    const h = harness(id, first(model, 18)); await settle();
    try {
      assert.ok(h.images.length > 0);
      assert.ok(h.images.every(image => !/\/p12-/.test(image.url)));
      h.click('part', 'p7-1'); h.click('place'); await settle();
      assert.equal(h.calls.length, 1);
    } finally { h.mounted.destroy(); }
  });

  test(`${id}: cancelled placement and failed persistence do not unlock an incomplete feature`, async () => {
    const h = harness(id, [...first(model, 18), 'p7-1', 'p7-2'], {motion: true}); await settle();
    try {
      h.click('part', 'p7-3'); h.click('place'); h.windows.get('resize')(); await settle();
      assert.equal(h.calls.length, 0);
      assert.doesNotMatch(h.host.innerHTML, /data-train-operate="(?:layers|wings)"/);
      h.click('part', 'p7-3'); h.failSave(); h.click('place'); h.animations.at(-1).resolve(); await settle();
      assert.equal(h.state.activeBuild.placed.length, 20);
      assert.doesNotMatch(h.host.innerHTML, /data-train-operate="(?:layers|wings)"/);
      h.allowSave(); h.click('part', 'p7-3'); h.click('place'); h.animations.at(-1).resolve(); await settle();
      assert.equal(h.state.activeBuild.placed.length, 21);
      assert.match(h.host.innerHTML, /data-train-operate="(?:layers|wings)"/);
    } finally { h.mounted.destroy(); }
  });

  test(`${id}: old assembled noses can be inspected immediately without writes, including after remount`, async () => {
    const placed = id === '700t' ? first(model, 35) : [...first(model, 18), 'p7-3', 'p7-1', 'p7-2'];
    const h = harness(id, [...placed]); await settle();
    try {
      if (!/data-train-range/.test(h.host.innerHTML)) { h.click('mechanism'); await settle(); }
      const previous = JSON.stringify(h.state), kind = id === '700t' ? 'cover' : 'wings';
      assert.match(h.host.innerHTML, new RegExp(`data-train-operate="${kind}"`));
      h.featureClick('open', null, kind);
      assert.match(h.host.innerHTML, /aria-valuenow="100"/);
      h.featureClick('close', null, kind);
      assert.match(h.host.innerHTML, /aria-valuenow="0"/);
      h.click('pause'); h.click('resume');
      assert.equal(JSON.stringify(h.state), previous); assert.equal(h.calls.length, 0);
      const reopened = harness(id, [...placed]); await settle();
      assert.equal(reopened.calls.length, 0); reopened.mounted.destroy();
    } finally { h.mounted.destroy(); }
  });

  test(`${id}: zero grants, missing images and destroyed workshop cannot place a part`, async () => {
    for (const options of [{packs: 0}, {failImages: true}]) {
      const h = harness(id, first(model, 18), options); await settle();
      h.click('part', 'p7-1'); h.click('place'); await settle();
      assert.equal(h.calls.length, 0); h.mounted.destroy();
      h.click('part', 'p7-2'); h.click('place'); await settle(); assert.equal(h.calls.length, 0);
    }
  });
}

test('toy observation requires its saved support and pieces, and never changes the supplied IDs', () => {
  for (const [id, model] of Object.entries(models)) {
    const feature = context.KidsHighspeedMechanism.create(model), ids = new Set(['p7-3', 'p12-2']);
    feature.sync(ids);
    for (const kind of ['layers', 'cover', 'wings']) { feature.move(kind, 1); feature.trial('open', kind); assert.equal(feature.value(kind), 0); }
    assert.doesNotMatch(feature.scene(ids), /data-train-operate=/);
    assert.doesNotMatch(feature.scene(new Set()), /data-hs-part=/);
    assert.deepEqual([...ids], ['p7-3', 'p12-2']);
    ids.add('p7-1'); ids.add('p7-2'); feature.sync(ids);
    const kind = id === '700t' ? 'layers' : 'wings';
    feature.move(kind, 2); assert.equal(feature.value(kind), 1);
    feature.move(kind, NaN); assert.equal(feature.value(kind), 1);
    feature.move(kind, -1); assert.equal(feature.value(kind), 0);
    feature.trial('open', kind); assert.equal(feature.value(kind), 1);
    feature.endTrial(); assert.equal(feature.value(kind), 0);
    feature.trial('open', kind); ids.delete('p7-2'); feature.sync(ids); assert.equal(feature.value(kind), 0);
  }
  assert.equal(context.KidsHighspeedMechanism.create({id: 'emu900'}), null);
});

test('700T exposes vertical layers and an independent removable cover using the formal brick images', () => {
  const feature = context.KidsHighspeedMechanism.create(models['700t']), ids = new Set(['p7-1', 'p7-2', 'p7-3', 'p12-2']);
  feature.sync(ids); feature.move('layers', 1); feature.move('cover', .5);
  assert.equal(feature.value('layers'), 1); assert.equal(feature.value('cover'), .5);
  assert.equal(feature.axis('layers'), 'vertical'); assert.equal(feature.axis('cover'), 'horizontal');
  assert.equal(feature.direction('cover'), -1);
  const svg = feature.scene(ids);
  assert.match(svg, /data-hs-move="layers-upper" transform="translate\(0 -82\)"/);
  assert.match(svg, /data-hs-move="layers-middle" transform="translate\(0 -41\)"/);
  assert.match(svg, /data-hs-part="p12-2"/);
  assert.match(svg, /bricks\/700t-v1\/assets\/p12-2\.png/);
  assert.doesNotMatch(feature.scene(ids, {before: true}), /translate\(0 -82\)/);
  for (const id of ids) assert.deepEqual(feature.part(id).box, models['700t'].steps.flatMap(step => step.parts).find(part => part.id === id).box);
});

test('N700S keeps the original central part and moves two PNG wing crops in opposite directions', () => {
  const feature = context.KidsHighspeedMechanism.create(models.n700s), ids = new Set(['p7-1', 'p7-2', 'p7-3']);
  feature.sync(ids); feature.move('wings', 1);
  const svg = feature.scene(ids);
  assert.match(svg, /data-hs-part="p7-2"/);
  assert.match(svg, /data-hs-move="wing-far" transform="translate\(-24 -74\)"/);
  const near = svg.match(/data-hs-move="wing-near" transform="translate\(([-\d.]+) ([-\d.]+)\)"/);
  assert.ok(Number(near[1]) > 0 && Number(near[2]) > 0, 'near wing separates down and right while far wing separates up and left');
  assert.match(svg, /bricks\/n700s-v1\/assets\/p7-3-v0\.png/);
  assert.equal(feature.arrow('p7-3'), 'right');
  assert.equal(feature.axis('wings'), 'vertical');
  assert.doesNotMatch(feature.controls(ids), /檢修蓋|鴨嘴分層/);
});

test('mechanism source lists contain only present PNGs, and all referenced formal assets exist', () => {
  for (const model of Object.values(models)) {
    const feature = context.KidsHighspeedMechanism.create(model);
    assert.deepEqual(Array.from(feature.sourcesFor(new Set())), []);
    const noseSources = feature.sourcesFor(new Set(['p7-1', 'p7-2', 'p7-3']));
    assert.ok(noseSources.every(source => !/\/p12-/.test(source)));
    for (const source of feature.sourcesFor(new Set(first(model, 36)))) {
      assert.match(source, /\.png\?v=/);
      assert.equal(existsSync(new URL(`../docs/${source.split('?')[0]}`, import.meta.url)), true, source);
    }
  }
});

test('drag and range updates change transforms and accessible values without a new render', () => {
  for (const [id, model] of Object.entries(models)) {
    const feature = context.KidsHighspeedMechanism.create(model), nodes = new Map(), kind = id === '700t' ? 'layers' : 'wings';
    feature.sync(new Set(first(model, 36)));
    const node = selector => { if (!nodes.has(selector)) nodes.set(selector, {attrs: {}, setAttribute(key, value) { this.attrs[key] = value; }}); return nodes.get(selector); };
    const host = {querySelector: node, querySelectorAll: selector => [node(selector)]};
    feature.move(kind, .5); feature.update(host);
    assert.equal(node(`[data-train-operate="${kind}"]`).attrs['aria-valuenow'], '50');
    assert.equal(node(`[data-train-range="${kind}"]`).value, '50');
    if (id === '700t') assert.equal(node('[data-hs-move="layers-upper"]').attrs.transform, 'translate(0 -41)');
    else assert.equal(node('[data-hs-wing-spread]').attrs.visibility, 'visible');
    feature.endTrial(); feature.update(host);
    assert.equal(node(`[data-train-range="${kind}"]`).value, '0');
  }
});

for (const [id, kind] of [['700t', 'layers'], ['700t', 'cover'], ['n700s', 'wings']]) {
  test(`${id} ${kind}: real pointer events, keyboard and range agree, and cancellation restores the start`, async () => {
    const model = models[id], h = harness(id, first(model, id === '700t' ? 35 : 21), {motion: true}); await settle();
    const pane = {dataset: {trainOperate: kind}, getAttribute: () => 'false'};
    const target = {closest: selector => selector === '[data-train-operate]' ? pane : null};
    const now = () => Number(h.host.innerHTML.match(new RegExp(`data-train-operate="${kind}"[^>]*aria-valuenow="(\\d+)"`))?.[1]);
    const refresh = () => h.mounted.update(h.state);
    const key = key => { h.fire('keydown', {key, target, preventDefault() {}}); refresh(); };
    const motion = (pointerId, distance, cancel = false) => {
      h.fire('pointerdown', {pointerId, button: 0, isPrimary: true, clientX: 200, clientY: 200, target});
      h.fire('pointermove', {pointerId, clientX: kind === 'cover' ? 200 - distance : 200, clientY: kind === 'cover' ? 200 : 200 - distance, preventDefault() {}});
      h.fire(cancel ? 'pointercancel' : 'pointerup', {pointerId}); refresh();
    };
    try {
      if (!/data-train-range/.test(h.host.innerHTML)) { h.click('mechanism'); await settle(); }
      const saved = JSON.stringify(h.state);
      const halfTravel = kind === 'cover' ? 38 : kind === 'layers' ? 41 : 37;
      motion(31, halfTravel); assert.equal(now(), 50);
      key('Home'); assert.equal(now(), 0); key('End'); assert.equal(now(), 100);
      key(kind === 'cover' ? 'ArrowRight' : 'ArrowDown'); assert.equal(now(), 90);
      key(kind === 'cover' ? 'ArrowLeft' : 'ArrowUp'); assert.equal(now(), 100);
      h.fire('input', {target: {matches: selector => selector === '[data-train-range]', dataset: {trainRange: kind}, value: '25'}}); refresh();
      assert.equal(now(), 25);
      motion(32, halfTravel, true); assert.equal(now(), 25);
      h.fire('pointerdown', {pointerId: 33, button: 0, isPrimary: true, clientX: 200, clientY: 200, target});
      h.fire('pointermove', {pointerId: 33, clientX: 100, clientY: 100, preventDefault() {}});
      key('Escape'); assert.equal(now(), 25);
      assert.equal(JSON.stringify(h.state), saved); assert.equal(h.calls.length, 0);
    } finally { h.mounted.destroy(); }
  });
}
