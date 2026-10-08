// 球球记分 · 页面通用：入场动效、Tab 同步、导航栏滚动、数字滚动
/**
 * 入场动效：只在「第一次进入」和「点底部 Tab 切过来」时播放；
 * 从子页面返回时不重播 —— 页面保持原样，只更新数据，衔接无缝。
 * 返回值：本次是否播放了入场（用于决定数字要不要从 0 滚动）
 */
function enter(page, tab) {
  const g = (getApp() && getApp().globalData) || {};
  const first = !page._entered, viaTab = tab != null && g.tabSwitch;
  page._entered = true;
  if (tab != null) {
    g.tabSwitch = false;
    if (typeof page.getTabBar === 'function' && page.getTabBar()) page.getTabBar().setData({ selected: tab, bounce: -1 });
  }
  if (first || viaTab) { page.setData({ ent: false }, () => setTimeout(() => page.setData({ ent: true }), 20)); return true; }
  if (!page.data.ent) page.setData({ ent: true });
  return false;
}
/** 导航栏：滚过一点就切换成磨砂小标题 */
function onScroll(page, e) {
  const s = e.scrollTop > 36;
  if (s !== page.data.scrolled) page.setData({ scrolled: s });
}
/** 数字从 0 滚到目标值（只处理整数；保留前缀符号和后缀，如 +12、64%） */
function countUp(page, key, text, ms = 700) {
  const m = String(text).match(/^([+−-]?)(\d+)(.*)$/);
  if (!m) { page.setData({ [key]: text }); return; }
  const [, sign, num, suf] = m, to = +num, steps = Math.max(1, Math.min(24, to));
  let k = 0;
  const t = setInterval(() => {
    k++;
    const v = Math.round(to * (1 - Math.pow(1 - k / steps, 3)));
    page.setData({ [key]: (v ? sign : '') + v + suf });
    if (k >= steps) { clearInterval(t); page.setData({ [key]: text }); }
  }, ms / steps);
}
module.exports = { enter, onScroll, countUp };
