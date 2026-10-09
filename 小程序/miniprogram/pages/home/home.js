const store = require('../../utils/store');
const { ask, uiDone } = require('../../utils/ui');
const { derive, signed } = require('../../utils/engine');
const { clock } = require('../../utils/util');
const { matchRow } = require('../../utils/rows');
const { enter, onScroll } = require('../../utils/page');

function greet() {
  const h = new Date().getHours();
  if (h < 5) return '夜深了，还在练球？';
  if (h < 11) return '早上好，先热热手';
  if (h < 14) return '中午好，来一局？';
  if (h < 18) return '下午好，球桌在等你';
  return '晚上好，今晚一杆清台';
}

Page({
  onUi(e) { uiDone(this, e.detail.k); },
  onUiClose() { uiDone(this, null); },
  data: { greet: '', live: null, recent: [], me: {}, scrolled: false, ent: false },
  onShow() {
    if (this.data.greet !== greet()) this.setData({ greet: greet() });
    if (this._rev !== store.rev()) this.load(); // 数据没变就不重算
    enter(this, 0);
    clearInterval(this.timer);
    this.timer = setInterval(() => { const L = store.get().live; if (L) this.setData({ 'live.clock': clock((Date.now() - L.start) / 1000) }); }, 1000);
  },
  onHide() { clearInterval(this.timer); },
  onUnload() { clearInterval(this.timer); },
  onPageScroll(e) { onScroll(this, e); },
  load() {
    this._rev = store.rev();
    const s = store.get(), L = s.live, me = s.friends.find(f => f.me);
    let live = null;
    if (L) {
      const D = derive(L);
      live = {
        mode: L.mode === 2 ? '双人' : '三人', round: D.round, clock: clock((Date.now() - L.start) / 1000), cols: L.players.length,
        players: L.players.map((id, i) => ({ ...store.view(id), s: signed(D.scores[i]), cls: D.scores[i] > 0 ? 'pos' : D.scores[i] < 0 ? 'neg' : '' })),
      };
    }
    this.setData({ live, recent: s.history.slice(0, 5).map(matchRow), me: store.view(me.id) });
  },
  new2() { this.go(2); },
  new3() { this.go(3); },
  go(mode) {
    wx.vibrateShort({ type: 'light' });
    const me = store.get().friends.find(f => f.me);
    store.newDraft(mode, me ? [me.id] : []);
    wx.navigateTo({ url: '/pages/setup/setup' });
  },
  resume() { wx.navigateTo({ url: '/pages/score/score' }); },
  soon() { wx.showToast({ title: '敬请期待', icon: 'none' }); },
  toStats() { wx.switchTab({ url: '/pages/stats/stats' }); },
  toMe() { wx.switchTab({ url: '/pages/me/me' }); },
  askDelete(e) {
    const id = e.currentTarget.dataset.id;
    ask(this, { icon: 'warn', title: '删除这场对局？', desc: '删除后战绩统计会同步更新，无法恢复。', actions: [{ k: 'del', t: '删除', type: 'danger' }] })
      .then(k => { if (k === 'del') { store.deleteMatch(id); this.load(); wx.showToast({ title: '已删除', icon: 'success' }); } });
  },
  openMatch(e) { wx.navigateTo({ url: '/pages/result/result?id=' + e.currentTarget.dataset.id }); },
});
