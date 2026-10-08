// 球球记分 · 预览 / 上传脚本（微信官方 miniprogram-ci）
// 用法：npm run preview            → 生成预览二维码 preview-qrcode.png
//       npm run upload -- 0.1.0 "说明" → 上传为新版本（之后在后台「版本管理」选为体验版）
const ci = require('miniprogram-ci');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const conf = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8'));
const keyPath = path.resolve(root, '..', '密钥', `private.${conf.appid}.key`);
if (!fs.existsSync(keyPath)) { console.error('找不到上传密钥：' + keyPath); process.exit(1); }

const project = new ci.Project({
  appid: conf.appid,
  type: 'miniProgram',
  projectPath: root,
  privateKeyPath: keyPath,
  ignores: ['node_modules/**/*', 'scripts/**/*', 'preview-qrcode.png'],
});
const setting = { es6: true, es7: true, minify: true, minifyJS: true, minifyWXML: true, minifyWXSS: true, autoPrefixWXSS: true };

(async () => {
  const [cmd, version = '0.1.0', desc = '球球记分内测版'] = process.argv.slice(2);
  try {
    if (cmd === 'preview') {
      const out = path.join(root, 'preview-qrcode.png');
      await ci.preview({ project, desc, setting, robot: 1, qrcodeFormat: 'image', qrcodeOutputDest: out, onProgressUpdate: () => {} });
      console.log('✅ 预览二维码已生成：' + out);
    } else if (cmd === 'upload') {
      const r = await ci.upload({ project, version, desc, setting, robot: 1, onProgressUpdate: () => {} });
      console.log('✅ 已上传版本 ' + version + '，请到小程序后台「版本管理」选为体验版');
      console.log(JSON.stringify(r.subPackageInfo || r, null, 2));
    } else {
      console.log('用法：node scripts/ci.js preview | upload <版本号> <说明>');
    }
  } catch (e) {
    console.error('❌ 失败：' + (e && (e.message || e)));
    process.exit(1);
  }
})();
