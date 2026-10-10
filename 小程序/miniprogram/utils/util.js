// 球球记分 · 小工具
const pad = x => String(x).padStart(2, '0');
const clock = sec => { sec = Math.max(0, sec | 0); return [sec / 3600 | 0, (sec / 60 | 0) % 60, sec % 60].map(pad).join(':'); };
const hm = t => { const d = new Date(t); return d.getHours() + ':' + pad(d.getMinutes()); };
const dayLabel = t => {
  const d = new Date(t), n = new Date();
  const diff = Math.round((new Date(n.toDateString()) - new Date(d.toDateString())) / 864e5);
  return diff === 0 ? '今天 ' + hm(t) : diff === 1 ? '昨天 ' + hm(t) : `${d.getMonth() + 1}月${d.getDate()}日`;
};
const dur = ms => { const m = Math.round(ms / 6e4); return m >= 60 ? `${m / 60 | 0} 小时 ${m % 60} 分` : m < 1 ? '不到 1 分钟' : `${m} 分钟`; };
/** 计算自定义导航栏尺寸（避让右上角胶囊） */
function navMetrics() {
  const win = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync());
  let cap; try { cap = wx.getMenuButtonBoundingClientRect(); } catch (e) { cap = null; }
  const sb = win.statusBarHeight || 20;
  if (!cap || !cap.height) return { sb, top: sb, h: 44, capW: 96, capH: 32, capTop: sb + 6, winW: win.windowWidth };
  const h = (cap.top - sb) * 2 + cap.height;
  return { sb, top: sb, h, capW: win.windowWidth - cap.left, capH: cap.height, capTop: cap.top, winW: win.windowWidth };
}
module.exports = { clock, hm, dayLabel, dur, navMetrics };
