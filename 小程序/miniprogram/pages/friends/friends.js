const store = require('../../utils/store');
const { ask, uiDone } = require('../../utils/ui');
const { enter, onScroll } = require('../../utils/page');
Page({
  onUi(e) { uiDone(this, e.detail.k); },
  onUiClose() { uiDone(this, null); },
  data: { list: [], es: { show: false } },
  onPageScroll(e) { onScroll(this, e); },
  onShow() {
    enter(this); this.render(); },
  render() { this.setData({ list: store.activeFriends().map(f => store.view(f.id)) }); },
  openNew() { this.editing = null; this.setData({ es: { show: true, title: '新建球友', name: '', color: store.activeFriends().length % 6, del: false, ok: '添加' } }); },
  openEdit(e) {
    const f = store.get().friends.find(x => x.id === e.currentTarget.dataset.id);
    this.editing = f.id;
    this.setData({ es: { show: true, title: f.me ? '我的资料' : '编辑球友', name: f.name === '我' ? '' : f.name, color: f.color, del: !f.me, ok: '保存' } });
  },
  close() { this.setData({ 'es.show': false }); },
  save(e) {
    const { name, color } = e.detail;
    if (this.editing) store.updateFriend(this.editing, { name, color });
    else { const id = store.addFriend(name); store.updateFriend(id, { color }); }
    this.close(); this.render();
    wx.showToast({ title: this.editing ? '已保存' : '已添加', icon: 'success' });
  },
  del(e) {
    const id = this.editing, f = store.friend(id), cur = (e && e.detail) || {};
    const keep = Object.assign({}, this.data.es, cur.name != null ? { name: cur.name, color: cur.color } : {});
    this.setData({ 'es.show': false }); // 先把编辑面板收起来，避免两个面板叠在一起
    setTimeout(() => {
      ask(this, { icon: 'warn', title: `删除「${f.name}」？`, desc: '删除后不会出现在球友列表里，历史战绩中仍保留名字。', actions: [{ k: 'del', t: '删除', type: 'danger' }] })
        .then(k => {
          if (k !== 'del') { this.setData({ es: Object.assign(keep, { show: true }) }); return; } // 取消：回到编辑面板
          const err = store.removeFriend(id);
          if (err) { wx.showToast({ title: err, icon: 'none' }); return; }
          this.render(); wx.showToast({ title: '已删除', icon: 'success' });
        });
    }, 320);
  },
});
