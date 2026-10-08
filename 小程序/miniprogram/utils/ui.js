// 页面里调用自定义确认面板：const k = await ask(this, { title, desc, icon, actions })
// 页面 wxml 需要放：<ui-sheet show="{{ui.show}}" icon="{{ui.icon}}" title="{{ui.title}}" desc="{{ui.desc}}" actions="{{ui.actions}}" bind:action="onUi" bind:close="onUiClose"/>
// 页面 js 需要：onUi(e) { uiDone(this, e.detail.k) }, onUiClose() { uiDone(this, null) }
function ask(page, opts) {
  return new Promise(resolve => {
    page._uiResolve = resolve;
    page.setData({ ui: { show: true, icon: opts.icon || '', title: opts.title || '', desc: opts.desc || '', actions: opts.actions || [] } });
  });
}
function uiDone(page, k) {
  page.setData({ 'ui.show': false });
  const r = page._uiResolve; page._uiResolve = null;
  if (r) setTimeout(() => r(k), 260); // 等面板收起后再执行，衔接更顺
}
module.exports = { ask, uiDone };
