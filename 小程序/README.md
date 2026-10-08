# 球球记分 · 微信小程序

台球追分记分（双人 / 三人），原生小程序，数据存在手机本地（内测版）。

AppID：`wx2de2fab9928167ef`
上传密钥：`../密钥/private.wx2de2fab9928167ef.key`（只在本机使用，不要提交、不要分享）

## 常用命令

```bash
npm run preview                    # 生成预览二维码 preview-qrcode.png，微信扫码试用
npm run upload -- 0.1.0 "更新说明"  # 上传为新版本 → 小程序后台「版本管理」选为体验版
```

> 本机 Node 是 25，脚本里已加 `--no-experimental-webstorage`，否则上传工具会报 `getItem is not a function`。
> 后台开了 IP 白名单：换网络 / 换 VPN 后出口 IP 会变，报 `invalid ip` 时把新 IP 加进白名单即可。

## 目录

```
miniprogram/
├─ utils/engine.js      规则引擎（纯函数：分值、上家/两家付分、胜者开球顺序、重算）
├─ utils/store.js       本地存储（球友、进行中的对局、历史战绩、设置）
├─ behaviors/scoring.js 记分逻辑（竖屏 / 横屏共用）
├─ pages/home           首页
├─ pages/setup          新对局（添加球员）
├─ pages/rules          计分规则
├─ pages/score          竖屏记分（点卡片 = 普胜）
├─ pages/land           横屏记分
├─ pages/log            对局记录（修改 / 删除）
├─ pages/result         战报
└─ pages/stats          战绩
```

## 规则（已确认）

- 普胜 +4、大金 +10、小金 +7、黄金九 +4、犯规 −1；分值可在「计分规则」里改
- 双人：对手付分，赢家开球
- 三人：胜者排第一位开下一局，其余人保持原顺序；普胜 / 小金上家付，大金 / 黄金九两家付，犯规扣 1 分给上家（均可改）
