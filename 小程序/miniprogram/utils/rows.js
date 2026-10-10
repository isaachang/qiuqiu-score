// 列表行数据（首页「最近对局」、战绩「历史对局」共用）
const store = require('./store');
const { signed, outcome, isDraw, played } = require('./engine');
const { derived } = require('./cache');
const { dayLabel, hm, dur } = require('./util');
const SN = require('./snooker');
const { isSnk } = require('./game');

function matchRow(m, opt) {
  const row = isSnk(m) ? snkRow(m) : chaseRow(m);
  row.card = card(m, opt || {});
  return row;
}
function chaseRow(m) {
  const D = derived(m), me = m.players.findIndex(id => store.friend(id).me);
  const my = me >= 0 ? D.scores[me] : null, k = me >= 0 ? outcome(D.scores, me) : '';
  return {
    id: m.id, mode: m.mode === 2 ? '双人' : '三人', rounds: D.round - 1, when: dayLabel(m.start),
    names: m.players.map(id => store.friend(id).name).join(' · '),
    avs: m.players.map(id => store.view(id)),
    s: my === null ? '' : signed(my), cls: my > 0 ? 'pos' : my < 0 ? 'neg' : '',
    res: { W: '胜', L: '负', D: '平' }[k] || '', resK: k,
    chips: m.players.map((id, i) => ({ id, name: store.friend(id).name, me: !!store.friend(id).me, s: signed(D.scores[i]), cls: D.scores[i] > 0 ? 'pos' : D.scores[i] < 0 ? 'neg' : '' })),
    full: (() => { const d = new Date(m.start); return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; })(),
  };
}

/** 斯诺克：比分位置显示局分，结果按局分算 */
function snkRow(m) {
  const S = SN.derive(m), me = m.players.findIndex(id => store.friend(id).me), k = me >= 0 ? SN.outcome(S, me) : '';
  const fw = me === 1 ? [S.fw[1], S.fw[0]] : S.fw;
  return {
    id: m.id, game: 'snooker', mode: '斯诺克', rounds: S.frames.length, when: dayLabel(m.start),
    names: m.players.map(id => store.friend(id).name).join(' · '),
    avs: m.players.map(id => store.view(id)),
    s: `${fw[0]}:${fw[1]}`, cls: k === 'W' ? 'pos' : k === 'L' ? 'neg' : '',
    res: { W: '胜', L: '负', D: '平' }[k] || '', resK: k,
    chips: m.players.map((id, i) => ({ id, name: store.friend(id).name, me: !!store.friend(id).me, s: String(S.fw[i]), cls: S.fw[i] > S.fw[1 - i] ? 'pos' : S.fw[i] < S.fw[1 - i] ? 'neg' : '' })),
    full: (() => { const d = new Date(m.start); return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; })(),
  };
}

/* ---------- 对局卡片（首页最近对局、历史日历共用） ----------
   双人（追分 / 斯诺克）：左右对站，「我」在左边；三人追分：三列并排
   赢家头像右上角盖「胜」字章，输的一方变淡；平局 / 未分胜负不盖章 */
function card(m, opt) {
  const when = opt.time ? hm(m.start) : dayLabel(m.start);
  const V = m.players.map(id => store.view(id));
  const meIdx = m.players.findIndex(id => store.friend(id).me);
  const time = dur(played(m));
  if (isSnk(m)) {
    const S = SN.derive(m), fw = S.fw, draw = fw[0] === fw[1];
    const hi = [0, 1].map(p => Math.max(0, ...S.frames.flatMap(f => f.breaks.filter(b => b.p === p).map(b => b.v))));
    const ord = meIdx === 1 ? [1, 0] : [0, 1];
    const side = i => ({ ...V[i], won: !draw && fw[i] > fw[1 - i], lose: !draw && fw[i] < fw[1 - i] });
    return { kind: 'duo', tag: '斯诺克', dot: '#1FA86A', info: `${SN.bestTxt(m.cfg.bestOf)} · ${time}`, when,
      L: side(ord[0]), R: side(ord[1]),
      big: { a: fw[ord[0]], b: fw[ord[1]], la: fw[ord[0]] >= fw[ord[1]] ? 'w' : 'l', lb: fw[ord[1]] >= fw[ord[0]] ? 'w' : 'l' },
      cmp: S.frames.length ? { l: '单杆最高', a: hi[ord[0]], b: hi[ord[1]] } : null,
      note: draw ? (S.frames.length ? '平局' : '提前结束 · 未分胜负') : '' };
  }
  const D = derived(m), sc = D.scores, draw = isDraw(sc), rounds = D.round - 1;
  const res = i => (draw ? '' : outcome(sc, i));
  if (m.players.length === 3) {
    return { kind: 'trio', tag: '三人追分', dot: '#3D7BFF', info: `${rounds} 局 · ${time}`, when,
      P: V.map((v, i) => ({ ...v, s: signed(sc[i]), cls: sc[i] > 0 ? 'pos' : sc[i] < 0 ? 'neg' : '', won: res(i) === 'W', lose: !draw && res(i) !== 'W' })) };
  }
  const ord = meIdx === 1 ? [1, 0] : [0, 1];
  const gold = i => D.stats[i].dj + D.stats[i].xj + D.stats[i].h9;
  const side = i => ({ ...V[i], won: res(i) === 'W', lose: !draw && res(i) !== 'W' });
  const net = i => ({ t: signed(sc[i]), cls: sc[i] > 0 ? 'pos' : sc[i] < 0 ? 'neg' : '' });
  return { kind: 'duo', tag: '双人追分', dot: '#FF5A5F', info: `${rounds} 局 · ${time}`, when,
    L: side(ord[0]), R: side(ord[1]), net: { a: net(ord[0]), b: net(ord[1]) },
    cmp: { l: '金球', a: gold(ord[0]), b: gold(ord[1]) }, note: draw ? '平局' : '' };
}

module.exports = { matchRow };
