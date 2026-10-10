const store = require('../../utils/store');
const nav = require('../../utils/nav');
const { enter, onScroll } = require('../../utils/page');
const { headToHead } = require('../../utils/stats');
const { matchRow } = require('../../utils/rows');
const SS = require('../../utils/snk-stats');
const { resultUrl } = require('../../utils/game');

Page({
  data: { ok: false },
  onLoad(q) { this.fid = q.fid; this.game = q.game === 'snk' ? 'snk' : 'chase'; },
  onPageScroll(e) { onScroll(this, e); },
  onShow() {
    enter(this);
    const s = store.get(), me = s.friends.find(f => f.me);
    const A = store.view(me.id), B = store.view(this.fid);
    const snk = this.game === 'snk';
    const X = snk ? SS.headToHead(s.history, me.id, this.fid) : headToHead(s.history, me.id, this.fid, id => store.view(id));
    this.setData({ navTitle: `vs ${B.name}${snk ? ' · 斯诺克' : ''}` });
    this.setData({
      ok: true, A, B, X, snk,
      chart: X.chart ? { ...X.chart, colors: [A.c, B.c], names: [A.name, B.name] } : null,
      rows: X.ms.map(m => matchRow(m)),
      wSplit: X.w + X.l ? Math.round(X.w / (X.w + X.l) * 100) : 50,
    });
  },
  open(e) { const m = store.match(e.currentTarget.dataset.id); if (m) nav.to(resultUrl(m)); },
  rematch() {
    const meId = store.get().friends.find(f => f.me).id;
    if (this.game === 'snk') { const d = store.snkDraft(); d.players = [meId, this.fid]; store.save(); nav.to('/pages/snk-setup/snk-setup'); return; }
    store.newDraft(2, [meId, this.fid]);
    nav.to('/pages/setup/setup');
  },
});
