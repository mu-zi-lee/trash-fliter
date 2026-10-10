import { content, makePost, mountBefore, publicPage } from './shared.js';

export const linuxDo = {
  id: 'linux-do', name: 'linux.do',
  matches: host => host === 'linux.do',
  selector: '.topic-post article.box, tr.topic-list-item, tr[data-topic-id], .latest-topic-list-item, .search-result-topic',
  allowedPage: publicPage,
  extract(item) {
    if (item.matches('tr.topic-list-item, tr[data-topic-id], .latest-topic-list-item, .search-result-topic')) {
      const title = item.querySelector('a.raw-topic-link, a.raw-link, a.title');
      const id = title?.dataset.topicId || item.dataset.topicId || title?.getAttribute('href')?.match(/\/t\/(?:[^/]+\/)?(\d+)/)?.[1];
      if (!id) return null;
      // List avatars may belong to the last replier, not the topic author.
      return makePost(this.id, `topic:${id}`, content(item, ['a.raw-topic-link', 'a.raw-link', 'a.title']), '', '主题标题');
    }
    const author = item.querySelector('.names .username a, .names a[data-user-card]');
    return makePost(this.id, item.id || item.closest('[data-post-id]')?.dataset.postId,
      content(item, ['.cooked']), author?.getAttribute('data-user-card') || author?.textContent || '');
  },
  mountNotice(item, host) {
    if (item.matches('tr.topic-list-item, tr[data-topic-id], .latest-topic-list-item, .search-result-topic')) {
      (item.querySelector('td.main-link, .main-link') || item.querySelector('td') || item).append(host);
    } else mountBefore(item, host, '.post-menu-area, .post-controls');
  },
  mountFold(item, host) {
    if (!item.matches('tr')) return item.append(host);
    const cell = document.createElement('td');
    cell.dataset.xqfUi = 'fold-cell';
    cell.colSpan = [...item.children].filter(child => child.tagName === 'TD').reduce((sum, child) => sum + child.colSpan, 0) || 1;
    cell.append(host);
    item.append(cell);
    return cell;
  },
};
