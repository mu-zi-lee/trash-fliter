import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { buildTemplates } from '../scripts/templates.mjs';
import { setTemplate } from '../src/ui/dom.js';

test('compiled panel builds readable DOM without HTML sinks', async () => {
  await buildTemplates();
  const { default: nodes } = await import('../src/ui/panel-template.js');
  const dom = new JSDOM();
  const previous = globalThis.document;
  globalThis.document = dom.window.document;
  const descriptor = Object.getOwnPropertyDescriptor(dom.window.Element.prototype, 'innerHTML');
  Object.defineProperty(dom.window.Element.prototype, 'innerHTML', {
    set() { throw new Error('HTML sink must not be used'); },
  });
  try {
    const root = document.createElement('div');
    setTemplate(root, nodes);
    assert.equal(root.querySelector('#panel-title').textContent, 'trash-fliter');
    assert.equal(root.querySelector('#blockedKeywords').placeholder, '加群领取\n稳赚不赔');
    assert.equal(root.querySelectorAll('[role="tab"]').length, 3);
    assert.equal(root.querySelector('#requestRate').max, '90');
  } finally {
    globalThis.document = previous;
    Object.defineProperty(dom.window.Element.prototype, 'innerHTML', descriptor);
    dom.window.close();
  }
});
