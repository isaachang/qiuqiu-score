const store = require('../../utils/store');
const { derive, signed } = require('../../utils/engine');
const { clock } = require('../../utils/util');
const { enter, onScroll } = require('../../utils/page');
const { EV, MAIN, PAY, FOULTO } = require('../../utils/engine');

Page({
  data: { mode: 2, slots: [], lack: 0, rules: [], sheet: false, free: [], newName: '', vib: true, keep: true },
  onPageScroll(e) { onScroll(this, e); },
  onShow() {
    enter(this);
    if (!store.get().draft) store.newDraft(2, []);
    this.render();
  },
  render() {
    const s = store.get(), d = s.draft;
    this.setData({ navTitle: d.mode === 2 ? '双人追分' : '三人追分' });
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
    const go = this.go = () => { store.startLive(); wx.redirectTo({ url: '/pages/score/score' }); };
    if (s.live) this.openOld();
    else go();
  },
  /* ---------- 旧局未结算：自定义面板（替代微信自带的选项框） ---------- */
  openOld() {
    const L = store.get().live, D = derive(L);
    const players = L.players.map((id, i) => ({ ...store.view(id), s: signed(D.scores[i]), cls: D.scores[i] > 0 ? 'pos' : D.scores[i] < 0 ? 'neg' : '' }));
    this.setData({ old: { show: true, confirm: false, empty: !L.events.length, mode: L.mode === 2 ? '双人' : '三人', rounds: D.round - 1, logs: L.events.length, dur: clock((Date.now() - L.start) / 1000), players } });
  },
  closeOld() { this.setData({ 'old.show': false }); },
  saveOld() { wx.vibrateShort({ type: 'light' }); store.finishLive(); this.setData({ 'old.show': false }); this.go(); },
  askDiscard() { wx.vibrateShort({ type: 'light' }); this.setData({ 'old.confirm': true }); },
  backFromDiscard() { this.setData({ 'old.confirm': false }); },
  discardOld() { store.discardLive(); this.setData({ 'old.show': false }); this.go(); },
  continueOld() { this.setData({ 'old.show': false }); wx.redirectTo({ url: '/pages/score/score' }); },
});
