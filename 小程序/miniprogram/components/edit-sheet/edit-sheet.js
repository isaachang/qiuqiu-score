// 统一的「名字 + 颜色」编辑面板（新建球友 / 改名 / 换颜色 / 删除），替代微信自带的输入弹窗
const { COLORS } = require('../../utils/store');

Component({
  options: { addGlobalClass: true },
  properties: {
    show: { type: Boolean, value: false },
    title: { type: String, value: '球友' },
    name: { type: String, value: '' },
    color: { type: Number, value: 0 },
    showColor: { type: Boolean, value: true },
    showDelete: { type: Boolean, value: false },
    okText: { type: String, value: '保存' },
  },
  data: { colors: COLORS, val: '', ci: 0, focus: false, ch: '' },
  observers: {
    show(v) {
      if (!v) { this.setData({ focus: false }); return; }
      const val = this.data.name || '';
      this.setData({ val, ci: this.data.color || 0, ch: val.slice(0, 1) || '?' });
      setTimeout(() => this.setData({ focus: true }), 380);
    },
  },
  methods: {
    onInput(e) { const val = e.detail.value; this.setData({ val, ch: val.trim().slice(0, 1) || '?' }); },
    pick(e) { this.setData({ ci: +e.currentTarget.dataset.i }); },
    save() {
      const v = (this.data.val || '').trim();
      if (!v) { wx.showToast({ title: '请输入名字', icon: 'none' }); return; }
      this.triggerEvent('save', { name: v.slice(0, 8), color: this.data.ci });
    },
    del() { this.triggerEvent('delete'); },
    close() { this.triggerEvent('close'); },
    noop() {},
  },
});
