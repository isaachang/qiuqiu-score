const store = require('../../utils/store');
const { enter, onScroll } = require('../../utils/page');
const { ask, uiDone } = require('../../utils/ui');
Page({
  onUi(e) { uiDone(this, e.detail.k); },
  onUiClose() { uiDone(this, null); },
  data: { es: { show: false }, scrolled: false, ent: false },
  onShow() { this.render(); enter(this, 2); },
  onPageScroll(e) { onScroll(this, e); },
  render() {
    const s = store.get(), me = s.friends.find(f => f.me);
    this.setData({ demo: !!s.demo, demoN: s.demo ? s.demo.matches.length : 0, me: store.view(me.id), count: store.activeFriends().length, matches: s.history.length, vib: s.settings.vib, keep: s.settings.keep });
  },
  rename() {
    const me = store.get().friends.find(f => f.me);
    this.setData({ es: { show: true, name: me.name === '我' ? '' : me.name, color: me.color } });
  },
  closeEs() { this.setData({ 'es.show': false }); },
  saveMe(e) {
    const me = store.get().friends.find(f => f.me);
    store.updateFriend(me.id, { name: e.detail.name, color: e.detail.color });
    this.closeEs(); this.render(); wx.showToast({ title: '已保存', icon: 'success' });
  },
  toggleDemo() {
    if (store.get().demo) {
      ask(this, { icon: 'warn', title: '清除演示数据？', desc: `会删除 ${this.data.demoN} 场演示对局和演示球友，你自己打的对局不受影响。`, actions: [{ k: 'clear', t: '清除演示数据', type: 'danger' }] })
        .then(k => { if (k !== 'clear') return; const r = store.clearDemo(); if (typeof r === 'string') { wx.showToast({ title: r, icon: 'none' }); return; } this.render(); wx.showToast({ title: '已清除', icon: 'success' }); });
    } else {
      store.loadDemo(); this.render(); wx.showToast({ title: '已载入演示数据', icon: 'success' });
    }
  },
  toRules() { wx.navigateTo({ url: '/pages/rules/rules?target=default' }); },
  toFriends() { wx.navigateTo({ url: '/pages/friends/friends' }); },
  toggle(e) { const k = e.currentTarget.dataset.k, s = store.get(); s.settings[k] = !s.settings[k]; store.save(); this.setData({ [k]: s.settings[k] }); },
});
