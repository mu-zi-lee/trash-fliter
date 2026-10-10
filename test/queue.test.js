import test from 'node:test';
import assert from 'node:assert/strict';
import { TaskQueue } from '../src/core/queue.js';
import { RequestRateLimit } from '../src/core/rate-limit.js';

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

test('queue bounds concurrency, deduplicates active keys and drains waiting work', async () => {
  const resolves = [];
  const queue = new TaskQueue({ concurrency: 4, onError: assert.fail });
  for (let i = 0; i < 8; i++) queue.add(String(i), () => new Promise(resolve => resolves.push(resolve)));
  assert.equal(resolves.length, 4);
  assert.equal(queue.pending, 8);
  assert.equal(queue.add('0', async () => {}), false);
  resolves.splice(0).forEach(resolve => resolve());
  await tick();
  assert.equal(resolves.length, 4);
  resolves.splice(0).forEach(resolve => resolve());
  await tick();
  assert.equal(queue.pending, 0);
});

test('reset aborts every in-flight task and discards waiting tasks', async () => {
  const signals = [];
  const queue = new TaskQueue({ onError: assert.fail });
  for (let i = 0; i < 8; i++) queue.add(String(i), signal => new Promise((resolve, reject) => {
    signals.push(signal);
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }));
  queue.reset();
  assert.equal(signals.length, 4);
  assert.ok(signals.every(signal => signal.aborted));
  let ran = false;
  queue.add('0', async () => { ran = true; });
  await tick();
  assert.equal(ran, true);
  assert.equal(queue.pending, 0);
});

test('concurrent workers reserve the rolling rate quota before sending', async () => {
  const limiter = new RequestRateLimit({ now: () => 0 });
  const queue = new TaskQueue({ onError: assert.fail });
  let requests = 0;
  for (let i = 0; i < 210; i++) queue.add(String(i), async () => {
    if (limiter.delay(200)) return;
    limiter.record();
    requests++;
    await tick();
  });
  while (queue.pending) await tick();
  assert.equal(requests, 200);
});
