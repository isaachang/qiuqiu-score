const store = require('../../utils/store');
const { ask, uiDone } = require('../../utils/ui');
const { enter, onScroll } = require('../../utils/page');
const { EV, MAIN, PAY, FOULTO, derive, signed } = require('../../utils/engine');
const { hm } = require('../../utils/util');

Page({
  onUi(e) { uiDone(this, e.detail.k); },
  onUiClose() { uiDone(this, null); },
  data: { ro: false, sums: [], rows: [], total: 0, ed: { show: false } },
  onLoad(q) { this.id = q.id || 'live'; },
  onPageScroll(e) { onScroll(this, e); },
  onShow() {
    enter(this); this.render(); },
  m() { return store.match(this.id); },
  render() {
    const m = this.m();
    if (!m) { this.setData({ rows: [], sums: [], total: 0 }); return; }
    const D = derive(m), names = m.players.map(id => store.friend(id).name), two = m.players.length === 2;
    const rows = D.steps.map((s, i) => {
      const v = m.rules[s.ev].v, E = EV[s.ev];
      const how = s.ev === 'foul'
        ? `${names[s.p]} −${v} → ${two ? '对手' : FOULTO[m.rules.foul.pay].slice(1)} ${names[s.to]} +${v}`
        : s.payers.length > 1 ? `两家各付 ${v}` : `${two ? '对手' : PAY[m.rules[s.ev].pay].slice(0, 2)} ${names[s.payers[0]]} 付 ${v}`;
      return {
        i, round: s.round, name: names[s.p], ev: E.name, c: E.c, t: E.t, k: s.ev, time: hm(s.t), how,
        ds: s.d.map((x, j) => ({ j, x, txt: names[j].slice(0, 1) + ' ' + signed(x), cls: x > 0 ? 'pos' : 'neg' })).filter(o => o.x),
        next: !two && s.ev !== 'foul' ? s.after.map(p => names[p]).join(' › ') : '',
      };
    }).reverse();
    this.setData({
      ro: m.status === 'done', total: rows.length, rows,
      sums: m.players.map((id, i) => ({ ...store.view(id), s: signed(D.scores[i]), cls: D.scores[i] > 0 ? 'pos' : D.scores[i] < 0 ? 'neg' : '' })),
    });
  },
  /** 点记录 / 左滑「编辑」：打开编辑面板 */
  tapRow(e) {
    if (this.data.ro) return;
    const i = +e.currentTarget.dataset.i, m = this.m(), ev = m.events[i], row = this.data.rows.find(r => r.i === i);
    this.setData({ ed: { show: true, i, round: row.round, p: ev.p, ev: ev.ev,
      players: m.players.map((id, j) => ({ ...store.view(id), j })),
      evs: MAIN.map(k => ({ k, name: EV[k].name, c: EV[k].c, v: (k === 'foul' ? '−' : '+') + m.rules[k].v })) } });
  },
  edP(e) { this.setData({ 'ed.p': +e.currentTarget.dataset.j }); },
  edE(e) { this.setData({ 'ed.ev': e.currentTarget.dataset.k }); },
  closeEd() { this.setData({ 'ed.show': false }); },
  saveEd() {
    const { i, p, ev } = this.data.ed, e = this.m().events[i];
    this.setData({ 'ed.show': false });
    if (e.p === p && e.ev === ev) return;
    e.p = p; e.ev = ev; store.save(); this.render();
    wx.showToast({ title: '已修改，已重算', icon: 'none' });
  },
  /** 左滑「删除」：直接删除，不再二次确认 */
  delRow(e) {
    if (this.data.ro) return;
    this.m().events.splice(+e.currentTarget.dataset.i, 1); store.save(); this.render();
    wx.showToast({ title: '已删除，已重算', icon: 'none' });
  },
  noop() {},
});
