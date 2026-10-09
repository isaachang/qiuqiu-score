// 截图用的模拟微信运行时：跑页面 JS 拿到真实的 data（和 scripts/smoke.js 同一思路）
const path = require('path');
const ROOT = path.resolve(__dirname, '../../miniprogram');

function install(win) {
  const mem = {};
  const noop = () => {};
  const q = { in() { return q; }, select() { return q; }, selectAll() { return q; }, fields() { return q; }, boundingClientRect(f) { f && f({ top: 100, bottom: 300, left: 0, width: win.w, height: 200 }); return q; }, exec() {} };
  global.wx = new Proxy({
    getAccountInfoSync: () => ({ miniProgram: { envVersion: win.env || 'develop' } }),
    getStorageSync: k => (k in mem ? JSON.parse(JSON.stringify(mem[k])) : ''),
    setStorageSync: (k, v) => { mem[k] = JSON.parse(JSON.stringify(v)); },
    removeStorageSync: k => { delete mem[k]; },
    getStorageInfoSync: () => ({ currentSize: 100, limitSize: 10240 }),
    getWindowInfo: () => ({ windowWidth: win.w, windowHeight: win.h, statusBarHeight: win.sb, pixelRatio: 3, safeArea: { left: win.land ? 47 : 0, right: win.land ? win.w - 47 : win.w, top: win.sb, bottom: win.h - (win.land ? 21 : 34) } }),
    getSystemInfoSync: () => ({ windowWidth: win.w, windowHeight: win.h, statusBarHeight: win.sb, platform: 'ios', benchmarkLevel: 50 }),
    getMenuButtonBoundingClientRect: () => win.cap,
    createSelectorQuery: () => q,
    createInnerAudioContext: () => ({ onPlay() {}, onEnded() {}, onStop() {}, onError() {}, stop() {}, seek() {}, play() {} }),
  }, { get: (t, k) => (k in t ? t[k] : noop) });
  const APP = { globalData: { nav: { sb: win.sb, top: win.sb, h: 44, capW: 94, capH: 32, capTop: win.sb + 6, winW: win.w }, lite: false, lastTab: 0 } };
  global.getApp = () => APP;
  global.Behavior = d => d;
  let comp; global.Component = d => { comp = d; };
  let cur; global.Page = d => { cur = d; };
  const timers = [];
  global.setTimeout = f => { timers.push(f); return timers.length; };
  global.setInterval = () => 1; global.clearInterval = noop; global.clearTimeout = noop;
  const flush = (n = 500) => { while (timers.length && n-- > 0) timers.shift()(); };
  const dropTimers = () => { timers.length = 0; };

  function mkInst(def, extraData) {
    const data = JSON.parse(JSON.stringify(Object.assign({}, ...(def.behaviors || []).map(b => b.data || {}), def.data || {}, extraData || {})));
    const tab = { data: { mini: false, selected: 0, hidden: false }, setData(o) { Object.assign(this.data, o); }, arrive(t) { this.data.selected = t; } };
    const p = Object.assign({}, ...(def.behaviors || []).map(b => b.methods || {}), def, def.methods || {}, {
      data, route: '', getTabBar: () => tab, createSelectorQuery: () => q, triggerEvent() {},
      setData(o, cb) {
        for (const [k, v] of Object.entries(o)) {
          const ps = k.replace(/\[(\d+)\]/g, '.$1').split('.'); let t = data;
          for (const x of ps.slice(0, -1)) { if (t[x] == null) t[x] = {}; t = t[x]; }
          t[ps[ps.length - 1]] = v;
        }
        cb && cb();
      },
    });
    p._tab = tab;
    return p;
  }
  function loadPage(pg, query = {}) {
    const f = path.join(ROOT, `pages/${pg}/${pg}.js`);
    delete require.cache[require.resolve(f)];
    require(f);
    const p = mkInst(cur);
    p.onLoad && p.onLoad(query); p.onShow && p.onShow(); flush();
    p.data.ent = true; p.data.scrolled = false;
    return p;
  }
  function loadComponent(file) {
    delete require.cache[require.resolve(file)];
    require(file);
    return comp;
  }
  return { mem, flush, dropTimers, loadPage, loadComponent, mkInst, APP, store: () => require(path.join(ROOT, 'utils/store')) };
}
module.exports = { install, ROOT };
