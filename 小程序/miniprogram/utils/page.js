// 球球记分 · 页面通用：入场动效、Tab 同步、导航栏滚动、数字滚动
/**
 * 入场动效：只在第一次进入页面时播放；之后切 Tab、从子页面返回都不重播 ——
 * 页面保持原样（数据变了才局部更新），切换瞬间完成，没有「重新加载」的感觉。
 * 返回值：本次是否播放了入场（用于决定数字要不要从 0 滚动）
 */
function enter(page, tab) {
  const g = (getApp() && getApp().globalData) || {};
  const first = !page._entered, viaTab = false;
  page._entered = true;
  if (tab != null) {
    g.tabSwitch = false;
    const tb = typeof page.getTabBar === 'function' && page.getTabBar();
    if (tb) { tb.arrive ? tb.arrive(tab) : tb.setData({ selected: tab }); }
  }
  if (first || viaTab) { page.setData({ ent: false }, () => setTimeout(() => page.setData({ ent: true }), 20)); return true; }
  if (!page.data.ent) page.setData({ ent: true });
  return false;
}
/** 导航栏：滚过一点就切换成磨砂小标题 */
function onScroll(page, e) {
  const t = e.scrollTop, s = t > 36;
  if (s !== page.data.scrolled) page.setData({ scrolled: s });
  // Tab 页：往下滚 → Tab 收小只剩图标；往上滚或回到顶部 → 展开
  const tb = typeof page.getTabBar === 'function' && page.getTabBar();
  if (!tb) return;
  const dy = t - (page._lastTop || 0); page._lastTop = t;
  let mini;
  if (t < 80) mini = false; else if (dy > 6) mini = true; else if (dy < -6) mini = false; else return;
  if (tb.data.mini !== mini) tb.setData({ mini });
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
/** 弹出面板时把 Tab 滑走，关闭后滑回（只对有 Tab 的页面生效） */
function tabBar(page, visible) {
  const tb = typeof page.getTabBar === 'function' && page.getTabBar();
  if (tb && tb.data.hidden === visible) tb.setData({ hidden: !visible });
}
module.exports = { enter, onScroll, countUp, tabBar };
