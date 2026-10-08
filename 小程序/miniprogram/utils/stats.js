// 球球记分 · 战绩统计（纯函数，输入历史对局，输出统计页 / 交手页需要的全部数据）
const { EV, derive, signed } = require('./engine');

const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
const md = t => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}`; };

/** 一场对局里，A 直接从 B 手里赢走的分（三人局只算两人之间的往来） */
function transfer(m, D, a, b) {
  let ab = 0;
  D.steps.forEach(s => {
    const v = m.rules[s.ev].v;
    if (s.ev === 'foul') { if (s.p === b && s.to === a) ab += v; if (s.p === a && s.to === b) ab -= v; }
    else { if (s.p === a && s.payers.includes(b)) ab += v; if (s.p === b && s.payers.includes(a)) ab -= v; }
  });
  return ab;
}

/** 某人在一组对局里的个人数据 */
function personal(ms, id) {
  let rounds = 0, wins = 0, gold = 0, foul = 0, pu = 0, best = 0, score = 0, top = -Infinity, mWins = 0;
  const ev = { pu: 0, dj: 0, xj: 0, h9: 0, foul: 0 };
  ms.forEach(m => {
    const D = m._D || (m._D = derive(m)), i = m.players.indexOf(id), st = D.stats[i];
    rounds += D.round - 1; wins += st.win; gold += st.dj + st.xj + st.h9; foul += st.foul; pu += st.pu;
    best = Math.max(best, D.best[i]); score += D.scores[i]; top = Math.max(top, D.scores[i]);
    Object.keys(ev).forEach(k => { ev[k] += st[k]; });
    if (D.scores[i] === Math.max(...D.scores) && D.scores[i] > 0) mWins++;
  });
  return { n: ms.length, rounds, wins, gold, foul, pu, best, score, top: ms.length ? top : 0, mWins, ev,
    roundRate: pct(wins, rounds), goldRate: pct(gold, rounds), foulPer: rounds ? Math.round(foul / rounds * 100) / 100 : 0,
    avg: ms.length ? Math.round(score / ms.length * 10) / 10 : 0 };
}

function titleOf(p) {
  if (p.n < 3) return { t: '新秀', d: '再打几场，解锁你的球风称号' };
  if (p.goldRate >= 15) return { t: '金球猎手', d: `每 100 局能打出 ${p.goldRate} 次金球` };
  if (p.best >= 5) return { t: '连胜机器', d: `单场最长 ${p.best} 连胜` };
  if (pct(p.mWins, p.n) >= 60) return { t: '常胜将军', d: `赢下了 ${pct(p.mWins, p.n)}% 的对局` };
  if (p.foulPer >= 0.35) return { t: '手滑大王', d: `平均每局犯规 ${p.foulPer} 次` };
  return { t: '稳健派', d: '不温不火，稳稳拿分' };
}

/** 统计页 */
function overview(history, meId, seg, view, days) {
  const since = days ? Date.now() - days * 864e5 : 0;
  const ms = history.filter(m => m.status === 'done' && m.players.includes(meId) && (seg === 'all' || m.mode === +seg) && m.start >= since);
  const P = personal(ms, meId);
  const chrono = [...ms].reverse();

  // 每场结果 + 累计净胜分
  let acc = 0; const series = [0], titles = ['起点'], notes = [''];
  const results = chrono.map(m => {
    const D = m._D, i = m.players.indexOf(meId), my = D.scores[i], max = Math.max(...D.scores);
    acc += my; series.push(acc);
    const opp = m.players.filter(x => x !== meId).map(x => view(x).name).join('、');
    titles.push(`${md(m.start)} · vs ${opp}`); notes.push(`本场 ${signed(my)} · 累计 ${signed(acc)}`);
    return my === max && my > 0 ? 'W' : my < 0 ? 'L' : 'D';
  });
  const ticks = []; const N = chrono.length, cnt = Math.min(4, N);
  for (let k = 0; k <= cnt; k++) { const i = Math.round(N * k / (cnt || 1)); ticks.push({ i, t: i === 0 ? '起点' : md(chrono[i - 1].start) }); }

  // 球友关系
  const rel = {};
  ms.forEach(m => {
    const D = m._D, i = m.players.indexOf(meId);
    m.players.forEach((id, j) => {
      if (id === meId) return;
      const r = rel[id] || (rel[id] = { id, n: 0, w: 0, l: 0, net: 0 });
      r.n++; if (D.scores[i] > D.scores[j]) r.w++; else if (D.scores[i] < D.scores[j]) r.l++;
      r.net += transfer(m, D, i, j);
    });
  });
  const friends = Object.values(rel).map(r => ({ ...view(r.id), ...r, netTxt: signed(r.net), rate: pct(r.w, r.n) }))
    .sort((a, b) => b.n - a.n || b.net - a.net);
  const bank = friends.filter(f => f.net > 0).sort((a, b) => b.net - a.net)[0] || null;   // 我的提款机
  const nemesis = friends.filter(f => f.net < 0).sort((a, b) => a.net - b.net)[0] || null; // 我的克星
  friends.forEach(f => { f.tag = bank && f.id === bank.id ? 'bank' : nemesis && f.id === nemesis.id ? 'nem' : ''; });
  const mate = friends[0] || null;

  const evMax = Math.max(1, ...Object.values(P.ev));
  return {
    P, title: titleOf(P), recent: days ? results.slice(-30) : results.slice(-10),
    kpis: [{ l: '对局', v: P.n }, { l: '胜率', v: pct(P.mWins, P.n) + '%' }, { l: '净胜分', v: signed(P.score), cls: P.score > 0 ? 'pos' : P.score < 0 ? 'neg' : '' }, { l: '单场最高', v: P.n ? signed(P.top) : '—' }],
    bests: [{ l: '最长连胜', v: P.best, u: '连胜' }, { l: '金球', v: P.gold, u: '次' }, { l: '场均', v: signed(P.avg), u: '分' }],
    chart: { series: [series], colors: ['#FF5A5F'], names: ['累计净胜'], titles, notes, ticks },
    friends, bank, nemesis, mate,
    bars: Object.keys(P.ev).map(k => ({ k, name: EV[k].name, c: EV[k].c, v: P.ev[k], w: Math.round(P.ev[k] / evMax * 100) })),
    ms,
  };
}

/** 交手页：我 vs 某位球友 */
function headToHead(history, meId, fid, view) {
  const ms = history.filter(m => m.status === 'done' && m.players.includes(meId) && m.players.includes(fid));
  const chrono = [...ms].reverse();
  let w = 0, l = 0, d = 0, gain = 0, loss = 0, bigW = null, bigL = null;
  const sA = [0], sB = [0], titles = ['起点'], notes = [''];
  const form = [];
  chrono.forEach(m => {
    const D = m._D || (m._D = derive(m)), a = m.players.indexOf(meId), b = m.players.indexOf(fid);
    const diff = D.scores[a] - D.scores[b], t = transfer(m, D, a, b);
    if (diff > 0) w++; else if (diff < 0) l++; else d++;
    form.push(diff > 0 ? 'W' : diff < 0 ? 'L' : 'D');
    if (t > 0) gain += t; else loss += -t;
    if (!bigW || diff > bigW.diff) bigW = { diff, m };
    if (!bigL || diff < bigL.diff) bigL = { diff, m };
    sA.push(sA[sA.length - 1] + D.scores[a]); sB.push(sB[sB.length - 1] + D.scores[b]);
    titles.push(`${md(m.start)} · ${m.mode === 2 ? '双人' : '三人'}`); notes.push(`本场 ${signed(D.scores[a])} : ${signed(D.scores[b])}`);
  });
  const A = personal(ms, meId), B = personal(ms, fid);
  const cmpDefs = [['场均得分', 'avg', false, v => signed(v)], ['每局胜率', 'roundRate', false, v => v + '%'], ['出金率', 'goldRate', false, v => v + '%'],
    ['最长连胜', 'best', false], ['每局犯规', 'foulPer', true]];
  const cmp = cmpDefs.map(([l, k, low, f]) => {
    const a = A[k], b = B[k], tot = Math.abs(a) + Math.abs(b) || 1;
    const aBetter = low ? a < b : a > b, bBetter = low ? b < a : b > a;
    return { l, a: f ? f(a) : String(a), b: f ? f(b) : String(b), wa: Math.round(Math.abs(a) / tot * 100), wb: Math.round(Math.abs(b) / tot * 100), aw: aBetter, bw: bBetter };
  });
  const net = gain - loss;
  const verdict = !ms.length ? '还没有一起打过' : w > l * 1.5 && w >= 2 ? '你是他的克星' : l > w * 1.5 && l >= 2 ? '他是你的克星' : '势均力敌的老对手';
  const N = chrono.length, ticks = []; const cnt = Math.min(4, N);
  for (let k = 0; k <= cnt; k++) { const i = Math.round(N * k / (cnt || 1)); ticks.push({ i, t: i === 0 ? '起点' : md(chrono[i - 1].start) }); }
  return {
    n: ms.length, w, l, d, rate: pct(w, w + l), verdict, gain, loss, net, netTxt: signed(net),
    form: form.slice(-10), cmp,
    bigW: bigW && bigW.diff > 0 ? { txt: '+' + bigW.diff, id: bigW.m.id, when: md(bigW.m.start) } : null,
    bigL: bigL && bigL.diff < 0 ? { txt: '−' + (-bigL.diff), id: bigL.m.id, when: md(bigL.m.start) } : null,
    chart: { series: [sA, sB], titles, notes, ticks },
    ms,
  };
}

module.exports = { overview, headToHead, transfer, personal };
