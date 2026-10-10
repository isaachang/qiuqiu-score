// 把截图拼成 README 用的展示图：node scripts/shots/compose.js [截图目录] [输出目录]
// 先运行 shots.js 生成原始截图（raw/），这里负责手机外框、排版和说明文字
const fs = require('fs');
const path = require('path');
const { snap } = require('./chrome');

const DOCS = path.resolve(__dirname, '../../../docs/screenshots');
const RAW = path.resolve(process.argv[2] || path.join(require('os').tmpdir(), 'qq-raw'));
const OUT = path.resolve(process.argv[3] || DOCS);
const TMP = path.join(require('os').tmpdir(), 'qq-compose');
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(TMP, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const LOGO = path.resolve(__dirname, '../../miniprogram/images/logo.png');
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'));
const VERSION = (fs.readFileSync(path.resolve(__dirname, '../../miniprogram/utils/env.js'), 'utf8').match(/VERSION = '([\d.]+)'/) || [])[1] || pkg.version;
const img = n => 'file://' + path.join(RAW, n + '.png');

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,"PingFang SC","Helvetica Neue",sans-serif;color:#16161A;-webkit-font-smoothing:antialiased}
.panel{position:relative;overflow:hidden;border-radius:44px;background:#F6F4F0}
.blob{position:absolute;border-radius:50%;filter:blur(60px);opacity:.55}
/* 手机外框：窄黑边 + 灵动岛 */
.ph{position:relative;border-radius:var(--r,50px);padding:var(--b,10px);background:linear-gradient(145deg,#2A2A2E,#0C0C0E 40%,#1C1C20);
  box-shadow:0 0 0 1.5px #3A3A40 inset,0 50px 90px -36px rgba(40,24,10,.55),0 18px 36px -20px rgba(40,24,10,.35)}
.ph .sc{position:relative;overflow:hidden;border-radius:calc(var(--r,50px) - var(--b,10px));background:#F6F4F0}
.ph .sc img{display:block;width:100%}
.ph .di{position:absolute;left:50%;top:calc(var(--b,10px) + 10px);width:31%;height:var(--dih,26px);margin-left:-15.5%;border-radius:20px;background:#000;z-index:2}
.cap{text-align:center;margin-top:30px}
.cap b{display:block;font-size:24px;font-weight:800;letter-spacing:-.01em}
.cap span{display:block;font-size:16px;color:#6B6B73;margin-top:8px;line-height:1.5}
`;
// 竖屏手机：w 为屏幕宽度（css px），按 390×844 等比
function phone(name, w, opt = {}) {
  const h = Math.round(w * 844 / 390), r = Math.round(w * 0.135), b = Math.max(7, Math.round(w * 0.027));
  return `<div class="ph" style="--r:${r + b}px;--b:${b}px;--dih:${Math.round(w * 0.085)}px;width:${w + b * 2}px;${opt.style || ''}">
    <div class="sc" style="height:${h}px"><img src="${img(name)}"${opt.top ? ` style="margin-top:-${opt.top * w / 390}px"` : ''}></div><div class="di"></div></div>`;
}
function landPhone(name, w) {
  const h = Math.round(w * 390 / 844), r = Math.round(h * 0.135), b = Math.max(7, Math.round(h * 0.027));
  return `<div class="ph" style="--r:${r + b}px;--b:${b}px;width:${w + b * 2}px">
    <div class="sc" style="height:${h}px"><img src="${img(name)}"></div>
    <div style="position:absolute;top:50%;left:${b + 10}px;width:${Math.round(h * 0.085)}px;height:31%;transform:translateY(-50%);border-radius:20px;background:#000"></div></div>`;
}
const blobs = list => list.map(([c, x, y, s]) => `<div class="blob" style="background:${c};left:${x}px;top:${y}px;width:${s}px;height:${s}px"></div>`).join('');

function render(name, W, H, html) {
  const f = path.join(TMP, name + '.html');
  fs.writeFileSync(f, `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}body{width:${W}px;height:${H}px;overflow:hidden}</style></head><body>${html}</body></html>`);
  const out = path.join(OUT, name + '.png');
  snap(['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2', `--window-size=${W},${H}`,
    '--allow-file-access-from-files', '--virtual-time-budget=1500', '--default-background-color=00000000', 'file://' + f], out);
  console.log('✓', name);
}

/* ---------- 1. 主视觉 ---------- */
const chips = ['双人 / 三人追分', '斯诺克', '金球庆祝 + BGM', '战报与战绩'];
render('hero', 1280, 720, `<div class="panel" style="width:1280px;height:720px">
  ${blobs([['#FF5A5F', 700, -160, 420], ['#FFC53D', 1040, 360, 380], ['#3D7BFF', 560, 470, 360], ['#1FC98E', -120, 520, 300], ['#9B6BFF', 1100, -120, 260]])}
  <div style="position:absolute;left:84px;top:150px;width:580px">
    <img src="file://${LOGO}" style="width:104px;height:104px;border-radius:28px;box-shadow:0 24px 48px -18px rgba(255,90,95,.7)">
    <div style="font-size:88px;font-weight:900;letter-spacing:-.02em;margin-top:30px;line-height:1">球球记分</div>
    <div style="font-size:26px;font-weight:700;color:#6B6B73;margin-top:20px">台球记分 · 微信小程序</div>
    <div style="font-size:19px;color:#6B6B73;margin-top:16px;line-height:1.6">一台手机记全场。轻点卡片记一局，<br>大金小金有庆祝，打完自动出战报。</div>
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:30px">${chips.map((t, i) => `<span style="padding:9px 16px;border-radius:999px;background:${['#FF5A5F', '#FFB020', '#3D7BFF', '#1FC98E'][i]};color:#fff;font-size:15px;font-weight:800;white-space:nowrap">${t}</span>`).join('')}</div>
  </div>
  <div style="position:absolute;left:640px;top:96px;transform:rotate(-7deg)">${phone('home', 220)}</div>
  <div style="position:absolute;left:1000px;top:110px;transform:rotate(7deg)">${phone('result', 220)}</div>
  <div style="position:absolute;left:800px;top:60px;z-index:3">${phone('score-gold', 252)}</div>
  <div style="position:absolute;right:30px;bottom:24px;font-size:14px;font-weight:700;color:#A9A9B0;z-index:4">v${VERSION}</div>
</div>`);

/* ---------- 2. 三连展示 ---------- */
function trio(name, items, tint) {
  const W = 1280, H = 860, pw = 300;
  render(name, W, H, `<div class="panel" style="width:${W}px;height:${H}px">
    ${blobs(tint)}
    <div style="position:absolute;inset:0;display:flex;justify-content:center;align-items:flex-start;gap:70px;padding-top:56px">
      ${items.map(([n, t, d, top]) => `<div style="width:${pw + 20}px">${phone(n, pw, { top })}<div class="cap"><b>${t}</b><span>${d}</span></div></div>`).join('')}
    </div></div>`);
}
trio('scoring', [
  ['score-duo', '轻点卡片，记一局', '名字牌放远也认得出；底栏可暂停'],
  ['score-trio', '三人局自动换位', '胜者开球，其余两人顺序不变'],
  ['score-gold', '金球有庆祝', '大金、小金、黄金九带音乐和彩纸'],
], [['#FF5A5F', -100, -120, 380], ['#3D7BFF', 1000, 520, 360], ['#FFC53D', 520, 640, 300]]);
trio('flow', [
  ['setup-limit', '开局前选好规则', '双人 / 三人、开球顺序、限时比赛'],
  ['time-up', '限时比赛', '到点只提醒，不自动结算，可以加时'],
  ['welcome', '第一次打开有引导', '三页介绍 + 起名字，十秒上手'],
], [['#1FC98E', -80, 560, 360], ['#9B6BFF', 980, -120, 340], ['#FFC53D', 480, -160, 300]]);
trio('report', [
  ['result', '自动生成战报', '领奖台、本场之最、分数走势'],
  ['result-table', '每人数据对比', '胜局、胜率、连胜、出金率一目了然'],
  ['stats-top', '战绩总览', '筛选人数和时间，胜率、胜平负、最近场次'],
], [['#FFC53D', -100, -100, 360], ['#FF5A5F', 1000, 560, 360], ['#3D7BFF', 560, 680, 280]]);
trio('more', [
  ['stats-mid', '球友与我的数据', '提款机 / 克星，效率、进球、得分来源'],
  ['history', '日历看每一天', '按天看胜负，周 / 月视图切换'],
  ['home', '首页一键开局', '进行中的对局随时继续'],
], [['#3D7BFF', -120, 520, 380], ['#1FC98E', 1000, -100, 340], ['#FF5A5F', 520, -180, 280]]);

trio('snooker', [
  ['snk-setup', '斯诺克开局', '红球 15 / 10 / 6，拔河滑杆设让分'],
  ['snk-score', '点球记分', '红彩组合键、剩余分、超分提醒、清彩顺序'],
  ['snk-result', '每局一张比分卡', '单杆、犯规、局分一目了然'],
], [['#1FA86A', -100, -120, 380], ['#E5383B', 1000, 540, 340], ['#1E1E22', 520, 660, 260]]);

/* ---------- 3. 横屏 ---------- */
render('landscape', 1280, 700, `<div class="panel" style="width:1280px;height:700px">
  ${blobs([['#FF5A5F', -100, -100, 360], ['#FFC53D', 520, 480, 340], ['#3D7BFF', 1020, -60, 360]])}
  <div style="position:absolute;left:50%;top:60px;transform:translateX(-50%)">${landPhone('score-land', 1000)}</div>
  <div class="cap" style="position:absolute;left:0;right:0;bottom:44px"><b>横屏记分</b><span>卡片并排、名字牌更大；顶栏暂停 / 撤销 / 一键结算</span></div>
</div>`);
/* ---------- 4. 长截图原图（README 里折叠展示） ---------- */
fs.mkdirSync(path.join(OUT, 'long'), { recursive: true });
['result', 'stats'].forEach(n => fs.copyFileSync(path.join(RAW, n + '.png'), path.join(OUT, 'long', n + '.png')));
console.log('→', OUT);
