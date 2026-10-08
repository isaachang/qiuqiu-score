const store = require('../../utils/store');
const { EV, MAIN, DEFAULT_RULES } = require('../../utils/engine');

Page({
  data: { mode: 2, list: [] },
  onLoad(q) { this.isDefault = q.target === 'default' || !store.get().draft; if (this.isDefault) wx.setNavigationBarTitle({ title: '默认计分规则' }); },
  onShow() { this.render(); },
  rules() { const s = store.get(); return this.isDefault ? s.defaultRules : s.draft.rules; },
  render() {
    const R = this.rules(), mode = this.isDefault ? 3 : store.get().draft.mode;
    this.setData({
      isDefault: !!this.isDefault, mode,
      list: MAIN.map(k => {
        const opts = k === 'foul' ? [['up', '给上家'], ['down', '给下家']] : [['up', '上家付'], ['all', '两家付']];
        const idx = Math.max(0, opts.findIndex(o => o[0] === R[k].pay));
        return { k, name: EV[k].name, desc: EV[k].desc, c: EV[k].c, t: EV[k].t, v: (k === 'foul' ? '−' : '+') + R[k].v,
          payLabel: k === 'foul' ? '扣的分' : '由谁付分', opts: opts.map(([v, l]) => ({ v, l, on: v === R[k].pay })), idx };
      }),
    });
  },
  step(e) {
    const { k, d } = e.currentTarget.dataset, R = this.rules();
    // 犯规显示为负数（−1），按钮方向跟着显示的数字走：点「−」变成 −2，点「+」回到 −1
    const delta = k === 'foul' ? -(+d) : +d;
    const nv = Math.max(1, Math.min(30, R[k].v + delta));
    if (nv === R[k].v) return;
    R[k].v = nv;
    if (this.isDefault) { store.save(); wx.showToast({ title: `已保存：${EV[k].name} ${k === 'foul' ? '−' : '+'}${nv}`, icon: 'none' }); }
    this.render();
  },
  pay(e) { const { k, v } = e.currentTarget.dataset; this.rules()[k].pay = v; if (this.isDefault) store.save(); this.render(); },
  reset() { const s = store.get(); if (this.isDefault) { s.defaultRules = DEFAULT_RULES(); store.save(); } else s.draft.rules = DEFAULT_RULES(); this.render(); wx.showToast({ title: '已恢复默认', icon: 'success' }); },
  saveDefault() {
    const s = store.get(); s.defaultRules = JSON.parse(JSON.stringify(s.draft.rules)); store.save();
    wx.showToast({ title: '已设为默认', icon: 'success' });
  },
});
