// 跳转防连点：700ms 内只放行第一次（避免双击「继续」叠出两个记分页等问题）
let last = 0;
function lock() { const now = Date.now(); if (now - last < 700) return false; last = now; return true; }
const to = url => lock() && wx.navigateTo({ url });
const redirect = url => lock() && wx.redirectTo({ url });
module.exports = { to, redirect, lock };
