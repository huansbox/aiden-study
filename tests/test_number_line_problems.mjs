import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = new URL('../learning-tasks/number-line-difference/source/problems.json', import.meta.url);
const bank = JSON.parse(readFileSync(source, 'utf8'));

// Independent geometric oracle: three ordered points form one whole and two
// adjoining parts. Numeric equality alone never establishes a segment.
function candidates(problem, known, allowAddition = false) {
  const points = problem.points.map(point => point.id);
  const result = [];
  for (let a = 0; a < points.length - 2; a++) {
    for (let b = a + 1; b < points.length - 1; b++) {
      for (let c = b + 1; c < points.length; c++) {
        const left = points[a] + points[b];
        const right = points[b] + points[c];
        const whole = points[a] + points[c];
        for (const [long, short, remaining] of [[whole, left, right], [whole, right, left]]) {
          if (known.has(long) && known.has(short) && !known.has(remaining)) {
            result.push({ long, short, result: remaining });
          }
        }
        if (allowAddition && known.has(left) && known.has(right) && !known.has(whole)) {
          result.push({ left, right, result: whole });
        }
      }
    }
  }
  return result;
}

function shortest(problem, allowAddition = false) {
  const initial = new Set(problem.givens.map(given => given.segment));
  let frontier = [initial];
  const seen = new Set([[...initial].sort().join(',')]);
  for (let distance = 0; frontier.length; distance++) {
    const next = [];
    for (const known of frontier) {
      if (known.has(problem.target)) return distance;
      for (const operation of candidates(problem, known, allowAddition)) {
        const changed = new Set([...known, operation.result]);
        const key = [...changed].sort().join(',');
        if (!seen.has(key)) {
          seen.add(key);
          next.push(changed);
        }
      }
    }
    frontier = next;
  }
  return Infinity;
}

function allShortestSubtractions(problem, distance) {
  const solutions = [];
  function visit(known, route) {
    if (known.has(problem.target)) {
      if (route.length === distance) solutions.push(route);
      return;
    }
    if (route.length === distance) return;
    for (const operation of candidates(problem, known)) {
      visit(new Set([...known, operation.result]), [...route, operation]);
    }
  }
  visit(new Set(problem.givens.map(given => given.segment)), []);
  return solutions;
}

function routeKey(route) {
  return route.map(step => `${step.long}-${step.short}=${step.result}`).join(';');
}

function positions(problem) {
  const values = new Map([[problem.points[0].id, 0]]);
  for (let round = 0; round < problem.points.length; round++) {
    for (const { segment: [a, b], length } of problem.givens) {
      if (values.has(a) && !values.has(b)) values.set(b, values.get(a) + length);
      if (values.has(b) && !values.has(a)) values.set(a, values.get(b) - length);
    }
  }
  assert.equal(values.size, problem.points.length, `${problem.id}: connected givens`);
  for (const { segment: [a, b], length } of problem.givens) {
    assert.equal(values.get(b) - values.get(a), length, `${problem.id}: consistent givens`);
  }
  return values;
}

test('the three fixed sets each contain 2 + 3 questions with distinct numerical instances', () => {
  assert.equal(bank.schemaVersion, 1);
  assert.deepEqual(Object.keys(bank.sets), ['pad', 'transition', 'independent']);
  const ids = new Set();
  for (const [name, problems] of Object.entries(bank.sets)) {
    assert.equal(problems.length, 5);
    assert.deepEqual(problems.map(p => p.level), ['beginner', 'beginner', 'intermediate', 'intermediate', 'intermediate']);
    for (const [index, problem] of problems.entries()) {
      assert.equal(problem.points.length, 4);
      assert.ok(!ids.has(problem.id));
      ids.add(problem.id);
      if (name === 'pad') assert.equal(problem.id, `p${index + 1}`);
    }
  }
  for (let index = 0; index < 5; index++) {
    const instances = Object.values(bank.sets).map(set => JSON.stringify(set[index].givens));
    assert.equal(new Set(instances).size, 3, `question ${index + 1} needs new numbers in each set`);
  }
});

for (const problem of Object.values(bank.sets).flat()) {
  test(`${problem.id}: ordered positive integer lengths, valid route values and independent minimum`, () => {
    const values = positions(problem);
    const ordered = problem.points.map(point => values.get(point.id));
    for (let i = 1; i < ordered.length; i++) {
      assert.ok(Number.isInteger(ordered[i]) && ordered[i] > ordered[i - 1]);
    }
    assert.ok(ordered.at(-1) <= 40, 'small numbers keep the focus on geometry');
    const length = ([a, b]) => values.get(b) - values.get(a);
    assert.equal(length(problem.target), problem.answer);
    const expected = problem.level === 'beginner' ? 1 : problem.level === 'intermediate' ? 2 : 3;
    assert.equal(shortest(problem), expected);
    assert.equal(shortest(problem, true), expected, 'adding adjoining segments must not create a shorter solution');
    assert.equal(problem.minSubtractions, expected);
    for (const route of problem.routes) {
      const known = new Set(problem.givens.map(given => given.segment));
      for (const step of route.steps) {
        assert.ok(candidates(problem, known).some(candidate => routeKey([candidate]) === routeKey([step])), `${route.id}: ${routeKey([step])}`);
        assert.equal(length(step.long) - length(step.short), step.value);
        assert.equal(length(step.result), step.value);
        known.add(step.result);
      }
      assert.equal(route.steps.length, expected);
      assert.equal(route.steps.at(-1).result, problem.target);
    }
    const actual = problem.routes.map(route => routeKey(route.steps)).sort();
    const exhaustive = allShortestSubtractions(problem, expected).map(routeKey).sort();
    assert.deepEqual(actual, exhaustive, 'include every shortest route, including independent step order');
  });
}

test('equal lengths do not turn the wrong segment into a proof', () => {
  const problem = bank.sets.pad[4];
  const values = positions(problem);
  assert.equal(values.get('D') - values.get('C'), problem.answer);
  const initial = new Set(problem.givens.map(given => given.segment));
  const steps = candidates(problem, initial);
  assert.ok(steps.some(step => step.result === 'CD'));
  assert.ok(!steps.some(step => step.result === 'BC'));
  assert.ok(!steps.some(step => step.long === 'AC' && step.short === 'BD'));
});
