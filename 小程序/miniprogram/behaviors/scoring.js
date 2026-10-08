// 球球记分 · 记分逻辑（竖屏 / 横屏共用的 Behavior）
const store = require('../utils/store');
const { EV, CHIPS, derive, signed } = require('../utils/engine');
const { clock } = require('../utils/util');

let flySeq = 1;

module.exports = Behavior({
  data: { n: 2, players: [], round: 1, clock: '00:00:00', order: [], flies: [], parts: [], banner: null, chips: [], hintIntro: true },

  methods: {
    initScore() {
      const s = store.get();
      this.m = s.live;
      if (!this.m) { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/home' }) }); return false; }
      const m = this.m;
      this.setData({
        n: m.players.length,
        chips: CHIPS.map(k => ({ k, name: EV[k].name, v: (k === 'foul' ? '−' : '+') + m.rules[k].v, c: EV[k].c, t: EV[k].t })),
        puV: m.rules.pu.v,
      });
      this.refresh(null);
      if (s.settings.keep) wx.setKeepScreenOn({ keepScreenOn: true });
      this.startClock();
      setTimeout(() => this.setData({ hintIntro: false }), 2400);
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
      if (store.get().settings.vib) wx.vibrateShort({ type: EV[k].gold ? 'heavy' : 'light' });
      this.refresh(step);
    },

    undo() {
      const m = this.m, e = m.events.pop();
      if (!e) { wx.showToast({ title: '没有可撤销的记录', icon: 'none' }); return; }
      store.save();
      const before = derive({ ...m, events: [...m.events, e] }), step = before.steps[before.steps.length - 1];
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
      this.cardFx(s.p, ['hit', E.gold ? 'gold' : '', s.ev === 'foul' ? 'shake' : ''].join(' ').trim());
      if (E.gold) this.burst(s.p, E.c, s.ev === 'dj' ? 30 : 20);
      if (E.gold) { // 大金 / 小金 / 黄金九：同一套奖章样式的庆祝
        const who = s.payers.length > 1 ? '两家各付 ' + v : names[s.payers[0]] + ' 付 ' + v;
        this.setData({ banner: { k: s.ev, t: E.name, c: E.c, tc: E.t, sub: `${names[s.p]} ${signed(s.d[s.p])} · ${who}` } });
        clearTimeout(this._bn);
        this._bn = setTimeout(() => this.setData({ banner: null }), 1700);
      }
    },

    onCard(e) { this.setData({ hintIntro: false }); this.score(+e.currentTarget.dataset.i, 'pu'); },
    onChip(e) { const { i, k } = e.currentTarget.dataset; this.score(+i, k); },
    onUndo() { this.undo(); },
    noop() {},
  },
});
