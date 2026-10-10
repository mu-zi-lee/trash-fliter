import { hash } from '../storage/cache.js';
export { ownNode, observePosts } from './shared.js';

export const POST_SELECTOR = 'main article[data-testid="tweet"]';
const QUOTE = '[data-testid="quoteTweet"], div[role="link"]';

function isOwn(node, article) {
  return node.closest('article[data-testid="tweet"]') === article && !node.closest(QUOTE);
}

export function mountPostNotice(article, host) {
  const actions = [...article.querySelectorAll('[role="group"], .post-actions')].find(el =>
    isOwn(el, article) && (el.matches('.post-actions') || el.querySelector('[data-testid="reply"]'))
  );
  if (actions) actions.before(host);
  else {
    const text = [...article.querySelectorAll('[data-testid="tweetText"]')].find(el => isOwn(el, article));
    if (text) text.after(host);
    else article.append(host);
  }
}

export function extractPost(article) {
  const node = [...article.querySelectorAll('[data-testid="tweetText"]')].find(el => isOwn(el, article));
  const text = (node?.textContent || '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const time = [...article.querySelectorAll('time')].find(el => isOwn(el, article));
  const anchor = time?.closest('a[href*="/status/"]');
  const match = anchor?.getAttribute('href')?.match(/\/([^/]+)\/status\/(\d+)/);
  // Include content in identity: X can expand a post or reuse an existing article.
  return { identity: `${match?.[2] || 'text'}:${hash(text)}:${text.length}`, text, handle: match?.[1]?.toLowerCase() || '', id: match?.[2] || null };
}

export function allowedPage(path = location.pathname) {
  return !/^\/(messages|settings|compose|i\/flow|i\/premium_sign_up|login|logout)(\/|$)/.test(path);
}

export const x = {
  id: 'x', name: 'X', matches: host => ['x.com', 'twitter.com'].includes(host),
  selector: POST_SELECTOR, allowedPage, extract: extractPost, mountNotice: mountPostNotice,
};
