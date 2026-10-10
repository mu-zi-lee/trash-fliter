import { CATEGORIES, MODES, PROVIDERS, PROMPT_VERSION } from './catalog.js';

export const CONFIG_KEY = 'xqf:config:v3';
export const DEFAULTS = Object.freeze({
  enabled: false,
  provider: 'nace',
  keys: {},
  categories: ['marketing', 'empty', 'clickbait', 'engagement'],
  threshold: 0.88,
  usefulThreshold: 0.72,
  protectUseful: true,
  minLength: 45,
  mode: 'collapse',
  theme: 'auto',
  blockedKeywords: [],
  blockedAccounts: [],
  allowedAccounts: [],
  requestRate: 30,
});

const bounded = (value, fallback, min, max) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;
export function lines(value, account = false) {
  const list = Array.isArray(value) ? value : String(value ?? '').split('\n');
  return [...new Set(list.filter(v => typeof v === 'string').map(v => v.trim().toLowerCase().replace(account ? /^@/ : /^$/, '')).filter(Boolean))].slice(0, 200);
}

export function normalizeSettings(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) raw = {};
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : DEFAULTS.enabled,
    provider: Object.hasOwn(PROVIDERS, raw.provider) ? raw.provider : DEFAULTS.provider,
    keys: Object.fromEntries(Object.keys(PROVIDERS).map(id => [id, typeof raw.keys?.[id] === 'string' ? raw.keys[id].trim() : ''])),
    categories: Array.isArray(raw.categories) ? [...new Set(raw.categories.filter(id => Object.hasOwn(CATEGORIES, id)))] : [...DEFAULTS.categories],
    threshold: bounded(raw.threshold, DEFAULTS.threshold, 0.5, 0.99),
    usefulThreshold: bounded(raw.usefulThreshold, DEFAULTS.usefulThreshold, 0.5, 0.99),
    protectUseful: typeof raw.protectUseful === 'boolean' ? raw.protectUseful : true,
    minLength: Math.round(bounded(raw.minLength, 45, 1, 500)),
    mode: Object.hasOwn(MODES, raw.mode) ? raw.mode : raw.mode === 'fold' ? 'cover' : DEFAULTS.mode,
    theme: ['auto', 'light', 'dark'].includes(raw.theme) ? raw.theme : 'auto',
    blockedKeywords: lines(raw.blockedKeywords),
    blockedAccounts: lines(raw.blockedAccounts, true),
    allowedAccounts: lines(raw.allowedAccounts, true),
    requestRate: Math.round(bounded(raw.requestRate, 30, 1, 90)),
  };
}

export function signature(config, context = {}) {
  return JSON.stringify([PROMPT_VERSION, config.provider, [...config.categories].sort(), config.protectUseful,
    context.site || '', context.scope || '正文', !!context.titleOnly, !!context.truncated]);
}

export function exportSettings(config) {
  const { keys, ...publicConfig } = config;
  return { format: 'trash-fliter', version: 1, settings: publicConfig };
}

export function importSettings(text, current) {
  const data = JSON.parse(text);
  if (!['trash-fliter', 'x-quality-filter'].includes(data?.format) || data.version !== 1 || !data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)) {
    throw new Error('请选择本插件导出的设置文件。');
  }
  return normalizeSettings({ ...current, ...data.settings, enabled: false, keys: current.keys });
}
