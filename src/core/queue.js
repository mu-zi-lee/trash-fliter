export class TaskQueue {
  constructor({ onError, onChange = () => {}, interval = 650 }) {
    this.onError = onError;
    this.onChange = onChange;
    this.interval = interval;
    this.tasks = new Map();
    this.generation = 0;
    this.blocked = false;
    this.running = false;
  }
  add(key, task) {
    if (this.blocked || this.tasks.has(key) || (this.currentKey === key && this.currentGeneration === this.generation)) return false;
    this.tasks.set(key, task);
    this.onChange();
    void this.pump();
    return true;
  }
  reset() {
    this.generation++;
    this.tasks.clear();
    this.blocked = false;
    this.controller?.abort();
    this.wake?.();
    this.onChange();
  }
  async pump() {
    if (this.running || this.blocked) return;
    this.running = true;
    try {
      while (this.tasks.size && !this.blocked) {
        const [key, task] = this.tasks.entries().next().value;
        this.tasks.delete(key);
        const generation = this.generation;
        this.currentKey = key;
        this.currentGeneration = generation;
        this.controller = new AbortController();
        this.onChange();
        try { await task(this.controller.signal); }
        catch (error) {
          if (generation === this.generation && error.name !== 'AbortError') {
            this.blocked = true;
            this.tasks.clear();
            this.onError(error);
          }
        }
        finally { this.currentKey = null; this.controller = null; this.onChange(); }
        if (this.tasks.size && !this.blocked && generation === this.generation) {
          await new Promise(resolve => {
            const timer = setTimeout(() => { this.wake = null; resolve(); }, this.interval);
            this.wake = () => { clearTimeout(timer); this.wake = null; resolve(); };
          });
        }
      }
    } finally { this.running = false; this.onChange(); }
  }
  get pending() { return this.tasks.size + (this.currentKey ? 1 : 0); }
}
