// 球球记分 · 斯诺克规则引擎（事件溯源：只存事件，比分 / 剩余分 / 单杆 / 局分全部由 derive() 算出来）
// 事件（每条都带 t 时间戳）：
//   {ev:'pot', b:'red'|'yellow'|…}   进一颗球
//   {ev:'pot2', b:彩球}              「红 + 彩」组合键：先进红球、再进这颗彩球（撤销时整个退回）
//   {ev:'miss'}                       没进 / 安全球，换人
//   {ev:'foul', pts, reds?}           犯规：罚分给对手，由对手接着打；reds = 犯规时同时进袋的红球（不再摆回）
//   {ev:'concede'}                    结束本局（判领先方赢）
//   {ev:'next'}                       开始下一局
// 对局：{ game:'snooker', players:[a, b], cfg:{ first, bestOf, reds, hc:{ p, pts } }, events, start, … }

const BALLS = [
  { k: 'red', n: '红', v: 1, c: '#E5383B' },
  { k: 'yellow', n: '黄', v: 2, c: '#FFC53D', dark: true },
  { k: 'green', n: '绿', v: 3, c: '#1FA86A' },
  { k: 'brown', n: '棕', v: 4, c: '#8B5A3C' },
  { k: 'blue', n: '蓝', v: 5, c: '#3D7BFF' },
  { k: 'pink', n: '粉', v: 6, c: '#FF7FB0', dark: true },
  { k: 'black', n: '黑', v: 7, c: '#1E1E22' },
];
const B = {}; BALLS.forEach(b => { B[b.k] = b; });
const COLORS = BALLS.slice(1);
const byV = v => COLORS.find(b => b.v === v) || B.red;
const need = bestOf => Math.floor(bestOf / 2) + 1;
const bestTxt = bestOf => (bestOf === 1 ? '单局' : `${bestOf} 局 ${need(bestOf)} 胜`);
const maxBreak = reds => reds * 8 + 27;

function derive(m) {
  const cfg = m.cfg, N = need(cfg.bestOf);
  const hc = cfg.hc && cfg.hc.p >= 0 && cfg.hc.pts > 0 ? cfg.hc : null; // 让分：被让的一方每局开局先加分
  const S = { fw: [0, 0], frames: [], need: N, over: false, winner: null };
  const mk = no => {
    const b = (cfg.first + no - 1) % 2;
    return { no, breaker: b, act: b, hc, sc: [hc && hc.p === 0 ? hc.pts : 0, hc && hc.p === 1 ? hc.pts : 0],
      reds: cfg.reds, phase: 'red', ci: 2, brk: 0, balls: [], last: [null, null], breaks: [], fouls: [0, 0], pens: [0, 0],
      respot: false, over: false, win: null, t0: null, t1: null, n: 0 }; // n：本局得过几次分（进球 / 犯规）
  };
  let F = mk(1);
  const endBreak = () => { if (F.brk > 0) { F.breaks.push({ p: F.act, v: F.brk, balls: F.balls.slice() }); F.last[F.act] = F.brk; } F.brk = 0; F.balls = []; };
  const afterTurn = () => { if (F.phase === 'color') { F.phase = F.reds > 0 ? 'red' : 'clear'; F.ci = 2; } };
  const finish = (w, t) => { endBreak(); F.over = true; F.win = w; F.t1 = t; S.fw[w]++; S.frames.push(F); if (S.fw[w] >= N) { S.over = true; S.winner = w; } };
  const score = (v, k) => { F.sc[F.act] += v; F.brk += v; F.balls.push(k); F.n++; };
  const flat = [];
  m.events.forEach(e => { if (e.ev === 'pot2') flat.push({ ev: 'pot', b: 'red', t: e.t }, { ev: 'pot', b: e.b, t: e.t }); else flat.push(e); });
  for (const e of flat) {
    if (e.ev === 'next') { if (F.over && !S.over) { F = mk(S.frames.length + 1); F.t0 = e.t; } continue; }
    if (F.over) continue;
    if (F.t0 == null) F.t0 = e.t;
    if (e.ev === 'pot') {
      if (F.phase === 'red' && e.b === 'red') { F.reds--; score(1, 'red'); F.phase = 'color'; }
      else if (F.phase === 'color' && e.b !== 'red') { score(B[e.b].v, e.b); F.phase = F.reds > 0 ? 'red' : 'clear'; F.ci = 2; }
      else if (F.phase === 'clear' && B[e.b] && B[e.b].v === F.ci) {
        score(F.ci, e.b);
        if (F.ci === 7) { if (F.sc[0] === F.sc[1]) F.respot = true; else finish(F.sc[0] > F.sc[1] ? 0 : 1, e.t); } // 平分：重摆黑球决胜
        else F.ci++;
      }
    } else if (e.ev === 'miss') { endBreak(); afterTurn(); F.act = 1 - F.act; }
    else if (e.ev === 'foul') {
      endBreak(); F.n++; F.sc[1 - F.act] += e.pts; F.fouls[F.act]++; F.pens[1 - F.act] += e.pts;
      if (e.reds > 0 && F.phase !== 'clear') { F.reds = Math.max(0, F.reds - e.reds); if (F.phase === 'red' && F.reds === 0) { F.phase = 'clear'; F.ci = 2; } }
      afterTurn();
      if (F.respot) { finish(1 - F.act, e.t); continue; } // 重摆黑球时犯规：直接输掉本局
      if (F.phase === 'clear' && F.ci === 7) { // 只剩黑球时犯规：本局结束；罚分后打平则重摆黑球
        if (F.sc[0] !== F.sc[1]) { finish(F.sc[0] > F.sc[1] ? 0 : 1, e.t); continue; }
        F.respot = true;
      }
      F.act = 1 - F.act;
    } else if (e.ev === 'concede') { finish(F.sc[0] === F.sc[1] ? 1 - F.act : F.sc[0] > F.sc[1] ? 0 : 1, e.t); }
  }
  // 台面剩余分 / 犯规最低罚分 / 超分（领先已经超过台面剩余分）
  F.rem = F.phase === 'red' ? F.reds * 8 + 27 : F.phase === 'color' ? F.reds * 8 + 27 + 7 : [2, 3, 4, 5, 6, 7].filter(v => v >= F.ci).reduce((a, b) => a + b, 0);
  F.minPen = Math.max(4, F.phase === 'clear' ? F.ci : 4);
  const lead = F.sc[0] - F.sc[1];
  F.sup = F.over ? -1 : lead > F.rem ? 0 : -lead > F.rem ? 1 : -1;
  S.F = F;
  S.cur = F.over ? null : F;
  return S;
}

/** 某一方这场的结果：W / L / D（比赛提前结束且局分相同为平） */
function outcome(S, i) { return S.fw[i] > S.fw[1 - i] ? 'W' : S.fw[i] < S.fw[1 - i] ? 'L' : 'D'; }

/** 战报数据 */
function report(m, view) {
  const S = derive(m), P = m.players.map(view);
  const frames = S.frames;
  const w = S.fw[0] === S.fw[1] ? -1 : S.fw[0] > S.fw[1] ? 0 : 1;
  const allBreaks = frames.flatMap(f => f.breaks.map(b => ({ ...b, no: f.no })));
  const top = allBreaks.slice().sort((a, b) => b.v - a.v).slice(0, 5);
  const per = [0, 1].map(p => ({
    total: frames.reduce((a, f) => a + f.sc[p], 0),
    hi: Math.max(0, ...allBreaks.filter(b => b.p === p).map(b => b.v)),
    fifty: allBreaks.filter(b => b.p === p && b.v >= 50).length,
    century: allBreaks.filter(b => b.p === p && b.v >= 100).length,
    pens: frames.reduce((a, f) => a + f.pens[p], 0),
    fouls: frames.reduce((a, f) => a + f.fouls[p], 0),
    hc: frames.reduce((a, f) => a + (f.hc && f.hc.p === p ? f.hc.pts : 0), 0),
  }));
  return { S, P, w, frames, top, per };
}

module.exports = { BALLS, B, COLORS, byV, need, bestTxt, maxBreak, derive, outcome, report };
