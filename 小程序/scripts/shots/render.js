// 把小程序页面（WXML + WXSS + 页面 data）渲染成一张静态 HTML，用于生成 README 截图
// 只覆盖本项目用到的语法：wx:if / elif / else、wx:for、block、template / import、自定义组件、slot
const fs = require('fs');
const path = require('path');
const { ROOT } = require('./runtime');

/* ---------------- WXML 解析 ---------------- */
function parse(src) {
  const root = { tag: '#root', attrs: {}, children: [] }, stack = [root];
  let i = 0;
  const top = () => stack[stack.length - 1];
  while (i < src.length) {
    if (src.startsWith('<!--', i)) { const e = src.indexOf('-->', i); i = e < 0 ? src.length : e + 3; continue; }
    if (src[i] === '<' && src[i + 1] === '/') {
      const e = src.indexOf('>', i); const name = src.slice(i + 2, e).trim();
      while (stack.length > 1 && top().tag !== name) stack.pop();
      if (stack.length > 1) stack.pop();
      i = e + 1; continue;
    }
    if (src[i] === '<' && /[a-zA-Z]/.test(src[i + 1])) {
      let j = i + 1; while (/[\w-]/.test(src[j])) j++;
      const tag = src.slice(i + 1, j), attrs = {};
      for (;;) {
        while (/\s/.test(src[j])) j++;
        if (src[j] === '/' && src[j + 1] === '>') { j += 2; top().children.push({ tag, attrs, children: [] }); break; }
        if (src[j] === '>') { j++; const n = { tag, attrs, children: [] }; top().children.push(n); if (tag !== 'import' && tag !== 'wxs') stack.push(n); break; }
        let k = j; while (src[k] && !/[\s=>/]/.test(src[k])) k++;
        const name = src.slice(j, k); j = k;
        while (/\s/.test(src[j])) j++;
        if (src[j] === '=') {
          j++; while (/\s/.test(src[j])) j++;
          const qch = src[j]; let v = ''; j++;
          while (j < src.length && src[j] !== qch) {
            if (src.startsWith('{{', j)) { const e = src.indexOf('}}', j); v += src.slice(j, e + 2); j = e + 2; continue; }
            v += src[j++];
          }
          j++; attrs[name] = v;
        } else attrs[name] = true;
      }
      i = j; continue;
    }
    // 文本（跳过 {{ }} 里的 < >）
    let t = '';
    while (i < src.length && !(src[i] === '<' && (src[i + 1] === '/' || src[i + 1] === '!' || /[a-zA-Z]/.test(src[i + 1])))) {
      if (src.startsWith('{{', i)) { const e = src.indexOf('}}', i); t += src.slice(i, e + 2); i = e + 2; continue; }
      t += src[i++];
    }
    if (t.trim()) top().children.push({ text: t });
  }
  return root;
}
const parsed = {};
function parseFile(f) { if (!parsed[f]) parsed[f] = parse(fs.readFileSync(f, 'utf8')); return parsed[f]; }

/* ---------------- 表达式 ---------------- */
const fnCache = {};
function ev(expr, scope) {
  const f = fnCache[expr] || (fnCache[expr] = new Function('s', `with(s){return (${expr})}`));
  const px = new Proxy(scope, {
    has: (t, k) => typeof k === 'string',
    get: (t, k) => (k === Symbol.unscopables ? undefined : k in t ? t[k] : globalThis[k]),
  });
  try { return f(px); } catch (e) { return undefined; }
}
function val(v, scope) {
  if (v === true) return true;
  const m = /^\s*\{\{([\s\S]*)\}\}\s*$/.exec(v);
  if (m && m[1].indexOf('}}') < 0) return ev(m[1], scope);
  return v.replace(/\{\{([\s\S]*?)\}\}/g, (_, e) => { const r = ev(e, scope); return r == null ? '' : String(r); });
}

/* ---------------- 渲染 ---------------- */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const TAG = { view: 'wx-view', text: 'wx-text', image: 'img', button: 'button', 'swiper-item': 'wx-swiper-item', 'picker-view-column': 'wx-pvc', canvas: 'canvas' };

function Ctx(file, comps) {
  return { file, dir: path.dirname(file), comps: comps || {}, templates: {} };
}
function src2url(s, ctx) {
  if (!s) return '';
  const abs = s.startsWith('/') ? path.join(ROOT, s) : path.resolve(ctx.dir, s);
  return 'file://' + abs;
}
function attrsHtml(n, scope, ctx, extraStyle) {
  let out = '', style = '';
  for (const [k, raw] of Object.entries(n.attrs)) {
    if (/^(bind|catch|capture-|wx:|data-|hover-|mut-bind)/.test(k) || k === 'key') continue;
    const v = val(raw, scope);
    if (k === 'class') out += ` class="${esc(v)}"`;
    else if (k === 'style') style += v + ';';
    else if (k === 'id') out += ` id="${esc(v)}"`;
    else if (k === 'hidden') { if (v && v !== 'false') style += 'display:none;'; }
    else if (k === 'src' && n.tag === 'image') out += ` src="${esc(src2url(v, ctx))}"`;
    else if (k === 'mode' && n.tag === 'image') style += v === 'aspectFill' ? 'object-fit:cover;' : v === 'aspectFit' ? 'object-fit:contain;' : v === 'widthFix' ? 'height:auto;' : '';
  }
  style += extraStyle || '';
  if (style) out += ` style="${esc(rpx(style))}"`;
  return out;
}
let RPX = 0.52;
const rpx = s => s.replace(/(-?\d*\.?\d+)rpx/g, (_, n) => +(n * RPX).toFixed(2) + 'px');

function renderChildren(children, scope, ctx, slot) {
  let out = '', chain = false; // chain：上一个 wx:if / elif 是否已经命中
  for (const c of children) {
    if (c.text != null) { out += renderText(c.text, scope); chain = false; continue; }
    const a = c.attrs;
    if ('wx:if' in a) { chain = !!val(a['wx:if'], scope); if (!chain) continue; }
    else if ('wx:elif' in a) { if (chain) continue; chain = !!val(a['wx:elif'], scope); if (!chain) continue; }
    else if ('wx:else' in a) { if (chain) continue; chain = false; }
    else chain = false;
    out += renderFor(c, scope, ctx, slot);
  }
  return out;
}
function renderText(t, scope) {
  const s = val(t, scope);
  return esc(s).replace(/\\n/g, '<br>');
}
function renderFor(n, scope, ctx, slot) {
  if (!('wx:for' in n.attrs)) return renderNode(n, scope, ctx, slot);
  let list = val(n.attrs['wx:for'], scope);
  if (typeof list === 'number') list = Array.from({ length: list }, (_, i) => i);
  if (typeof list === 'string') list = list.split('');
  if (!list) return '';
  const it = n.attrs['wx:for-item'] || 'item', ix = n.attrs['wx:for-index'] || 'index';
  let out = '';
  (Array.isArray(list) ? list : Object.values(list)).forEach((v, i) => {
    const s = Object.create(scope); s[it] = v; s[ix] = i;
    out += renderNode(n, s, ctx, slot);
  });
  return out;
}
function renderNode(n, scope, ctx, slot) {
  const tag = n.tag;
  if (tag === 'block') return renderChildren(n.children, scope, ctx, slot);
  if (tag === 'import') { const f = path.resolve(n.attrs.src.startsWith('/') ? ROOT : ctx.dir, n.attrs.src.replace(/^\//, '')); collectTemplates(parseFile(f), ctx); return ''; }
  if (tag === 'wxs') return '';
  if (tag === 'template') {
    if (n.attrs.name) { ctx.templates[n.attrs.name] = n; return ''; }
    const t = ctx.templates[val(n.attrs.is, scope)]; if (!t) return '';
    const d = n.attrs.data ? ev('{' + n.attrs.data.replace(/^\{\{|\}\}$/g, '') + '}', scope) : {};
    return renderChildren(t.children, Object.assign(Object.create(null), d), ctx);
  }
  if (tag === 'slot') return slot ? slot() : '';
  if (ctx.comps[tag]) return renderComponent(ctx.comps[tag], n, scope, ctx, slot);
  if (tag === 'input') {
    const v = val(n.attrs.value || '', scope), ph = val(n.attrs.placeholder || '', scope), phc = val(n.attrs['placeholder-class'] || '', scope);
    return `<wx-input${attrsHtml(n, scope, ctx)}>${v ? esc(v) : `<span class="${esc(phc)} wx-ph">${esc(ph)}</span>`}</wx-input>`;
  }
  if (tag === 'switch') {
    const on = !!val(n.attrs.checked || '', scope), c = val(n.attrs.color || '#22C993', scope);
    return `<wx-switch class="${on ? 'on' : ''}" style="${on ? 'background:' + c : ''}"><i></i></wx-switch>`;
  }
  if (tag === 'swiper') {
    const cur = +val(n.attrs.current || '0', scope) || 0;
    let k = 0, items = '';
    for (const c of n.children) { if (c.tag !== 'swiper-item') continue; if (k++ === cur) items += renderNode(c, scope, ctx, slot); }
    return `<wx-swiper${attrsHtml(n, scope, ctx)}>${items}</wx-swiper>`;
  }
  if (tag === 'picker-view') {
    const value = val(n.attrs.value || '', scope) || [], ind = val(n.attrs['indicator-class'] || '', scope);
    let k = 0, cols = '';
    for (const c of n.children) { if (c.tag !== 'picker-view-column') continue; cols += `<wx-pvc data-sel="${value[k++] || 0}">${renderChildren(c.children, scope, ctx)}</wx-pvc>`; }
    return `<wx-picker-view${attrsHtml(n, scope, ctx)}><div class="wx-pv-ind ${esc(ind)}"></div>${cols}<div class="wx-pv-mask"></div></wx-picker-view>`;
  }
  const h = TAG[tag] || ('wx-' + tag);
  const inner = tag === 'image' ? '' : renderChildren(n.children, scope, ctx, slot);
  if (tag === 'image') return `<img${attrsHtml(n, scope, ctx)}>`;
  if (tag === 'canvas') return `<canvas${attrsHtml(n, scope, ctx)} data-tc="${esc(JSON.stringify(ctx.chart || null))}"></canvas>`;
  return `<${h}${attrsHtml(n, scope, ctx)}>${inner}</${h}>`;
}
function collectTemplates(tree, ctx) { for (const c of tree.children) if (c.tag === 'template' && c.attrs.name) ctx.templates[c.attrs.name] = c; }

/* ---------------- 自定义组件 ---------------- */
const camel = s => s.replace(/-(\w)/g, (_, c) => c.toUpperCase());
function renderComponent(C, n, scope, ctx, slot) {
  const def = C.def, props = {};
  const P = def.properties || {};
  for (const [k, p] of Object.entries(P)) props[k] = p && typeof p === 'object' && 'value' in p ? JSON.parse(JSON.stringify(p.value)) : undefined;
  const given = {};
  for (const [k, raw] of Object.entries(n.attrs)) {
    if (/^(bind|catch|wx:|class|style|id|data-)/.test(k)) continue;
    const ck = camel(k); if (!(ck in P)) continue;
    let v = val(raw, scope); const T = P[ck] && P[ck].type;
    if (T === Boolean) v = v === true || (v && v !== 'false'); else if (T === Number) v = +v;
    props[ck] = v; given[ck] = v;
  }
  const inst = C.rt.mkInst({ ...def, behaviors: def.behaviors }, props);
  Object.assign(inst, def.methods || {});
  const life = (def.lifetimes && def.lifetimes.attached) || def.attached;
  if (life) life.call(inst);
  for (const [k, v] of Object.entries(given)) { const ob = P[k] && P[k].observer; if (ob && v) ob.call(inst, v); }
  C.rt.flush(50);
  const sub = Ctx(C.wxml, ctx.comps);
  if (C.name === 'trend-chart') sub.chart = { series: inst.data.series, colors: inst.data.colors, ticks: inst.data.ticks, fill: inst.data.fill, signed: inst.data.signed };
  const parentSlot = () => renderChildren(n.children, scope, ctx, slot);
  const cls = n.attrs.class ? val(n.attrs.class, scope) : '';
  return `<wx-comp class="c-${C.name} ${esc(cls)}"${n.attrs.style ? ` style="${esc(rpx(val(n.attrs.style, scope)))}"` : ''}>${renderChildren(parseFile(C.wxml).children, inst.data, sub, parentSlot)}</wx-comp>`;
}

/* ---------------- WXSS ---------------- */
function wxss(file, seen = new Set()) {
  if (!fs.existsSync(file) || seen.has(file)) return '';
  seen.add(file);
  let s = fs.readFileSync(file, 'utf8');
  s = s.replace(/@import\s+["']([^"']+)["'];?/g, (_, p) => wxss(p.startsWith('/') ? path.join(ROOT, p) : path.resolve(path.dirname(file), p), seen));
  return s;
}
// 只改选择器里的标签名：view → wx-view 等；page → body
function fixCss(css, opt) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  css = rpx(css).replace(/env\(safe-area-inset-bottom\)/g, opt.safeBottom + 'px').replace(/env\(safe-area-inset-top\)/g, '0px')
    .replace(/(\d*\.?\d+)vh/g, (_, n) => +(n * opt.h / 100).toFixed(2) + 'px').replace(/(\d*\.?\d+)vw/g, (_, n) => +(n * opt.w / 100).toFixed(2) + 'px');
  let out = '', i = 0;
  // 组件样式只作用在组件内部（小程序的组件样式隔离）
  const scoped = x => (opt.scope && x.trim() ? opt.scope + ' ' + x.trim() : x);
  const sel = s => s.split(',').map(x => scoped(x.replace(/(^|[\s>+~(])(view|text|image|button|input|swiper-item|swiper|canvas|page)(?=$|[\s.:#[>+~,)])/g, (m, a, t) => a + ({ view: 'wx-view', text: 'wx-text', image: 'img', page: 'body', input: 'wx-input', swiper: 'wx-swiper', 'swiper-item': 'wx-swiper-item' }[t] || t)))).join(',');
  while (i < css.length) {
    const b = css.indexOf('{', i); if (b < 0) { out += css.slice(i); break; }
    const head = css.slice(i, b);
    if (/@(keyframes|-webkit-keyframes|media|supports)/.test(head)) {
      let depth = 1, j = b + 1; while (j < css.length && depth) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
      const body = css.slice(b + 1, j - 1);
      out += head + '{' + (/keyframes/.test(head) ? body : fixCssInner(body, sel)) + '}';
      i = j; continue;
    }
    const e = css.indexOf('}', b);
    out += sel(head) + css.slice(b, e + 1);
    i = e + 1;
  }
  return out;
}
function fixCssInner(css, sel) {
  let out = '', i = 0;
  while (i < css.length) { const b = css.indexOf('{', i); if (b < 0) { out += css.slice(i); break; } const e = css.indexOf('}', b); out += sel(css.slice(i, b)) + css.slice(b, e + 1); i = e + 1; }
  return out;
}

module.exports = { parse, parseFile, renderChildren, Ctx, wxss, fixCss, setRpx: f => { RPX = f; }, rpx };
