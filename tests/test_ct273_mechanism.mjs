import test from 'node:test';
import assert from 'node:assert/strict';
import {createMechanism, angularDelta, CENTERS, AXLE_Y, CRANK_RADIUS} from '../docs/parent/ct273-mechanism.mjs';

test('each installed wheel turns independently until all three have a coupling rod',()=>{
  const m=createMechanism();
  assert.equal(m.connect(),false);
  assert.equal(m.turn(0,90),false);
  for(const i of [2,0,1]){assert.equal(m.install(i),true);assert.equal(m.install(i),false);}
  m.turn(2,90);
  assert.deepEqual(m.state.angles,[0,0,90]);
  assert.equal(m.align(),true);
  assert.deepEqual(m.state.angles,[0,0,0]);
  assert.equal(m.connect(),true);
  m.turn(1,-90);
  assert.deepEqual(m.state.angles,[270,270,270]);
  m.disconnect();
  m.turn(0,45);
  assert.deepEqual(m.state.angles,[315,270,270]);
});

test('rod holes remain on all three crank pins with a fixed length through multiple forward and reverse turns',()=>{
  const m=createMechanism();[0,1,2].forEach(i=>m.install(i));m.connect();
  for(const delta of [90,90,90,90,721,-359,-1080,45,-12.5]) {
    m.turn(2,delta);
    const pins=m.pins();
    for(let i=0;i<3;i++) {
      assert.ok(Math.abs(Math.hypot(pins[i].x-CENTERS[i],pins[i].y-AXLE_Y)-CRANK_RADIUS)<1e-9);
      assert.ok(Math.abs(pins[i].y-pins[0].y)<1e-9);
      assert.ok(Math.abs(pins[i].x-pins[0].x-(CENTERS[i]-CENTERS[0]))<1e-9);
    }
  }
});

test('dragging over the angle seam continues in the same direction without a whole-circle jump',()=>{
  assert.equal(angularDelta(179,-179),2);
  assert.equal(angularDelta(-179,179),-2);
  assert.equal(angularDelta(45,90),45);
  const m=createMechanism();m.install(0);m.turn(0,-1);
  assert.equal(m.state.angles[0],359);m.turn(0,2);assert.equal(m.state.angles[0],1);
});
