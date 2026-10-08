const { navMetrics } = require('./utils/util');
App({
  globalData: { nav: null },
  onLaunch() { this.globalData.nav = navMetrics(); },
});
