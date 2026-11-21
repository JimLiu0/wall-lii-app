import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { unstable_getResponseFromNextConfig, getRewrittenUrl } = require('next/experimental/testing/server');
function load(relative, dependencies = {}) {
  const loadedModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { module: loadedModule, exports: loadedModule.exports, console,
    require: name => dependencies[name] ?? require(name) });
  return loadedModule.exports;
}
const nextConfig = load('../../../../../next.config.ts').default;

test('only view/date selections rewrite; public URL parameters survive', async () => {
  for (const query of ['', '?utm_source=test', '?_rsc=test']) {
    const response = await unstable_getResponseFromNextConfig({
      url: `https://wallii.gg/lb/eu/solo${query}`, nextConfig,
    });
    assert.ok(!getRewrittenUrl(response));
  }
  for (const query of ['?view=week&date=2026-11-20', '?date=2026-11-19', '?v=w&o=1', '?o=2', '?view=day&_rsc=test']) {
    const response = await unstable_getResponseFromNextConfig({
      url: `https://wallii.gg/lb/eu/solo${query}`, nextConfig,
    });
    const rewritten = new URL(getRewrittenUrl(response));
    assert.equal(rewritten.pathname, '/lb/eu/solo/selected');
    for (const [key, value] of new URLSearchParams(query)) {
      assert.equal(rewritten.searchParams.get(key), value);
    }
  }
});

const { normalizeUrlParams } = load('../../../../../utils/urlParams.ts');
function fixture({ fail = false } = {}) {
  const calls = [];
  const state = { entries: [], totalRows: 0, channelData: [], chineseStreamerData: [], minDate: null };
  const fetchState = cache => async context => {
    calls.push({ cache, context });
    if (fail) throw new Error('database unavailable');
    return state;
  };
  const dependencies = {
    '../_lib/server': {
      fetchInitialLeaderboardState: fetchState('data'),
      fetchUncachedInitialLeaderboardState: fetchState('page'),
    },
    '../_lib/data': { PAGE_SIZE: 50, getLeaderboardDateOffset: () => 0 },
    '@/utils/urlParams': { normalizeUrlParams },
    'next/navigation': { notFound: () => { throw new Error('not found'); } },
    '@/components/ads/adSlots': { adSlots: {} },
  };
  for (const name of ['./LeaderboardTableClient', '@/components/shared/NewsBanner',
    '@/components/shared/SeasonResetBanner', '@/components/shared/TimedAnnouncementBanner',
    '@/components/ads/AdPageShell']) dependencies[name] = { default: name };
  const { default: Page } = load('../_components/LeaderboardPage.tsx', dependencies);
  return { Page, calls };
}
const params = Promise.resolve({ region: 'eu', mode: 'solo' });

test('cached default uses fresh data; selected views keep data caching and normalization', async () => {
  const { Page, calls } = fixture();
  await Page({ params, searchParams: Promise.resolve({ view: 'day' }), cachePage: true });
  await Page({ params, searchParams: Promise.resolve({ view: 'week', date: '2026-11-20' }) });
  await Page({ params, searchParams: Promise.resolve({ v: 'w', o: '1' }) });
  assert.deepEqual(calls.map(call => [call.cache, call.context.timeframe]),
    [['page', 'day'], ['data', 'week'], ['data', 'week']]);
});

test('failed default regeneration throws instead of caching an empty table', async () => {
  const { Page } = fixture({ fail: true });
  await assert.rejects(Page({ params, searchParams: Promise.resolve({}), cachePage: true }), /database unavailable/);
});
