const store = require('../../utils/store');
const { ask, uiDone } = require('../../utils/ui');
const { overview, achievements } = require('../../utils/stats');
const { matchRow } = require('../../utils/rows');
const { enter, onScroll, countUp } = require('../../utils/page');

Page({
  onUi(e) { uiDone(this, e.detail.k); },
  onUiClose() { uiDone(this, null); },
  data: { seg: 'all', segIdx: 0, days: 0, scrolled: false, ent: false },
  onShow() { const played = enter(this, 1); this.render(played); },
  onPageScroll(e) { onScroll(this, e); },
  setDays(e) { this.setData({ days: +e.currentTarget.dataset.d }); this.render(); },
  setSeg(e) { const seg = e.currentTarget.dataset.s; this.setData({ seg, segIdx: { all: 0, 2: 1, 3: 2 }[seg] }); this.render(); },
  render(anim) {
    const s = store.get(), me = s.friends.find(f => f.me);
    const view = id => store.view(id), days = this.data.days;
    const ALL = overview(s.history, me.id, this.data.seg, view, 0);   // 名片：始终是全部战绩
    const O = days ? overview(s.history, me.id, this.data.seg, view, days) : ALL; // 下方内容：跟随时间范围
    this.setData({
      demo: !!s.demo, me: store.view(me.id), card: { title: ALL.title, kpis: ALL.kpis }, O, empty: !ALL.P.n, rangeEmpty: !O.P.n,
      rangeTxt: days ? `近 ${days} 天 · ${O.P.n} 场` : `最近 ${O.recent.length} 场`,
      recent: O.recent.map((r, k) => ({ k, r })),
      friends: O.friends, bank: O.bank, nemesis: O.nemesis,
      rows: O.ms.map(matchRow), ach: achievements(ALL.P),
    });
    if (anim) ALL.kpis.forEach((k, i) => countUp(this, `card.kpis[${i}].v`, k.v));
  },
  toH2h(e) { wx.navigateTo({ url: '/pages/h2h/h2h?fid=' + e.currentTarget.dataset.id }); },
  open(e) { wx.navigateTo({ url: '/pages/result/result?id=' + e.currentTarget.dataset.id }); },
  askDelete(e) {
    const id = e.currentTarget.dataset.id;
    ask(this, { icon: 'warn', title: '删除这场对局？', desc: '删除后战绩统计会同步更新，无法恢复。', actions: [{ k: 'del', t: '删除', type: 'danger' }] })
      .then(k => { if (k === 'del') { store.deleteMatch(id); this.render(); wx.showToast({ title: '已删除', icon: 'success' }); } });
  },
  start() { wx.switchTab({ url: '/pages/home/home' }); },
});
