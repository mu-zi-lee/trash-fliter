import { content, makePost, mountBefore, publicPage } from './shared.js';

export const xiaohongshu = {
  id: 'xiaohongshu', name: '小红书',
  matches: host => host === 'xiaohongshu.com' || host === 'www.xiaohongshu.com',
  selector: '.note-item, section:has(> a[href*="/explore/"]):not(.note-item), section:has(> a[href*="/search_result/"]):not(.note-item), .note-detail-mask .note-content',
  allowedPage: publicPage,
  extract(item) {
    const detail = item.matches('.note-content');
    const link = item.querySelector('a[href*="/explore/"], a[href*="/discovery/item/"], a[href*="/search_result/"]');
    const author = item.querySelector('a[href*="/user/profile/"]');
    const id = link?.getAttribute('href')?.match(/\/(?:explore|discovery\/item|search_result)\/([\w-]+)/)?.[1];
    if (!detail && !id) return null;
    return makePost(this.id, id, content(item, detail ? ['#detail-title', '#detail-desc'] : ['.title', '.note-title']),
      author?.getAttribute('href')?.match(/\/user\/profile\/([\w-]+)/)?.[1] || '', detail ? '笔记正文' : '笔记标题');
  },
  mountNotice(item, host) { mountBefore(item, host, '.author-wrapper, .interact-container'); },
  foldLayout(item) { return item.matches('.note-content') ? null : 'waterfall'; },
};
