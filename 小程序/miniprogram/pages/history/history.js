// 全部对局 · 日历视图
// 周视图（默认）/ 月视图切换，左右滑动翻页；每天一个结果圆环（绿 = 赢的场次占比，红 = 输）；点某天看当天对局
const store = require('../../utils/store');
const nav = require('../../utils/nav');
const { matchRow } = require('../../utils/rows');
const { derived } = require('../../utils/cache');
const { isChase, isSnk, resultUrl } = require('../../utils/game');
const SN = require('../../utils/snooker');
const { signed, outcome } = require('../../utils/engine');
const { enter, onScroll } = require('../../utils/page');
const { ask, uiDone } = require('../../utils/ui');

const WD = ['日', '一', '二', '三', '四', '五', '六'];
const keyOf = d => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
const dateOf = k => new Date(Math.floor(k / 10000), Math.floor(k / 100) % 100 - 1, k % 100);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const weekStart = d => addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -d.getDay());

Page({
  onUi(e) { uiDone(this, e.detail.k); },
  onUiClose() { uiDone(this, null); },
  data: { wd: WD, mode: 'week', title: '', cells: [], rows: [], day: null, monthSum: null, filterTxt: '', total: 0, slide: '', scrolled: false, ent: false },
  onLoad(q) { this.seg = q.seg || 'all'; this.days = +q.days || 0; },
  onPageScroll(e) { onScroll(this, e); },
  onShow() {
    enter(this);
    this.index();
    if (!this.sel) this.sel = this.latest || keyOf(new Date()); // 默认选中最近一次打球的那天
    if (!this.anchor) this.anchor = dateOf(this.sel);
    this.render();
  },

  /** 把对局按天归档：每天的场次、胜负、净胜分 */
  index() {
    const s = store.get(), me = s.friends.find(f => f.me), since = this.days ? Date.now() - this.days * 864e5 : 0;
    // 「全部」里也有斯诺克；按双人 / 三人筛选时只看追分
    const ms = s.history.filter(m => m.status === 'done' && (this.seg === 'all' ? (isChase(m) || isSnk(m)) : this.seg === 'snk' ? isSnk(m) : isChase(m) && m.mode === +this.seg) && m.players.includes(me.id) && m.start >= since);
    const idx = {};
    ms.forEach(m => {
      const k = keyOf(new Date(m.start)), i = m.players.indexOf(me.id);
      const g = idx[k] || (idx[k] = { ms: [], w: 0, l: 0, net: 0 });
      g.ms.push(m);
      let oc;
      if (isSnk(m)) oc = SN.outcome(SN.derive(m), i); // 斯诺克按局分算胜负，不计入净胜分
      else { const D = derived(m); g.net += D.scores[i]; oc = outcome(D.scores, i); }
      if (oc === 'W') g.w++; else if (oc === 'L') g.l++;
    });
    this.idx = idx;
    this.latest = Object.keys(idx).map(Number).sort((a, b) => b - a)[0] || 0;
    const f = [this.seg === 'all' ? '' : this.seg === 'snk' ? '斯诺克' : this.seg === '2' ? '双人' : '三人', this.days ? `近 ${this.days} 天` : ''].filter(Boolean).join(' · ');
    this.setData({ total: ms.length, filterTxt: f });
  },

  render() {
    const today = keyOf(new Date()), a = this.anchor, month = a.getMonth();
    let start, count;
    if (this.data.mode === 'week') { start = weekStart(a); count = 7; }
    else {
      const first = new Date(a.getFullYear(), month, 1), last = new Date(a.getFullYear(), month + 1, 0);
      start = weekStart(first); count = Math.ceil((first.getDay() + last.getDate()) / 7) * 7;
    }
    const cells = [];
    for (let i = 0; i < count; i++) {
      const d = addDays(start, i), k = keyOf(d), g = this.idx[k];
      let ring = '';
      if (g) {
        const n = g.ms.length, pw = g.w / n * 100, pl = (g.w + g.l) / n * 100;
        ring = `background:conic-gradient(#1FC98E 0 ${pw}%,#FF5A5F ${pw}% ${pl}%,#C9C5BD ${pl}% 100%)`;
      }
      cells.push({ k, n: d.getDate(), wd: WD[d.getDay()], has: !!g, cnt: g ? g.ms.length : 0, ring, today: k === today, tonly: k === today && !g, sel: k === this.sel,
        other: this.data.mode === 'month' && d.getMonth() !== month, future: k > today });
    }
    // 当月汇总
    let mn = 0, mw = 0, mnet = 0;
    Object.keys(this.idx).forEach(k => { const d = dateOf(+k); if (d.getFullYear() === a.getFullYear() && d.getMonth() === month) { const g = this.idx[k]; mn += g.ms.length; mw += g.w; mnet += g.net; } });
    // 选中这天
    const g = this.idx[this.sel], sd = dateOf(this.sel);
    const day = { t: `${sd.getMonth() + 1}月${sd.getDate()}日 周${WD[sd.getDay()]}`, isToday: this.sel === today,
      n: g ? g.ms.length : 0, w: g ? g.w : 0, net: g ? signed(g.net) : '', cls: g ? (g.net > 0 ? 'pos' : g.net < 0 ? 'neg' : '') : '' };
    const lat = this.latest && this.latest !== this.sel ? dateOf(this.latest) : null;
    this.setData({
      title: `${a.getFullYear()}年${month + 1}月`, cells, day,
      rows: g ? [...g.ms].sort((x, y) => y.start - x.start).map(m => matchRow(m, { time: true })) : [],
      monthSum: { n: mn, w: mw, net: signed(mnet), cls: mnet > 0 ? 'pos' : mnet < 0 ? 'neg' : '' },
      latestTxt: lat ? `${lat.getMonth() + 1}月${lat.getDate()}日` : '',
    });
  },

  tapDay(e) {
    const k = +e.currentTarget.dataset.k;
    if (k === this.sel) return;
    wx.vibrateShort({ type: 'light' });
    this.sel = k;
    if (this.data.mode === 'month' && dateOf(k).getMonth() !== this.anchor.getMonth()) this.anchor = dateOf(k); // 点了上 / 下个月的日子：翻过去
    if (this.data.mode === 'week') this.anchor = dateOf(k);
    this.render();
  },
  toggleMode() {
    wx.vibrateShort({ type: 'light' });
    this.anchor = dateOf(this.sel);
    this.setData({ mode: this.data.mode === 'week' ? 'month' : 'week' }, () => this.render());
  },
  shift(dir) {
    const a = this.anchor;
    this.anchor = this.data.mode === 'week' ? addDays(a, dir * 7) : new Date(a.getFullYear(), a.getMonth() + dir, 1);
    this.setData({ slide: '' }, () => { this.render(); this.setData({ slide: dir > 0 ? 'sl' : 'sr' }); });
  },
  prev() { this.shift(-1); },
  next() { this.shift(1); },
  goToday() { this.sel = keyOf(new Date()); this.anchor = new Date(); this.render(); },
  goLatest() { if (!this.latest) return; this.sel = this.latest; this.anchor = dateOf(this.latest); this.render(); },
  // 日历左右滑动翻页
  ts(e) { const t = e.touches[0]; this._x = t.clientX; this._y = t.clientY; },
  te(e) {
    if (this._x == null) return;
    const t = e.changedTouches[0], dx = t.clientX - this._x, dy = t.clientY - this._y; this._x = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) dx < 0 ? this.next() : this.prev();
  },

  open(e) { const m = store.match(e.currentTarget.dataset.id); if (m) nav.to(resultUrl(m)); },
  askDelete(e) {
    const id = e.currentTarget.dataset.id;
    ask(this, { icon: 'warn', title: '删除这场对局？', desc: '删除后战绩统计会同步更新，无法恢复。', actions: [{ k: 'del', t: '删除', type: 'danger' }] })
      .then(k => { if (k !== 'del') return; store.deleteMatch(id); this.index(); this.render(); wx.showToast({ title: '已删除', icon: 'success' }); });
  },
});
