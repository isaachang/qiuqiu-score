/* =========================================================
   Cue 追分 · 小程序原型 · 规则引擎 + 页面
   结构对应小程序工程：
     规则引擎 derive()  → utils/engine.ts（纯函数，可单测，可复用到新玩法）
     PAGES.*            → pages/*（每个对象 ≈ 一个小程序页面）
     App.sheet/modal/toast → 自定义组件 / wx.showModal / wx.showToast
   ========================================================= */
(function(global){
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];

/* ---------------- 图标 ---------------- */
const P={
  back:'<path d="M15 18l-6-6 6-6"/>',chev:'<path d="M9 6l6 6-6 6"/>',up:'<path d="M6 15l6-6 6 6"/>',close:'<path d="M6 6l12 12M18 6L6 18"/>',
  more:'<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/>',list:'<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/>',
  rotate:'<rect x="7" y="2.5" width="10" height="16" rx="2.5"/><path d="M3 15a9 9 0 009 7M21 9a9 9 0 00-4-6.5"/><path d="M2.5 18.5L3 15l3.5.5"/>',
  flag:'<path d="M5 22V4M5 4h12l-2.5 4L17 12H5"/>',home:'<path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
  chart:'<path d="M4 20V11M10 20V5M16 20v-6M21 20H3"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
  people:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0M16 4.5a3.5 3.5 0 010 7M21.5 20a6 6 0 00-3.5-5.4"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',dice:'<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',crown:'<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="currentColor" stroke-width="1.4"/>',
  spark:'<path d="M12 3l2.2 6.3L20.5 12l-6.3 2.7L12 21l-2.2-6.3L3.5 12l6.3-2.7z" fill="currentColor" stroke-width="1"/>',
  alert:'<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.5h.01"/>',cue:'<path d="M3 21L17.5 6.5"/><path d="M16 4l4 4"/>',
  share:'<path d="M12 3v13M7 8l5-5 5 5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6"/>',download:'<path d="M12 3v13M7 11l5 5 5-5M4 21h16"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',edit:'<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  moon:'<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  rules:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/>',vib:'<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M3 9v6M21 9v6"/>',
  bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>',swap:'<path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"/>',
  flame:'<path d="M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-6 6-6 10-1-1-2-2-2-4-1 2-1 4-1 6 0 4 3 7 7 7z"/>',tap:'<path d="M9 11V5a2 2 0 014 0v6M13 10a2 2 0 014 0v2M17 11a2 2 0 014 0v4a7 7 0 01-7 7h-1a7 7 0 01-6-3.5L4 14.5a2 2 0 013.3-2.2L9 14"/>'
};
const ic=(n,s=20,w=2)=>`<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${P[n]||''}</svg>`;

/* ---------------- 领域：颜色 / 事件 / 规则 ---------------- */
const COLORS=[
  {c:'#FF5A5F',i:'#FFFFFF'},{c:'#3D7BFF',i:'#FFFFFF'},{c:'#FFC53D',i:'#2B2100'},
  {c:'#1FC98E',i:'#FFFFFF'},{c:'#9B6BFF',i:'#FFFFFF'},{c:'#FF8A3D',i:'#FFFFFF'}];
const EV={
  pu:{name:'普胜',c:'#1FBF75',t:'#0E9F5E',icon:'check',desc:'合法打进 9 号球',win:1},
  dj:{name:'大金',c:'#FFB020',t:'#E08A00',icon:'crown',desc:'开球后一杆清台',win:1,gold:1},
  xj:{name:'小金',c:'#FF8A3D',t:'#F06A10',icon:'spark',desc:'接杆一杆清台',win:1,gold:1},
  h9:{name:'黄金九',c:'#FFC21A',t:'#D99A00',icon:'nine',desc:'开球直接进 9 号',win:1,gold:1},
  foul:{name:'犯规',c:'#FF4D4F',t:'#E5383B',icon:'alert',desc:'犯规方扣分，转给上家/下家',win:0}
};
const MAIN=['pu','dj','xj','h9','foul'], CHIPS=['dj','xj','h9','foul'], ALL=MAIN;  // 普胜 = 点卡片本身
const DEFAULT_RULES=()=>({pu:{v:4,pay:'up'},dj:{v:10,pay:'all'},xj:{v:7,pay:'up'},h9:{v:4,pay:'all'},foul:{v:1,pay:'up'}});
const PAY={up:'上家付',down:'下家付',all:'两家付'};
const FOULTO={up:'给上家',down:'给下家'};
const evIcon=(k,s=16)=>EV[k].icon==='nine'?`<span class="b9" style="--s:${s}px"></span>`:ic(EV[k].icon,s,2.2);
const evVars=k=>`--ec:${EV[k].c};--et:${EV[k].t}`;
const clone=o=>JSON.parse(JSON.stringify(o));
const signed=v=>v>0?'+'+v:v<0?'−'+Math.abs(v):'0';
const fmt=s=>{s=Math.max(0,s|0);return [s/3600|0,(s/60|0)%60,s%60].map(x=>String(x).padStart(2,'0')).join(':')};
const hm=t=>{const d=new Date(t);return d.getHours()+':'+String(d.getMinutes()).padStart(2,'0')};
const dayLabel=t=>{const d=new Date(t),n=new Date();const diff=Math.round((new Date(n.toDateString())-new Date(d.toDateString()))/864e5);
  return diff===0?'今天 '+hm(t):diff===1?'昨天 '+hm(t):`${d.getMonth()+1}月${d.getDate()}日`};
const dur=ms=>{const m=Math.round(ms/6e4);return m>=60?`${m/60|0} 小时 ${m%60} 分`:`${m} 分钟`};

/* ---------------- 规则引擎（纯函数） ----------------
   match = { players:[friendId], order0:[座位下标], rules, events:[{p,ev,t}] }
   顺序规则：每局胜者排到第一位开下一局，其余人保持原先后顺序；犯规不改变顺序。
   付分：上家 = 本局顺序中排在胜者前一位（循环）；下家 = 后一位；两家 = 其余所有人。
   双人时上家 = 下家 = 对手。                                                     */
function derive(m){
  const n=m.players.length, sc=Array(n).fill(0), st=[...Array(n)].map(()=>({pu:0,dj:0,xj:0,h9:0,foul:0,win:0}));
  let order=[...m.order0], round=1, lastW=-1, cur=0; const best=Array(n).fill(0), steps=[];
  for(const e of m.events){
    const r=m.rules[e.ev], pos=order.indexOf(e.p), up=order[(pos-1+n)%n], down=order[(pos+1)%n], d=Array(n).fill(0);
    let payers=[], to=null; const before=[...order], rnd=round;
    if(e.ev==='foul'){ to=r.pay==='down'?down:up; d[e.p]-=r.v; d[to]+=r.v; }
    else{
      payers=r.pay==='all'?order.filter(x=>x!==e.p):[r.pay==='down'?down:up];
      payers.forEach(x=>{d[x]-=r.v;d[e.p]+=r.v});
      order=[e.p,...order.filter(x=>x!==e.p)]; round++; st[e.p].win++;
      cur=lastW===e.p?cur+1:1; lastW=e.p; best[e.p]=Math.max(best[e.p],cur);
    }
    d.forEach((x,i)=>sc[i]+=x); st[e.p][e.ev]++;
    steps.push({...e,d,payers,to,before,after:[...order],round:rnd});
  }
  return {scores:sc,stats:st,order,round,steps,best};
}

/* ---------------- 演示数据 ---------------- */
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function genEvents(r,n,rounds,skill,start,gap){
  const out=[];let k=0,t=start;const tot=skill.reduce((a,b)=>a+b,0);
  const pick=()=>{let x=r()*tot;for(let i=0;i<n;i++){x-=skill[i];if(x<=0)return i}return n-1};
  while(k<rounds){t+=gap*(0.6+r()*0.8);const p=pick();
    if(r()<.16){out.push({p,ev:'foul',t});continue}
    const x=r();out.push({p,ev:x<.78?'pu':x<.87?'xj':x<.95?'h9':'dj',t});k++}
  return out;
}
function makeStore(opt={}){
  const now=Date.now();
  const s={
    friends:[{id:'u1',name:'Isaac',color:0,me:1},{id:'u2',name:'Henry',color:1},{id:'u3',name:'Hugo',color:2},{id:'u4',name:'Leo',color:3},{id:'u5',name:'Mia',color:4}],
    history:[],live:null,draft:null,
    settings:{timer:true,keep:true,vib:true},defaultRules:DEFAULT_RULES(),statSeg:'all'
  };
  const plan=[[2,['u1','u2'],30],[3,['u1','u2','u3'],38],[2,['u1','u3'],26],[2,['u1','u2'],35],[3,['u1','u4','u2'],28],[2,['u1','u5'],22],[2,['u1','u2'],40],[3,['u1','u2','u3'],33],[2,['u1','u4'],20],[2,['u1','u3'],27]];
  const r=rng(7);
  plan.forEach(([mode,pl,rounds],i)=>{
    const d=new Date(now-(i*2.6+1)*864e5);d.setHours(20,10,0,0);const start=d.getTime();
    const ev=genEvents(r,mode,rounds,pl.map(id=>id==='u1'?1.3:1),start,150e3);
    s.history.push({id:'m'+i,mode,players:pl,order0:pl.map((_,j)=>j),rules:DEFAULT_RULES(),events:ev,start,end:ev[ev.length-1].t+60e3,status:'done'});
  });
  if(opt.live!==false){
    const mode=opt.live3?3:2, pl=mode===3?['u1','u2','u3']:['u1','u2'], start=now-(mode===3?2890e3:4354e3);
    const ev=genEvents(rng(mode===3?21:99),mode,mode===3?14:16,pl.map((_,j)=>j===0?1.25:1),start,mode===3?170e3:220e3);
    s.live={id:'live',mode,players:pl,order0:pl.map((_,j)=>j),rules:DEFAULT_RULES(),events:ev,start,status:'live'};
  }
  return s;
}

/* ---------------- 数字滚轮 ---------------- */
function setOdo(el,val){
  let sign=el.querySelector('.sg');
  if(!sign){sign=document.createElement('span');sign.className='sg';sign.textContent='−';sign.style.cssText='display:inline-block;overflow:hidden;width:0;transition:width .4s cubic-bezier(.3,1.4,.5,1)';el.appendChild(sign)}
  sign.style.width=val<0?'.5em':'0';
  const s=String(Math.abs(val));let cols=[...el.querySelectorAll('.col')];
  if(cols.length!==s.length){cols.forEach(c=>c.remove());
    cols=[...s].map(()=>{const c=document.createElement('span');c.className='col';c.style.cssText='display:inline-block;height:1em;overflow:hidden';
      c.innerHTML='<span class="strip" style="display:block;transition:transform .9s cubic-bezier(.2,.9,.25,1.06)">'+'0123456789'.split('').map(d=>`<span style="display:block;height:1em;line-height:1em;text-align:center">${d}</span>`).join('')+'</span>';el.appendChild(c);return c});
    void el.offsetWidth}
  cols.forEach((c,i)=>c.firstChild.style.transform=`translateY(${-s[i]}em)`);
}
const restart=(el,c)=>{if(!el)return;el.classList.remove(c);void el.offsetWidth;el.classList.add(c)};
const odoCSS='display:inline-flex;line-height:1;height:1em;overflow:hidden;letter-spacing:-.03em';

/* =========================================================
   App：模拟小程序运行时（页面栈、胶囊、弹层、Toast）
   ========================================================= */
const STATUS_R=`<span style="display:flex;gap:6px;align-items:center"><svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg><svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 2.2c2.6 0 5 1 6.8 2.7l1-1.1A11 11 0 008 .7 11 11 0 00.2 3.8l1 1.1A9.6 9.6 0 018 2.2zm0 3.4c1.7 0 3.2.6 4.4 1.7l1-1.1A8 8 0 008 4a8 8 0 00-5.4 2.2l1 1.1C4.8 6.2 6.3 5.6 8 5.6zm0 3.3c.8 0 1.5.3 2 .8L8 11.9 6 9.7c.5-.5 1.2-.8 2-.8z"/></svg><svg width="26" height="13" viewBox="0 0 26 13"><rect x=".5" y=".5" width="22" height="12" rx="3.8" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="17" height="9" rx="2.2"/><path d="M24 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" opacity=".45"/></svg></span>`;
const CAPSULE=`<span><svg width="20" height="6" viewBox="0 0 20 6"><circle cx="3" cy="3" r="2.2" fill="currentColor"/><circle cx="10" cy="3" r="3" fill="currentColor"/><circle cx="17" cy="3" r="2.2" fill="currentColor"/></svg></span><i></i><span><svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7.3" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="9" r="3" fill="currentColor"/></svg></span>`;

class App{
  constructor(host,o={}){
    this.host=host;this.store=o.store||makeStore();this.stack=[];this.o=o;this.static=!!o.static;
    host.classList.add('app');if(o.theme==='dark')host.classList.add('dark');
    host.innerHTML=`<div class="pages"></div><div class="status"><span>21:42</span>${STATUS_R}</div><div class="capsule">${CAPSULE}</div><div class="ovl"></div><div class="toast"></div><div class="hind"></div>`;
    this.pagesEl=$('.pages',host);this.ovl=$('.ovl',host);this.toastEl=$('.toast',host);
    host.addEventListener('click',e=>this.onClick(e));
    if(!this.static)this.tk=setInterval(()=>this.tick(),1000);
    this.open(o.start||'home',o.params||{},{anim:false});
    this.tick();
  }
  /* ---- 导航 ---- */
  f(id){return this.store.friends.find(x=>x.id===id)}
  col(id){return COLORS[this.f(id).color%COLORS.length]}
  pvars(id){const c=this.col(id);return `--pc:${c.c};--pi:${c.i}`}
  av(id,cls=''){const f=this.f(id);return `<span class="av ${cls}" style="${this.pvars(id)}">${f.name[0]}</span>`}
  get top(){return this.stack[this.stack.length-1]}
  build(name,params){
    const def=PAGES[name],v=def.render(this,params||{});const el=document.createElement('div');el.className='page '+(v.cls||'');
    const nav=v.nav===false?'':`<div class="navbar ${v.brand?'brand':''}">${v.back===false||v.brand?'':`<button class="nb-back" data-act="back">${ic('back',24,2.4)}</button>`}<div class="nb-title">${v.title||''}</div></div>`;
    el.innerHTML=nav+(v.raw?v.body:`<div class="body ${v.bodyCls||''}">${v.body}</div>`)+(v.tab?this.tabbar(v.tab):'')+(v.extra||'');
    return {name,params:params||{},el,def,land:!!def.land};
  }
  mount(p){this.pagesEl.appendChild(p.el);p.def.mount&&p.def.mount(this,p.el,p.params,p);this.orient(p.land);this.o.onPage&&this.o.onPage(p.name,p.params)}
  open(name,params,{anim=true}={}){
    this.closeOvl(true);const p=this.build(name,params);const prev=this.top;
    if(prev&&anim&&!p.land&&!prev.land){prev.el.classList.add('under')}else if(prev){prev.el.style.display='none'}
    if(anim)p.el.classList.add(p.land||(prev&&prev.land)?'fade':'in');
    this.stack.push(p);this.mount(p);
  }
  redirect(name,params){const old=this.stack.pop();old&&old.el.remove();const prev=this.top;this.open(name,params,{anim:false});this.top.el.classList.add('fade');if(prev)prev.el.style.display='none'}
  back(){
    if(this.stack.length<2)return;this.closeOvl(true);
    const cur=this.stack.pop(),prev=this.top;prev.el.style.display='';
    if(cur.land||prev.land){cur.el.remove();prev.el.classList.remove('under');prev.el.classList.add('fade')}
    else{cur.el.classList.add('out');setTimeout(()=>cur.el.remove(),320);requestAnimationFrame(()=>prev.el.classList.remove('under'))}
    this.orient(prev.land);this.refresh(prev);this.o.onPage&&this.o.onPage(prev.name,prev.params);
  }
  tab(name){this.closeOvl(true);this.stack.forEach(p=>p.el.remove());this.stack=[];this.open(name,{},{anim:false});this.top.el.classList.add('fade')}
  reset(name,params,below){this.stack.forEach(p=>p.el.remove());this.stack=[];if(below){this.open(below,{},{anim:false})}this.open(name,params,{anim:false})}
  refresh(p=this.top){
    if(!p)return;if(p.def.onShow&&p.def.keep){p.def.onShow(this,p.el,p.params,p);return}
    const body=$('.body',p.el),sc=body?body.scrollTop:0;const n=this.build(p.name,p.params);
    p.el.replaceChildren(...n.el.childNodes);p.def.mount&&p.def.mount(this,p.el,p.params,p);const b2=$('.body',p.el);if(b2)b2.scrollTop=sc;
  }
  orient(land){
    const was=this.host.classList.contains('land');if(was===land)return;
    this.host.classList.toggle('land',land);this.o.onOrient&&this.o.onOrient(land);
  }
  tabbar(on){
    const T=[['home','追分','target'],['stats','战绩','chart'],['me','我的','user']];
    return `<div class="tabbar">${T.map(([k,l,i])=>`<button class="${k===on?'on':''}" data-act="tab:${k}"><span class="tb-ic">${ic(i,21,2.1)}</span>${l}</button>`).join('')}</div>`;
  }
  setTheme(t){this.host.classList.toggle('dark',t==='dark');this.o.onTheme&&this.o.onTheme(t)}
  /* ---- 弹层 ---- */
  sheet(inner,{title,sub}={}){
    this.ovl.innerHTML=`<div class="mask" data-act="closeOvl"></div><div class="sheet"><div class="grab"></div>${title?`<div class="sh-t"><b>${title}</b>${sub||''}</div>`:''}<div class="sh-b">${inner}</div></div>`;
    this.showOvl();
  }
  modal({title,text,ok='确定',cancel='取消',onOk}){
    this._onOk=onOk;
    this.ovl.innerHTML=`<div class="mask"></div><div class="modal"><div class="md-c"><b>${title}</b><p>${text}</p></div><div class="md-f">${cancel?`<button data-act="closeOvl">${cancel}</button>`:''}<button class="ok" data-act="modalOk">${ok}</button></div></div>`;
    this.showOvl();
  }
  layer(html){this.ovl.innerHTML=html;this.showOvl()}
  showOvl(){this.ovl.classList.add('on');void this.ovl.offsetWidth;this.ovl.classList.add('show')}
  closeOvl(now){if(!this.ovl.classList.contains('on'))return;this.ovl.classList.remove('show');const d=()=>{this.ovl.classList.remove('on');this.ovl.innerHTML=''};now?d():setTimeout(d,300)}
  toast(text,icon='check'){
    this.toastEl.innerHTML=(icon?ic(icon,30,2.4):'')+`<span>${text}</span>`;this.toastEl.style.padding=icon?'':'12px 18px';
    this.toastEl.classList.add('on');clearTimeout(this._tt);this._tt=setTimeout(()=>this.toastEl.classList.remove('on'),1500);
  }
  vibrate(){if(this.store.settings.vib&&navigator.vibrate)navigator.vibrate(12)}
  /* ---- 事件分发 ---- */
  onClick(e){
    const t=e.target.closest('[data-act]');if(!t||!this.host.contains(t))return;
    const [a,...args]=t.dataset.act.split(':');const fn=ACTS[a];if(fn){e.stopPropagation();fn(this,args,t,e)}
  }
  run(s,el){const [a,...args]=s.split(':');ACTS[a]&&ACTS[a](this,args,el||this.host,null)}
  tick(){
    const L=this.store.live;if(!L)return;const v=fmt((Date.now()-L.start)/1000);
    $$('[data-clock]',this.host).forEach(el=>el.textContent=v);
  }
  relRect(el){const h=this.host.getBoundingClientRect(),r=el.getBoundingClientRect(),k=h.width/this.host.offsetWidth;
    return {x:(r.left-h.left)/k,y:(r.top-h.top)/k,w:r.width/k,h:r.height/k}}
  finishLive(){const L=this.store.live;if(!L)return null;if(!L.events.length){this.store.live=null;return null}L.status='done';L.end=Date.now();L.id='m'+Date.now();this.store.history.unshift(L);this.store.live=null;return L}
  draftFrom(mode,players,order0,rules){
    this.store.draft={mode,slots:players.slice(0,mode),rules:rules?clone(rules):clone(this.store.defaultRules)};
    if(order0)this.store.draft.slots=order0.map(i=>players[i]);
  }
}

/* =========================================================
   记分视图（竖屏 / 横屏共用逻辑）
   ========================================================= */
class ScoreView{
  constructor(app,el,kind){
    this.app=app;this.el=el;this.kind=kind;this.m=app.store.live;this.n=this.m.players.length;
    this.cards=$$('.pc',el);this.fx=$('.fx',el);this.snackEl=$('.snack',el);this.prevOrder=null;
    this.cards.forEach(c=>{const o=$('.odo',c);o.style.cssText=odoCSS});
    this.update(false);
  }
  update(fxStep){
    const D=derive(this.m);this.D=D;const max=Math.max(...D.scores),sorted=[...D.scores].sort((a,b)=>b-a),lead=sorted[0]-sorted[1];
    this.cards.forEach((c,i)=>{
      setOdo($('.odo',c),D.scores[i]);
      c.classList.toggle('leader',D.scores[i]===max&&lead>0);
      const ld=$('.lead',c);if(ld)ld.textContent='领先 '+lead;
      const pos=D.order.indexOf(i),role=$('.role',c);
      if(role){role.textContent=pos===0?'开球':this.n===3?`第${pos+1}位`:'后手';role.classList.toggle('brk',pos===0)}
      $$('[data-k]',c).forEach(ch=>{const k=ch.dataset.k,em=$('em',ch),cnt=D.stats[i][k];if(!em)return;
        const prev=+em.textContent||0;em.textContent=cnt;em.classList.toggle('on',cnt>0);if(fxStep&&cnt>prev)restart(em,'pop')});
    });
    $$('[data-round]',this.el).forEach(r=>r.textContent=D.round);
    this.renderOrder(D.order,!!fxStep);
    if(fxStep&&typeof fxStep==='object')this.effects(fxStep);
  }
  renderOrder(order,animate){
    const box=$('.order-l',this.el);if(!box)return;
    const old={};$$('.oi',box).forEach(x=>old[x.dataset.p]=x.getBoundingClientRect().left);
    box.innerHTML=order.map((p,k)=>`<span class="oi ${k===0?'first':''}" data-p="${p}">${this.app.av(this.m.players[p])}${k===0?'开球':this.app.f(this.m.players[p]).name}</span>`).join(`<span class="oarr">${ic('chev',14,2.4)}</span>`);
    if(animate)$$('.oi',box).forEach(x=>{const o=old[x.dataset.p];if(o==null)return;const k=this.app.host.getBoundingClientRect().width/this.app.host.offsetWidth;
      const dx=(o-x.getBoundingClientRect().left)/k;if(!dx)return;x.style.transition='none';x.style.transform=`translateX(${dx}px)`;void x.offsetWidth;
      x.style.transition='transform .6s cubic-bezier(.3,1.3,.5,1)';x.style.transform=''});
  }
  score(pi,k,src,ev){
    if(src&&ev&&src.classList.contains('tapcard')){const r=this.app.relRect(src),hr=this.app.host.getBoundingClientRect(),kk=hr.width/this.app.host.offsetWidth;
      const rp=document.createElement('i');rp.className='tap-rip';rp.style.left=((ev.clientX-hr.left)/kk-r.x)+'px';rp.style.top=((ev.clientY-hr.top)/kk-r.y)+'px';src.appendChild(rp);setTimeout(()=>rp.remove(),650);
      $$('.tap-hint',this.el).forEach(x=>x.classList.remove('intro'))}
    const e={p:pi,ev:k,t:Date.now()};this.m.events.push(e);this.app.vibrate();
    const D=derive(this.m);const step=D.steps[D.steps.length-1];this.update(step);
  }
  undo(){
    const e=this.m.events.pop();if(!e){this.app.toast('没有可撤销的记录','info');return}
    const before=derive({...this.m,events:[...this.m.events,e]});const step=before.steps[before.steps.length-1];
    this.update(true);step.d.forEach((x,j)=>{if(x)this.fly(j,'↺ '+signed(-x),'',true)});
  }
  anchor(j){const c=this.cards[j],o=$('.odo',c),a=this.app.relRect(o),f=this.app.relRect(this.fx);return {x:a.x-f.x+a.w/2,y:a.y-f.y,c}}
  fly(j,txt,sub,dim){
    const {x,y}=this.anchor(j),f=document.createElement('div');f.className='fly';
    const dark=this.app.host.classList.contains('dark');const col=dark?this.app.col(this.m.players[j]).c:this.app.col(this.m.players[j]).i;
    f.style.cssText=`left:${x}px;top:${y-8}px;color:${dim?'currentColor':col};text-shadow:0 2px 12px rgba(0,0,0,.18)`;
    f.innerHTML=txt+(sub?`<small>${sub}</small>`:'');if(dim)f.style.color=col;this.fx.appendChild(f);setTimeout(()=>f.remove(),1150);
  }
  burst(card,color,n){
    const r=this.app.relRect(card),fr=this.app.relRect(this.fx),cx=r.x-fr.x+r.w/2,cy=r.y-fr.y+r.h/2;
    const cols=[color,'#FFFFFF','#FF5A5F','#3D7BFF','#1FC98E','#9B6BFF'];
    for(let i=0;i<n;i++){const p=document.createElement('i');p.className='pt';const a=Math.PI*2*i/n+Math.random()*.5,rad=70+Math.random()*90;
      p.style.cssText=`left:${cx}px;top:${cy}px;--c:${cols[i%cols.length]};--dx:${Math.cos(a)*rad}px;--dy:${Math.sin(a)*rad}px;width:${5+Math.random()*6}px;height:${6+Math.random()*8}px`;
      this.fx.appendChild(p);setTimeout(()=>p.remove(),1000)}
  }
  effects(s){
    const E=EV[s.ev],card=this.cards[s.p];
    s.d.forEach((x,j)=>{if(!x)return;const lbl=s.ev==='foul'?(x<0?'犯规':''):x<0?(s.payers.length>1?'':'付'):'';this.fly(j,signed(x),lbl);restart($('.odo',this.cards[j]),'bump')});
    restart(card,'hit');
    if(s.ev==='foul')restart(card,'shake');
    if(E.gold){restart(card,'gold');this.burst(card,E.c,s.ev==='dj'?30:18)}
    if(s.ev==='dj'||s.ev==='h9'){
      const bn=$('.banner',this.el);const name=this.app.f(this.m.players[s.p]).name;
      bn.innerHTML=`<div class="bx" style="${evVars(s.ev)}"><span class="bi">${s.ev==='h9'?'<span class="b9 n" style="--s:64px"></span>':`<span style="color:${E.c}">${ic('crown',60,1.4)}</span>`}</span><span class="bt">${E.name}</span><span class="bs">${name} ${signed(s.d[s.p])} · ${s.payers.length>1?'两家各付 '+this.m.rules[s.ev].v:''}</span></div>`;
      restart(bn,'on');
    }
  }
  snack(s,undo){
    const el=this.snackEl;if(!el)return;const A=this.app,nm=i=>A.f(this.m.players[i]).name,E=EV[s.ev],v=this.m.rules[s.ev].v;
    let txt;
    if(undo)txt=`${ic('undo',15,2.4)}已撤销 · ${nm(s.p)} ${E.name}`;
    else if(s.ev==='foul')txt=`<i class="dt" style="background:${E.c}"></i>${nm(s.p)} 犯规 −${v} · ${nm(s.to)} +${v}`;
    else txt=`<i class="dt" style="background:${E.c}"></i>${nm(s.p)} ${E.name} ${signed(s.d[s.p])} · ${s.payers.length>1?'两家各付 '+v:nm(s.payers[0])+' 付 '+v}`;
    el.innerHTML=`<span style="display:flex;align-items:center;gap:6px">${txt}</span>${undo?'':'<button data-act="undo">撤销</button>'}`;
    el.classList.add('on');clearTimeout(this._st);this._st=setTimeout(()=>el.classList.remove('on'),2800);
  }
}
const chipHTML=(pi,k,v,n)=>`<button class="chip" data-k="${k}" data-act="sc:${pi}:${k}" style="${evVars(k)}"><span class="cl">${evIcon(k,13)}${EV[k].name}</span><b class="cv">${k==='foul'?'−':'+'}${v}</b><em></em></button>`;

/* =========================================================
   页面
   ========================================================= */
const PAGES={};
const stepText=(A,m,s)=>{const nm=i=>A.f(m.players[i]).name,v=m.rules[s.ev].v;
  if(s.ev==='foul')return `${nm(s.p)} −${v} → ${m.players.length===2?'对手':FOULTO[m.rules.foul.pay].slice(1)} ${nm(s.to)} +${v}`;
  return s.payers.length>1?`两家各付 ${v}`:`${m.players.length===2?'对手':PAY[m.rules[s.ev].pay].slice(0,2)} ${nm(s.payers[0])} 付 ${v}`};

/* ---------- 首页 ---------- */
PAGES.home={render(A){
  const S=A.store,L=S.live;let live='';
  if(L){const D=derive(L);live=`<div class="card live" data-act="resume">
    <div class="live-h"><span class="dot"></span><span class="lh-t">${L.mode===2?'双人':'三人'}追分 · 第 ${D.round} 局 · <span data-clock>00:00:00</span></span><button class="go2" data-act="resume">继续${ic('chev',15,2.6)}</button></div>
    <div class="live-g" style="grid-template-columns:repeat(${L.players.length},1fr)">${L.players.map((id,i)=>`<div class="lp">${A.av(id)}<div><small>${A.f(id).name}</small><b class="num ${D.scores[i]>0?'pos':D.scores[i]<0?'neg':''}">${signed(D.scores[i])}</b></div></div>`).join('')}</div></div>`}
  const recent=S.history.slice(0,3).map(m=>matchRow(A,m)).join('');
  return {brand:1,title:'Cue追分',tab:'home',body:`
    <div class="hello"><small>${new Date().getMonth()+1}月${new Date().getDate()}日 · 今晚也要一杆清台</small><b>嗨，${A.f('u1').name}</b></div>
    <div class="modes">
      <button class="mode" style="--mc:#FF5A5F" data-act="new:2">
        <i class="blob a" style="width:120px;height:120px;background:#FFC53D;right:-30px;top:-34px"></i><i class="blob b" style="width:70px;height:70px;background:#3D7BFF;right:46px;top:38px;mix-blend-mode:multiply;opacity:.9"></i>
        <span class="go">${ic('plus',18,2.6)}</span><b>双人追分</b><small>1 v 1 · 赢家开球</small></button>
      <button class="mode" style="--mc:#3D7BFF" data-act="new:3">
        <i class="blob a" style="width:90px;height:90px;background:#1FC98E;right:-18px;top:-20px"></i><i class="blob b" style="width:64px;height:64px;background:#FFC53D;right:58px;top:20px"></i><i class="blob c" style="width:50px;height:50px;background:#FF5A5F;right:20px;top:76px"></i>
        <span class="go">${ic('plus',18,2.6)}</span><b>三人追分</b><small>胜者开球 · 上家付分</small></button>
    </div>
    ${live}
    <div class="sec">更多玩法<small>持续上新</small></div>
    <div class="more-modes">
      <button class="mm" style="--mc:#FFC53D" data-act="soon"><i></i><b>中式八球</b><span class="tag">即将上线</span></button>
      <button class="mm" style="--mc:#1FC98E" data-act="soon"><i></i><b>斯诺克</b><span class="tag">即将上线</span></button>
      <button class="mm" style="--mc:#9B6BFF" data-act="soon"><i></i><b>九球抢局</b><span class="tag">即将上线</span></button>
    </div>
    <div class="sec">最近对局<button class="link" data-act="tab:stats">全部${ic('chev',14,2.4)}</button></div>
    <div class="card list">${recent||'<div class="empty">还没有对局</div>'}</div>`}}};
function matchRow(A,m){
  const D=derive(m),me=m.players.indexOf('u1'),my=me>=0?D.scores[me]:0,max=Math.max(...D.scores),win=me>=0&&my===max&&my>0;
  return `<div class="row tap" data-act="match:${m.id}"><span class="stack">${m.players.map(id=>A.av(id,'sm')).join('')}</span>
    <div class="rm"><b>${m.players.map(id=>A.f(id).name).join(' · ')}</b><small>${m.mode===2?'双人':'三人'} · ${D.round-1} 局 · ${dayLabel(m.start)}</small></div>
    <div class="wl ${my>0?'pos':my<0?'neg':''}">${signed(my)}<small>${win?'胜':my<0?'负':'平'}</small></div></div>`;
}

/* ---------- 新对局 ---------- */
PAGES.setup={render(A){
  const d=A.store.draft,n=d.mode,lack=n-d.slots.length;
  const rows=d.slots.map((id,i)=>`<div class="slot" style="${A.pvars(id)}">
      <div class="pos-no"><b>${i+1}</b>${i===0?'<small>开球</small>':''}</div>${A.av(id)}<div class="nm">${A.f(id).name}${A.f(id).me?' <span class="tag">我</span>':''}</div>
      <button class="mini-btn" data-act="rmP:${i}" aria-label="移除">${ic('close',16,2.4)}</button></div>`).join('')
    +(lack>0?`<button class="slot add-slot" data-act="addP"><div class="pos-no"><b>${d.slots.length+1}</b></div><span class="av add-av">${ic('plus',18,2.6)}</span><div class="nm">添加球员<small>还差 ${lack} 位</small></div><span class="chev">${ic('chev',16)}</span></button>`:'');
  const sum=MAIN.map(k=>`<span class="rs" style="${evVars(k)}">${evIcon(k,14)}${EV[k].name}<span class="v">${k==='foul'?'−':'+'}${d.rules[k].v}</span>${n===3?`<em>${k==='foul'?FOULTO[d.rules[k].pay]:PAY[d.rules[k].pay]}</em>`:''}</span>`).join('');
  return {title:n===2?'双人追分':'三人追分',bodyCls:'pad-cta',body:`
    <div class="seg"><div class="thumb" style="width:calc(50% - 3px);transform:translateX(${n===2?0:100}%)"></div><button class="${n===2?'on':''}" data-act="mode:2">双人追分</button><button class="${n===3?'on':''}" data-act="mode:3">三人追分</button></div>
    <div class="sec">球员<small>第 1 位先开球</small></div>
    <div class="card">${rows}</div>
    <div class="sec">计分规则<button class="link" data-act="open:rules:draft">修改${ic('chev',14,2.4)}</button></div>
    <div class="card rules-sum">${sum}</div>
    <div class="sec">选项</div>
    <div class="card list">
      ${[['timer','对局计时','timer'],['keep','屏幕常亮','sun'],['vib','计分震动反馈','vib']].map(([k,l,i])=>`<div class="row"><span class="tile" style="--ec:#3D7BFF">${ic(i,18)}</span><div class="rm"><b>${l}</b></div><button class="sw ${A.store.settings[k]?'on':''}" data-act="sw:${k}"></button></div>`).join('')}
    </div>`,
    extra:`<div class="cta"><button class="btn pri ${lack>0?'dis':''}" data-act="start">${lack>0?`还差 ${lack} 位球员`:'开始对局'}</button></div>`}}};

/* ---------- 规则设置 ---------- */
PAGES.rules={render(A,p){
  const isDraft=p.target==='draft',R=isDraft?A.store.draft.rules:A.store.defaultRules,n=isDraft?A.store.draft.mode:3;
  const row=k=>{const r=R[k],opts=k==='foul'?[['up','给上家'],['down','给下家']]:[['up','上家付'],['all','两家付']];const idx=Math.max(0,opts.findIndex(o=>o[0]===r.pay));
    return `<div class="rule" style="${evVars(k)}"><div class="rule-top"><span class="tile">${evIcon(k,18)}</span><div class="rm"><b>${EV[k].name}</b><small>${EV[k].desc}</small></div>
      <div class="stepper"><button data-act="step:${p.target}:${k}:-1">−</button><b class="num">${k==='foul'?'−':'+'}${r.v}</b><button data-act="step:${p.target}:${k}:1">+</button></div></div>
      ${n===3?`<div class="rule-pay"><span>${k==='foul'?'扣的分':'由谁付分'}</span><div class="seg sm"><div class="thumb" style="width:calc(50% - 2px);transform:translateX(${idx*100}%)"></div>${opts.map(([v,l])=>`<button class="${v===r.pay?'on':''}" data-act="pay:${p.target}:${k}:${v}">${l}</button>`).join('')}</div></div>`:''}</div>`};
  return {title:isDraft?'计分规则':'默认计分规则',body:`
    <div class="sec" style="margin-top:6px">计分规则<small>${isDraft?(n===2?'双人：一律对手付分':'三人模式'):'新对局默认使用'}</small></div>
    <div class="card">${MAIN.map(row).join('')}</div>
    <button class="btn sec2" style="width:100%;margin-top:16px" data-act="resetRules:${p.target}">恢复默认</button>`}}};

/* ---------- 记分（竖屏） ---------- */
PAGES.score={keep:1,render(A){
  const L=A.store.live;if(!L)return {title:'记分',body:'<div class="empty">暂无进行中的对局</div>'};
  const n=L.players.length;
  const hint=i=>`<span class="tap-hint" data-k="pu">${ic('tap',13,2.2)}轻点卡片 · 普胜 +${L.rules.pu.v}</span>`;
  const cards=L.players.map((id,i)=>`<div class="pc tapcard" style="${A.pvars(id)}" data-act="sc:${i}:pu"><div class="flash"></div><div class="sheen"></div>
    <div class="pc-h">${A.av(id)}<div class="pc-id"><div class="nm">${A.f(id).name}<span class="crown">${ic('crown',16,1.4)}</span><span class="role"></span></div>${n===3?hint(i):''}</div></div>
    <div class="pc-s"><div class="odo"></div>${n===2?hint(i):''}<span class="lead"></span></div>
    <div class="chips">${CHIPS.map(k=>chipHTML(i,k,L.rules[k].v,n)).join('')}</div></div>`).join('');
  return {title:`<b>第 <span data-round>1</span> 局</b><small data-clock>00:00:00</small>`,raw:1,body:`<div class="score-body">
    ${n===3?`<div class="order"><small>本局顺序</small><div class="order-l"></div></div>`:''}
    <div class="sc-cards ${n===3?'trio':'duo'}">${cards}</div></div>
    <div class="fx"></div><div class="banner"></div>
    <div class="dock"><button class="hl" data-act="undo">${ic('undo',22)}撤销</button><button data-act="open:log">${ic('list',22)}记录</button><button data-act="open:land">${ic('rotate',22)}横屏</button><button class="end" data-act="finish">${ic('flag',22)}结算</button></div>`};
},mount(A,el,p,pg){if(A.store.live){pg.view=new ScoreView(A,el,'portrait');$$('.tap-hint',el).forEach(h=>h.classList.add('intro'))}},onShow(A,el,p,pg){pg.view&&pg.view.update(false)}};

/* ---------- 记分（横屏） ---------- */
PAGES.land={land:1,keep:1,render(A){
  const L=A.store.live,n=L.players.length;
  // 双人：两张卡同一方向，按钮竖排在卡片右侧；三人：卡片底部横排
  const cols=L.players.map((id,i)=>`<div class="lc pc ${n===2?'side-r':''}" style="${A.pvars(id)}"><div class="flash"></div><div class="sheen"></div>
    <div class="lc-main"><div class="pc-h">${A.av(id)}<div class="nm">${A.f(id).name}<span class="crown">${ic('crown',16,1.4)}</span><span class="role"></span></div></div>
      <button class="tapzone" data-act="sc:${i}:pu"><div class="odo"></div><span class="tap-hint" data-k="pu">${ic('tap',13,2.2)}轻点比分 · 普胜 +${L.rules.pu.v}</span></button></div>
    <div class="lc-btns">${CHIPS.map(k=>chipHTML(i,k,L.rules[k].v)).join('')}</div></div>`).join('');
  return {nav:false,raw:1,cls:'land-page',body:`<div class="ltop"><button class="lbtn" data-act="back">${ic('rotate',16)}竖屏</button><button class="lbtn" data-act="undo">${ic('undo',16)}撤销</button>
    <div class="lt-c">第 <span data-round>1</span> 局<small data-clock>00:00:00</small></div></div>
    <div class="lcols ${n===3?'n3':''}" style="grid-template-columns:repeat(${n},1fr)">${cols}</div><div class="fx"></div><div class="banner"></div>`};
},mount(A,el,p,pg){pg.view=new ScoreView(A,el,'land')},onShow(A,el,p,pg){pg.view&&pg.view.update(false)}};

/* ---------- 对局记录 ---------- */
PAGES.log={render(A,p){
  const m=p.id?A.store.history.find(x=>x.id===p.id):A.store.live;if(!m)return {title:'对局记录',body:'<div class="empty">暂无记录</div>'};
  const D=derive(m),ro=m.status==='done';
  const rows=D.steps.map((s,i)=>({s,i})).reverse().map(({s,i},k)=>{const E=EV[s.ev];
    return `<div class="lg-row ${k===0&&p.fresh?'new':''}" style="${evVars(s.ev)}" ${ro?'':`data-act="row:${i}"`}>
      <div class="lg-r"><b class="num">${s.round}</b><small>局</small></div><span class="tile">${evIcon(s.ev,18)}</span>
      <div class="lg-m"><b>${A.f(m.players[s.p]).name} · <em>${E.name}</em></b><small>${hm(s.t)} · ${stepText(A,m,s)}</small>
        ${s.ev!=='foul'&&m.mode===3?`<div class="lg-ord">${s.after.map(x=>A.av(m.players[x],'sm')).join('<i>›</i>')}<i style="margin-left:4px">下局顺序</i></div>`:''}</div>
      <div class="lg-d">${s.d.map((x,j)=>x?`<div class="${x>0?'pos':'neg'}">${A.f(m.players[j]).name[0]} ${signed(x)}</div>`:'').join('')}</div></div>`}).join('');
  return {title:'对局记录',body:`<div class="sb-row">${m.players.map((id,i)=>`<div class="sb-it">${A.av(id,'sm')}<span>${A.f(id).name}</span><b class="${D.scores[i]>0?'pos':D.scores[i]<0?'neg':''}">${signed(D.scores[i])}</b></div>`).join('')}</div>
    <div class="sec" style="margin-top:4px">共 ${D.steps.length} 条<small>${ro?'已结束 · 只读':'点击记录可修改或删除'}</small></div>
    <div class="card">${rows||'<div class="empty">还没有记录</div>'}</div>`};
}};

/* ---------- 结算 ---------- */
PAGES.result={render(A,p){
  const m=A.store.history.find(x=>x.id===p.id);if(!m)return {title:'战报',body:'<div class="empty">未找到对局</div>'};
  const D=derive(m),rank=m.players.map((id,i)=>({id,i,s:D.scores[i]})).sort((a,b)=>b.s-a.s),W=rank[0],wf=A.f(W.id);
  const cols=`grid-template-columns:1.3fr repeat(${m.players.length},1fr)`;
  const rowsDef=[['胜局',i=>D.stats[i].win],['普胜',i=>D.stats[i].pu],['大金',i=>D.stats[i].dj],['小金',i=>D.stats[i].xj],['黄金九',i=>D.stats[i].h9],['犯规',i=>D.stats[i].foul,1],['最长连胜',i=>D.best[i]]];
  const tbl=rowsDef.map(([l,f,low])=>{const vals=m.players.map((_,i)=>f(i)),best=low?Math.min(...vals):Math.max(...vals);
    return `<div class="tr" style="${cols}"><span>${l}</span>${vals.map(v=>`<span class="${v===best&&v>0?'w':''}">${v}</span>`).join('')}</div>`}).join('');
  const golds=['dj','xj','h9'].reduce((a,k)=>a+D.stats[W.i][k],0);
  const conf=Array.from({length:22},(_,i)=>`<i class="cf" style="left:${(i*37)%100}%;background:${['#FFC53D','#fff','#3D7BFF','#1FC98E','#9B6BFF','#FF8A3D'][i%6]};animation-duration:${3+i%5*.7}s;animation-delay:${-(i*.43)%4}s;border-radius:${i%3?2:6}px"></i>`).join('');
  return {title:p.detail?'对局详情':'战报',bodyCls:'pad-cta',body:`
    <div class="res-hero" style="${A.pvars(W.id)}"><div class="confetti">${conf}</div>
      <div class="cr">${ic('crown',40,1.2)}</div>${A.av(W.id,'lg')}
      <h2>${wf.name} 赢下本场</h2><div class="big num">${signed(W.s)}</div>
      <p>${m.mode===2?'双人':'三人'}追分 · ${D.round-1} 局 · ${dur(m.end-m.start)} · ${dayLabel(m.start)}</p></div>
    <div class="card" style="margin-top:12px">${rank.map((r,k)=>`<div class="rank"><span class="no">${k+1}</span>${A.av(r.id)}<span class="nm">${A.f(r.id).name}</span><span class="sc ${r.s>0?'pos':r.s<0?'neg':''}">${signed(r.s)}</span></div>`).join('')}</div>
    <div class="hls">
      <span class="hl" style="${evVars('dj')}">${ic('flame',14)}最长连胜 <b>${D.best[W.i]}</b></span>
      <span class="hl" style="${evVars('xj')}">${ic('spark',14)}金球 <b>${golds}</b> 次</span>
      <span class="hl" style="${evVars('pu')}">${ic('check',14)}普胜 <b>${D.stats[W.i].pu}</b></span></div>
    <div class="sec">数据对比<button class="link" data-act="open:log:${m.id}">逐局记录${ic('chev',14,2.4)}</button></div>
    <div class="card tbl"><div class="tr hd" style="${cols}"><span></span>${m.players.map(id=>`<span style="display:flex;justify-content:center">${A.av(id,'sm')}</span>`).join('')}</div>${tbl}</div>`,
    extra:`<div class="cta"><button class="btn sec2" data-act="poster:${m.id}">${ic('share',18)}分享战报</button><button class="btn pri" data-act="again:${m.id}">再来一局</button></div>`};
}};

/* ---------- 战绩 ---------- */
function myStats(A,seg){
  const ms=A.store.history.filter(m=>m.status==='done'&&m.players.includes('u1')&&(seg==='all'||m.mode===+seg));
  let wins=0,net=0;const ev={pu:0,dj:0,xj:0,h9:0,foul:0},trend=[],h2h={};
  [...ms].reverse().forEach(m=>{const D=derive(m),me=m.players.indexOf('u1'),my=D.scores[me],max=Math.max(...D.scores);
    if(my===max&&my>0)wins++;net+=my;trend.push(net);ALL.forEach(k=>ev[k]+=D.stats[me][k]);
    m.players.forEach((id,i)=>{if(id==='u1')return;const o=h2h[id]||(h2h[id]={w:0,l:0,n:0,net:0});o.n++;D.scores[me]>D.scores[i]?o.w++:o.l++;o.net+=my});});
  return {ms,wins,net,ev,trend,h2h};
}
PAGES.stats={render(A){
  const seg=A.store.statSeg,S=myStats(A,seg),n=S.ms.length,rate=n?Math.round(S.wins/n*100):0;const segIdx={all:0,2:1,3:2}[seg];
  const max=Math.max(1,...ALL.map(k=>S.ev[k]));
  const tw=326,th=96,tr=S.trend.length?S.trend:[0],mn=Math.min(0,...tr),mx=Math.max(1,...tr);
  const pts=tr.map((v,i)=>[tr.length===1?tw/2:6+i*(tw-12)/(tr.length-1),8+(th-16)*(1-(v-mn)/(mx-mn||1))]);
  const path=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' '),z=8+(th-16)*(1-(0-mn)/(mx-mn||1)),lp=pts[pts.length-1];
  const C=2*Math.PI*48;
  return {brand:1,title:'战绩',tab:'stats',body:`
    <div class="seg" style="margin:4px 0 14px"><div class="thumb" style="width:calc(33.33% - 2px);transform:translateX(${segIdx*100}%)"></div>${[['all','全部'],['2','双人'],['3','三人']].map(([k,l])=>`<button class="${k===seg?'on':''}" data-act="seg:${k}">${l}</button>`).join('')}</div>
    <div class="kpis"><div class="card ring-card"><div class="ring"><svg width="112" height="112"><circle cx="56" cy="56" r="48" fill="none" stroke="var(--card2)" stroke-width="12"/>
      <circle class="v" cx="56" cy="56" r="48" fill="none" stroke="#FF5A5F" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-off="${C*(1-rate/100)}"/></svg>
      <div class="c"><b>${rate}%</b><small>胜率</small></div></div></div>
      <div class="kv-col"><div class="card kv"><small>对局 · 胜</small><b class="num">${n}<span style="color:var(--tx3);font-size:16px"> · ${S.wins}</span></b></div>
      <div class="card kv"><small>累计净胜分</small><b class="num ${S.net>=0?'pos':'neg'}">${signed(S.net)}</b></div></div></div>
    <div class="card trend" style="margin-top:12px"><div class="trend-h">净胜分走势<small>近 ${n} 场</small></div>
      <svg width="100%" viewBox="0 0 ${tw} ${th}" height="${th}"><defs><linearGradient id="tg" x1="0" x2="1"><stop offset="0" stop-color="#3D7BFF"/><stop offset="1" stop-color="#FF5A5F"/></linearGradient></defs>
      <line x1="0" x2="${tw}" y1="${z}" y2="${z}" stroke="var(--line)" stroke-width="1.5" stroke-dasharray="3 4"/>
      <path class="ln" pathLength="1" d="${path}" fill="none" stroke="url(#tg)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${lp[0]}" cy="${lp[1]}" r="5" fill="#FF5A5F" stroke="var(--card)" stroke-width="2"/></svg></div>
    <div class="sec">得分构成<small>次数</small></div>
    <div class="card bars">${ALL.map(k=>`<div class="bar" style="${evVars(k)}"><span>${EV[k].name}</span><div class="tk"><i data-w="${S.ev[k]/max*100}%"></i></div><b>${S.ev[k]}</b></div>`).join('')}</div>
    <div class="sec">交手记录</div>
    <div class="card list">${Object.entries(S.h2h).map(([id,o])=>`<div class="row tap" data-act="h2h:${id}">${A.av(id)}<div class="rm"><b>vs ${A.f(id).name}</b><small>同场 ${o.n} 次</small></div><div class="wl">${o.w} : ${o.l}<small>胜 : 负</small></div><span class="chev">${ic('chev',16)}</span></div>`).join('')||'<div class="empty">暂无</div>'}</div>
    <div class="sec">历史对局</div>
    <div class="card list">${S.ms.map(m=>matchRow(A,m)).join('')||'<div class="empty">暂无</div>'}</div>`};
},mount(A,el){requestAnimationFrame(()=>requestAnimationFrame(()=>{const v=$('.ring .v',el);if(v)v.style.strokeDashoffset=v.dataset.off;$$('.bar i',el).forEach(i=>i.style.width=i.dataset.w)}))}};

/* ---------- 交手 ---------- */
PAGES.h2h={render(A,p){
  const id=p.fid,ms=A.store.history.filter(m=>m.status==='done'&&m.players.includes('u1')&&m.players.includes(id));
  let w=0,l=0;ms.forEach(m=>{const D=derive(m);D.scores[m.players.indexOf('u1')]>D.scores[m.players.indexOf(id)]?w++:l++});
  return {title:'交手记录',body:`<div class="card" style="padding-bottom:16px">
    <div class="h2h-top"><div class="hp">${A.av('u1','lg')}<b>${A.f('u1').name}</b></div><span class="vs">VS</span><div class="hp">${A.av(id,'lg')}<b>${A.f(id).name}</b></div></div>
    <div class="rec num">${w}<span>:</span>${l}</div>
    <div class="split"><i style="flex:${w||.01};background:${A.col('u1').c}"></i><i style="flex:${l||.01};background:${A.col(id).c}"></i></div>
    <div class="h2h-sub"><span>${A.f('u1').name} 分数更高 ${w} 场</span><span>${A.f(id).name} ${l} 场</span></div></div>
    <div class="sec">同场对局<small>${ms.length} 场</small></div><div class="card list">${ms.map(m=>matchRow(A,m)).join('')}</div>`};
}};

/* ---------- 我的 ---------- */
PAGES.me={render(A){
  const dark=A.host.classList.contains('dark');
  return {brand:1,title:'我的',tab:'me',body:`
    <div class="card me-card">${A.av('u1','lg')}<div><b>${A.f('u1').name}</b><small>Cue 追分 · 内测版 0.1</small></div></div>
    <div class="sec">外观</div>
    <div class="card" style="padding:12px"><div class="seg"><div class="thumb" style="width:calc(50% - 3px);transform:translateX(${dark?100:0}%)"></div><button class="${dark?'':'on'}" data-act="theme:light">${'浅色'}</button><button class="${dark?'on':''}" data-act="theme:dark">深色</button></div></div>
    <div class="sec">设置</div>
    <div class="card list">
      <div class="row tap" data-act="open:rules:default"><span class="tile" style="--ec:#FF5A5F">${ic('rules',18)}</span><div class="rm"><b>默认计分规则</b><small>新对局默认使用</small></div><span class="chev">${ic('chev',16)}</span></div>
      <div class="row tap" data-act="open:friends"><span class="tile" style="--ec:#3D7BFF">${ic('people',18)}</span><div class="rm"><b>球友管理</b><small>${A.store.friends.length} 位球友</small></div><span class="chev">${ic('chev',16)}</span></div>
      <div class="row"><span class="tile" style="--ec:#1FC98E">${ic('vib',18)}</span><div class="rm"><b>计分震动反馈</b></div><button class="sw ${A.store.settings.vib?'on':''}" data-act="sw:vib"></button></div>
      <div class="row"><span class="tile" style="--ec:#FFB020">${ic('sun',18)}</span><div class="rm"><b>记分时屏幕常亮</b></div><button class="sw ${A.store.settings.keep?'on':''}" data-act="sw:keep"></button></div>
    </div>
    <div class="sec">关于</div>
    <div class="card list"><div class="row tap" data-act="about"><span class="tile" style="--ec:#9B6BFF">${ic('info',18)}</span><div class="rm"><b>追分规则说明</b><small>上家 / 两家付分怎么算</small></div><span class="chev">${ic('chev',16)}</span></div></div>`};
}};
PAGES.friends={render(A){
  return {title:'球友管理',body:`<div class="card list">${A.store.friends.map(f=>`<div class="row">${A.av(f.id)}<div class="rm"><b>${f.name}${f.me?' <span class="tag">我</span>':''}</b></div></div>`).join('')}</div>
    <div class="sec">新建球友</div><div class="add-row"><input class="inp" id="nf" placeholder="输入球友名字" maxlength="8"><button class="btn pri" data-act="addFriend:page">添加</button></div>`};
}};

/* =========================================================
   交互动作
   ========================================================= */
const ACTS={
  back:A=>A.back(),tab:(A,[t])=>A.tab(t),closeOvl:A=>A.closeOvl(),
  modalOk:A=>{const f=A._onOk;A.closeOvl(true);f&&f()},
  open:(A,[pg,arg])=>A.open(pg,pg==='rules'?{target:arg}:pg==='log'?{id:arg}:{}),
  soon:A=>A.toast('敬请期待','bolt'),
  about:A=>A.modal({title:'追分规则说明',text:'胜者排第一开下一局，其余人保持原顺序。普胜、小金由上家付；大金、黄金九两家付；犯规扣 1 分给上家。均可在规则中修改。',ok:'知道了',cancel:''}),
  new:(A,[n])=>{n=+n;A.draftFrom(n,n===2?['u1','u2']:['u1','u2','u3']);A.open('setup')},
  resume:A=>A.open('score'),
  mode:(A,[n])=>{const d=A.store.draft;n=+n;if(d.mode===n)return;d.mode=n;d.slots=d.slots.slice(0,n);
    const thumb=$('.seg .thumb',A.top.el);thumb.style.transform=`translateX(${n===2?0:100}%)`;setTimeout(()=>A.refresh(),260)},
  rmP:(A,[i])=>{A.store.draft.slots.splice(+i,1);A.refresh()},
  addP:A=>{const d=A.store.draft,free=A.store.friends.filter(f=>!d.slots.includes(f.id));
    A.sheet(`<div class="pick-grid">${free.map(f=>`<button class="pick" data-act="addPick:${f.id}">${A.av(f.id)}<span>${f.name}</span></button>`).join('')||'<div class="empty" style="padding:20px 0">球友都已加入</div>'}</div>
      <div class="add-row"><input class="inp" id="nf" placeholder="或输入名字，新建球友" maxlength="8"><button class="btn pri" data-act="addFriend:draft">添加</button></div>
      <button class="act cancel" data-act="closeOvl">取消</button>`,{title:'添加球员',sub:`从球友中选择，或新建一位 · 还差 ${d.mode-d.slots.length} 位`})},
  addPick:(A,[id])=>{const d=A.store.draft;if(d.slots.length<d.mode)d.slots.push(id);A.refresh();
    if(d.slots.length<d.mode)ACTS.addP(A);else A.closeOvl()},
  addFriend:(A,[to])=>{const inp=$('#nf',A.host);const name=(inp&&inp.value.trim())||'';if(!name){A.toast('请输入名字','info');return}
    const id='u'+(Date.now()%1e6);A.store.friends.push({id,name,color:A.store.friends.length%COLORS.length});
    if(to==='draft'){ACTS.addPick(A,[id])}else{A.refresh()}A.toast('已添加')},
  sw:(A,[k],el)=>{A.store.settings[k]=!A.store.settings[k];el.classList.toggle('on',A.store.settings[k])},
  step:(A,[t,k,dv])=>{const R=t==='draft'?A.store.draft.rules:A.store.defaultRules;R[k].v=Math.max(1,Math.min(30,R[k].v+ +dv));A.refresh()},
  pay:(A,[t,k,v],el)=>{const R=t==='draft'?A.store.draft.rules:A.store.defaultRules;R[k].pay=v;const seg=el.parentElement,btns=$$('button',seg),idx=btns.indexOf(el);
    $('.thumb',seg).style.transform=`translateX(${idx*100}%)`;btns.forEach(b=>b.classList.toggle('on',b===el));},
  resetRules:(A,[t])=>{const R=DEFAULT_RULES();if(t==='draft')A.store.draft.rules=R;else A.store.defaultRules=R;A.refresh();A.toast('已恢复默认')},
  start:A=>{const lack=A.store.draft.mode-A.store.draft.slots.length;if(lack>0){ACTS.addP(A);return}
    const go=()=>{const d=A.store.draft;
      A.store.live={id:'live',mode:d.mode,players:[...d.slots],order0:d.slots.map((_,i)=>i),rules:clone(d.rules),events:[],start:Date.now(),status:'live'};
      A.reset('score',{},'home');A.top.el.classList.add('fade')};
    if(A.store.live&&!A.store.live.events.length)A.store.live=null;
    if(A.store.live)A.modal({title:'结束当前对局？',text:'你有一场进行中的对局，开始新对局会把它结束并保存到战绩。',ok:'结束并开始',onOk:()=>{A.finishLive();go()}});else go()},
  sc:(A,[pi,k],el,e)=>{A.closeOvl(true);const v=A.top.view;v&&v.score(+pi,k,el,e)},
  undo:A=>{const v=A.top.view;v&&v.undo()},
  finish:A=>A.modal({title:'结束本场对局？',text:'结束后将生成战报并保存到战绩，可随时在战绩中查看。',ok:'结束对局',onOk:()=>{const m=A.finishLive();if(m)A.redirect('result',{id:m.id});else{A.tab('home');A.toast('本局未记分，未保存','info')}}}),
  row:(A,[i])=>{const m=A.store.live,s=derive(m).steps[+i];
    A.sheet(`<button class="act" data-act="editRow:${i}">${ic('edit',18)}修改这条记录</button><button class="act danger" data-act="delRow:${i}">${ic('trash',18)}删除这条记录</button><button class="act cancel" data-act="closeOvl">取消</button>`,
      {title:`第 ${s.round} 局 · ${A.f(m.players[s.p]).name} ${EV[s.ev].name}`,sub:'修改或删除后，比分、顺序和后续记录会自动重算'})},
  delRow:(A,[i])=>{A.store.live.events.splice(+i,1);A.closeOvl();A.refresh();A.toast('已删除，已重算')},
  editRow:(A,[i])=>{const m=A.store.live,e=m.events[+i];A._edit={i:+i,p:e.p,ev:e.ev};ACTS.editSheet(A)},
  editSheet:A=>{const m=A.store.live,E=A._edit;
    A.sheet(`<div class="pl-pick">${m.players.map((id,j)=>`<button class="${j===E.p?'sel':''}" style="${A.pvars(id)}" data-act="editP:${j}">${A.av(id)}${A.f(id).name}</button>`).join('')}</div>
      <div class="ev-grid" style="grid-template-columns:repeat(5,1fr)">${ALL.map(k=>`<button class="chip ${k===E.ev?'sel':''}" style="${evVars(k)}" data-act="editE:${k}"><span class="cl">${evIcon(k,13)}${EV[k].name}</span><b class="cv">${k==='foul'?'−':'+'}${m.rules[k].v}</b></button>`).join('')}</div>
      <button class="btn pri" style="width:100%" data-act="editOk">保存修改</button><button class="act cancel" data-act="closeOvl">取消</button>`,{title:'修改记录',sub:'选择球员和事件'})},
  editP:(A,[j])=>{A._edit.p=+j;$$('.pl-pick button',A.ovl).forEach((b,k)=>b.classList.toggle('sel',k===+j))},
  editE:(A,[k])=>{A._edit.ev=k;$$('.ev-grid .chip',A.ovl).forEach(b=>b.classList.toggle('sel',b.dataset.act==='editE:'+k))},
  editOk:A=>{const E=A._edit,e=A.store.live.events[E.i];e.p=E.p;e.ev=E.ev;A.closeOvl();A.refresh();A.toast('已修改，已重算')},
  poster:(A,[id])=>{const m=A.store.history.find(x=>x.id===id),D=derive(m),rank=m.players.map((pid,i)=>({pid,s:D.scores[i]})).sort((a,b)=>b.s-a.s),W=rank[0];
    A.layer(`<div class="mask" data-act="closeOvl"></div><div class="poster"><div class="pst"><div class="pst-top" style="${A.pvars(W.pid)}">
      <i style="width:140px;height:140px;right:-40px;top:-50px;background:#FFC53D"></i><i style="width:70px;height:70px;right:70px;top:70px;background:#3D7BFF;opacity:.85"></i><i style="width:40px;height:40px;right:24px;top:96px;background:#1FC98E"></i>
      <small>CUE 追分 · ${m.mode===2?'双人':'三人'}追分战报 · ${dayLabel(m.start)}</small><b>${A.f(W.pid).name} 赢下本场</b><div class="big">${signed(W.s)}</div></div>
      <div class="pst-b">${rank.map(r=>`<div class="pst-r">${A.av(r.pid)}${A.f(r.pid).name}<span class="${r.s>0?'pos':r.s<0?'neg':''}">${signed(r.s)}</span></div>`).join('')}
      <div class="pst-f"><span class="qr"></span><span>${D.round-1} 局 · ${dur(m.end-m.start)}<br>长按识别小程序码，一起来追分</span></div></div></div>
      <div class="pst-btns"><button class="btn sec2" data-act="closeOvl">关闭</button><button class="btn pri" data-act="savePoster">${ic('download',18)}保存到相册</button></div></div>`)},
  savePoster:A=>{A.closeOvl();setTimeout(()=>A.toast('已保存到相册'),200)},
  again:(A,[id])=>{const m=A.store.history.find(x=>x.id===id),D=derive(m);A.draftFrom(m.mode,m.players,D.order,m.rules);A.open('setup')},
  match:(A,[id])=>A.open('result',{id,detail:1}),
  h2h:(A,[id])=>A.open('h2h',{fid:id}),
  seg:(A,[k])=>{A.store.statSeg=k;A.refresh()},
  theme:(A,[t])=>{A.setTheme(t);const seg=$('.seg',A.top.el);if(seg){$('.thumb',seg).style.transform=`translateX(${t==='dark'?100:0}%)`;$$('button',seg).forEach((b,i)=>b.classList.toggle('on',(i===1)===(t==='dark')))}}
};

global.Cue={App,makeStore,derive,DEFAULT_RULES,EV,PAGES,ACTS};
})(window);
