// 球球记分 · 记分逻辑（竖屏 / 横屏共用的 Behavior）
const store = require('../utils/store');
const { EV, CHIPS, derive, signed } = require('../utils/engine');
const { clock } = require('../utils/util');
const sfx = require('../utils/sfx');

let flySeq = 1;

module.exports = Behavior({
  data: { risen: false, n: 2, players: [], round: 1, clock: '00:00:00', order: [], flies: [], parts: [], banner: null, chips: [], hintIntro: true },

  methods: {
    initScore() {
      const s = store.get();
      this.m = s.live;
      if (!this.m) { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/home' }) }); return false; }
      const m = this.m;
      this.setData({
        lite: !!(getApp().globalData || {}).lite,
        n: m.players.length,
        chips: CHIPS.map(k => ({ k, name: EV[k].name, v: (k === 'foul' ? '−' : '+') + m.rules[k].v, c: EV[k].c, t: EV[k].t })),
        puV: m.rules.pu.v,
      });
      this.refresh(null);
      if (s.settings.keep) wx.setKeepScreenOn({ keepScreenOn: true });
      sfx.preload();
      this.startClock();
      setTimeout(() => this.setData({ hintIntro: false }), 2400);
      // 入场动画播完后从卡片上拿掉：否则犯规震动结束时，入场动画会被重新触发（卡片闪白、从下往上再浮现一次）
      if (!this.data.risen) setTimeout(() => this.setData({ risen: true }), 1400);
      return true;
    },
    startClock() {
      this.stopClock();
      const tick = () => this.m && this.setData({ clock: clock((Date.now() - this.m.start) / 1000) });
      tick(); this._clk = setInterval(tick, 1000);
    },
    stopClock() { if (this._clk) clearInterval(this._clk); this._clk = null; },

    /** 由事件重算全部显示数据；step 不为空时播放该次计分的动效 */
    refresh(step) {
      const m = this.m, D = derive(m), n = m.players.length;
      const seq = n === 3 ? D.order : m.players.map((_, i) => i); // 渲染顺序（座位下标）
      const prev = this._seq || seq;
      this._seq = seq;
      this.pos = {}; seq.forEach((p, r) => { this.pos[p] = r; });
      const max = Math.max(...D.scores), sorted = [...D.scores].sort((a, b) => b - a), lead = sorted[0] - sorted[1];
      const old = {}; (this.data.players || []).forEach(p => { old[p.idx] = p; });
      const moved = n === 3 && this._step && prev.some((p, r) => seq[r] !== p);
      const players = seq.map((i, r) => {
        const id = m.players[i], v = store.view(id), sc = D.scores[i], pos = D.order.indexOf(i);
        const d = moved ? (prev.indexOf(i) - r) * this._step : 0;
        return {
          ...v, idx: i, score: sc, neg: sc < 0,
          mv: d ? `transform:translate${this.data.land ? 'X' : 'Y'}(${d}px);transition:none;` : '',
          digits: String(Math.abs(sc)).split('').map(Number),
          role: pos === 0 ? '开球' : n === 3 ? `第${pos + 1}位` : '后手', brk: pos === 0,
          leader: sc === max && lead > 0, lead,
          cnt: D.stats[i],
          fx: (old[i] && old[i].fx) || '',
        };
      });
      const order = D.order.map((p, k) => ({ ...store.view(m.players[p]), first: k === 0 }));
      this.setData({ players, round: D.round, order }, () => {
        if (moved) setTimeout(() => {
          const up = {}; players.forEach((p, r) => { if (p.mv) up[`players[${r}].mv`] = 'transform:none;transition:transform .55s cubic-bezier(.3,1.25,.5,1);'; });
          this.setData(up);
        }, 30);
        if (n === 3 && !this._step) this.measure();
      });
      if (step) this.effects(step);
    },
    /** 量出相邻两张卡片的间距，用于重排动画 */
    measure() {
      this.createSelectorQuery().selectAll('.pc').boundingClientRect(rs => {
        if (rs && rs.length > 1) this._step = this.data.land ? rs[1].left - rs[0].left : rs[1].top - rs[0].top;
      }).exec();
    },

    score(pi, k) {
      const m = this.m;
      m.events.push({ p: pi, ev: k, t: Date.now() });
      store.save();
      const D = derive(m), step = D.steps[D.steps.length - 1];
      if (store.get().settings.vib) wx.vibrateShort({ type: EV[k].gold ? 'heavy' : k === 'foul' ? 'medium' : 'light' });
      this.refresh(step);
    },

    undo() {
      const m = this.m, e = m.events.pop();
      if (!e) { wx.showToast({ title: '没有可撤销的记录', icon: 'none' }); return; }
      store.save();
      const before = derive({ ...m, events: [...m.events, e] }), step = before.steps[before.steps.length - 1];
      if (e.ev === 'dj' || e.ev === 'xj') sfx.stop(); // 撤销金球时音乐也一起停
      if (this.data.banner) this.closeBanner(true);
      this.refresh(null);
      step.d.forEach((x, j) => { if (x) this.fly(j, '↺ ' + signed(-x), 'dim'); });
    },

    fly(pi, text, cls) {
      const id = flySeq++;
      this.setData({ flies: [...this.data.flies, { id, pi, text, cls }] });
      setTimeout(() => this.setData({ flies: this.data.flies.filter(f => f.id !== id) }), 1150);
    },
    /** 金球彩纸：从卡片中心向四周迸发 */
    burst(pi, color, n) {
      const cols = [color, '#FFFFFF', '#FFE27A', '#FF5A5F', '#3D7BFF', '#1FC98E', '#9B6BFF'];
      const items = [];
      for (let k = 0; k < n; k++) {
        const a = Math.PI * 2 * k / n + Math.random() * 0.5, r = 60 + Math.random() * 90;
        const w = 5 + Math.random() * 6, h = 7 + Math.random() * 8;
        items.push({ id: flySeq++, pi, style: `--dx:${(Math.cos(a) * r).toFixed(1)}px;--dy:${(Math.sin(a) * r).toFixed(1)}px;background:${cols[k % cols.length]};width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;animation-delay:${(Math.random() * 0.08).toFixed(2)}s` });
      }
      const ids = new Set(items.map(x => x.id));
      this.setData({ parts: [...this.data.parts, ...items] });
      setTimeout(() => this.setData({ parts: this.data.parts.filter(x => !ids.has(x.id)) }), 1200);
    },
    /** 重新触发卡片上的 CSS 动画：先清空 class，再加回去 */
    cardFx(pi, cls) {
      if (!this.data.risen) this.setData({ risen: true }); // 入场还没播完就触发了动效：直接结束入场，避免之后重播
      const key = `players[${this.pos ? this.pos[pi] : pi}].fx`;
      this.setData({ [key]: '' });
      setTimeout(() => this.setData({ [key]: cls }), 30);
      clearTimeout(this['_fx' + pi]);
      this['_fx' + pi] = setTimeout(() => this.setData({ [key]: '' }), 1900);
    },

    effects(s) {
      const E = EV[s.ev], names = this.m.players.map(id => store.friend(id).name), v = this.m.rules[s.ev].v;
      s.d.forEach((x, j) => {
        if (!x) return;
        const tag = s.ev === 'foul' ? (x < 0 ? ' 犯规' : '') : (x < 0 && s.payers.length === 1 ? ' 付' : '');
        this.fly(j, signed(x) + tag, x > 0 ? 'up' : 'down');
      });
      // 犯规：只震动，不闪白；胜局：闪一下（金球再加扫光）
      this.cardFx(s.p, s.ev === 'foul' ? 'shake' : ['hit', E.gold ? 'gold' : ''].join(' ').trim());
      if (E.gold) this.burst(s.p, E.c, s.ev === 'dj' ? 30 : 20);
      if (E.gold || s.ev === 'foul') { // 大金 / 小金 / 黄金九 / 犯规：同一套奖章样式的弹窗
        const who = s.ev === 'foul' ? `${names[s.to]} +${v}` : s.payers.length > 1 ? '两家各付 ' + v : names[s.payers[0]] + ' 付 ' + v;
        this.clearBannerTimers();
        // 大金、小金有音乐：庆祝一直显示到音乐结束；点屏幕任意处 = 音乐和庆祝一起关掉
        const music = (s.ev === 'dj' || s.ev === 'xj') && sfx.playGold(() => this.closeBanner(false));
        this.setData({ banner: { k: s.ev, t: E.name, c: E.c, tc: E.t, live: !!music, out: false, sub: s.ev === 'foul' ? `${names[s.p]} −${v} · ${who}` : `${names[s.p]} ${signed(s.d[s.p])} · ${who}` } });
        if (music) {
          this._bn = setTimeout(() => this.closeBanner(false), 8000); // 兜底：万一收不到音乐结束事件
          this._bb = [1600, 3200, 4800].map(t => setTimeout(() => this.data.banner && this.burst(s.p, E.c, 16), t)); // 音乐期间再撒几次彩纸
        } else {
          this._bn = setTimeout(() => this.closeBanner(false), 1700); // 黄金九 / 犯规 / 关了音效：短暂显示后自动消失
        }
      }
    },
    clearBannerTimers() { clearTimeout(this._bn); (this._bb || []).forEach(clearTimeout); this._bb = []; },
    /** 收起庆祝；byTap 为真表示用户点掉的，同时停止音乐 */
    closeBanner(byTap) {
      if (!this.data.banner || this.data.banner.out) return;
      this.clearBannerTimers();
      if (byTap) sfx.stop();
      this.setData({ 'banner.out': true });
      setTimeout(() => this.setData({ banner: null }), 320);
    },
    onBannerTap() { this.closeBanner(true); },

    /** 引导进行中时，点任何地方都只是「下一步」，不会误记分 */
    guard() { if (this.data.coach) { this.nextCoach && this.nextCoach(); return true; } return false; },
    onCard(e) { if (this.guard()) return; this.setData({ hintIntro: false }); this.score(+e.currentTarget.dataset.i, 'pu'); },
    onChip(e) { if (this.guard()) return; const { i, k } = e.currentTarget.dataset; this.score(+i, k); },
    onUndo() { if (this.guard()) return; this.undo(); },
    noop() {},
  },
});
