import { CATEGORIES, PROVIDERS, USEFUL_QUESTION } from '../config/catalog.js';

export function buildPayload(text, config) {
  const questions = Object.fromEntries(config.categories.map(id => {
    const category = CATEGORIES[id];
    return [id, { type: 'noul', instructions: category.question, criteria: { true: category.yes, false: category.no } }];
  }));
  if (config.protectUseful) questions.useful = USEFUL_QUESTION;
  return { model: PROVIDERS[config.provider].model, state: text, questions };
}

export function parseScores(data, ids) {
  if (!data?.answers || typeof data.answers !== 'object') throw new Error('服务未返回有效的 answers。');
  return Object.fromEntries(ids.map(id => {
    const score = data.answers[id]?.noul;
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 1) throw new Error(`服务返回的 ${id} 评分无效。`);
    return [id, score];
  }));
}

export class ServiceError extends Error {
  constructor(message, status = 0) { super(message); this.status = status; }
}

export function requestJSON(provider, key, payload, { signal, transport = typeof GM_xmlhttpRequest === 'function' ? GM_xmlhttpRequest : undefined } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    if (typeof transport !== 'function') return reject(new ServiceError('未找到油猴请求权限。'));
    let request;
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abort);
      fn(value);
    };
    const abort = () => {
      finish(reject, new DOMException('Aborted', 'AbortError'));
      request?.abort();
    };
    signal?.addEventListener('abort', abort, { once: true });
    try {
      request = transport({
        method: 'POST', url: PROVIDERS[provider].endpoint, timeout: 25000,
        anonymous: true,
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        data: JSON.stringify(payload),
        onload(response) {
          if (response.status < 200 || response.status >= 300) {
            const hints = { 401: '密钥无效，请检查 API Key。', 403: '服务拒绝访问，请检查密钥权限。', 402: '服务额度不足。', 429: '请求过于频繁，请稍后重试。' };
            return finish(reject, new ServiceError(hints[response.status] || `服务暂不可用（HTTP ${response.status}）。`, response.status));
          }
          try { finish(resolve, JSON.parse(response.responseText)); }
          catch { finish(reject, new ServiceError('服务返回了非 JSON 数据。')); }
        },
        onerror: () => finish(reject, new ServiceError('网络请求失败，请检查网络或油猴跨域权限。')),
        ontimeout: () => finish(reject, new ServiceError('请求超时，请稍后重试。')),
        onabort: () => finish(reject, new DOMException('Aborted', 'AbortError')),
      });
      if (signal?.aborted) abort();
    } catch (error) { finish(reject, error); }
  });
}

export async function classify(text, config, signal) {
  const payload = buildPayload(text, config);
  const data = await requestJSON(config.provider, config.keys[config.provider], payload, { signal });
  return parseScores(data, Object.keys(payload.questions));
}

export async function testConnection(config, signal) {
  const payload = { model: PROVIDERS[config.provider].model, state: 'This is an API connection test.', questions: { is_test: { type: 'noul', instructions: 'Is this an API connection test?' } } };
  return parseScores(await requestJSON(config.provider, config.keys[config.provider], payload, { signal }), ['is_test']);
}
