import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { SITES, resolveSite } from '../src/sites/index.js';
import { textOf } from '../src/sites/shared.js';
import { SITE_FIXTURES } from './site-fixtures.js';

for (const fixture of SITE_FIXTURES) {
  test(`${fixture.id}: isolated adapter extracts content, account and stable identity`, () => {
    const dom = new JSDOM(fixture.html);
    const site = resolveSite(fixture.host);
    assert.equal(site.id, fixture.id === 'linux-do-list' ? 'linux-do' : fixture.id);
    const item = dom.window.document.querySelector(site.selector);
    const post = site.extract(item);
    assert.equal(post.text, fixture.text);
    assert.equal(post.handle, fixture.handle);
    const notice = dom.window.document.createElement('div');
    notice.dataset.xqfUi = 'post';
    notice.textContent = 'filter status must not enter classification';
    site.mountNotice(item, notice);
    assert.deepEqual(site.extract(item), post);
    assert.ok(item.contains(notice));
    notice.remove();
    const source = [...item.querySelectorAll('*')].find(el => el.textContent === fixture.text && !el.children.length);
    source.textContent = 'changed content';
    assert.notEqual(site.extract(item)?.identity, post.identity);
  });
}

test('host registry does not activate on lookalike or unsupported domains', () => {
  assert.equal(SITES.length, 6);
  for (const host of ['linux.do.evil.test', 'youtube.com.evil.test', 'example.com']) assert.equal(resolveSite(host), null);
});

test('linux.do raw title links are detected without reply counters', () => {
  const dom = new JSDOM('<table><tr class="topic-list-item"><td class="main-link"><a class="title raw-link raw-topic-link" data-topic-id="3006873" href="/t/topic/3006873"><span dir="auto">感觉GPT又开始让订阅全体降智了</span></a></td><td>123 replies</td></tr></table>');
  const site = resolveSite('linux.do');
  const item = dom.window.document.querySelector(site.selector);
  const post = site.extract(item);
  assert.equal(post.id, 'topic:3006873');
  assert.equal(post.text, '感觉GPT又开始让订阅全体降智了');
  assert.equal(post.scope, '主题标题');
});

test('xiaohongshu search cards support div containers and alternate titles', () => {
  const dom = new JSDOM('<div class="note-item"><a href="/search_result/note456"><span class="note-title">一条搜索笔记</span></a></div>');
  const site = resolveSite('www.xiaohongshu.com');
  const item = dom.window.document.querySelector(site.selector);
  assert.equal(site.extract(item).id, 'note456');
  assert.equal(site.extract(item).text, '一条搜索笔记');
  assert.equal(site.foldLayout(item), 'waterfall');
});

test('text excludes quoted text, scripts and plugin notices', () => {
  const dom = new JSDOM('<p>Own text<blockquote>quoted</blockquote><span data-xqf-ui>notice</span><script>script</script></p>');
  assert.equal(textOf(dom.window.document.querySelector('p')), 'Own text');
});

test('YouTube replies have independent identities and text', () => {
  const dom = new JSDOM('<ytd-comment-view-model><span id="content-text">a useful reply</span><a id="author-text" href="/@bob">Bob</a><span id="published-time-text"><a href="/watch?v=abc&lc=comment123">now</a></span></ytd-comment-view-model>');
  const post = resolveSite('www.youtube.com').extract(dom.window.document.querySelector('ytd-comment-view-model'));
  assert.equal(post.id, 'comment:comment123');
  assert.equal(post.text, 'a useful reply');
  assert.equal(post.handle, 'bob');
  assert.equal(post.scope, '评论正文');
});

test('linux.do quotes are excluded and full-screen Douyin players are never folded', () => {
  const forum = new JSDOM('<article class="box"><div class="cooked">Reply<blockquote>quoted spam</blockquote></div></article>');
  assert.equal(resolveSite('linux.do').extract(forum.window.document.querySelector('article')).text, 'Reply');
  const video = new JSDOM('<div data-e2e="feed-active-video"><div data-e2e="video-card"><a href="/video/123" title="spam"></a></div></div>');
  assert.equal(resolveSite('www.douyin.com').extract(video.window.document.querySelector('[data-e2e="video-card"]')), null);
});
