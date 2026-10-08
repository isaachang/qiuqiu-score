const store = require('../../utils/store');
const { enter, onScroll } = require('../../utils/page');
const { headToHead } = require('../../utils/stats');
const { matchRow } = require('../../utils/rows');

Page({
  data: { ok: false },
  onLoad(q) { this.fid = q.fid; },
  onPageScroll(e) { onScroll(this, e); },
  onShow() {
    enter(this);
    const s = store.get(), me = s.friends.find(f => f.me);
    const A = store.view(me.id), B = store.view(this.fid);
    const X = headToHead(s.history, me.id, this.fid, id => store.view(id));
    this.setData({ navTitle: `vs ${B.name}` });
    this.setData({
      ok: true, A, B, X,
      chart: { ...X.chart, colors: [A.c, B.c], names: [A.name, B.name] },
      rows: X.ms.map(matchRow),
      wSplit: X.w + X.l ? Math.round(X.w / (X.w + X.l) * 100) : 50,
    });
  },
  open(e) { wx.navigateTo({ url: '/pages/result/result?id=' + e.currentTarget.dataset.id }); },
  rematch() {
    store.newDraft(2, [store.get().friends.find(f => f.me).id, this.fid]);
    wx.navigateTo({ url: '/pages/setup/setup' });
  },
});
