const scoring = require('../../behaviors/scoring');
const { enter } = require('../../utils/page');

// 横屏左右最小留白（px）：避开圆角和刘海，不依赖系统安全区数值（部分机型横屏时返回 0）
const EDGE = 36;

Page({
  behaviors: [scoring],
  data: { land: true, bar: { top: 8, h: 32, l: EDGE, r: EDGE, capR: 110 } },
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
    this.setData({ bar: { top: capOk ? cap.top : 10, h: capOk ? cap.height : 32, l, r, capR: capOk ? W - cap.left + 12 : 120 } });
    this._step = 0; setTimeout(() => this.measure(), 80);
  },
  onHide() { this.stopClock(); },
  onUnload() { this.stopClock(); },
  back() { wx.navigateBack(); },
});
