const store = require('../../utils/store');
const { EV, MAIN, PAY, FOULTO } = require('../../utils/engine');

Page({
  data: { mode: 2, slots: [], lack: 0, rules: [], sheet: false, free: [], newName: '', vib: true, keep: true },
  onShow() {
    if (!store.get().draft) store.newDraft(2, []);
    this.render();
  },
  render() {
    const s = store.get(), d = s.draft;
    wx.setNavigationBarTitle({ title: d.mode === 2 ? '双人追分' : '三人追分' });
    this.setData({
      mode: d.mode,
      slots: d.slots.map((id, i) => ({ ...store.view(id), no: i + 1, first: i === 0 })),
      lack: d.mode - d.slots.length,
      rules: MAIN.map(k => ({ k, name: EV[k].name, c: EV[k].c, t: EV[k].t, v: (k === 'foul' ? '−' : '+') + d.rules[k].v,
        pay: d.mode === 3 ? (k === 'foul' ? FOULTO[d.rules[k].pay] : PAY[d.rules[k].pay]) : '' })),
      free: store.activeFriends().filter(f => !d.slots.includes(f.id)).map(f => store.view(f.id)),
      vib: s.settings.vib, keep: s.settings.keep,
    });
  },
  setMode(e) {
    const n = +e.currentTarget.dataset.n, d = store.get().draft;
    if (d.mode === n) return;
    d.mode = n; d.slots = d.slots.slice(0, n);
    this.render();
  },
  remove(e) { store.get().draft.slots.splice(+e.currentTarget.dataset.i, 1); this.render(); },
  openSheet() { this.setData({ sheet: true, newName: '' }); },
  closeSheet() { this.setData({ sheet: false }); },
  noop() {},
  pick(e) {
    const d = store.get().draft;
    if (d.slots.length < d.mode) d.slots.push(e.currentTarget.dataset.id);
    this.render();
    if (d.slots.length >= d.mode) this.setData({ sheet: false });
  },
  onName(e) { this.setData({ newName: e.detail.value }); },
  onFocus() { this.setData({ nf: true }); },
  onBlur() { this.setData({ nf: false }); },
  addNew() {
    const name = (this.data.newName || '').trim();
    if (!name) { wx.showToast({ title: '请输入名字', icon: 'none' }); return; }
    const id = store.addFriend(name.slice(0, 8));
    this.pick({ currentTarget: { dataset: { id } } });
    this.setData({ newName: '' });
  },
  /** 随机开球顺序：快速轮换几次再定下来，像抽签 */
  shuffle() {
    const d = store.get().draft;
    if (d.mode !== 3 || this._shuf) return;
    if (d.slots.length < 2) { wx.showToast({ title: '先添加至少 2 位球员', icon: 'none' }); return; }
    this._shuf = true;
    const mix = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
    let k = 0;
    const tick = () => {
      d.slots = mix(d.slots);
      this.render(); this.setData({ rolling: true });
      if (store.get().settings.vib) wx.vibrateShort({ type: 'light' });
      if (++k < 7) { setTimeout(tick, 70 + k * 18); return; }
      this._shuf = false;
      this.setData({ rolling: false, landed: true });
      setTimeout(() => this.setData({ landed: false }), 700);
      wx.showToast({ title: `${store.friend(d.slots[0]).name} 先开球`, icon: 'none' });
    };
    tick();
  },
  toRules() { wx.navigateTo({ url: '/pages/rules/rules' }); },
  toggle(e) {
    const k = e.currentTarget.dataset.k, s = store.get();
    s.settings[k] = !s.settings[k]; store.save();
    this.setData({ [k]: s.settings[k] });
  },
  start() {
    if (this.data.lack > 0) { this.openSheet(); return; }
    const s = store.get();
    const go = () => { store.startLive(); wx.redirectTo({ url: '/pages/score/score' }); };
    if (s.live && s.live.events.length) {
      wx.showActionSheet({
        alertText: '还有一局没结算，先处理一下它',
        itemList: ['保存旧局战绩，开新局', '不保存旧局，开新局', '回去继续打旧局'],
        success: r => {
          if (r.tapIndex === 0) { store.finishLive(); go(); }
          else if (r.tapIndex === 1) {
            wx.showModal({ title: '确定不保存旧局？', content: '旧局的记分会被清除，不计入战绩，无法恢复。', confirmText: '不保存', cancelText: '再想想', confirmColor: '#F0444D',
              success: m => { if (m.confirm) { store.discardLive(); go(); } } });
          } else wx.redirectTo({ url: '/pages/score/score' });
        },
      });
    } else go();
  },
});
