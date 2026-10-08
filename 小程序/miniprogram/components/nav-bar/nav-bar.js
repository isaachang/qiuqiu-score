// 自定义导航栏：避让胶囊；大标题页滚动后收起成磨砂小标题栏
Component({
  options: { addGlobalClass: true },
  properties: {
    title: { type: String, value: '' },
    back: { type: Boolean, value: false },
    large: { type: Boolean, value: false },   // 页面里自己放大标题，导航栏只在滚动后显示小标题
    scrolled: { type: Boolean, value: false },
  },
  data: { top: 20, h: 44 },
  lifetimes: {
    attached() {
      const n = (getApp().globalData && getApp().globalData.nav) || require('../../utils/util').navMetrics();
      this.setData({ top: n.top, h: n.h });
    },
  },
  methods: {
    goBack() { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/home' }) }); },
  },
});
