export class TaskQueue {
  constructor({ onError, onChange = () => {}, interval = 0, concurrency = 4 }) {
    this.onError = onError;
    this.onChange = onChange;
    this.interval = interval;
    this.concurrency = concurrency;
    this.active = new Map();
    this.tasks = new Map();
    this.generation = 0;
    this.blocked = false;
  }
  add(key, task) {
    if (this.blocked || this.tasks.has(key) || [...this.active.values()].some(job => job.key === key && job.generation === this.generation)) return false;
    this.tasks.set(key, task);
    this.onChange();
    this.pump();
    return true;
  }
  reset() {
    this.generation++;
    this.tasks.clear();
    this.blocked = false;
    clearTimeout(this.timer);
    this.timer = null;
    for (const job of this.active.values()) job.controller.abort();
    this.onChange();
  }
  pump() {
    if (this.blocked || this.timer) return;
    while (this.tasks.size && this.active.size < this.concurrency && !this.blocked) {
      const [key, task] = this.tasks.entries().next().value;
      this.tasks.delete(key);
      const job = { key, generation: this.generation, controller: new AbortController() };
      this.active.set(job, job);
      this.onChange();
      void this.run(job, task);
    }
  }
  async run(job, task) {
    try { await task(job.controller.signal); }
    catch (error) {
      if (job.generation === this.generation && error.name !== 'AbortError') {
        this.blocked = true;
        this.tasks.clear();
        for (const other of this.active.values()) if (other !== job) other.controller.abort();
        this.onError(error);
      }
    } finally {
      this.active.delete(job);
      this.onChange();
      if (this.interval && this.tasks.size && !this.blocked && !this.timer) {
        this.timer = setTimeout(() => { this.timer = null; this.pump(); }, this.interval);
      } else this.pump();
    }
  }
  get pending() { return this.tasks.size + this.active.size; }
}
