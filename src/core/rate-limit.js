export class RequestRateLimit {
  constructor({ windowMs = 60_000, now = Date.now } = {}) {
    this.windowMs = windowMs;
    this.now = now;
    this.times = [];
  }
  delay(limit) {
    const now = this.now();
    this.times = this.times.filter(time => now - time < this.windowMs);
    return this.times.length < limit ? 0 : Math.max(1, this.times[this.times.length - limit] + this.windowMs - now);
  }
  record() { this.times.push(this.now()); }
}
