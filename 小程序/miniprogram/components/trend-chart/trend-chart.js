// 可交互走势图：点按显示该点数据，左右拖动查看趋势（Canvas 2D）
// series: [[数值...], ...]  colors / names：每条线的颜色和名字
// titles / notes：每个点的提示标题和说明（与数值下标一一对应）
// ticks: [{ i, t }] 横轴刻度   fill: 只有一条线时是否填充渐变
Component({
  options: { addGlobalClass: true },
  properties: {
    series: { type: Array, value: [] },
    colors: { type: Array, value: [] },
    names: { type: Array, value: [] },
    titles: { type: Array, value: [] },
    notes: { type: Array, value: [] },
    ticks: { type: Array, value: [] },
    height: { type: Number, value: 400 },
    fill: { type: Boolean, value: false },
    signed: { type: Boolean, value: true },
  },
  data: { tip: null, hint: true },
  observers: {
    'series, colors'(s) {
      const key = JSON.stringify(s);
      if (key === this._key) return; // 数据没变（比如从子页面返回）：不重画，避免闪烁
      this._key = key;
      if (this.ready && this.ctx) this.animateIn();
    },
  },
  lifetimes: {
    ready() { this.ready = true; setTimeout(() => this.init(), 50); },
  },
  methods: {
    init() {
      this.createSelectorQuery().select('#tc').fields({ node: true, size: true, rect: true }).exec(res => {
        const r = res && res[0]; if (!r || !r.node) return;
        const dpr = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).pixelRatio || 2;
        this.cv = r.node; this.ctx = r.node.getContext('2d'); this.W = r.width; this.H = r.height; this.left = r.left;
        this.cv.width = r.width * dpr; this.cv.height = r.height * dpr; this.ctx.scale(dpr, dpr);
        this.animateIn();
      });
    },
    /** 入场：折线像笔画一样从左画到右 */
    animateIn() {
      const t0 = Date.now(), D = 900, raf = f => (this.cv.requestAnimationFrame ? this.cv.requestAnimationFrame(f) : setTimeout(f, 16));
      const step = () => {
        const k = Math.min(1, (Date.now() - t0) / D), e = 1 - Math.pow(1 - k, 3);
        this.draw(-1, e);
        if (k < 1) raf(step);
      };
      step();
    },
    geo() {
      const S = this.data.series, all = S.flat();
      const mn = Math.min(0, ...all), mx = Math.max(0, ...all), span = (mx - mn) || 1;
      const L = 38, R = 14, T = 14, B = 28, pw = this.W - L - R, ph = this.H - T - B;
      const N = Math.max(1, (S[0] || []).length - 1);
      return { mn, mx, L, R, T, B, pw, ph, N, X: i => L + pw * i / N, Y: v => T + ph * (1 - (v - mn) / span) };
    },
    draw(hi, prog = 1) {
      const ctx = this.ctx; if (!ctx) return;
      const S = this.data.series, C = this.data.colors, g = this.geo(), W = this.W, H = this.H;
      ctx.clearRect(0, 0, W, H);
      ctx.font = '10px sans-serif'; ctx.fillStyle = '#A9A9B0'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      const mid = Math.round((g.mx + g.mn) / 2);
      [g.mx, mid, g.mn].forEach(v => {
        ctx.strokeStyle = 'rgba(20,20,30,.06)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.L, g.Y(v)); ctx.lineTo(W - g.R, g.Y(v)); ctx.stroke();
        ctx.fillText(String(v), g.L - 6, g.Y(v));
      });
      ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(20,20,30,.28)'; ctx.beginPath(); ctx.moveTo(g.L, g.Y(0)); ctx.lineTo(W - g.R, g.Y(0)); ctx.stroke(); ctx.setLineDash([]);
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      (this.data.ticks || []).forEach(t => ctx.fillText(t.t, Math.min(W - g.R - 12, Math.max(g.L + 12, g.X(t.i))), H - g.B + 9));
      // 单线时填充渐变
      if (this.data.fill && S.length === 1 && S[0].length > 1 && prog >= 1) {
        const s = S[0], grd = ctx.createLinearGradient(0, g.T, 0, H - g.B);
        grd.addColorStop(0, (C[0] || '#FF5A5F') + '55'); grd.addColorStop(1, (C[0] || '#FF5A5F') + '00');
        ctx.fillStyle = grd; ctx.beginPath(); ctx.moveTo(g.X(0), g.Y(0));
        s.forEach((v, i) => ctx.lineTo(g.X(i), g.Y(v))); ctx.lineTo(g.X(s.length - 1), g.Y(0)); ctx.closePath(); ctx.fill();
      }
      const lim = prog * g.N; // 入场动画：只画到 lim
      S.forEach((s, j) => {
        const c = C[j] || '#16161A';
        ctx.strokeStyle = c; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.globalAlpha = hi >= 0 ? 0.9 : 1;
        ctx.beginPath();
        for (let i = 0; i < s.length; i++) {
          if (i > lim) { const a = s[i - 1], b = s[i], f = lim - (i - 1); ctx.lineTo(g.X(i - 1 + f), g.Y(a + (b - a) * f)); break; }
          i ? ctx.lineTo(g.X(i), g.Y(s[i])) : ctx.moveTo(g.X(i), g.Y(s[i]));
        }
        ctx.stroke(); ctx.globalAlpha = 1;
        if (hi < 0 && prog >= 1 && s.length) this.dot(g.X(s.length - 1), g.Y(s[s.length - 1]), c);
      });
      if (hi >= 0) {
        ctx.strokeStyle = 'rgba(20,20,30,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(g.X(hi), g.T - 4); ctx.lineTo(g.X(hi), H - g.B); ctx.stroke();
        S.forEach((s, j) => { if (s[hi] != null) this.dot(g.X(hi), g.Y(s[hi]), C[j] || '#16161A', 5.5); });
      }
    },
    dot(x, y, c, r = 4.5) {
      const ctx = this.ctx; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = c; ctx.lineWidth = 2.6; ctx.stroke();
    },
    /** 由 touch.wxs 调用：p.x 为画布内坐标（部分机型没有，用 clientX 换算） */
    at(p) {
      if (!this.ctx || !p) return;
      const x = p.x != null ? p.x : p.cx - (this.left || 0);
      const g = this.geo(), S = this.data.series;
      const i = Math.max(0, Math.min(g.N, Math.round((x - g.L) / g.pw * g.N)));
      if (i === this._i && this.data.tip) return;
      this._i = i; this.draw(i);
      const fmt = v => (this.data.signed ? (v > 0 ? '+' + v : v < 0 ? '−' + Math.abs(v) : '0') : String(v));
      const rows = S.map((s, j) => ({ j, n: this.data.names[j] || '', c: this.data.colors[j], v: fmt(s[i]) }));
      const px = g.X(i), right = px > this.W * 0.55;
      this.setData({ hint: false, tip: { title: this.data.titles[i] || '', note: this.data.notes[i] || '', rows, x: right ? px - 12 : px + 12, right } });
      if (!this._vib) { this._vib = true; wx.vibrateShort({ type: 'light' }); }
    },
    end() { this._vib = false; },
    clear() { this._i = -1; this.setData({ tip: null }); this.draw(-1); },
    noop() {},
  },
});
