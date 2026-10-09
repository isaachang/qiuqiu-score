// 计算结果缓存：只放内存（WeakMap），不会被写进本地存储。
// 对局内容变了（记分条数 / 结束时间不同）就自动重新计算。
const { derive } = require('./engine');
const memo = new WeakMap();
function derived(m) {
  const sig = m.events.length + ':' + (m.end || 0) + ':' + (m.events.length ? m.events[m.events.length - 1].t : 0);
  const hit = memo.get(m);
  if (hit && hit.sig === sig) return hit.D;
  const D = derive(m);
  memo.set(m, { sig, D });
  return D;
}
module.exports = { derived };
