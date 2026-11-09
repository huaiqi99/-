'use strict';
/* ============================================================
   千律州 · 全站音效底座 https://sfile.chatglm.cn/workspace/file/ac/acb54ec006.js v1.3（2026-11-09 定案）
   ============================================================
   架构（罗修.html 同源验证 + 当日连点实测）：
   ① 桌面端出声走 Web Audio；iOS 走「WAV blob + audio 池」
      → v1.2 实测：iOS 的 Web Audio 会被静音拨片压住，
        手势触发的 HTMLAudio（老背包页方案）拨片管不到
   ② 每次播放新建 BufferSource → 声音天然重叠
      → 连点无阻碍，无需音频池（iOS 池深 4，同样无吞声）
   ③ 七音进页面即离线预渲染成 AudioBuffer（零网络、零等待感）
   ④ 主链挂限幅器 → 无论怎么叠都不爆音
   ⑤ iOS 解锁三件套（罗修.html 原样）：
      无声循环 audio + 首次触摸 resume + 切回前台自动重播

   接入（每页两步）：
   1. 页底加一行：<script src="https://sfile.chatglm.cn/workspace/file/ac/acb54ec006.js"></script>
   2a. 静态元素加属性即自动绑定（按下即响，触屏零延迟）：
       <button data-sfx="叮">…</button>
       也可写拼音：data-sfx="ding"
   2b. 动态时机一行调用：
       SFX.play('ding')   // 例：AI回复完时 SFX.play('叮')
   动态插入的元素（AI生成列表等）：插入后调一次 SFX.scan()

   七音表（2026-11 试听台三轮定档，参数勿动）：
     叮 ding    AI回复提示
     铮 zheng   物品点击
     哒 da      分类点击（= 嗒 cui，同配方别名）
     啪 pa      菜单按钮
     咔嚓 kacha 菜单按钮
     刷 shua    日夜切换
     啵 bo      发送消息

   已知边界（已定案，勿"修"）：
   · 非手势的异步音（如AI回复的叮）在 iOS 拨片静音时仍可能被
     系统拦——语义可接受：静音=不想被打扰
   · 延迟参数一律毫秒 ÷1000 再排时间轴（历史bug：忘除导致层
     排到几十秒后，听感像吞声——查音效问题先看这里）
   · 啵的 700→1300Hz 上滑是音色本体（气泡弹出感），不是可省参数
   ============================================================ */
(function(){
 var LS_KEY='gzd_sfx_mute';
 var SFX=window.SFX={version:'1.3',muted:false};
 var AC=null,MG=null,BUF={};

 /* ---------- 合成基元（离线/在线 ctx 通用）---------- */
 function obBand(ac,mg,f,q,dur,vol,dl){
  var n=Math.max(1,Math.floor(ac.sampleRate*(dur+30)/1000));
  var b=ac.createBuffer(1,n,ac.sampleRate),d=b.getChannelData(0),i;
  for(i=0;i<n;i++)d[i]=Math.random()*2-1;
  var s=ac.createBufferSource();s.buffer=b;
  var fl=ac.createBiquadFilter();fl.type='bandpass';fl.frequency.value=f;fl.Q.value=q;
  var g=ac.createGain(),t=ac.currentTime+(dl||0)/1000;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.001);
  g.gain.exponentialRampToValueAtTime(.0001,t+dur/1000);
  s.connect(fl);fl.connect(g);g.connect(mg);s.start(t);s.stop(t+dur/1000+.06);
 }
 function obThump(ac,mg,f0,f1,dur,vol,dl){
  var o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime+(dl||0)/1000;
  o.type='sine';
  o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur/1000);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur/1000);
  o.connect(g);g.connect(mg);o.start(t);o.stop(t+dur/1000+.05);
 }
 function obSine(ac,mg,f,dur,vol,dl,f1){
  var o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime+(dl||0)/1000;
  o.type='sine';o.frequency.setValueAtTime(f,t);
  if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dur/1000);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.002);
  g.gain.exponentialRampToValueAtTime(.0001,t+dur/1000);
  o.connect(g);g.connect(mg);o.start(t);o.stop(t+dur/1000+.05);
 }
 function obSweep(ac,mg,f0,f1,dur,vol){
  var n=Math.max(1,Math.floor(ac.sampleRate*(dur+30)/1000));
  var b=ac.createBuffer(1,n,ac.sampleRate),d=b.getChannelData(0),i;
  for(i=0;i<n;i++)d[i]=Math.random()*2-1;
  var s=ac.createBufferSource();s.buffer=b;
  var fl=ac.createBiquadFilter();fl.type='bandpass';fl.Q.value=2;
  var g=ac.createGain(),t=ac.currentTime;
  fl.frequency.setValueAtTime(f0,t);fl.frequency.exponentialRampToValueAtTime(f1,t+dur/1000);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.004);
  g.gain.exponentialRampToValueAtTime(.0001,t+dur/1000);
  s.connect(fl);fl.connect(g);g.connect(mg);s.start(t);s.stop(t+dur/1000+.06);
 }

 /* ---------- 七音配方（定档参数，勿动）---------- */
 var RECIPES={
  ding:function(ac,mg){obSine(ac,mg,1567,300,.24);obSine(ac,mg,3135,220,.09);},
  zheng:function(ac,mg){obBand(ac,mg,5200,2,4,.22);obSine(ac,mg,2093,240,.4,4);obSine(ac,mg,2637,200,.26,4);},
  da:function(ac,mg){obBand(ac,mg,6800,3,4,.5);obSine(ac,mg,4186,90,.12,2);},
  pa:function(ac,mg){obBand(ac,mg,2400,.8,22,.5);obBand(ac,mg,5600,1.2,6,.3);obThump(ac,mg,180,140,30,.1);},
  kacha:function(ac,mg){obBand(ac,mg,4200,2.5,5,.45);obBand(ac,mg,2000,1.5,9,.28,28);obBand(ac,mg,4400,2.5,6,.4,28);},
  shua:function(ac,mg){obSweep(ac,mg,800,5200,85,.42);obBand(ac,mg,5400,2,7,.2,82);},
  bo:function(ac,mg){obSine(ac,mg,700,42,.3,0,1300);obBand(ac,mg,4200,1.5,4,.15);}
 };
 var DUR={ding:380,zheng:340,da:150,pa:120,kacha:130,shua:200,bo:140};
 var ALIAS={'叮':'ding','铮':'zheng','哒':'da','嗒':'da','cui':'da','啪':'pa','咔嚓':'kacha','刷':'shua','啵':'bo'};
 function norm(n){
  n=(n||'').replace(/^\s+|\s+$/g,'').toLowerCase();
  return RECIPES[n]?n:(ALIAS[n]||null);
 }

 /* ---------- 主 ctx（含限幅器）---------- */
 function ctx(){
  if(!AC){
   AC=new (window.AudioContext||window.webkitAudioContext)();
   var cmp=AC.createDynamicsCompressor();
   cmp.threshold.value=-8;cmp.knee.value=4;cmp.ratio.value=4;
   cmp.attack.value=.001;cmp.release.value=.08;
   MG=AC.createGain();MG.gain.value=SFX.muted?0:3.5;
   MG.connect(cmp);cmp.connect(AC.destination);
  }
  if(AC.state==='suspended')AC.resume();
  return AC;
 }

 /* ---------- 离线预渲染 ---------- */
 function render(name){
  return new Promise(function(res){
   var sr=44100,n=Math.ceil(sr*DUR[name]/1000),OC=null;
   try{OC=new (window.OfflineAudioContext||window.webkitOfflineAudioContext)(1,n,sr);}
   catch(e){return res();}
   try{
    RECIPES[name](OC,OC.destination);
    var p=OC.startRendering();
    if(p&&p.then){p.then(function(ab){BUF[name]=ab;wavReady(name);res();},function(){res();});}
    else{OC.oncomplete=function(e){BUF[name]=e.renderedBuffer;wavReady(name);res();};}
   }catch(e){res();}
  });
 }

 /* ---------- iOS 解锁三件套（罗修.html 原样）---------- */
 var IS_IOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||
  (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 var unlockA=null;
 function silentWavURL(){
  var sr=22050,n=sr*.02|0,buf=new ArrayBuffer(44+n*2),v=new DataView(buf),i;
  var W=function(o,s){for(i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  W(0,'RIFF');v.setUint32(4,36+n*2,true);W(8,'WAVEfmt ');
  v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
  v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);
  v.setUint16(34,16,true);W(36,'data');v.setUint32(40,n*2,true);
  return URL.createObjectURL(new Blob([buf],{type:'audio/wav'}));
 }
 function unlock(){
  if(!IS_IOS||unlockA)return;
  try{
   unlockA=new Audio(silentWavURL());
   unlockA.loop=true;unlockA.volume=0;
   var p=unlockA.play();
   if(p&&p.catch)p.catch(function(){});
  }catch(e){}
 }
 function firstTouch(){ctx();unlock();}
 document.addEventListener('touchstart',firstTouch,{once:true,passive:true});
 document.addEventListener('pointerdown',firstTouch,{once:true});
 document.addEventListener('visibilitychange',function(){
  if(!document.hidden&&IS_IOS&&unlockA&&unlockA.paused){
   var p=unlockA.play();if(p&&p.catch)p.catch(function(){});
  }
 });

 /* ---------- v1.3 iOS 拨片绕过：WAV blob + audio 池 ----------
    老背包页实测方案：手势触发的 HTMLAudio 播离线 WAV，
    静音拨片管不到。池深 4 → 连点重叠不吞声。
    手机端觉得过响/过轻只动 POOL_VOL 一个数 */
 var POOL_VOL=0.75,POOL_DEEP=4;
 var POOL={},POOL_IDX={};
 function bufToWavURL(ab){
  var sr=ab.sampleRate,d=ab.getChannelData(0),n=d.length;
  var m=n*2,buf=new ArrayBuffer(44+m),v=new DataView(buf),i;
  var W=function(o,s){for(i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  W(0,'RIFF');v.setUint32(4,36+m,true);W(8,'WAVEfmt ');
  v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
  v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);
  v.setUint16(34,16,true);W(36,'data');v.setUint32(40,m,true);
  for(i=0;i<n;i++){var s=Math.max(-1,Math.min(1,d[i]));
   v.setInt16(44+i*2,s<0?s*32768:s*32767,true);}
  return URL.createObjectURL(new Blob([buf],{type:'audio/wav'}));
 }
 function wavReady(name){
  if(!IS_IOS||!BUF[name]||POOL[name])return;
  try{
   var url=bufToWavURL(BUF[name]),arr=[],k;
   for(k=0;k<POOL_DEEP;k++){
    var a=new Audio(url);a.preload='auto';a.volume=POOL_VOL;
    arr.push(a);
   }
   POOL[name]=arr;POOL_IDX[name]=0;
  }catch(e){}
 }
 function poolPlay(n){
  var arr=POOL[n];if(!arr)return false;
  var a=arr[POOL_IDX[n]=(POOL_IDX[n]+1)%arr.length];
  try{a.currentTime=0;}catch(e){}
  var p=a.play();
  if(p&&p.catch)p.catch(function(){});
  return true;
 }

 /* ---------- 播放 ---------- */
 /* 响度补偿：以「铮」为基准，把各音拉到听感一致
    （哒/啪原始能量仅为铮的1/3~1/5 且高频短音人耳吃亏，v1.2 补齐） */
 var LOUD={ding:1.4,zheng:1,da:3.2,pa:3,kacha:2.6,shua:2.2,bo:1.8};
 function play(name){
  var n=norm(name);
  if(!n||SFX.muted)return;
  try{
   /* iOS：优先 audio 池（绕拨片），池未就绪退回 Web Audio */
   if(IS_IOS&&poolPlay(n))return;
   var ac=ctx(),buf=BUF[n];
   var g=ac.createGain();g.gain.value=LOUD[n]||1;g.connect(MG);
   if(buf){
    var s=ac.createBufferSource();
    s.buffer=buf;s.connect(g);s.start(0);
   }else{
    RECIPES[n](ac,g);   /* 离线渲染不可用的退路：主ctx直接合成 */
   }
  }catch(e){}
 }

 /* ---------- 静音总闸 ---------- */
 try{SFX.muted=localStorage.getItem(LS_KEY)==='1';}catch(e){}
 SFX.toggleMute=function(){
  SFX.muted=!SFX.muted;
  if(MG)MG.gain.value=SFX.muted?0:3.5;
  try{localStorage.setItem(LS_KEY,SFX.muted?'1':'0');}catch(e){}
  return SFX.muted;
 };
 SFX.play=play;

 /* ---------- data-sfx 自动绑定：按下即响 ---------- */
 var CSS='[data-sfx]{touch-action:manipulation;-webkit-tap-highlight-color:transparent;}';
 function scan(){
  var els=document.querySelectorAll('[data-sfx]');
  for(var i=0;i<els.length;i++){
   (function(el){
    if(el.getAttribute('data-sfx-wired'))return;
    el.setAttribute('data-sfx-wired','1');
    var n=el.getAttribute('data-sfx');
    if('PointerEvent' in window){
     el.addEventListener('pointerdown',function(){play(n);});
    }else{
     el.addEventListener('touchstart',function(){play(n);},{passive:true});
     el.addEventListener('click',function(){play(n);});
    }
   })(els[i]);
  }
 }
 SFX.scan=scan;
 (function(){
  try{
   var st=document.createElement('style');st.textContent=CSS;
   (document.head||document.documentElement).appendChild(st);
  }catch(e){}
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',scan);}
  else{scan();}
 })();

 /* ---------- 启动：七音预渲染 ---------- */
 var NAMES=['ding','zheng','da','pa','kacha','shua','bo'];
 for(var k=0;k<NAMES.length;k++)render(NAMES[k]);
})();
