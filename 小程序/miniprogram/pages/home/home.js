const store = require('../../utils/store');
const { derive, signed } = require('../../utils/engine');
const { clock } = require('../../utils/util');
const { matchRow } = require('../../utils/rows');

Page({
  data: { hello: '', live: null, recent: [] },
  onShow() {
    const d = new Date();
    this.setData({ hello: `${d.getMonth() + 1}月${d.getDate()}日 · 今晚也要一杆清台` });
    this.load();
    this.timer = setInterval(() => { const L = store.get().live; if (L) this.setData({ 'live.clock': clock((Date.now() - L.start) / 1000) }); }, 1000);
  },
  onHide() { clearInterval(this.timer); },
  onUnload() { clearInterval(this.timer); },
  load() {
    const s = store.get(), L = s.live;
    let live = null;
    if (L) {
      const D = derive(L);
      live = {
        mode: L.mode === 2 ? '双人' : '三人', round: D.round, clock: clock((Date.now() - L.start) / 1000), cols: L.players.length,
        players: L.players.map((id, i) => ({ ...store.view(id), s: signed(D.scores[i]), cls: D.scores[i] > 0 ? 'pos' : D.scores[i] < 0 ? 'neg' : '' })),
      };
    }
    const recent = s.history.slice(0, 5).map(m => matchRow(m));
    this.setData({ live, recent });
  },
  new2() { this.go(2); },
  new3() { this.go(3); },
  go(mode) {
    const me = store.get().friends.find(f => f.me);
    store.newDraft(mode, me ? [me.id] : []);
    wx.navigateTo({ url: '/pages/setup/setup' });
  },
  resume() { wx.navigateTo({ url: '/pages/score/score' }); },
  soon() { wx.showToast({ title: '敬请期待', icon: 'none' }); },
  toStats() { wx.switchTab({ url: '/pages/stats/stats' }); },
  askDelete(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({ title: '删除这场对局？', content: '删除后战绩统计会同步更新，无法恢复。', confirmText: '删除', confirmColor: '#F0444D',
      success: r => { if (r.confirm) { store.deleteMatch(id); this.load(); wx.showToast({ title: '已删除', icon: 'success' }); } } });
  },
  openMatch(e) { wx.navigateTo({ url: '/pages/result/result?id=' + e.currentTarget.dataset.id }); },
});
