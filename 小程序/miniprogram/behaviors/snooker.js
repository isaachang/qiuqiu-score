// 球球记分 · 斯诺克记分逻辑
// 一杆一按：进了哪颗点哪颗（该打红球时六格是「红 + 彩」组合键），没进点「换人」，犯规点「犯规」
const store = require('../utils/store');
const SN = require('../utils/snooker');
const { played } = require('../utils/engine');
const { clock } = require('../utils/util');
const idle = require('../utils/idle');
const nav = require('../utils/nav');
const { resultUrl } = require('../utils/game');
const { ask } = require('../utils/ui');

let seq = 1;
const vib = type => { if (store.get().settings.vib) wx.vibrateShort({ type }); };

module.exports = Behavior({
  data: {
    vm: null, clock: '00:00:00', flies: [], sup: null, banner: null,
    foul: { show: false }, logs: { show: false }, fin: { show: false }, frame: { show: false },
  },
  methods: {
    initSnk() {
      idle.check();
      const s = store.get();
      this.m = s.live;
      if (!this.m || this.m.game !== 'snooker') {
        this.stopClock(); wx.setKeepScreenOn({ keepScreenOn: false });
        if (this.onNoLive && this.onNoLive()) return false;
        if (this.m) { nav.redirect('/pages/score/score'); return false; } // 进行中的是追分
        wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/home' }) });
        return false;
      }
      this.setData({ lite: !!(getApp().globalData || {}).lite });
      if (s.settings.keep) wx.setKeepScreenOn({ keepScreenOn: true });
      this.refresh();
      this.startClock();
      return true;
    },

    /* ---------- 由事件重算界面 ---------- */
    refresh(bump) {
      const m = this.m, S = SN.derive(m), F = S.F;
      this.S = S;
      const combo = F.phase === 'red';
      const players = m.players.map((id, i) => {
        const on = F.act === i && !F.over;
        return {
          ...store.view(id), idx: i, sc: F.sc[i], on, sup: F.sup === i, hc: F.hc && F.hc.p === i ? F.hc.pts : 0,
          brk: on ? F.brk : 0, dots: on ? F.balls.slice(-12).map((k, j) => ({ k: j, c: SN.B[k].c })) : [], more: on && F.balls.length > 12 ? F.balls.length - 12 : 0, last: F.last[i],
          bump: bump === i ? ((this._bc = (this._bc || 0) + 1) % 2 ? 'b1' : 'b2') : '', // 两个同样的动画交替用，连续记分也会每次都跳
        };
      });
      const lead = F.sc[0] - F.sc[1], who = lead >= 0 ? 0 : 1;
      const nextBall = SN.byV(F.ci);
      const vm = {
        no: F.no, best: SN.bestTxt(m.cfg.bestOf), fw: S.fw, players, phase: F.phase,
        title: F.phase === 'clear' ? '清彩' : '进球',
        chip: F.phase === 'red' ? { t: '红球', c: '#E5383B' } : F.phase === 'color' ? { t: '彩球', g: true } : { t: F.respot ? '重摆黑球' : nextBall.n + '球', c: nextBall.c },
        info: { rem: F.rem, lead: Math.abs(lead), who: players[who].name, sup: F.sup >= 0,
          thirdV: F.phase === 'clear' ? 8 - F.ci : F.reds, thirdL: F.phase === 'clear' ? '彩球剩余' : '红球剩余' },
        red: { st: F.phase === 'clear' ? 'gone' : F.phase === 'red' ? 'on' : 'dim', left: Array.from({ length: m.cfg.reds }, (_, k) => ({ k, on: k < F.reds })) },
        combo,
        tiles: SN.COLORS.map(b => ({
          k: b.k, c: b.c, dark: !!b.dark, name: combo ? '红' + b.n : b.n, val: combo ? 1 + b.v : b.v,
          st: F.phase === 'clear' ? (b.v < F.ci ? 'done' : b.v === F.ci ? 'next' : 'dim') : '',
        })),
      };
      const up = { vm };
      // 一局结束 / 整场结束：自动弹出（正在播单杆庆祝时先等它播完）
      if (F.over && this._holdFrame) { if (this.data.frame.show) up.frame = { show: false }; }
      else if (F.over) {
        const hb = F.breaks.reduce((a, b) => (b.v > a.v ? b : a), { v: 0 });
        up.frame = {
          show: true, over: S.over, no: F.no, win: players[F.win].name, sc: F.sc, fw: S.fw, best: vm.best,
          hb: hb.v ? `单杆最高 ${players[hb.p].name} ${hb.v}` : '', winner: S.over ? players[S.winner].name : '',
          next: players[(m.cfg.first + F.no) % 2].name,
        };
      } else if (this.data.frame.show) up.frame = { show: false };
      this.setData(up);
    },
    startClock() {
      this.stopClock();
      const tick = () => {
        const m = this.m; if (!m) return;
        if (Date.now() - store.lastAct(m) >= store.IDLE) { this.idleOut(); return; } // 30 分钟没操作 → 自动保存
        const txt = clock(played(m) / 1000);
        if (txt !== this.data.clock) this.setData({ clock: txt });
      };
      tick(); this._clk = setInterval(tick, 1000);
    },
    stopClock() { if (this._clk) clearInterval(this._clk); this._clk = null; },
    idleOut() {
      this.stopClock();
      this.setData({ 'foul.show': false, 'fin.show': false, 'logs.show': false, sup: null, banner: null });
      idle.check();
      this.initSnk();
    },

    /* ---------- 记分 ---------- */
    push(e) {
      e.t = Date.now();
      this.m.events.push(e);
      store.save();
    },
    onBall(e) {
      if (this.busy()) return;
      const k = e.currentTarget.dataset.k, F = this.S.F;
      if (F.over) return;
      let ev = null;
      if (F.phase === 'red') ev = k === 'red' ? { ev: 'pot', b: 'red' } : { ev: 'pot2', b: k };
      else if (F.phase === 'color') ev = k !== 'red' ? { ev: 'pot', b: k } : null;
      else ev = k !== 'red' && SN.B[k].v === F.ci ? { ev: 'pot', b: k } : null;
      if (!ev) {
        wx.showToast({ title: F.phase === 'color' ? '先打一颗彩球' : k === 'red' ? '红球已清台' : `按顺序：${SN.byV(F.ci).n}球`, icon: 'none' });
        return;
      }
      // 防连点：同一颗球 250ms 内只记一次
      const now = Date.now(); if (now < (this._lock || 0)) return; this._lock = now + 250;
      const who = F.act, before = F.brk, sup0 = F.sup, sc0 = F.sc[who], resp0 = F.respot;
      this.push(ev);
      vib(ev.ev === 'pot2' || SN.B[k].v >= 6 ? 'medium' : 'light');
      const N0 = SN.derive(this.m).F;
      const after = N0.over ? ((N0.breaks.filter(x => x.p === who).slice(-1)[0] || {}).v || 0) : N0.brk;
      const ms = [147, 100, 50].find(x => before < x && after >= x);
      this._holdFrame = !!(ms && N0.over); // 清台同时破了 50 / 100 / 147：先庆祝，再弹「本局结束」
      this.refresh(who);
      const N = this.S.F;
      this.fly(who, '+' + (N.sc[who] - sc0));
      if (ms) this.showBanner(ms, who, after);
      else this.checkSup(sup0);
      if (N.respot && !resp0) wx.showToast({ title: '平分 · 重摆黑球', icon: 'none' });
    },
    /** 防连点：同一个按钮 400ms 内只算一次（面板收起动画期间按钮还点得到） */
    once() { const now = Date.now(); if (now < (this._once || 0)) return false; this._once = now + 400; return true; },
    onMiss() {
      if (this.busy() || this.S.F.over || !this.once()) return;
      this.push({ ev: 'miss' }); vib('light'); this.refresh();
    },
    /* 犯规：默认罚分 = max(4, 该打的球)，罚给对手，由对手接着打 */
    onFoul() {
      if (this.busy() || this.S.F.over) return;
      const F = this.S.F, P = this.data.vm.players;
      this.setData({ foul: { show: true, off: P[F.act].name, opp: P[1 - F.act].name, pts: F.minPen, min: F.minPen, reds: 0, maxReds: F.phase === 'clear' ? 0 : F.reds,
        opts: [4, 5, 6, 7].map(v => ({ v, c: v > 4 ? SN.byV(v).c : '', t: v === F.minPen ? '默认' : v > 4 ? '涉及' + SN.byV(v).n + '球' : '最低' })) } });
    },
    pickPen(e) { vib('light'); this.setData({ 'foul.pts': +e.currentTarget.dataset.v }); },
    redMinus() { const r = this.data.foul.reds; if (r > 0) { vib('light'); this.setData({ 'foul.reds': r - 1 }); } },
    redPlus() { const { reds, maxReds } = this.data.foul; if (reds < maxReds) { vib('light'); this.setData({ 'foul.reds': reds + 1 }); } },
    closeFoul() { this.setData({ 'foul.show': false }); },
    confirmFoul() {
      if (!this.data.foul.show || this.S.F.over || !this.once()) return;
      const F = this.S.F, opp = 1 - F.act, sup0 = F.sup, { pts, reds } = this.data.foul;
      this.setData({ 'foul.show': false });
      this.push(reds > 0 ? { ev: 'foul', pts, reds } : { ev: 'foul', pts }); vib('medium');
      this.refresh(opp); this.fly(opp, '+' + pts);
      this.checkSup(sup0);
    },
    onUndo() {
      const m = this.m, e = m.events.pop();
      if (!e) { wx.showToast({ title: '没有可撤销的记录', icon: 'none' }); return; }
      store.touchLive(); store.save();
      this._holdFrame = false; clearTimeout(this._bn);
      this.hideSup(); this.setData({ banner: null, 'foul.show': false });
      const name = e.ev === 'pot2' ? '红 + ' + SN.B[e.b].n : e.ev === 'pot' ? SN.B[e.b].n + '球' : e.ev === 'miss' ? '换人' : e.ev === 'foul' ? `犯规 ${e.pts} 分` + (e.reds ? `（进红 ${e.reds}）` : '') : e.ev === 'next' ? '开始下一局' : '结束本局';
      wx.showToast({ title: '已撤销：' + name, icon: 'none' });
      this.refresh();
    },
    nextFrame() { if (!this.data.frame.show || !this.S.F.over || this.S.over || !this.once()) return; this.push({ ev: 'next' }); vib('light'); this.refresh(); },
    /** 弹窗 / 面板打开时不接受记分 */
    busy() { const d = this.data; return !!(d.foul.show || d.fin.show || d.logs.show || d.frame.show || (d.ui && d.ui.show)); },

    /* ---------- 单杆记录 ---------- */
    openLog() {
      const F = this.S.F, P = this.data.vm.players;
      const dots = list => list.map((x, j) => ({ k: j, c: SN.B[x].c }));
      const rows = F.breaks.slice().reverse().map((b, k) => ({ k, v: b.v, name: P[b.p].name, c: P[b.p].c, dots: dots(b.balls) }));
      if (F.brk) rows.unshift({ k: 'cur', v: F.brk, name: P[F.act].name + ' · 正在打', c: P[F.act].c, dots: dots(F.balls) });
      this.setData({ logs: { show: true, no: F.no, rows, fouls: `犯规 ${P[0].name} ${F.fouls[0]} 次 · ${P[1].name} ${F.fouls[1]} 次` } });
    },
    closeLog() { this.setData({ 'logs.show': false }); },

    /* ---------- 动效 ---------- */
    fly(pi, text) {
      const id = seq++;
      this.setData({ flies: this.data.flies.concat({ id, pi, text }) });
      setTimeout(() => this.setData({ flies: this.data.flies.filter(f => f.id !== id) }), 1100);
    },
    showBanner(ms, who, after) {
      vib('heavy');
      const P = this.data.vm.players;
      this.setData({ banner: { v: ms, t: ms === 147 ? '147 满分杆' : `单杆破 ${ms}`, sub: `${P[who].name} · 本杆 ${after}`, c: ms === 147 ? '#1E1E22' : ms === 100 ? '#FFB020' : '#FF7FB0' } });
      clearTimeout(this._bn); this._bn = setTimeout(() => this.closeBanner(), 2600);
    },
    closeBanner() {
      clearTimeout(this._bn);
      if (this.data.banner) this.setData({ banner: null });
      if (this._holdFrame) { this._holdFrame = false; setTimeout(() => this.refresh(), 220); } // 庆祝结束 → 弹出「本局结束」
    },
    /** 超分：刚刚超过台面剩余分时播一次 */
    checkSup(sup0) {
      const F = this.S.F; if (F.over || F.sup < 0 || F.sup === sup0) return;
      const p = this.data.vm.players[F.sup];
      vib('heavy');
      this.setData({ sup: { name: p.name, ch: p.ch, c: p.c, i: p.i, lead: Math.abs(F.sc[0] - F.sc[1]), rem: F.rem, sparks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] } });
      clearTimeout(this._sp); this._sp = setTimeout(() => this.hideSup(), 2400);
    },
    hideSup() { clearTimeout(this._sp); if (this.data.sup) this.setData({ sup: null }); },

    /* ---------- 结算 ---------- */
    openFin() {
      if (this.data.frame.show) return;
      const F = this.S.F, S = this.S, P = this.data.vm.players;
      const started = F.n > 0; // 这一局真的有人得过分，才能「结束本局」
      const judge = F.sc[0] === F.sc[1] ? 1 - F.act : F.sc[0] > F.sc[1] ? 0 : 1;
      this.setData({ fin: { show: true, fw: S.fw, sc: F.sc, no: F.no, started, judge: P[judge].name, empty: !this.m.events.length } });
    },
    /** 结束比赛：第二步再选保存 / 不保存（正在打的这一局判给领先方） */
    endMatch() {
      const S = this.S, F = S.F, P = this.data.vm.players;
      if (!this.m.events.length) { store.discardLive(); this.stopClock(); wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/home' }) }); return; }
      const judge = F.sc[0] === F.sc[1] ? 1 - F.act : F.sc[0] > F.sc[1] ? 0 : 1;
      const fw = F.over ? S.fw : F.n > 0 ? S.fw.map((x, i) => x + (i === judge ? 1 : 0)) : S.fw;
      const note = !F.over && F.n > 0 ? ` · 第 ${F.no} 局判给 ${P[judge].name}` : '';
      this.setData({ 'fin.show': false, 'frame.show': false });
      this._holdFrame = true; // 选择期间不要再弹「本局结束」
      ask(this, { title: '结束比赛', desc: `局分 ${fw[0]} : ${fw[1]}${note}`,
        actions: [{ k: 'save', t: '保存战绩，查看战报', type: 'pri' }, { k: 'drop', t: '不保存', type: 'soft-danger' }] })
        .then(k => {
          this._holdFrame = false;
          if (k === 'save') this.saveMatch();
          else if (k === 'drop') { store.discardLive(); this.stopClock(); wx.showToast({ title: '已结束，未保存', icon: 'none' }); setTimeout(() => wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/home' }) }), 600); }
          else this.refresh(); // 取消：一局结束的面板重新弹出
        });
    },
    closeFin() { this.setData({ 'fin.show': false }); },
    concede() { if (!this.data.fin.show || this.S.F.over || !this.once()) return; this.setData({ 'fin.show': false }); this.push({ ev: 'concede' }); this.refresh(); },
    /** 结束比赛并保存：正在打的这一局判给领先方 */
    saveMatch() {
      if (this._saving) return; this._saving = true;
      const F = this.S.F;
      if (!F.over && F.n > 0) this.push({ ev: 'concede' }); // 正在打的这一局有得分：判给领先方
      this.stopClock();
      this.setData({ 'fin.show': false, 'frame.show': false });
      const m = store.finishLive();
      if (m) nav.redirect(resultUrl(m));
      else wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/home' }) });
    },
    noop() {},
  },
});
