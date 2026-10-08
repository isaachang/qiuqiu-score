const store = require('../../utils/store');
const { enter, onScroll, countUp } = require('../../utils/page');
const { buildReport } = require('../../utils/report');
const { dur, dayLabel, clock } = require('../../utils/util');

Page({
  data: { ok: false },
  onLoad(q) { this.id = q.id; },
  onPageScroll(e) { onScroll(this, e); },
  onShow() {
    enter(this);
    const m = store.match(this.id);
    if (!m) { this.setData({ ok: false }); return; }
    const R = buildReport(m, id => store.view(id));
    this.match = m; this.R = R;
    const d = new Date(m.end || Date.now());
    this.setData({
      ok: true, n: m.players.length, W: R.W, podium: R.podium.map((r, k) => ({ ...r, h: [r.no === 1 ? 236 : r.no === 2 ? 176 : 132][0] })),
      title: `${m.mode === 2 ? '双人' : '三人'}追分 · 战报`,
      when: `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`,
      table: R.table, heads: R.P, cols: R.P.length, sources: R.sources, hl: R.hl,
      grid: [
        { l: '总局数', v: R.rounds }, { l: '对局时长', v: dur(R.ms) }, { l: '平均每局', v: R.rounds ? clock(R.perRound / 1000).slice(3) : '—' },
        { l: '普胜', v: R.totals.pu }, { l: '金球', v: R.totals.gold }, { l: '犯规', v: R.totals.foul },
      ],
      goldRate: R.goldRate, legend: R.P,
      conf: Array.from({ length: 18 }, (_, k) => ({ k, l: (k * 37) % 100, c: ['#FFC53D', '#FFFFFF', '#3D7BFF', '#1FC98E', '#9B6BFF', '#FF8A3D'][k % 6], d: 3 + (k % 5) * 0.7, dl: -((k * 0.43) % 4) })),
      chart: this.chartData(R),
    });
    if (!this._counted) { this._counted = true; this.data.podium.forEach((p, k) => countUp(this, `podium[${k}].txt`, p.txt, 900)); }
  },

  /* 走势图数据：每一笔记分一个点 */
  chartData(R) {
    const { EV, signed } = require('../../utils/engine');
    const steps = R.D.steps, N = steps.length;
    const titles = ['开局'].concat(steps.map((st, k) => `第 ${st.round} 局 · 第 ${k + 1} 笔`));
    const notes = [''].concat(steps.map(st => `${R.P[st.p].name} ${EV[st.ev].name} ${signed(st.d[st.p])}`));
    const ticks = []; const cnt = Math.min(5, N);
    for (let k = 0; k <= cnt; k++) { const i = Math.round(N * k / (cnt || 1)); ticks.push({ i, t: i === 0 ? '开局' : `第${steps[i - 1].round}局` }); }
    return { series: R.series, colors: R.P.map(p => p.c), names: R.P.map(p => p.name), titles, notes, ticks };
  },
  toLog() { wx.navigateTo({ url: '/pages/log/log?id=' + this.id }); },
  again() {
    const m = this.match;
    store.newDraft(m.mode, this.R.D.order.map(i => m.players[i]));
    store.get().draft.rules = JSON.parse(JSON.stringify(m.rules));
    wx.redirectTo({ url: '/pages/setup/setup' });
  },
  home() { wx.switchTab({ url: '/pages/home/home' }); },
  onShareAppMessage() {
    const W = this.data.W;
    return { title: W ? `${W.name} 赢下本场 ${W.txt} · 球球记分` : '球球记分', path: '/pages/home/home' };
  },
});
