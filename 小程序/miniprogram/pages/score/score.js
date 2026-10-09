const scoring = require('../../behaviors/scoring');
const sfx = require('../../utils/sfx');
const { enter } = require('../../utils/page');
const store = require('../../utils/store');
const { ask, uiDone } = require('../../utils/ui');
const { derive, signed } = require('../../utils/engine');
const { clock } = require('../../utils/util');

Page({
  onUi(e) { uiDone(this, e.detail.k); },
  onUiClose() { uiDone(this, null); },
  behaviors: [scoring],
  data: { nav: {}, fin: { show: false }, coach: 0, coachTop: 300, ent: false },
  onLoad() { this.setData({ nav: getApp().globalData.nav }); },
  onShow() {
    if (!this.initScore()) return;
    enter(this);
    if (!store.get().settings.coachDone && !this._coached) { this._coached = true; setTimeout(() => this.startCoach(), 900); }
  },
  /* ---------- 首次使用引导（3 步） ---------- */
  startCoach() {
    this.createSelectorQuery().select('.pc').boundingClientRect(r => {
      this.setData({ coach: 1, coachTop: r ? r.bottom + 12 : 300 });
    }).exec();
  },
  nextCoach() {
    const k = this.data.coach;
    if (!k) return;
    if (k >= 3) { this.setData({ coach: 0 }); const s = store.get(); s.settings.coachDone = true; store.save(); return; }
    if (k === 1) {
      this.createSelectorQuery().select('.chips').boundingClientRect(r => this.setData({ coach: 2, coachTop: r ? r.bottom + 12 : 360 })).exec();
    } else this.setData({ coach: 3 });
  },
  onHide() { this.stopClock(); },
  onUnload() { sfx.stop(); this.stopClock(); wx.setKeepScreenOn({ keepScreenOn: false }); },
  back() { if (this.guard()) return; wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/home' }) }); },
  toLog() { if (this.guard()) return; wx.navigateTo({ url: '/pages/log/log' }); },
  toLand() { if (this.guard()) return; wx.navigateTo({ url: '/pages/land/land' }); },
  /* ---------- 结算面板 ---------- */
  finish() { if (this.guard()) return;
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
    this.setData({ 'fin.show': false });
    ask(this, { icon: 'warn', title: '确定不保存？', desc: `本场 ${this.data.fin.logs} 条记分会被清除，不计入战绩，无法恢复。`,
      actions: [{ k: 'drop', t: '不保存，直接结束', type: 'danger' }, { k: 'back', t: '再想想', type: 'plain' }] })
      .then(k => {
        if (k === 'drop') { store.discardLive(); this.stopClock(); wx.showToast({ title: '已结束，未保存', icon: 'none' }); setTimeout(() => this.back(), 600); }
        else this.setData({ 'fin.show': true });
      });
  },
});
