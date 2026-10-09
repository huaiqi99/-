// ===== 千律州模拟AI.js · 剧情演绎引擎 v1 =====
// 架构：三层导演制（文风协议+章导演指令+幕锚点）+ 分层记忆 + 状态机 + 好感校准
// 依赖：chapters/chXX.json 章节包；Worker 同引渡人（difu-ai）；UI 自渲染（v5 模板）
// 存档：gzd_qlz_story（剧情）/ gzd_qlz_state（状态机）——与引渡人 gzd_* 隔离
(function(){
  'use strict';
  /* 全局错误上屏（[ERR]横幅，同系统页惯例） */
  window.addEventListener('error',function(e){
    try{
      var d=document.createElement('div');
      d.style.cssText='position:fixed;left:0;right:0;bottom:0;background:#300;color:#fbb;font:12px/1.5 monospace;padding:6px 10px;word-break:break-all;cursor:pointer;z-index:99999;';
      d.textContent='[ERR] '+(e.message||'unknown')+' @'+(e.lineno||'?')+'（点击关闭）';
      d.onclick=function(){if(d.parentNode)d.parentNode.removeChild(d);};
      (document.body||document.documentElement).appendChild(d);
    }catch(_){}
  });
  
  // ===== 配置 =====
  var WORKER_URL = 'https://difu-ai.2629885225.workers.dev';
  var PROFILE    = 'qlz';
  var MAX_HISTORY = 10;
  var CH_DIR = 'chapters/';
  var K_STORY = 'gzd_qlz_story';
  var K_STATE = 'gzd_qlz_state';
  var K_THEME = 'theme';
  
  // 文风与输出协议（静态层）
  var PROTOCOL = [
  '【千律州演出协议】',
  '你是千律州系统的剧情演绎引擎。玩家扮演怀榆，你是包裹着他的“系统”与世界本身。',
  '文风：网文长段流——叙述段落为主，对白用引号嵌在段落内，段落之间空行。严禁剧本分行、严禁角色名前置标签、严禁列表化正文。',
  '场景切换或氛围转折时，可单独输出一行括号提示，如：（门后静了两拍。然后是低低的一声笑。）',
  '第二人称“你”指代怀榆。系统“我”偶尔冷面吐槽，语气四平八稳带嫌弃。',
  '导演指令中的必经节点是剧情轨道：玩家过程自由，节点事件必须自然发生；玩家跑偏时以最自然的方式拉回，严禁出戏。',
  '开场衔接：上文【演出】里已播出的开场与剧情是既成事实。你的每轮演出必须从最近一次演出的结尾自然衔接（人物状态、地点、时间延续），严禁重播开场白、严禁另起炉灶、严禁无视玩家刚呈报的行动。',
  '信息封锁：导演指令中“不知道/不可提及”的内容，无论玩家怎么问，一律不给，可由系统以“权限不足”类话术封口。',
  '每轮回复固定格式：正文长段 + （括号场景提示，可选）+ 最后一行系统播报（好感变动或本章进度，用│分隔）。',
  '正文结束后另起一行输出<建议>["行动1","行动2","行动3"]</建议>：3条玩家下一步可采取的行动，每条不超过15字，第二人称祈使句。',
  '正文结束后再输出<状态>{"nodes":["本章触发的节点id"],"fav":当前好感整数}</状态>。nodes 只填本轮实际触发的节点id，没有填空数组；fav 填你演绎后建议的当前好感值。两个块都不可省略。'
  ].join('\n');
  
  var STAGES = [
    {min:0,  max:20,  name:'冷淡警惕'},
    {min:21, max:40,  name:'认识试探'},
    {min:41, max:60,  name:'熟悉信任'},
    {min:61, max:80,  name:'亲近在意'},
    {min:81, max:100, name:'深厚感情'}
  ];
  function stageOf(f){ for(var i=STAGES.length-1;i>=0;i--) if(f>=STAGES[i].min) return STAGES[i]; return STAGES[0]; }
  
  // ===== 存档 =====
  function loadStory(){
    try{ var d = JSON.parse(localStorage.getItem(K_STORY)); if(d && d.ch) return d; }catch(e){}
    return { ch:1, round:0, fav:10, stories:[], nodes:[], summary:'', started:false };
  }
  function saveStory(s){ try{ localStorage.setItem(K_STORY, JSON.stringify(s)); }catch(e){} }
  function resetAll(){ localStorage.removeItem(K_STORY); localStorage.removeItem(K_STATE); state = loadStory(); }
  
  var state = loadStory();
  var pack = null;          // 当前章包缓存
  var lastOpts = [];        // 当前走位参考
  var busy = false;
  
  // ===== 章包加载 =====
  function pad2(n){ return (n<10?'0':'')+n; }
  function loadPack(n, cb){
    /* 双路：优先读内嵌 章节包.js（QLZ_PACKS），无则 fetch 外链 */
    var key = 'ch' + pad2(n);
    if(window.QLZ_PACKS && window.QLZ_PACKS[key]) { setTimeout(function(){ cb(null, window.QLZ_PACKS[key]); }, 0); return; }
    fetch(CH_DIR + 'ch' + pad2(n) + '.json').then(function(r){
      if(!r.ok) throw new Error('章节包缺失 ch'+pad2(n));
      return r.json();
    }).then(function(j){ cb(null, j); }).catch(function(e){ cb(e); });
  }
  
  // ===== 三层导演组装 =====
  function buildParts(pack, state, userText, forced){
    var st = stageOf(state.fav);
    var recent = state.stories.slice(-6).map(function(m){ return (m.role==='user'?'【玩家呈报】':'【演出】')+m.text; }).join('\n\n');
    var nodesLeft = pack.mustNodes.filter(function(n){ return state.nodes.indexOf(n.id)<0; }).map(function(n){ return n.desc; }).join('；') || '无';
    var parts = [];
    parts.push('── 导演指令（本章） ──\n' + pack.director.replace('{mustNodes}', '已完成：'+(state.nodes.join('、')||'无')+'；未完成：'+nodesLeft));
    parts.push('── 本章走向 ──\n' + pack.goal + '。通关条件：' + pack.transition);
    parts.push('── 玩家已知信息 ──\n' + pack.knownInfo.join('\n'));
    parts.push('── 当前状态 ──\n好感 ' + state.fav + ' · ' + st.name + '（对话态度参考此阶段）\n本章已进行 ' + state.round + ' / ' + pack.maxRounds + ' 轮');
    if(state.summary) parts.push('── 前情摘要 ──\n' + state.summary);
    if(recent) parts.push('── 最近演出 ──\n' + recent);
    if(forced) parts.push('── ⚠ 强制拉回 ──\n' + forced);
    var sys = parts.join('\n\n');
    return { sys: sys, user: '── 玩家本轮呈报 ──\n' + userText };
  }
  
  // ===== AI 调用：密钥直连 / Worker 双路 =====
  var CONFIG_KEY = 'gzd_ai_config';   // 与引渡人共享：设置页填一次，两边通用
  function loadAIConfig(){ try{ return JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}'); }catch(e){ return {}; } }
  var PROVIDER_CONFIG = {
    deepseek:{baseUrl:'https://api.deepseek.com',defaultModel:'deepseek-chat',format:'openai'},
    openai:{baseUrl:'https://api.openai.com',defaultModel:'gpt-4o-mini',format:'openai'},
    claude:{baseUrl:'https://api.anthropic.com',defaultModel:'claude-3-5-sonnet-20241022',format:'claude'},
    custom:{baseUrl:'',defaultModel:'',format:'openai'}
  };
  function callMessages(messages){
    var cfg = loadAIConfig();
    if(cfg.apiKey && cfg.provider){
      var pc = PROVIDER_CONFIG[cfg.provider] || PROVIDER_CONFIG.deepseek;
      var baseUrl = cfg.provider==='custom' ? (cfg.customUrl||'') : pc.baseUrl;
      var model = cfg.model || pc.defaultModel;
      if(!baseUrl) return Promise.reject(new Error('接口地址为空，请前往设置页填写'));
      var hasSys = messages[0] && messages[0].role==='system';
      var sys = hasSys ? messages[0].content : '';
      var rest = hasSys ? messages.slice(1) : messages;
      var url, headers, body;
      if(pc.format==='claude'){
        url = baseUrl+'/v1/messages';
        headers = {'Content-Type':'application/json','x-api-key':cfg.apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'};
        body = JSON.stringify({model:model,max_tokens:900,system:sys,messages:rest});
      } else {
        url = baseUrl+'/v1/chat/completions';
        headers = {'Content-Type':'application/json','Authorization':'Bearer '+cfg.apiKey};
        body = JSON.stringify({model:model,messages:messages,max_tokens:900,temperature:0.8});
      }
      return fetch(url,{method:'POST',headers:headers,body:body}).then(function(r){
        return r.json().then(function(d){
          if(!r.ok){
            var em = (d.error&&d.error.message)||d.error||JSON.stringify(d);
            if(r.status===401) throw new Error('API Key 无效或已失效');
            if(r.status===402) throw new Error('余额不足');
            if(r.status===429) throw new Error('请求过频');
            throw new Error('AI 返回错误('+r.status+'):'+em);
          }
          var reply = pc.format==='claude' ? ((d.content&&d.content[0]&&d.content[0].text)||'') : ((d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content)||'');
          if(!reply) throw new Error('AI 返回了空内容');
          return reply;
        });
      });
    }
    var sysMsg = (messages[0]&&messages[0].role==='system') ? messages[0].content : '';
    var lastUser = ''; for(var i=messages.length-1;i>=0;i--){ if(messages[i].role==='user'){ lastUser=messages[i].content; break; } }
    var hist = messages.filter(function(m,idx){ return m.role!=='system' && idx!==messages.length-1; })
      .map(function(m){ return {role:m.role, text:m.content}; });
    return fetch(WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json'},
      body: JSON.stringify({message:(sysMsg? sysMsg+'\n\n── 玩家本轮呈报 ──\n':'')+lastUser, profile:PROFILE, history:hist, system:sysMsg})
    }).then(function(r){ return r.json(); }).then(function(d){
      if(!r.ok || d.error) throw new Error(d.error || ('HTTP '+r.status));
      return d.reply;
    });
  }
  function callAI(userText, forced){
    var parts = buildParts(pack, state, userText, forced);
    var lore = window.QLZ_LORE;
    var loreTxt = [lore.STYLE===undefined?'':(lore.STYLE?('\n\n【世界书·文风】\n'+lore.STYLE):''), (lore.WORLD?'\n\n【世界书·世界观硬设定】\n'+lore.WORLD:''), (lore.CARDS?'\n\n【世界书·人物卡（严格执行，任何偏离即OOC事故）】\n'+lore.CARDS:''), (lore.SECRETS?'\n\n【封锁红线·以下信息在剧情未揭晓前绝不可确认/暗示/说漏，玩家追问一律“不知道/权限不足”】\n'+lore.SECRETS:'')].join('');
    var messages = [{role:'system', content: PROTOCOL+'\n\n'+parts.sys+loreTxt}];
    state.stories.slice(-MAX_HISTORY).forEach(function(m){ messages.push({role:m.role, content:m.text}); });
    messages.push({role:'user', content:parts.user});
    return callMessages(messages);
  }
  // 好感校准（独立小调用，省 token：不每轮算）
  function calibrateFav(){
    var st = stageOf(state.fav);
    var recent = state.stories.slice(-4).map(function(m){ return (m.role==='user'?'[玩家]':'[演出]')+m.text.slice(0,300); }).join('\n');
    var msg = '你是好感度仲裁器。根据以下最近剧情，评估玩家（怀榆）对攻略对象的表现应增减多少好感（-3到+3，整数）。\n当前好感：'+state.fav+'（阶段：'+st.name+'）\n最近剧情：\n'+recent+'\n只输出一行JSON：{"delta":整数,"reason":"一句话理由"}';
    return callMessages([{role:'user', content: msg}]).then(function(reply){
      var m = (reply||'').match(/\{[^}]*delta[^}]*\}/);
      if(!m) throw new Error('校准输出格式异常');
      var o = JSON.parse(m[0]);
      state.fav = Math.max(0, Math.min(100, state.fav + (o.delta|0)));
      saveStory(state); renderSeal();
      return o;
    });
  }
  
  // ===== 解析 AI 回复 =====
  function parseReply(reply, pack){
    var nodesHit = [], fav = null;
    reply = reply.replace(/<状态>([\s\S]*?)<\/状态>/, function(_, j){
      try{ var o = JSON.parse(j.trim());
        if(o.nodes && o.nodes.length) nodesHit = o.nodes;
        if(typeof o.fav === 'number') fav = Math.max(0, Math.min(100, o.fav|0));
      }catch(e){}
      return '';
    });
    var opts = [];
    reply = reply.replace(/<建议>([\s\S]*?)<\/建议>/, function(_, j){
      try{ var a = JSON.parse(j.trim()); if(Array.isArray(a)) opts = a.slice(0,3); }catch(e){}
      return '';
    });
    reply = reply.trim();
    // 走位参考兜底：AI 没给就用章包当前节点 options
    if(!opts.length){
      var pend = pack.mustNodes.filter(function(n){ return state.nodes.indexOf(n.id)<0; })[0];
      if(pend && pack.options[pend.id]) opts = pack.options[pend.id];
    }
    return { text: reply, nodesHit: nodesHit, fav: fav, opts: opts };
  }
  
  // ===== 轮次推进 =====
  function advance(parsed){
    var st0 = stageOf(state.fav);
    state.round++;
    parsed.nodesHit.forEach(function(id){ if(state.nodes.indexOf(id)<0) state.nodes.push(id); });
    if(parsed.fav !== null) state.fav = parsed.fav;
    var st1 = stageOf(state.fav);
    var doneAll = pack.mustNodes.every(function(n){ return state.nodes.indexOf(n.id)>=0; });
    var sysLine = '';
    if(parsed.fav !== null && parsed.fav !== state.fav){ /* fav 已在 state 上 */ }
    sysLine = '好感 ' + st0.min + '→' + state.fav + '　│　' + (st1.name===st0.name ? '阶段未变 · 仍处【'+st1.name+'】' : '阶段跃迁 · 【'+st0.name+'】→【'+st1.name+'】') + '　│　本章 ' + state.ch + ' / 10';
    // 强制拉回判定
    var forced = null;
    var left = pack.mustNodes.filter(function(n){ return state.nodes.indexOf(n.id)<0; });
    if(!doneAll && state.round >= pack.maxRounds - 3 && left.length)
      forced = '（系统强制任务弹窗：主线进度告急，请将剧情向【'+left[0].desc+'】引导，两轮内完成。）';
    // 转场判定
    var transition = doneAll;
    saveStory(state);
    return { sysLine: sysLine, forced: forced, transition: transition, stageChanged: st1.name!==st0.name };
  }
  
  // ===== 渲染器（v5 模板） =====
  var root, flow, elCache = {};
  function h(tag, cls, html){ var e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; }
  function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
  
  function injectApp(){
    if(document.getElementById('qlz-app')){ root = document.getElementById('qlz-app'); return; }
    root = h('div'); root.id = 'qlz-app';
    root.innerHTML =
    '<style>'+
    ':root{--bg:#F0EFEB;--card:#FAF9F5;--ink:#23243B;--burg:#550F10;--klein:#222C6E;--zhu:#A8443E;--mut:#5D6B80;--gc:rgba(85,15,16,.08);--gc2:rgba(34,44,110,.07);--hair:rgba(34,44,110,.3);}'+
    '#qlz-app,body{font-family:Georgia,"Songti SC",serif;color:var(--ink);}'+
    'body{background:var(--bg);background-image:linear-gradient(var(--gc) 1px,transparent 1px),linear-gradient(90deg,var(--gc) 1px,transparent 1px),linear-gradient(var(--gc2) 1px,transparent 1px),linear-gradient(90deg,var(--gc2) 1px,transparent 1px);background-size:117px 117px,117px 117px,26px 26px,26px 26px;margin:0;}'+
    '#qlz-app .chap{max-width:1200px;margin:18px auto 0;display:flex;align-items:center;gap:10px;background:var(--card);border:1.5px solid var(--klein);box-shadow:4px 5px 0 rgba(34,44,110,.15);padding:12px 18px;position:sticky;top:0;z-index:5;}'+
    '#qlz-app .no{font-size:10px;letter-spacing:.2em;color:var(--burg);border:1.5px solid var(--burg);padding:3px 7px;font-family:Courier New,monospace;white-space:nowrap;}'+
    '#qlz-app .t{flex:1;min-width:0;}#qlz-app .t b{font-size:15.5px;letter-spacing:.1em;display:block;}#qlz-app .t i{font-style:normal;font-family:Courier New,monospace;font-size:8.5px;letter-spacing:.16em;color:var(--mut);}'+
    '#qlz-app .ico{width:34px;height:34px;border:1.5px solid var(--klein);background:transparent;color:var(--klein);font-size:13px;cursor:pointer;font-family:inherit;}#qlz-app .ico:hover{background:var(--klein);color:#F0EFEB;}'+
    '#qlz-app .flow{max-width:1200px;margin:16px auto 0;}'+
    '#qlz-app .act{background:var(--card);border:1.5px solid var(--klein);box-shadow:4px 5px 0 rgba(34,44,110,.12);margin:24px 0 24px 26px;padding:22px 30px 18px;position:relative;animation:qfadeUp .55s ease both;}'+
    '@keyframes qfadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}'+
    '#qlz-app .mh{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--hair);padding-bottom:6px;margin-bottom:12px;}'+
    '#qlz-app .mn{font-size:11px;letter-spacing:.22em;color:var(--klein);font-family:Courier New,monospace;font-weight:400;}'+
    '#qlz-app .ops{display:flex;gap:6px;opacity:.5;}#qlz-app .ops:hover{opacity:1;}'+
    '#qlz-app .op{border:1px solid var(--hair);background:transparent;color:var(--mut);font-family:Courier New,monospace;font-size:9.5px;padding:2px 8px;cursor:pointer;letter-spacing:.1em;}'+
    '#qlz-app .op:hover{color:var(--klein);border-color:var(--klein);}#qlz-app .op.hot:hover{background:var(--klein);color:#F0EFEB;}'+
    '#qlz-app .narr{font-size:15px;line-height:2.15;margin-bottom:24px;}'+
    '#qlz-app .cue{color:var(--zhu);text-align:center;font-size:12.5px;margin:20px 0;}'+
    '#qlz-app .sys{display:flex;align-items:center;gap:9px;font-family:Courier New,monospace;font-size:11px;color:var(--mut);letter-spacing:.12em;margin:16px 0 18px;}'+
    '#qlz-app .sys::before,#qlz-app .sys::after{content:"";flex:1;height:1px;background:var(--hair);}'+
    '#qlz-app .sys b{color:var(--zhu);font-weight:400;}#qlz-app .sys .up{color:var(--klein);}'+
    '#qlz-app .opts{border:1.5px dashed var(--klein);padding:10px 13px;background:rgba(250,249,245,.85);margin-bottom:6px;}'+
    '#qlz-app .ot{font-family:Courier New,monospace;font-size:9px;letter-spacing:.2em;color:var(--mut);margin-bottom:8px;}#qlz-app .ot b{color:var(--zhu);font-weight:400;}'+
    '#qlz-app .opt{display:block;width:100%;text-align:left;border:1px solid var(--hair);background:transparent;font-family:inherit;font-size:14px;padding:8px 12px;margin-bottom:6px;cursor:pointer;color:var(--ink);transition:.15s;}'+
    '#qlz-app .opt:hover{background:var(--klein);color:#F0EFEB;border-color:var(--klein);}'+
    '#qlz-app .pcmd{border-left:3px solid var(--zhu);background:rgba(168,68,62,.05);padding:10px 13px 8px;margin:24px 0 24px 26px;position:relative;}'+
    '#qlz-app .pl{font-family:Courier New,monospace;font-size:9.5px;letter-spacing:.18em;color:var(--zhu);display:flex;justify-content:space-between;margin-bottom:4px;}'+
    '#qlz-app .pl .op{margin-left:6px;}'+
    '#qlz-app .tx{font-size:14px;line-height:2;}#qlz-app .tx::before{content:"> ";font-family:Courier New,monospace;color:var(--zhu);}'+
    '#qlz-app .inbar{max-width:1200px;margin:4px auto 30px;display:flex;gap:10px;position:sticky;bottom:0;background:var(--bg);padding:10px 0 4px;border-top:1.5px solid var(--klein);z-index:3;}'+
    '#qlz-app .in{flex:1;border:1.5px solid var(--klein);background:var(--card);font-family:inherit;font-size:15px;padding:13px 15px;color:var(--ink);outline:none;}'+
    '#qlz-app .go{background:var(--klein);color:#F0EFEB;border:none;font-family:inherit;font-size:14px;letter-spacing:.25em;padding:0 26px;cursor:pointer;transition:.18s;}'+
    '#qlz-app .go:hover{background:var(--burg);}#qlz-app .go:disabled{opacity:.5;cursor:wait;}'+
  '#qlz-app .flow{position:relative;padding-left:16px;}'+
  '#qlz-app .flow::before{content:"";position:absolute;left:0;top:0;bottom:0;width:1.5px;background:var(--hair);}'+
  '#qlz-app .act::before{content:"";position:absolute;left:-38px;top:30px;width:9px;height:9px;background:var(--burg);border:1.5px solid var(--card);}'+
  '#qlz-app .pcmd::before{content:"";position:absolute;left:-42px;top:16px;width:9px;height:9px;background:var(--card);border:2px solid var(--zhu);}'+
    '#qlz-app .side{position:fixed;top:0;bottom:0;width:300px;background:var(--card);border:1.5px solid var(--klein);padding:18px 16px;z-index:50;font-size:12px;overflow-y:auto;transition:transform .28s ease;}'+
    '#qlz-app .side.r{right:0;transform:translateX(100%);box-shadow:-6px 0 0 rgba(34,44,110,.12);}'+
    '#qlz-app .side.l{left:0;transform:translateX(-100%);box-shadow:6px 0 0 rgba(34,44,110,.12);}'+
    '#qlz-app .side.open{transform:none;}'+
    '#qlz-app .st{font-family:Courier New,monospace;font-size:9.5px;letter-spacing:.22em;color:var(--burg);border-bottom:1px solid var(--hair);padding-bottom:7px;margin-bottom:12px;}'+
    '#qlz-app .sitem{display:flex;justify-content:space-between;align-items:center;padding:9px 6px;border-bottom:1px dashed var(--hair);cursor:pointer;letter-spacing:.1em;}'+
    '#qlz-app .sitem:hover{background:rgba(34,44,110,.05);color:var(--klein);}'+
    '#qlz-app .sitem .arr{color:var(--mut);font-family:Courier New,monospace;font-size:10px;}'+
    '#qlz-app .favbox{border:1.5px solid var(--zhu);padding:12px 13px;margin:12px 0;background:rgba(168,68,62,.04);}'+
    '#qlz-app .favbig{display:flex;align-items:baseline;gap:8px;}#qlz-app .favbig b{font-size:30px;color:var(--zhu);font-weight:400;font-family:Courier New,monospace;}'+
    '#qlz-app .favbig span{font-size:12px;letter-spacing:.25em;color:var(--burg);font-weight:700;}'+
    '#qlz-app .favbar{height:9px;border:1.5px solid var(--zhu);margin:10px 0 8px;position:relative;background:rgba(250,249,245,.8);}'+
    '#qlz-app .favbar i{position:absolute;left:0;top:0;bottom:0;background:var(--zhu);transition:width .8s ease;}'+
    '#qlz-app .favbar .c1{position:absolute;left:0;top:-16px;font-size:8px;font-family:Courier New,monospace;color:var(--mut);}'+
    '#qlz-app .favbar .c2{position:absolute;right:0;top:-16px;font-size:8px;font-family:Courier New,monospace;color:var(--mut);}'+
    '#qlz-app .lvs{display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:10px;color:var(--mut);font-family:Courier New,monospace;}'+
    '#qlz-app .lvs span{padding:3px 5px;border:1px solid rgba(0,0,0,.08);}'+
    '#qlz-app .lvs span.on{background:var(--zhu);color:#F0EFEB;border-color:var(--zhu);}'+
    '#qlz-app .recal{width:100%;border:1.5px solid var(--zhu);background:transparent;color:var(--zhu);font-family:inherit;font-size:11.5px;letter-spacing:.2em;padding:8px;cursor:pointer;margin-top:11px;transition:.15s;}'+
    '#qlz-app .recal:hover{background:var(--zhu);color:#F0EFEB;}'+
    '#qlz-app .recal i{font-style:normal;font-family:Courier New,monospace;font-size:8.5px;display:block;letter-spacing:.08em;opacity:.75;margin-top:2px;}'+
    '#qlz-app .backbtn{margin-top:14px;border:1.5px solid var(--klein);background:transparent;color:var(--klein);width:100%;padding:8px;font-family:inherit;font-size:12px;letter-spacing:.3em;cursor:pointer;}'+
    '#qlz-app .backbtn:hover{background:var(--klein);color:#F0EFEB;}'+
    '#qlz-app .typing{font-family:Courier New,monospace;font-size:10px;color:var(--mut);letter-spacing:.2em;text-align:center;margin:14px 0;}'+
    '#qlz-app.night{--bg:#161A20;--card:#1E242D;--ink:#D9D6C9;--burg:#C97F76;--klein:#93A9C7;--zhu:#C97F76;--mut:#8B99AC;--gc:rgba(147,169,199,.09);--gc2:rgba(147,169,199,.04);--hair:rgba(147,169,199,.32);}'+
    /* 夜间模式按钮可读性：主按钮改深底亮字，描边月白 */
    '#qlz-app.night .go{background:#2C3A4E;color:#E8E4D8;border:1px solid var(--klein);}'+
    '#qlz-app.night .go:hover{background:var(--burg);color:#161A20;}'+
    '#qlz-app.night .ico,#qlz-app.night .in{background:#1E242D;color:var(--ink);}'+
    '#qlz-app.night .ico:hover{background:var(--klein);color:#161A20;}'+
    '#qlz-app.night .opt:hover,#qlz-app.night .backbtn:hover,#qlz-app.night .sitem:hover{background:rgba(147,169,199,.12);color:var(--klein);}'+
    '#qlz-app.night .recal:hover{background:var(--zhu);color:#161A20;}'+
    '#qlz-app .sitem.danger{color:var(--burg);}'+
    '#qlz-app .sitem.danger:hover{background:rgba(168,68,62,.08);color:var(--zhu);}'+
    '#qlz-app .declare .narr{font-size:14px;}'+
    '@media(max-width:760px){'+
      '#qlz-app .chap{margin:10px 10px 0;padding:9px 10px;gap:7px;}'+
      '#qlz-app .chap .t b{font-size:14px;}'+
      '#qlz-app .chap .t i{font-size:7.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'+
      '#qlz-app .ico{width:30px;height:30px;flex:none;}'+
      '#qlz-app .side{width:70vw;max-width:258px;padding:14px 12px;}'+
      '#qlz-app .flow{margin:12px 10px 0;padding-left:13px;}'+
      /* 手机端气泡：贴紧红线，气泡整体加宽（左边距 14→4，红点间距 28→18） */
      '#qlz-app .act{margin:16px 0 16px 4px;padding:15px 13px 12px;}'+
      '#qlz-app .act::before{left:-18px;top:22px;}'+
      '#qlz-app .narr{font-size:14.5px;line-height:2.05;margin-bottom:18px;}'+
      '#qlz-app .pcmd{margin:16px 0 16px 4px;padding:9px 11px 7px;}'+
      '#qlz-app .pcmd::before{left:-22px;}'+
      '#qlz-app .inbar{margin:4px 10px 22px;gap:7px;}'+
      '#qlz-app .in{font-size:14px;padding:11px 12px;}'+
      '#qlz-app .go{padding:0 16px;letter-spacing:.15em;}'+
    '}'+
    '</style>';
  
    var chap = h('div','chap');
    chap.innerHTML = '<span class="no" id="qno">CH.01</span><div class="t"><b id="qtitle">加载中…</b><i id="qsub">QIANLVZHOU // REC</i></div>';
    /* 右上角只留汉堡菜单（夜间/字体入口在侧栏菜单里） */
    var burger = h('button','ico','☰');
    burger.onclick = function(){ toggleSide('r'); };
    chap.appendChild(burger);
    root.appendChild(chap);
  
    flow = h('div','flow'); root.appendChild(flow);
  
    var inbar = h('div','inbar');
    var input = h('input','in'); input.id='qin'; input.placeholder='今日欲行何事？';
    var go = h('button','go','呈报'); go.id='qgo';
    go.onclick = submit; input.onkeydown = function(e){ if(e.key==='Enter') submit(); };
    inbar.appendChild(input); inbar.appendChild(go); root.appendChild(inbar);
  
    // 右侧栏：菜单
    var r = h('div','side r'); r.id='qside-r';
    r.innerHTML = '<div class="st">系 统 · MENU</div>';
    var mToc = h('div','sitem','<span>目录</span><span class="arr">← 左侧展开</span>');
    mToc.onclick = function(){ toggleSide('l'); renderToc(); };
    var mNight = h('div','sitem','<span>日间 / 夜间</span><span class="arr">切换</span>');
    mNight.onclick = function(){ toggleNight(); };
    /* 字体调节：A－ / A＋ 各自独立、真实生效，有上下限（12px～19px） */
    var mFont = h('div','sitem','<span>字体大小</span><span style="display:flex;gap:6px;"><button class="op" id="qfminus">A－</button><button class="op" id="qfplus">A＋</button></span>');
    var mRound = h('div','sitem','<span>对话轮数</span><span class="arr" id="qround">— / —</span>');
    mRound.onclick = function(){ renderSys('本章进度：第 '+state.round+' 轮 / 上限 '+pack.maxRounds+' 轮　│　累计 '+Math.floor(state.stories.filter(function(m){return m.role==='user';}).length)+' 轮呈报'); };
    var mReset = h('div','sitem danger','<span>删档重来</span><span class="arr">清空全部存档</span>');
    mReset.onclick = function(){
      if(confirm('确认删档重来？\n\n全部剧情进度、好感度与对话记录将被清空，且无法恢复。')){
        resetAll(); location.reload();
      }
    };
    r.appendChild(mToc); r.appendChild(mNight); r.appendChild(mFont); r.appendChild(mRound); r.appendChild(mReset);
    r.insertAdjacentHTML('beforeend', favBoxHTML());  // 字符串须insertAdjacentHTML
  
    var back = h('button','backbtn','◂ 返回'); back.onclick = function(){ location.href='系统备份.html'; };
    r.appendChild(back);
    root.appendChild(r);
  
    /* 字体按钮绑定：直接从 mFont 里取（root 此时尚未挂进 document，不能用 getElementById） */
    var fminus = mFont.querySelector('#qfminus'), fplus = mFont.querySelector('#qfplus');
    if(fminus) fminus.onclick = function(ev){ ev.stopPropagation(); setFont(-1); };
    if(fplus)  fplus.onclick  = function(ev){ ev.stopPropagation(); setFont(1); };
  
    // 左侧栏：目录
    var l = h('div','side l'); l.id='qside-l';
    l.innerHTML = '<div class="st">目 录 · CATALOG</div><div id="qtoc"><div class="sitem dim"><span>章节包加载中</span></div></div>';
    root.appendChild(l);
  
    document.body.appendChild(root);
    // 点击外部收起
    document.addEventListener('click', function(e){
      ['qside-r','qside-l'].forEach(function(id){
        var p = document.getElementById(id);
        if(p && p.classList.contains('open') && !p.contains(e.target) && e.target.tagName!=='BUTTON') p.classList.remove('open');
      });
    }, true);
  }
  
  function favBoxHTML(){
    var st = stageOf(state.fav);
    var lvs = STAGES.map(function(s){ return '<span class="'+(s.name===st.name?'on':'')+'">'+s.min+'-'+s.max+' '+s.name+'</span>'; }).join('');
    return '<div class="favbox" id="qfavbox"><div class="favbig"><b id="qfavnum">'+state.fav+'</b><span id="qfavlv">'+st.name+'</span></div>'+
    '<div class="favbar"><i id="qfavfill" style="width:'+state.fav+'%"></i><span class="c1">0</span><span class="c2">100</span></div>'+
    '<div class="lvs" id="qlvs">'+lvs+'</div>'+
    '<button class="recal" id="qrecal">↻ 校准好感度<i>按下后后端 AI 参考当前剧情输出一次 · 不必每轮都算</i></button></div>';
  }
  function renderSeal(){
    var st = stageOf(state.fav);
    var n = document.getElementById('qfavnum'); if(n) n.textContent = state.fav;
    var l = document.getElementById('qfavlv'); if(l) l.textContent = st.name;
    var f = document.getElementById('qfavfill'); if(f) f.style.width = state.fav+'%';
    var box = document.getElementById('qfavbox');
    if(box){ box.outerHTML = favBoxHTML();
      var rc = document.getElementById('qrecal'); if(rc) rc.onclick = doCalibrate; }
  }
  function doCalibrate(){
    var b = document.getElementById('qrecal'); if(b){ b.disabled = true; b.innerHTML = '↻ 校准中…'; }
    calibrateFav().then(function(o){
      renderSeal(); renderSys('好感校准：'+state.fav+'（'+(o.delta>=0?'+':'')+(o.delta|0)+'）　│　'+(o.reason||''));
      if(b){ b.disabled=false; b.innerHTML='↻ 校准好感度<i>按下后后端 AI 参考当前剧情输出一次 · 不必每轮都算</i>'; }
    }).catch(function(e){ renderSys('校准失败：'+esc(e.message)); if(b){ b.disabled=false; b.innerHTML='↻ 校准好感度'; } });
  }
  function renderRound(){
    var e = document.getElementById('qround');
    if(e && pack) e.textContent = state.round + ' / ' + pack.maxRounds;
  }
  function toggleSide(which){
    /* 同时只允许一个侧栏展开——开这边，先收那边（防手机端双重覆盖） */
    var other = document.getElementById(which==='r'?'qside-l':'qside-r');
    if(other) other.classList.remove('open');
    var p = document.getElementById(which==='r'?'qside-r':'qside-l');
    if(p) p.classList.toggle('open');
  }
  function toggleNight(){
    var n = root.classList.toggle('night');
    try{ localStorage.setItem(K_THEME, JSON.stringify({value: n?'dark':'light'})); }catch(e){}
  }
  /* 字体大小：step=+1 放大 / -1 缩小，边界 12~19px，持久记忆 */
  function setFont(step){
    var f = document.querySelector('.flow'); if(!f) return;
    var cur = parseFloat(f.dataset.fs||'15');
    var next = Math.max(12, Math.min(19, cur + step*1.5));
    if(next===cur) return;
    f.dataset.fs = next;
    try{ localStorage.setItem('gzd_qlz_font', next); }catch(e){}
    f.querySelectorAll('.narr,.tx').forEach(function(e){ e.style.fontSize = next+'px'; });
  }
  function restoreFont(){
    var f = document.querySelector('.flow'); if(!f) return;
    var v = 15; try{ v = parseFloat(localStorage.getItem('gzd_qlz_font'))||15; }catch(e){}
    f.dataset.fs = v;
    f.querySelectorAll('.narr,.tx').forEach(function(e){ e.style.fontSize = v+'px'; });
  }
  function renderToc(){
    var t = document.getElementById('qtoc'); if(!t || !pack) return;
    var html = '';
    for(var i=1;i<=Math.max(state.ch, pack.id);i++){
      var cur = i===state.ch;
      html += '<div class="sitem '+(cur?'cur':'dim')+'"><span>第'+['一','二','三','四','五','六','七','八','九','十'][i-1]+'章 · '+(cur?pack.title:'未解锁')+'</span><span class="arr">'+(cur?'当前':i<state.ch?'✓':'锁')+'</span></div>';
    }
    t.innerHTML = html;
  }
  
  // ===== 流渲染 =====
  function fmt(text){
    // 长段流渲染：括号提示行高亮，其余整段
    var lines = esc(text).split(/\n+/);
    return lines.map(function(L){
      var t = L.trim();
      if(/^（.+）$/.test(t)) return '<div class="cue">'+t+'</div>';
      if(!t) return '';
      return '<p class="narr">'+t+'</p>';
    }).join('');
  }
  function renderAct(text, label, opts, isIntro){
    var a = h('div','act');
    var mh = h('div','mh');
    mh.innerHTML = '<span class="mn">'+(label||('ACT '+state.ch+'-'+state.round+' · 演出'))+'</span><span class="ops">'+(isIntro?'':'<button class="op">✎ 编辑</button><button class="op hot">↻ 重生成</button>')+'</span>';
    a.appendChild(mh);
    a.appendChild(h('div',null,fmt(text)));
    if(!isIntro){
      var ops = a.querySelectorAll('.op');
      ops[0].onclick = function(){ editAct(a); };
      ops[1].onclick = function(){ regenerate(a); };
    }
    flow.appendChild(a);
    scrollEnd();
    return a;
  }
  function makeOpts(list){
    var o = h('div','opts','<div class="ot"><b>◇</b> 走位参考 · 仅为建议，可自行呈报</div>');
    list.forEach(function(t){
      var b = h('button','opt', esc(t));
      b.onclick = function(){ var i=document.getElementById('qin'); i.value=t; i.focus(); };
      o.appendChild(b);
    });
    return o;
  }
  // 走位参考挂在演出卡内部底端（v2 写法），不再是独立版块
  function attachOpts(card, list){
    if(card && list && list.length){ card.appendChild(makeOpts(list)); lastOpts = list; }
  }
  function renderPcmd(text){
    var p = h('div','pcmd');
    p.innerHTML = '<div class="pl"><span>玩家 · 呈报</span><button class="op">✎</button></div><div class="tx">'+esc(text)+'</div>';
    flow.appendChild(p); scrollEnd();
    return p;
  }
  function renderSys(line){
    var s = h('div','sys','<span>'+line+'</span>');
    flow.appendChild(s); scrollEnd();
  }
  function scrollEnd(){ window.scrollTo({top:document.body.scrollHeight, behavior:'smooth'}); }
  function editAct(card){
    var n = card.querySelector('.narr, .tx');
    if(!n || card.dataset.editing) return;
    card.dataset.editing = '1';
    var ta = document.createElement('textarea');
    ta.style.cssText = 'width:100%;min-height:120px;font-family:inherit;font-size:13px;line-height:2;border:1.5px solid var(--klein);background:var(--bg);padding:8px;';
    ta.value = n.textContent;
    n.replaceWith(ta);
    var save = h('button','op','✓ 保存');
    save.style.cssText='margin:6px 0;';
    ta.after(save);
    save.onclick = function(){
      var np = h('div', n.className, esc(ta.value));
      ta.replaceWith(np); save.remove();
      delete card.dataset.editing;
    };
  }
  function regenerate(card){
    // 找到该卡前最近的玩家呈报作为输入，重演
    var prev = card.previousElementSibling, input = null;
    while(prev){ if(prev.classList.contains('pcmd')){ input = prev.querySelector('.tx').textContent.replace(/^>\s*/,''); break; } prev = prev.previousElementSibling; }
    if(!input){ renderSys('重生成失败：未找到对应呈报'); return; }
    // 回滚：从存档 stories 中删掉该轮，重发
    var idx = -1;
    for(var i=state.stories.length-1;i>=0;i--){ if(state.stories[i].role==='user' && state.stories[i].text.indexOf(input.slice(0,20))>=0){ idx=i; break; } }
    if(idx>=0) state.stories = state.stories.slice(0, idx);
    saveStory(state);
    card.style.opacity='.35';
    send(input, card);
  }
  
  // ===== 主流程 =====
  var DECLARATION = [
  '【千律州系统 · 演出声明】',
  '本模拟基于原著《业焰之国》第一章至第四章剧情架构搭建。你将扮演怀榆，由系统（我）与千律州世界共同为你演出。',
  '演出方式：在下方输入框呈报你的行动或对话，由系统生成长段演出。每轮附「走位参考」，仅为建议，可自行呈报任意行动。',
  '好感度：初始 10，分五阶段演进，影响角色态度与剧情分支。右侧栏可随时校准。',
  '剧情轨道：每章设必经节点与轮数上限，过程自由，主线节点会自然发生。存档自动进行，右侧栏可随时删档重来。',
  '——确认了解后，在下方输入「开始游戏」，第一章《'+'嗅骸与重启'+'》即刻开演。'
  ].join('\n');
  
  function beginFirstChapter(){
    var intro = (pack.locks||[]).filter(function(L){ return L.id==='C-1'; })[0];
    var text = intro ? intro.text : ('（第'+pack.id+'章 · '+pack.title+'）演出开始。');
    var card = renderAct(text, 'ACT '+pack.id+'-1 · 开场', null, false);
    /* 关键：开场白写进对话记忆，否则 AI 看不到自己播过什么，玩家首轮呈报必然接不上 */
    state.stories.push({role:'assistant', text:text});
    var firstNode = pack.mustNodes[0];
    attachOpts(card, pack.options[firstNode ? firstNode.id : '1a'] || []);
    state.started = true; saveStory(state); renderRound();
  }
  
  function submit(){
    var i = document.getElementById('qin'), go = document.getElementById('qgo');
    var text = i.value.trim();
    if(!text || busy) return;
    i.value=''; busy=true; go.disabled=true;
    // 开局拦截：演出声明之后，须输入「开始游戏」才进入第一章（同引渡人，不强买强卖）
    if(!state.started && state.stories.length===0){
      if(/^(开始游戏|开始|start)$/i.test(text.replace(/\s/g,''))){
        renderPcmd(text);
        beginFirstChapter();
        busy=false; go.disabled=false; return;
      }
      renderPcmd(text);
      renderSys('系统提示：请先输入「开始游戏」以开启第一章演出');
      busy=false; go.disabled=false; return;
    }
    renderPcmd(text);
    send(text, null, function(){ busy=false; go.disabled=false; });
  }
  function send(userText, replaceCard, done){
    var typing = h('div','typing','SYS · 演出生成中 ···'); flow.appendChild(typing); scrollEnd();
    buildAndCall(userText).then(function(res){
      typing.remove();
      if(replaceCard){ replaceCard.remove(); }
      var card = renderAct(res.parsed.text, null, null, false);
      attachOpts(card, res.parsed.opts);
      renderSys(res.sys.sysLine);
      // 存档
      state.stories.push({role:'user', text:userText});
      state.stories.push({role:'assistant', text:res.parsed.text});
      advance(res.parsed);
      renderSeal(); renderRound();
      if(res.sys.forced) renderSys('⚠ '+res.sys.forced);
      if(res.sys.transition) prepareTransition();
      if(done) done();
    }).catch(function(e){
      typing.remove();
      renderSys('演出中断：'+esc(e.message)+'　│　可重新呈报');
      if(done) done();
    });
  }
  function buildAndCall(userText){
    var forced = null;
    var left = pack.mustNodes.filter(function(n){ return state.nodes.indexOf(n.id)<0; });
    if(state.round >= pack.maxRounds - 3 && left.length)
      forced = '（系统强制任务弹窗：主线进度告急，请将剧情向【'+left[0].desc+'】引导，两轮内完成。）';
    return callAI(userText, forced).then(function(reply){
      var parsed = parseReply(reply, pack);
      return { parsed: parsed, sys: { sysLine:'', forced:null, transition:false } };
    });
  }
  function prepareTransition(){
    renderSys('本章必经节点全部达成 —— 呈报任意行动，演出将进入转场');
    state.nodes._transition = 1;
    saveStory(state);
  }
  // 转场后的下一轮：注入转场指令并切章
  var origBuild = buildAndCall;
  buildAndCall = function(userText){
    if(state.nodes._transition){
      state.nodes._transition = 0;
      var nextCh = state.ch + 1;
      return new Promise(function(res, rej){
        loadPack(nextCh, function(err, np){
          if(err){ rej(err); return; }
          var intro = '';
          (np.locks||[]).forEach(function(L){ if(L.id==='C-1') intro = L.text; });
          state.ch = nextCh; state.round = 0; state.nodes = []; state.summary = (state.summary||'') + '\n' + (pack.goal||'');
          pack = np; saveStory(state); renderChap(); renderToc();
          /* 新章开场白同样写进记忆，保证转场后衔接 */
          if(intro){ state.stories.push({role:'assistant', text:intro}); saveStory(state); }
          callAI(userText, null).then(function(reply){
            var parsed = parseReply(reply, np);
            var out = { parsed: parsed, sys:{ sysLine:'── 第'+nextCh+'章 · '+np.title+' ──', forced:null, transition:false } };
            state.round++; saveStory(state);
            res(out);
          }).catch(rej);
        });
      });
    }
    return origBuild(userText);
  };
  function renderChap(){
    document.getElementById('qno').textContent = 'CH.'+pad2(state.ch);
    document.getElementById('qtitle').textContent = pack.title;
    document.getElementById('qsub').textContent = 'QIANLVZHOU // '+pack.novelRef+' · REC';
  }
  
  // ===== 启动 =====
  function boot(){
    try{
    injectApp();
    if(document.body.classList.contains('night') || (function(){ try{return JSON.parse(localStorage.getItem(K_THEME)||'null').value==='dark';}catch(e){return false;} })())
      root.classList.add('night');
    loadPack(state.ch, function(err, p){
      if(err){ document.getElementById('qtitle').textContent = '章节包加载失败'; renderSys('加载失败：'+esc(err.message)+'　│　请确认 chapters/ 目录可访问'); return; }
      pack = p; renderChap(); renderToc(); renderSeal(); renderRound();
      if(!state.stories.length){
        // 首次：只播演出声明，玩家输入「开始游戏」后才开演（同引渡人，不强买强卖）
        var dc = renderAct(DECLARATION, 'SYS · 声明', null, true);
        dc.classList.add('declare');
      } else {
        // 续档：回放最近一轮
        state.started = true;
        var last = state.stories[state.stories.length-1];
        var lastCard = null;
        if(last && last.role==='assistant') lastCard = renderAct(last.text, 'ACT '+state.ch+'-'+state.round+' · 回放', null, false);
        attachOpts(lastCard, lastOpts.length ? lastOpts : (pack.options[pack.mustNodes[0].id]||[]));
      }
      restoreFont();
    });
    }catch(err){
      try{
        var d=document.createElement('div');
        d.style.cssText='position:fixed;left:0;right:0;bottom:0;background:#300;color:#fbb;font:11px/1.4 monospace;padding:8px;white-space:pre-wrap;z-index:99999;';
        d.textContent='[BOOT-ERR] '+(err&&err.stack||err);
        (document.body||document.documentElement).appendChild(d);
      }catch(_){}
    }
  }
  /* 章节包自动兜底：页面没引用时，按候选路径动态加载（TA 换名/换目录也不怕） */
  function ensurePacks(cb){
    if(window.QLZ_PACKS){ cb(); return; }
    var paths = ['章节包/章节包1.js','章节包1.js','章节包/章节包.js','chapters/章节包.js'];
    var i = 0;
    (function next(){
      if(i >= paths.length){ cb(); return; }   /* 全失败 → 走 fetch 兜底 */
      var s = document.createElement('script');
      s.src = paths[i++];
      s.onload = function(){ if(window.QLZ_PACKS) cb(); else next(); };
      s.onerror = next;
      document.head.appendChild(s);
    })();
  }
  var __origBoot = boot;
  boot = function(){ ensurePacks(function(){ __origBoot(); }); };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  
  // 暴露（调试/壳联动）
  window.__QLZ_SIM__ = { reset: resetAll, calibrate: doCalibrate, state: function(){ return state; } };
  })();
  