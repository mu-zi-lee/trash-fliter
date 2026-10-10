import { x } from './x.js';
import { linuxDo } from './linux-do.js';
import { xiaohongshu } from './xiaohongshu.js';
import { bilibili } from './bilibili.js';
import { douyin } from './douyin.js';
import { youtube } from './youtube.js';

export const SITES = [x, linuxDo, xiaohongshu, bilibili, douyin, youtube];
export function resolveSite(host = location.hostname) {
  return SITES.find(site => site.matches(host)) || null;
}
