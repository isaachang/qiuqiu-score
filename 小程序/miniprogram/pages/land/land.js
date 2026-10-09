const scoring = require('../../behaviors/scoring');
const sfx = require('../../utils/sfx');
const { enter } = require('../../utils/page');

// 横屏左右最小留白（px）：避开圆角和刘海，不依赖系统安全区数值（部分机型横屏时返回 0）
const EDGE = 36;
const BTN_H = 38; // 顶栏按钮高度

Page({
  behaviors: [scoring],
  data: { land: true, bar: { top: 8, h: 32, l: EDGE, r: EDGE, capR: 110, bt: 5, bh: 38, H: 48 } },
  onShow() {
    if (!this.initScore()) return;
    enter(this);
    setTimeout(() => this.measureBar(), 350); // 等横屏旋转完成后再取胶囊位置
  },
  onResize() { this._step = 0; this.measureBar(); },
  measureBar() {
    const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const W = win.windowWidth, sa = win.safeArea || {};
    let cap = null; try { cap = wx.getMenuButtonBoundingClientRect(); } catch (e) {}
    const capOk = cap && cap.left > W / 2 && cap.left < W; // 胶囊坐标必须是横屏下的
    const l = Math.max(EDGE, (sa.left || 0) + 16);
    const r = Math.max(EDGE, (W - (sa.right || W)) + 16);
    const top = capOk ? cap.top : 10, h = capOk ? cap.height : 32;
    // 按钮比微信胶囊高一点（38px），和胶囊垂直居中对齐
    const bh = BTN_H, bt = Math.max(4, Math.round(top + h / 2 - bh / 2));
    this.setData({ bar: { top, h, l, r, capR: capOk ? W - cap.left + 10 : 120, bt, bh, H: Math.max(top + h, bt + bh) } });
    this._step = 0; setTimeout(() => this.measure(), 80);
  },
  /** 被自动保存了：回到竖屏记分页，由它提示 */
  onNoLive() { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/home' }) }); return true; },
  busy() { return !!(this.data.tu || this.data.banner); },
  /** 横屏点「结算」：转回竖屏，自动打开结算面板 */
  toFinish() { if (this.guard()) return; wx.vibrateShort({ type: 'light' }); this.endFromTimeUp(); },
  /** 时间到 →「结束比赛」：结算面板在竖屏页，回去打开 */
  endFromTimeUp() { getApp().globalData.openFin = true; this.back(); },
  onHide() { this.stopClock(); },
  onUnload() { sfx.stop(); this.stopClock(); },
  back() { wx.navigateBack(); },
});
