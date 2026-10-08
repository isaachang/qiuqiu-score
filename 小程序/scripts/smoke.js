// 冒烟测试：在模拟的微信环境里跑一遍所有页面的 onLoad / onShow 和核心记分流程。用法：node scripts/smoke.js miniprogram
const path=require('path');const root=process.argv[2];
let mem=null;const noop=()=>{};
global.wx=new Proxy({getStorageSync:()=>mem,setStorageSync:(k,v)=>{mem=JSON.parse(JSON.stringify(v))},getWindowInfo:()=>({windowWidth:390,windowHeight:844,statusBarHeight:47,pixelRatio:3,safeArea:{left:0,right:390}}),
  getMenuButtonBoundingClientRect:()=>({top:51,height:32,left:296}),createSelectorQuery:()=>q},{get:(t,k)=>k in t?t[k]:noop});
const q={in(){return q},select(){return q},selectAll(){return q},fields(){return q},boundingClientRect(f){f&&f({top:100,bottom:300,left:0,width:358,height:200});return q},exec(){}};
global.getApp=()=>({globalData:{nav:{top:47,h:44}}});global.Behavior=d=>d;global.Component=()=>{};
const timers=[];global.setTimeout=(f)=>{timers.push(f);return 1};global.setInterval=()=>1;global.clearInterval=noop;global.clearTimeout=noop;
const flush=()=>{let n=0;while(timers.length&&n++<500)timers.shift()()};
const mkPage=def=>{const data=JSON.parse(JSON.stringify(Object.assign({},...(def.behaviors||[]).map(b=>b.data||{}),def.data||{})));
  const p=Object.assign({},...(def.behaviors||[]).map(b=>b.methods||{}),def,{data,route:'',getTabBar:()=>({setData:noop}),createSelectorQuery:()=>q,
    setData(o,cb){for(const[k,v]of Object.entries(o)){const ps=k.replace(/\[(\d+)\]/g,'.$1').split('.');let t=data;for(const x of ps.slice(0,-1)){if(t[x]==null)t[x]={};t=t[x]}t[ps.at(-1)]=v}cb&&cb()}});return p};
let cur;global.Page=d=>{cur=d};
const load=(pg,q={})=>{delete require.cache[require.resolve(path.join(root,`pages/${pg}/${pg}.js`))];require(path.join(root,`pages/${pg}/${pg}.js`));const p=mkPage(cur);p.onLoad&&p.onLoad(q);p.onShow&&p.onShow();flush();return p};
const store=require(path.join(root,'utils/store'));
(async()=>{const tick=async()=>{for(let i=0;i<5;i++){flush();await Promise.resolve();}};try{
  let p=load('home');console.log('home ok, greet:',p.data.greet,'ent:',p.data.ent);
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
}catch(e){console.error('FAIL',e.stack.split('\n').slice(0,4).join('\n'));process.exit(1)}})();
