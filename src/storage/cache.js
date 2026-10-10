const CACHE_KEY = 'xqf:results:v3';
const TTL = 7 * 24 * 60 * 60 * 1000;
const CAPACITY = 500;

// Keep the exact input beside the hash so a collision can never reuse another post's score.
export function hash(text) {
  let n = 2166136261;
  for (let i = 0; i < text.length; i++) n = Math.imul(n ^ text.charCodeAt(i), 16777619);
  return (n >>> 0).toString(36);
}

export class ResultCache {
  constructor(store, now = Date.now) {
    this.store = store;
    this.now = now;
    this.items = new Map();
    const raw = store.read(CACHE_KEY, []);
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (item && typeof item.input === 'string' && Number.isFinite(item.at) && item.scores && typeof item.scores === 'object' && !Array.isArray(item.scores) && Object.values(item.scores).every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1) && this.now() - item.at < TTL) {
          this.items.set(hash(item.input), item);
        }
      }
    }
    this.prune();
  }
  input(signature, text) { return JSON.stringify([signature, text]); }
  get(signature, text, requiredIds = []) {
    const input = this.input(signature, text);
    const item = this.items.get(hash(input));
    return item?.input === input && this.now() - item.at < TTL && requiredIds.every(id => typeof item.scores[id] === 'number' && Number.isFinite(item.scores[id]) && item.scores[id] >= 0 && item.scores[id] <= 1) ? item.scores : null;
  }
  set(signature, text, scores) {
    const input = this.input(signature, text);
    this.items.set(hash(input), { input, scores, at: this.now() });
    this.prune();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 500);
  }
  prune() {
    const valid = [...this.items.entries()].filter(([, item]) => this.now() - item.at < TTL).sort((a, b) => b[1].at - a[1].at).slice(0, CAPACITY);
    this.items = new Map(valid);
  }
  flush() {
    clearTimeout(this.timer);
    this.prune();
    try { this.store.write(CACHE_KEY, [...this.items.values()]); } catch { /* Cache is optional. */ }
  }
  clear() { this.items.clear(); this.flush(); }
}
