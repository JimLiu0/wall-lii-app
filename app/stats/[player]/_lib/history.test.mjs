import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { DateTime } from 'luxon';

const importModule = createRequire(import.meta.url);
const directory = path.dirname(fileURLToPath(import.meta.url));

// Exercise the real query builder against an in-memory PostgREST-style fixture.
function load(file, dependencies = {}) {
  const loadedModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(directory, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { module: loadedModule, exports: loadedModule.exports, Date, console,
    require: name => dependencies[name] ?? importModule(name) });
  return loadedModule.exports;
}
function database(rows, failAt = -1) {
  const requests = [];
  return { requests, from() {
    const filters = [], ordering = [];
    let offset = 0, count = Infinity, signal;
    const query = {
      select() { return this; },
      eq(k, v) { filters.push(r => r[k] === v); return this; },
      neq(k, v) { filters.push(r => r[k] !== v); return this; },
      lt(k, v) { filters.push(r => r[k] < v); return this; },
      lte(k, v) { filters.push(r => r[k] <= v); return this; },
      gt(k, v) { filters.push(r => r[k] > v); return this; },
      gte(k, v) { filters.push(r => r[k] >= v); return this; },
      order(k, { ascending }) { ordering.push({ k, ascending }); return this; },
      limit(n) { count = n; return this; },
      range(a, b) { offset = a; count = b - a + 1; return this; },
      abortSignal(value) { signal = value; return this; },
      then(resolve, reject) {
        const data = rows.filter(r => filters.every(f => f(r))).sort((a, b) => {
          for (const { k, ascending } of ordering) {
            if (a[k] !== b[k]) return (a[k] < b[k] ? -1 : 1) * (ascending ? 1 : -1);
          }
          return 0;
        }).slice(offset, offset + count);
        const error = requests.length === failAt || signal?.aborted ? new Error('Query failed') : null;
        requests.push({ count, offset, returned: data.length });
        return Promise.resolve({ data: error ? null : data, error }).then(resolve, reject);
      },
    };
    return query;
  } };
}
const selection = { region: 'na', mode: 'solo', view: 'day', date: '2026-11-11' };
const row = (time, rating, overrides = {}) => ({
  player_id: 'p', player_name: 'player', region: 'NA', game_mode: '0',
  snapshot_time: time, rating, ...overrides,
});
const fixtures = [
  row('2026-10-01T08:00:00.000Z', 9000),
  row('2026-11-09T08:00:00.000Z', 9100),
  row('2026-11-10T08:00:00.000Z', 9100),
  row('2026-11-11T07:55:00.000Z', 9100),
  row('2026-11-11T08:10:00.000Z', 9200),
  row('2026-11-11T09:10:00.000Z', 9150),
  row('2026-11-11T10:10:00.000Z', 9150),
  row('2026-11-12T08:00:00.000Z', 9250),
  row('2026-11-12T09:00:00.000Z', 9300),
  row('2026-11-11T08:10:00.000Z', 9999, { region: 'EU' }),
  row('2026-11-11T08:10:00.000Z', 9999, { game_mode: '1' }),
  row('2026-11-11T08:10:00.000Z', 9999, { player_id: 'someone-else' }),
];
const dedupData = data => data.filter((r, i) => !i || r.rating !== data[i - 1].rating);
const { getFilteredProfileData } = load('profileDerivations.ts', {
  '@/utils/calculatePlacements': {}, '@/utils/getDedupData': { dedupData },
});
function filtered(data, s = selection) {
  return JSON.parse(JSON.stringify(getFilteredProfileData(data, s.view,
    DateTime.fromISO(s.date, { zone: 'America/Los_Angeles' }), s.region, s.mode === 'duo' ? 'd' : 's')));
}

test('selected day matches full-history derivation, including baseline and ending boundary', async () => {
  const db = database(fixtures);
  const { fetchProfileHistory } = load('history.ts', { '@/utils/supabaseClient': { supabase: db } });
  const result = await fetchProfileHistory('p', 'player', selection);
  const full = fixtures.filter(r => r.player_id === 'p');
  // Compare graph/game inputs, ignoring fixture-only player_id.
  const project = rows => rows.map(({ snapshot_time, rating }) => ({ snapshot_time, rating }));
  assert.deepEqual(project(filtered(result)), project(filtered(full)));
  assert.equal(result[0].snapshot_time, '2026-11-09T08:00:00.000Z');
  assert.equal(result.length, 5);
  assert.ok(result.every(r => r.region === 'NA' && r.game_mode === '0'));
  assert.equal(db.requests[0].returned, 4);
});

test('empty day retains only nearest baseline and no fabricated games', async () => {
  const db = database(fixtures);
  const { fetchProfileHistory } = load('history.ts', { '@/utils/supabaseClient': { supabase: db } });
  const result = await fetchProfileHistory('p', 'player', { ...selection, date: '2026-12-01' });
  assert.equal(result.length, 1);
  assert.equal(result[0].rating, 9300);
});

test('Pacific day and week windows respect DST', () => {
  const { getHistoryWindow, historyKey } = load('history.ts', { '@/utils/supabaseClient': {} });
  for (const [date, hours] of [['2026-03-08', 23], ['2026-11-01', 25]]) {
    const window = getHistoryWindow({ ...selection, date });
    assert.equal((Date.parse(window.end) - Date.parse(window.start)) / 3600000, hours);
  }
  assert.equal(historyKey({ ...selection, view: 'week', date: '2026-11-11' }),
    historyKey({ ...selection, view: 'week', date: '2026-11-09' }));
});

test('season pagination keeps rows sharing timestamps at the page boundary', async () => {
  const rows = Array.from({ length: 1002 }, (_, i) => row(
    i < 999 ? new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString() : '2026-02-01T00:00:00.000Z', 9000 + i));
  const db = database(rows);
  const { fetchProfileHistory } = load('history.ts', { '@/utils/supabaseClient': { supabase: db } });
  const result = await fetchProfileHistory('p', 'player', { ...selection, view: 'all', date: null });
  assert.equal(result.length, 1002);
  assert.deepEqual(db.requests.map(r => r.offset), [0, 1000]);
});

test('query failure rejects partial results; aborts reject instead of showing empty history', async () => {
  const db = database(fixtures, 1);
  const { fetchProfileHistory } = load('history.ts', { '@/utils/supabaseClient': { supabase: db } });
  await assert.rejects(fetchProfileHistory('p', 'player', selection));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(fetchProfileHistory('p', 'player', selection, controller.signal));
});

test('invalid region resolves to an available combo rather than redirecting forever', () => {
  const { resolveSelection } = load('data.ts', {
    'next/cache': { unstable_cache: fn => fn },
    react: { cache: fn => fn },
    '@/utils/dateUtils': {}, './history': {}, '@/utils/supabaseClient': {},
  });
  const summarySnapshots = [row('2026-11-11T09:00:00.000Z', 9100, { region: 'EU', game_mode: '1' })];
  const result = resolveSelection({ summarySnapshots, requestedRegion: 'invalid', requestedView: 'day', requestedGameMode: 'solo' });
  assert.equal(result.finalRegion, 'eu');
  assert.equal(result.validGameMode, 'duo');
  assert.equal(result.shouldRedirect, true);
  assert.equal(resolveSelection({ summarySnapshots, requestedRegion: result.finalRegion,
    requestedView: result.finalView, requestedGameMode: result.validGameMode }).shouldRedirect, false);
});

test('week history preserves full-history calculations, and dates before first snapshot stay empty', async () => {
  const db = database(fixtures);
  const { fetchProfileHistory } = load('history.ts', { '@/utils/supabaseClient': { supabase: db } });
  const week = { ...selection, view: 'week' };
  const result = await fetchProfileHistory('p', 'player', week);
  const ratings = rows => rows.map(r => r.rating);
  assert.deepEqual(ratings(filtered(result, week)), ratings(filtered(fixtures.filter(r => r.player_id === 'p'), week)));
  assert.equal((await fetchProfileHistory('p', 'player', { ...selection, date: '2020-01-01' })).length, 0);
});
