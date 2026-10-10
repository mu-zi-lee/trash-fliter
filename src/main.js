import { FilterEngine } from './core/engine.js';
import { createStore } from './storage/store.js';
import { ResultCache } from './storage/cache.js';
import { SettingsPanel } from './ui/panel.js';
import { installPostStyles, PostView } from './ui/post-view.js';
import { resolveSite } from './sites/index.js';
import { x } from './sites/x.js';

function start() {
  if (document.querySelector('[data-xqf-ui="panel"]')) return;
  const site = resolveSite() || (location.hostname === '127.0.0.1' ? x : null);
  if (!site) return;
  const store = createStore({
    GM_getValue: typeof GM_getValue === 'function' ? GM_getValue : undefined,
    GM_setValue: typeof GM_setValue === 'function' ? GM_setValue : undefined,
  });
  let config = store.loadSettings();
  const cache = new ResultCache(store);
  installPostStyles();
  let engine;
  const save = next => {
    store.saveSettings(next);
    config = next;
    engine.reset();
  };
  const panel = new SettingsPanel({
    siteName: site.name,
    getConfig: () => config,
    onSave: save,
    onPause: () => save({ ...config, enabled: false }),
    onRetry: () => engine.reset(),
    onClear: () => { cache.clear(); engine.reset(); },
  });
  engine = new FilterEngine({ site, getConfig: () => config, cache, view: new PostView(site), onStatus: status => panel.update(status) });
  engine.start();
  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('trash-fliter：打开设置', () => panel.open());
    GM_registerMenuCommand('trash-fliter：启用 / 暂停', () => {
      try { save({ ...config, enabled: !config.enabled }); }
      catch (error) { panel.open(); panel.message(error.message); }
    });
  }
  window.addEventListener('pagehide', () => cache.flush());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
