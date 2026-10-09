// 球球记分 · 战报数据（结算报告页用）—— 纯函数，从对局事件算出所有可视化数据
const { EV, derive, signed, isDraw } = require('./engine');

const pct = (a, b) => (b ? Math.round(a / b * 1000) / 10 : 0);

function buildReport(m, view) {
  const D = derive(m), n = m.players.length, P = m.players.map(view);
  const rounds = D.round - 1;

  // 1) 分数走势：每条记录之后各人的累计分
  const series = P.map(() => [0]);
  const cum = Array(n).fill(0);
  const minS = Array(n).fill(0), maxS = Array(n).fill(0);
  const gain = P.map(() => ({ pu: 0, gold: 0, foul: 0 })); // 赢来的分按来源
  const lost = P.map(() => ({ paid: 0, foul: 0 }));        // 付出去的分
  D.steps.forEach(s => {
    s.d.forEach((x, j) => {
      cum[j] += x; series[j].push(cum[j]);
      minS[j] = Math.min(minS[j], cum[j]); maxS[j] = Math.max(maxS[j], cum[j]);
      if (x > 0) gain[j][s.ev === 'foul' ? 'foul' : EV[s.ev].gold ? 'gold' : 'pu'] += x;
      if (x < 0) lost[j][s.ev === 'foul' ? 'foul' : 'paid'] += -x;
    });
  });

  // 2) 排名 / 领奖台
  const rank = P.map((p, i) => ({ ...p, i, s: D.scores[i] })).sort((a, b) => b.s - a.s)
    .map(r => ({ ...r, no: 1 + D.scores.filter(x => x > r.s).length, txt: signed(r.s), cls: r.s > 0 ? 'pos' : r.s < 0 ? 'neg' : '' })); // 同分同名次
  const podium = n === 3 ? [rank[1], rank[0], rank[2]] : [rank[0], rank[1]];
  // 平局（最高分并列）：没有单独的赢家，也就没有皇冠
  const draw = isDraw(D.scores), W = draw ? null : rank[0];
  const headline = !draw ? `${W.name} 赢下本场` : rank[0].s > 0 && n === 3 ? rank.filter(r => r.no === 1).map(r => r.name).join('、') + ' 并列第一' : '本场平局';

  // 3) 每人数据
  const per = P.map((p, i) => {
    const st = D.stats[i], gold = st.dj + st.xj + st.h9;
    return { win: st.win, rate: pct(st.win, rounds), best: D.best[i], gold, goldRate: pct(gold, rounds),
      pu: st.pu, dj: st.dj, xj: st.xj, h9: st.h9, foul: st.foul, score: D.scores[i] };
  });
  const rowDefs = [
    ['得分', 'score', v => signed(v)], ['胜局', 'win'], ['胜率', 'rate', v => v + '%'], ['最长连胜', 'best'],
    ['出金率', 'goldRate', v => v + '%'], ['普胜', 'pu'], ['大金', 'dj'], ['小金', 'xj'], ['黄金九', 'h9'], ['犯规', 'foul', null, true],
  ];
  const table = rowDefs.map(([l, k, f, low]) => {
    const vals = per.map(x => x[k]), best = low ? Math.min(...vals) : Math.max(...vals);
    const uniq = vals.filter(v => v === best).length === 1;
    return { l, cells: vals.map((v, j) => ({ j, t: f ? f(v) : String(v), hi: uniq && (low ? true : v > 0) && v === best, c: P[j].c, ink: P[j].i })) };
  });

  // 4) 得分来源条形图（按赢来的分）
  const gmax = Math.max(1, ...gain.map(g => g.pu + g.gold + g.foul));
  const sources = P.map((p, i) => {
    const g = gain[i], tot = g.pu + g.gold + g.foul;
    return { ...p, tot, lost: lost[i].paid + lost[i].foul, w: Math.round(tot / gmax * 100),
      segs: [{ k: 'pu', v: g.pu, c: EV.pu.c }, { k: 'gold', v: g.gold, c: EV.dj.c }, { k: 'foul', v: g.foul, c: '#9B6BFF' }]
        .filter(x => x.v).map(x => ({ ...x, w: tot ? x.v / tot * 100 : 0 })) };
  });

  // 5) 本场之最（趣味称号）
  const argmax = arr => { let b = -1, bi = -1, tie = false; arr.forEach((v, i) => { if (v > b) { b = v; bi = i; tie = false; } else if (v === b) tie = true; }); return { v: b, i: bi, tie }; };
  const hl = [];
  const bs = argmax(D.best); if (bs.v >= 2 && !bs.tie) hl.push({ t: '连胜王', d: `最长 ${bs.v} 连胜`, p: P[bs.i], c: '#FF5A5F', ic: '连' });
  const gm = argmax(per.map(x => x.gold)); if (gm.v > 0 && !gm.tie) hl.push({ t: '金球王', d: `打出 ${gm.v} 次金球`, p: P[gm.i], c: '#FFB020', ic: '金' });
  const cb = W ? minS[W.i] : 0; if (W && cb < 0 && W.s > 0) hl.push({ t: '逆转王', d: `从 ${signed(cb)} 打到 ${W.txt}`, p: P[W.i], c: '#1FC98E', ic: '逆' });
  const fm = argmax(per.map(x => x.foul)); if (fm.v > 0 && !fm.tie) hl.push({ t: '手滑王', d: `犯规 ${fm.v} 次`, p: P[fm.i], c: '#9B6BFF', ic: '滑' });
  const pk = argmax(maxS); if (pk.v > 0 && !pk.tie && hl.length < 4) hl.push({ t: '巅峰时刻', d: `最高领先到 ${signed(pk.v)}`, p: P[pk.i], c: '#3D7BFF', ic: '峰' });

  // 6) 整场统计
  const ms = (m.end || Date.now()) - m.start;
  const totals = per.reduce((a, x) => ({ pu: a.pu + x.pu, gold: a.gold + x.gold, foul: a.foul + x.foul }), { pu: 0, gold: 0, foul: 0 });

  return { D, P, W, draw, headline, rank, podium, table, sources, hl: hl.slice(0, 4), series, rounds, ms, totals,
    goldRate: pct(totals.gold, rounds), perRound: rounds ? ms / rounds : 0 };
}

module.exports = { buildReport };
