const store = require('../../utils/store');
Page({
  data: { es: { show: false } },
  onShow() { this.render(); },
  render() {
    const s = store.get(), me = s.friends.find(f => f.me);
    this.setData({ me: store.view(me.id), count: store.activeFriends().length, matches: s.history.length, vib: s.settings.vib, keep: s.settings.keep });
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
  toRules() { wx.navigateTo({ url: '/pages/rules/rules?target=default' }); },
  toFriends() { wx.navigateTo({ url: '/pages/friends/friends' }); },
  toggle(e) { const k = e.currentTarget.dataset.k, s = store.get(); s.settings[k] = !s.settings[k]; store.save(); this.setData({ [k]: s.settings[k] }); },
});
