import { createElement, MessageCircle, Repeat2, Heart } from 'lucide';
import { normalizeSettings } from '../src/config/settings.js';
import { POSTS, createArticle } from './fixtures.js';

const settings = normalizeSettings({ enabled: true, provider: 'nace', keys: { nace: 'demo-key' } });
const memory = new Map([['xqf:config:v3', settings]]);
globalThis.GM_getValue = (key, fallback) => structuredClone(memory.get(key) ?? fallback);
globalThis.GM_setValue = (key, value) => memory.set(key, structuredClone(value));
globalThis.GM_registerMenuCommand = () => {};
globalThis.demoRequests = [];
globalThis.GM_xmlhttpRequest = options => {
  const payload = JSON.parse(options.data);
  globalThis.demoRequests.push(payload);
  const spam = /被动收入|惊天内幕/.test(payload.state);
  const protectedPost = /手冲咖啡/.test(payload.state);
  const answers = Object.fromEntries(Object.keys(payload.questions).map(id => [id, { noul: id === 'is_test' ? 1 : id === 'useful' ? protectedPost || !spam ? 0.95 : 0.1 : spam || (protectedPost && ['marketing', 'evidence_marketing'].includes(id)) ? 0.96 : 0.08 }]));
  const timer = setTimeout(() => options.onload({ status: 200, responseText: JSON.stringify({ answers }) }), 120);
  return { abort() { clearTimeout(timer); options.onabort?.(); } };
};
function append(post) {
  const article = createArticle(post);
  const icons = { message: MessageCircle, repost: Repeat2, heart: Heart };
  for (const el of article.querySelectorAll('[data-icon]')) {
    const svg = createElement(icons[el.dataset.icon]);
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('stroke-width', '1.4');
    el.append(svg, document.createTextNode('12'));
  }
  document.getElementById('timeline').append(article);
}
POSTS.forEach(append);
let extra = 20000;
document.getElementById('add-post').addEventListener('click', () => append({ ...POSTS[1], id: String(extra++), text: `第 ${extra} 期。${POSTS[1].text}` }));
await import('../src/main.js');
