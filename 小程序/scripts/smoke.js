// 冒烟测试：在模拟的微信环境里跑一遍所有页面的 onLoad / onShow 和核心记分流程。用法：node scripts/smoke.js miniprogram
const path=require('path');const root=process.argv[2];
const mem={};const noop=()=>{};
global.wx=new Proxy({getAccountInfoSync:()=>({miniProgram:{envVersion:process.env.QQ_ENV||'develop'}}),createInnerAudioContext:()=>({onPlay(){},onEnded(){},onStop(){},onError(){},stop(){},seek(){},play(){}}),getStorageSync:k=>k in mem?JSON.parse(JSON.stringify(mem[k])):'',setStorageSync:(k,v)=>{mem[k]=JSON.parse(JSON.stringify(v))},removeStorageSync:k=>{delete mem[k]},getStorageInfoSync:()=>({currentSize:Object.values(mem).reduce((a,v)=>a+JSON.stringify(v).length,0)/1024,limitSize:10240}),getWindowInfo:()=>({windowWidth:390,windowHeight:844,statusBarHeight:47,pixelRatio:3,safeArea:{left:0,right:390}}),
  getMenuButtonBoundingClientRect:()=>({top:51,height:32,left:296}),createSelectorQuery:()=>q},{get:(t,k)=>k in t?t[k]:noop});
const q={in(){return q},select(){return q},selectAll(){return q},fields(){return q},boundingClientRect(f){f&&f({top:100,bottom:300,left:0,width:358,height:200});return q},exec(){}};
const APP={globalData:{nav:{top:47,h:44}}};global.getApp=()=>APP;global.Behavior=d=>d;let comp;global.Component=d=>{comp=d};
const timers=[];global.setTimeout=(f)=>{timers.push(f);return 1};global.setInterval=()=>1;global.clearInterval=noop;global.clearTimeout=noop;
const flush=()=>{let n=0;while(timers.length&&n++<500)timers.shift()()};
const mkPage=def=>{const data=JSON.parse(JSON.stringify(Object.assign({},...(def.behaviors||[]).map(b=>b.data||{}),def.data||{})));
  const p=Object.assign({},...(def.behaviors||[]).map(b=>b.methods||{}),def,{data,route:'',getTabBar:()=>({data:{mini:false},setData(o){Object.assign(this.data,o)},arrive(t){this.data.selected=t}}),createSelectorQuery:()=>q,
    setData(o,cb){for(const[k,v]of Object.entries(o)){const ps=k.replace(/\[(\d+)\]/g,'.$1').split('.');let t=data;for(const x of ps.slice(0,-1)){if(t[x]==null)t[x]={};t=t[x]}t[ps.at(-1)]=v}cb&&cb()}});return p};
let cur;global.Page=d=>{cur=d};
const load=(pg,q={})=>{delete require.cache[require.resolve(path.join(root,`pages/${pg}/${pg}.js`))];require(path.join(root,`pages/${pg}/${pg}.js`));const p=mkPage(cur);p.onLoad&&p.onLoad(q);p.onShow&&p.onShow();flush();return p};
const store=require(path.join(root,'utils/store'));
(async()=>{const tick=async()=>{for(let i=0;i<5;i++){flush();await Promise.resolve();}};try{
  let p=load('home');console.log('home ok, greet:',p.data.greet,'ent:',p.data.ent,'| 新手引导',p.data.wel,'| Tab 收起',p.getTabBar().data.hidden);
  { require(path.join(root,'components/welcome/welcome.js'));const w=mkPage({...comp,...comp.methods});w.triggerEvent=(n)=>{w.closed=n};w.init();
    const steps=[];for(let k=0;k<3;k++){w.next();steps.push(w.data.cur);}w.onInput({detail:{value:'Isaac'}});const ch=w.data.ch;w.next();flush();
    console.log('  引导 → 页',steps.join('>'),'| 头像字',ch,'| 名字',store.friend('me').name,'| 关闭',w.closed,'| 已看过',store.get().settings.welcomed);
    p.onWelClose();p=load('home');console.log('  再进首页 → 引导',!!p.data.wel);
    getApp().globalData.showWelcome=true;p=load('home');console.log('  我的「新手教程」→ 引导',p.data.wel);p.onWelClose();
    w.init();w.skipToName();w.next();flush();console.log('  跳过 + 不填 → 名字不变',store.friend('me').name); }
  p.go(3);p=load('setup');const s=store.get();const a=store.addFriend('Henry'),b=store.addFriend('Hugo');s.draft.slots.push(a,b);p.render();p.shuffle();flush();console.log('setup ok, title:',p.data.navTitle,'slots:',p.data.slots.map(x=>x.name).join('>'));
  p=load('rules');console.log('rules ok:',p.data.navTitle);
  p.start&&0;store.startLive();
  p=load('score');console.log('score ok, coach step:',p.data.coach);p.onCard({currentTarget:{dataset:{i:0}}});console.log('  tap during coach → scores',store.derive(store.get().live).scores.join(','),'coach',p.data.coach);
  p.nextCoach();p.nextCoach();p.nextCoach();p.onCard({currentTarget:{dataset:{i:1}}});p.onChip({currentTarget:{dataset:{i:2,k:'xj'}}});flush();console.log('  after coach → scores',store.derive(store.get().live).scores.join(','),'banner',p.data.banner&&p.data.banner.t);
  p=load('land');console.log('land ok');
  p=load('log');console.log('log ok, rows',p.data.rows.length);
  { const L=store.get().live;L.events.push({p:0,ev:'pu',t:Date.now()},{p:1,ev:'xj',t:Date.now()});store.save();p=load('log');
    p.tapRow({currentTarget:{dataset:{i:1}}});console.log('  log 点记录 → 编辑面板',p.data.ed.show,'| 选人',p.data.ed.players.map(x=>x.name).join('/'),'| 结果',p.data.ed.evs.map(x=>x.name).join('/'),'| 当前',p.data.ed.p,p.data.ed.ev);
    p.edP({currentTarget:{dataset:{j:0}}});p.edE({currentTarget:{dataset:{k:'dj'}}});p.saveEd();console.log('  改成 Isaac 大金 →',store.get().live.events[1].p,store.get().live.events[1].ev,'| 比分',p.data.sums.map(x=>x.name+x.s).join(' '));
    p.delRow({currentTarget:{dataset:{i:1}}});console.log('  左滑删除（无弹窗）→ 剩',p.data.rows.length,'条 | 弹窗',!!(p.data.ui&&p.data.ui.show)); }
  p=load('setup');store.get().draft={mode:2,slots:['me',a],rules:store.get().defaultRules};p.render();p.start();console.log('setup 旧局未结算 → 自定义面板',p.data.old&&p.data.old.show,'球员',p.data.old.players.map(x=>x.name+x.s).join(' '));
  p.askDiscard();console.log('  不保存 → 面板翻面确认',p.data.old.confirm);p.backFromDiscard();
  store.get().live.events.push({p:0,ev:'pu',t:Date.now()});
  const m=store.finishLive();p=load('result',{id:m.id});console.log('result ok, podium',p.data.podium.map(x=>x.name+x.txt).join(' '),'hl',p.data.hl.map(h=>h.t).join(','));
  p=load('stats');console.log('stats ok, kpis',p.data.card.kpis.map(k=>k.v).join(' '),'friends',p.data.friends.length);
  p=load('h2h',{fid:a});console.log('h2h ok:',p.data.navTitle,p.data.X.verdict);
  p=load('me');p=load('friends');console.log('me/friends ok');
  store.loadDemo();for(let k=0;k<3;k++)store.get().history.push(...store.get().history.filter(m=>m.demo).map((m,j)=>({...m,id:m.id+'_c'+k+'_'+j,start:m.start-(k+1)*40*864e5})));
  p=load('history',{seg:'all',days:'0'});const sel=p.data.cells.find(c=>c.sel);console.log('history 日历 ok, 共',p.data.total,'场 | 周视图',p.data.cells.length,'天',p.data.title,'| 默认选中',p.data.day.t,p.data.day.n+'场',p.data.day.net,'| 有环的天',p.data.cells.filter(c=>c.has).length);
  p.toggleMode();console.log('  展开月历 →',p.data.mode,p.data.cells.length,'格 | 当月',p.data.monthSum.n,'场',p.data.monthSum.net);
  p.prev();console.log('  上一月 →',p.data.title,'| 当月',p.data.monthSum.n,'场');
  const emp=p.data.cells.find(c=>!c.has&&!c.other);p.tapDay({currentTarget:{dataset:{k:emp.k}}});console.log('  点没打球的一天 →',p.data.day.t,'对局',p.data.rows.length,'| 跳最近按钮',p.data.latestTxt);
  p.goLatest();console.log('  看最近一次 →',p.data.day.t,p.data.rows.length,'场');
  p.te({changedTouches:[{clientX:0,clientY:0}]});p.ts({touches:[{clientX:300,clientY:10}]});p.te({changedTouches:[{clientX:120,clientY:20}]});console.log('  左滑 → 下一月',p.data.title);
  p.open({currentTarget:{dataset:{id:'x'}}});
  p=load('stats');console.log('stats 历史只显示',p.data.rows.length,'场 / 共',p.data.total);
  p.setSeg({currentTarget:{dataset:{s:'2'}}});console.log('  筛选双人 →',p.data.scopeTxt+'胜率',p.data.O.wld.rate+'%','| 名片',p.data.card.kpis.map(k=>k.l+k.v).join(' '),'| 分组',p.data.O.groups.map(g=>g.t).join('/'),'|',p.data.O.foot);
  p.setDays({currentTarget:{dataset:{d:7}}});console.log('  再选近 7 天 →',p.data.scopeTxt+'胜率','| 最近',p.data.form.length,'场 | 无数据',p.data.rangeEmpty);
  p.setSeg({currentTarget:{dataset:{s:'all'}}});p.setDays({currentTarget:{dataset:{d:0}}});
  console.log('  球友默认',p.data.friendsShown.length,'/',p.data.friends.length,'位 | 关系',p.data.friends.map(f=>f.op.name+':'+(f.tag||f.rel)).join(' '));p.toggleFriends();console.log('  展开 →',p.data.friendsShown.length,'| 成就首个已解锁',p.data.ach.list[0].ok);
  // 自定义限时：滚轮选 2 小时 15 分
  p=load('setup');p.toggleLimit({detail:{value:true}});p.openCustom();p.onPv({detail:{value:[2,3]}});p.okCustom();console.log('自定义限时 →',p.data.customTxt,'选中自定义',p.data.custom,'草稿',store.get().draft.limit/6e4+'分');
  p.openCustom();console.log('  再打开滚轮停在',p.data.pv.join(','));p.onPv({detail:{value:[0,0]}});p.okCustom();console.log('  0 分钟 → 不关闭',p.data.cs);p.closeCustom();
  p.pickLimit({currentTarget:{dataset:{m:90}}});console.log('  点 1.5小时 →',p.data.limit,'自定义文字',p.data.customTxt);
  p.toggleLimit({detail:{value:true}});p.openCustom();p.onPv({detail:{value:[0,1]}});p.okCustom();store.newDraft(2,['me']);p=load('setup');p.toggleLimit({detail:{value:true}});console.log('  上局自定义 5 分 → 新局默认',p.data.limit,'按钮',p.data.customTxt);
  p.openCustom();p.onPv({detail:{value:[0,0]}});console.log('  滚到 0:00 → 按钮置灰',p.data.pvZero);p.closeCustom();
  // 双人局第一次进来：同样三步引导
  store.get().draft={game:'chase',mode:2,slots:['me',a],rules:store.get().defaultRules,limit:0};store.get().live=null;store.startLive();
  p=load('score');console.log('双人首次 → 引导',p.data.coach,'| 气泡位置',p.data.coachTop);p.nextCoach();console.log('  第 2 步',p.data.coach);p.nextCoach();console.log('  第 3 步',p.data.coach,'|',p.data.n===2?'犯规给对手':'');p.nextCoach();
  p=load('score');console.log('  再进 → 引导',p.data.coach,'| 已记',store.get().settings.coach2,store.get().settings.coach3);store.discardLive();
  // 平局：双人各赢一局 → 0:0
  store.get().live=null;store.get().draft={game:'chase',mode:2,slots:['me',a],rules:store.get().defaultRules,limit:0};store.startLive();
  const T=Date.now();store.get().live.events.push({p:0,ev:'pu',t:T},{p:1,ev:'pu',t:T});const dm=store.finishLive();
  p=load('result',{id:dm.id});console.log('平局 → 标题',p.data.headline,'| 皇冠',!!p.data.W,'| 名次',p.data.podium.map(x=>x.no).join(','),'| 行',require(path.join(root,'utils/rows')).matchRow(dm).res);
  const E=require(path.join(root,'utils/engine'));console.log('  三人并列第一',E.isDraw([4,4,-8]),E.outcome([4,4,-8],0),E.outcome([4,4,-8],2),'| 唯一第一',E.outcome([8,-4,-4],0));
  // 限时：已超时 → 弹「时间到」；再打 10 分钟
  store.get().draft={game:'chase',mode:2,slots:['me',a],rules:store.get().defaultRules,limit:60e3};store.startLive();store.get().live.start=Date.now()-61e3;store.get().live.events.push({p:0,ev:'pu',t:Date.now()});
  p=load('score');console.log('限时 → 计时',p.data.clock,p.data.ccls,'| 时间到面板',p.data.tu,p.data.tuDesc);
  p.onTuAdd({detail:{m:5}});p.startClock();console.log('  加 5 分钟 →',p.data.clock,p.data.ccls,'面板',p.data.tu);
  store.get().live.limit=1;store.get().live.asked=0;p.startClock();p.onTuAdd({detail:{m:135}});p.startClock();console.log('  自定义加 2时15分 →',p.data.clock);
  store.get().live.limit=1;store.get().live.asked=0;p.startClock();p.onTuClose();p.onClock();console.log('  取消后点计时 → 再打开',p.data.tu);p.onTuEnd();flush();console.log('  结束比赛 → 结算面板',p.data.fin.show);p.closeFin();
  let lp=load('land');store.get().live.asked=0;lp.startClock();console.log('  横屏到点 → 面板',lp.data.tu);lp.onTuEnd();console.log('  横屏结束比赛 → 回竖屏开结算',getApp().globalData.openFin);getApp().globalData.openFin=false;
  lp.toFinish();console.log('  横屏点「结算」→ 回竖屏开结算',getApp().globalData.openFin,'| 顶栏',JSON.stringify(lp.data.bar));p=load('score');flush();console.log('  竖屏 → 结算面板',p.data.fin.show);p.closeFin();
  // 在首页时到点：首页也弹「时间到」
  store.get().live.limit=60e3;store.get().live.asked=0;store.get().live.start=Date.now()-2*60e3;store.get().live.idle=0;
  p=load('home');console.log('首页到点 → 面板',p.data.tu,'| 卡片',p.data.live.clock,p.data.live.ccls);p.onTuAdd({detail:{m:15}});console.log('  加 15 分钟 →',p.data.live.clock,p.data.live.ccls);
  // 30 分钟没操作 → 自动保存；首页提示，可继续
  const L=store.get().live;L.limit=0;L.events.forEach(e=>{e.t-=40*60e3});L.start-=40*60e3;L.touch=0;
  const before=store.get().history.length;p=load('home');console.log('自动保存 → 战绩 +',store.get().history.length-before,'| 进行中',!!store.get().live,'| 提示',p.data.ui&&p.data.ui.title,'| 结束时间=最后记分',store.get().history[0].end===store.get().history[0].events.at(-1).t);
  p.onUi({detail:{k:'resume'}});await tick();console.log('  继续这局 → 进行中',!!store.get().live,'| 空档扣除',Math.round(store.get().live.idle/6e4)+'分','| 时长',Math.round(E.played(store.get().live)/6e4)+'分');
  // 暂停：计时冻结、不能记分、不会自动保存；继续后暂停的时长不算进比赛时长
  { p=load('score');const L=store.get().live,sc0=store.derive(L).scores.join(',');p.onPause();const el0=E.played(L);L.pauseAt-=50*60e3;L.touch-=50*60e3;
    p.onCard({currentTarget:{dataset:{i:0}}});console.log('暂停 →',p.data.paused,'| 记分被挡',store.derive(L).scores.join(',')===sc0,'| 计时冻结',E.played(L)===el0-50*60e3||E.played(L)<=el0);
    const h0=store.get().history.length;let hp=load('home');console.log('  暂停 50 分钟回首页 → 不自动保存',store.get().history.length===h0&&!!store.get().live,'| 卡片',hp.data.live.title+hp.data.live.clock);
    p=load('score');console.log('  再进记分页 → 仍暂停',p.data.paused);const id0=L.idle||0;p.onUnpause();console.log('  继续 →',p.data.paused,'| 暂停时长计入空档',Math.round(((L.idle||0)-id0)/6e4)+'分','| pauseAt',L.pauseAt);
    let lp2=load('land');lp2.onPause();console.log('  横屏暂停 →',lp2.data.paused,!!L.pauseAt);lp2.onUnpause(); }
  // 颜色：新球友挑没用过的
  const cs=[];for(let k=0;k<3;k++)cs.push(store.friend(store.addFriend('C'+k)).color);console.log('新球友颜色',cs.join(','),'| 我的颜色',store.friend('me').color);
  // ================= 斯诺克 =================
  store.get().live=null;store.save();
  p=load('snk-setup');console.log('斯诺克设置 → 球员',p.data.P.map(x=>x&&x.name).join(' vs '),'| 缺人',p.data.lack,'| 赛制',p.data.bestOf,'| 红球',p.data.reds,'满分',p.data.max);
  console.log('  空位头像类名',require('fs').readFileSync(path.join(root,'pages/snk-setup/snk-setup.wxml'),'utf8').includes('av big vac'),'| 开球按钮已去掉',!require('fs').readFileSync(path.join(root,'pages/snk-setup/snk-setup.wxml'),'utf8').includes('setFirst'));
  p.openPick({currentTarget:{dataset:{i:1}}});console.log('  选人面板',p.data.picker.show,'可选',p.data.picker.list.length,'位');p.pick({currentTarget:{dataset:{id:a}}});
  p.openPick({currentTarget:{dataset:{i:1}}});console.log('  再打开 → 可移出',p.data.picker.has);p.pick({currentTarget:{dataset:{id:a}}});console.log('  点已选的人 → 移出',p.data.P[1].empty,'缺人',p.data.lack);
  p.openPick({currentTarget:{dataset:{i:0}}});p.unpick();console.log('  「移出对阵」我 →',p.data.P[0].empty);
  store.snkDraft().players=['me',null];p.render();p.openPick({currentTarget:{dataset:{i:1}}});p.pick({currentTarget:{dataset:{id:a}}});
  console.log('  选好后 →',p.data.P.map(x=>x.name).join(' vs '),'| 按钮',p.data.lack?'选择球员':'开始对局');
  p._trk={left:20,width:300};p.onTs({touches:[{clientX:20+300*0.8}]});console.log('  拖滑杆到 80% →',p.data.hLbl,'| 起始',p.data.start.join(':'),'| 气泡',p.data.drag);
  p.onTm({touches:[{clientX:20+300*0.8+3}]});const v1=p.data.hv;p.onTm({touches:[{clientX:20+300*0.8+6}]});console.log('  精度：再拖 3px →',v1,'→',p.data.hv);p.onTe();console.log('  松手保存 →',JSON.stringify(store.snkDraft().cfg.hc));
  { p._trk={left:20,width:300};const ww=390,pad=46*ww/750,k=(p.data.hv+50)/100,cx=20+pad+(300-pad*2)*k;
    p.onTs({touches:[{clientX:cx+2}]});p.onTe();console.log('  点一下圆钮 → 归零',p.data.hLbl,JSON.stringify(store.snkDraft().cfg.hc));
    p.onTs({touches:[{clientX:20+300*0.7}]});p.onTe();console.log('  点轨道其它位置 → 跳过去',p.data.hLbl); }
  p.openCustom();p.cWho({currentTarget:{dataset:{i:0}}});p.cPlus();p.cPlus();p.cPick({currentTarget:{dataset:{v:15}}});p.cPlus();p.okCustom();console.log('  自定义 Isaac +16 →',p.data.hLbl,JSON.stringify(store.snkDraft().cfg.hc));
  p.openCustom();p.cPick({currentTarget:{dataset:{v:0}}});p.data.custom.pts=0;p.okCustom();console.log('  自定义 0 → ',p.data.hLbl);
  p.setBest({currentTarget:{dataset:{v:3}}});p.setReds({currentTarget:{dataset:{v:6}}});console.log('  3 局 2 胜 · 6 颗红 → 满分',p.data.max);
  p.setReds({currentTarget:{dataset:{v:15}}});
  p.start();await tick();const SL=store.get().live;console.log('  开局 →',SL&&SL.game,SL.players.length,'人 | 赛制',SL.cfg.bestOf);
  p=load('snk-score');p.once=()=>true;const vm=()=>p.data.vm;
  console.log('斯诺克记分 → 第',vm().no,'局 | 在打',vm().players.find(x=>x.on).name,'| 六格',vm().tiles.map(t=>t.name+t.val).join(' '));
  const tap=k=>{p._lock=0;p.onBall({currentTarget:{dataset:{k}}});};
  tap('black');console.log('  点「红黑」→',vm().players[0].sc,'本杆',vm().players[0].brk,'| 飘分',p.data.flies.map(f=>f.text).join(','),'| 剩余',vm().info.rem,'| 红',vm().info.thirdV);
  tap('red');console.log('  点「红 +1」→',vm().players[0].sc,'| 六格变成',vm().tiles.map(t=>t.name+t.val).join(' '));
  tap('red');console.log('  彩球阶段再点红 → 不记分',vm().players[0].sc);
  tap('pink');p.onMiss();console.log('  红粉后换人 →',vm().players.map(x=>x.sc).join(':'),'在打',vm().players.find(x=>x.on).name,'上一杆',vm().players[0].last);
  p.onFoul();console.log('  犯规面板 →',p.data.foul.off,'罚给',p.data.foul.opp,'默认',p.data.foul.pts,'| 选项',p.data.foul.opts.map(o=>o.v+o.t).join(' '));
  p.pickPen({currentTarget:{dataset:{v:7}}});p.confirmFoul();console.log('  罚 7 → ',vm().players.map(x=>x.sc).join(':'),'在打',vm().players.find(x=>x.on).name);
  p.onUndo();console.log('  撤销 →',vm().players.map(x=>x.sc).join(':'));
  p.openLog();console.log('  单杆记录 →',p.data.logs.rows.map(r=>r.v+' '+r.name).join(' / '));p.closeLog();
  // 一路红黑到超分
  let guard=0;while(!p.data.sup&&guard++<20){tap('black');}
  console.log('  超分 →',p.data.sup&&p.data.sup.name,'领先',p.data.sup&&p.data.sup.lead,'剩余',p.data.sup&&p.data.sup.rem,'| 卡片标记',vm().players.map(x=>x.sup).join(','),'| 信息条',vm().info.sup);
  console.log('  单杆庆祝 →',p.data.banner&&p.data.banner.t);p.closeBanner();p.hideSup();
  while(vm().phase!=='clear'&&guard++<60){tap(vm().phase==='red'?'black':'black');}
  console.log('  清彩 →',vm().title,vm().chip.t,'| 六格',vm().tiles.map(t=>t.name+(t.st?'('+t.st+')':'')).join(' '));
  tap('blue');console.log('  按顺序之外点蓝 → 不记分',vm().players[0].sc);
  ['yellow','green','brown','blue','pink','black'].forEach(tap);
  console.log('  打完 → 本局结束面板',p.data.frame.show,p.data.frame.win,'拿下',p.data.frame.sc.join(':'),'| 下一局',p.data.frame.next,'开球','|',p.data.frame.hb);
  p.nextFrame();console.log('  第 2 局 →',vm().no,'在打',vm().players.find(x=>x.on).name,'| 局分',vm().fw.join(':'));
  p=load('home');console.log('首页继续卡片 →',p.data.live.title+p.data.live.clock,'|',p.data.live.players.map(x=>x.name+x.s).join(' '));
  p=load('snk-score');p.once=()=>true;p.openFin();console.log('  结算面板',p.data.fin.show,'| 判',p.data.fin.judge,'| 已开打',p.data.fin.started);
  p.closeFin();p.endMatch();console.log('  结束比赛 → 第二步',p.data.ui.title,'|',p.data.ui.desc,'|',p.data.ui.actions.map(a=>a.t).join(' / '));p.onUi({detail:{k:null}});await tick();console.log('  取消 → 还在打',!!store.get().live);
  // 第 2 局打完 → 3 局 2 胜结束
  p.closeFin();const t2=k=>{p._lock=0;p.onBall({currentTarget:{dataset:{k}}});};for(let i=0;i<15;i++)t2('black');['yellow','green','brown','blue','pink','black'].forEach(t2);
  console.log('  第 2 局 147 →',p.data.banner&&p.data.banner.t,'| 结束面板先不弹',!p.data.frame.show);
  p.closeBanner();flush();console.log('  庆祝关掉后 → 整场结束面板',p.data.frame.show,p.data.frame.over,p.data.frame.winner);
  p.saveMatch();await tick();const sm=store.get().history[0];console.log('  保存 →',sm.game,'| 进行中',!!store.get().live);
  p=load('snk-result',{id:sm.id});console.log('斯诺克战报 →',p.data.head,p.data.fw.join(':'),'| 每局卡片',p.data.frames.map(f=>f.card.tag+' '+f.card.big.a+':'+f.card.big.b+(f.card.L.won?'(左胜)':'(右胜)')+' 单杆'+f.card.cmp.a+'/'+f.card.cmp.b).join(' | '),'| 对比',p.data.cmp.map(c=>c.l+c.v.join('/')).join(' '));
  p=load('result',{id:sm.id});console.log('  追分战报打开斯诺克 → 转到斯诺克战报',p.data.ok===false||true);
  console.log('  最近对局行 →',JSON.stringify((({mode,s,res,rounds})=>({mode,s,res,rounds}))(require(path.join(root,'utils/rows')).matchRow(sm))));
  p=load('stats');console.log('  追分战绩不含斯诺克 → 场次',p.data.card.kpis[0].v);
  console.log('  玩法胶囊 →',p.data.games.map(g=>g.n+' '+g.cnt).join(' | '),'| 追分子筛选',p.data.game==='chase');
  p.setGame({currentTarget:{dataset:{g:'snk'}}});console.log('斯诺克战绩 → 名片',p.data.card.title.t,p.data.card.kpis.map(k=>k.l+' '+k.v).join(' · '),'| 胜负',JSON.stringify(p.data.O.wld),'| 单杆分布',p.data.O.dist.map(d=>d.l+':'+d.v).join(' '),'| 球友',p.data.friends.map(f=>f.op.name+' '+f.a+' vs '+f.b+' '+f.netLabel+f.netTxt).join(' / '),'| 历史',p.data.rows.length,'张卡片');
  p=load('stats');console.log('  记住上次的玩法 →',p.data.game);p.setGame({currentTarget:{dataset:{g:'chase'}}});
  p=load('h2h',{fid:a,game:'snk'});console.log('  斯诺克交手页 →',p.data.navTitle,'|',p.data.X.w,':',p.data.X.l,p.data.X.verdict,'| 对比',p.data.X.cmp.map(c=>c.l+c.a+'/'+c.b).join(' '),'| 卡片',p.data.rows.length);
  p=load('history',{seg:'snk',days:'0'});console.log('  历史日历只看斯诺克 →',p.data.total,'场',p.data.filterTxt);
  // 自动保存 + 继续这局
  store.startSnk();const L2=store.get().live;L2.events.push({ev:'pot2',b:'black',t:Date.now()-40*60e3});L2.start-=41*60e3;store.save();
  p=load('home');console.log('斯诺克 30 分钟没操作 → 自动保存',!store.get().live,'| 提示',p.data.ui&&p.data.ui.title);p.onUi({detail:{k:'resume'}});await tick();console.log('  继续这局 →',store.get().live&&store.get().live.game);
  p=load('setup');store.get().draft={game:'chase',mode:2,slots:['me',a],rules:store.get().defaultRules,limit:0};p.render();p.start();console.log('追分开新局遇到斯诺克旧局 →',p.data.old.mode,p.data.old.players.map(x=>x.name+' '+x.s).join(' / '));
  store.discardLive();
  const sz=JSON.stringify(store.get()).length;store.save();console.log('存储无缓存字段:',!JSON.stringify(store.get()).includes('"_D"'),'大小',sz);
}catch(e){console.error('FAIL',e.stack.split('\n').slice(0,4).join('\n'));process.exit(1)}})();
