// 球球记分 · 玩法：追分 / 斯诺克（按对局的 game 字段区分页面和统计）
const isSnk = m => !!m && m.game === 'snooker';
const isChase = m => !!m && (!m.game || m.game === 'chase');
/** 这个版本认识的玩法；不认识的（比如以后新加的玩法）直接不显示，避免旧版本出错 */
const known = m => isChase(m) || isSnk(m);
/** 进行中的对局对应的记分页 */
const liveUrl = m => (isSnk(m) ? '/pages/snk-score/snk-score' : '/pages/score/score');
/** 历史对局对应的战报页 */
const resultUrl = m => (isSnk(m) ? '/pages/snk-result/snk-result?id=' : '/pages/result/result?id=') + m.id;
module.exports = { isSnk, isChase, known, liveUrl, resultUrl };
