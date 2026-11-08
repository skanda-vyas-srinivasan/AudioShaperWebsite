const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

// Exercise the actual browser/API modules without connecting to production Redis.
function loadModule(relativePath, globals = {}, dependencies = {}, cache = new Map()) {
  const filename = path.resolve(root, relativePath);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const context = {
    module, exports: module.exports, console, URL, URLSearchParams,
    Request, Response, TextEncoder, AbortSignal, crypto: webcrypto,
    process: { env: { ADMIN_ANALYTICS_TOKEN: 'test-admin' } },
    ...globals,
    require(specifier) {
      if (specifier in dependencies) return dependencies[specifier];
      if (specifier.startsWith('.')) {
        return loadModule(path.resolve(path.dirname(filename), `${specifier}.ts`), globals, dependencies, cache);
      }
      throw new Error(`Unexpected dependency: ${specifier}`);
    },
  };
  vm.runInNewContext(code, context, { filename });
  return module.exports;
}

function browser(search, storage = new Map(), blocked = false) {
  const requests = [];
  const module = loadModule('src/taggedVisits.ts', {
    window: { location: { search } },
    document: { referrer: 'https://www.example.com/resume.pdf' },
    sessionStorage: {
      getItem(key) { if (blocked) throw new Error('Blocked'); return storage.get(key) || null; },
      setItem(key, value) { if (blocked) throw new Error('Blocked'); storage.set(key, value); },
    },
    fetch(url, options) { requests.push({ url, ...options }); return Promise.resolve(new Response('{}')); },
  });
  return { ...module, requests };
}

class MemoryRedis {
  static values = new Map();
  async get(key) { return MemoryRedis.values.get(key) || null; }
  async incr(key) { const count = (MemoryRedis.values.get(key) || 0) + 1; MemoryRedis.values.set(key, count); return count; }
  async expire() { return 1; }
  async set(key, value) { MemoryRedis.values.set(key, value); return 'OK'; }
  async mget(...keys) { return keys.map((key) => MemoryRedis.values.get(key) || null); }
  async hgetall(key) { return MemoryRedis.values.get(key) || null; }
  async hkeys(key) { return Object.keys(await this.hgetall(key) || {}); }
  async pfcount() { return 0; }
  async lrange(key, from, to) { return (MemoryRedis.values.get(key) || []).slice(from, to + 1); }
  pipeline() {
    const operations = [];
    const pipeline = {};
    for (const name of ['incr', 'hincrby', 'lpush', 'ltrim', 'pfadd']) {
      pipeline[name] = (...args) => { operations.push([name, ...args]); return pipeline; };
    }
    pipeline.exec = async () => operations.map(([name, key, field, amount]) => {
      const values = MemoryRedis.values;
      if (name === 'incr') {
        const count = (values.get(key) || 0) + 1;
        values.set(key, count);
        return count;
      }
      if (name === 'hincrby') {
        const counts = new Map(Object.entries(values.get(key) || {}));
        const count = (counts.get(field) || 0) + amount;
        counts.set(field, count);
        values.set(key, Object.fromEntries(counts));
        return count;
      }
      if (name === 'lpush') {
        const list = values.get(key) || [];
        list.unshift(field);
        values.set(key, list);
        return list.length;
      }
      if (name === 'ltrim') values.set(key, (values.get(key) || []).slice(field, amount + 1));
      return 1;
    });
    return pipeline;
  }
}

function api(globals = {}) {
  MemoryRedis.values.clear();
  const dependencies = { '@upstash/redis': { Redis: MemoryRedis } };
  const cache = new Map();
  return {
    visits: loadModule('api/visits.ts', globals, dependencies, cache).default,
    engagement: loadModule('api/engagement.ts', globals, dependencies, cache).default,
    downloads: loadModule('api/downloads.ts', globals, dependencies, cache).default,
    analytics: loadModule('api/analytics.ts', globals, dependencies, cache).default,
  };
}

const post = (endpoint, body, origin = 'https://sonexis.ink') => new Request(`https://sonexis.ink/api/${endpoint}`, {
  method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('session batches attach to the visit, reject forged data, and keep the bearer token private', async () => {
  const { visits, engagement, analytics } = api({ process: { env: { ADMIN_ANALYTICS_TOKEN: 'test-admin', ANALYTICS_HASH_SECRET: 'test-hash-secret' } } });
  const visit = post('visits', { tag: 'resume', session: true, path: '/' });
  visit.headers.set('x-vercel-forwarded-for', '192.0.2.5');
  visit.headers.set('user-agent', 'Mozilla/5.0 Chrome/130');
  const response = await visits(visit);
  assert.equal(response.status, 200);
  const credentials = await response.json();
  assert.match(credentials.sessionId, /^[a-f0-9-]{36}$/);
  const batch = (changes = {}) => {
    const req = post('engagement', {
      sessionId: credentials.sessionId, sessionToken: credentials.sessionToken, activeMs: 16000,
      events: [
        { type: 'scroll', timestamp: new Date().toISOString(), depth: 65 },
        { type: 'click', timestamp: new Date().toISOString(), category: 'github', target: 'github.com' },
      ], ...changes,
    });
    req.headers.set('x-vercel-forwarded-for', '192.0.2.5');
    req.headers.set('user-agent', 'Mozilla/5.0 Chrome/130');
    return req;
  };
  assert.equal((await engagement(batch({ sessionToken: '0'.repeat(36) }))).status, 403);
  assert.equal((await engagement(batch({ events: [{ type: 'click', timestamp: new Date().toISOString(), category: 'link', target: 'private?token=secret' }] }))).status, 400);
  assert.equal((await engagement(batch())).status, 200);
  const data = await (await analytics(admin('?events=visits&tag=resume'))).json();
  assert.equal(data.events[0].sessionId, credentials.sessionId);
  assert.equal(data.events[0].engagement.maxScroll, 65);
  assert.equal(data.events[0].engagement.clicks, 1);
  assert.equal(data.events[0].classification.classification, 'Likely human');
  assert.ok(!JSON.stringify(data).includes(credentials.sessionToken));
  const detail = await (await analytics(admin(`?session=${credentials.sessionId}`))).json();
  assert.equal(detail.session.events.length, 3);
  assert.ok(!JSON.stringify(detail).includes(credentials.sessionToken));
});

test('classification uses independent signals and leaves sparse historical visits uncertain', async () => {
  const { classifySession, classifyNetwork, classifyUserAgent } = loadModule('lib/engagement.ts');
  const base = {
    id: 'session', token: 'private', visitId: 'visit', visitorId: null,
    startedAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(), endedAt: null,
    activeMs: 0, maxScroll: 0, clicks: 0, pages: ['/'], events: [], batches: 0,
    network: classifyNetwork(null, null), userAgentKind: 'browser', automationHint: false,
    rapidNavigations: 0, requestBurst: false,
  };
  assert.equal(classifySession(base).classification, 'Uncertain');
  assert.equal(classifySession({ ...base, activeMs: 30000 }).classification, 'Likely human');
  assert.equal(classifySession({ ...base, network: classifyNetwork('AS16509', 'Amazon.com, Inc.') }).classification, 'Uncertain');
  assert.equal(classifySession({ ...base, userAgentKind: classifyUserAgent('Proofpoint URL Defense') }).classification, 'Likely automated');
  assert.equal(classifySession(null).classification, 'Uncertain');
  assert.match(classifySession(null).limitation, /historical engagement/);
});

test('same tab page loads reuse a distinct session while preserving visit counts', async () => {
  const { visits, analytics } = api();
  const first = await (await visits(post('visits', { tag: 'resume', session: true, path: '/' }))).json();
  const second = await (await visits(post('visits', { tag: 'resume', session: true, path: '/releases.html', sessionId: first.sessionId, sessionToken: first.sessionToken }))).json();
  assert.equal(second.sessionId, first.sessionId);
  const data = await (await analytics(admin())).json();
  assert.equal(data.taggedTraffic.find((item) => item.tag === 'resume').visits, 2);
  assert.deepEqual(Array.from(data.recentVisitEvents[0].engagement.pages), ['/', '/releases.html']);
  assert.equal(data.resumeStats.total, 2);
});

test('client tracker batches semantic events and removes its listeners', async () => {
  const storage = new Map();
  const listeners = new Map();
  const sent = [];
  const on = (name, callback) => listeners.set(name, callback);
  const off = (name) => listeners.delete(name);
  const globals = {
    window: { innerHeight: 100, scrollY: 100, addEventListener: on, removeEventListener: off, setInterval: () => 1, clearInterval: () => {}, setTimeout: (callback) => { callback(); return 1; }, clearTimeout: () => {} },
    document: { visibilityState: 'visible', documentElement: { scrollHeight: 200 }, addEventListener: on, removeEventListener: off },
    navigator: { webdriver: false, sendBeacon: (url, body) => { sent.push({ url, body }); return true; } },
    location: { pathname: '/', href: 'https://sonexis.ink/', origin: 'https://sonexis.ink' },
    history: { pushState() {}, replaceState() {} },
    sessionStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    Blob, fetch: () => Promise.resolve(new Response('{}')),
  };
  const tracker = loadModule('src/engagementTracker.ts', globals);
  const stop = tracker.startEngagement({ sessionId: 'session', sessionToken: 'token' });
  assert.equal(tracker.rememberedSession().sessionId, 'session');
  listeners.get('scroll')();
  listeners.get('click')({ target: { closest: () => ({ tagName: 'A', dataset: {}, id: '', getAttribute: () => 'https://github.com/example/repo' }) } });
  globals.document.visibilityState = 'hidden';
  listeners.get('visibilitychange')();
  assert.equal(sent[0].url, '/api/engagement');
  const payload = JSON.parse(await sent[0].body.text());
  assert.equal(payload.events[0].depth, 100);
  assert.equal(payload.events[1].category, 'github');
  assert.equal(payload.events[1].target, 'github.com');
  stop();
  assert.equal(listeners.size, 0);
});

test('optional IPinfo enrichment stores only ASN metadata and reports hosting as a weak signal', async () => {
  let requested = '';
  const network = loadModule('lib/network.ts', {
    process: { env: { IPINFO_TOKEN: 'test-token' } },
    fetch: async (url) => { requested = url; return Response.json({ ip: '192.0.2.5', asn: 'AS16509', as_name: 'Amazon.com, Inc.' }); },
  });
  const req = new Request('https://sonexis.ink/api/visits', { headers: { 'x-vercel-forwarded-for': '192.0.2.5' } });
  const result = await network.networkForRequest(req);
  assert.equal(result.asn, 'AS16509');
  assert.equal(result.cloud, 'AWS');
  assert.equal(result.kind, 'hosting');
  assert.equal(result.vpnProxy, 'unknown');
  assert.ok(requested.includes('192.0.2.5'));
  assert.ok(!JSON.stringify(result).includes('192.0.2.5'));
});

test('resume filters use retained visits and never invent historical engagement', async () => {
  const { analytics } = api();
  MemoryRedis.values.set('sonexis:visit-analytics:events', [
    JSON.stringify({ id: 'old-resume', timestamp: new Date().toISOString(), tag: 'resume', city: 'Seattle', region: 'Washington', country: 'United States', source: 'example.com' }),
    JSON.stringify({ id: 'other', timestamp: new Date().toISOString(), tag: 'portfolio', city: 'Paris', region: 'Unknown', country: 'France', source: 'example.org' }),
  ]);
  const data = await (await analytics(admin('?events=visits&tag=resume&classification=uncertain&location=Seattle&source=example.com'))).json();
  assert.equal(data.matchingCount, 1);
  assert.equal(data.events[0].id, 'old-resume');
  assert.equal(data.events[0].engagement, null);
  assert.equal(data.events[0].classification.classification, 'Uncertain');
  assert.equal((await (await analytics(admin())).json()).resumeStats.uncertain, 1);
});

test('historical metadata shows only recorded nearby visits and keeps timing-only cases uncertain', async () => {
  const { recordedPatterns } = loadModule('lib/historicalVisits.ts');
  const visitorId = 'abcdef123456';
  const baseTime = Date.parse('2026-10-13T12:00:00.000Z');
  const record = (id, seconds, tag = 'resume', idOverride = visitorId) => ({
    id, timestamp: new Date(baseTime + seconds * 1000).toISOString(), visitorId: idOverride,
    tag, city: 'Seattle', region: 'Washington', country: 'United States', source: 'example.com',
  });
  const records = [record('a', 0), record('b', 3), record('c', 7), record('d', 8, 'portfolio'), record('far', 3600), record('different', 4, 'resume', '123456abcdef')];
  const patterns = recordedPatterns(records);
  assert.equal(patterns.get('b').nearbyCount, 4);
  assert.equal(patterns.get('b').rapidRepeat, true);
  assert.deepEqual(Array.from(patterns.get('b').nearbyVisits.map((visit) => visit.id)), ['a', 'b', 'c', 'd']);
  assert.equal(patterns.get('far').rapidRepeat, false);
  assert.equal(patterns.get('different').nearbyCount, 1);

  const { analytics } = api();
  MemoryRedis.values.set('sonexis:visit-analytics:events', records.map((visit) => JSON.stringify(visit)));
  const response = await analytics(admin('?events=visits&tag=resume&pattern=rapid-repeat&from=2026-10-13&to=2026-10-13'));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(data.events.map((event) => event.id), ['a', 'b', 'c']);
  assert.equal(data.matchingCount, 3);
  assert.ok(data.events.every((event) => event.engagement === null && event.classification.classification === 'Uncertain'));
  assert.equal(data.events[1].classification.score, 2);
  assert.equal(data.events[1].classification.evidenceBasis, 'metadata-only');
  assert.equal(data.events[1].metadataPattern.nearbyVisits.length, 4);
  const summary = (await (await analytics(admin('?from=2026-10-13&to=2026-10-13'))).json()).resumeStats;
  assert.equal(summary.metadataOnly, 5);
  assert.equal(summary.rapidRepeat, 3);
});

test('visit ingestion rate limits repeated fingerprinted requests', async () => {
  const { visits, analytics } = api({ process: { env: { ADMIN_ANALYTICS_TOKEN: 'test-admin', ANALYTICS_HASH_SECRET: 'test-hash-secret' } } });
  const request = () => {
    const req = post('visits', { tag: 'resume' });
    req.headers.set('x-vercel-forwarded-for', '192.0.2.9');
    req.headers.set('user-agent', 'Mozilla/5.0');
    return req;
  };
  for (let index = 0; index < 60; index += 1) assert.equal((await visits(request())).status, 200);
  assert.equal((await visits(request())).status, 429);
  const data = await (await analytics(admin())).json();
  assert.equal(data.taggedTraffic.find((item) => item.tag === 'resume').visits, 60);
});
const admin = (query = '') => new Request(`https://sonexis.ink/api/analytics${query}`, {
  headers: { authorization: 'Bearer test-admin' },
});

test('each new tagged page load records a visit; React remounts do not double count', async () => {
  const storage = new Map();
  const first = browser('?ref=Resume', storage);
  await Promise.all([first.recordWebsiteVisit(), first.recordWebsiteVisit()]);
  assert.equal(first.requests.length, 1);
  assert.equal(JSON.parse(first.requests[0].body).tag, 'resume');
  assert.equal(JSON.parse(first.requests[0].body).referrer, 'https://www.example.com/resume.pdf');
  assert.equal(first.getDownloadTag(), 'resume');
  const reloaded = browser('?ref=resume', storage);
  await reloaded.recordWebsiteVisit();
  assert.equal(reloaded.requests.length, 1);
});

test('downloads remember the tag on untagged pages and new tagged links replace it', async () => {
  const storage = new Map();
  const first = browser('?ref=resume', storage);
  await first.recordWebsiteVisit();
  const untagged = browser('', storage);
  await untagged.recordWebsiteVisit();
  assert.equal(untagged.requests.length, 1);
  assert.equal(JSON.parse(untagged.requests[0].body).tag, 'resume');
  assert.equal(untagged.getDownloadTag(), 'resume');
  assert.equal(browser('?ref=portfolio', storage).getDownloadTag(), 'portfolio');
  assert.equal(browser('', storage).getDownloadTag(), 'portfolio');
  assert.equal(browser('', new Map()).getDownloadTag(), null);
});

test('blocked storage preserves the current tag; invalid URL tags count as untagged', async () => {
  const blocked = browser('?ref=resume', new Map(), true);
  await blocked.recordWebsiteVisit();
  assert.equal(blocked.getDownloadTag(), 'resume');
  for (const search of ['', '?ref=bad%20tag', '?ref=' + 'x'.repeat(65)]) {
    const page = browser(search);
    await page.recordWebsiteVisit();
    assert.equal(page.requests.length, 1);
    assert.equal(JSON.parse(page.requests[0].body).tag, null);
    assert.equal(page.getDownloadTag(), null);
  }
});

test('tagged visits and downloads appear together; legacy downloads stay untagged', async () => {
  const handlers = api();
  for (let index = 0; index < 3; index += 1) {
    assert.equal((await handlers.visits(post('visits', { tag: 'Resume' }))).status, 200);
  }
  assert.equal((await handlers.downloads(post('downloads', { tag: 'resume', version: '2.1.0' }))).status, 200);
  assert.equal((await handlers.downloads(post('downloads', { version: '2.1.0' }))).status, 200);
  const response = await handlers.analytics(admin());
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(data.taggedTraffic, [
    { tag: 'resume', visits: 3, downloads: 1 },
    { tag: '(untagged)', visits: 0, downloads: 1 },
  ]);
  assert.equal(data.totalDownloads, 2);
  assert.equal(data.recentVisitEvents.length, 3);
  assert.ok(data.recentVisitEvents.every(event => event.tag === 'resume'));
  assert.equal(data.recentEvents.filter(event => event.tag === 'resume').length, 1);
  assert.equal(data.recentEvents.filter(event => event.tag === null).length, 1);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store, max-age=0');
});

test('date filters include visits-only and downloads-only tags, including empty ranges', async () => {
  const { analytics } = api();
  MemoryRedis.values.set('sonexis:visit-analytics:day:2026-10-01:tags', { resume: 4, portfolio: 2 });
  MemoryRedis.values.set('sonexis:visit-analytics:day:2026-10-02:tags', { resume: 3 });
  MemoryRedis.values.set('sonexis:download-analytics:day:2026-10-02:tags', { resume: 2, old: 1 });
  const data = await (await analytics(admin('?from=2026-10-01&to=2026-10-02'))).json();
  assert.deepEqual(data.taggedTraffic, [
    { tag: 'resume', visits: 7, downloads: 2 },
    { tag: 'portfolio', visits: 2, downloads: 0 },
    { tag: 'old', visits: 0, downloads: 1 },
    { tag: '(untagged)', visits: 0, downloads: 0 },
  ]);
  assert.deepEqual((await (await analytics(admin('?from=2026-09-01&to=2026-09-01'))).json()).taggedTraffic, [
    { tag: '(untagged)', visits: 0, downloads: 0 },
  ]);
});

test('visit validation and private analytics access reject invalid requests', async () => {
  const { visits, analytics } = api();
  assert.equal((await visits(new Request('https://sonexis.ink/api/visits'))).status, 405);
  assert.equal((await visits(post('visits', { tag: 'resume' }, 'https://example.com'))).status, 403);
  for (const body of [null, [], 'resume', { tag: 'bad tag' }, { tag: 42 }, { tag: 'x'.repeat(65) }]) {
    assert.equal((await visits(post('visits', body))).status, 400);
  }
  assert.equal((await visits(new Request('https://sonexis.ink/api/visits', {
    method: 'POST', headers: { origin: 'https://sonexis.ink' }, body: 'invalid JSON',
  }))).status, 400);
  assert.equal((await analytics(new Request('https://sonexis.ink/api/analytics'))).status, 401);
  assert.equal((await analytics(admin('?from=2026-10-03&to=2026-10-01'))).status, 400);
  assert.equal(MemoryRedis.values.size, 0);
});

test('untagged page loads count individually without being duplicated by React remounts', async () => {
  const storage = new Map();
  const first = browser('', storage);
  await Promise.all([first.recordWebsiteVisit(), first.recordWebsiteVisit()]);
  assert.equal(first.requests.length, 1);
  assert.equal(JSON.parse(first.requests[0].body).tag, null);
  const second = browser('', storage);
  await second.recordWebsiteVisit();
  assert.equal(second.requests.length, 1);
  assert.equal(second.getDownloadTag(), null);
});

test('untagged visits and downloads are counted for all time and selected dates', async () => {
  const { visits, downloads, analytics } = api();
  assert.equal((await visits(post('visits', { tag: null }))).status, 200);
  assert.equal((await visits(post('visits', {}))).status, 200);
  assert.equal((await downloads(post('downloads', {}))).status, 200);
  const expected = [{ tag: '(untagged)', visits: 2, downloads: 1 }];
  const today = new Date().toISOString().slice(0, 10);
  assert.deepEqual((await (await analytics(admin())).json()).taggedTraffic, expected);
  assert.deepEqual((await (await analytics(admin(`?from=${today}&to=${today}`))).json()).taggedTraffic, expected);
  assert.equal((await visits(post('visits', { tag: 'untagged' }))).status, 200);
  const sources = (await (await analytics(admin())).json()).taggedTraffic;
  assert.equal(sources.find(item => item.tag === 'untagged').visits, 1);
  assert.equal(sources.find(item => item.tag === '(untagged)').visits, 2);
});

test('visit events include request details and match download visitor IDs without storing raw identifiers', async () => {
  const handlers = api({ process: { env: { ADMIN_ANALYTICS_TOKEN: 'test-admin', ANALYTICS_HASH_SECRET: 'test-hash-secret' } } });
  const body = { tag: 'resume', referrer: 'https://www.example.com/private/path?token=do-not-store' };
  const request = (endpoint) => {
    const req = post(endpoint, body);
    req.headers.set('x-vercel-forwarded-for', '192.0.2.5');
    req.headers.set('user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36');
    req.headers.set('x-vercel-ip-country', 'US');
    req.headers.set('x-vercel-ip-country-region', 'CA');
    req.headers.set('x-vercel-ip-city', 'San%20Francisco');
    req.headers.set('accept-language', 'en-US,en;q=0.9');
    return req;
  };
  assert.equal((await handlers.visits(request('visits'))).status, 200);
  assert.equal((await handlers.downloads(request('downloads'))).status, 200);
  const data = await (await handlers.analytics(admin())).json();
  const event = data.recentVisitEvents[0];
  assert.ok(event.id);
  assert.ok(Number.isFinite(Date.parse(event.timestamp)));
  assert.equal(event.tag, 'resume');
  assert.equal(event.country, 'United States');
  assert.equal(event.region, 'California');
  assert.equal(event.city, 'San Francisco');
  assert.equal(event.device, 'Mac');
  assert.equal(event.browser, 'Chrome');
  assert.equal(event.language, 'en-US');
  assert.equal(event.source, 'example.com');
  assert.match(event.visitorId, /^[a-f0-9]{12}$/);
  assert.equal(event.visitorId, data.recentEvents[0].visitorId);
  const serialized = JSON.stringify(event);
  for (const sensitive of ['192.0.2.5', 'Mozilla/5.0', 'private/path', 'do-not-store', 'test-hash-secret']) {
    assert.ok(!serialized.includes(sensitive));
  }
});

test('visit event log excludes malformed records and filters inclusive UTC dates', async () => {
  const { analytics } = api();
  const record = (id, timestamp) => JSON.stringify({ id, timestamp, tag: 'resume' });
  MemoryRedis.values.set('sonexis:visit-analytics:events', [
    record('after', '2026-10-14T00:00:00.000Z'),
    record('end', '2026-10-13T23:59:59.999Z'),
    'invalid-json',
    record('invalid-time', 'invalid'),
    record('start', '2026-10-13T00:00:00.000Z'),
    record('before', '2026-10-12T23:59:59.999Z'),
  ]);
  const filtered = await (await analytics(admin('?from=2026-10-13&to=2026-10-13'))).json();
  assert.deepEqual(filtered.recentVisitEvents.map(event => event.id), ['end', 'start']);
  const all = await (await analytics(admin())).json();
  assert.deepEqual(all.recentVisitEvents.map(event => event.id), ['after', 'end', 'start', 'before']);
});

test('visit events retain only the newest 2,000 and return at most 250', async () => {
  const { visits, analytics } = api();
  MemoryRedis.values.set('sonexis:visit-analytics:events', Array.from({ length: 2000 }, (_, index) => JSON.stringify({
    id: `visit-${index}`, timestamp: '2026-10-13T00:00:00.000Z', tag: null,
  })));
  assert.equal((await visits(post('visits', { tag: 'resume' }))).status, 200);
  const stored = MemoryRedis.values.get('sonexis:visit-analytics:events');
  assert.equal(stored.length, 2000);
  assert.equal(JSON.parse(stored[0]).tag, 'resume');
  assert.equal(JSON.parse(stored.at(-1)).id, 'visit-1998');
  const data = await (await analytics(admin())).json();
  assert.equal(data.recentVisitEvents.length, 250);
  assert.equal(data.recentVisitEvents[0].tag, 'resume');
  assert.equal(data.recentVisitEvents.at(-1).id, 'visit-248');
});

test('untagged filter finds visits older than the newest 250 tagged events', async () => {
  const { analytics } = api();
  const timestamp = '2026-10-13T12:00:00.000Z';
  MemoryRedis.values.set('sonexis:visit-analytics:events', [
    ...Array.from({ length: 250 }, (_, index) => JSON.stringify({ id: `resume-${index}`, timestamp, tag: 'resume' })),
    JSON.stringify({ id: 'untagged-older', timestamp, tag: null }),
    JSON.stringify({ id: 'untagged-legacy', timestamp }),
    JSON.stringify({ id: 'literal-tag', timestamp, tag: 'untagged' }),
    JSON.stringify({ id: 'outside-range', timestamp: '2026-10-12T12:00:00.000Z', tag: null }),
  ]);
  const query = '?events=visits&tag=%28untagged%29&from=2026-10-13&to=2026-10-13';
  const response = await analytics(admin(query));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store, max-age=0');
  assert.deepEqual((await response.json()).events.map(event => event.id), ['untagged-older', 'untagged-legacy']);
  const normal = await (await analytics(admin('?from=2026-10-13&to=2026-10-13'))).json();
  assert.equal(normal.recentVisitEvents.length, 250);
  assert.ok(normal.recentVisitEvents.every(event => event.tag === 'resume'));
  const tagged = await (await analytics(admin('?events=visits&tag=untagged'))).json();
  assert.deepEqual(tagged.events.map(event => event.id), ['literal-tag']);
});

test('filtered event reads preserve authentication, validation, and download-log isolation', async () => {
  const { analytics } = api();
  MemoryRedis.values.set('sonexis:download-analytics:events', [JSON.stringify({
    id: 'untagged-download', timestamp: '2026-10-13T12:00:00.000Z', tag: null,
  })]);
  const query = '?events=downloads&tag=%28untagged%29';
  assert.equal((await analytics(new Request(`https://sonexis.ink/api/analytics${query}`))).status, 401);
  assert.deepEqual((await (await analytics(admin(query))).json()).events.map(event => event.id), ['untagged-download']);
  for (const invalid of ['?events=invalid', '?events=visits&tag=bad%20tag', '?events=visits&from=invalid', '?events=visits&pattern=unknown']) {
    assert.equal((await analytics(admin(invalid))).status, 400);
  }
});
