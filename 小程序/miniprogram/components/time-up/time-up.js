// 时间到面板：bind:end 结束比赛；bind:add {m} 加 m 分钟；bind:close 取消
Component({
  options: { addGlobalClass: true },
  properties: {
    show: { type: Boolean, value: false, observer(v) { if (v) this.setData({ wheel: false }); } },
    desc: { type: String, value: '' },
    land: { type: Boolean, value: false }, // 横屏：用 px 的紧凑布局
  },
  data: { adds: [5, 10, 15], wheel: false, pv: [0, 5], zero: false,
    hours: Array.from({ length: 10 }, (_, k) => k), mins: Array.from({ length: 12 }, (_, k) => k * 5) },
  methods: {
    vib() { wx.vibrateShort({ type: 'light' }); },
    end() { this.vib(); this.triggerEvent('end'); },
    add(e) { this.vib(); this.triggerEvent('add', { m: +e.currentTarget.dataset.m }); },
    close() { this.triggerEvent('close'); },
    openWheel() { this.vib(); this._pv = [0, 6]; this.setData({ wheel: true, pv: this._pv, zero: false }); }, // 默认停在 30 分钟
    closeWheel() { this.setData({ wheel: false }); },
    onPv(e) { this._pv = e.detail.value; const z = !(this._pv[0] || this._pv[1]); if (z !== this.data.zero) this.setData({ zero: z }); },
    okWheel() {
      const [h, k] = this._pv || this.data.pv, m = h * 60 + k * 5;
      if (!m) return;
      this.vib(); this.triggerEvent('add', { m });
    },
    noop() {},
  },
});
