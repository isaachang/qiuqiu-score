// 列表行数据（首页「最近对局」、战绩「历史对局」共用）
const store = require('./store');
const { signed, outcome } = require('./engine');
const { derived } = require('./cache');
const { dayLabel } = require('./util');

function matchRow(m) {
  const D = derived(m), me = m.players.findIndex(id => store.friend(id).me);
  const my = me >= 0 ? D.scores[me] : null, k = me >= 0 ? outcome(D.scores, me) : '';
  return {
    id: m.id, mode: m.mode === 2 ? '双人' : '三人', rounds: D.round - 1, when: dayLabel(m.start),
    names: m.players.map(id => store.friend(id).name).join(' · '),
    avs: m.players.map(id => store.view(id)),
    s: my === null ? '' : signed(my), cls: my > 0 ? 'pos' : my < 0 ? 'neg' : '',
    res: { W: '胜', L: '负', D: '平' }[k] || '', resK: k,
    chips: m.players.map((id, i) => ({ id, name: store.friend(id).name, me: !!store.friend(id).me, s: signed(D.scores[i]), cls: D.scores[i] > 0 ? 'pos' : D.scores[i] < 0 ? 'neg' : '' })),
    full: (() => { const d = new Date(m.start); return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; })(),
  };
}

module.exports = { matchRow };
