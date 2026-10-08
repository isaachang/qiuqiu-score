// 球球记分 · 演示数据：Isaac / Henry / Hugo 近一个月的对局（内测体验用，可在「我的」里一键清除）
const { DEFAULT_RULES, derive } = require('./engine');

function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/** 生成一场对局的事件：skill 越高越容易赢；偶尔犯规、偶尔金球 */
function genEvents(r, n, rounds, skill, start) {
  const out = []; let k = 0, t = start;
  const tot = skill.reduce((a, b) => a + b, 0);
  const pick = () => { let x = r() * tot; for (let i = 0; i < n; i++) { x -= skill[i]; if (x <= 0) return i; } return n - 1; };
  while (k < rounds) {
    t += (90 + r() * 150) * 1000;
    const p = pick();
    if (r() < 0.16) { out.push({ p, ev: 'foul', t }); continue; }
    const x = r();
    out.push({ p, ev: x < 0.78 ? 'pu' : x < 0.87 ? 'xj' : x < 0.95 ? 'h9' : 'dj', t });
    k++;
  }
  return { events: out, end: t + 60e3 };
}

// [几天前, 几点开始, 模式, 球员, 局数]（球员顺序即首局开球顺序）
const PLAN = [
  [0.3, 20, 3, ['me', 'henry', 'hugo'], 28], [1, 21, 2, ['me', 'henry'], 24], [2, 19, 2, ['me', 'hugo'], 18],
  [3, 22, 3, ['hugo', 'me', 'henry'], 32], [5, 20, 2, ['me', 'henry'], 30], [6, 21, 3, ['henry', 'hugo', 'me'], 26],
  [9, 20, 2, ['me', 'hugo'], 22], [11, 19, 3, ['me', 'henry', 'hugo'], 35], [13, 21, 2, ['henry', 'me'], 20],
  [16, 20, 3, ['hugo', 'henry', 'me'], 30], [19, 22, 2, ['me', 'henry'], 26], [22, 20, 2, ['hugo', 'me'], 16],
  [25, 21, 3, ['me', 'hugo', 'henry'], 24], [28, 19, 2, ['me', 'henry'], 28],
];
const SKILL = { me: 1.08, henry: 1, hugo: 1.04 };

function seedDemo(s) {
  if (s.demo) return false;
  const me = s.friends.find(f => f.me);
  s.demo = { meName: me.name, matches: [], friends: [] };
  if (me.name === '我') me.name = 'Isaac';
  const ensure = (key, name, color) => {
    let f = s.friends.find(x => !x.deleted && !x.me && x.name.toLowerCase() === name.toLowerCase());
    if (!f) { f = { id: 'demo_' + key, name, color, demo: true }; s.friends.push(f); s.demo.friends.push(f.id); }
    return f.id;
  };
  const ids = { me: me.id, henry: ensure('henry', 'Henry', 1), hugo: ensure('hugo', 'Hugo', 2) };
  const r = rng(2026);
  const now = Date.now();
  PLAN.forEach(([daysAgo, hour, mode, pl, rounds], i) => {
    const d = new Date(now - daysAgo * 864e5); d.setHours(hour, Math.floor(r() * 50), 0, 0);
    const start = Math.min(d.getTime(), now - 3 * 3600e3);
    const { events, end } = genEvents(r, mode, rounds, pl.map(k => SKILL[k]), start);
    const m = { id: 'demo_m' + i, demo: true, mode, players: pl.map(k => ids[k]), order0: pl.map((_, j) => j), rules: DEFAULT_RULES(), events, start, end, status: 'done' };
    derive(m); // 校验一下
    s.history.push(m); s.demo.matches.push(m.id);
  });
  s.history.sort((a, b) => b.start - a.start);
  return true;
}

function clearDemo(s) {
  if (!s.demo) return false;
  if (s.live && s.live.players.some(id => s.demo.friends.includes(id))) return '有进行中的对局用到了演示球友，先结算它';
  const mids = new Set(s.demo.matches), fids = new Set(s.demo.friends);
  s.history = s.history.filter(m => !mids.has(m.id));
  s.friends = s.friends.filter(f => !fids.has(f.id));
  const me = s.friends.find(f => f.me);
  if (me && me.name === 'Isaac' && s.demo.meName === '我') me.name = '我';
  if (s.draft) s.draft.slots = s.draft.slots.filter(id => !fids.has(id));
  s.demo = null;
  return true;
}

module.exports = { seedDemo, clearDemo };
