import { signature } from '../config/settings.js';
import { localDecision, scoreDecision } from '../filter/decision.js';
import { classify } from '../providers/systemone.js';
import { x } from '../sites/x.js';
import { observePosts } from '../sites/shared.js';
import { TaskQueue } from './queue.js';
import { RequestRateLimit } from './rate-limit.js';

export class FilterEngine {
  constructor({ getConfig, cache, view, onStatus, classifyPost = classify, site = x, rateLimit = new RequestRateLimit() }) {
    Object.assign(this, { getConfig, cache, view, onStatus, classifyPost, site });
    this.rateLimit = rateLimit;
    this.records = new Map();
    this.revealed = new Set();
    this.analyzed = new Set();
    this.filtered = new Set();
    this.requests = 0;
    this.epoch = 0;
    this.error = '';
    this.queue = new TaskQueue({
      onError: error => { this.error = error.message; this.emit(); },
      onChange: () => this.emit(),
    });
    this.intersection = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const meta = this.records.get(entry.target);
        if (!meta) continue;
        meta.visible = entry.isIntersecting;
        if (entry.isIntersecting) this.consider(meta);
      }
    }, { rootMargin: '250px 0px' });
  }
  start() {
    this.stopObserver = observePosts(() => this.schedule());
    this.visibilityHandler = () => { if (!document.hidden) this.schedule(); };
    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.path = location.pathname;
    this.timer = setInterval(() => {
      if (location.pathname !== this.path) {
        this.path = location.pathname;
        this.reset();
      } else if (!document.hidden) this.schedule();
    }, 1500);
    this.schedule();
    this.emit();
  }
  enabled() { return this.getConfig().enabled && this.site.allowedPage() && !document.hidden; }
  schedule() {
    if (this.scanTimer) return;
    this.scanTimer = setTimeout(() => { this.scanTimer = null; this.scan(); }, 120);
  }
  valid(meta) {
    if (!meta.article.isConnected || this.records.get(meta.article) !== meta) return false;
    const current = this.site.extract(meta.article);
    return current?.identity === meta.post.identity && current.text === meta.post.text && current.handle === meta.post.handle;
  }
  cached(text, config) {
    return this.cache.get(signature(config), text, [...config.categories, ...(config.protectUseful ? ['useful'] : [])]);
  }
  deferRequest(delay) {
    this.waitUntil = Date.now() + delay;
    clearTimeout(this.rateTimer);
    this.rateTimer = setTimeout(() => {
      this.rateTimer = null;
      this.waitUntil = 0;
      this.schedule();
      this.emit();
    }, delay + 10);
    this.emit();
  }
  scan() {
    for (const [article] of this.records) {
      if (!article.isConnected) this.remove(article);
    }
    if (!this.getConfig().enabled || !this.site.allowedPage()) {
      this.view.clearAll();
      return this.emit();
    }
    for (const article of document.querySelectorAll(this.site.selector)) {
      const post = this.site.extract(article);
      let meta = this.records.get(article);
      if (!post) { if (meta) this.remove(article); continue; }
      if (!meta || meta.post.identity !== post.identity || meta.post.text !== post.text || meta.post.handle !== post.handle) {
        if (meta) this.remove(article);
        meta = { article, post, scores: null, decision: null, visible: false, queued: false };
        this.records.set(article, meta);
        this.intersection.observe(article);
      }
      const local = localDecision(post, this.getConfig());
      if (local) {
        if (!meta.decision || meta.decision.reason !== local.reason || meta.decision.kind !== local.kind || (local.kind !== 'allow' && !this.view.has(article))) this.paint(meta, local);
      } else {
        const cached = this.cached(post.text, this.getConfig());
        if (cached) {
          meta.scores = cached;
          this.analyzed.add(post.identity);
          if (!meta.decision || (meta.decision.kind !== 'allow' && !this.view.has(article))) this.paint(meta, scoreDecision(cached, this.getConfig()));
        } else if (meta.visible) this.consider(meta);
      }
    }
    this.emit();
  }
  consider(meta) {
    if (!this.enabled() || !this.valid(meta)) return;
    const config = this.getConfig();
    const local = localDecision(meta.post, config);
    if (local) return this.paint(meta, local);
    if (this.error || meta.queued || meta.scores || !config.categories.length || meta.post.text.length < config.minLength || !config.keys[config.provider]) return;
    const cached = this.cached(meta.post.text, config);
    if (cached) { meta.scores = cached; this.analyzed.add(meta.post.identity); return this.paint(meta, scoreDecision(cached, config)); }
    const delay = this.rateLimit.delay(config.requestRate);
    if (delay) { this.deferRequest(delay); return; }
    const epoch = this.epoch;
    const snapshot = structuredClone(config);
    const sig = signature(snapshot);
    meta.queued = true;
    const accepted = this.queue.add(meta.post.identity, async signal => {
      if (!this.enabled() || !this.valid(meta) || !meta.visible || epoch !== this.epoch) { meta.queued = false; return; }
      const delay = this.rateLimit.delay(snapshot.requestRate);
      if (delay) { meta.queued = false; this.deferRequest(delay); return; }
      this.rateLimit.record();
      this.requests++;
      // Bound cost without confusing a later text expansion with the original input.
      const scores = await this.classifyPost(meta.post.text.slice(0, 6000), snapshot, signal);
      if (signal.aborted || epoch !== this.epoch || !this.getConfig().enabled || !this.site.allowedPage()) return;
      this.cache.set(sig, meta.post.text, scores);
      if (this.valid(meta)) {
        meta.scores = scores;
        this.analyzed.add(meta.post.identity);
        this.paint(meta, scoreDecision(scores, snapshot));
      }
      this.schedule();
    });
    if (!accepted) meta.queued = false;
  }
  paint(meta, decision) {
    if (!this.valid(meta)) return;
    meta.decision = decision;
    if (decision.kind === 'filter') this.filtered.add(meta.post.identity);
    this.view.render(meta.article, { ...decision, scope: meta.post.scope }, this.getConfig().mode, this.revealed.has(meta.post.identity), event => {
      event.preventDefault();
      event.stopPropagation();
      if (this.revealed.has(meta.post.identity)) this.revealed.delete(meta.post.identity);
      else this.revealed.add(meta.post.identity);
      this.paint(meta, decision);
    });
    this.emit();
  }
  remove(article) {
    this.intersection.unobserve(article);
    this.view.clear(article);
    this.records.delete(article);
  }
  reset() {
    this.epoch++;
    this.error = '';
    clearTimeout(this.rateTimer);
    this.rateTimer = null;
    this.waitUntil = 0;
    this.queue.reset();
    this.intersection.disconnect();
    this.view.clearAll();
    this.records.clear();
    this.schedule();
    this.emit();
  }
  emit() {
    const config = this.getConfig();
    const keyMissing = config.categories.length && !config.keys[config.provider];
    const label = !config.enabled ? '内容过滤已暂停' : !this.site.allowedPage() ? '当前页面不检测' : this.error ? '检测已暂停，点击查看' : this.waitUntil > Date.now() ? `速率限制 · ${Math.ceil((this.waitUntil - Date.now()) / 1000)} 秒后继续` : keyMissing ? '本地过滤 · 配置服务' : `已过滤 ${this.filtered.size} 条`;
    this.onStatus({ analyzed: this.analyzed.size, filtered: this.filtered.size, pending: this.queue.pending, active: config.enabled && this.site.allowedPage() && !this.error, label, error: this.error });
  }
  destroy() {
    this.epoch++;
    this.queue.reset();
    clearInterval(this.timer);
    clearTimeout(this.scanTimer);
    clearTimeout(this.rateTimer);
    this.stopObserver?.();
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.intersection.disconnect();
    this.view.clearAll();
    this.records.clear();
  }
}
