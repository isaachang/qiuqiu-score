const store = require('../../utils/store');
Page({
  data: { list: [], es: { show: false } },
  onShow() { this.render(); },
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
  del() {
    const id = this.editing, f = store.friend(id);
    wx.showModal({ title: `删除「${f.name}」？`, content: '删除后不会出现在球友列表里，历史战绩中仍保留名字。', confirmText: '删除', confirmColor: '#F0444D',
      success: r => {
        if (!r.confirm) return;
        const err = store.removeFriend(id);
        if (err) { wx.showToast({ title: err, icon: 'none' }); return; }
        this.close(); this.render(); wx.showToast({ title: '已删除', icon: 'success' });
      } });
  },
});
