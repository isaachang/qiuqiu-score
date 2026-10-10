// 斯诺克 · 战报
const store = require('../../utils/store');
const nav = require('../../utils/nav');
const SN = require('../../utils/snooker');
const { played } = require('../../utils/engine');
const { dur } = require('../../utils/util');
const { enter, onScroll } = require('../../utils/page');

Page({
  data: { ok: false },
  onLoad(q) { this.id = q.id; },
  onPageScroll(e) { onScroll(this, e); },
  onShow() {
    enter(this);
    const m = store.match(this.id);
    if (!m || m.game !== 'snooker') { this.setData({ ok: false }); return; }
    this.m = m;
    const R = SN.report(m, id => store.view(id)), P = R.P, S = R.S;
    const d = new Date(m.end || Date.now());
    const head = R.w < 0 ? '比赛未分胜负' : S.over ? '赢下比赛' : '领先时结束';
    const dots = list => list.map((k, j) => ({ k: j, c: SN.B[k].c }));
    const cmp = [
      ['总得分', 'total', true], ['单杆最高', 'hi', true], ['50+ 单杆', 'fifty', true], ['犯规', 'fouls', false], ['对手犯规得分', 'pens', true],
    ].concat(R.per.some(x => x.hc) ? [['让分', 'hc', null]] : []).map(([l, k, big]) => {
      const a = R.per[0][k], b = R.per[1][k];
      const win = big == null || a === b ? -1 : big ? (a > b ? 0 : 1) : (a < b ? 0 : 1);
      return { l, v: [a, b], win };
    });
    const ms = played(m), n = R.frames.length;
    this.setData({
      ok: true, P, w: R.w, head, fw: S.fw, best: SN.bestTxt(m.cfg.bestOf),
      when: `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`,
      // 每局比分：每局一张对局卡片（和首页同一个组件）
      frames: R.frames.map(f => {
        const hb = p => Math.max(0, ...f.breaks.filter(b => b.p === p).map(b => b.v));
        const side = i => ({ ...P[i], won: f.win === i, lose: f.win !== i });
        return { no: f.no, card: { kind: 'duo', tag: `第 ${f.no} 局`, dot: P[f.win].c,
          info: f.t0 && f.t1 ? dur(f.t1 - f.t0) : (f.hc ? `让 +${f.hc.pts}` : ''), when: '',
          L: side(0), R: side(1), big: { a: f.sc[0], b: f.sc[1], la: f.win === 0 ? 'w' : 'l', lb: f.win === 1 ? 'w' : 'l' },
          cmp: { l: '单杆最高', a: hb(0), b: hb(1) }, note: '' } };
      }),
      cmp,
    });
  },
  again() {
    const d = store.snkDraft();
    d.players = this.m.players.slice();
    d.cfg = JSON.parse(JSON.stringify(this.m.cfg));
    store.save();
    nav.redirect('/pages/snk-setup/snk-setup');
  },
  onShareAppMessage() {
    const { P, w, fw } = this.data;
    return { title: w >= 0 ? `${P[w].name} ${fw[w]} : ${fw[1 - w]} 拿下斯诺克 · 球球记分` : '斯诺克 · 球球记分', path: '/pages/home/home' };
  },
});
