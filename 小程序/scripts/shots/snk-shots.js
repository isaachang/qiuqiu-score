// 斯诺克页面截图（开发自查用）：node scripts/shots/snk-shots.js [输出目录]
const path = require('path');
process.argv[2] = process.argv[2] || path.join(require('os').tmpdir(), 'qq-snk');
const { shot, rt, store, win } = require('./shots');
const s = store.get();
s.settings.welcomed = true; s.settings.coach2 = true; s.settings.coach3 = true;
win.env = 'trial'; s.demo = null;
const me = s.friends.find(f => f.me).id, henry = s.friends.find(f => f.name === 'Henry').id;
const tap = (p, k) => { p._lock = 0; p.onBall({ currentTarget: { dataset: { k } } }); };
const fresh = p => { rt.dropTimers(); p.data.flies = []; };

// 设置页
s.live = null; const d = store.snkDraft(); d.players = [me, henry]; d.cfg = { first: 0, bestOf: 7, reds: 15, hc: { p: 1, pts: 14 } }; store.save();
d.players = [me, null]; store.save();
let p = rt.loadPage('snk-setup'); shot('s0-setup-empty', 'snk-setup', p);
p.openPick({ currentTarget: { dataset: { i: 0 } } }); shot('s0b-picker', 'snk-setup', p); p.closePick();
d.players = [me, henry]; store.save();
p = rt.loadPage('snk-setup'); shot('s1-setup', 'snk-setup', p, { h: 1500 });
p.setData({ drag: true }); shot('s2-setup-drag', 'snk-setup', p);
p.setData({ drag: false }); p.openCustom(); shot('s3-custom', 'snk-setup', p);
// 记分：红球阶段（打了一杆）
store.startSnk(); const L = s.live; L.start = Date.now() - 5 * 60e3;
p = rt.loadPage('snk-score');
['black', 'black', 'red', 'pink'].forEach(k => tap(p, k)); fresh(p);
shot('s4-score-red', 'snk-score', p);
tap(p, 'red'); fresh(p); shot('s5-score-color', 'snk-score', p);
p.onFoul(); shot('s6-foul', 'snk-score', p); p.closeFoul();
// 超分 + 清彩
p.onMiss(); let g = 0; while (!p.data.sup && g++ < 30) tap(p, 'black');
fresh(p); p.data.banner = null; shot('s7-sup', 'snk-score', p);
p.hideSup(); p.closeBanner(); shot('s8-sup-state', 'snk-score', p);
while (p.data.vm.phase !== 'clear' && g++ < 80) tap(p, 'black');
['yellow', 'green'].forEach(k => tap(p, k)); fresh(p); p.closeBanner(); p.hideSup(); shot('s9-clear', 'snk-score', p);
['brown', 'blue', 'pink', 'black'].forEach(k => tap(p, k)); fresh(p); p.closeBanner(); p.hideSup(); shot('s10-frame', 'snk-score', p);
p.openLog(); p.setData({ 'frame.show': false }); shot('s11-log', 'snk-score', p); p.closeLog();
p.refresh(); p.endMatch(); shot('s11c-end', 'snk-score', p); p.onUi({ detail: { k: null } }); rt.flush();
p.nextFrame(); tap(p, 'black'); fresh(p); p.openFin(); shot('s11b-fin', 'snk-score', p); p.closeFin();
// 战报
p = rt.loadPage('snk-score'); p.saveMatch(); rt.flush();
const m = s.history[0];
p = rt.loadPage('snk-result', { id: m.id }); shot('s14-result', 'snk-result', p, { h: 1700 });
// 首页
store.startSnk(); const L2 = s.live; L2.events.push({ ev: 'pot2', b: 'black', t: Date.now() }); store.save();
p = rt.loadPage('home'); shot('s15-home', 'home', p, { tab: 0 });
p = rt.loadPage('history', { seg: 'all', days: '0' }); shot('s16-history', 'history', p, { h: 1300 });
p = rt.loadPage('home'); p.data.scrolled = true; shot('s17-home-cards', 'home', p, { tab: 0, scroll: 560 });
p = rt.loadPage('stats'); p.data.scrolled = true; shot('s18-stats-friends', 'stats', p, { h: 4200, tab: 1 });
p = rt.loadPage('h2h', { fid: henry }); shot('s19-h2h', 'h2h', p, { h: 3600 });
s.settings.statsGame = 'chase'; p = rt.loadPage('stats'); shot('s20-stats-chase', 'stats', p, { tab: 1 });
s.settings.statsGame = 'snk'; p = rt.loadPage('stats'); shot('s21-stats-snk', 'stats', p, { h: 2900, tab: 1 });
p = rt.loadPage('h2h', { fid: henry, game: 'snk' }); shot('s22-h2h-snk', 'h2h', p, { h: 1900 });
store.newDraft(2, [me, henry]); p = rt.loadPage('setup'); p.toggleLimit({ detail: { value: true } }); p.data.scrolled = true; shot('s23-setup-opts', 'setup', p, { scroll: 300 });
console.log('done');
