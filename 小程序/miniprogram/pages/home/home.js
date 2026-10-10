const store = require('../../utils/store');
const nav = require('../../utils/nav');
const { ask, uiDone } = require('../../utils/ui');
const { derive, signed, played } = require('../../utils/engine');
const idle = require('../../utils/idle');
const limit = require('../../utils/limit');
const { clock } = require('../../utils/util');
const { matchRow } = require('../../utils/rows');
const SN = require('../../utils/snooker');
const { isSnk, known, liveUrl, resultUrl } = require('../../utils/game');
const { enter, onScroll, tabBar } = require('../../utils/page');

function greet() {
  const h = new Date().getHours();
  if (h < 5) return '夜深了，还在练球？';
  if (h < 11) return '早上好，先热热手';
  if (h < 14) return '中午好，来一局？';
  if (h < 18) return '下午好，球桌在等你';
  return '晚上好，今晚一杆清台';
}

Page({
  onUi(e) { uiDone(this, e.detail.k); },
  onUiClose() { uiDone(this, null); },
  data: { greet: '', live: null, recent: [], me: {}, scrolled: false, ent: false },
  onShow() {
    if (this.data.greet !== greet()) this.setData({ greet: greet() });
    idle.check();
    if (this._rev !== store.rev()) this.load(); // 数据没变就不重算
    enter(this, 0);
    // 新用户引导：第一次打开（或在「我的」里点了「新手教程」）
    const g = getApp().globalData;
    if (!store.get().settings.welcomed || g.showWelcome) { g.showWelcome = false; tabBar(this, false); this.setData({ wel: true }); }
    else idle.notice(this);
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (idle.check()) { this.load(); idle.notice(this); return; } // 停在首页超过 30 分钟没操作
      this.liveTick();
    }, 1000);
    this.liveTick();
  },
  /** 进行中卡片的计时；限时比赛在首页到点也会提醒 */
  liveTick() {
    const L = store.get().live; if (!L || !this.data.live) return;
    const st = limit.state(L);
    if (st.txt !== this.data.live.clock || st.ccls !== this.data.live.ccls) this.setData({ 'live.clock': st.txt, 'live.ccls': st.ccls });
    if (st.due && !(this.data.ui && this.data.ui.show) && !this.data.tu && !this.data.wel) {
      limit.asked(L);
      tabBar(this, false);
      this.setData({ tu: true, tuDesc: limit.desc(L) });
    }
  },
  onWelClose() { this.setData({ wel: false }); tabBar(this, true); this.load(); }, // 名字可能改了
  /* 时间到面板（首页） */
  tuDone() { this.setData({ tu: false }); tabBar(this, true); },
  onTuClose() { this.tuDone(); },
  onTuEnd() { this.tuDone(); const L = store.get().live; if (L) { getApp().globalData.openFin = true; nav.to(liveUrl(L)); } },
  onTuAdd(e) {
    this.tuDone();
    const M = store.get().live; if (!M) return;
    limit.more(M, e.detail.m); this.liveTick();
    wx.showToast({ title: `已加时 ${e.detail.m} 分钟`, icon: 'none' });
  },
  onHide() { clearInterval(this.timer); },
  onUnload() { clearInterval(this.timer); },
  onPageScroll(e) { onScroll(this, e); },
  load() {
    this._rev = store.rev();
    const s = store.get(), L = s.live, me = s.friends.find(f => f.me);
    let live = null;
    if (L && !known(L)) live = null; // 不认识的玩法：不显示继续卡片
    else if (L && isSnk(L)) {
      // 斯诺克：显示第几局、局分，下面是本局比分
      const S = SN.derive(L), F = S.F;
      live = {
        title: `斯诺克 · 第 ${F.no} 局 · 局分 ${S.fw[0]}:${S.fw[1]} · `, clock: limit.state(L).txt, ccls: '', cols: 2,
        players: L.players.map((id, i) => ({ ...store.view(id), s: String(F.sc[i]), cls: F.act === i && !F.over ? 'pos' : '' })),
      };
    } else if (L) {
      const D = derive(L);
      live = {
        title: `${L.mode === 2 ? '双人' : '三人'}追分 · 第 ${D.round} 局 · ${L.pauseAt ? '已暂停 ' : ''}`, clock: limit.state(L).txt, ccls: L.pauseAt ? '' : limit.state(L).ccls, cols: L.players.length,
        players: L.players.map((id, i) => ({ ...store.view(id), s: signed(D.scores[i]), cls: D.scores[i] > 0 ? 'pos' : D.scores[i] < 0 ? 'neg' : '' })),
      };
    }
    this.setData({ live, recent: s.history.filter(known).slice(0, 3).map(m => matchRow(m)), me: store.view(me.id) }); // 最近 3 场，每场一张大卡片
  },
  new2() { this.go(2); },
  new3() { this.go(3); },
  go(mode) {
    wx.vibrateShort({ type: 'light' });
    const me = store.get().friends.find(f => f.me);
    store.newDraft(mode, me ? [me.id] : []);
    nav.to('/pages/setup/setup');
  },
  resume() { nav.to(liveUrl(store.get().live)); },
  /** 斯诺克新对局 */
  newSnk() { wx.vibrateShort({ type: 'light' }); store.snkDraft(); nav.to('/pages/snk-setup/snk-setup'); },
  soon() { wx.showToast({ title: '敬请期待', icon: 'none' }); },
  toStats() { wx.switchTab({ url: '/pages/stats/stats' }); },
  toAll() { nav.to('/pages/history/history?seg=all&days=0'); },
  toMe() { wx.switchTab({ url: '/pages/me/me' }); },
  askDelete(e) {
    const id = e.currentTarget.dataset.id;
    ask(this, { icon: 'warn', title: '删除这场对局？', desc: '删除后战绩统计会同步更新，无法恢复。', actions: [{ k: 'del', t: '删除', type: 'danger' }] })
      .then(k => { if (k === 'del') { store.deleteMatch(id); this.load(); wx.showToast({ title: '已删除', icon: 'success' }); } });
  },
  openMatch(e) { const m = store.match(e.currentTarget.dataset.id); if (m) nav.to(resultUrl(m)); },
});
