import { content, makePost, publicPage } from './shared.js';

export const douyin = {
  id: 'douyin', name: '抖音',
  matches: host => host === 'www.douyin.com' || host === 'douyin.com',
  // Restrict to explicit cards; never select the full-screen player or page shell.
  selector: '[data-e2e="video-card"], li:not(:has([data-e2e="video-card"])):has(a[href*="/video/"])',
  allowedPage: publicPage,
  extract(item) {
    if (item.closest('[data-e2e="feed-active-video"]')) return null;
    const link = item.querySelector('a[href*="/video/"]');
    const author = item.querySelector('a[href*="/user/"]');
    return makePost(this.id, link?.getAttribute('href')?.match(/\/video\/(\d+)/)?.[1],
      content(item, ['[data-e2e="video-desc"]', '[data-e2e="video-title"]', 'a[href*="/video/"] [title]']) || link?.getAttribute('title') || item.querySelector('a[href*="/video/"] [title]')?.getAttribute('title') || '',
      author?.getAttribute('href')?.match(/\/user\/([\w-]+)/)?.[1] || '', '视频标题/简介');
  },
  mountNotice(item, host) { item.append(host); },
};
