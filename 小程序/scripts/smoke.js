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
  p.tapRow({currentTarget:{dataset:{i:0}}});console.log('  log tap → 自定义面板',p.data.ui.show,p.data.ui.actions.map(a=>a.t).join('/'));p.onUi({detail:{k:'del'}});await tick();console.log('  → 二次确认',p.data.ui.title);p.onUi({detail:{k:'del'}});await tick();console.log('  → 删除后条数',p.data.rows.length);
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
  // 颜色：新球友挑没用过的
  const cs=[];for(let k=0;k<3;k++)cs.push(store.friend(store.addFriend('C'+k)).color);console.log('新球友颜色',cs.join(','),'| 我的颜色',store.friend('me').color);
  const sz=JSON.stringify(store.get()).length;store.save();console.log('存储无缓存字段:',!JSON.stringify(store.get()).includes('"_D"'),'大小',sz);
}catch(e){console.error('FAIL',e.stack.split('\n').slice(0,4).join('\n'));process.exit(1)}})();
