import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { extractPost, allowedPage, mountPostNotice } from '../src/sites/x.js';

test('quote-only posts are never analyzed as if quoted text belonged to their author', () => {
  const dom = new JSDOM('<article data-testid="tweet"><div role="link"><p data-testid="tweetText">a quoted advertisement</p></div></article>');
  assert.equal(extractPost(dom.window.document.querySelector('article')), null);
});

test('extract own author, text and status, excluding quoted text and permalink', () => {
  const dom = new JSDOM(`<article data-testid="tweet"><a href="/Alice/status/123"><time>now</time></a><p data-testid="tweetText">Hello\u200b   world</p><div data-testid="quoteTweet"><a href="/bob/status/456"><time>then</time></a><p data-testid="tweetText">quoted text</p></div></article>`);
  const article = dom.window.document.querySelector('article');
  const first = extractPost(article);
  assert.equal(first.text, 'Hello world');
  assert.equal(first.handle, 'alice');
  assert.equal(first.id, '123');
  article.querySelector('[data-testid="tweetText"]').textContent = 'new post in recycled article';
  assert.notEqual(extractPost(article).identity, first.identity);
});

test('messages, settings and auth routes are excluded; timelines and posts are allowed', () => {
  for (const path of ['/messages', '/messages/123', '/settings/privacy', '/i/flow/login', '/compose/post']) assert.equal(allowedPage(path), false);
  for (const path of ['/home', '/alice/status/123', '/search']) assert.equal(allowedPage(path), true);
});

test('notice mounts above own actions, never inside a quote or author header', () => {
  const dom = new JSDOM('<article data-testid="tweet"><header>author</header><p data-testid="tweetText">own text</p><div data-testid="quoteTweet"><div role="group"><button data-testid="reply"></button></div></div><div role="group" id="actions"><button data-testid="reply"></button></div></article>');
  const article = dom.window.document.querySelector('article');
  const notice = dom.window.document.createElement('div');
  mountPostNotice(article, notice);
  assert.equal(notice.nextElementSibling.id, 'actions');
  assert.equal(notice.parentElement, article);
});

test('notice stays in the content column when X uses nested flex layout', () => {
  const dom = new JSDOM('<article data-testid="tweet"><div class="layout"><div class="avatar"></div><div id="content"><header>author</header><p data-testid="tweetText">own text</p><div role="group" id="actions"><button data-testid="reply"></button></div></div></div></article>');
  const article = dom.window.document.querySelector('article');
  const notice = dom.window.document.createElement('div');
  mountPostNotice(article, notice);
  assert.equal(notice.parentElement.id, 'content');
  assert.equal(notice.nextElementSibling.id, 'actions');
});
