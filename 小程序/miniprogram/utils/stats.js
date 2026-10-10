// 球球记分 · 战绩统计（纯函数，输入历史对局，输出统计页 / 交手页需要的全部数据）
const { EV, signed, outcome, played } = require('./engine');
const { derived } = require('./cache');
const { isChase } = require('./game');

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
  let rounds = 0, wins = 0, gold = 0, foul = 0, pu = 0, best = 0, score = 0, top = -Infinity, mWins = 0, mLoss = 0, durSum = 0, clean = 0;
  const ev = { pu: 0, dj: 0, xj: 0, h9: 0, foul: 0 }, gain = { pu: 0, gold: 0, foul: 0 };
  ms.forEach(m => {
    const D = derived(m), i = m.players.indexOf(id), st = D.stats[i];
    rounds += D.round - 1; wins += st.win; gold += st.dj + st.xj + st.h9; foul += st.foul; pu += st.pu;
    best = Math.max(best, D.best[i]); score += D.scores[i]; top = Math.max(top, D.scores[i]);
    Object.keys(ev).forEach(k => { ev[k] += st[k]; });
    const oc = outcome(D.scores, i); if (oc === 'W') mWins++; else if (oc === 'L') mLoss++;
    durSum += played(m, m.start);
    if (st.foul === 0 && D.round - 1 >= 5) clean++;
    D.steps.forEach(s => { const x = s.d[i]; if (x > 0) gain[s.ev === 'foul' ? 'foul' : EV[s.ev].gold ? 'gold' : 'pu'] += x; });
  });
  return { n: ms.length, rounds, wins, gold, foul, pu, best, score, top: ms.length ? top : 0, mWins, mLoss, mDraw: ms.length - mWins - mLoss, ev, gain, clean,
    durAvg: ms.length ? durSum / ms.length : 0, foulPerMatch: ms.length ? Math.round(foul / ms.length * 10) / 10 : 0,
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
  const ms = history.filter(m => m.status === 'done' && isChase(m) && m.players.includes(meId) && (seg === 'all' || m.mode === +seg) && m.start >= since);
  const P = personal(ms, meId);
  const chrono = [...ms].reverse();

  // 每场结果 + 累计净胜分
  let acc = 0; const series = [0], titles = ['起点'], notes = [''];
  const results = chrono.map(m => {
    const D = derived(m), i = m.players.indexOf(meId), my = D.scores[i];
    acc += my; series.push(acc);
    const opp = m.players.filter(x => x !== meId).map(x => view(x).name).join('、');
    titles.push(`${md(m.start)} · vs ${opp}`); notes.push(`本场 ${signed(my)} · 累计 ${signed(acc)}`);
    return outcome(D.scores, i);
  });
  const ticks = []; const N = chrono.length, cnt = Math.min(4, N);
  for (let k = 0; k <= cnt; k++) { const i = Math.round(N * k / (cnt || 1)); ticks.push({ i, t: i === 0 ? '起点' : md(chrono[i - 1].start) }); }

  // 球友关系
  const rel = {};
  ms.forEach(m => {
    const D = derived(m), i = m.players.indexOf(meId);
    m.players.forEach((id, j) => {
      if (id === meId) return;
      const r = rel[id] || (rel[id] = { id, n: 0, w: 0, l: 0, net: 0, last: 0 });
      r.last = Math.max(r.last, m.start);
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

  const g = P.gain, gt = g.pu + g.gold + g.foul;
  const mm = Math.round(P.durAvg / 6e4);
  return {
    wld: { rate: pct(P.mWins, P.n), w: P.mWins, l: P.mLoss, d: P.mDraw },
    // 我的数据：效率（比率类）/ 进球（次数）/ 得分来源，分组放在一张卡片里；净胜分不展示
    groups: [
      { t: '效率', items: [{ l: '每局胜率', v: P.roundRate + '%' }, { l: '出金率', v: P.goldRate + '%', hot: true }, { l: '最长连胜', v: P.best }, { l: '场均犯规', v: P.foulPerMatch }] },
      { t: '进球', s: `金球共 ${P.gold} 次`, items: [{ l: '普胜', v: P.ev.pu, c: EV.pu.t }, { l: '大金', v: P.ev.dj, c: EV.dj.t }, { l: '小金', v: P.ev.xj, c: EV.xj.t }, { l: '黄金九', v: P.ev.h9, c: EV.h9.t }, { l: '犯规', v: P.ev.foul, c: EV.foul.t }] },
      gt ? { t: '得分来源', s: `赢来的 ${gt} 分`, bar: [{ k: 'pu', l: '普胜', v: g.pu, c: EV.pu.c, w: Math.round(g.pu / gt * 100) }, { k: 'gold', l: '金球', v: g.gold, c: EV.dj.c, w: Math.round(g.gold / gt * 100) },
        { k: 'foul', l: '对手犯规', v: g.foul, c: '#9B6BFF', w: Math.round(g.foul / gt * 100) }].filter(x => x.v) } : null,
    ].filter(Boolean),
    foot: `${P.n} 场 · ${P.rounds} 局` + (P.n ? ` · 场均 ${mm >= 60 ? `${mm / 60 | 0}小时${mm % 60 ? mm % 60 + '分' : ''}` : `${mm}分钟`}` : ''),

    P, title: titleOf(P), recent: days ? results.slice(-30) : results.slice(-10),
    kpis: [{ l: '对局', v: P.n }, { l: '出金率', v: P.goldRate + '%' }, { l: '单场最高', v: P.n ? signed(P.top) : '—' }], // 胜率在名片里单独大字显示

    chart: { series: [series], colors: ['#FF5A5F'], names: ['累计净胜'], titles, notes, ticks },
    friends, bank, nemesis, mate,
    ms,
  };
}

/** 交手页：我 vs 某位球友 */
function headToHead(history, meId, fid, view) {
  const ms = history.filter(m => m.status === 'done' && isChase(m) && m.players.includes(meId) && m.players.includes(fid));
  const chrono = [...ms].reverse();
  let w = 0, l = 0, d = 0, gain = 0, loss = 0, bigW = null, bigL = null;
  const sA = [0], sB = [0], titles = ['起点'], notes = [''];
  const form = [];
  chrono.forEach(m => {
    const D = derived(m), a = m.players.indexOf(meId), b = m.players.indexOf(fid);
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

/** 成就徽章（按全部战绩计算） */
function achievements(P) {
  const A = [
    { k: 'first', t: '初次登场', d: '完成第 1 场对局', c: '#3D7BFF', ic: '1', ok: P.n >= 1, p: `${Math.min(P.n, 1)}/1` },
    { k: 'ten', t: '十场老将', d: '完成 10 场对局', c: '#1FC98E', ic: '10', ok: P.n >= 10, p: `${Math.min(P.n, 10)}/10` },
    { k: 'dj', t: '金手指', d: '打出第一个大金', c: '#FFB020', ic: '金', ok: P.ev.dj >= 1, p: `${Math.min(P.ev.dj, 1)}/1` },
    { k: 'h9', t: '黄金一杆', d: '打出第一个黄金九', c: '#FFC21A', ic: '9', ok: P.ev.h9 >= 1, p: `${Math.min(P.ev.h9, 1)}/1` },
    { k: 'streak', t: '五连胜', d: '单场连赢 5 局', c: '#FF5A5F', ic: '连', ok: P.best >= 5, p: `${Math.min(P.best, 5)}/5` },
    { k: 'fifty', t: '大满贯', d: '单场赢 50 分以上', c: '#9B6BFF', ic: '50', ok: P.top >= 50, p: `${Math.max(0, Math.min(P.top, 50))}/50` },
    { k: 'clean', t: '零失误', d: '打满 5 局且没有犯规', c: '#22C993', ic: '净', ok: P.clean >= 1, p: `${Math.min(P.clean, 1)}/1` },
    { k: 'gold10', t: '金球收藏家', d: '累计 10 次金球', c: '#FF8A3D', ic: '藏', ok: P.gold >= 10, p: `${Math.min(P.gold, 10)}/10` },
  ];
  return { list: A, got: A.filter(a => a.ok).length };
}

module.exports = { overview, headToHead, transfer, personal, achievements };
