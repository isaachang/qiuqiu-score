// 球球记分 · 本地数据（内测版只存本机：wx.setStorageSync）
const { DEFAULT_RULES, derive } = require('./engine');

const KEY = 'qq_state_v1';
const COLORS = [
  { c: '#FF5A5F', i: '#FFFFFF' }, { c: '#3D7BFF', i: '#FFFFFF' }, { c: '#FFC53D', i: '#2B2100' },
  { c: '#1FC98E', i: '#FFFFFF' }, { c: '#9B6BFF', i: '#FFFFFF' }, { c: '#FF8A3D', i: '#FFFFFF' },
];

function fresh() {
  return {
    friends: [{ id: 'me', name: '我', color: 0, me: true }],
    history: [],
    live: null,
    draft: null,
    settings: { vib: true, keep: true },
    defaultRules: DEFAULT_RULES(),
    seq: 1,
  };
}

let S = null;
function get() {
  if (!S) {
    try { S = wx.getStorageSync(KEY) || null; } catch (e) { S = null; }
    if (!S) S = fresh();
    migrate(S);
  }
  return S;
}
/** 数据迁移：v2 —— 犯规恢复为 −1（旧版规则页「+」按钮方向容易误触成 −2） */
function migrate(s) {
  if ((s.ver || 1) >= 2) return;
  const fix = r => { if (r && r.foul && r.foul.v !== 1) r.foul.v = 1; };
  fix(s.defaultRules); s.draft && fix(s.draft.rules); s.live && fix(s.live.rules);
  s.ver = 2;
  try { wx.setStorageSync(KEY, s); } catch (e) {}
}
function save() { try { wx.setStorageSync(KEY, get()); } catch (e) { console.error('保存失败', e); } }

function friend(id) { return get().friends.find(f => f.id === id) || { id, name: '?', color: 0 }; }
function color(id) { return COLORS[friend(id).color % COLORS.length]; }
function addFriend(name) {
  const s = get();
  const id = 'f' + Date.now().toString(36) + (s.seq++);
  s.friends.push({ id, name, color: s.friends.filter(f => !f.deleted).length % COLORS.length });
  save();
  return id;
}
/** 球员展示信息：名字、首字、颜色 */
function view(id) { const f = friend(id), c = color(id); return { id, name: f.name, ch: f.name.slice(0, 1), c: c.c, i: c.i, me: !!f.me }; }

function newDraft(mode, slots) {
  const s = get();
  s.draft = { mode, slots: slots || [], rules: JSON.parse(JSON.stringify(s.defaultRules)) };
  return s.draft;
}
function startLive() {
  const s = get(), d = s.draft;
  if (s.live && !s.live.events.length) s.live = null;
  s.live = { id: 'live', mode: d.mode, players: [...d.slots], order0: d.slots.map((_, i) => i), rules: JSON.parse(JSON.stringify(d.rules)), events: [], start: Date.now(), status: 'live' };
  save();
  return s.live;
}
/** 结束对局：一分没记的空局直接丢弃，返回 null */
function finishLive() {
  const s = get(), L = s.live;
  if (!L) return null;
  s.live = null;
  if (!L.events.length) { save(); return null; }
  L.status = 'done'; L.end = Date.now(); L.id = 'm' + L.end;
  s.history.unshift(L);
  save();
  return L;
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
function deleteMatch(id) { const s = get(); s.history = s.history.filter(m => m.id !== id); save(); }
/** 结束但不保存：直接丢弃进行中的对局 */
function discardLive() { get().live = null; save(); }
function match(id) { const s = get(); return id === 'live' ? s.live : s.history.find(m => m.id === id); }

module.exports = { get, save, friend, color, view, addFriend, activeFriends, updateFriend, removeFriend, deleteMatch, newDraft, startLive, finishLive, discardLive, match, COLORS, derive };
