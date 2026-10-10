import { content, makePost, mountBefore, publicPage, textOf } from './shared.js';

export const youtube = {
  id: 'youtube', name: 'YouTube',
  matches: host => host === 'www.youtube.com' || host === 'youtube.com',
  selector: 'ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-comment-view-model',
  allowedPage: publicPage,
  extract(item) {
    const comment = item.matches('ytd-comment-view-model');
    const author = item.querySelector(comment ? '#author-text' : '#channel-name a');
    const link = item.querySelector(comment ? '#published-time-text a' : 'a[href*="/watch?v="]');
    const id = link?.getAttribute('href')?.match(comment ? /[?&]lc=([\w.-]+)/ : /[?&]v=([\w-]+)/)?.[1];
    if (!comment && !id) return null;
    return makePost(this.id, `${comment ? 'comment' : 'video'}:${id || ''}`,
      content(item, comment ? ['#content-text'] : ['#video-title', '#description-text']),
      author?.getAttribute('href')?.match(/\/(?:@|channel\/)([\w.-]+)/)?.[1] || textOf(author), comment ? '评论正文' : '视频标题/简介');
  },
  mountNotice(item, host) {
    if (item.matches('ytd-comment-view-model')) mountBefore(item, host, '#action-buttons');
    else (item.querySelector('#details, #meta') || item).append(host);
  },
};
