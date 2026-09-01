window.GZD={version:'2.0-final',Utils:{escapeHtml(t){const d=document.createElement('div');d.textContent=t;return d.innerHTML;},formatDate(ts){const d=new Date(ts);return d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');},clamp(v,a,b){return Math.max(a,Math.min(b,v));}},
Storage:{get(k,d){try{const r=localStorage.getItem(k);return r?JSON.parse(r):d;}catch(e){return d;}},set(k,v){localStorage.setItem(k,JSON.stringify(v));},getTheme(){const r=this.get('theme',null);return r&&r.value?r.value:'dark';},setTheme(t){this.set('theme',{value:t});},getProfile(){try{const r=localStorage.getItem('activeProfile');return r||'linxiwu';}catch(e){return'linxiwu';}},setProfile(id){localStorage.setItem('activeProfile',id);},getQuests(){return this.get('gzd_quests',{});},setQuests(q){this.set('gzd_quests',q);},updateQuestStatus(qid,status){const q=this.getQuests();q[qid]={status,updatedAt:Date.now()};this.setQuests(q);},getNewsRead(){return this.get('gzd_newsRead',[]);},markNewsRead(nid){const r=this.getNewsRead();if(!r.includes(nid)){r.push(nid);this.set('gzd_newsRead',r);}},getCollection(){return this.get('gzd_collection',{keywords:[]});},unlockKeyword(w){const c=this.getCollection();if(!c.keywords.includes(w)){c.keywords.push(w);this.set('gzd_collection',c);}},isKeywordUnlocked(w){return this.getCollection().keywords.includes(w);},getSettings(){return this.get('gzd_settings',{theme:'dark',textSpeed:30,bgmVolume:0.3,sfxVolume:0.5,autoPlay:false});},saveSettings(s){this.set('gzd_settings',{...this.getSettings(),...s});}},
ThemeManager:{init(){const t=GZD.Storage.getTheme();this.apply(t,false);},apply(t,save){const h=document.documentElement;h.setAttribute('data-theme',t);if(save)GZD.Storage.setTheme(t);this.updateBtn();},toggle(){const isLight=document.documentElement.getAttribute('data-theme')==='light';this.apply(isLight?'dark':'light',true);},updateBtn(){const b=document.getElementById('themeBtn'),i=document.getElementById('themeIcon'),l=document.getElementById('themeLabel'),isLight=document.documentElement.getAttribute('data-theme')==='light';if(b)b.innerHTML='<span id="themeIcon">'+(isLight?'🌙':'☀️')+'</span> <span id="themeLabel">'+(isLight?'夜间':'日间')+'</span>';}},
ProfileManager:{init(){const id=GZD.Storage.getProfile();this.apply(id,false);},apply(id,save){document.body.setAttribute('data-profile',id);document.querySelectorAll('.profile-toggle button').forEach(b=>b.classList.toggle('active',b.dataset.profile===id));document.querySelectorAll('.content-block').forEach(blk=>blk.classList.toggle('active',blk.id==='content-'+id));if(save)GZD.Storage.setProfile(id);window.dispatchEvent(new CustomEvent('profilechange',{detail:{profile:id}}));},switch(id){this.apply(id,true);}},
Sidebar:{open:false,toggle(){this.open=!this.open;const p=document.getElementById('sidebarPanel'),o=document.getElementById('sidebarOverlay');if(p)p.classList.toggle('open',this.open);if(o)o.classList.toggle('show',this.open);document.body.classList.toggle('no-scroll',this.open);},close(){if(this.open){this.open=false;const p=document.getElementById('sidebarPanel'),o=document.getElementById('sidebarOverlay');if(p)p.classList.remove('open');if(o)o.classList.remove('show');document.body.classList.remove('no-scroll');}},setActive(page){document.querySelectorAll('.sidebar-panel .nav-item').forEach(item=>{const h=item.getAttribute('href')||'';item.classList.toggle('active',h.includes(page));});}},
init(){this.ThemeManager.init();this.ProfileManager.init();this.ThemeManager.updateBtn();}};
GZD.init();
	/* ===== BGM：壳内真无缝 / 单页接续播放 ===== */
	GZD.BGM_LIST=[{name:'浮生若梦',src:'./歌曲/口哨.mp3'},{name:'忘川引',src:'./歌曲/单独个体.mp3'}];
	(function(){
	  var isShellDoc=!!window.__GZD_SHELL__;
	  var inShell=false;
	  try{inShell=isShellDoc||(window.parent!==window&&window.parent.GZD&&window.parent.GZD.Shell);}catch(e){}
	  var pageTrack=document.body?document.body.getAttribute('data-bgm'):null;
	  if(isShellDoc)return; // 壳文档自己不装（内联脚本里有专属播放器）
	  if(inShell){
	    /* —— 在壳里的内页 —— */
	    // 本页指定了曲目（<body data-bgm="1">）→ 通知壳淡入切换
	    if(pageTrack!==null&&pageTrack!==''){try{window.parent.GZD.Shell.requestTrack(parseInt(pageTrack,10)||0);}catch(e){}}
	    // 隐藏内页自己的音乐按钮（壳左下已有，避免双按钮）
	    var ib=document.getElementById('bgmBtn');if(ib)ib.style.display='none';
	    // ★ 无缝的实现点：拦截站内链接 → 交给壳换 iframe，音乐所在的外壳不动
	    document.addEventListener('click',function(e){
	      var a=e.target.closest?e.target.closest('a'):null;
	      if(!a)return;
	      var href=a.getAttribute('href')||'';
	      if(!href||href.charAt(0)==='#'||/^(https?:|mailto:|tel:)/i.test(href))return; // 锚点/外链不拦
          if(a.target&&a.target!=='_self')return; // 带 target 的链接不拦截，让浏览器原生跳转
	      e.preventDefault();
	      try{window.parent.GZD.Shell.load(href);}catch(err){}
	    },true);
	    return;
	  }
	  /* —— 单独打开（未经壳）→ 接续播放：同曲同进度，首次触摸响起 —— */
	  var LIST=GZD.BGM_LIST,VOL=GZD.Storage.getSettings().bgmVolume||0.35,KEY='gzd_bgm';
	  var st={on:true,index:0,times:{}};
	  try{var s=JSON.parse(localStorage.getItem(KEY)||'null');
	    if(s){st.on=s.on!==false;st.index=s.index||0;st.times=s.times||{};}}catch(e){}
	  if(pageTrack!==null&&pageTrack!==''){st.index=((parseInt(pageTrack,10)||0)%LIST.length+LIST.length)%LIST.length;}
	  var a=new Audio();a.loop=true;a.volume=VOL;a.preload='auto';a.src=LIST[st.index].src;
	  var bound=false;
	  function save(){try{st.times[st.index]=a.currentTime;localStorage.setItem(KEY,JSON.stringify(st));}catch(e){}}
	  function play(){var p=a.play();if(p&&p.catch)p.catch(function(){
	    if(bound)return;bound=true;
	    var go=function(){a.play().catch(function(){});};
	    document.addEventListener('touchstart',go,{once:true,passive:true});
	    document.addEventListener('click',go,{once:true});});}
	  a.addEventListener('loadedmetadata',function(){var t=st.times[st.index]||0;
	    if(t>0&&t<(a.duration||1e9)-2){try{a.currentTime=t;}catch(e){}}},{once:true});
	  if(st.on)play();
	  setInterval(save,5000);window.addEventListener('pagehide',save);
	  var btn=document.getElementById('bgmBtn');
	  if(btn){btn.textContent=st.on?('🎵 '+LIST[st.index].name):'🔇 音乐';
	    btn.addEventListener('click',function(){st.on=!st.on;if(st.on)play();else a.pause();save();
	      btn.textContent=st.on?('🎵 '+LIST[st.index].name):'🔇 音乐';});}
	})();
