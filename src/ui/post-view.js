import postCSS from './post.css';
import { icon } from './icons.js';
import { x } from '../sites/x.js';

const style = `
  :host{display:block;font:12px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif;color:inherit;letter-spacing:0}
  *{box-sizing:border-box}
  .row{display:flex;align-items:center;gap:12px;padding:14px 16px;min-height:72px;width:100%;color:inherit}
  .symbol{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:6px;background:#8881;flex:none;opacity:.7}
  .copy{flex:1;min-width:0}.heading{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .title{font-weight:550;font-size:13px;overflow-wrap:anywhere}
  .score{font-size:11px;opacity:.55;font-variant-numeric:tabular-nums}
  .detail{opacity:.6;font-size:11px;margin-top:3px;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  button{display:flex;align-items:center;justify-content:center;gap:5px;flex:none;min-height:32px;font:inherit;color:inherit;background:transparent;border:1px solid #8885;border-radius:5px;padding:5px 9px;cursor:pointer;white-space:nowrap}
  button:hover{background:#8882;border-color:#8889}button:focus-visible{outline:2px solid currentColor;outline-offset:3px}
  .notice{display:flex;align-items:center;gap:8px;margin-top:12px;padding:8px 0;border-top:1px solid #8883;min-height:34px}
  .notice>.copy{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .notice .title{font-size:11px;font-weight:400;opacity:.65}
  .notice>svg{opacity:.5}.notice button{border:0;min-height:28px;padding:4px 6px;font-size:11px}
  :host([data-layout="waterfall"]){box-sizing:border-box;border:1px solid #8883;border-radius:8px;background:var(--xqf-background)}
  :host([data-layout="waterfall"]) .row{height:100%;padding:18px;flex-direction:column;justify-content:center;align-items:flex-start;gap:12px}
  :host([data-layout="waterfall"]) .copy{flex:0;width:100%}
  :host([data-layout="waterfall"]) .symbol{width:34px;height:34px}
  :host([data-layout="waterfall"]) button{margin-top:2px;min-height:36px}
  button:active{transform:scale(.97)}
  svg{flex-shrink:0}
  @media(max-width:420px){.row{padding:12px;gap:9px}.title{font-size:12px}.symbol{width:26px;height:26px}.row button{padding:5px 7px}.notice{gap:6px}}
`;

export function installPostStyles() {
  const sheet = document.createElement('style');
  sheet.dataset.xqfUi = 'style';
  sheet.textContent = postCSS;
  document.head.append(sheet);
  return () => sheet.remove();
}

function background(article) {
  for (let el = article; el; el = el.parentElement) {
    const color = getComputedStyle(el).backgroundColor;
    if (color && color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)') return color;
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? '#000' : '#fff';
}

export class PostView {
  constructor(site = x) { this.hosts = new Map(); this.site = site; }
  clear(article) {
    article.removeAttribute('data-xqf-state');
    article.removeAttribute('data-xqf-layout');
    article.removeAttribute('data-xqf-position-static');
    this.hosts.get(article)?.remove();
    this.hosts.delete(article);
  }
  clearAll() { for (const article of [...this.hosts.keys()]) this.clear(article); }
  render(article, decision, mode, revealed, onToggle) {
    this.clear(article);
    if (decision.kind === 'allow') return;
    const hiding = decision.kind === 'filter' && !revealed && ['collapse', 'cover'].includes(mode);
    const state = decision.kind === 'filter' && !revealed ? mode : 'mark';
    const layout = hiding && mode === 'collapse' ? this.site.foldLayout?.(article) : null;
    if (hiding && (layout || mode === 'cover') && getComputedStyle(article).position === 'static') article.dataset.xqfPositionStatic = '';
    article.dataset.xqfState = state;
    if (layout) article.dataset.xqfLayout = layout;
    const host = document.createElement('div');
    host.dataset.xqfUi = 'post';
    const bg = background(article);
    host.style.cssText = layout === 'waterfall' ? `position:absolute!important;inset:0!important;z-index:10!important;--xqf-background:${bg}` : hiding && mode === 'collapse' ? 'display:block!important;width:100%!important' : hiding
      ? `position:absolute!important;inset:0!important;z-index:10!important;background:${bg}!important`
      : 'display:block!important;position:relative!important;width:100%!important;min-width:0!important;align-self:stretch!important';
    const root = host.attachShadow({ mode: 'open' });
    if (layout) host.dataset.layout = layout;
    const sheet = document.createElement('style');
    sheet.textContent = style;
    root.append(sheet);
    const row = document.createElement('div');
    row.className = hiding ? 'row' : 'notice';
    row.style.setProperty('--bg', bg);
    const symbol = icon(decision.kind === 'protected' ? 'shield' : hiding ? 'eyeOff' : 'eye', 15);
    if (hiding) {
      const wrap = document.createElement('span');
      wrap.className = 'symbol';
      wrap.append(symbol);
      row.append(wrap);
    } else row.append(symbol);
    const copy = document.createElement('div');
    copy.className = 'copy';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = hiding ? (this.site.id === 'xiaohongshu' ? '已过滤此笔记' : '已过滤此帖') : decision.kind === 'protected' ? '有价值保护' : revealed ? '已展开原帖' : '内容过滤';
    title.title = decision.reason;
    const heading = document.createElement('div');
    heading.className = 'heading';
    heading.append(title);
    if (hiding && decision.source !== 'local') {
      const score = document.createElement('span');
      score.className = 'score';
      score.textContent = `评分 ${Math.round(decision.score * 100)}`;
      heading.append(score);
    }
    copy.append(heading);
    const detail = document.createElement('div');
    detail.className = 'detail';
    detail.textContent = [decision.scope && decision.scope !== '正文' ? decision.scope : '', decision.reason].filter(Boolean).join(' · ');
    if (hiding || decision.kind !== 'protected') copy.append(detail);
    row.append(copy);
    if (decision.kind !== 'protected' && mode !== 'mark') {
      const button = document.createElement('button');
      button.type = 'button';
      const label = revealed ? '重新折叠' : '展开原帖';
      button.title = label;
      button.setAttribute('aria-label', label);
      button.append(document.createTextNode(revealed ? '收起' : '查看'), icon(revealed ? 'up' : 'down', 14));
      button.setAttribute('aria-expanded', String(revealed));
      button.addEventListener('click', onToggle);
      row.append(button);
    }
    row.title = `${decision.reason} · ${decision.source === 'local' ? '本地规则' : `模型评分 ${Math.round(decision.score * 100)} / 100（非准确率）`}${decision.kind === 'protected' ? ' · 内容具有明确价值，已保留' : ''}`;
    host.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); });
    root.append(row);
    let container = host;
    if (hiding) container = this.site.mountFold?.(article, host) || (article.append(host), host);
    else this.site.mountNotice(article, host);
    this.hosts.set(article, container);
  }
  has(article) { return !!this.hosts.get(article)?.isConnected; }
}
