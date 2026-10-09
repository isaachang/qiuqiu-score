// 生成 README 用的界面截图：node scripts/shots/shots.js [输出目录]（默认系统临时目录，再由 compose.js 拼图）
// 一起跑：npm run shots → docs/screenshots/
// 用模拟运行时跑出真实页面数据 → 渲染成 HTML → 无头 Chrome 截图（iPhone 14 尺寸，3 倍图）
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { install, ROOT } = require('./runtime');
const R = require('./render');

const OUT = path.resolve(process.argv[2] || path.join(require('os').tmpdir(), 'qq-raw'));
const TMP = path.join(require('os').tmpdir(), 'qq-shots');
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(TMP, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const win = { w: 390, h: 844, sb: 47, land: false, cap: { top: 51, height: 32, left: 289, right: 383, width: 94, bottom: 83 } };
const rt = install(win);
const store = rt.store();
const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));

/* ---------- 组件表 ---------- */
const compCache = {};
function comp(p) {
  const base = path.join(ROOT, p.replace(/^\//, ''));
  if (!compCache[base]) {
    const name = path.basename(path.dirname(base)) === 'custom-tab-bar' ? 'custom-tab-bar' : path.basename(base);
    compCache[base] = { name, def: rt.loadComponent(base + '.js'), wxml: base + '.wxml', wxss: base + '.wxss', rt };
  }
  return compCache[base];
}
function compsFor(json) {
  const m = {}; const all = Object.assign({}, app.usingComponents || {}, json.usingComponents || {});
  for (const [k, p] of Object.entries(all)) m[k] = comp(p);
  return m;
}

/* ---------- 基础样式：模拟小程序内置组件 + 关掉动画（截最终状态） ---------- */
const BASE = `
html,body{margin:0;padding:0;-webkit-font-smoothing:antialiased}
wx-view,wx-swiper,wx-swiper-item,wx-picker-view{display:block}
wx-comp{display:contents}
wx-text{display:inline}
img{display:inline-block;width:320px;height:240px}
wx-input{display:flex;align-items:center;overflow:hidden;white-space:nowrap}
wx-input>*{flex:1;text-align:inherit}
.wx-ph{opacity:1}
wx-switch{display:inline-block;width:52px;height:32px;border-radius:16px;background:#E5E5EA;position:relative;flex:none}
wx-switch i{position:absolute;top:2px;left:2px;width:28px;height:28px;border-radius:50%;background:#fff;box-shadow:0 3px 8px rgba(0,0,0,.15),0 1px 1px rgba(0,0,0,.1)}
wx-switch.on i{left:22px}
wx-swiper{overflow:hidden;position:relative}
wx-swiper-item{width:100%;height:100%}
wx-picker-view{display:flex;position:relative;overflow:hidden}
wx-pvc{flex:1;position:relative;display:block;overflow:hidden}
.wx-pv-ind{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%)}
.wx-pv-mask{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(255,255,255,.55) 38%,rgba(255,255,255,0) 44%,rgba(255,255,255,0) 56%,rgba(255,255,255,.55) 62%,rgba(255,255,255,.96))}
canvas{display:block;width:100%}
*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;animation-iteration-count:1!important;transition:none!important}
/* iOS 状态栏 + 微信胶囊 + 底部横条 */
.qqx-sb{position:fixed;left:0;right:0;top:0;height:var(--sbh);z-index:99999;display:flex;align-items:center;justify-content:space-between;padding:0 30px 0 44px;box-sizing:border-box;font-family:-apple-system,"SF Pro Text","PingFang SC";font-size:17px;font-weight:600;color:#000;pointer-events:none}
.qqx-sb svg{display:block}
.qqx-cap{position:fixed;z-index:99999;border-radius:16px;background:rgba(255,255,255,.62);box-shadow:inset 0 0 0 .5px rgba(0,0,0,.14);display:flex;align-items:center;pointer-events:none}
.qqx-cap>span{flex:1;display:flex;align-items:center;justify-content:center}
.qqx-cap i{width:.5px;height:18px;background:rgba(0,0,0,.18)}
.qqx-dots{display:flex;flex:none;gap:3px}.qqx-dots b{width:5px;height:5px;border-radius:50%;background:#000}
.qqx-ring{display:flex;flex:none;width:15px;height:15px;border-radius:50%;box-shadow:inset 0 0 0 2px #000;display:flex;align-items:center;justify-content:center}.qqx-ring b{width:6px;height:6px;border-radius:50%;background:#000}
.qqx-hi{position:fixed;left:50%;bottom:8px;width:134px;height:5px;margin-left:-67px;border-radius:3px;background:#000;z-index:99999;pointer-events:none}
`;
const STATUS = `<div class="qqx-sb"><span>9:41</span><span style="display:flex;gap:6px;align-items:center">
<svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
<svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.2-1.3C13.3 1.5 10.8.4 8 .4S2.7 1.5.8 3.3L2 4.6c1.6-1.5 3.7-2.4 6-2.4zm0 3.6c1.3 0 2.5.5 3.4 1.3l1.2-1.3C11.4 4.7 9.8 4 8 4s-3.4.7-4.6 1.8l1.2 1.3c.9-.8 2.1-1.3 3.4-1.3zm0 3.6c.4 0 .8.2 1.1.4L8 11.6 6.9 9.8c.3-.2.7-.4 1.1-.4z"/></svg>
<svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="#000" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2.5"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" opacity=".45"/></svg></span></div>`;
const capsule = c => `<div class="qqx-cap" style="left:${c.left}px;top:${c.top}px;width:${c.width}px;height:${c.height}px"><span><span class="qqx-dots"><b></b><b></b><b></b></span></span><i></i><span><span class="qqx-ring"><b></b></span></span></div>`;

/* ---------- 浏览器里补画：走势图（直接用组件自己的绘制代码）、滚轮停到选中项 ---------- */
const chartSrc = fs.readFileSync(path.join(ROOT, 'components/trend-chart/trend-chart.js'), 'utf8');
const AFTER = `<script>
var Component=function(d){window.TC=d};${chartSrc}
document.querySelectorAll('canvas[data-tc]').forEach(function(cv){
  var p=JSON.parse(cv.dataset.tc||'null'); if(!p) return;
  var W=cv.clientWidth,H=cv.clientHeight,dpr=3; cv.width=W*dpr; cv.height=H*dpr;
  var ctx=cv.getContext('2d'); ctx.scale(dpr,dpr);
  var inst={data:Object.assign({tip:null},p),ctx:ctx,W:W,H:H}; for(var k in TC.methods) inst[k]=TC.methods[k].bind(inst);
  inst.draw(-1,1);
});
document.querySelectorAll('wx-pvc').forEach(function(c){
  var sel=+c.dataset.sel||0, first=c.firstElementChild; if(!first) return;
  var h=first.offsetHeight, H=c.clientHeight, inner=document.createElement('div');
  while(c.firstChild) inner.appendChild(c.firstChild); c.appendChild(inner);
  inner.style.transform='translateY('+(H/2-h/2-sel*h)+'px)';
});
</script>`;

/* ---------- 一张截图 ---------- */
function shot(name, pg, p, opt = {}) {
  const W = opt.w || 390, H = opt.h || 844, land = !!opt.land;
  R.setRpx(W / 750);
  const dir = path.join(ROOT, 'pages', pg);
  const json = JSON.parse(fs.readFileSync(path.join(dir, pg + '.json'), 'utf8'));
  const comps = compsFor(json);
  const file = path.join(dir, pg + '.wxml');
  const ctx = R.Ctx(file, comps);
  let body = R.renderChildren(R.parseFile(file).children, p.data, ctx);
  let css = R.wxss(path.join(ROOT, 'app.wxss')) + R.wxss(path.join(dir, pg + '.wxss'));
  const used = new Set(Object.values(comps));
  if (opt.tab != null) {
    const tb = comp('/custom-tab-bar/index');
    const tbInst = { data: Object.assign(JSON.parse(JSON.stringify(tb.def.data)), { selected: opt.tab }, opt.tabData || {}) };
    body += `<wx-comp class="c-tabbar">${R.renderChildren(R.parseFile(tb.wxml).children, tbInst.data, R.Ctx(tb.wxml, {}))}</wx-comp>`;
    used.add(tb);
  }
  const o = { safeBottom: land ? 21 : 34, w: W, h: H };
  let ccss = '';
  used.forEach(c => { ccss += R.fixCss(R.wxss(c.wxss), { ...o, scope: c.name === 'custom-tab-bar' ? '.c-tabbar' : '.c-' + c.name }); });
  // 整个页面放进一个 transform 容器：fixed 定位以它为准（无头 Chrome 的窗口有最小宽度）
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${BASE}${R.fixCss(css, o)}${ccss}
body{width:${W}px;height:${H}px;overflow:hidden;--sbh:${win.sb}px}
#qqx-phone{position:relative;width:${W}px;height:${H}px;overflow:hidden;transform:translateZ(0);background:var(--bg)}
#qqx-scroll{position:absolute;inset:0;overflow:hidden}</style></head>
<body class="${land ? 'land' : ''}"><div id="qqx-phone"><div id="qqx-scroll">${body}</div>${land ? '' : STATUS}${capsule(win.cap)}<div class="qqx-hi"></div></div>${AFTER}<script>document.getElementById('qqx-scroll').scrollTop=${opt.scroll || 0}</script></body></html>`;
  const htmlFile = path.join(TMP, name + '.html');
  fs.writeFileSync(htmlFile, html);
  const png = path.join(OUT, name + '.png');
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=3', `--window-size=${W},${H}`,
    '--allow-file-access-from-files', '--virtual-time-budget=1500', '--default-background-color=00000000', `--screenshot=${png}`, 'file://' + htmlFile], { stdio: 'ignore' });
  console.log('✓', name, `${W}×${H}`);
  return png;
}

/* ---------- 场景 ---------- */
const g = rt.APP.globalData;
const s = store.get();                       // 开发版：自动载入演示数据（Isaac / Henry / Hugo）
s.settings.welcomed = true; s.settings.coach2 = true; s.settings.coach3 = true;
// 载入演示数据后按「体验版」显示：不出现开发版才有的演示数据入口、测试按钮
win.env = 'trial'; s.demo = null;
const me = s.friends.find(f => f.me).id, henry = s.friends.find(f => f.name === 'Henry').id, hugo = s.friends.find(f => f.name === 'Hugo').id;
const T0 = Date.now() - 38 * 60e3;
const live = (mode, slots, evs, extra) => {
  s.live = null; s.draft = { game: 'chase', mode, slots, rules: JSON.parse(JSON.stringify(s.defaultRules)), limit: 0 };
  store.startLive(); Object.assign(s.live, { start: T0 }, extra || {});
  evs.forEach(([p, ev], k) => s.live.events.push({ p, ev, t: T0 + (k + 1) * 95e3 }));
  store.save(); return s.live;
};
const EV3 = [[0, 'pu'], [1, 'pu'], [1, 'foul'], [2, 'xj'], [0, 'pu'], [0, 'h9'], [1, 'pu'], [2, 'pu'], [0, 'pu'], [0, 'dj'], [2, 'pu'], [0, 'pu']];
const EV2 = [[0, 'pu'], [1, 'pu'], [0, 'pu'], [0, 'xj'], [1, 'foul'], [1, 'pu'], [0, 'pu'], [0, 'pu'], [1, 'h9'], [0, 'pu']];

// 1. 双人记分
live(2, [me, henry], EV2);
let p = rt.loadPage('score'); shot('score-duo', 'score', p);
// 2. 限时比赛：时间到
s.live.limit = 30 * 60e3; s.live.asked = 0; store.save();
p = rt.loadPage('score'); shot('time-up', 'score', p);
// 3. 三人记分 + 大金庆祝
live(3, [me, henry, hugo], EV3);
p = rt.loadPage('score'); shot('score-trio', 'score', p);
p.onChip({ currentTarget: { dataset: { i: p.data.players[0].idx, k: 'dj' } } }); rt.dropTimers();
p.data.flies = []; p.data.parts = [];
shot('score-gold', 'score', p);
// 4. 横屏
Object.assign(win, { w: 844, h: 390, sb: 0, land: true, cap: { top: 10, height: 32, left: 844 - 54 - 94, right: 844 - 54, width: 94, bottom: 42 } });
rt.dropTimers();
p = rt.loadPage('land'); p.measureBar(); rt.flush();
shot('score-land', 'land', p, { w: 844, h: 390, land: true });
Object.assign(win, { w: 390, h: 844, sb: 47, land: false, cap: { top: 51, height: 32, left: 289, right: 383, width: 94, bottom: 83 } });
// 5. 首页（有一局进行中）
p = rt.loadPage('home'); shot('home', 'home', p, { tab: 0 });
// 6. 新手引导
g.showWelcome = true; p = rt.loadPage('home'); shot('welcome', 'home', p, { tab: 0, tabData: { hidden: true } });
// 7. 新对局（三人 · 限时 1 小时）
s.draft = null; store.newDraft(3, [me, henry, hugo]); s.draft.limit = 60 * 6e4;
p = rt.loadPage('setup'); shot('setup', 'setup', p, { h: 1180 });
p.data.scrolled = true; shot('setup-limit', 'setup', p, { scroll: 300 });
// 8. 战报（长图）
const m = s.history.find(x => x.mode === 3 && x.demo);
p = rt.loadPage('result', { id: m.id }); shot('result', 'result', p, { h: 2330 });
p.data.scrolled = true; p.data.conf = []; shot('result-table', 'result', p, { scroll: 1150 });
// 9. 战绩（长图）
p = rt.loadPage('stats'); shot('stats', 'stats', p, { h: 3220, tab: 1 });
shot('stats-top', 'stats', p, { tab: 1 });
p.data.scrolled = true; shot('stats-mid', 'stats', p, { scroll: 960, tab: 1 });
// 10. 历史日历
p = rt.loadPage('history', { seg: 'all', days: '0' }); p.toggleMode(); rt.flush(); shot('history', 'history', p);
// 11. 我的
p = rt.loadPage('me'); shot('me', 'me', p, { tab: 2 });
console.log('→', OUT);
