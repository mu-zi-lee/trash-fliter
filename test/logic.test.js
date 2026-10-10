import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, exportSettings, importSettings, normalizeSettings, signature } from '../src/config/settings.js';
import { localDecision, scoreDecision } from '../src/filter/decision.js';
import { parseScores, buildPayload, requestJSON } from '../src/providers/systemone.js';
import { ResultCache } from '../src/storage/cache.js';
import { TaskQueue } from '../src/core/queue.js';
import { RequestRateLimit } from '../src/core/rate-limit.js';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const config = normalizeSettings();

test('normalize untrusted settings and migrate old cover mode', () => {
  assert.equal(normalizeSettings({ mode: 'fold' }).mode, 'cover');
  const result = normalizeSettings({ enabled: 'false', provider: 'unknown', categories: ['empty', 'empty', '__proto__'], threshold: 4, keys: { nace: 12 }, allowedAccounts: ['@Alice', '@alice'] });
  assert.equal(result.enabled, false);
  assert.equal(result.provider, 'nace');
  assert.deepEqual(result.categories, ['empty']);
  assert.deepEqual(result.allowedAccounts, ['alice']);
  assert.equal(result.threshold, 0.99);
  assert.equal(result.keys.nace, '');
  assert.equal(DEFAULTS.enabled, false);
  assert.equal(normalizeSettings({ requestLimit: 100 }).requestRate, 30);
  assert.equal(normalizeSettings({ requestRate: 200 }).requestRate, 90);
});

test('rate limit replenishes on a rolling window without a lifetime ceiling', () => {
  let now = 0;
  const limiter = new RequestRateLimit({ now: () => now });
  limiter.record();
  now = 10_000;
  limiter.record();
  assert.equal(limiter.delay(2), 50_000);
  now = 60_000;
  assert.equal(limiter.delay(2), 0);
  limiter.record();
  assert.equal(limiter.delay(2), 10_000);
  now = 70_000;
  assert.equal(limiter.delay(2), 0);
});

test('account allowlist precedes explicit local blocks and keywords', () => {
  const rules = normalizeSettings({ blockedKeywords: 'SALE', blockedAccounts: ['@alice'], allowedAccounts: ['alice'] });
  assert.equal(localDecision({ handle: 'alice', text: 'Sale today' }, rules).kind, 'allow');
  assert.equal(localDecision({ handle: 'bob', text: 'sale today' }, rules).source, 'local');
});

test('useful content vetoes model filtering but does not veto local rules', () => {
  assert.equal(scoreDecision({ marketing: 0.95, evidence_marketing: 0.95, useful: 0.9 }, config).kind, 'protected');
  assert.equal(scoreDecision({ marketing: 0.95, evidence_marketing: 0.95, useful: 0.2 }, config).kind, 'filter');
  assert.equal(scoreDecision({ marketing: 0.87, evidence_marketing: 0.95, useful: 0.2 }, config).kind, 'allow');
  assert.equal(scoreDecision({ marketing: 0.88, evidence_marketing: 0.95, useful: 0.2 }, config).kind, 'filter');
});

test('model schema rejects incomplete scores instead of treating them as safe', () => {
  assert.throws(() => parseScores({ answers: {} }, ['marketing']));
  for (const score of [-1, 2, '0.95', NaN]) assert.throws(() => parseScores({ answers: { marketing: { noul: score } } }, ['marketing']));
  assert.deepEqual(parseScores({ answers: { marketing: { noul: 0.91 } } }, ['marketing']), { marketing: 0.91 });
  assert.ok(buildPayload('post', config).questions.useful);
  assert.equal(buildPayload('post', config).model, 'drex-v1.5');
});

test('cache signature excludes rendering but includes model question changes', () => {
  assert.equal(signature(config), signature({ ...config, threshold: 0.99, mode: 'mark' }));
  assert.notEqual(signature(config), signature({ ...config, provider: 'codiv' }));
  assert.notEqual(signature(config), signature({ ...config, protectUseful: false }));
});

test('cache expires, checks exact text and rejects malformed stored entries', () => {
  let now = 1000;
  let saved;
  const cache = new ResultCache({ read: () => [{ input: 'bad', scores: { empty: 9 }, at: 1000 }], write: (_, data) => { saved = data; } }, () => now);
  assert.equal(cache.items.size, 0);
  cache.set('v1', 'text', { empty: 0.95 });
  assert.deepEqual(cache.get('v1', 'text'), { empty: 0.95 });
  assert.equal(cache.get('v1', 'text', ['empty', 'useful']), null);
  assert.equal(cache.get('v2', 'text'), null);
  assert.equal(cache.get('v1', 'other'), null);
  cache.flush();
  assert.equal(saved.length, 1);
  now += 8 * 86400000;
  assert.equal(cache.get('v1', 'text'), null);
  cache.clear();
  assert.deepEqual(saved, []);
});

test('export never includes keys; imports preserve keys and start disabled', () => {
  const original = normalizeSettings({ enabled: true, keys: { nace: 'secret' } });
  const text = JSON.stringify(exportSettings(original));
  assert.ok(!text.includes('secret'));
  const imported = importSettings(text, original);
  assert.equal(imported.enabled, false);
  assert.equal(imported.keys.nace, 'secret');
  assert.throws(() => importSettings('{"settings":{}}', original));
});

test('transport aborts GM request and ignores a late response', async () => {
  const controller = new AbortController();
  let options;
  let aborted = false;
  const request = requestJSON('nace', 'key', {}, { signal: controller.signal, transport: value => { options = value; return { abort: () => { aborted = true; } }; } });
  controller.abort();
  await assert.rejects(request, { name: 'AbortError' });
  options.onload({ status: 200, responseText: '{}' });
  assert.equal(aborted, true);
});

test('transport errors never reflect server HTML or credentials into the UI', async () => {
  await assert.rejects(requestJSON('nace', 'secret', {}, { transport: options => {
    queueMicrotask(() => options.onload({ status: 401, responseText: '<script>secret</script>' }));
    return { abort() {} };
  } }), /密钥无效/);
});

test('queue reset cancels old work and allows the same post to be enqueued again', async () => {
  const events = [];
  const queue = new TaskQueue({ interval: 0, onError: error => events.push(error.message) });
  queue.add('post', signal => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))));
  queue.reset();
  assert.equal(queue.add('post', async () => { events.push('new'); }), true);
  await wait(20);
  assert.deepEqual(events, ['new']);
  assert.equal(queue.pending, 0);
});

test('queue stops all subsequent work after a service error', async () => {
  const events = [];
  const queue = new TaskQueue({ interval: 0, onError: error => events.push(error.message) });
  queue.add('1', async () => { throw new Error('quota'); });
  queue.add('2', async () => events.push('unexpected'));
  await wait(20);
  assert.deepEqual(events, ['quota']);
  assert.equal(queue.blocked, true);
});
