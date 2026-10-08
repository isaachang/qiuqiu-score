// 列表行数据（首页「最近对局」、战绩「历史对局」共用）
const store = require('./store');
const { derive, signed } = require('./engine');
const { dayLabel } = require('./util');

function matchRow(m) {
  const D = derive(m), me = m.players.findIndex(id => store.friend(id).me);
  const my = me >= 0 ? D.scores[me] : null, max = Math.max(...D.scores);
  return {
    id: m.id, mode: m.mode === 2 ? '双人' : '三人', rounds: D.round - 1, when: dayLabel(m.start),
    names: m.players.map(id => store.friend(id).name).join(' · '),
    avs: m.players.map(id => store.view(id)),
    s: my === null ? '' : signed(my), cls: my > 0 ? 'pos' : my < 0 ? 'neg' : '',
    res: my === null ? '' : (my === max && my > 0 ? '胜' : my < 0 ? '负' : '平'),
  };
}

module.exports = { matchRow };
