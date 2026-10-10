import { CATEGORIES } from '../config/catalog.js';
import { activeCategories, categoryThreshold } from './policy.js';

export function localDecision(post, config) {
  if (config.allowedAccounts.includes(post.handle)) return { kind: 'allow', reason: '账号白名单' };
  if (config.blockedAccounts.includes(post.handle)) return { kind: 'filter', reason: '账号规则', source: 'local' };
  const keyword = config.blockedKeywords.find(word => post.text.toLowerCase().includes(word));
  return keyword ? { kind: 'filter', reason: `关键词：${keyword}`, source: 'local' } : null;
}

export function scoreDecision(scores, config, context = {}) {
  const matches = activeCategories(config, context).map(id => ({ id, title: CATEGORIES[id].title, score: scores[id] }))
    .filter(item => Number.isFinite(item.score) && item.score >= categoryThreshold(item.id, config, context))
    .sort((a, b) => b.score - a.score);
  if (!matches.length) return { kind: 'allow' };
  // A weak value signal must not veto a much stronger low-quality signal.
  const protectedPost = config.protectUseful && scores.useful >= config.usefulThreshold
    && scores.useful + 0.05 >= matches[0].score;
  return {
    kind: protectedPost ? 'protected' : 'filter',
    source: 'model',
    reason: matches.map(item => item.title).join('、'),
    score: matches[0].score,
    matches,
  };
}
