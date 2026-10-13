// ===== 模拟AI.js · 千律州模拟器 v6（原版界面 × 引渡人同构引擎） =====
// 功能层照引渡人 v5 骨架：按章分仓存档 / opening声明进档 / 建议双层解析+裸数组抢救 /
// 转场=AI总结旧章+下一章包开场白 / 全量重绘。千律州数据层=章包JSON+必经节点+好感记账。
// 界面层 = 原版（CH.01 章节号左上 + 右上☰菜单 + 左目录侧栏 + act/pcmd卡片 + 入演须知）。
// UI 全部由本文件注入（原版写法），样式变量与尺寸与原版一致。
(function(){
  'use strict';
  console.log('[千律州模拟器] UI原版 × 引渡人引擎 v6.1');
  
  // ═══ 配置区 ═══
  const WORKER_URL = 'https://difu-ai.2629885225.workers.dev';
  const MAX_HISTORY = 10;
  const STORAGE_KEY = 'gzd_qlz_save_v2';
  const OLD_KEY     = 'gzd_qlz_story';
  const CONFIG_KEY  = 'gzd_ai_config';
  const PROFILE     = 'qlz';
  const K_THEME     = 'theme';
  const NOTICE_KEY  = 'gzd_qlz_notice_closed';
  const SUGGEST_INSTRUCTION = '\n\n[系统内部指令,勿在正文提及]回复正文结束后,必须另起一行在末尾输出<建议>["行动1","行动2","行动3"]</建议>:给出3条玩家(怀榆)可采取的下一步行动,每条不超过15字,第二人称祈使句。再另起一行输出<状态>{"nodes":["本轮实际触发的必经节点id"],"fav":当前好感整数}</状态>,nodes没有则填空数组。这两个块是每轮回复的固定格式,任何情况下不允许省略,块之外不得有任何额外说明。';
  const STAGES = [
    {min:0,  max:20,  name:'冷淡警惕'},
    {min:21, max:40,  name:'认识试探'},
    {min:41, max:60,  name:'熟悉信任'},
    {min:61, max:80,  name:'亲近在意'},
    {min:81, max:100, name:'深厚感情'}
  ];
  function stageOf(f){ for(let i=STAGES.length-1;i>=0;i--){ if(f>=STAGES[i].min) return STAGES[i]; } return STAGES[0]; }
  const CN_NUM=['零','一','二','三','四','五','六','七','八','九','十'];
  function cnCh(n){ return n<=10 ? CN_NUM[n] : String(n); }
  function pad2(n){ return (n<10?'0':'')+n; }
  const DECLARATION = [
  '【千律州系统 · 演出声明】',
  '本模拟基于原著《业焰之国》第一章至第四章剧情架构搭建。你将扮演怀榆，由系统（我）与千律州世界共同为你演出。',
  '演出方式：在下方输入框呈报你的行动或对话，由系统生成长段演出。每轮附「走位参考」，仅为建议，可自行呈报任意行动。',
  '好感度：初始 10，分五阶段演进，影响角色态度与剧情分支。右上角菜单可随时校准。',
  '剧情轨道：每章设必经节点与轮数上限，过程自由，主线节点会自然发生。存档自动进行，菜单可随时删档重来。',
  '——确认了解后，在下方输入「开始游戏」，第一章《嗅骸与重启》即刻开演。'
  ].join('\n');
  
  const PROVIDER_CONFIG = {
    deepseek: { baseUrl:'https://api.deepseek.com',   defaultModel:'deepseek-chat', format:'openai' },
    openai:   { baseUrl:'https://api.openai.com',     defaultModel:'gpt-4o-mini',   format:'openai' },
    claude:   { baseUrl:'https://api.anthropic.com',  defaultModel:'claude-3-5-sonnet-20241022', format:'claude' },
    custom:   { baseUrl:'',                           defaultModel:'',              format:'openai' }
  };
  
  // ═══ 存档读写（引渡人同构：按章分仓） ═══
  function loadProfileData(){
    try{ const d = JSON.parse(localStorage.getItem(STORAGE_KEY)); if(d && d.chapters) return d; }catch(e){}
    return null;
  }
  function saveProfileData(data){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }catch(e){} }
  function loadStory(){
    const data = loadProfileData();
    if(!data) return [];
    const ch = data.chapters[data.currentChapter];
    return ch ? (ch.stories || []) : [];
  }
  function saveStory(arr){
    let data = loadProfileData() || { currentChapter:1, fav:10, chapters:{} };
    if(!data.chapters[data.currentChapter]) data.chapters[data.currentChapter] = { title:'', summary:'', nodesDone:[], stories:[] };
    data.chapters[data.currentChapter].stories = arr;
    saveProfileData(data);
  }
  function getCurrentChapter(){ const d=loadProfileData(); return d?d.currentChapter:1; }
  function getFav(){ const d=loadProfileData(); return d?((typeof d.fav==='number')?d.fav:10):10; }
  function setFav(n){ const d=loadProfileData(); if(!d)return; d.fav=Math.max(0,Math.min(100,n|0)); saveProfileData(d); renderSeal(); }
  function getChapterData(n){ const d=loadProfileData(); return (d&&d.chapters)?(d.chapters[n]||null):null; }
  function getChapterTitle(n){ const ch=getChapterData(n); return ch?(ch.title||''):''; }
  function getNodesDone(){ const ch=getChapterData(getCurrentChapter()); return (ch&&ch.nodesDone)||[]; }
  function setNodesDone(arr){ const d=loadProfileData(); if(!d)return; const ch=d.chapters[d.currentChapter]; if(ch){ ch.nodesDone=arr; saveProfileData(d); } }
  function getCurrentRounds(){
    const ch = getChapterData(getCurrentChapter());
    if(!ch) return 0;
    return (ch.stories||[]).filter(x => x.type==='user').length;
  }
  function getPrevSummaries(){
    const d = loadProfileData(); if(!d) return '';
    const out=[];
    for(let i=1;i<d.currentChapter;i++){
      const c=d.chapters[i];
      if(c&&c.summary) out.push('第'+cnCh(i)+'章「'+(c.title||'')+'」:'+c.summary);
    }
    return out.join('\n');
  }
  function loadAIConfig(){ try{ return JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}'); }catch(e){ return {}; } }
  function hasUserKey(){ const c=loadAIConfig(); return !!(c.apiKey&&c.provider); }
  
  // ═══ 章包加载 ═══
  const packCache = {};
  let pack = null;
  async function loadPack(n){
    if(packCache[n]) return packCache[n];
    const nn = pad2(n);
    const resp = await fetch('./chapters/ch'+nn+'.json');
    if(!resp.ok) throw new Error('章包 ch'+nn+'.json 加载失败('+resp.status+')');
    const p = await resp.json();
    packCache[n] = p;
    return p;
  }
  
  // ═══ 系统提示词（引渡人骨架 + 千律州内容） ═══
  function buildSystemPrompt(pk){
    const prev = getPrevSummaries();
    const fav = getFav();
    const st = stageOf(fav).name;
    const done = getNodesDone();
    const rounds = getCurrentRounds();
    const known = (pk.knownInfo||[]).map(k => '· '+k).join('\n');
    const lore = window.QLZ_LORE || {};
    const loreTxt = [
      lore.STYLE===undefined?'':(lore.STYLE?('\n\n【世界书·文风】\n'+lore.STYLE):''),
      (lore.WORLD?'\n\n【世界书·世界观硬设定】\n'+lore.WORLD:''),
      (lore.CARDS?'\n\n【世界书·人物卡（严格执行，任何偏离即OOC事故）】\n'+lore.CARDS:''),
      (lore.SECRETS?'\n\n【封锁红线·以下信息在剧情未揭晓前绝不可确认/暗示/说漏，玩家追问一律“不知道/权限不足”】\n'+lore.SECRETS:'')
    ].join('');
    return '你是「千律州模拟器」的剧情演绎引擎。玩家扮演怀榆，你是包裹着他的“系统”与世界本身。\n'
  +'【演出格式】\n'
  +'文风：网文长段流——叙述段落为主，对白用引号嵌在段落内，段落之间空行。严禁剧本分行、严禁角色名前置标签、严禁列表化正文。\n'
  +'场景切换或氛围转折时，可单独输出一行括号提示，如：（门后静了两拍。然后是低低的一声笑。）\n'
  +'第二人称“你”指代怀榆。系统“我”偶尔冷面吐槽，语气四平八稳带嫌弃。\n'
  +'信息封锁：导演指令中“不知道/不可提及”的内容，无论玩家怎么问，一律不给，可由系统以“权限不足”类话术封口。\n'
  +'每轮回复固定格式：正文长段 + （括号场景提示，可选）+ <建议>块 + <状态>块（见每轮消息末尾的内部指令）。除这些外正文之后不得输出任何解释。\n\n'
  +'【好感度系统】\n'
  +'当前好感 '+fav+'（阶段：'+st+'，对话态度参考此阶段）。初始 10。根据玩家表现，在<状态>的 fav 中回传合理好感值(0-100)。\n'
  +'阶段：0-20 冷淡警惕 │ 21-40 认识试探 │ 41-60 熟悉信任 │ 61-80 亲近在意 │ 81-100 深厚感情。好感演进须有剧情依据，禁止无故跳变。\n\n'
  +'【本章导演指令 · 第'+pk.id+'章「'+pk.title+'」】\n'
  +'本章目标：'+pk.goal+'\n'
  +'必经节点（剧情轨道，必须自然发生，严禁跳过或提前揭穿）：\n'
  +pk.mustNodes.map(n => '· ['+n.id+'] '+n.desc+'（'+n.hint+'）'+(done.indexOf(n.id)>=0?'【已发生】':'')).join('\n')+'\n'
  +'本章已进行 '+rounds+' 轮。玩家过程自由，但未完成的必经节点要在后续自然引导发生；玩家跑偏时以最自然的方式拉回，严禁出戏。\n\n'
  +'【玩家已知信息（严格封锁未列出的信息）】\n'+known+'\n'
  +(prev?('\n【前情摘要（之前章节，既定事实）】\n'+prev+'\n'):'')
  +'【衔接铁律】\n'
  +'上文【演出】里已播出的开场与剧情是既成事实。你的每轮演出必须从最近一次演出的结尾自然衔接（人物状态、地点、时间延续），严禁重播开场白、严禁另起炉灶、严禁无视玩家刚呈报的行动。'
  +loreTxt;
  }
  
  // ═══ AI 调用（引渡人双路同款） ═══
  let lastSuggestions = [];
  let prevSugg = [];
  async function callAI(message, pk, history){
    const rounds = history.filter(m => m.role==='user').length;
    const maxRounds = pk.maxRounds || 12;
    let extra = '';
    const done = getNodesDone();
    const leftIds = pk.mustNodes.filter(n => done.indexOf(n.id)<0);
    if(leftIds.length && rounds >= maxRounds-3){
      extra = '\n\n[系统强制指令]本章轮数即将用尽,而必经节点【'+leftIds[0].desc+'】尚未发生。请在本轮演出中以最自然的方式将该节点事件带入剧情(系统可强制弹出任务/事件),严禁出戏。';
    }
    const msg = message + SUGGEST_INSTRUCTION + extra;
    const cfg = loadAIConfig();
    const reply = (cfg.apiKey && cfg.provider)
      ? await callDirect(msg, pk, history, cfg)
      : await callWorker(msg, history);
    return extractReply(reply, pk);
  }
  function extractReply(reply, pk){
    let nodesHit = [], fav = null;
    try{
      const m = reply.match(/<状态>([\s\S]*?)<\/状态>/);
      if(m){
        reply = reply.replace(m[0],'').trim();
        try{
          const st = JSON.parse(m[1].trim());
          if(st){
            if(Array.isArray(st.nodes)) nodesHit = st.nodes.filter(x=>typeof x==='string');
            if(typeof st.fav==='number') fav = Math.max(0,Math.min(100,st.fav|0));
          }
        }catch(e){}
      }
    }catch(e){}
    lastSuggestions = [];
    try{
      const s2 = reply.match(/<建议>([\s\S]*?)<\/建议>/);
      if(s2){
        reply = reply.replace(s2[0],'').trim();
        try{
          const arr = JSON.parse(s2[1].trim());
          if(Array.isArray(arr)) lastSuggestions = arr.filter(x=>typeof x==='string'&&x.trim()).slice(0,3);
        }catch(e){}
      }
      if(!lastSuggestions.length){
        const tail = reply.slice(-300);
        const m3 = tail.match(/\[\s*"[^"]{1,40}"\s*(,\s*"[^"]{1,40}"\s*){1,2}\]/);
        if(m3){
          try{
            const arr = JSON.parse(m3[0]);
            if(Array.isArray(arr)){
              lastSuggestions = arr.filter(x=>typeof x==='string'&&x.trim()).slice(0,3);
              reply = reply.replace(m3[0],'').trim();
            }
          }catch(e){}
        }
      }
    }catch(e){}
    if(!lastSuggestions.length){
      const done = getNodesDone();
      const pend = pk.mustNodes.filter(n => done.indexOf(n.id)<0)[0];
      if(pend && pk.options && pk.options[pend.id]) lastSuggestions = pk.options[pend.id].slice(0,3);
      else if(prevSugg.length) lastSuggestions = prevSugg.slice(0,3);
    } else {
      prevSugg = lastSuggestions.slice(0,3);
    }
    return { text:reply, nodesHit:nodesHit, fav:fav };
  }
  async function callDirect(message, pk, history, cfg){
    const pConfig = PROVIDER_CONFIG[cfg.provider] || PROVIDER_CONFIG.deepseek;
    const baseUrl = cfg.provider==='custom' ? (cfg.customUrl||'') : pConfig.baseUrl;
    const model = cfg.model || pConfig.defaultModel;
    if(!baseUrl) throw new Error('接口地址为空,请前往设置页填写');
    const systemPrompt = buildSystemPrompt(pk);
    const messages = [
      { role:'system', content:systemPrompt },
      ...history.slice(-MAX_HISTORY),
      { role:'user', content:message }
    ];
    let url, headers, body;
    if(pConfig.format==='claude'){
      url = baseUrl+'/v1/messages';
      headers = { 'Content-Type':'application/json','x-api-key':cfg.apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true' };
      body = JSON.stringify({ model, max_tokens:1500, system:systemPrompt, messages:messages.filter(m=>m.role!=='system') });
    } else {
      url = baseUrl+'/v1/chat/completions';
      headers = { 'Content-Type':'application/json','Authorization':'Bearer '+cfg.apiKey };
      body = JSON.stringify({ model, messages, max_tokens:1500, temperature:0.8 });
    }
    const resp = await fetch(url, { method:'POST', headers, body });
    const data = await resp.json();
    if(!resp.ok){
      const em = (data.error&&data.error.message)||data.error||JSON.stringify(data);
      if(resp.status===401) throw new Error('API Key 无效或已失效');
      if(resp.status===402) throw new Error('余额不足');
      if(resp.status===429) throw new Error('请求过频');
      throw new Error('AI 返回错误('+resp.status+'):'+em);
    }
    const reply = pConfig.format==='claude' ? ((data.content&&data.content[0]&&data.content[0].text)||'') : ((data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content)||'');
    if(!reply) throw new Error('AI 返回了空内容');
    const fr = pConfig.format==='claude' ? (data.stop_reason||'') : ((data.choices&&data.choices[0]&&data.choices[0].finish_reason)||'');
    window.QLZ_LAST_CUT = (fr==='length'||fr==='max_tokens');
    return reply;
  }
  async function callWorker(message, history){
    const resp = await fetch(WORKER_URL, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ message, profile:PROFILE, history:history.slice(-MAX_HISTORY) })
    });
    const data = await resp.json();
    if(data.error) throw new Error(data.error);
    return data.reply || '';
  }
  
  // ═══════════ 界面层（原版：全部由本文件注入，尺寸/样式照 v5 模板） ═══════════
  let root, flow, busy = false;
  function h(tag, cls, html){ const e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; }
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function fmt(text){
    const lines = esc(text).split(/\n+/);
    return lines.map(function(L){
      const t = L.trim();
      if(/^（.+）$/.test(t)) return '<div class="cue">'+t+'</div>';
      if(!t) return '';
      return '<p class="narr">'+t+'</p>';
    }).join('');
  }
  function makeOpts(list){
    const o = h('div','opts','<div class="ot"><b>◇</b> 走位参考 · 仅为建议，可自行呈报</div>');
    list.forEach(function(t){
      const b = h('button','opt', esc(t));
      b.onclick = function(){ const i=document.getElementById('qin'); i.value=t; i.focus(); };
      o.appendChild(b);
    });
    return o;
  }
  function renderAct(item, label, seq){
    const a = h('div','act'); a.dataset.id = item.id||'';
    const mh = h('div','mh');
    const isIntro = item.type==='opening' || item.type==='chapter-start';
    mh.innerHTML = '<span class="mn">'+label+'</span><span class="ops">'+(isIntro?'':'<button class="op">✎ 编辑</button><button class="op hot">↻ 重生成</button>')+'</span>';
    a.appendChild(mh);
    const ab = h('div','abody'); ab.innerHTML = fmt(item.text);
    a.appendChild(ab);
    if(item.sugg && item.sugg.length) a.appendChild(makeOpts(item.sugg));
    if(!isIntro){
      const ops = a.querySelectorAll('.op');
      ops[0].onclick = function(){ editAct(a); };
      ops[1].onclick = function(){ regenerate(a); };
    }
    flow.appendChild(a);
    return a;
  }
  function renderPcmd(item){
    const p = h('div','pcmd'); p.dataset.id = item.id||'';
    p.innerHTML = '<div class="pl"><span>玩家 · 呈报</span><button class="op">✎</button></div><div class="tx">'+esc(item.text)+'</div>';
    p.querySelector('.op').onclick = function(){ editAct(p); };
    flow.appendChild(p);
    return p;
  }
  function renderSys(line){
    flow.appendChild(h('div','sys','<span>'+line+'</span>'));
    scrollEnd();
  }
  function renderMsgItem(item, seq){
    if(item.type==='loading'){
      flow.appendChild(h('div','typing','SYS · 演出生成中 ···')); return;
    }
    if(item.type==='sys'){ renderSys('── '+item.text+' ──'); return; }
    if(item.type==='error'){ renderSys('⚠ '+item.text); return; }
    if(item.type==='chapter-end'){
      renderSys('── '+item.title+' · 完 ──'); renderSys(item.text||'本章完结，前情已记入命册。'); return;
    }
    if(item.type==='chapter-start'){
      renderSys('── '+item.title+' ──');
      renderAct(item, 'ACT '+pad2(getCurrentChapter())+'-1 · 开场', seq);
      return;
    }
    if(item.type==='opening'){
      const c = renderAct(item, 'SYS · 声明', 0); c.classList.add('declare'); return;
    }
    if(item.type==='user'){ renderPcmd(item); return; }
    renderAct(item, 'ACT '+pad2(getCurrentChapter())+'-'+(seq||1)+' · 演出', seq);
  }
  function renderStory(){
    if(!flow) return;
    flow.innerHTML = '';
    const arr = viewingArchive ? (getChapterData(viewingArchive)||{stories:[]}).stories : loadStory();
    let aiSeq = 0;
    arr.forEach(function(item){
      if(item.type==='ai') aiSeq++;
      renderMsgItem(item, aiSeq);
    });
    if(viewingArchive){
      renderSys('你正在回看已完结章节（只读）');
      const back = h('div','backcur','<button class="backbtn">← 返回当前章（进行中）</button>');
      back.querySelector('button').onclick = function(){ viewingArchive=0; renderStory(); };
      flow.appendChild(back);
    }
    scrollEnd();
    renderChap(); renderToc(); renderSeal(); renderRound();
    kickPaint();
  }
  function renderChap(){
    const pack0 = pack || {title:'', novelRef:''};
    document.getElementById('qno').textContent = 'CH.'+pad2(viewingArchive||getCurrentChapter());
    document.getElementById('qtitle').textContent = getChapterTitle(viewingArchive||getCurrentChapter()) || pack0.title || '加载中…';
    document.getElementById('qsub').textContent = 'QIANLVZHOU // '+(pack0.novelRef||'业焰之国')+' · REC';
  }
  function renderRound(){
    const e = document.getElementById('qround');
    if(e && pack) e.textContent = getCurrentRounds() + ' / ' + pack.maxRounds;
  }
  function renderSeal(){
    const fav = getFav(); const st = stageOf(fav);
    const box = document.getElementById('qseal');
    if(!box) return;
    const pct = Math.round(((fav-st.min)/Math.max(1,st.max-st.min))*100);
    const lvs = STAGES.map(function(s,i){
      return '<div class="lv'+(s===st?' cur':'')+'"><span>'+s.name+'</span><i>'+s.min+'-'+s.max+'</i></div>';
    }).join('');
    box.innerHTML =
      '<div class="favhead"><span>好感度</span><b>'+fav+'</b></div>'+
      '<div class="favbar"><i style="width:'+Math.min(100,Math.max(0,fav))+'%"></i></div>'+
      '<div class="favstage">'+st.name+'</div>'+lvs+
      '<button class="fbtn" id="qrecal">↻ 校准好感度<i>按下后 AI 参考近期剧情重估 · 不必每轮</i></button>'+
      '<div class="fnote">剧情轨道：本章 '+getNodesDone().length+' / '+((pack&&pack.mustNodes&&pack.mustNodes.length)||'?')+' 个必经节点</div>';
    const rb = document.getElementById('qrecal');
    if(rb) rb.onclick = doCalibrate;
  }
  function renderToc(){
    const t = document.getElementById('qtoc'); if(!t) return;
    const data = loadProfileData(); if(!data){ t.innerHTML=''; return; }
    const cur = data.currentChapter;
    let html = '';
    for(let i=1;i<=cur;i++){
      const c = data.chapters[i]||{};
      const isCur = i===cur;
      html += '<div class="sitem '+(isCur?'cur':'done')+'" data-ch="'+i+'"><span>第'+cnCh(i)+'章 · '+esc(c.title||'')+'</span><span class="arr">'+(isCur?'当前':'✓ 回看')+'</span></div>';
    }
    t.innerHTML = html;
    t.querySelectorAll('.sitem.done').forEach(function(el){
      el.onclick = function(){ viewingArchive = parseInt(el.dataset.ch,10); renderStory(); };
    });
  }
  let viewingArchive = 0;
  function switchCurrent(){
    viewingArchive = 0;
    renderStory();
  }
  function scrollEnd(){
    window.scrollTo(0, document.body.scrollHeight);
    requestAnimationFrame(function(){
      window.scrollTo(0, document.body.scrollHeight+1);
      requestAnimationFrame(function(){ window.scrollTo(0, document.body.scrollHeight); });
    });
  }
  function kickPaint(){
    requestAnimationFrame(function(){
      window.scrollTo(0, 1);
      requestAnimationFrame(function(){ window.scrollTo(0, 0); });
    });
  }
  function setFont(step){
    const f = flow; if(!f) return;
    const cur = parseFloat(f.dataset.fs||'15');
    const next = Math.max(12, Math.min(19, cur + step*1.5));
    if(next===cur) return;
    f.dataset.fs = next;
    try{ localStorage.setItem('gzd_qlz_font', next); }catch(e){}
    f.querySelectorAll('.narr,.tx').forEach(function(e){ e.style.fontSize = next+'px'; });
  }
  function restoreFont(){
    const f = flow; if(!f) return;
    let v = 15; try{ v = parseFloat(localStorage.getItem('gzd_qlz_font'))||15; }catch(e){}
    f.dataset.fs = v;
    f.querySelectorAll('.narr,.tx').forEach(function(e){ e.style.fontSize = v+'px'; });
  }
  function applyNight(on){
    root.classList.toggle('night', on);
    document.body.classList.toggle('night', on);
    document.documentElement.style.background = on ? '#20405F' : '#F0EFEB';
  }
  function toggleNight(){
    const n = !root.classList.contains('night');
    applyNight(n);
    try{ localStorage.setItem(K_THEME, JSON.stringify({value: n?'dark':'light'})); }catch(e){}
  }
  function toggleSide(which){
    const other = document.getElementById(which==='r'?'qside-l':'qside-r');
    if(other) other.classList.remove('open');
    const p = document.getElementById(which==='r'?'qside-r':'qside-l');
    if(p) p.classList.toggle('open');
    const ovl = document.getElementById('qovl');
    if(ovl){
      const anyOpen = ['qside-r','qside-l'].some(function(id){ const e=document.getElementById(id); return e&&e.classList.contains('open'); });
      ovl.classList.toggle('on', anyOpen);
    }
  }
  
  function injectApp(){
    /* 界面结构与样式全部在 模拟.html 里（引渡人同款做法），这里只做事件绑定 */
    root = document.getElementById('qlz-app');
    flow = document.getElementById('qflow');
    document.getElementById('qtocBtn').onclick = function(){ toggleSide('r'); };
    document.getElementById('qmToc').onclick = function(){ toggleSide('l'); renderToc(); };
    document.getElementById('qmNight').onclick = toggleNight;
    document.getElementById('qmRound').onclick = function(){
      renderSys('本章进度：第 '+getCurrentRounds()+' 轮 / 上限 '+(pack?pack.maxRounds:'—')+' 轮　│　好感 '+getFav()+' · '+stageOf(getFav()).name);
    };
    document.getElementById('qmReset').onclick = function(){
      if(confirm('确认删档重来？\n\n全部剧情进度、好感度与对话记录将被清空，且无法恢复。')){ resetAll(); location.reload(); }
    };
    const fminus = document.getElementById('qfminus'), fplus = document.getElementById('qfplus');
    if(fminus) fminus.onclick = function(ev){ ev.stopPropagation(); setFont(-1); };
    if(fplus)  fplus.onclick  = function(ev){ ev.stopPropagation(); setFont(1); };
    document.getElementById('qback').onclick = function(){ location.href='系统备份.html'; };
    document.getElementById('qnoticeClose').onclick = function(){
      document.getElementById('qnotice').style.display='none';
      try{ localStorage.setItem(NOTICE_KEY,'1'); }catch(e){}
    };
    try{ if(localStorage.getItem(NOTICE_KEY)==='1') document.getElementById('qnotice').style.display='none'; }catch(e){}
    const qin = document.getElementById('qin');
    document.getElementById('qgo').onclick = submit;
    qin.onkeydown = function(e){ if(e.key==='Enter') submit(); };
    const qovl = document.getElementById('qovl');
    qovl.onclick = function(){
      document.getElementById('qside-r').classList.remove('open');
      document.getElementById('qside-l').classList.remove('open');
      qovl.classList.remove('on');
    };
    document.addEventListener('click', function(e){
      ['qside-r','qside-l'].forEach(function(id){
        const p = document.getElementById(id);
        if(p && p.classList.contains('open') && !p.contains(e.target) && e.target.tagName!=='BUTTON' && e.target!==qovl) p.classList.remove('open');
      });
      const anyOpen = ['qside-r','qside-l'].some(function(id){ const el=document.getElementById(id); return el&&el.classList.contains('open'); });
      qovl.classList.toggle('on', anyOpen);
    }, true);
  }
  
  // ═══ 提交 ═══
  async function submit(){
    const i = document.getElementById('qin'), go = document.getElementById('qgo');
    const text = (i.value||'').trim();
    if(!text || busy) return;
    i.value=''; busy=true; go.disabled=true;
  
    /* 回忆进行中：输入全部路由给回忆AI，主线不响应（原版路由） */
    if(window.__QLZ_MEM__ && window.__QLZ_MEM__.active()){ busy=false; go.disabled=false; window.__QLZ_MEM__.submit(); return; }
  
    const arr = loadStory();
    const data = loadProfileData();
    const started = data && data.chapters[data.currentChapter] && arr.length > 1;
    if(!started){
      if(/^(开始游戏|开始|start)$/i.test(text.replace(/\s/g,''))){
        renderPcmd({type:'user', text:text});
        try{
          await startFirstChapter();
        }catch(e){
          renderSys('⚠ 章包加载失败：'+esc(e.message)+'　│　请确认 chapters/ 目录可访问');
        }
        busy=false; go.disabled=false; return;
      }
      renderPcmd({type:'user', text:text});
      renderSys('系统提示：请先输入「开始游戏」以开启第一章演出');
      busy=false; go.disabled=false; return;
    }
  
    const userItem = { id:'u_'+Date.now(), type:'user', text:text };
    arr.push(userItem);
    const loadingItem = { id:'loading_'+Date.now(), type:'loading' };
    arr.push(loadingItem);
    saveStory(arr);
    renderStory();
  
    let pk;
    try{ pk = await loadPack(getCurrentChapter()); }
    catch(e){ finishError(loadingItem, e); return; }
    const aiHistory = arr.filter(x => x.type==='user'||x.type==='ai').map(x => ({ role:x.type==='user'?'user':'assistant', content:x.text }));
  
    try{
      const res = await callAI(text, pk, aiHistory);
      const idx = arr.findIndex(x => x.id===loadingItem.id);
      const aiItem = { id:'a_'+Date.now(), type:'ai', text:res.text, sugg:lastSuggestions.slice(0,3) };
      if(idx !== -1) arr[idx] = aiItem;
      if(res.fav !== null) setFav(res.fav);
      if(res.nodesHit.length){
        const done = getNodesDone();
        res.nodesHit.forEach(n => { if(done.indexOf(n)<0) done.push(n); });
        setNodesDone(done);
      }
      saveStory(arr);
      renderStory();
      if(window.QLZ_LAST_CUT) renderSys('⚠ 本轮回复撞到输出长度上限被截断——走位参考可能缺失，可点该卡 ↻ 重生成');
      /* 回忆线触发：主线节点刚落地，检查是否有锚定的回忆待播（原版机制） */
      try{ const M=window.__QLZ_MEM__; const hit=M?M.pick(getNodesDone()):null; if(hit){ M.start(hit, function(){}); busy=false; go.disabled=false; return; } }catch(e){}
      const ch = getChapterData(getCurrentChapter());
      const done2 = (ch&&ch.nodesDone)||[];
      const allDone = pk.mustNodes.every(n => done2.indexOf(n.id)>=0);
      const rounds = getCurrentRounds();
      if(allDone || rounds >= (pk.maxRounds||12)+6){
        await doChapterTransition();
      }
    }catch(e){
      finishError(loadingItem, e);
    }finally{
      busy=false; go.disabled=false;
    }
  }
  function finishError(loadingItem, e){
    const a = loadStory();
    const i2 = a.findIndex(x => x.id===loadingItem.id);
    if(i2 !== -1) a[i2] = { id:'e_'+Date.now(), type:'error', text:'【出错】'+e.message+'　│　可重新呈报' };
    saveStory(a); renderStory();
  }
  
  // ═══ 开局 ═══
  async function startFirstChapter(){
    const data = loadProfileData(); if(!data) return;
    const pk = await loadPack(1);
    const ch = data.chapters[1] || { title:pk.title, summary:'', nodesDone:[], stories:[] };
    ch.title = pk.title;
    ch.stories = (ch.stories||[]).filter(x => x.type!=='sys');
    ch.stories.push({ id:'cs_'+Date.now(), type:'chapter-start', title:'第一章 · '+pk.title, text:(pk.locks||[]).filter(l=>l.id==='C-1')[0].text, sugg:(pk.options&&pk.options[pk.mustNodes[0].id])||[] });
    data.chapters[1] = ch;
    saveProfileData(data);
    pack = pk; renderChap();
    renderStory();
  }
  
  // ═══ 章节转换 ═══
  async function doChapterTransition(){
    const data = loadProfileData(); if(!data) return;
    const curCh = data.currentChapter;
    const chTitle = getChapterTitle(curCh) || ('第'+cnCh(curCh)+'章');
    const pk = packCache[curCh];
    const arr = loadStory();
    arr.push({ id:'ce_'+Date.now(), type:'chapter-end', title:chTitle, text:'本章节已完结，命册正在记录前情……' });
    saveStory(arr); renderStory();
    const go = document.getElementById('qgo');
    if(go){ go.disabled = true; }
  
    try{
      const content = arr.filter(x => x.type==='user'||x.type==='ai').map(x => (x.type==='user'?'玩家:':'AI:')+x.text+'\n').join('');
      const sumPrompt = '你是「千律州模拟器」的剧情记录员。第'+cnCh(curCh)+'章「'+chTitle+'」已完结。请用80-120字总结本章关键剧情。必须严格基于下面的【本章实际剧情内容】总结,不要编造没有发生过的事。只输出总结正文,不要任何解释。\n\n【本章实际剧情内容】\n'+(content.length>5000?content.slice(-5000):content);
      const cfg = loadAIConfig();
      let summary;
      if(cfg.apiKey && cfg.provider){
        const pConfig = PROVIDER_CONFIG[cfg.provider] || PROVIDER_CONFIG.deepseek;
        const baseUrl = cfg.provider==='custom' ? (cfg.customUrl||'') : pConfig.baseUrl;
        const model = cfg.model || pConfig.defaultModel;
        const messages = [{role:'user', content:sumPrompt}];
        let url, headers, body;
        if(pConfig.format==='claude'){
          url = baseUrl+'/v1/messages';
          headers = { 'Content-Type':'application/json','x-api-key':cfg.apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true' };
          body = JSON.stringify({ model, max_tokens:300, messages });
        } else {
          url = baseUrl+'/v1/chat/completions';
          headers = { 'Content-Type':'application/json','Authorization':'Bearer '+cfg.apiKey };
          body = JSON.stringify({ model, messages, max_tokens:300 });
        }
        const resp = await fetch(url, { method:'POST', headers, body });
        const d2 = await resp.json();
        if(!resp.ok) throw new Error('总结失败:'+resp.status);
        summary = pConfig.format==='claude' ? ((d2.content&&d2.content[0]&&d2.content[0].text)||'') : ((d2.choices&&d2.choices[0]&&d2.choices[0].message&&d2.choices[0].message.content)||'');
      } else {
        const d2 = await (await fetch(WORKER_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ message:sumPrompt, profile:PROFILE, history:[] }) })).json();
        if(d2.error) throw new Error(d2.error);
        summary = d2.reply || '';
      }
      summary = summary.trim();
      if(data.chapters[curCh]) data.chapters[curCh].summary = summary;
  
      const nextCh = curCh + 1;
      const nextPack = await loadPack(nextCh);
      const nextData = data.chapters[nextCh] || { title:nextPack.title, summary:'', nodesDone:[], stories:[] };
      nextData.title = nextPack.title;
      nextData.stories = (nextData.stories&&nextData.stories.length) ? nextData.stories : [
        { id:'cs_'+Date.now(), type:'chapter-start', title:'第'+cnCh(nextCh)+'章 · '+nextPack.title,
          text:(nextPack.locks||[]).filter(l=>l.id==='C-1').map(l=>l.text).join('\n') || ('（第'+cnCh(nextCh)+'章「'+nextPack.title+'」演出开始。）'),
          sugg:(nextPack.options&&nextPack.options[nextPack.mustNodes[0].id])||[] }
      ];
      data.chapters[nextCh] = nextData;
      data.currentChapter = nextCh;
      saveProfileData(data);
      viewingArchive = 0;
      pack = nextPack;
      renderStory();
    }catch(e){
      const arr2 = loadStory();
      const i = arr2.map(x=>x.type).lastIndexOf('chapter-end');
      if(i !== -1){ arr2[i] = { id:'e_'+Date.now(), type:'error', text:'章节转换失败:'+e.message+'　│　进度已保存，稍后再呈报任意行动会自动重试转场' }; }
      else { arr2.push({ id:'e_'+Date.now(), type:'error', text:'章节转换失败:'+e.message }); }
      saveStory(arr2); renderStory();
    }finally{
      if(go){ go.disabled = false; }
    }
  }
  
  // ═══ 重生成 / 编辑 ═══
  async function regenerate(cardEl){
    if(busy) return;
    const cardId = cardEl.dataset.id;
    const arr = loadStory();
    const idx = arr.findIndex(x => x.id===cardId && x.type==='ai');
    if(idx === -1) return;
    if(idx === 0 || arr[idx-1].type !== 'user') return;
    const userText = arr[idx-1].text;
    busy = true;
    const loadingItem = { id:'loading_'+Date.now(), type:'loading' };
    arr[idx] = loadingItem;
    saveStory(arr); renderStory();
    let pk;
    try{ pk = await loadPack(getCurrentChapter()); }catch(e){ finishError(loadingItem, e); busy=false; return; }
    const aiHistory = arr.slice(0, idx).filter(x => x.type==='user'||x.type==='ai').map(x => ({ role:x.type==='user'?'user':'assistant', content:x.text }));
    try{
      const res = await callAI(userText, pk, aiHistory);
      const a2 = loadStory();
      const i2 = a2.findIndex(x => x.id===loadingItem.id);
      if(i2 !== -1){ a2[i2] = { id:'a_'+Date.now(), type:'ai', text:res.text, sugg:lastSuggestions.slice(0,3) }; }
      if(res.fav !== null) setFav(res.fav);
      saveStory(a2); renderStory();
    }catch(e){
      finishError(loadingItem, e);
    }finally{ busy=false; }
  }
  function editAct(cardEl){
    if(cardEl.dataset.editing) return;
    const cardId = cardEl.dataset.id;
    const arr = loadStory();
    const idx = arr.findIndex(x => x.id===cardId);
    if(idx === -1) return;
    const item = arr[idx];
    if(item.type!=='user' && item.type!=='ai') return;
    const isP = item.type==='user';
    const ab = cardEl.querySelector('.abody') || cardEl.querySelector('.tx');
    if(!ab) return;
    const paras = ab.classList.contains('tx') ? [ab] : Array.prototype.slice.call(ab.querySelectorAll('.narr'));
    if(!paras.length) return;
    const oldText = paras.map(function(p){ return p.textContent.replace(/^>\s*/,''); }).join('\n\n');
    cardEl.dataset.editing = '1';
    const ta = document.createElement('textarea');
    ta.style.cssText = 'width:100%;min-height:140px;font-family:inherit;font-size:13px;line-height:2;border:1.5px solid var(--klein);background:var(--bg);color:var(--ink);padding:8px;';
    ta.value = oldText;
    const wrap = h('div'); wrap.appendChild(ta);
    const bar = h('div'); bar.style.cssText='margin:6px 0;';
    const save = h('button','op','✓ 保存并继续'); const cancel = h('button','op','取消');
    bar.appendChild(save); bar.appendChild(cancel);
    ab.style.display='none'; ab.parentNode.insertBefore(wrap, ab.nextSibling);
    ab.parentNode.insertBefore(bar, wrap.nextSibling);
    save.onclick = function(){
      const val = ta.value.trim();
      if(!val || val===oldText){ restore(); return; }
      if(isP){
        if(oldText==='开始游戏'){ renderSys('「开始游戏」是开局指令，不可编辑'); restore(); return; }
        const newArr = arr.slice(0, idx);
        saveStory(newArr);
        removeAfter(cardEl);
        restore(true);
        replayFrom(newArr.length);
        submitText(val);
      } else {
        arr[idx].text = val;
        saveStory(arr);
        ab.innerHTML = fmt(val);
        restore(true);
      }
    };
    cancel.onclick = restore;
    function restore(keep){
      ab.style.display='';
      wrap.remove(); bar.remove();
      if(!keep) delete cardEl.dataset.editing;
    }
  }
  function removeAfter(cardEl){
    let n = cardEl.nextElementSibling;
    while(n){ const nx = n.nextElementSibling; n.remove(); n = nx; }
  }
  function replayFrom(count){
    // 按 v6 全量重绘（数据驱动，天然一致）
    renderStory();
  }
  function submitText(text){
    const i = document.getElementById('qin');
    i.value = text;
    submit();
  }
  
  // ═══ 好感校准 ═══
  async function calibrateFav(){
    const arr = loadStory();
    const recent = arr.filter(x=>x.type==='user'||x.type==='ai').slice(-4).map(x => (x.type==='user'?'[玩家]':'[演出]')+x.text.slice(0,300)).join('\n');
    const msg = '你是好感度仲裁器。根据以下最近剧情,评估玩家(怀榆)对攻略对象的表现应增减多少好感(-3到+3,整数)。\n当前好感:'+getFav()+'\n最近剧情:\n'+recent+'\n只输出一行JSON:{"delta":整数,"reason":"一句话理由"}';
    const cfg = loadAIConfig();
    let reply;
    if(cfg.apiKey && cfg.provider){
      reply = await callDirect(msg, (packCache[getCurrentChapter()]||{mustNodes:[],maxRounds:99}), [], cfg);
    } else {
      reply = await callWorker(msg, []);
    }
    const m = (reply||'').match(/\{[^}]*delta[^}]*\}/);
    if(!m) throw new Error('校准输出格式异常');
    const o = JSON.parse(m[0]);
    setFav(getFav() + (o.delta|0));
    renderSys('好感校准：'+(o.delta>=0?'+':'')+(o.delta|0)+'（'+(o.reason||'')+'）　│　当前 '+getFav());
  }
  async function doCalibrate(){
    const b = document.getElementById('qrecal'); if(b){ b.disabled = true; b.innerHTML = '↻ 校准中…'; }
    try{ await calibrateFav(); }
    catch(e){ renderSys('⚠ 校准失败：'+esc(e.message)); }
    renderSeal();
  }
  
  // ═══ 删档 ═══
  function resetAll(){
    /* 确认已在菜单按钮做一次——这里直接清（双重 confirm 在 iPad 上会被吞，导致删了个寂寞） */
    localStorage.removeItem(STORAGE_KEY);
    try{ localStorage.removeItem('gzd_qlz_mem'); }catch(e){}   /* 回忆线存档一并清 */
    viewingArchive = 0; prevSugg = []; lastSuggestions = [];
    ensureOpening();
    pack = null;
    loadPack(1).then(function(p){ pack = p; renderStory(); }).catch(function(){ renderStory(); });
    renderStory();
  }
  
  // ═══ 存档初始化 + 旧档迁移 ═══
  function ensureOpening(){
    let data = loadProfileData();
    if(!data){
      try{
        const old = JSON.parse(localStorage.getItem(OLD_KEY));
        if(old && old.stories && old.stories.length){
          const chN = old.ch || 1;
          const stories = [];
          old.stories.forEach(function(m, i){
            if(m.role === 'user') stories.push({ id:'u_'+i, type:'user', text:m.text });
            else stories.push({ id:'a_'+i, type:'ai', text:m.text, sugg:(m.opts&&m.opts.slice(0,3))||[] });
          });
          if(stories.length && stories[0].type==='ai'){
            stories[0] = { id:'cs_0', type:'chapter-start', title:'第'+cnCh(chN)+'章', text:stories[0].text, sugg:stories[0].sugg||[] };
          }
          data = { currentChapter:chN, fav:(typeof old.fav==='number'?old.fav:10), chapters:{} };
          data.chapters[chN] = { title:'', summary:old.summary||'', nodesDone:old.nodes||[], stories:stories };
          saveProfileData(data);
          return;
        }
      }catch(e){}
    }
    if(!data) data = { currentChapter:1, fav:10, chapters:{} };
    if(!data.chapters) data.chapters = {};
    if(!data.chapters[1]){
      data.chapters[1] = { title:'', summary:'', nodesDone:[], stories:[{ id:'opening', type:'opening', text:DECLARATION }] };
      saveProfileData(data);
    } else if(!data.chapters[1].stories || !data.chapters[1].stories.length){
      data.chapters[1].stories = [{ id:'opening', type:'opening', text:DECLARATION }];
      saveProfileData(data);
    }
  }
  
  // ═══ 回忆线接口（引擎本体在 回忆AI.js；本文件只做清档联动与暴露，路由已内嵌 submit） ═══
  window.__QLZ_SIM__ = { reset: resetAll, calibrate: doCalibrate, state: function(){ return loadProfileData(); } };
  
  // ═══ 启动 ═══
  function boot(){
    try{
      injectApp();
      applyNight(document.body.classList.contains('night') || (function(){ try{return JSON.parse(localStorage.getItem(K_THEME)||'null').value==='dark';}catch(e){return false;} })());
      ensureOpening();
      renderStory();
      restoreFont();
      kickPaint();
      loadPack(getCurrentChapter()).then(function(p){
        pack = p;
        const data = loadProfileData();
        if(data && data.chapters[data.currentChapter] && !data.chapters[data.currentChapter].title){
          data.chapters[data.currentChapter].title = p.title;
          saveProfileData(data);
        }
        renderChap(); renderToc(); renderSeal(); renderRound();
      }).catch(function(e){
        document.getElementById('qtitle').textContent = '章节包加载失败';
        renderSys('加载失败：'+esc(e.message)+'　│　请确认 chapters/ 目录可访问');
      });
      console.log('[千律州模拟器] 引擎就绪 · 章节:'+getCurrentChapter()+' · '+(hasUserKey()?'直连':'公共后端'));
    }catch(err){
      try{
        const d = document.createElement('div');
        d.style.cssText='position:fixed;left:0;right:0;bottom:0;background:#300;color:#fbb;font:11px/1.4 monospace;padding:8px;white-space:pre-wrap;z-index:99999;';
        d.textContent='[BOOT-ERR] '+(err&&err.stack||err);
        (document.body||document.documentElement).appendChild(d);
      }catch(_){}
    }
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  })();
  