// 球球记分 · 限时比赛：倒计时显示、时间到、加时 / 取消限时（记分页、横屏页、首页共用）
const store = require('./store');
const { played } = require('./engine');
const { clock } = require('./util');

const pad = x => String(x).padStart(2, '0');
/** 倒计时显示：不到 1 小时显示 分:秒，否则 时:分:秒 */
const left = ms => { const t = Math.max(0, Math.ceil(ms / 1000)), h = t / 3600 | 0, m = (t / 60 | 0) % 60; return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(t % 60); };

/**
 * 计时显示：txt 文字；ccls '' 正计时 / 'cd' 倒计时 / 'warn' 最后 5 分钟 / 'over' 已超时；
 * due：时间到了、还没提醒过（同一个时限只提醒一次）
 */
function state(m, now) {
  const el = played(m, now || Date.now());
  if (!m.limit) return { txt: clock(el / 1000), ccls: '', due: false };
  const r = m.limit - el;
  if (r > 0) return { txt: left(r), ccls: r <= 5 * 60e3 ? 'warn' : 'cd', due: false };
  return { txt: '+' + left(-r), ccls: 'over', due: m.asked !== m.limit };
}
/** 记下「已提醒」，并震动 */
function asked(m) {
  m.asked = m.limit; store.save();
  if (store.get().settings.vib) wx.vibrateLong();
}
/** 加时：从现在起再打 min 分钟 */
function more(m, min) { m.limit = played(m) + (min || 10) * 60e3; m.asked = 0; store.touchLive(); store.save(); }
/** 面板上的说明文字 */
const desc = m => `已打满 ${m.limit < 60e3 ? Math.round(m.limit / 1000) + ' 秒' : require('./util').dur(m.limit)}，要结束比赛吗？`;

module.exports = { state, asked, more, desc };
