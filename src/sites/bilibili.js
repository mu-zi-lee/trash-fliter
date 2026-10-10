import { content, makePost, mountBefore, publicPage } from './shared.js';

export const bilibili = {
  id: 'bilibili', name: '哔哩哔哩',
  matches: host => ['www.bilibili.com', 't.bilibili.com', 'search.bilibili.com'].includes(host),
  selector: '.bili-video-card, .video-list-item, .bili-dyn-list__item',
  allowedPage: publicPage,
  extract(item) {
    const dynamic = item.matches('.bili-dyn-list__item');
    const link = item.querySelector('a[href*="/video/"], a[href*="t.bilibili.com/"]');
    const author = item.querySelector('a[href*="space.bilibili.com/"]');
    return makePost(this.id, link?.getAttribute('href')?.match(/\/(BV[\w]+|av\d+|\d{10,})/)?.[1],
      content(item, dynamic ? ['.bili-rich-text__content', '.bili-dyn-card-video__title'] : ['.bili-video-card__info--tit', '.title']),
      author?.getAttribute('href')?.match(/space\.bilibili\.com\/(\d+)/)?.[1] || '', dynamic ? '动态正文' : '视频标题');
  },
  mountNotice(item, host) { mountBefore(item, host, '.bili-dyn-item__footer'); },
};
