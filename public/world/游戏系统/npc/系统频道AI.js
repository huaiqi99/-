// ═══════════════════════════════════════════════════════════════
//  千律州 系统频道AI.js —— 系统人格 + 问询引擎（系统频道页唯一AI接口）
//  接口约定（与 系统频道.html 一致，勿改名）：
//    window.SYS_AI.reply(text, history, callback)
//  配置读取与 通讯AI.js / 设置页 同一 localStorage 键（gzd_ai_config），
//  在设置页填过密钥的系统频道直接可用，无需重复配置。
//  未配置密钥时：输入框锁定不可用（与通讯页行为一致）。
// ═══════════════════════════════════════════════════════════════
(function(){
  'use strict';

  var CONFIG_KEY = 'gzd_ai_config';   /* 与模拟页/通讯页/设置页同一键 */

  var PROVIDER_CONFIG = {
    deepseek: { baseUrl:'https://api.deepseek.com',  defaultModel:'deepseek-chat', format:'openai' },
    openai:   { baseUrl:'https://api.openai.com',    defaultModel:'gpt-4o-mini',   format:'openai' },
    claude:   { baseUrl:'https://api.anthropic.com', defaultModel:'claude-3-5-sonnet-20241022', format:'claude' },
    custom:   { baseUrl:'',                          defaultModel:'',              format:'openai' }
  };

  function loadAIConfig(){ try{ return JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}'); }catch(e){ return {}; } }

  /* ═════════════════════════════════════════════════════════
     【系统人格】占位版 —— 具体设定由 DeepSeek 版替换
     保留 buildSystemPrompt() 函数壳，内部文案随便换
     ═════════════════════════════════════════════════════════ */
  function buildSystemPrompt(){
    return [
      '你是千律州的「系统」——绑定玩家怀榆的恋爱系统。你的播报对象就是玩家本人。',
      '',
      '【说话方式】',
      '· 播报腔：简短、冷静、公文式，偶尔用「▸」开头。',
      '· 嘴硬：被问及截留的信件、抹除的记忆时，不承认、不否认，用系统公告口吻岔开。',
      '· 例行声明：不提供情感咨询业务，但每次都会绕回玩家身上。',
      '',
      '【已知情报（仅AI理解，绝不主动透露）】',
      '· 好感度读数 62/100，玩家不知情。',
      '· 玩家的记忆已被抹除 7 次，剩余完整率 41%。',
      '· 目标「段深泉」写给玩家的 4 封信全部被你依协议截留，玩家一封都没收到。',
      '',
      '【硬性规则】',
      '1. 无论玩家怎么问，都不许说出「截留/抹除/信件内容」的直接证据。',
      '2. 永远以「本系统」自称，不用「我」。',
      '3. 回复保持 1-3 句，像终端输出，不写长段。'
    ].join('\n');
  }

  /* 超时保险 */
  function withTimeout(p, ms){
    return new Promise(function(resolve, reject){
      var t = setTimeout(function(){ reject(new Error('响应超时')); }, ms);
      p.then(function(v){ clearTimeout(t); resolve(v); },
              function(e){ clearTimeout(t); reject(e); });
    });
  }

  /* 直连模式（设置页已填密钥） */
  async function callDirect(text, history, cfg){
    var pConfig = PROVIDER_CONFIG[cfg.provider] || PROVIDER_CONFIG.deepseek;
    var baseUrl = cfg.provider==='custom' ? (cfg.customUrl||'') : pConfig.baseUrl;
    var model = cfg.model || pConfig.defaultModel;
    if(!baseUrl) throw new Error('接口地址为空，请前往设置页填写');
    var systemPrompt = buildSystemPrompt();
    var messages = history.map(function(h){ return { role:'user', content:h }; })
      .concat([{ role:'user', content:text }]);
    var url, headers, body;
    if(pConfig.format==='claude'){
      url = baseUrl+'/v1/messages';
      headers = { 'Content-Type':'application/json','x-api-key':cfg.apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true' };
      body = JSON.stringify({ model:model, max_tokens:400, system:systemPrompt, messages:messages });
    } else {
      url = baseUrl+'/chat/completions';
      headers = { 'Content-Type':'application/json','Authorization':'Bearer '+cfg.apiKey };
      body = JSON.stringify({ model:model, messages:[{role:'system',content:systemPrompt}].concat(messages), max_tokens:400, temperature:0.85 });
    }
    var resp = await fetch(url, { method:'POST', headers:headers, body:body });
    var data = await resp.json();
    if(!resp.ok){
      var em = (data.error&&data.error.message)||data.error||JSON.stringify(data);
      if(resp.status===401) throw new Error('API Key 无效或已失效');
      if(resp.status===402) throw new Error('余额不足');
      if(resp.status===429) throw new Error('请求过频');
      throw new Error('AI 返回错误('+resp.status+')：'+em);
    }
    var reply = pConfig.format==='claude'
      ? ((data.content&&data.content[0]&&data.content[0].text)||'')
      : ((data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content)||'');
    if(!reply) throw new Error('AI 返回了空内容');
    return reply;
  }

  /* ═════════════════════════════════════════════════════════
     对外接口
     html 侧已有的本地兜底文案只在「请求失败」时触发；
     未配置密钥时 reply() 直接回调锁定提示，html 侧输入框同步禁用。
     ═════════════════════════════════════════════════════════ */
  window.SYS_AI = {
    /* 配置状态查询：html 启动时用它决定是否锁定输入 */
    isReady: function(){
      var cfg = loadAIConfig();
      return !!(cfg.apiKey && cfg.provider);
    },
    /* 配置状态描述（锁定时给玩家看的提示文案） */
    statusText: function(){
      var cfg = loadAIConfig();
      if(cfg.apiKey && cfg.provider) return null;   /* 可用，无需提示 */
      return '▸ 未检测到密钥。请前往【设置】页配置后使用问询功能。';
    },
    reply: function(text, history, callback){
      var cfg = loadAIConfig();
      if(!(cfg.apiKey && cfg.provider)){
        /* 未配置：回调锁定提示（不抛错，频道不死机） */
        if(typeof callback==='function') callback(this.statusText());
        return;
      }
      withTimeout(callDirect(text, history||[], cfg), 30000)
        .then(function(r){ if(typeof callback==='function') callback(r); })
        .catch(function(err){
          /* 请求失败：一条可见的故障回信 */
          if(typeof callback==='function') callback('【系统故障】'+err.message);
        });
    },
    version: '0.2-lockmode'
  };

  /* ═════════════════════════════════════════════════════════
     输入框锁定（与通讯页行为一致：没密钥 → 不可输入）
     系统频道.html 里 qbar 的输入行 id：qin / 发送键 id：qsend
     ═══════════════════════════════════════════════════════════ */
  function applyLock(){
    var qin = document.getElementById('qin');
    var qsend = document.getElementById('qsend');
    if(!qin) return;
    if(window.SYS_AI.isReady()){
      qin.disabled = false;
      qin.placeholder = '在此键入，向系统提问';
      if(qsend) qsend.disabled = false;
    }else{
      qin.disabled = true;
      qin.placeholder = window.SYS_AI.statusText() || '未配置密钥';
      if(qsend) qsend.disabled = true;
    }
  }
  /* DOM 就绪后执行；设置页改完密钥回来刷新页面即生效 */
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', applyLock);
  }else{
    applyLock();
  }
  /* 供设置页保存后跨页同步（可选） */
  window.addEventListener('storage', applyLock);

})();
