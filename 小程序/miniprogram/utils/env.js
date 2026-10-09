// 当前运行的是哪个版本：develop 开发版（预览码 / 开发者工具）、trial 体验版、release 正式版
// 开发版：自动载入演示数据、显示测试按钮；体验版 / 正式版：都没有
const VERSION = '0.3.0';

// 【临时】在开发版里模拟体验版：预览码打开后和朋友看到的一样，并且用一份全新的空白数据（不动开发数据）
// 看完改回 ''
const SIMULATE = '';

function realEnv() { try { return wx.getAccountInfoSync().miniProgram.envVersion || 'release'; } catch (e) { return 'release'; } }
const simulating = () => !!SIMULATE && realEnv() === 'develop';
function envVersion() { return simulating() ? SIMULATE : realEnv(); }
/** 开发版才有的东西：演示数据、测试按钮 */
const isDev = () => envVersion() === 'develop';
/** 「我的」里显示的版本 */
const versionText = () => (isDev() ? '开发版 ' : '内测版 ') + VERSION;
/** 本地存储的 key 前缀：模拟时用另一套，等于全新安装 */
const keyPrefix = () => (simulating() ? 'sim_' : '');
module.exports = { VERSION, envVersion, isDev, versionText, keyPrefix, simulating };
