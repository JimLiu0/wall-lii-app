import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const loadedModule = { exports: {} };
const code = ts.transpileModule(
  fs.readFileSync(new URL('./calculatePlacements.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
vm.runInNewContext(code, { module: loadedModule, exports: loadedModule.exports });
const { estimatePlacement, calculatePlacementsWithAverage } = loadedModule.exports;

test('matches bot estimates across the rating branch and high-rating opponent cap', () => {
  // Expected results from the bot's src/utils/placement_utils.py.
  const fixtures = [
    [8199, 8149, 6], [8200, 8150, 6.5],
    [10000, 10050, 2], [10000, 10000, 4], [10000, 9900, 7.5],
    [14000, 14050, 1], [14000, 14000, 3.5], [14000, 13950, 5],
    [18000, 18000, 2], [18000, 17950, 4], [18000, 17900, 6],
  ];
  for (const [start, end, expected] of fixtures) {
    assert.equal(estimatePlacement(start, end).placement, expected, `${start} → ${end}`);
  }
});

test('profile sequence and average use the same estimates', () => {
  const result = calculatePlacementsWithAverage([10000, 10050, 10000]);
  assert.deepEqual(Array.from(result.placements), [2, 6]);
  assert.equal(result.average, 4);
  assert.ok(Number.isNaN(calculatePlacementsWithAverage([]).average));
});
