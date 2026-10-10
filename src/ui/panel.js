import css from './panel.css';
import { CATEGORIES, MODES, PROVIDERS } from '../config/catalog.js';
import { exportSettings, importSettings, normalizeSettings } from '../config/settings.js';
import { testConnection } from '../providers/systemone.js';
import { icon, iconButton } from './icons.js';
import { setTemplate } from './dom.js';
import panelTemplate from './panel-template.js';

export class SettingsPanel {
  constructor({ getConfig, onSave, onPause, onRetry, onClear, siteName = 'X' }) {
    Object.assign(this, { getConfig, onSave, onPause, onRetry, onClear });
    this.host = document.createElement('div');
    this.host.dataset.xqfUi = 'panel';
    this.host.dataset.theme = getConfig().theme;
    this.root = this.host.attachShadow({ mode: 'open' });
    setTemplate(this.root, panelTemplate);
    const style = document.createElement('style');
    style.textContent = css;
    this.root.prepend(style);
    document.documentElement.append(this.host);
    this.root.querySelector('.subtitle').textContent = `${siteName} 内容质量过滤`;
    this.dialog = this.root.querySelector('dialog');
    this.$('launch').prepend(icon('settings'));
    this.root.querySelector('.brand-icon').append(icon('settings', 20));
    this.closeButton = iconButton('close', '关闭设置');
    this.$('close-slot').append(this.closeButton);
    this.keyButton = iconButton('eye', '显示密钥');
    this.$('key-toggle').append(this.keyButton);
    for (const [id, category] of Object.entries(CATEGORIES)) {
      const label = document.createElement('label');
      label.className = 'category';
      setTemplate(label, [
        { tag: 'input', attributes: { type: 'checkbox', 'data-category': id }, children: [] },
        { tag: 'span', attributes: {}, children: [
          { tag: 'b', attributes: {}, children: [category.title] },
          { tag: 'span', attributes: { class: 'hint', style: 'display:block' }, children: [category.description] },
        ] },
      ]);
      this.$('categories').append(label);
    }
    for (const [id, provider] of Object.entries(PROVIDERS)) this.$('provider').add(new Option(provider.name, id));
    this.makeSegments('modes', 'mode', MODES);
    this.makeSegments('themes', 'theme', { auto: '跟随系统', light: '浅色', dark: '深色' });
    const tools = [
      ['pause', '停用并恢复帖子', () => { this.onPause(); this.$('enabled').checked = false; this.message('已停用，帖子已恢复。'); }],
      ['download', '导出设置（不含密钥）', () => this.download()],
      ['upload', '导入设置', () => this.$('import-file').click()],
    ];
    for (const [name, label, callback] of tools) {
      const button = iconButton(name, label);
      button.addEventListener('click', () => this.guard(callback));
      this.$('footer-tools').append(button);
    }
    this.$('test').prepend(icon('check', 14));
    this.$('clear').prepend(icon('trash', 14));
    this.$('retry').prepend(icon('retry', 14));
    this.$('launch').addEventListener('click', () => this.open());
    this.closeButton.addEventListener('click', () => this.dialog.close());
    this.dialog.addEventListener('click', event => {
      if (event.target === this.dialog) {
        const rect = this.dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) this.dialog.close();
      }
    });
    this.dialog.addEventListener('close', () => {
      this.testController?.abort();
      this.$('key').type = 'password';
      this.host.dataset.theme = this.getConfig().theme;
    });
    this.root.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      this.guard(() => {
        const next = this.readDraft();
        this.onSave(next);
        this.message('设置已保存并应用。');
      });
    });
    this.$('provider').addEventListener('change', () => {
      this.testController?.abort();
      this.draft.keys[this.currentProvider] = this.$('key').value.trim();
      this.currentProvider = this.$('provider').value;
      this.$('key').value = this.draft.keys[this.currentProvider] || '';
      this.$('key').type = 'password';
      this.updateKeyIcon();
      this.providerView();
      this.message('');
    });
    this.keyButton.addEventListener('click', () => {
      this.$('key').type = this.$('key').type === 'password' ? 'text' : 'password';
      this.updateKeyIcon();
    });
    this.$('threshold').addEventListener('input', () => { this.$('threshold-output').value = `${this.$('threshold').value}%`; });
    this.$('modes').addEventListener('change', () => this.modeHint());
    this.$('themes').addEventListener('change', () => { this.host.dataset.theme = this.root.querySelector('[name="theme"]:checked').value; });
    this.$('clear').addEventListener('click', () => this.guard(() => { this.onClear(); this.message('缓存已清空。'); }));
    this.$('retry').addEventListener('click', () => { this.onRetry(); this.message('已重试，仍遵循每分钟请求上限。'); });
    this.$('test').addEventListener('click', () => void this.test());
    this.$('import-file').addEventListener('change', () => void this.importFile());
    const tabs = [...this.root.querySelectorAll('[role="tab"]')];
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => this.selectTab(tab.dataset.tab));
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        this.selectTab(tabs[next].dataset.tab);
        tabs[next].focus();
      });
    });
  }
  $(id) { return this.root.getElementById(id); }
  guard(callback) { try { callback(); } catch (error) { this.message(error.message); } }
  message(text) { this.$('message').textContent = text; }
  makeSegments(id, name, options) {
    for (const [value, label] of Object.entries(options)) {
      const el = document.createElement('label');
      el.className = 'segment';
      setTemplate(el, [
        { tag: 'input', attributes: { type: 'radio', name, value }, children: [] },
        { tag: 'span', attributes: {}, children: [label] },
      ]);
      this.$(id).append(el);
    }
  }
  selectTab(id) {
    for (const tab of this.root.querySelectorAll('[role="tab"]')) {
      const active = tab.dataset.tab === id;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      this.$(`view-${tab.dataset.tab}`).hidden = !active;
    }
  }
  open() {
    this.draft = structuredClone(this.getConfig());
    this.populate();
    this.message(this.status?.error || '');
    if (!this.dialog.open) this.dialog.showModal();
  }
  populate() {
    const config = this.draft;
    for (const id of ['enabled', 'protectUseful']) this.$(id).checked = config[id];
    for (const id of ['provider', 'minLength', 'requestRate']) this.$(id).value = config[id];
    this.$('threshold').value = Math.round(config.threshold * 100);
    this.$('threshold-output').value = `${Math.round(config.threshold * 100)}%`;
    for (const input of this.root.querySelectorAll('[data-category]')) input.checked = config.categories.includes(input.dataset.category);
    for (const name of ['mode', 'theme']) this.root.querySelector(`[name="${name}"][value="${config[name]}"]`).checked = true;
    for (const id of ['blockedKeywords', 'blockedAccounts', 'allowedAccounts']) this.$(id).value = config[id].join('\n');
    this.currentProvider = config.provider;
    this.$('key').value = config.keys[config.provider] || '';
    this.$('key').type = 'password';
    this.updateKeyIcon();
    this.host.dataset.theme = config.theme;
    this.modeHint();
    this.providerView();
  }
  updateKeyIcon() {
    const shown = this.$('key').type === 'text';
    this.keyButton.replaceChildren(icon(shown ? 'eyeOff' : 'eye'));
    this.keyButton.title = shown ? '隐藏密钥' : '显示密钥';
    this.keyButton.setAttribute('aria-label', this.keyButton.title);
  }
  providerView() {
    const provider = PROVIDERS[this.currentProvider];
    this.$('model').textContent = provider.model;
    this.$('register').hidden = !provider.register;
    if (provider.register) this.$('register').href = provider.register;
    else this.$('register').removeAttribute('href');
    this.$('register').replaceChildren(document.createTextNode(provider.linkLabel || `注册 ${provider.name}`), icon('external', 12));
  }
  modeHint() {
    const mode = this.root.querySelector('[name="mode"]:checked')?.value;
    this.$('mode-hint').textContent = { collapse: '收起为紧凑提示，可随时展开。', cover: '遮盖内容，保留原帖高度。', dim: '降低内容透明度，保留阅读。', mark: '保留原帖，仅显示过滤原因。' }[mode];
  }
  readDraft() {
    for (const [id, label, min, max, tab] of [['minLength', '最短检测长度', 1, 500, 'filter'], ['requestRate', '每分钟请求上限', 1, 90, 'service']]) {
      const value = Number(this.$(id).value);
      if (!Number.isInteger(value) || value < min || value > max) {
        this.selectTab(tab);
        this.$(id).focus();
        throw new Error(`${label}请输入 ${min} 至 ${max} 的整数。`);
      }
    }
    const next = { ...this.draft, keys: { ...this.draft.keys, [this.currentProvider]: this.$('key').value.trim() } };
    for (const id of ['enabled', 'protectUseful']) next[id] = this.$(id).checked;
    for (const id of ['provider', 'minLength', 'requestRate', 'blockedKeywords', 'blockedAccounts', 'allowedAccounts']) next[id] = this.$(id).value;
    for (const name of ['mode', 'theme']) next[name] = this.root.querySelector(`[name="${name}"]:checked`).value;
    next.threshold = Number(this.$('threshold').value) / 100;
    next.categories = [...this.root.querySelectorAll('[data-category]:checked')].map(input => input.dataset.category);
    return normalizeSettings(next);
  }
  update(status) {
    this.status = status;
    for (const id of ['analyzed', 'filtered', 'pending']) this.$(id).textContent = status[id];
    this.root.querySelector('.status-text').textContent = status.label;
    this.$('launch').title = status.error || '打开内容过滤设置';
    this.root.querySelector('.dot').classList.toggle('active', status.active);
    if (!this.dialog.open) this.host.dataset.theme = this.getConfig().theme;
    if (status.error) this.message(status.error);
  }
  async test() {
    let config;
    try { config = this.readDraft(); }
    catch (error) { return this.message(error.message); }
    if (!config.keys[config.provider]) return this.message('请先填写 API Key。');
    this.testController?.abort();
    const controller = new AbortController();
    this.testController = controller;
    this.$('test').disabled = true;
    this.message('正在测试连接，会消耗少量服务额度…');
    try {
      await testConnection(config, controller.signal);
      if (!controller.signal.aborted) this.message('连接成功。');
    } catch (error) { if (error.name !== 'AbortError') this.message(error.message); }
    finally { if (this.testController === controller) this.$('test').disabled = false; }
  }
  download() {
    const blob = new Blob([JSON.stringify(exportSettings(this.readDraft()), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'trash-fliter-settings.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.message('已导出设置，文件不包含密钥。');
  }
  async importFile() {
    const file = this.$('import-file').files[0];
    if (!file) return;
    try {
      if (file.size > 100_000) throw new Error('设置文件过大。');
      this.draft = importSettings(await file.text(), this.readDraft());
      this.populate();
      this.message('已载入设置，检查后点击保存；导入默认停用过滤。');
    } catch (error) { this.message(error.message); }
    finally { this.$('import-file').value = ''; }
  }
}
