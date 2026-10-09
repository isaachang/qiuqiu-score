// 液态玻璃 Tab：玻璃底板 + 一块会「流动」的玻璃透镜；往下滚动自动收小，只剩图标
Component({
  data: {
    selected: 0, mini: false, lite: false, swing: 0, noAnim: false, hidden: false,
    list: [
      { path: '/pages/home/home', text: '开火', icon: '/images/tab/g-fire.png', on: '/images/tab/g-fire-on.png' },
      { path: '/pages/stats/stats', text: '战绩', icon: '/images/tab/g-stats.png', on: '/images/tab/g-stats-on.png' },
      { path: '/pages/me/me', text: '我的', icon: '/images/tab/g-me.png', on: '/images/tab/g-me-on.png' },
    ],
  },
  lifetimes: { attached() { this.setData({ lite: !!(getApp().globalData || {}).lite }); } },
  methods: {
    go(e) {
      const i = +e.currentTarget.dataset.i;
      if (i === this.data.selected) { if (this.data.mini) this.setData({ mini: false }); return; } // 收小时点一下先展开
      const g = getApp().globalData;
      g.lastTab = this.data.selected; // 目标页的 Tab 从这里「流」过去
      wx.switchTab({ url: this.data.list[i].path }); // 先切页面，不等任何东西
      wx.vibrateShort({ type: 'light' });
    },
    /** 页面调用：透镜从上一个 Tab 流到当前 Tab */
    arrive(tab) {
      const g = getApp().globalData, from = g.lastTab == null ? tab : g.lastTab;
      g.lastTab = tab;
      if (from === tab) { this.setData({ selected: tab, mini: false }); return; }
      this.setData({ selected: from, noAnim: true, mini: false }, () => setTimeout(() => this.setData({ selected: tab, noAnim: false, swing: this.data.swing + 1 }), 30));
    },

  },
});
