const store = require('../../utils/store');
const { ask, uiDone } = require('../../utils/ui');
const { enter, onScroll } = require('../../utils/page');
const { EV, MAIN, PAY, FOULTO, derive, signed } = require('../../utils/engine');
const { hm } = require('../../utils/util');

Page({
  onUi(e) { uiDone(this, e.detail.k); },
  onUiClose() { uiDone(this, null); },
  data: { ro: false, sums: [], rows: [], total: 0 },
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
  tapRow(e) {
    if (this.data.ro) return;
    const i = +e.currentTarget.dataset.i, row = this.data.rows.find(r => r.i === i);
    ask(this, { title: `第 ${row.round} 局 · ${row.name} ${row.ev}`, desc: '修改或删除后，比分、顺序和之后的记录会自动重算',
      actions: [{ k: 'edit', t: '修改这条记录', type: 'plain' }, { k: 'del', t: '删除这条记录', type: 'danger' }] })
      .then(k => { if (k === 'edit') this.edit(i); else if (k === 'del') this.del(i); });
  },
  del(i) {
    ask(this, { icon: 'warn', title: '删除这条记录？', desc: '删除后比分、顺序和之后的记录会自动重算。', actions: [{ k: 'del', t: '删除', type: 'danger' }] })
      .then(k => { if (k !== 'del') return; this.m().events.splice(i, 1); store.save(); this.render(); wx.showToast({ title: '已删除', icon: 'success' }); });
  },
  edit(i) {
    const m = this.m(), names = m.players.map(id => store.friend(id).name);
    ask(this, { title: '这一笔是谁的？', actions: names.map((n, j) => ({ k: 'p' + j, t: n, type: 'plain' })) }).then(a => {
      if (!a) return;
      const p = +a.slice(1);
      ask(this, { title: `${names[p]} 的哪个事件？`, actions: MAIN.map(k => ({ k, t: `${EV[k].name}  ${k === 'foul' ? '−' : '+'}${m.rules[k].v}`, type: k === 'foul' ? 'danger' : 'plain' })) }).then(ev => {
        if (!ev) return;
        const e = m.events[i]; e.p = p; e.ev = ev;
        store.save(); this.render(); wx.showToast({ title: '已修改，已重算', icon: 'success' });
      });
    });
  },
});
