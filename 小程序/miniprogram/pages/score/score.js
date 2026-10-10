const scoring = require('../../behaviors/scoring');
const sfx = require('../../utils/sfx');
const { enter } = require('../../utils/page');
const store = require('../../utils/store');
const nav = require('../../utils/nav');
const { ask, uiDone } = require('../../utils/ui');
const { derive, signed, isDraw, played } = require('../../utils/engine');
const { clock } = require('../../utils/util');
const idle = require('../../utils/idle');

Page({
  onUi(e) { uiDone(this, e.detail.k); },
  onUiClose() { uiDone(this, null); },
  behaviors: [scoring],
  data: { nav: {}, fin: { show: false }, coach: 0, coachTop: 300, ent: false },
  onLoad() { this.setData({ nav: getApp().globalData.nav }); },
  onShow() {
    if (!this.initScore()) return;
    enter(this);
    const g = getApp().globalData;
    if (g.openFin) { g.openFin = false; setTimeout(() => this.finish(), 450); } // 横屏点了「结算」/「结束比赛」：等转回竖屏再弹
    // 双人、三人各自第一次进来都引导一次（三步）
    if (!store.get().settings['coach' + this.m.players.length] && !this._coached) { this._coached = true; setTimeout(() => this.startCoach(), 900); }
  },
  /* ---------- 首次使用引导（3 步） ---------- */
  startCoach() {
    this.createSelectorQuery().select('.pc').boundingClientRect(r => {
      this.setData({ coach: 1, coachTop: this.clampTop(r ? r.bottom + 12 : 300) });
    }).exec();
  },
  /** 说明气泡别跑出屏幕（双人局卡片很高） */
  clampTop(y) { const H = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).windowHeight || 700; return Math.min(y, H - 260); },
  nextCoach() {
    const k = this.data.coach;
    if (!k) return;
    if (k >= 3) { this.setData({ coach: 0 }); const s = store.get(); s.settings['coach' + this.m.players.length] = true; store.save(); return; }
    if (k === 1) {
      this.createSelectorQuery().select('.chips').boundingClientRect(r => this.setData({ coach: 2, coachTop: this.clampTop(r ? r.bottom + 12 : 360) })).exec();
    } else this.setData({ coach: 3 });
  },
  /** 这局刚被自动保存（30 分钟没操作）：提示一下，可以看战报或继续打 */
  onNoLive() { return idle.notice(this, { redirect: true, onResume: () => this.onShow(), onClose: () => this.back() }); },
  busy() { const d = this.data; return !!(d.fin.show || (d.ui && d.ui.show) || d.tu || d.coach || d.banner); },
  /** 时间到 →「结束比赛」：打开结算面板 */
  endFromTimeUp() { setTimeout(() => this.finish(), 280); },
  onHide() { this.stopClock(); },
  onUnload() { sfx.stop(); this.stopClock(); wx.setKeepScreenOn({ keepScreenOn: false }); },
  back() { if (this.guard()) return; wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/home' }) }); },
  toLog() { if (this.guard()) return; nav.to('/pages/log/log'); },
  toLand() { if (this.guard()) return; nav.to('/pages/land/land'); },
  /* ---------- 结算面板 ---------- */
  finish() {
    this._saving = false; if (this.guard() || !this.m) return;
    const m = this.m, D = derive(m), sec = played(m) / 1000, draw = isDraw(D.scores);
    const rank = m.players.map((id, i) => ({ ...store.view(id), s: D.scores[i] })).sort((a, b) => b.s - a.s)
      .map((r, k) => ({ ...r, no: 1 + D.scores.filter(x => x > r.s).length, txt: signed(r.s), cls: r.s > 0 ? 'pos' : r.s < 0 ? 'neg' : '', top: k === 0 && !draw })); // 同分同名次
    this.setData({ fin: { show: true, empty: !m.events.length, rounds: D.round - 1, logs: m.events.length, dur: clock(sec), rank } });
  },
  closeFin() { this.setData({ 'fin.show': false }); },
  saveFin() {
    if (this._saving) return; this._saving = true; // 防连点：避免保存后又被第二次点击带回首页
    this.stopClock();
    const m = store.finishLive();
    this.setData({ 'fin.show': false });
    if (m) nav.redirect('/pages/result/result?id=' + m.id);
    else this.back();
  },
  discardFin() {
    if (this._saving) return;
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
