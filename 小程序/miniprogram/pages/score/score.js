const scoring = require('../../behaviors/scoring');
const store = require('../../utils/store');
const { derive, signed } = require('../../utils/engine');
const { clock } = require('../../utils/util');

Page({
  behaviors: [scoring],
  data: { nav: {}, fin: { show: false } },
  onLoad() { this.setData({ nav: getApp().globalData.nav }); },
  onShow() { this.initScore(); },
  onHide() { this.stopClock(); },
  onUnload() { this.stopClock(); wx.setKeepScreenOn({ keepScreenOn: false }); },
  back() { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/home' }) }); },
  toLog() { wx.navigateTo({ url: '/pages/log/log' }); },
  toLand() { wx.navigateTo({ url: '/pages/land/land' }); },
  /* ---------- 结算面板 ---------- */
  finish() {
    const m = this.m, D = derive(m), sec = (Date.now() - m.start) / 1000;
    const rank = m.players.map((id, i) => ({ ...store.view(id), s: D.scores[i] })).sort((a, b) => b.s - a.s)
      .map((r, k) => ({ ...r, no: k + 1, txt: signed(r.s), cls: r.s > 0 ? 'pos' : r.s < 0 ? 'neg' : '', top: k === 0 && r.s > 0 }));
    this.setData({ fin: { show: true, empty: !m.events.length, rounds: D.round - 1, logs: m.events.length, dur: clock(sec), rank } });
  },
  closeFin() { this.setData({ 'fin.show': false }); },
  saveFin() {
    this.stopClock();
    const m = store.finishLive();
    this.setData({ 'fin.show': false });
    if (m) wx.redirectTo({ url: '/pages/result/result?id=' + m.id });
    else this.back();
  },
  discardFin() {
    if (this.data.fin.empty) { store.discardLive(); this.stopClock(); this.back(); return; }
    wx.showModal({
      title: '确定不保存？', content: `本场 ${this.data.fin.logs} 条记分会被清除，不计入战绩，无法恢复。`,
      confirmText: '不保存', cancelText: '再想想', confirmColor: '#F0444D',
      success: r => {
        if (!r.confirm) return;
        store.discardLive(); this.stopClock(); this.setData({ 'fin.show': false });
        wx.showToast({ title: '已结束，未保存', icon: 'none' });
        setTimeout(() => this.back(), 600);
      },
    });
  },
});
