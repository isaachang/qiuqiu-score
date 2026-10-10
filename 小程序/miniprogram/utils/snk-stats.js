// 球球记分 · 斯诺克战绩（输出结构和追分的 overview / headToHead 一致，战绩页、交手页可以复用同一套模板）
const SN = require('./snooker');
const { signed } = require('./engine');
const { isSnk } = require('./game');

const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
const md = t => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}`; };

/** 某人在一组斯诺克对局里的数据 */
function personal(ms, id) {
  const P = { n: 0, mW: 0, mL: 0, mD: 0, fW: 0, fL: 0, pts: 0, frames: 0, hi: 0, fifty: 0, century: 0, fouls: 0, pens: 0, breaks: [] };
  ms.forEach(m => {
    const S = SN.derive(m), i = m.players.indexOf(id), oc = SN.outcome(S, i);
    P.n++; if (oc === 'W') P.mW++; else if (oc === 'L') P.mL++; else P.mD++;
    P.fW += S.fw[i]; P.fL += S.fw[1 - i];
    S.frames.forEach(f => {
      P.frames++; P.pts += f.sc[i] - (f.hc && f.hc.p === i ? f.hc.pts : 0); P.fouls += f.fouls[i]; P.pens += f.pens[i];
      f.breaks.filter(b => b.p === i).forEach(b => { P.breaks.push(b.v); P.hi = Math.max(P.hi, b.v); if (b.v >= 50) P.fifty++; if (b.v >= 100) P.century++; });
    });
  });
  P.frameRate = pct(P.fW, P.fW + P.fL);
  P.avg = P.frames ? Math.round(P.pts / P.frames) : 0;
  return P;
}
function titleOf(P) {
  if (!P.n) return { t: '斯诺克', d: '打完一场斯诺克，这里会出现你的数据' };
  if (P.century) return { t: '破百高手', d: `打出过 ${P.century} 杆 100+` };
  if (P.fifty) return { t: '半百杆手', d: `单杆最高 ${P.hi}` };
  if (P.frameRate >= 60 && P.n >= 3) return { t: '局局必争', d: `局胜率 ${P.frameRate}%` };
  return { t: '斯诺克新秀', d: `单杆最高 ${P.hi}` };
}

/** 战绩页（斯诺克） */
function overview(history, meId, view, days) {
  const since = days ? Date.now() - days * 864e5 : 0;
  const ms = history.filter(m => m.status === 'done' && isSnk(m) && m.players.includes(meId) && m.start >= since);
  const P = personal(ms, meId);
  const chrono = [...ms].reverse();
  const results = chrono.map(m => SN.outcome(SN.derive(m), m.players.indexOf(meId)));

  // 球友关系：按场次算胜负，局差 = 我赢的局 − 他赢的局
  const rel = {};
  ms.forEach(m => {
    const S = SN.derive(m), i = m.players.indexOf(meId), id = m.players[1 - i];
    const r = rel[id] || (rel[id] = { id, n: 0, w: 0, l: 0, net: 0, last: 0 });
    r.n++; r.last = Math.max(r.last, m.start);
    const oc = SN.outcome(S, i); if (oc === 'W') r.w++; else if (oc === 'L') r.l++;
    r.net += S.fw[i] - S.fw[1 - i];
  });
  const friends = Object.values(rel).map(r => ({ ...view(r.id), ...r, netTxt: signed(r.net), netLabel: '局差' }))
    .sort((a, b) => b.n - a.n || b.net - a.net);

  // 单杆分布
  const buckets = [[10, 19, '10–19'], [20, 29, '20–29'], [30, 49, '30–49'], [50, 999, '50+']];
  const cnt = buckets.map(([a, b]) => P.breaks.filter(v => v >= a && v <= b).length), cmax = Math.max(1, ...cnt);
  const dist = buckets.map(([, , l], k) => ({ l, v: cnt[k], h: Math.round(cnt[k] / cmax * 100) }));

  return {
    P, title: titleOf(P), recent: days ? results.slice(-30) : results.slice(-10),
    kpis: [{ l: '场次', v: P.n }, { l: '局胜率', v: P.frameRate + '%' }, { l: '单杆最高', v: P.hi }], // 胜率在名片里单独大字显示
    wld: { rate: pct(P.mW, P.n), w: P.mW, l: P.mL, d: P.mD },
    groups: [
      { t: '局', items: [{ l: '总局数', v: P.frames }, { l: '赢局', v: P.fW, cls: 'pos' }, { l: '输局', v: P.fL, cls: 'neg' }, { l: '局胜率', v: P.frameRate + '%', hot: true }] },
      { t: '单杆', s: P.century ? `破百 ${P.century} 次` : '', items: [{ l: '单杆最高', v: P.hi }, { l: '50+ 单杆', v: P.fifty }, { l: '平均每局', v: P.avg }, { l: '犯规', v: P.fouls }] },
    ],
    foot: `${P.n} 场 · ${P.frames} 局`,
    dist, hasBreaks: P.breaks.some(v => v >= 10),
    friends, ms,
  };
}

/** 交手页（斯诺克）：我 vs 某位球友 */
function headToHead(history, meId, fid) {
  const ms = history.filter(m => m.status === 'done' && isSnk(m) && m.players.includes(meId) && m.players.includes(fid));
  let w = 0, l = 0, d = 0;
  const form = [];
  [...ms].reverse().forEach(m => {
    const oc = SN.outcome(SN.derive(m), m.players.indexOf(meId));
    if (oc === 'W') w++; else if (oc === 'L') l++; else d++;
    form.push(oc);
  });
  const A = personal(ms, meId), B = personal(ms, fid);
  const defs = [['局胜率', 'frameRate', v => v + '%'], ['单杆最高', 'hi'], ['50+ 单杆', 'fifty'], ['平均每局', 'avg'], ['犯规', 'fouls', null, true]];
  const cmp = defs.map(([lb, k, f, low]) => {
    const a = A[k], b = B[k], tot = Math.abs(a) + Math.abs(b) || 1;
    return { l: lb, a: f ? f(a) : String(a), b: f ? f(b) : String(b), wa: Math.round(Math.abs(a) / tot * 100), wb: Math.round(Math.abs(b) / tot * 100),
      aw: low ? a < b : a > b, bw: low ? b < a : b > a };
  });
  const verdict = !ms.length ? '还没有一起打过斯诺克' : w > l * 1.5 && w >= 2 ? '你是他的克星' : l > w * 1.5 && l >= 2 ? '他是你的克星' : '势均力敌的老对手';
  return { snk: true, n: ms.length, w, l, d, verdict, form: form.slice(-10), cmp, ms };
}

module.exports = { overview, headToHead, personal };
