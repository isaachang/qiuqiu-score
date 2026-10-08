// 自定义 Tab：悬浮胶囊，选中项的黑色药丸滑动过去，图标轻弹
Component({
  data: {
    selected: 0, bounce: -1,
    list: [
      { path: '/pages/home/home', text: '追分', icon: '/images/tab/home.png', on: '/images/tab/home-w.png' },
      { path: '/pages/stats/stats', text: '战绩', icon: '/images/tab/stats.png', on: '/images/tab/stats-w.png' },
      { path: '/pages/me/me', text: '我的', icon: '/images/tab/me.png', on: '/images/tab/me-w.png' },
    ],
  },
  methods: {
    go(e) {
      const i = +e.currentTarget.dataset.i;
      if (i === this.data.selected) return;
      wx.vibrateShort({ type: 'light' });
      getApp().globalData.tabSwitch = true; // 让目标页面知道是「切 Tab」进来的，播放入场动效
      this.setData({ selected: i, bounce: i });
      wx.switchTab({ url: this.data.list[i].path });
    },
  },
});
