const snooker = require('../../behaviors/snooker');
const { enter } = require('../../utils/page');
const idle = require('../../utils/idle');
const { uiDone } = require('../../utils/ui');

Page({
  behaviors: [snooker],
  data: { nav: {}, ent: false },
  onUi(e) { uiDone(this, e.detail.k); },
  onUiClose() { uiDone(this, null); },
  onLoad() { this.setData({ nav: getApp().globalData.nav }); },
  onShow() {
    if (!this.initSnk()) return;
    enter(this);
  },
  onHide() { this.stopClock(); },
  onUnload() { this.stopClock(); wx.setKeepScreenOn({ keepScreenOn: false }); },
  /** 这局刚被自动保存（30 分钟没操作）：提示一下，可以看战报或继续打 */
  onNoLive() { return idle.notice(this, { redirect: true, onResume: () => this.onShow(), onClose: () => this.back() }); },
  back() { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/home' }) }); },
});
