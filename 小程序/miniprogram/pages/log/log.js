const store = require('../../utils/store');
const { EV, MAIN, PAY, FOULTO, derive, signed } = require('../../utils/engine');
const { hm } = require('../../utils/util');

Page({
  data: { ro: false, sums: [], rows: [], total: 0 },
  onLoad(q) { this.id = q.id || 'live'; },
  onShow() { this.render(); },
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
  tapRow(e) {
    if (this.data.ro) return;
    const i = +e.currentTarget.dataset.i;
    wx.showActionSheet({
      itemList: ['修改这条记录', '删除这条记录'], itemColor: '#16161A',
      success: r => { if (r.tapIndex === 0) this.edit(i); else this.del(i); },
    });
  },
  del(i) {
    wx.showModal({ title: '删除这条记录？', content: '删除后比分、顺序和之后的记录会自动重算。', confirmText: '删除', confirmColor: '#F0444D',
      success: r => { if (!r.confirm) return; this.m().events.splice(i, 1); store.save(); this.render(); wx.showToast({ title: '已删除', icon: 'success' }); } });
  },
  edit(i) {
    const m = this.m(), names = m.players.map(id => store.friend(id).name);
    wx.showActionSheet({ itemList: names.map(n => `改为 ${n}`), success: a => {
      wx.showActionSheet({ itemList: MAIN.map(k => EV[k].name), success: b => {
        const e = m.events[i]; e.p = a.tapIndex; e.ev = MAIN[b.tapIndex];
        store.save(); this.render(); wx.showToast({ title: '已修改', icon: 'success' });
      } });
    } });
  },
});
