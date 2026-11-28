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
const {
  estimatePlacement,
  calculatePlacements,
  calculateAveragePlacement,
  calculatePlacementsWithAverage,
  getRatingCap,
} = loadedModule.exports;

const SEASON_START_MS = Date.UTC(2026, 7, 5); // 2026-08-05 00:00 UTC
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const afterStart = (ms) => new Date(SEASON_START_MS + ms).toISOString();

// 2026-09-04 is 30 full days after the season start, so the cap is exactly 10000.
// The original fixtures below were made when the cap was a fixed 10000.
const CAP_10000_TIME = '2026-09-04T00:00:00Z';

test('matches bot estimates across the rating branch and high-rating opponent cap', () => {
  // Expected results from the bot's src/utils/placement_utils.py.
  const fixtures = [
    [8199, 8149, 6], [8200, 8150, 6.5],
    [10000, 10050, 2], [10000, 10000, 4], [10000, 9900, 7.5],
    [14000, 14050, 1], [14000, 14000, 3.5], [14000, 13950, 5],
    [18000, 18000, 2], [18000, 17950, 4], [18000, 17900, 6],
  ];
  assert.equal(getRatingCap(CAP_10000_TIME), 10000);
  for (const [start, end, expected] of fixtures) {
    assert.equal(
      estimatePlacement(start, end, CAP_10000_TIME).placement,
      expected,
      `${start} → ${end}`,
    );
  }
});

test('profile sequence and average use the same estimates', () => {
  const result = calculatePlacementsWithAverage([10000, 10050, 10000]);
  assert.deepEqual(Array.from(result.placements), [2, 6]);
  assert.equal(result.average, 4);
  assert.ok(Number.isNaN(calculatePlacementsWithAverage([]).average));
});

test('rating cap is 8500 before the season start', () => {
  assert.equal(getRatingCap(afterStart(-30 * DAY_MS)), 8500);
  assert.equal(getRatingCap(afterStart(-1000)), 8500);
});

test('rating cap is 8500 exactly at the season start', () => {
  assert.equal(getRatingCap('2026-08-05T00:00:00Z'), 8500);
  assert.equal(getRatingCap(SEASON_START_MS), 8500);
});

test('rating cap stays 8500 after 12 hours and just before 24 hours', () => {
  assert.equal(getRatingCap(afterStart(12 * HOUR_MS)), 8500);
  assert.equal(getRatingCap(afterStart(24 * HOUR_MS - 1000)), 8500);
});

test('rating cap increases to 8550 after 24 hours and stays there at 36 hours', () => {
  assert.equal(getRatingCap(afterStart(24 * HOUR_MS)), 8550);
  assert.equal(getRatingCap(afterStart(36 * HOUR_MS)), 8550);
  assert.equal(getRatingCap(afterStart(48 * HOUR_MS)), 8600);
});

test('rating cap reaches 12500 after 80 days and never exceeds it', () => {
  assert.equal(getRatingCap(afterStart(79 * DAY_MS)), 12450);
  assert.equal(getRatingCap(afterStart(80 * DAY_MS)), 12500);
  assert.equal(getRatingCap(afterStart(81 * DAY_MS)), 12500);
  assert.equal(getRatingCap(afterStart(5000 * DAY_MS)), 12500);
});

test('rating cap uses UTC regardless of the local timezone', () => {
  const originalTz = process.env.TZ;
  try {
    for (const tz of ['UTC', 'America/Los_Angeles', 'Europe/Stockholm', 'Asia/Tokyo', 'Pacific/Kiritimati']) {
      process.env.TZ = tz;
      assert.equal(getRatingCap('2026-08-05T23:59:59Z'), 8500, `${tz}: just before day 1`);
      assert.equal(getRatingCap('2026-08-06T00:00:00Z'), 8550, `${tz}: day 1`);
      assert.equal(getRatingCap('2026-08-06T00:00:00'), 8550, `${tz}: no offset is read as UTC`);
      assert.equal(getRatingCap('2026-08-06 00:00:00+00'), 8550, `${tz}: Postgres style`);
      assert.equal(getRatingCap('2026-08-06T02:00:00+02:00'), 8550, `${tz}: +02:00 is 00:00 UTC`);
      assert.equal(getRatingCap('2026-08-06T01:00:00+02:00'), 8500, `${tz}: +02:00 is 23:00 UTC`);
      assert.equal(getRatingCap('2026-08-05T20:00:00-04:00'), 8550, `${tz}: -04:00 is 00:00 UTC`);
      assert.equal(getRatingCap(new Date(Date.UTC(2026, 7, 6))), 8550, `${tz}: Date object`);
    }
  } finally {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  }
});

test('missing or invalid timestamps fall back to the current time, like the bot', () => {
  const now = getRatingCap(Date.now());
  assert.equal(getRatingCap(), now);
  assert.equal(getRatingCap(null), now);
  assert.equal(getRatingCap('not a date'), now);
});

test('one cap step changes the estimate (8500 on day 0 vs 8550 on day 1)', () => {
  // Found with the bot's estimate_placement: the only difference is the cap.
  assert.equal(estimatePlacement(8290, 8320, afterStart(12 * HOUR_MS)).placement, 3);
  assert.equal(estimatePlacement(8290, 8320, afterStart(36 * HOUR_MS)).placement, 3.5);
});

test('historical placements use the timestamp of the ending snapshot', () => {
  // 9000 → 9000 is 4 under the early cap (8500) and 4.5 once the cap has grown.
  const early = '2026-08-05T12:00:00Z';
  const late = CAP_10000_TIME;
  const ratings = [9000, 9000, 9000];

  // Change 1 ends at timestamps[1] (early), change 2 ends at timestamps[2] (late).
  assert.deepEqual(Array.from(calculatePlacements(ratings, [late, early, late])), [4, 4.5]);
  // Swapping the first two timestamps must not change anything: the starting
  // snapshot's own timestamp is ignored.
  assert.deepEqual(Array.from(calculatePlacements(ratings, [early, early, late])), [4, 4.5]);
  assert.deepEqual(Array.from(calculatePlacements(ratings, [early, late, early])), [4.5, 4]);

  assert.equal(calculateAveragePlacement(ratings, [late, early, late]), 4.25);
  const withAverage = calculatePlacementsWithAverage(ratings, 2, [late, early, late]);
  assert.deepEqual(Array.from(withAverage.placements), [4, 4.5]);
  assert.equal(withAverage.average, 4.25);
});

test('historical timestamps are used instead of the current time', () => {
  // Without timestamps the current (fully grown) cap applies, giving 4.5.
  assert.equal(estimatePlacement(9000, 9000).placement, 4.5);
  assert.equal(estimatePlacement(9000, 9000, '2026-08-05T12:00:00Z').placement, 4);
});

test('timestamps are ignored unless there is one per rating, like the bot', () => {
  const ratings = [9000, 9000, 9000];
  const early = '2026-08-05T12:00:00Z';
  assert.deepEqual(Array.from(calculatePlacements(ratings, [early])), [4.5, 4.5]);
  assert.deepEqual(Array.from(calculatePlacements(ratings)), [4.5, 4.5]);
  assert.deepEqual(Array.from(calculatePlacements([9000], [early])), []);
});

test('matches bot estimates for equivalent inputs and timestamps', () => {
  // Expected results from the bot's estimate_placement(start, end, timestamp)
  // (HS-Tools/Wall_Lii commit b506dc5). Caps at these times: 8500, 8500, 8550, 10000, 12500.
  const times = [
    '2026-08-04T12:00:00Z', '2026-08-05T00:00:00Z', '2026-08-06T00:00:00Z',
    '2026-09-04T00:00:00Z', '2026-10-24T00:00:00Z',
  ];
  const fixtures = [
    [8199, 8149, [6, 6, 6, 6, 6]],
    [8200, 8150, [6, 6, 6, 6.5, 6.5]],
    [8300, 8350, [2, 2, 2, 3, 3]],
    [8400, 8450, [2, 2, 2, 3, 3]],
    [8500, 8550, [2, 2, 2, 3, 3]],
    [9000, 9000, [4, 4, 4, 4.5, 4.5]],
    [10000, 10050, [2, 2, 2, 2, 2]],
    [10000, 10000, [4, 4, 4, 4, 4]],
    [10000, 9900, [7.5, 7.5, 7.5, 7.5, 7.5]],
    [12000, 12060, [1, 1, 1, 1, 2]],
    [12400, 12460, [1, 1, 1, 1, 2]],
    [14000, 14050, [1, 1, 1, 1, 2]],
    [14000, 13950, [4.5, 4.5, 4.5, 5, 5]],
    [18000, 17900, [5.5, 5.5, 5.5, 6, 6]],
  ];
  for (const [start, end, expected] of fixtures) {
    times.forEach((time, i) => {
      assert.equal(
        estimatePlacement(start, end, time).placement,
        expected[i],
        `${start} → ${end} at ${time}`,
      );
    });
  }
});
