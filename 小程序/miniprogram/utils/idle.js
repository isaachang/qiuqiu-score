// 球球记分 · 长时间没操作自动保存：检查 + 提示「已自动保存」
// 小程序切到后台后代码不会运行，所以在「回到小程序」和「记分页每秒计时」时检查
const store = require('./store');
const nav = require('./nav');
const { ask } = require('./ui');

const g = () => (getApp() && getApp().globalData) || {};

/** 超时就自动保存，并记下来等页面提示 */
function check() {
  const m = store.autoSave();
  if (m) g().autoSaved = m.id;
  return m;
}
/**
 * 有刚自动保存的对局就弹提示（只弹一次）。返回是否弹了。
 * onResume：点「继续这局」并恢复成功后调用；onClose：直接关掉时调用
 */
function notice(page, { onResume, onClose, redirect } = {}) {
  const id = g().autoSaved;
  if (!id || !store.match(id)) return false;
  g().autoSaved = null;
  ask(page, { icon: 'ok', title: '已自动保存', desc: '30 分钟没有记分，这局已存进战绩。',
    actions: [{ k: 'view', t: '查看战报', type: 'pri' }, { k: 'resume', t: '继续这局', type: 'plain' }] })
    .then(k => {
      if (k === 'view') (redirect ? nav.redirect : nav.to)('/pages/result/result?id=' + id);
      else if (k === 'resume') {
        if (store.resume(id)) onResume ? onResume() : nav.to('/pages/score/score');
        else wx.showToast({ title: '已有进行中的对局', icon: 'none' });
      } else onClose && onClose();
    });
  return true;
}
module.exports = { check, notice };
