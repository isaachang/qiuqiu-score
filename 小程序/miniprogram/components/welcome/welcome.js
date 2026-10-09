// 新用户引导：第一次打开时在首页弹出；最后一步起名字（可跳过，默认叫「我」）
const store = require('../../utils/store');

Component({
  options: { addGlobalClass: true },
  properties: {
    show: { type: Boolean, value: false, observer(v) { if (v) this.init(); } },
  },
  data: { cur: 0, name: '', fo: false, out: false, ch: '我', nameShow: '小明', mch: '小', c: '#FF5A5F', ci: '#fff', lite: false, bars: [38, 62, 48, 80, 56, 92] },
  methods: {
    init() {
      const me = store.get().friends.find(f => f.me), v = store.view(me.id);
      const name = me.name === '我' ? '' : me.name;
      this.setData({ cur: 0, out: false, name, c: v.c, ci: v.i, lite: !!(getApp().globalData || {}).lite, ...this.face(name), nameShow: '小明', mch: '小' });
    },
    face(name) { const n = (name || '').trim() || '我'; return { ch: n.slice(0, 1) }; },
    onSwipe(e) { this.setData({ cur: e.detail.current }); },
    onInput(e) { const name = e.detail.value; this.setData({ name, ch: this.face(name).ch }); },
    onFocus() { this.setData({ fo: true }); },
    onBlur() { this.setData({ fo: false }); },
    next() {
      wx.vibrateShort({ type: 'light' });
      if (this.data.cur < 3) this.setData({ cur: this.data.cur + 1 });
      else this.done();
    },
    skipToName() { this.setData({ cur: 3 }); },
    done() {
      if (this._done) return; this._done = true;
      const name = (this.data.name || '').trim().slice(0, 8);
      const s = store.get(), me = s.friends.find(f => f.me);
      if (name && name !== me.name) me.name = name;
      s.settings.welcomed = true;
      store.save();
      this.setData({ out: true });
      setTimeout(() => { this._done = false; this.triggerEvent('close'); }, 320);
    },
    noop() {},
  },
});
