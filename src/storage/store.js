import { CONFIG_KEY, normalizeSettings } from '../config/settings.js';

export function createStore(api = globalThis) {
  return {
    read(key, fallback) {
      try { return typeof api.GM_getValue === 'function' ? api.GM_getValue(key, fallback) : fallback; }
      catch { return fallback; }
    },
    write(key, value) {
      if (typeof api.GM_setValue !== 'function') throw new Error('无法保存设置，请检查油猴权限。');
      api.GM_setValue(key, value);
    },
    loadSettings() {
      return normalizeSettings(this.read(CONFIG_KEY, this.read('xqf:config:v2', {})));
    },
    saveSettings(config) { this.write(CONFIG_KEY, config); },
  };
}
