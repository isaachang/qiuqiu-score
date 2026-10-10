const store = require('../../utils/store');
const nav = require('../../utils/nav');
const { ask, uiDone } = require('../../utils/ui');
const { overview, achievements } = require('../../utils/stats');
const SS = require('../../utils/snk-stats');
const { matchRow } = require('../../utils/rows');
const { enter, onScroll, countUp, stopCountUp } = require('../../utils/page');
const { resultUrl, isChase, isSnk } = require('../../utils/game');

// 玩法：以后新增玩法往这里加一项（顶部是横向滑动的玩法胶囊）
const GAMES = [{ k: 'chase', n: '追分', dot: '#FF5A5F', is: isChase }, { k: 'snk', n: '斯诺克', dot: '#1FA86A', is: isSnk }];

const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
/** 球友对阵卡：共 N 场 · 胜率 vs 胜率 · 胜负比例条（少于 3 场只显示胜场数，百分比没意义） */
function vsCard(f) {
  const me = store.view(store.get().friends.find(x => x.me).id), d = new Date(f.last), n = f.n, dr = n - f.w - f.l;
  return {
    id: f.id, tag: f.tag, n, me, op: { name: f.name, ch: f.ch, c: f.c, i: f.i },
    pctMode: n >= 3, a: n >= 3 ? pct(f.w, n) + '%' : f.w, b: n >= 3 ? pct(f.l, n) + '%' : f.l,
    lead: f.w > f.l ? 0 : f.l > f.w ? 1 : -1, w: f.w, l: f.l, d: dr,
    ...rel(f, n), ww: pct(f.w, n), wd: pct(dr, n), last: `${d.getMonth() + 1}月${d.getDate()}日`, netTxt: f.netTxt, net: f.net, netLabel: f.netLabel || '交锋',
  };
}

/** 没有「提款机 / 克星」绶带的球友，也给一句关系描述 */
function rel(f, n) {
  if (n < 3) return { rel: '刚交手', relCls: '' };
  const d = pct(f.w, n) - pct(f.l, n);
  return d >= 20 ? { rel: '你占上风', relCls: 'up' } : d <= -20 ? { rel: '他占上风', relCls: 'down' } : { rel: '势均力敌', relCls: '' };
}

Page({
  onUi(e) { uiDone(this, e.detail.k); },
  onUiClose() { uiDone(this, null); },
  data: { game: 'chase', seg: 'all', days: 0, fAll: false, scrolled: false, ent: false },
  onShow() {
    const played = enter(this, 1);
    if (!played && this._rev === store.rev()) return; // 数据没变：什么都不做，切换瞬间完成
    this.render(played);
  },
  onPageScroll(e) { onScroll(this, e); },
  setDays(e) { this.setData({ days: +e.currentTarget.dataset.d }); this.render(); },
  /** 切换玩法（记住上次选的） */
  setGame(e) {
    const g = e.currentTarget.dataset.g; if (g === this.data.game) return;
    const s = store.get(); s.settings.statsGame = g; store.save();
    wx.vibrateShort({ type: 'light' });
    this.setData({ game: g }); this.render();
  },
  setSeg(e) { this.setData({ seg: e.currentTarget.dataset.s }); this.render(); },
  toggleFriends() { const fAll = !this.data.fAll; this.setData({ fAll, friendsShown: fAll ? this.data.friends : this.data.friends.slice(0, 3) }); },
  /** 名片上「胜率」前面的范围说明，例如「近 7 天 · 双人」 */
  scope(game) {
    const { days, seg } = this.data;
    return [days ? `近 ${days} 天` : '', game === 'chase' && seg !== 'all' ? (seg === '2' ? '双人' : '三人') : ''].filter(Boolean).join(' · ');
  },
  /** 两种玩法共用的输出 */
  common(O, ALL, game) {
    const friends = O.friends.map(f => vsCard(f)), sc = this.scope(game);
    return {
      O, card: { title: ALL.title, kpis: O.kpis }, empty: !ALL.P.n, rangeEmpty: !O.P.n, scopeTxt: sc ? sc + ' ' : '',
      form: O.recent.slice(-10).map((r, k) => ({ k, r })),
      friends, friendsShown: this.data.fAll ? friends : friends.slice(0, 3),
      rows: O.ms.slice(0, 3).map(m => matchRow(m)), total: O.ms.length,
    };
  },
  render(anim) {
    stopCountUp(this); // 上一次的数字动画还没滚完：先停掉，免得把旧筛选的数字写回来
    this._rev = store.rev();
    const s = store.get(), me = s.friends.find(f => f.me);
    const view = id => store.view(id), days = this.data.days;
    const game = s.settings.statsGame || this.data.game;
    const games = GAMES.map(g => ({ k: g.k, n: g.n, dot: g.dot, cnt: s.history.filter(m => m.status === 'done' && g.is(m) && m.players.includes(me.id)).length }));
    if (game === 'snk') { // 斯诺克：输出结构和追分一样，复用同一套模板
      const ALL = SS.overview(s.history, me.id, view, 0), O = days ? SS.overview(s.history, me.id, view, days) : ALL;
      this.setData({ game, games, demo: !!s.demo, me: store.view(me.id), ...this.common(O, ALL, game) });
      if (anim) O.kpis.forEach((k, i) => countUp(this, `card.kpis[${i}].v`, k.v));
      return;
    }
    // 称号、成就按全部战绩；其余内容（名片数据、球友、我的数据、历史）跟随顶部的人数 / 时间筛选
    const ALLP = overview(s.history, me.id, 'all', view, 0);
    const O = overview(s.history, me.id, this.data.seg, view, days);
    const ach = achievements(ALLP.P); ach.list.sort((a, b) => b.ok - a.ok); // 已解锁的排前面
    this.setData({ game, games, demo: !!s.demo, me: store.view(me.id), ...this.common(O, ALLP, game), empty: !ALLP.P.n, ach });
    if (anim) O.kpis.forEach((k, i) => countUp(this, `card.kpis[${i}].v`, k.v));
  },
  toHistory() { nav.to(`/pages/history/history?seg=${this.data.game === 'snk' ? 'snk' : this.data.seg}&days=${this.data.days}`); },
  open(e) { const m = store.match(e.currentTarget.dataset.id); if (m) nav.to(resultUrl(m)); },
  toH2h(e) { nav.to(`/pages/h2h/h2h?fid=${e.currentTarget.dataset.id}&game=${this.data.game}`); },
  askDelete(e) {
    const id = e.currentTarget.dataset.id;
    ask(this, { icon: 'warn', title: '删除这场对局？', desc: '删除后战绩统计会同步更新，无法恢复。', actions: [{ k: 'del', t: '删除', type: 'danger' }] })
      .then(k => { if (k === 'del') { store.deleteMatch(id); this.render(); wx.showToast({ title: '已删除', icon: 'success' }); } });
  },
  start() { if (this.data.game === 'snk') { store.snkDraft(); nav.to('/pages/snk-setup/snk-setup'); } else wx.switchTab({ url: '/pages/home/home' }); },
});
