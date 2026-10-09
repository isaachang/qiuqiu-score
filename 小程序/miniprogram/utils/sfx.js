// 金球音效：打出大金、小金时播放（黄金九不播）。手机开静音时不响；可在「我的」里关闭。
// 注意：iOS 上「stop() 后立刻 play()」会静默失败（连续两个金球时第二个没声音），
// 所以正在播放时只跳回开头，不先 stop。
const store = require('./store');
let ctx = null, playing = false, endCb = null;
const fireEnd = () => { playing = false; const f = endCb; endCb = null; f && f(); };

function audio() {
  if (!ctx) {
    try { wx.setInnerAudioOption({ obeyMuteSwitch: true, mixWithOther: true }); } catch (e) {}
    ctx = wx.createInnerAudioContext();
    ctx.src = '/audio/gold.mp3';
    ctx.onPlay(() => { playing = true; });
    ctx.onEnded(fireEnd);
    ctx.onStop(fireEnd);
    ctx.onError(fireEnd);
  }
  return ctx;
}
function enabled() { return store.get().settings.sfx !== false; }
/** 预加载，第一次播放不卡顿 */
function preload() { if (enabled()) audio(); }
/** 播放；音乐自然结束（或被停止）时调用 onEnd */
function playGold(onEnd) {
  if (!enabled()) return false;
  const a = audio();
  endCb = onEnd || null;
  if (playing) { try { a.seek(0); } catch (e) {} }
  a.play();
  return true;
}
/** 撤销金球、点掉庆祝、离开记分页时停止 */
function stop() { endCb = null; if (ctx && playing) { try { ctx.stop(); } catch (e) {} } playing = false; }
module.exports = { preload, playGold, stop, enabled };
