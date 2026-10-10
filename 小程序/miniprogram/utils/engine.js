// 球球记分 · 规则引擎（纯函数，无任何 wx / DOM 依赖，可单测、可复用到新玩法）
//
// match = { mode, players:[friendId], order0:[座位下标], rules, events:[{p, ev, t}] }
// 顺序规则：每局胜者排到第一位开下一局，其余人保持原先后顺序；犯规不改变顺序。
// 付分：上家 = 本局顺序中排在胜者前一位（循环）；两家 = 其余所有人。双人时上家就是对手。

const EV = {
  pu:   { name: '普胜',   c: '#1FBF75', t: '#0E9F5E', desc: '合法打进 9 号球' },
  dj:   { name: '大金',   c: '#FFB020', t: '#E08A00', desc: '开球后一杆清台', gold: true },
  xj:   { name: '小金',   c: '#FF8A3D', t: '#F06A10', desc: '接杆一杆清台', gold: true },
  h9:   { name: '黄金九', c: '#FFC21A', t: '#D99A00', desc: '开球直接进 9 号', gold: true },
  foul: { name: '犯规',   c: '#FF4D4F', t: '#E5383B', desc: '犯规方扣分，转给上家/下家' },
};
const MAIN = ['pu', 'dj', 'xj', 'h9', 'foul'];
const CHIPS = ['dj', 'xj', 'h9', 'foul']; // 普胜 = 点卡片本身

const DEFAULT_RULES = () => ({
  pu: { v: 4, pay: 'up' },
  dj: { v: 10, pay: 'all' },
  xj: { v: 7, pay: 'up' },
  h9: { v: 4, pay: 'all' },
  foul: { v: 1, pay: 'up' },
});
const PAY = { up: '上家付', all: '两家付' };
const FOULTO = { up: '给上家', down: '给下家' };

function derive(m) {
  const n = m.players.length;
  const scores = Array(n).fill(0);
  const stats = [...Array(n)].map(() => ({ pu: 0, dj: 0, xj: 0, h9: 0, foul: 0, win: 0 }));
  const best = Array(n).fill(0);
  const steps = [];
  let order = [...m.order0], round = 1, lastW = -1, cur = 0;

  for (const e of m.events) {
    const r = m.rules[e.ev];
    const pos = order.indexOf(e.p);
    const up = order[(pos - 1 + n) % n], down = order[(pos + 1) % n];
    const d = Array(n).fill(0);
    let payers = [], to = null;
    const before = [...order], rnd = round;

    if (e.ev === 'foul') {
      to = r.pay === 'down' ? down : up;
      d[e.p] -= r.v; d[to] += r.v;
    } else {
      payers = r.pay === 'all' ? order.filter(x => x !== e.p) : [up];
      payers.forEach(x => { d[x] -= r.v; d[e.p] += r.v; });
      order = [e.p, ...order.filter(x => x !== e.p)];
      round++; stats[e.p].win++;
      cur = lastW === e.p ? cur + 1 : 1; lastW = e.p; best[e.p] = Math.max(best[e.p], cur);
    }
    d.forEach((x, i) => { scores[i] += x; });
    stats[e.p][e.ev]++;
    steps.push({ ...e, d, payers, to, before, after: [...order], round: rnd });
  }
  return { scores, stats, order, round, steps, best };
}

const signed = v => (v > 0 ? '+' + v : v < 0 ? '−' + Math.abs(v) : '0');

/** 平局：最高分有两人以上并列（含全员 0 分） */
function isDraw(sc) { const max = Math.max(...sc); return max <= 0 || sc.filter(x => x === max).length > 1; }
/** 某人这场的结果：W 胜（唯一最高且为正）/ L 负（净分为负）/ D 平 */
function outcome(sc, i) { const my = sc[i]; if (my === Math.max(...sc) && my > 0 && !isDraw(sc)) return 'W'; return my < 0 ? 'L' : 'D'; }
/** 实际打球时长（毫秒）：扣掉自动保存后「继续这局」中间空着的时间，以及暂停的时间（暂停中按暂停那一刻算） */
function played(m, now) { return Math.max(0, (m.end || m.pauseAt || now || Date.now()) - m.start - (m.idle || 0)); }

module.exports = { EV, MAIN, CHIPS, DEFAULT_RULES, PAY, FOULTO, derive, signed, isDraw, outcome, played };
