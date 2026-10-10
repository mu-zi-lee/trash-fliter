import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { FilterEngine } from '../src/core/engine.js';
import { normalizeSettings } from '../src/config/settings.js';
import { ResultCache } from '../src/storage/cache.js';
import { RequestRateLimit } from '../src/core/rate-limit.js';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
function fixture(classifyPost, overrides = {}) {
  const dom = new JSDOM('<main><article data-testid="tweet"><a href="/alice/status/1"><time>now</time></a><p data-testid="tweetText">This is a substantive long enough post for the classification engine test.</p></article></main>', { url: 'https://x.com/home', pretendToBeVisual: true });
  const previous = Object.fromEntries(['document', 'location', 'IntersectionObserver', 'MutationObserver'].map(key => [key, globalThis[key]]));
  globalThis.document = dom.window.document;
  globalThis.location = dom.window.location;
  globalThis.MutationObserver = dom.window.MutationObserver;
  globalThis.IntersectionObserver = class { constructor(callback) { this.callback = callback; } observe() {} unobserve() {} disconnect() {} };
  let config = normalizeSettings({ enabled: true, keys: { nace: 'demo' }, ...overrides });
  const paints = [];
  const view = { clear() {}, clearAll() {}, has: () => true, render: (article, decision) => paints.push({ text: article.textContent, decision }) };
  const cache = new ResultCache({ read: (_, fallback) => fallback, write() {} });
  const engine = new FilterEngine({ getConfig: () => config, cache, view, onStatus() {}, classifyPost });
  engine.queue.interval = 0;
  engine.scan();
  const article = dom.window.document.querySelector('article');
  const meta = engine.records.get(article);
  return { engine, article, meta, paints, setConfig(next) { config = normalizeSettings(next); }, close() { engine.destroy(); cache.flush(); dom.window.close(); Object.assign(globalThis, previous); } };
}

test('model never runs before intersection; local rules need no key or intersection', async () => {
  let requests = 0;
  const f = fixture(async () => { requests++; return { marketing: 0.95, evidence_marketing: 0.95, useful: 0.1 }; });
  try {
    assert.equal(requests, 0);
    f.engine.intersection.callback([{ target: f.article, isIntersecting: true }]);
    await wait(10);
    assert.equal(requests, 1);
    assert.equal(f.paints.at(-1).decision.kind, 'filter');
  } finally { f.close(); }
  const local = fixture(async () => { throw new Error('Should not call'); }, { keys: {}, blockedAccounts: ['alice'] });
  try { assert.equal(local.paints[0].decision.source, 'local'); assert.equal(local.engine.requests, 0); }
  finally { local.close(); }
});

test('recycled article cannot receive its previous content decision', async () => {
  let resolve;
  const f = fixture(() => new Promise(done => { resolve = done; }));
  try {
    f.meta.visible = true;
    f.engine.consider(f.meta);
    f.article.querySelector('p').textContent = 'A different article has replaced the original content while a request is in flight.';
    f.engine.scan();
    resolve({ marketing: 0.99, useful: 0.01 });
    await wait(10);
    assert.equal(f.paints.length, 0);
    assert.notEqual(f.engine.records.get(f.article), f.meta);
  } finally { f.close(); }
});

test('settings reset aborts in-flight work and discards even a late successful response', async () => {
  let signal;
  let resolve;
  const f = fixture((text, config, value) => { signal = value; return new Promise(done => { resolve = done; }); });
  try {
    f.meta.visible = true;
    f.engine.consider(f.meta);
    f.engine.reset();
    assert.equal(signal.aborted, true);
    resolve({ marketing: 0.99, useful: 0.01 });
    await wait(10);
    assert.equal(f.paints.length, 0);
    assert.equal(f.engine.cache.items.size, 0);
  } finally { f.close(); }
});

test('offscreen skipped tasks can be queued again on reentry', async () => {
  let requests = 0;
  const f = fixture(async () => { requests++; return { marketing: 0.01, useful: 0.9 }; });
  try {
    f.meta.visible = false;
    f.engine.consider(f.meta);
    await wait(5);
    assert.equal(requests, 0);
    assert.equal(f.meta.queued, false);
    f.meta.visible = true;
    f.engine.consider(f.meta);
    await wait(5);
    assert.equal(requests, 1);
  } finally { f.close(); }
});

test('rate ceiling waits without error and automatically resumes visible posts', async () => {
  let requests = 0;
  const f = fixture(async () => { requests++; return { marketing: 0.95, evidence_marketing: 0.95, useful: 0.1 }; }, { requestRate: 1 });
  try {
    f.engine.rateLimit = new RequestRateLimit({ windowMs: 60 });
    f.engine.rateLimit.record();
    f.meta.visible = true;
    f.engine.consider(f.meta);
    await wait(10);
    assert.equal(requests, 0);
    assert.equal(f.engine.error, '');
    assert.equal(f.engine.queue.blocked, false);
    assert.equal(f.meta.queued, false);
    await wait(250);
    assert.equal(requests, 1);
    assert.equal(f.paints.at(-1).decision.kind, 'filter');
  } finally { f.close(); }
});

test('a skipped offscreen post does not consume a renewed quota', async () => {
  let requests = 0;
  const f = fixture(async () => { requests++; return {}; }, { requestRate: 1 });
  try {
    f.engine.rateLimit = new RequestRateLimit({ windowMs: 30 });
    f.engine.rateLimit.record();
    f.meta.visible = true;
    f.engine.consider(f.meta);
    f.meta.visible = false;
    await wait(200);
    assert.equal(requests, 0);
  } finally { f.close(); }
});

test('engine passes title context, detects short titles and does not reuse body cache', async () => {
  let received;
  const f = fixture(async (text, config, signal, context) => {
    received = { text, context };
    return { marketing: 0.96, evidence_marketing: 0.96, useful: 0.1 };
  }, { categories: ['marketing'] });
  try {
    const original = f.engine.site;
    f.engine.site = { ...original, id: 'linux-do', extract(article) {
      const post = original.extract(article);
      return post && { ...post, scope: '主题标题' };
    } };
    f.article.querySelector('p').textContent = '加群领取稳赚不赔的课程';
    f.engine.reset();
    f.engine.scan();
    const meta = f.engine.records.get(f.article);
    meta.visible = true;
    f.engine.consider(meta);
    await wait(10);
    assert.equal(received.text, '加群领取稳赚不赔的课程');
    assert.deepEqual(received.context, { site: 'linux-do', scope: '主题标题', titleOnly: true, truncated: false });
    assert.equal(f.paints.at(-1).decision.kind, 'filter');
    const config = normalizeSettings({ categories: ['marketing'] });
    assert.ok(f.engine.cached(meta.post, config));
    assert.equal(f.engine.cached({ ...meta.post, scope: '正文' }, config), null);
  } finally { f.close(); }
});
