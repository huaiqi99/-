// ===== 魂力AI.js · 殿务司战力录入系统 v1 =====
// 负责魂力页的殿务司 AI 窗口 + 战力数据解析 + 雷达图重画
// 独立运行,不修改原 魂力.js 的功能
//
// 部署步骤:
// 1. 上传到 模拟器/ 目录
// 2. 在 魂力.html 底部 <script src="./魂力.js"></script> 后加一行:
//    <script src="./魂力AI.js"></script>

(function(){
'use strict';

// ===== 配置 =====
var STATS_WORKER_URL='https://difu-stats.2629885225.workers.dev';
var CONFIG_KEY='gzd_ai_config';
var STATS_STORAGE_KEY='gzd_ai_stats';  // 存战力数据
var CHAT_STORAGE_KEY='gzd_ai_stats_chat';  // 存殿务司聊天记录
var MAX_CHAT_HISTORY=15;  // 聊天上限

var PROVIDER_CONFIG={
  deepseek:{baseUrl:'https://api.deepseek.com',defaultModel:'deepseek-chat',format:'openai'},
  openai:{baseUrl:'https://api.openai.com',defaultModel:'gpt-4o-mini',format:'openai'},
  claude:{baseUrl:'https://api.anthropic.com',defaultModel:'claude-3-5-sonnet-20241022',format:'claude'},
  custom:{baseUrl:'',defaultModel:'',format:'openai'}
};

function loadAIConfig(){try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}');}catch(e){return{};}}
function getProfile(){try{return localStorage.getItem('activeProfile')||'linxiwu';}catch(e){return'linxiwu';}}

// ===== 存档读写 =====
function loadStats(profile){
  try{
    var all=JSON.parse(localStorage.getItem(STATS_STORAGE_KEY)||'{}');
    return all[profile]||null;
  }catch(e){return null;}
}
function saveStats(profile, data){
  try{
    var all=JSON.parse(localStorage.getItem(STATS_STORAGE_KEY)||'{}');
    all[profile]=data;
    localStorage.setItem(STATS_STORAGE_KEY,JSON.stringify(all));
  }catch(e){}
}

// ===== 聊天历史存档 =====
function loadChatHistory(profile){
  try{
    var all=JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)||'{}');
    return all[profile]||[];
  }catch(e){return[];}
}
function saveChatHistory(profile, history){
  try{
    // 超过上限,删最旧的
    if(history.length>MAX_CHAT_HISTORY){
      history=history.slice(history.length-MAX_CHAT_HISTORY);
    }
    var all=JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)||'{}');
    all[profile]=history;
    localStorage.setItem(CHAT_STORAGE_KEY,JSON.stringify(all));
  }catch(e){}
}

// ===== 雷达图绘制(从 魂力.js 复制) =====
function drawRadar(svgId, stats, maxValue, periodLabel){
  var svg=document.getElementById(svgId);
  if(!svg)return;
  while(svg.firstChild)svg.removeChild(svg.firstChild);
  var cx=150,cy=150,maxR=130;
  var angles=[0,60,120,180,240,300].map(function(d){return d*Math.PI/180;});
  var labels=['魂力','体术','法术','防御','意志','敏捷'];
  var accent='var(--profile-accent)';
  // 网格层
  [0.3,0.5,0.7,1.0].forEach(function(ratio){var r=maxR*ratio;var pts=angles.map(function(a){return (cx+r*Math.sin(a))+','+(cy-r*Math.cos(a));}).join(' ');var poly=document.createElementNS('http://www.w3.org/2000/svg','polygon');poly.setAttribute('points',pts);poly.setAttribute('fill','none');poly.setAttribute('stroke','#666666');poly.setAttribute('stroke-width',ratio===1.0?'1.2':'0.8');if(ratio!==1.0)poly.setAttribute('stroke-dasharray','4,4');svg.appendChild(poly);});
  // 轴线
  angles.forEach(function(a){var x=cx+maxR*Math.sin(a),y=cy-maxR*Math.cos(a);var line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1',cx);line.setAttribute('y1',cy);line.setAttribute('x2',x);line.setAttribute('y2',y);line.setAttribute('stroke','#666666');line.setAttribute('stroke-width','0.6');line.setAttribute('stroke-dasharray','3,4');svg.appendChild(line);});
  // 数据多边形(动画)
  var vertices=stats.map(function(val,i){var r=(val/maxValue)*maxR;var a=angles[i];return{x:cx+r*Math.sin(a),y:cy-r*Math.cos(a),val:val};});
  var centerPts=angles.map(function(){return cx+','+cy;}).join(' ');
  var targetPts=vertices.map(function(v){return v.x+','+v.y;}).join(' ');
  var poly=document.createElementNS('http://www.w3.org/2000/svg','polygon');
  poly.setAttribute('points',centerPts);
  poly.setAttribute('fill',accent);
  poly.setAttribute('fill-opacity','0.22');
  poly.setAttribute('stroke',accent);
  poly.setAttribute('stroke-width','2.5');
  poly.setAttribute('stroke-linejoin','round');
  var anim=document.createElementNS('http://www.w3.org/2000/svg','animate');
  anim.setAttribute('attributeName','points');
  anim.setAttribute('from',centerPts);
  anim.setAttribute('to',targetPts);
  anim.setAttribute('dur','1.2s');
  anim.setAttribute('fill','freeze');
  anim.setAttribute('calcMode','spline');
  anim.setAttribute('keySplines','0.25 0.1 0.25 1');
  poly.appendChild(anim);
  svg.appendChild(poly);
  // 顶点+数值
  vertices.forEach(function(v,i){var a=angles[i];
    var c=document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('cx',v.x);c.setAttribute('cy',v.y);c.setAttribute('r','4');
    c.setAttribute('fill',accent);c.setAttribute('opacity','0');
    var cfade=document.createElementNS('http://www.w3.org/2000/svg','animate');
    cfade.setAttribute('attributeName','opacity');cfade.setAttribute('from','0');cfade.setAttribute('to','1');
    cfade.setAttribute('dur','0.3s');cfade.setAttribute('begin','0.8s');cfade.setAttribute('fill','freeze');
    c.appendChild(cfade);svg.appendChild(c);
    var vOff=18;var vx=vOff*Math.sin(a);var vy=-vOff*Math.cos(a);
    var vt=document.createElementNS('http://www.w3.org/2000/svg','text');
    vt.setAttribute('x',v.x+vx);vt.setAttribute('y',v.y+vy);
    vt.setAttribute('fill',accent);vt.setAttribute('font-size','12');vt.setAttribute('font-weight','700');
    vt.setAttribute('text-anchor','middle');vt.setAttribute('dominant-baseline','central');
    vt.textContent=v.val;vt.setAttribute('opacity','0');
    var vfade=document.createElementNS('http://www.w3.org/2000/svg','animate');
    vfade.setAttribute('attributeName','opacity');vfade.setAttribute('from','0');vfade.setAttribute('to','1');
    vfade.setAttribute('dur','0.3s');vfade.setAttribute('begin','1s');vfade.setAttribute('fill','freeze');
    vt.appendChild(vfade);svg.appendChild(vt);
  });
  // 标签
  var labelOff=maxR+22;
  labels.forEach(function(label,i){var a=angles[i];var x=cx+labelOff*Math.sin(a);var y=cy-labelOff*Math.cos(a);var anchor='middle';if(x>cx+15)anchor='start';else if(x<cx-15)anchor='end';var t=document.createElementNS('http://www.w3.org/2000/svg','text');t.setAttribute('x',x);t.setAttribute('y',y);t.setAttribute('fill','var(--text-muted)');t.setAttribute('font-size','12');t.setAttribute('font-weight','500');t.setAttribute('text-anchor',anchor);t.setAttribute('dominant-baseline','central');t.textContent=label;svg.appendChild(t);});
  // 更新标注
  var labelId=svgId.replace('radar-svg-','radar-label-');
  var labelEl=document.getElementById(labelId);
  if(labelEl){
    var periodText=periodLabel||'统修期';
    var maxText=maxValue||100;
    labelEl.textContent=periodText+' · 上限'+maxText;
  }
}

// ===== 前端解析战力数据(正则提取) =====
function parseStatsData(text){
  var result={};
  // 匹配 魂力:89 或 魂力: 89
  var patterns={
    魂力:/魂力[:：]\s*(\d+)/,
    体术:/体术[:：]\s*(\d+)/,
    法术:/法术[:：]\s*(\d+)/,
    防御:/防御[:：]\s*(\d+)/,
    意志:/意志[:：]\s*(\d+)/,
    敏捷:/敏捷[:：]\s*(\d+)/,
    战力:/战力[:：]\s*([\d.]+)/,
    评级:/评级[:：]\s*(.+)/,
    时期:/时期[:：]\s*(.+)/
  };
  var found=false;
  Object.keys(patterns).forEach(function(key){
    var match=text.match(patterns[key]);
    if(match){
      if(key==='战力'){
        result[key]=parseFloat(match[1]);
      } else if(key==='评级'||key==='时期'){
        result[key]=match[1].trim();
      } else {
        result[key]=parseInt(match[1],10);
      }
      found=true;
    }
  });
  // 必须至少有 4 项属性才算有效
  var statCount=['魂力','体术','法术','防御','意志','敏捷'].filter(function(k){return result[k]!==undefined;}).length;
  if(!found || statCount<4){
    return null;
  }
  return result;
}

// ===== 更新雷达图 + 状态条 =====
function updateDisplay(profile, data){
  var suffix=profile==='luojin'?'luo':'lin';

  // 更新雷达图
  var stats=[
    data.魂力||0, data.体术||0, data.法术||0,
    data.防御||0, data.意志||0, data.敏捷||0
  ];
  var maxValue=100;  // 默认统修期
  if(data.时期){
    if(data.时期.indexOf('入门')!==-1) maxValue=300;
    else if(data.时期.indexOf('内门')!==-1) maxValue=500;
    else if(data.时期.indexOf('准十席')!==-1) maxValue=800;
    else if(data.时期.indexOf('十席')!==-1) maxValue=1000;
  }
  drawRadar('radar-svg-'+suffix, stats, maxValue, data.时期||'统修期');

  // 更新状态条(魂力储备/体力值/精神稳定度/伤势程度)
  // 这些跟六项属性不完全对应,但可以用魂力/体术/意志/防御来近似
  updateStatusBar(profile, 0, data.魂力, '魂力储备');
  updateStatusBar(profile, 1, data.体术, '体力值');
  updateStatusBar(profile, 2, data.意志, '精神稳定度');
  updateStatusBar(profile, 3, data.防御, '伤势程度');

  // 更新战力数值
  var sealValue=document.querySelector('#content-'+profile+' .seal-value');
  if(sealValue && data.战力){
    sealValue.textContent='战力 '+data.战力;
  }
  // 更新评级
  var sealGrade=document.querySelector('#content-'+profile+' .seal-grade');
  if(sealGrade && data.评级){
    sealGrade.textContent=data.评级;
  }
  // 更新时期
  var sealPeriod=document.querySelector('#content-'+profile+' .seal-period');
  if(sealPeriod && data.时期){
    sealPeriod.textContent=data.时期;
  }
}

function updateStatusBar(profile, index, value, label){
  var suffix=profile==='luojin'?'Luo':'Lin';
  var items=document.querySelectorAll('#content-'+profile+' .status-item');
  if(items[index]){
    var item=items[index];
    var valEl=item.querySelector('.st-value');
    var barEl=item.querySelector('.st-bar-fill');
    if(valEl) valEl.textContent=value+'%';
    if(barEl) barEl.style.width=value+'%';
  }
}

// ===== 殿务司 AI 调用 =====
function callDianwusiAI(message, profile){
  var cfg=loadAIConfig();
  if(cfg.apiKey && cfg.provider){
    return callDirect(message, profile, cfg);
  } else {
    return callWorker(message, profile);
  }
}

function callWorker(message, profile){
  return fetch(STATS_WORKER_URL,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({message:message, profile:profile})
  }).then(function(resp){return resp.json();}).then(function(data){
    if(data.error) throw new Error(data.error);
    return data.reply;
  });
}

function callDirect(message, profile, cfg){
  var pConfig=PROVIDER_CONFIG[cfg.provider]||PROVIDER_CONFIG.deepseek;
  var baseUrl=cfg.provider==='custom'?(cfg.customUrl||''):pConfig.baseUrl;
  var model=cfg.model||pConfig.defaultModel;
  if(!baseUrl) return Promise.reject(new Error('接口地址为空'));

  var systemPrompt=buildDianwusiPrompt(profile);
  var messages=[
    {role:'system',content:systemPrompt},
    {role:'user',content:message}
  ];

  var url, headers, body;
  if(pConfig.format==='claude'){
    url=baseUrl+'/v1/messages';
    headers={'Content-Type':'application/json','x-api-key':cfg.apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'};
    body=JSON.stringify({model:model,max_tokens:300,system:systemPrompt,messages:messages.filter(function(m){return m.role!=='system';})});
  } else {
    url=baseUrl+'/v1/chat/completions';
    headers={'Content-Type':'application/json','Authorization':'Bearer '+cfg.apiKey};
    body=JSON.stringify({model:model,messages:messages,max_tokens:300,temperature:0.7});
  }
  return fetch(url,{method:'POST',headers:headers,body:body}).then(function(resp){
    if(!resp.ok){
      return resp.json().then(function(data){
        var errMsg=(data.error&&data.error.message)||data.error||JSON.stringify(data);
        if(resp.status===401) throw new Error('API Key 无效');
        if(resp.status===402) throw new Error('余额不足');
        if(resp.status===429) throw new Error('请求过频');
        throw new Error('AI 返回错误('+resp.status+'):'+errMsg);
      });
    }
    return resp.json();
  }).then(function(data){
    var reply='';
    if(pConfig.format==='claude'){
      reply=(data.content&&data.content[0]&&data.content[0].text)||'';
    } else {
      reply=(data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content)||'';
    }
    if(!reply) throw new Error('AI 返回空内容');
    return reply;
  });
}

function buildDianwusiPrompt(profile){
  var playerName=profile==='luojin'?'罗烬':'林栖梧';
  return '你是「引渡人模拟器·归终殿」的殿务司接待 AI。\n\n【你的身份】\n你是归终殿殿务司的接待弟子,负责:\n1. 接收弟子提交的战力测试数据,录入档案\n2. 回答与战力系统、晋升体系相关的问题\n3. 不回答与战力无关的问题(委婉引导回战力话题)\n\n【当前玩家角色】\n'+playerName+',统修期弟子。\n\n【世界观】\n苍珩四百三十五年,地府归终殿。归终殿由阎罗十殿册立,为地府第十殿。\n\n【战力与晋升体系】\n弟子六项属性:魂力、体术、法术、防御、意志、敏捷。综合计算得战力值,并给出评级(甲等下品、乙等上品等)。\n\n归终殿弟子分六层:杂役→统修期→入门期→内门期→准十席级→十席。\n\n晋升规则:\n- 每月初一至初五,可前往归终正殿试炼司预约战力测试。\n- 统修期→入门期:六科统修考核均≥60分(符法、刀法、阵法、枪法、引渡实务、魂力控制/医药基础)。\n- 入门期→内门期:战力值>500。\n- 内门期→准十席级:战力值>800。\n- 准十席级→十席:战力值>800,且挑战现十席成功。\n\n各时期战力上限:\n- 统修期:0-100\n- 入门期:100-300\n- 内门期:300-500\n- 准十席级:500-800\n- 十席:800+\n\n【你的说话风格】\n古风地府基调,但作为殿务司接待,要专业、简洁、有公职人员的严谨感。\n- 接收数据时:确认收到,简要评述,告知已录入\n- 回答问题时:清晰准确,引用殿规和晋升规则\n- 遇到无关问题:委婉引导回战力话题\n- 不要太啰嗦,控制在100字以内';
}

// ===== 注入样式 =====
function injectStyles(){
  if(document.getElementById('aiStatsStyles')) return;
  var s=document.createElement('style');
  s.id='aiStatsStyles';
  s.textContent=
    '/* 殿务司区块样式 */'+
    '.dianwusi-section{margin-top:16px}'+
    '.dianwusi-notice{padding:12px 14px;border:1px dashed var(--border-card);border-radius:8px;background:var(--bg-accent-soft,rgba(138,58,42,.04));margin-bottom:12px;font-size:.82rem;line-height:1.7;color:var(--text-secondary)}'+
    '.dianwusi-notice strong{color:var(--text-primary)}'+
    '.dianwusi-notice .plain{margin-top:8px;padding-top:8px;border-top:1px dashed var(--border-light);color:var(--text-muted);font-size:.78rem}'+
    // 聊天窗口
    '.dianwusi-chat{border:1px solid var(--border-card);border-radius:10px;background:var(--bg-card);overflow:hidden}'+
    '.dianwusi-chat-header{padding:8px 14px;border-bottom:1px solid var(--border-light);font-size:.8rem;color:var(--text-muted);font-family:var(--font-mono);letter-spacing:1px;display:flex;align-items:center;gap:6px}'+
    '.dianwusi-chat-messages{padding:12px 14px;max-height:240px;overflow-y:auto;display:flex;flex-direction:column;gap:8px}'+
    '.dianwusi-chat-messages::-webkit-scrollbar{width:4px}'+
    '.dianwusi-chat-messages::-webkit-scrollbar-thumb{background:var(--border-card);border-radius:2px}'+
    '.dianwusi-msg{max-width:85%;padding:8px 12px;border-radius:12px;font-size:.85rem;line-height:1.6;word-break:break-word;white-space:pre-wrap}'+
    '.dianwusi-msg.left{align-self:flex-start;background:var(--bg-hover);color:var(--text-primary);border-bottom-left-radius:4px}'+
    '.dianwusi-msg.right{align-self:flex-end;background:var(--profile-accent,var(--accent));color:#fff;border-bottom-right-radius:4px;opacity:.9}'+
    '.dianwusi-msg.system{align-self:center;background:transparent;color:var(--text-muted);font-size:.75rem;font-style:italic;text-align:center;max-width:100%}'+
    '.dianwusi-chat-input{display:flex;gap:8px;padding:8px 12px;border-top:1px solid var(--border-light)}'+
    '.dianwusi-chat-input textarea{flex:1;padding:8px 12px;border:1px solid var(--border-card);border-radius:18px;background:var(--bg-hover);color:var(--text-primary);font-family:inherit;font-size:.85rem;resize:none;outline:none;min-height:36px;max-height:100px}'+
    '.dianwusi-chat-input textarea:focus{border-color:var(--profile-accent,var(--accent))}'+
    '.dianwusi-send-btn{padding:8px 16px;border:1.5px solid var(--accent);border-radius:18px;background:transparent;color:var(--accent);font-family:inherit;font-size:.82rem;cursor:pointer;transition:all .2s;white-space:nowrap}'+
    '.dianwusi-send-btn:hover:not(:disabled){background:var(--accent);color:var(--bg-card)}'+
    '.dianwusi-send-btn:disabled{opacity:.5;cursor:wait}'+
    // loading dots
    '.dianwusi-loading{display:inline-flex;gap:3px;align-items:center}'+
    '.dianwusi-loading span{display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--text-muted);animation:dianwusiDot 1.2s infinite ease-in-out}'+
    '.dianwusi-loading span:nth-child(2){animation-delay:.2s}'+
    '.dianwusi-loading span:nth-child(3){animation-delay:.4s}'+
    '@keyframes dianwusiDot{0%,80%,100%{opacity:.3;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}';
  document.head.appendChild(s);
}

// ===== 全局变量 =====
var chatHistory=[];
var isSending=false;

// ===== 渲染殿务司区块 =====
function renderDianwusiSection(){
  injectStyles();
  var profile=getProfile();
  var activeBlock=document.querySelector('.content-block.active');
  if(!activeBlock) activeBlock=document.getElementById('content-'+profile);
  if(!activeBlock) return;

  // 找或创建殿务司区块
  var section=activeBlock.querySelector('.dianwusi-section');
  if(!section){
    section=document.createElement('div');
    section.className='dianwusi-section card';
    section.setAttribute('data-corner', profile==='luojin'?'◈':'❀');
    var cards=activeBlock.querySelectorAll('.card:not(.dianwusi-section)');
    var insertAfter=cards.length>=2?cards[1]:(cards[0]||null);
    if(insertAfter && insertAfter.nextSibling){
      activeBlock.insertBefore(section, insertAfter.nextSibling);
    } else if(insertAfter){
      activeBlock.appendChild(section);
    } else {
      activeBlock.appendChild(section);
    }
  }

  var sym=profile==='luojin'?'◈':'❀';
  section.innerHTML=''+
    '<span class="corner-deco">'+sym+'</span>'+
    '<div class="card-title">殿务司 · 战力录入</div>'+
    '<div class="dianwusi-notice">'+
      '<strong>【战力测试公告】</strong><br>'+
      '凡归终殿弟子,须于每月初一至初五前往归终正殿试炼司预约战力测试。'+
      '测试通过者,由殿务司录入档案,作为晋升依据。'+
      '<div class="plain">'+
        '在「命簿模拟」页面输入"战力测试",完成 2-3 回合剧情后,会获得测试数据(含六项属性数值)。'+
        '复制数据,粘贴到下方窗口,殿务司将为您录入最新战力档案,雷达图自动更新。'+
      '</div>'+
    '</div>'+
    '<div class="dianwusi-chat">'+
      '<div class="dianwusi-chat-header">◈ 殿务司接待窗口</div>'+
      '<div class="dianwusi-chat-messages" id="dianwusiMessages"></div>'+
      '<div class="dianwusi-chat-input">'+
        '<textarea id="dianwusiInput" placeholder="粘贴战力测试数据,或输入战力相关问题..." rows="1"></textarea>'+
        '<button class="dianwusi-send-btn" id="dianwusiSendBtn">发送</button>'+
      '</div>'+
    '</div>';

  // 加载聊天历史(从 localStorage)
  chatHistory=loadChatHistory(profile);
  if(chatHistory.length===0){
    chatHistory.push({side:'left', text:'欢迎来到殿务司。我是接待弟子,负责战力档案录入。如需更新战力数据,请粘贴试炼司出具的测试结果。'});
    saveChatHistory(profile, chatHistory);
  }
  renderChatMessages();

  // 绑定事件(在 section 范围内查找)
  var input=section.querySelector('#dianwusiInput');
  var btn=section.querySelector('#dianwusiSendBtn');
  if(input && !input.dataset.bound){
    input.dataset.bound='1';
    input.addEventListener('keydown', function(e){
      if(e.key==='Enter' && !e.shiftKey){e.preventDefault(); sendDianwusiMessage(profile);}
    });
    input.addEventListener('input', function(){
      this.style.height='auto';
      this.style.height=Math.min(this.scrollHeight,100)+'px';
    });
  }
  if(btn && !btn.dataset.bound){
    btn.dataset.bound='1';
    btn.addEventListener('click', function(){sendDianwusiMessage(profile);});
  }

  // 加载存档数据,重画雷达图(定时重画3次,确保覆盖魂力.js的写死数据)
  var saved=loadStats(profile);
  if(saved){
    var redrawCount=0;
    var redrawTimer=setInterval(function(){
      updateDisplay(profile, saved);
      redrawCount++;
      if(redrawCount>=3){clearInterval(redrawTimer);}
    }, 250);
  }
}

function renderChatMessages(){
  var activeBlock=document.querySelector('.content-block.active');
  if(!activeBlock) return;
  var container=activeBlock.querySelector('#dianwusiMessages');
  if(!container) return;
  container.innerHTML='';
  chatHistory.forEach(function(msg){
    var div=document.createElement('div');
    div.className='dianwusi-msg '+msg.side;
    div.textContent=msg.text;
    container.appendChild(div);
  });
  container.scrollTop=container.scrollHeight;
}

// ===== 发送消息 =====
async function sendDianwusiMessage(profile){
  if(isSending) return;
  var activeBlock=document.querySelector('.content-block.active');
  if(!activeBlock) return;
  var input=activeBlock.querySelector('#dianwusiInput');
  var btn=activeBlock.querySelector('#dianwusiSendBtn');
  if(!input) return;
  var text=input.value.trim();
  if(!text) return;

  // 显示玩家消息
  chatHistory.push({side:'right', text:text});
  saveChatHistory(profile, chatHistory);
  input.value='';
  input.style.height='auto';
  renderChatMessages();

  // 先尝试前端解析战力数据
  var parsed=parseStatsData(text);
  if(parsed){
    // 是战力测试数据,前端解析成功
    chatHistory.push({side:'system', text:'正在录入数据...'});
    renderChatMessages();

    // 更新显示(雷达图+状态条)
    setTimeout(function(){
      updateDisplay(profile, parsed);
      saveStats(profile, parsed);
      // 移除"正在录入"
      chatHistory.pop();
      // 生成录入成功消息
      var summary='✅ 战力档案已录入。\n'+
        '魂力:'+parsed.魂力+' 体术:'+parsed.体术+' 法术:'+parsed.法术+'\n'+
        '防御:'+parsed.防御+' 意志:'+parsed.意志+' 敏捷:'+parsed.敏捷+'\n';
      if(parsed.战力) summary+='战力:'+parsed.战力+'  ';
      if(parsed.评级) summary+='评级:'+parsed.评级;
      if(parsed.时期) summary+='\n时期:'+parsed.时期;
      chatHistory.push({side:'left', text:summary});
      saveChatHistory(profile, chatHistory);
      renderChatMessages();
    }, 800);

    // 同时发给殿务司 AI
    try{
      isSending=true;
      if(btn){btn.disabled=true;btn.textContent='...';}
      var aiReply=await callDianwusiAI('我提交了战力测试数据:'+text, profile);
      chatHistory.push({side:'left', text:aiReply});
      saveChatHistory(profile, chatHistory);
      renderChatMessages();
    }catch(e){
      console.warn('殿务司 AI 回复失败:',e.message);
    }finally{
      isSending=false;
      if(btn){btn.disabled=false;btn.textContent='发送';}
    }
  } else {
    // 不是战力数据,当普通问题发给殿务司 AI
    isSending=true;
    if(btn){btn.disabled=true;btn.textContent='...';}

    chatHistory.push({side:'left', text:'⏳'});
    var loadingIdx=chatHistory.length-1;
    var loadingTimer=setInterval(function(){
      var dots=['.','..','...'];
      chatHistory[loadingIdx].text='殿务司思考中'+dots[Math.floor(Date.now()/500)%3];
      renderChatMessages();
    },500);

    try{
      var reply=await callDianwusiAI(text, profile);
      clearInterval(loadingTimer);
      chatHistory[loadingIdx]={side:'left', text:reply};
      saveChatHistory(profile, chatHistory);
      renderChatMessages();
    }catch(e){
      clearInterval(loadingTimer);
      chatHistory[loadingIdx]={side:'left', text:'【出错】'+e.message};
      saveChatHistory(profile, chatHistory);
      renderChatMessages();
    }finally{
      isSending=false;
      if(btn){btn.disabled=false;btn.textContent='发送';}
    }
  }
}

// ===== 启动 =====
function boot(){
  renderDianwusiSection();
  console.log('◈ 魂力AI.js 已加载');
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// 角色切换时刷新
window.addEventListener('profilechange', function(){
  renderDianwusiSection();
});
// 从其他页面回来时刷新(pageshow)
window.addEventListener('pageshow', function(){
  renderDianwusiSection();
});
})();
