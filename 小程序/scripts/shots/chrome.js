// 无头 Chrome 截图：截图文件写完（大小稳定）就结束进程
// Chrome 新版本截完图后后台更新程序会让进程一直不退出，所以不等它自己退出
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function snap(args, out, maxMs = 30000) {
  try { fs.unlinkSync(out); } catch (e) {}
  const url = args[args.length - 1], flags = args.slice(0, -1).filter(x => !x.startsWith('--user-data-dir'));
  const profile = path.join(os.tmpdir(), 'qq-chrome-' + process.pid);
  const cp = spawn(CHROME, ['--no-first-run', '--no-default-browser-check', '--disable-background-networking', `--user-data-dir=${profile}`, ...flags, `--screenshot=${out}`, url], { stdio: 'ignore', detached: true });
  const t0 = Date.now(); let last = -1, stable = 0, ok = false;
  while (Date.now() - t0 < maxMs) {
    sleep(150);
    if (!fs.existsSync(out)) continue;
    const sz = fs.statSync(out).size;
    if (sz > 0 && sz === last) { if (++stable >= 2) { ok = true; break; } } else stable = 0;
    last = sz;
  }
  try { process.kill(-cp.pid, 'SIGKILL'); } catch (e) { try { cp.kill('SIGKILL'); } catch (e2) {} }
  if (!ok) throw new Error('截图超时：' + out);
}
module.exports = { snap, CHROME };
