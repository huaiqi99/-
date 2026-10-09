// ===== 千律州 回忆AI.js · 回忆线引擎 v1 =====
// 与主线完全独立：独立存档、独立对话记忆、独立喂料。
// 主线（模拟AI.js）演到触发点 → 调 start(id, done) → 进回忆
// → 玩家与回忆AI对话 → 演完（AI输出<回忆完>或轮数耗尽）→ done() 回主线。
// 素材来自 回忆剧本.js（window.QLZ_MEM），想改回忆内容只改那个文件。
(function(){
    'use strict';
    
    var WORKER_URL = 'https://difu-ai.2629885225.workers.dev';
    var PROFILE    = 'qlz_mem';            // Worker 侧回忆线档案标识
    var K_MEM      = 'gzd_qlz_mem';        // 独立存档键（与主线 gzd_qlz_* 隔离）
    var MAX_HISTORY = 8;
    
    var cur = null;        // 当前回忆包
    var onEnd = null;      // 回忆结束后的回调（回主线）
    var playing = false;   // 回忆进行中标记
    var busy = false;
    
    // ===== 存档 =====
    function loadMem(){
      try{ var d = JSON.parse(localStorage.getItem(K_MEM)); if(d && d.played) return d; }catch(e){}
      return { played:[], stories:{} };
    }
    function saveMem(d){ try{ localStorage.setItem(K_MEM, JSON.stringify(d)); }catch(e){} }
    
    // ===== UI 小工具（复用主线的全局样式类，只加回忆专属皮肤） =====
    function h(tag, cls, html){
      var e = document.createElement(tag);
      if(cls) e.className = cls;
      if(html !== undefined) e.innerHTML = html;
      return e;
    }
    function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
    function flow(){ return document.querySelector('#qlz-app .flow'); }
    function scrollEnd(){
      var f = flow(); if(f) f.scrollTop = f.scrollHeight;
      window.scrollTo(0, document.body.scrollHeight);
    }
    function sysLine(t){
      var f = flow(); if(!f) return;
      var e = h('div','typing', esc(t)); f.appendChild(e); scrollEnd();
    }
    function renderMemAct(text){
      var f = flow(); if(!f) return;
      var card = h('div','act mem');
      card.appendChild(h('div','at','MEM · 回忆 · ' + (cur ? cur.title : '')));
      var body = h('div','body');
      String(text).split(/\n\n+/).forEach(function(p){
        if(p.trim()) body.appendChild(h('p','narr', esc(p)));
      });
      card.appendChild(body);
      f.appendChild(card); scrollEnd();
    }
    function renderPlayer(text){
      var f = flow(); if(!f) return;
      var card = h('div','pcmd mem');
      card.appendChild(h('div','pcmd-at','玩家 · 怀榆（四年前）'));
      card.appendChild(h('div','tx', esc(text)));
      f.appendChild(card); scrollEnd();
    }
    function attachOpts(list){
      if(!list || !list.length) return;
      var f = flow(); if(!f) return;
      var box = h('div','opts');
      box.appendChild(h('div','opts-at','◈ 走位参考 · 仅为建议'));
      list.forEach(function(o){
        var b = h('button','opt', esc(o));
        b.onclick = function(){
          var inp = document.getElementById('qin');
          if(inp){ inp.value = o; }
          window.__QLZ_MEM__.submit();
        };
        box.appendChild(b);
      });
      var last = f.querySelector('.act:last-child, .act.mem:last-child');
      if(last) last.appendChild(box); else f.appendChild(box);
      scrollEnd();
    }
    function setPlaceholder(t){
      var i = document.getElementById('qin');
      if(i) i.placeholder = t;
    }
    
    // ===== 回忆AI 协议 =====
    function buildSystem(){
      var m = cur;
      return [
        '【千律州回忆协议】',
        '你专职演出玩家（怀榆）四年前的一段固定回忆。玩家扮演年轻的怀榆，你演出回忆里的世界、系统与他人。',
        '文风：网文长段流——叙述段落为主，对白用引号嵌在段落内，段落之间空行。严禁剧本分行、严禁角色名前置标签、严禁列表化正文。',
        '第二人称"你"指代怀榆。系统"我"偶尔吐槽。',
        '──【往事剧本】──',
        m.brief || '',
        '──【节拍表·按顺序演】──',
        m.beats.map(function(b,i){ return (i+1)+'. '+b; }).join('\n'),
        '每轮推进且仅推进一拍；玩家行动不影响节拍顺序，跑偏时用剧情内的话术自然拉回。',
        '──【硬规矩】──',
        m.rules || '',
        '全部节拍演完（到达结束条件：'+(m.exit||'剧情自然收束')+'）时，在正文最后单独一行输出<回忆完></回忆完>，随后不再接受任何演出。',
        '每轮回复固定格式：正文长段 + （括号场景提示，可选）。不要输出好感度、不要输出状态块、不要输出主线相关内容。'
      ].join('\n');
    }
    function callMem(userText){
      var st = loadMem();
      var hist = (st.stories[cur.id]||[]).slice(-MAX_HISTORY);
      var messages = hist.map(function(m){ return {role:m.role, content:m.text}; });
      /* 优先用设置页密钥（与主线/引渡人共享配置），没填走 Worker 兜底 */
      var cfg = {};
      try{ cfg = JSON.parse(localStorage.getItem('gzd_ai_config')||'{}'); }catch(e){}
      if(cfg.apiKey && cfg.provider){
        var PC = {
          deepseek:{baseUrl:'https://api.deepseek.com',defaultModel:'deepseek-chat'},
          openai:{baseUrl:'https://api.openai.com',defaultModel:'gpt-4o-mini'},
          claude:{baseUrl:'https://api.anthropic.com',defaultModel:'claude-3-5-sonnet-20241022',format:'claude'},
          custom:{baseUrl:'',defaultModel:''}
        };
        var pc = PC[cfg.provider] || PC.deepseek;
        var baseUrl = cfg.provider==='custom' ? (cfg.customUrl||'') : pc.baseUrl;
        var model = cfg.model || pc.defaultModel;
        if(!baseUrl) return Promise.reject(new Error('接口地址为空，请前往设置页填写'));
        var full = [{role:'system', content:buildSystem()}].concat(messages, [{role:'user', content:userText}]);
        var url, headers, body;
        if(pc.format==='claude'){
          url = baseUrl+'/v1/messages';
          headers = {'Content-Type':'application/json','x-api-key':cfg.apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'};
          body = JSON.stringify({model:model,max_tokens:900,system:buildSystem(),messages:full.slice(1)});
        } else {
          url = baseUrl+'/v1/chat/completions';
          headers = {'Content-Type':'application/json','Authorization':'Bearer '+cfg.apiKey};
          body = JSON.stringify({model:model,messages:full,max_tokens:900,temperature:0.8});
        }
        return fetch(url,{method:'POST',headers:headers,body:body}).then(function(r){
          return r.json().then(function(d){
            if(!r.ok){
              var em = (d.error&&d.error.message)||d.error||JSON.stringify(d);
              throw new Error('AI 返回错误('+r.status+'):'+em);
            }
            var reply = pc.format==='claude' ? ((d.content&&d.content[0]&&d.content[0].text)||'') : ((d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content)||'');
            if(!reply) throw new Error('回忆AI 返回了空内容');
            return reply;
          });
        });
      }
      return fetch(WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json'},
        body: JSON.stringify({message:userText, profile:PROFILE, history:messages, system:buildSystem()})
      }).then(function(r){ return r.json(); }).then(function(d){
        if(!r.ok || d.error) throw new Error(d.error || ('HTTP '+r.status));
        if(!d.reply) throw new Error('回忆AI 返回了空内容');
        return d.reply;
      });
    }
    
    // ===== 触发与流程 =====
    function pick(nodes){
      if(playing || !window.QLZ_MEM) return null;
      var st = loadMem();
      var order = Object.keys(window.QLZ_MEM);
      for(var i=0;i<order.length;i++){
        var m = window.QLZ_MEM[order[i]];
        if(!m || !m.anchor) continue;
        if(st.played.indexOf(m.id) >= 0) continue;
        if(nodes.indexOf(m.anchor) >= 0) return m.id;
      }
      return null;
    }
    
    function start(id, done){
      var m = window.QLZ_MEM && window.QLZ_MEM[id];
      if(!m){ if(done) done(); return; }
      cur = m; onEnd = done || function(){}; playing = true; busy = false;
      sysLine('── 回忆 · ' + m.title + ' ──');
      renderMemAct(m.opening);
      attachOpts(m.openingOpts || ['跟上系统的话头', '四处张望，先搞清状况', '跟系统搭话']);
      // 开场演出写进回忆对话记忆，回忆AI才知道演到哪
      var st = loadMem();
      if(!(st.stories[m.id] && st.stories[m.id].length)){
        st.stories[m.id] = [{role:'assistant', text:m.opening}];
        saveMem(st);
      }
      setPlaceholder('（回忆中 · 四年前）今日欲行何事？');
      try{ window.__QLZ_SIM__ && window.__QLZ_SIM__.lockInput(true); }catch(e){}
    }
    
    function finish(){
      var st = loadMem();
      if(st.played.indexOf(cur.id) < 0){ st.played.push(cur.id); saveMem(st); }
      sysLine('── 回忆结束 · 回到现在 ──');
      playing = false; busy = false;
      setPlaceholder('今日欲行何事？');
      try{ window.__QLZ_SIM__ && window.__QLZ_SIM__.lockInput(false); }catch(e){}
      var cb = onEnd; onEnd = null; cur = null;
      if(cb) cb();
    }
    
    function submit(){
      if(!playing || busy) return;
      var i = document.getElementById('qin');
      var text = (i && i.value || '').trim();
      if(!text){ return; }
      if(i) i.value = '';
      busy = true;
      renderPlayer(text);
      var st = loadMem();
      st.stories[cur.id] = (st.stories[cur.id]||[]);
      st.stories[cur.id].push({role:'user', text:text});
      saveMem(st);
      var typing = h('div','typing','MEM · 回忆生成中 ···');
      flow().appendChild(typing); scrollEnd();
      callMem(text).then(function(reply){
        typing.remove();
        var doneTag = /<回忆完>\s*<\/回忆完>|<回忆完>/.test(reply);
        var body = reply.replace(/<回忆完>[\s\S]*?<\/回忆完>|<回忆完>/g,'').trim();
        var opts = [];
        reply.replace(/<建议>([\s\S]*?)<\/建议>/, function(_, j){
          try{ var a = JSON.parse(j.trim()); if(Array.isArray(a)) opts = a.slice(0,3); }catch(e){}
          return '';
        });
        body = body.replace(/<建议>[\s\S]*?<\/建议>/g,'').trim();
        renderMemAct(body);
        st.stories[cur.id].push({role:'assistant', text:body});
        saveMem(st);
        if(doneTag){
          finish();
        } else {
          attachOpts(opts);
          busy = false;
        }
      }).catch(function(e){
        typing.remove();
        sysLine('回忆中断：'+e.message+'（重新输入再试）');
        // 撤回这条玩家输入，允许重试
        st.stories[cur.id].pop(); saveMem(st);
        busy = false;
      });
    }
    
    // ===== 回忆卡专属皮肤（朱砂左边线+暗纹，和主线卡一眼区分） =====
    (function injectStyle(){
      var css = ''+
        '#qlz-app .act.mem{border-left-color:var(--burg);background:repeating-linear-gradient(-45deg,transparent,transparent 9px,rgba(168,68,62,.03) 9px,rgba(168,68,62,.03) 18px);}'+
        '#qlz-app .act.mem .at{color:var(--burg);}'+
        '#qlz-app .pcmd.mem{border-left-color:var(--klein);}';
      var s = document.createElement('style');
      s.textContent = css;
      document.head.appendChild(s);
    })();
    
    // 暴露给主线引擎（模拟AI.js 只调这三个接口）
    window.__QLZ_MEM__ = {
      pick:   function(nodes){ return pick(nodes); },
      start:  function(id, done){ start(id, done); },
      submit: function(){ submit(); },
      active: function(){ return playing; }
    };
    })();
    