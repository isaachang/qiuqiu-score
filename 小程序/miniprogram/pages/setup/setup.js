const store = require('../../utils/store');
const nav = require('../../utils/nav');
const idle = require('../../utils/idle');
const { isDev } = require('../../utils/env');
const { derive, signed, played } = require('../../utils/engine');
const { clock } = require('../../utils/util');
const { enter, onScroll } = require('../../utils/page');
const { EV, MAIN, PAY, FOULTO } = require('../../utils/engine');

// 限时比赛：常用时长一键选；其它时长点「自定义」用滚轮选（时 + 分，5 分钟一档）
const PRESETS = [30, 60, 90, 120];
const TEST_MS = 5000; // 【临时测试】上线前删除：5 秒后到点
const fmtMin = m => { const h = m / 60 | 0, r = m % 60; return h ? (r ? `${h}时${r}分` : `${h}小时`) : `${r}分`; };

Page({
  data: { mode: 2, slots: [], lack: 0, rules: [], sheet: false, free: [], newName: '', vib: true, keep: true,
    limOn: false, limit: 60, limOpts: PRESETS.map(m => ({ m, t: m < 60 ? m + '分' : m / 60 + '小时' })), custom: false, customTxt: '自定义',
    cs: false, pv: [1, 0], hours: Array.from({ length: 10 }, (_, k) => k), mins: Array.from({ length: 12 }, (_, k) => k * 5) },
  onPageScroll(e) { onScroll(this, e); },
  onShow() {
    enter(this);
    if (this.data.dev !== isDev()) this.setData({ dev: isDev() }); // 【测试】按钮只在开发版出现
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
    if (d.limit === TEST_MS) { this.setData({ limOn: true, limit: -1, custom: false, customTxt: '自定义' }); return; } // 【临时测试】
    this.showLimit(d.limit ? d.limit / 6e4 : (PRESETS.includes(s.settings.limit) ? s.settings.limit : 60), !!d.limit); // 只记住上次选的常用时长；自定义的每局重新选
  },
  showLimit(m, on) {
    const custom = !PRESETS.includes(m);
    this.setData({ limit: m, custom, customTxt: custom ? fmtMin(m) : '自定义', ...(on == null ? {} : { limOn: on }) });
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
    const id = e.currentTarget.dataset.id;
    if (d.slots.length < d.mode && !d.slots.includes(id)) d.slots.push(id);
    this.render();
    if (d.slots.length >= d.mode) this.setData({ sheet: false });
  },
  onName(e) { this.setData({ newName: e.detail.value }); },
  onFocus() { this.setData({ nf: true }); },
  onBlur() { this.setData({ nf: false }); },
  addNew() {
    if (this._adding) return; // 按钮和键盘「完成」可能同时触发，或被双击
    this._adding = true; setTimeout(() => { this._adding = false; }, 600);
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
  /* 限时比赛（默认关闭）：到时间只提醒，不会自动结算 */
  /** 【临时测试】上线前删除 */
  pickTest() { if (!this.data.limOn || !isDev()) return; store.get().draft.limit = TEST_MS; wx.vibrateShort({ type: 'light' }); this.setData({ limit: -1, custom: false, customTxt: '自定义' }); },
  toggleLimit(e) {
    const d = store.get().draft, on = e.detail.value;
    if (this.data.limit === -1) this.setData({ limit: 60 });
    d.limit = on ? this.data.limit * 6e4 : 0;
    this.setData({ limOn: on });
  },
  pickLimit(e) { if (this.data.limOn) this.setLimit(+e.currentTarget.dataset.m); },
  setLimit(m) {
    const s = store.get();
    s.draft.limit = m * 6e4; s.settings.limit = m; store.save();
    if (s.settings.vib) wx.vibrateShort({ type: 'light' });
    this.showLimit(m);
  },
  /* 自定义时长：苹果计时器那样的滚轮 */
  openCustom() {
    if (!this.data.limOn) return;
    const m = this.data.limit;
    this._pv = [Math.min(9, m / 60 | 0), Math.round(m % 60 / 5) % 12];
    this.setData({ cs: true, pv: this._pv, pvZero: !(this._pv[0] || this._pv[1]) });
  },
  onPv(e) { this._pv = e.detail.value; const z = !(this._pv[0] || this._pv[1]); if (z !== this.data.pvZero) this.setData({ pvZero: z }); },
  closeCustom() { this.setData({ cs: false }); },
  okCustom() {
    const [h, k] = this._pv || this.data.pv, m = h * 60 + k * 5;
    if (!m) return; // 0 分钟：按钮是灰的，提示「至少 5 分钟」
    this.setData({ cs: false });
    this.setLimit(m);
  },
  toRules() { nav.to('/pages/rules/rules'); },
  toggle(e) {
    const k = e.currentTarget.dataset.k, s = store.get();
    s.settings[k] = !s.settings[k]; store.save();
    this.setData({ [k]: s.settings[k] });
  },
  start() {
    if (this.data.lack > 0) { this.openSheet(); return; }
    if (idle.check()) { getApp().globalData.autoSaved = null; wx.showToast({ title: '上一局已自动保存', icon: 'none' }); } // 旧局太久没动：直接存进战绩
    const s = store.get();
    const go = this.go = () => { store.startLive(); nav.redirect('/pages/score/score'); };
    if (s.live) this.openOld();
    else go();
  },
  /* ---------- 旧局未结算：自定义面板（替代微信自带的选项框） ---------- */
  openOld() {
    this._oldDone = false;
    const L = store.get().live, D = derive(L);
    const players = L.players.map((id, i) => ({ ...store.view(id), s: signed(D.scores[i]), cls: D.scores[i] > 0 ? 'pos' : D.scores[i] < 0 ? 'neg' : '' }));
    this.setData({ old: { show: true, confirm: false, empty: !L.events.length, mode: L.mode === 2 ? '双人' : '三人', rounds: D.round - 1, logs: L.events.length, dur: clock(played(L) / 1000), players } });
  },
  closeOld() { this.setData({ 'old.show': false }); },
  saveOld() { if (this._oldDone) return; this._oldDone = true; wx.vibrateShort({ type: 'light' }); store.finishLive(); this.setData({ 'old.show': false }); this.go(); },
  askDiscard() { wx.vibrateShort({ type: 'light' }); this.setData({ 'old.confirm': true }); },
  backFromDiscard() { this.setData({ 'old.confirm': false }); },
  discardOld() { if (this._oldDone) return; this._oldDone = true; store.discardLive(); this.setData({ 'old.show': false }); this.go(); },
  continueOld() { if (this._oldDone) return; this._oldDone = true; this.setData({ 'old.show': false }); nav.redirect('/pages/score/score'); },
});
