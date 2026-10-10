// 左滑出现「删除」（edit 为真时是「编辑 + 删除」）的列表行。同一时间只会有一行处于展开状态。
let opened = null;
const BTN_RPX = 168;

Component({
  options: { addGlobalClass: true, multipleSlots: true },
  properties: { disabled: { type: Boolean, value: false }, round: { type: Boolean, value: false }, edit: { type: Boolean, value: false } }, // round：圆角卡片；edit：多一个「编辑」
  data: { x: 0, anim: true },
  lifetimes: {
    attached() { const w = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).windowWidth; this.W = w / 750 * BTN_RPX * (this.data.edit ? 2 : 1); },
    detached() { if (opened === this) opened = null; },
  },
  methods: {
    start(e) {
      if (this.data.disabled) return;
      const t = e.touches[0];
      this.sx = t.clientX; this.sy = t.clientY; this.base = this.data.x; this.dir = 0;
      if (opened && opened !== this) opened.close();
    },
    move(e) {
      if (this.data.disabled || this.sx == null) return;
      const t = e.touches[0], dx = t.clientX - this.sx, dy = t.clientY - this.sy;
      if (!this.dir) { if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return; this.dir = Math.abs(dx) > Math.abs(dy) ? 1 : 2; }
      if (this.dir !== 1) return; // 竖向滑动交给页面滚动
      let x = this.base + dx;
      x = x > 0 ? x * 0.25 : x < -this.W ? -this.W + (x + this.W) * 0.25 : x; // 越界时加阻尼
      this.setData({ x, anim: false });
    },
    end() {
      if (this.sx == null) return;
      this.sx = null;
      if (this.dir !== 1) return;
      this.data.x < -this.W * 0.4 ? this.open() : this.close();
    },
    open() { opened = this; this.setData({ x: -this.W, anim: true }); },
    close() { if (opened === this) opened = null; this.setData({ x: 0, anim: true }); },
    tapBody() {
      if (this.data.x < 0) { this.close(); return; }
      if (opened) { opened.close(); return; }
      this.triggerEvent('tapbody');
    },
    del() { this.close(); this.triggerEvent('delete'); },
    doEdit() { this.close(); this.triggerEvent('edit'); },
  },
});
