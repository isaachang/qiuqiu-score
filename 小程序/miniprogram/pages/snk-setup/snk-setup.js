// 斯诺克 · 新对局：对阵（选人 / 开球 / 让分）→ 赛制 → 红球与积分
const store = require('../../utils/store');
const nav = require('../../utils/nav');
const idle = require('../../utils/idle');
const SN = require('../../utils/snooker');
const { liveUrl } = require('../../utils/game');
const { enter, onScroll } = require('../../utils/page');
const { ask, uiDone } = require('../../utils/ui');

const HC_MAX = 50;          // 滑杆范围：每人最多 +50
const QUICK = [5, 10, 15, 20, 30, 50];

Page({
  data: { ent: false, scrolled: false, P: [], hv: 0, drag: false, picker: { show: false }, custom: { show: false },
    bests: [{ v: 1, big: '1', small: '局定胜负' }, { v: 3, big: '3', small: '局 2 胜' }, { v: 5, big: '5', small: '局 3 胜' }, { v: 7, big: '7', small: '局 4 胜' }],
    redOpts: [15, 10, 6], quick: QUICK },
  onUi(e) { uiDone(this, e.detail.k); },
  onUiClose() { uiDone(this, null); },
  onPageScroll(e) { onScroll(this, e); },
  onShow() { enter(this); this.render(); },
  onReady() { setTimeout(() => this.measure(), 300); },
  render() {
    const d = store.snkDraft(), c = d.cfg;
    if (c.hc.p >= 0 && !d.players[c.hc.p]) { c.hc = { p: -1, pts: 0 }; store.save(); } // 被让分的位置空了：让分归零
    const hv = c.hc.p < 0 || !c.hc.pts ? 0 : c.hc.p === 0 ? -c.hc.pts : c.hc.pts;
    const P = d.players.map((id, k) => (id ? { ...store.view(id), k } : { k, empty: true, name: '', c: '#C9C6BF', i: '#fff' })); // 空位也是对象，列表 key 才稳定
    this.setData({
      P,
      first: c.first, bestOf: c.bestOf, reds: c.reds, max: SN.maxBreak(c.reds),
      balls: SN.BALLS.map(b => ({ k: b.k, c: b.c, v: b.v })),
      lack: d.players.filter(x => !x).length,
      ...this.hcView(hv, P),
    }, () => this.measure());
  },
  /** 让分：负数 = 左边选手加分，正数 = 右边选手加分 */
  hcView(hv, P) {
    P = P || this.data.P;
    const who = hv < 0 ? 0 : 1, p = hv ? P[who] : null, col = p && !p.empty ? p.c : '#A9A9B0';
    const k = (hv + HC_MAX) / (HC_MAX * 2), k0 = 0.5;
    const pad = 46 * (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).windowWidth / 750; // 滑块半径 46rpx → px
    const pos = x => `calc(${pad.toFixed(2)}px + (100% - ${(pad * 2).toFixed(2)}px) * ${x.toFixed(4)})`;
    return {
      hv, hAbs: Math.abs(hv), hCol: col,
      hLbl: hv ? `${p && !p.empty ? p.name : '?'} 每局 +${Math.abs(hv)}` : '', // 没有让分时这里不显示文字
      thumb: `left:${pos(k)};--tc:${col}`,
      fill: hv ? `left:${pos(Math.min(k, k0))};right:calc(100% - ${pos(Math.max(k, k0))});background:${col}` : 'opacity:0',
      start: [hv < 0 ? -hv : 0, hv > 0 ? hv : 0],
    };
  },
  saveHc(hv) {
    const c = store.snkDraft().cfg;
    c.hc = hv ? { p: hv < 0 ? 0 : 1, pts: Math.abs(hv) } : { p: -1, pts: 0 };
    store.save();
  },

  /* ---------- 让分滑杆：1 分一档，拖动时显示数字气泡，每变一分轻震一下 ---------- */
  measure() {
    this.createSelectorQuery().select('#trk').boundingClientRect(r => { if (r) this._trk = r; }).exec();
  },
  hcAt(x) {
    const r = this._trk; if (!r) return this.data.hv;
    const ww = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).windowWidth;
    const pad = 46 * ww / 750; // 滑块半径 46rpx 换算成 px
    let k = (x - r.left - pad) / (r.width - pad * 2); k = Math.max(0, Math.min(1, k));
    return Math.round(k * HC_MAX * 2 - HC_MAX);
  },
  onTs(e) {
    if (!this._trk) this.measure();
    const t = e.touches && e.touches[0], r = this._trk;
    this._t0 = t ? t.clientX : 0; this._moved = false; this._onThumb = false;
    if (t && r) {
      const ww = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).windowWidth, pad = 46 * ww / 750;
      const k = (this.data.hv + HC_MAX) / (HC_MAX * 2), cx = r.left + pad + (r.width - pad * 2) * k;
      this._onThumb = Math.abs(t.clientX - cx) <= pad * 1.15;
    }
    this.setData({ drag: true });
    if (!this._onThumb) this.onTm(e, true); // 按在轨道上：直接跳过去
  },
  onTm(e, jump) {
    const t = e.touches && e.touches[0]; if (!t) return;
    if (!jump && !this._moved) { if (Math.abs(t.clientX - this._t0) < 6) return; this._moved = true; }
    const hv = this.hcAt(t.clientX);
    if (hv === this.data.hv) return;
    const now = Date.now();
    if (store.get().settings.vib && now - (this._vt || 0) > 35) { this._vt = now; wx.vibrateShort({ type: 'light' }); }
    this.setData(this.hcView(hv));
  },
  onTe() {
    if (this._onThumb && !this._moved && this.data.hv) { // 点一下圆钮：归零
      if (store.get().settings.vib) wx.vibrateShort({ type: 'medium' });
      this.setData({ drag: false, ...this.hcView(0) }); this.saveHc(0); return;
    }
    this.setData({ drag: false }); this.saveHc(this.data.hv);
  },
  onTc() { this.setData({ drag: false }); this.saveHc(this.data.hv); },

  /* ---------- 自定义让分 ---------- */
  openCustom() {
    if (this.data.lack) { wx.showToast({ title: '先选好两位球员', icon: 'none' }); return; }
    const hv = this.data.hv;
    this.setData({ custom: { show: true, who: hv < 0 ? 0 : 1, pts: Math.abs(hv) || 10 } });
  },
  closeCustom() { this.stopRep(); this.setData({ 'custom.show': false }); },
  cWho(e) { this.setData({ 'custom.who': +e.currentTarget.dataset.i }); },
  cPick(e) { this.setData({ 'custom.pts': +e.currentTarget.dataset.v }); },
  step(d) {
    const v = Math.max(0, Math.min(99, this.data.custom.pts + d));
    if (v === this.data.custom.pts) return;
    if (store.get().settings.vib) wx.vibrateShort({ type: 'light' });
    this.setData({ 'custom.pts': v });
  },
  cMinus() { this.step(-1); },
  cPlus() { this.step(1); },
  /** 长按 ± 连续加减 */
  repMinus() { this.startRep(-1); },
  repPlus() { this.startRep(1); },
  startRep(d) { this.stopRep(); let n = 0; this._rep = setInterval(() => { this.step(d * (++n > 10 ? 5 : 1)); }, 110); },
  stopRep() { if (this._rep) clearInterval(this._rep); this._rep = null; },
  okCustom() {
    const { who, pts } = this.data.custom, hv = pts ? (who === 0 ? -pts : pts) : 0;
    this.stopRep();
    this.saveHc(hv);
    this.setData({ 'custom.show': false, ...this.hcView(hv) });
  },

  /* ---------- 选人 ---------- */
  openPick(e) {
    const i = +e.currentTarget.dataset.i, d = store.snkDraft(), other = d.players[1 - i];
    this.setData({ picker: { show: true, i, has: !!d.players[i], list: store.activeFriends().filter(f => f.id !== other).map(f => ({ ...store.view(f.id), sel: f.id === d.players[i] })) }, newName: '' });
  },
  closePick() { this.setData({ 'picker.show': false }); },
  pick(e) {
    const d = store.snkDraft(), i = this.data.picker.i, id = e.currentTarget.dataset.id;
    if (d.players[i] === id) { this.unpick(); return; } // 已选中的再点一下：移出
    d.players[i] = id; store.save();
    if (store.get().settings.vib) wx.vibrateShort({ type: 'light' });
    this.setData({ 'picker.show': false });
    this.render();
  },
  /** 移出对阵：这个位置变回空位，让分归零 */
  unpick() {
    const d = store.snkDraft(), i = this.data.picker.i;
    d.players[i] = null; d.cfg.hc = { p: -1, pts: 0 }; store.save();
    if (store.get().settings.vib) wx.vibrateShort({ type: 'light' });
    this.setData({ 'picker.show': false });
    this.render();
  },
  onName(e) { this.setData({ newName: e.detail.value }); },
  onFocus() { this.setData({ nf: true }); },
  onBlur() { this.setData({ nf: false }); },
  addNew() {
    if (this._adding) return; this._adding = true; setTimeout(() => { this._adding = false; }, 600);
    const name = (this.data.newName || '').trim();
    if (!name) { wx.showToast({ title: '请输入名字', icon: 'none' }); return; }
    const id = store.addFriend(name.slice(0, 8));
    this.pick({ currentTarget: { dataset: { id } } });
  },
  setBest(e) { const c = store.snkDraft().cfg; c.bestOf = +e.currentTarget.dataset.v; store.save(); this.setData({ bestOf: c.bestOf }); },
  setReds(e) { const c = store.snkDraft().cfg; c.reds = +e.currentTarget.dataset.v; store.save(); this.setData({ reds: c.reds, max: SN.maxBreak(c.reds) }); },
  noop() {},

  /* ---------- 开始 ---------- */
  start() {
    if (this.data.lack) { this.openPick({ currentTarget: { dataset: { i: store.snkDraft().players[0] ? 1 : 0 } } }); return; }
    if (idle.check()) { getApp().globalData.autoSaved = null; wx.showToast({ title: '上一局已自动保存', icon: 'none' }); }
    store.snkDraft().cfg.first = 0; // 左边的选手开第一局，之后每局轮换
    const s = store.get(), go = () => { store.startSnk(); nav.redirect('/pages/snk-score/snk-score'); };
    if (!s.live) { go(); return; }
    // 还有一局没结算
    const L = s.live, empty = !L.events.length;
    ask(this, { icon: 'warn', title: empty ? '有一局正在进行' : '还有一局没结算', desc: `${L.game === 'snooker' ? '斯诺克' : (L.mode === 2 ? '双人' : '三人') + '追分'} · ${L.players.map(id => store.friend(id).name).join(' · ')}`,
      actions: [
        ...(empty ? [] : [{ k: 'save', t: '保存旧局，开新局', type: 'pri' }]),
        { k: 'cont', t: '继续旧局', type: 'plain' },
        { k: 'drop', t: empty ? '开新局' : '不保存，开新局', type: empty ? 'pri' : 'danger' },
      ] })
      .then(k => {
        if (k === 'save') { store.finishLive(); go(); }
        else if (k === 'cont') nav.redirect(liveUrl(L));
        else if (k === 'drop') {
          if (empty) { store.discardLive(); go(); return; }
          ask(this, { icon: 'warn', title: '确定不保存旧局？', desc: `旧局 ${L.events.length} 条记录会被清除，无法恢复。`,
            actions: [{ k: 'y', t: '不保存，开新局', type: 'danger' }, { k: 'n', t: '再想想', type: 'plain' }] })
            .then(k2 => { if (k2 === 'y') { store.discardLive(); go(); } });
        }
      });
  },
});
