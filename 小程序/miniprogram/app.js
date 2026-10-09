const { navMetrics } = require('./utils/util');
App({
  globalData: { nav: null, lite: false, lastTab: 0 },
  onLaunch() {
    this.globalData.nav = navMetrics();
    this.detectLite();
  },
  /** 低端安卓机关掉模糊（玻璃效果改成半透明纯色），避免掉帧 */
  detectLite() {
    try {
      const info = wx.getSystemInfoSync();
      if (info.platform === 'android' && info.benchmarkLevel >= 0 && info.benchmarkLevel < 20) this.globalData.lite = true;
    } catch (e) {}
    if (wx.getDeviceBenchmarkInfo) {
      wx.getDeviceBenchmarkInfo({ success: r => { if (r.modelLevel === 3) this.globalData.lite = true; } });
    }
  },
});
