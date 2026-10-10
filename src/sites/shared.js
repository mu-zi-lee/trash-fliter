import { hash } from '../storage/cache.js';

export function textOf(node) {
  if (!node) return '';
  const copy = node.cloneNode(true);
  copy.querySelectorAll('[data-xqf-ui], script, style, blockquote').forEach(el => el.remove());
  return (copy.textContent || '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
}

export function content(node, selectors) {
  return [...new Set(selectors.map(selector => textOf(node.querySelector(selector))).filter(Boolean))].join('\n');
}

export function makePost(site, id, text, handle = '', scope = '正文') {
  if (!text) return null;
  handle = handle.trim().replace(/^@/, '').toLowerCase();
  return { id: id || null, identity: `${site}:${id || 'text'}:${hash(text)}:${text.length}`, text, handle, scope };
}

export function mountBefore(item, host, selector) {
  const target = item.querySelector(selector);
  if (target) target.before(host);
  else item.append(host);
}

export function publicPage(path = location.pathname) {
  return !/^\/(login|signin|settings|messages|account|admin)(\/|$)/.test(path);
}

export function ownNode(node) {
  const el = node.nodeType === 1 ? node : node.parentElement;
  return !!el?.closest('[data-xqf-ui]');
}

export function observePosts(onChange) {
  const observer = new MutationObserver(records => {
    if (records.some(record => !ownNode(record.target) && (
      record.type === 'characterData' || [...record.addedNodes, ...record.removedNodes].some(node => !ownNode(node))
    ))) onChange();
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  return () => observer.disconnect();
}
