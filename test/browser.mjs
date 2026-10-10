import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { SITE_FIXTURES } from './site-fixtures.js';

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4174', '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
server.stdout.on('data', data => { output += data; });
server.stderr.on('data', data => { output += data; });
let browser;
const origin = 'http://127.0.0.1:4174';
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(output);
    try { if ((await fetch(origin)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
    if (attempt === 99) throw new Error(`Preview server did not start: ${output}`);
  }
  await mkdir('test-results', { recursive: true });
  const bundle = await readFile('dist/trash-fliter.user.js', 'utf8');
  browser = await chromium.launch({ headless: true });
  const errors = [];
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
    const page = await browser.newPage({ viewport });
    page.on('pageerror', error => errors.push(error.message));
    // Exercise the exact installable bundle with the demo GM adapter.
    await page.route('**/src/main.js', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
    await page.goto(origin);
    await page.waitForFunction(() => typeof GM_xmlhttpRequest === 'function');
    await page.evaluate(bundle);
    const spam = page.locator('article').filter({ has: page.locator('a[href="/growthclub/status/10002"]') });
    await expect(spam).toHaveAttribute('data-xqf-state', 'collapse');
    await expect(spam.locator('[data-testid="tweetText"]')).toBeHidden();
    const foldedHeight = await spam.evaluate(el => el.getBoundingClientRect().height);
    assert.ok(foldedHeight < 110, `Not compact: ${foldedHeight}`);
    await spam.getByRole('button', { name: '展开原帖' }).click();
    await expect(spam.locator('[data-testid="tweetText"]')).toBeVisible();
    await page.screenshot({ path: `test-results/expanded-${viewport.width}.png`, fullPage: true });
    await spam.getByRole('button', { name: '重新折叠' }).click();
    await expect(spam.locator('[data-testid="tweetText"]')).toBeHidden();

    await spam.locator('[data-testid="tweetText"]').evaluate(el => { el.textContent = '今天写了一份清晰的书签整理记录：先把重复网址合并，再逐项检查标题，最后按主题整理。实测三百条书签可以删掉四十多个重复项。'; });
    await expect(spam).not.toHaveAttribute('data-xqf-state', 'collapse');
    await expect(spam.locator('[data-testid="tweetText"]')).toBeVisible();

    const useful = page.locator('article').filter({ has: page.locator('a[href="/friendlyad/status/10006"]') });
    await useful.scrollIntoViewIfNeeded();
    await expect(useful).toHaveAttribute('data-xqf-state', 'mark');
    await expect(useful.getByText('有价值保护', { exact: true })).toBeVisible();
    const placement = await useful.evaluate(article => {
      const notice = article.querySelector('[data-xqf-ui="post"]');
      const text = article.querySelector('[data-testid="tweetText"]').getBoundingClientRect();
      const actions = article.querySelector('.post-actions').getBoundingClientRect();
      const box = notice.getBoundingClientRect();
      return { belowText: box.top >= text.bottom, aboveActions: box.bottom <= actions.top, normalFlow: getComputedStyle(notice).position !== 'absolute' };
    });
    assert.deepEqual(placement, { belowText: true, aboveActions: true, normalFlow: true });
    await page.screenshot({ path: `test-results/timeline-${viewport.width}.png`, fullPage: true });
    await page.addStyleTag({ content: 'body{background:#000;color:#eee}aside,main,article,.timeline-header{border-color:#2f3336}.handle,.rail p,.post-actions{color:#71767b}.avatar{background:#202020;color:#ddd}.timeline-header button{background:#000;color:#eee;border-color:#2f3336}' });
    await page.screenshot({ path: `test-results/timeline-${viewport.width}-dark.png`, fullPage: true });
    await page.evaluate(() => document.getElementById('add-post').click());
    const added = page.locator('article').filter({ has: page.locator('a[href="/growthclub/status/20000"]') });
    await added.scrollIntoViewIfNeeded();
    await expect(added).toHaveAttribute('data-xqf-state', 'collapse');
    await page.getByRole('button', { name: '打开内容过滤设置' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.screenshot({ path: `test-results/panel-${viewport.width}-light.png` });
    await page.getByRole('tab', { name: '服务', exact: true }).click();
    await expect(page.getByRole('link', { name: '注册 Nace' })).toHaveAttribute('href', 'https://console.nace.ai/invite/7ccrty4b');
    await expect(page.getByRole('dialog')).not.toContainText('邀请');
    await expect(page.getByRole('dialog')).not.toContainText('7ccrty4b');
    await page.locator('#key').fill('new-nace-key');
    await page.locator('#provider').selectOption('codiv');
    await page.locator('#key').fill('new-codiv-key');
    await page.locator('#provider').selectOption('nace');
    await expect(page.locator('#key')).toHaveValue('new-nace-key');
    await page.getByLabel('深色', { exact: true }).check();
    await page.screenshot({ path: `test-results/service-${viewport.width}-dark.png` });
    const overflow = await page.getByRole('dialog').evaluate(dialog => {
      const root = dialog.getRootNode();
      const scroll = root.querySelector('.scroll');
      return { page: document.documentElement.scrollWidth > innerWidth, dialog: dialog.scrollWidth > dialog.clientWidth + 1, content: scroll.scrollWidth > scroll.clientWidth + 1 };
    });
    assert.deepEqual(overflow, { page: false, dialog: false, content: false });

    await page.getByRole('tab', { name: '规则', exact: true }).click();
    await page.locator('#blockedAccounts').fill('@slowbuild');
    await page.getByRole('button', { name: '保存设置' }).click();
    const local = page.locator('article').filter({ has: page.locator('a[href="/slowbuild/status/10003"]') });
    await expect(local).toHaveAttribute('data-xqf-state', 'collapse');
    await page.getByRole('button', { name: '停用并恢复帖子' }).click();
    await expect(page.locator('article[data-xqf-state]')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('button', { name: '打开内容过滤设置' })).toBeFocused();
    await page.close();
    console.log(`PASS installable userscript: ${viewport.width}x${viewport.height}, fold/reveal/recycle/protection/settings/pause`);
  }
  assert.deepEqual(errors, [], `Browser errors: ${errors.join(', ')}`);
  for (const fixture of SITE_FIXTURES) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.route(`https://${fixture.host}/**`, route => route.fulfill({
      contentType: 'text/html',
      headers: { 'Content-Security-Policy': "require-trusted-types-for 'script'" },
      body: `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#000;color:white;font:14px sans-serif}body>main{max-width:600px}main>*{display:block;border-bottom:1px solid #333;padding:16px}a{color:inherit}ytd-video-renderer{display:block}</style></head><body><main>${fixture.html}</main></body></html>`,
    }));
    await page.goto(`https://${fixture.host}${fixture.path}`);
    await page.evaluate(() => {
      let config = { enabled: true, categories: [], blockedKeywords: ['加群领取'], keys: {} };
      globalThis.GM_getValue = (key, fallback) => key === 'xqf:config:v3' ? config : fallback;
      globalThis.GM_setValue = (key, value) => { if (key === 'xqf:config:v3') config = value; };
      globalThis.GM_registerMenuCommand = () => {};
      globalThis.GM_xmlhttpRequest = () => { throw new Error('Local rules must not call API'); };
    });
    await page.evaluate(bundle);
    const item = page.locator('[data-xqf-state="collapse"]');
    await expect(item).toHaveCount(1);
    if (fixture.id === 'xiaohongshu') {
      const layout = await item.evaluate(el => {
        const box = el.getBoundingClientRect();
        const host = el.querySelector('[data-xqf-ui="post"]').getBoundingClientRect();
        return { position: getComputedStyle(el).position, height: box.height, aligned: Math.abs(box.top - host.top) <= 1 && Math.abs(box.bottom - host.bottom) <= 1 };
      });
      assert.deepEqual(layout, { position: 'absolute', height: 353, aligned: true });
      await page.screenshot({ path: 'test-results/xiaohongshu-folded.png', fullPage: true });
    }
    if (fixture.id === 'linux-do-list') {
      await expect(item.locator('td[data-xqf-ui="fold-cell"]')).toHaveAttribute('colspan', '2');
      assert.equal(await item.evaluate(el => getComputedStyle(el).display), 'table-row');
    }
    await page.getByRole('button', { name: '展开原帖' }).click();
    await expect(page.locator('[data-xqf-state="mark"]')).toHaveCount(1);
    await page.screenshot({ path: `test-results/site-${fixture.id}.png`, fullPage: true });
    await page.getByRole('button', { name: '重新折叠' }).click();
    await expect(item).toHaveCount(1);
    await page.getByRole('button', { name: '打开内容过滤设置' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: '停用并恢复帖子' }).click();
    await expect(page.locator('[data-xqf-state]')).toHaveCount(0);
    await expect(page.locator('[data-xqf-ui="fold-cell"]')).toHaveCount(0);
    await page.close();
    console.log(`PASS ${fixture.id}: adapter, fold, reveal, restore, Trusted Types`);
  }
  assert.deepEqual(errors, [], `Browser errors: ${errors.join(', ')}`);
} finally {
  await browser?.close();
  server.kill('SIGTERM');
  if (server.exitCode === null) await new Promise(resolve => server.once('exit', resolve));
}
