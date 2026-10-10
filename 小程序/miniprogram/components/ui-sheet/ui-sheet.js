// 通用确认面板：替代微信自带的 showModal / showActionSheet，统一样式和动效
// actions: [{ k, t, type: 'pri' | 'danger' | 'plain' | 'soft-danger'（灰底红字，次要的危险操作） }]
Component({
  options: { addGlobalClass: true },
  properties: {
    show: { type: Boolean, value: false },
    icon: { type: String, value: '' },      // warn | ok | ''
    title: { type: String, value: '' },
    desc: { type: String, value: '' },
    actions: { type: Array, value: [] },
  },
  methods: {
    act(e) { wx.vibrateShort({ type: 'light' }); this.triggerEvent('action', { k: e.currentTarget.dataset.k }); },
    close() { this.triggerEvent('close'); },
    noop() {},
  },
});
