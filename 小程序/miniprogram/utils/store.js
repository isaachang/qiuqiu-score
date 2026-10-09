// 球球记分 · 本地数据（内测版只存本机：wx.setStorageSync）
const { DEFAULT_RULES, derive } = require('./engine');
const demo = require('./demo');
const env = require('./env');

const COLORS = [
  { c: '#FF5A5F', i: '#FFFFFF' }, { c: '#3D7BFF', i: '#FFFFFF' }, { c: '#FFC53D', i: '#FFFFFF' },
  { c: '#1FC98E', i: '#FFFFFF' }, { c: '#9B6BFF', i: '#FFFFFF' }, { c: '#FF8A3D', i: '#FFFFFF' },
  { c: '#FF6FB5', i: '#FFFFFF' }, { c: '#14B8C4', i: '#FFFFFF' },
];

function fresh() {
  return {
    friends: [{ id: 'me', name: '我', color: 0, me: true }],
    history: [],
    live: null,
    draft: null,
    settings: { vib: true, keep: true, sfx: true },
    defaultRules: DEFAULT_RULES(),
    seq: 1,
  };
}

/* =========================================================
   存储：拆成多份分开存，每次只写改动过的那一份
   ---------------------------------------------------------
   qq_meta      球友、设置、默认规则、草稿等（很小）
   qq_live      进行中的对局（记分时只写它）
   qq_hidx      历史对局有哪些月份
   qq_h_YYYYMM  某个月的历史对局
   微信限制：单个 key 最多 1MB、总共 10MB。按月拆分后单个 key 远小于 1MB。
   ========================================================= */
const P = env.keyPrefix();
const LEGACY = P + 'qq_state_v1';
const K = { meta: P + 'qq_meta', live: P + 'qq_live', idx: P + 'qq_hidx', month: mk => P + 'qq_h_' + mk };
const monthOf = m => { const d = new Date(m.start); return d.getFullYear() * 100 + d.getMonth() + 1; };

let S = null;
const written = {};          // key → 上次写入的内容（JSON 字符串），一样就不重复写
let dirtyMonths = new Set();  // 需要重写的月份
let alerted = false;

function fail(e) {
  console.error('保存失败', e);
  if (alerted) return;
  alerted = true;
  wx.showModal({ title: '保存失败', content: '手机存储空间不足或写入失败，最近的记分可能没有保存。请清理旧对局或手机存储后再试。', showCancel: false, confirmText: '知道了' });
}
function write(key, val) {
  const str = JSON.stringify(val === undefined ? null : val);
  if (written[key] === str) return true;
  try { wx.setStorageSync(key, val === undefined ? null : val); written[key] = str; return true; } catch (e) { fail(e); return false; }
}
function markHist(m) { if (m) dirtyMonths.add(monthOf(m)); }
function markAllHist() { get().history.forEach(markHist); }

function metaOf(s) { const o = Object.assign({}, s); delete o.history; delete o.live; return o; }
/** 把内存里的数据写回本地：设置 + 进行中的对局 + 有改动的月份 */
function persist() {
  const s = get();
  write(K.meta, metaOf(s));
  write(K.live, s.live);
  if (dirtyMonths.size) {
    const by = {};
    s.history.forEach(m => { const mk = monthOf(m); (by[mk] || (by[mk] = [])).push(m); });
    dirtyMonths.forEach(mk => {
      if (by[mk]) write(K.month(mk), by[mk]);
      else { try { wx.removeStorageSync(K.month(mk)); } catch (e) {} delete written[K.month(mk)]; }
    });
    write(K.idx, Object.keys(by).map(Number).sort((x, y) => y - x));
    dirtyMonths = new Set();
  }
}

function load() {
  const read = k => { try { const v = wx.getStorageSync(k); return v === '' ? null : v; } catch (e) { return null; } };
  const meta = read(K.meta);
  if (meta) {
    S = meta;
    S.live = read(K.live) || null;
    const idx = read(K.idx) || [];
    S.history = [];
    idx.forEach(mk => { const arr = read(K.month(mk)) || []; S.history.push(...arr); written[K.month(mk)] = JSON.stringify(arr); });
    S.history.sort((x, y) => y.start - x.start);
    written[K.meta] = JSON.stringify(metaOf(S)); written[K.live] = JSON.stringify(S.live); written[K.idx] = JSON.stringify(idx);
    return false;
  }
  // 旧版（所有数据存在一个 key 里）→ 迁移到分开存
  const old = read(LEGACY);
  S = old || fresh();
  if (!S.history) S.history = [];
  return true;
}

function get() {
  if (!S) {
    const needWrite = load();
    migrate(S);
    // 开发版：第一次打开且还没有任何对局时，自动载入演示数据（可在「我的」里清除）
    // 体验版 / 正式版：不载入；以前载入过的演示数据自动清掉一次（真实对局里用过的演示球友会保留）
    let clean = false;
    if (env.isDev()) { if (!S.demoSeen) { S.demoSeen = true; if (!S.history.length) demo.seedDemo(S); } }
    else if (S.demo) { const before = S.history.slice(); demo.clearDemo(S); before.forEach(m => dirtyMonths.add(monthOf(m))); clean = true; }
    if (needWrite || dirtyMonths.size || clean) {
      markAllHist();
      persist();
      try { wx.removeStorageSync(LEGACY); } catch (e) {}
    }
  }
  return S;
}
/** 数据迁移（逐级）：v2 犯规恢复为 −1；v3 清掉误存的计算结果、补「玩法」字段；v4 拆分存储（在 load 里完成） */
function migrate(s) {
  const v = s.ver || 1;
  if (v >= 4) return;
  if (v < 2) {
    const fix = r => { if (r && r.foul && r.foul.v !== 1) r.foul.v = 1; };
    fix(s.defaultRules); s.draft && fix(s.draft.rules); s.live && fix(s.live.rules);
  }
  if (v < 3) {
    const fix3 = m => { if (!m) return; delete m._D; if (!m.game) m.game = 'chase'; };
    (s.history || []).forEach(fix3); fix3(s.live); if (s.draft && !s.draft.game) s.draft.game = 'chase';
  }
  s.ver = 4;
  markAllHist && (s.history || []).forEach(m => dirtyMonths.add(monthOf(m)));
}
let REV = 1;
/** 数据版本号：每次保存都会变。页面显示时比较它，数据没变就不用重新计算 */
function rev() { return REV; }
function save() { REV++; persist(); }
/** 存储空间接近上限时提醒（结算时检查） */
function checkSpace() {
  try {
    const i = wx.getStorageInfoSync();
    if (i.limitSize && i.currentSize / i.limitSize > 0.85) wx.showToast({ title: '存储空间快满了，建议清理旧对局', icon: 'none', duration: 3000 });
  } catch (e) {}
}

function friend(id) { return get().friends.find(f => f.id === id) || { id, name: '?', color: 0 }; }
function color(id) { return COLORS[friend(id).color % COLORS.length]; }
/** 新球友的颜色：挑现在用得最少的；「我」的颜色最后才会被重复用 */
function freeColor(s) {
  const use = COLORS.map(() => 0);
  s.friends.forEach(f => { if (!f.deleted) use[f.color % COLORS.length] += f.me ? 1.5 : 1; });
  let best = 0; use.forEach((v, k) => { if (v < use[best]) best = k; });
  return best;
}
function addFriend(name) {
  const s = get();
  const id = 'f' + Date.now().toString(36) + (s.seq++);
  s.friends.push({ id, name, color: freeColor(s) });
  save();
  return id;
}
/** 球员展示信息：名字、首字、颜色 */
function view(id) { const f = friend(id), c = color(id); return { id, name: f.name, ch: f.name.slice(0, 1), c: c.c, i: c.i, me: !!f.me }; }

function newDraft(mode, slots) {
  const s = get();
  s.draft = { game: 'chase', mode, slots: slots || [], rules: JSON.parse(JSON.stringify(s.defaultRules)), limit: 0 }; // limit：限时（毫秒），0 = 不限时
  return s.draft;
}
function startLive() {
  const s = get(), d = s.draft;
  if (s.live && !s.live.events.length) s.live = null;
  s.live = { id: 'live', game: d.game || 'chase', mode: d.mode, players: [...d.slots], order0: d.slots.map((_, i) => i), rules: JSON.parse(JSON.stringify(d.rules)), events: [], start: Date.now(), status: 'live', limit: d.limit || 0 };
  save();
  return s.live;
}
/** 结束对局：一分没记的空局直接丢弃，返回 null。auto = 长时间没操作，自动保存 */
function finishLive(auto) {
  const s = get(), L = s.live;
  if (!L) return null;
  s.live = null;
  if (!L.events.length) { save(); return null; }
  L.status = 'done'; L.end = auto ? lastAct(L) : Date.now(); L.id = 'm' + Date.now();
  if (auto) L.auto = true;
  s.history.unshift(L);
  markHist(L);
  save();
  checkSpace();
  return L;
}
/* ---------- 长时间没操作：自动保存 ---------- */
const IDLE = 30 * 60e3;
/** 最后一次操作的时间：记分、撤销、调整限时都算 */
function lastAct(L) { const e = L.events[L.events.length - 1]; return Math.max(L.start, L.touch || 0, e ? e.t : 0); }
function touchLive() { const L = get().live; if (L) L.touch = Date.now(); }
/** 进行中的对局超过 30 分钟没操作：自动保存进战绩（结束时间记为最后一次操作），返回保存的对局 */
function autoSave() {
  const L = get().live;
  if (!L || Date.now() - lastAct(L) < IDLE) return null;
  return finishLive(true);
}
/** 自动保存的对局「继续这局」：放回进行中，中间空着的时间不算对局时长 */
function resume(id) {
  const s = get(), m = s.history.find(x => x.id === id);
  if (!m || !m.auto || s.live) return false;
  markHist(m);
  s.history = s.history.filter(x => x !== m);
  m.idle = (m.idle || 0) + Math.max(0, Date.now() - m.end);
  delete m.end; delete m.auto;
  m.status = 'live'; m.id = 'live'; m.touch = Date.now();
  s.live = m;
  save();
  return true;
}
/** 球友列表（不含已删除的） */
function activeFriends() { return get().friends.filter(f => !f.deleted); }
function updateFriend(id, patch) { const f = get().friends.find(x => x.id === id); if (f) { Object.assign(f, patch); save(); } }
/** 删除球友：软删除，历史战绩里仍显示名字；正在对局中的球友不能删 */
function removeFriend(id) {
  const s = get(), f = s.friends.find(x => x.id === id);
  if (!f || f.me) return '不能删除自己';
  if (s.live && s.live.players.includes(id)) return '正在对局中，结束后再删除';
  f.deleted = true;
  if (s.draft) s.draft.slots = s.draft.slots.filter(x => x !== id);
  save();
  return '';
}
function loadDemo() { const ok = demo.seedDemo(get()); markAllHist(); save(); return ok; }
function clearDemo() { const before = get().history.slice(); const r = demo.clearDemo(get()); before.forEach(markHist); save(); return r; }
function deleteMatch(id) { const s = get(); markHist(s.history.find(m => m.id === id)); s.history = s.history.filter(m => m.id !== id); save(); }
/** 结束但不保存：直接丢弃进行中的对局 */
function discardLive() { get().live = null; save(); }
function match(id) { const s = get(); return id === 'live' ? s.live : s.history.find(m => m.id === id); }

module.exports = { get, save, rev, friend, color, view, addFriend, activeFriends, updateFriend, removeFriend, deleteMatch, loadDemo, clearDemo, newDraft, startLive, finishLive, discardLive, match, COLORS, derive, IDLE, lastAct, touchLive, autoSave, resume };
