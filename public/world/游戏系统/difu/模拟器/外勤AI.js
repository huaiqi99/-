// ===== 外勤AI.js · 引渡人模拟器外勤任务引擎 v1 =====
// 负责调用 quest-worker,生成任务、执行剧情、完成回执
// 独立运行,不修改原 外勤.js 的功能
//
// 部署步骤:
// 1. 上传到 模拟器/ 目录
// 2. 在 外勤.html 底部 <script src="./外勤.js"></script> 后加一行:
//    <script src="./外勤AI.js"></script>

(function(){
'use strict';

// ===== 配置 =====
// ★★★ 把这行换成你的 quest Worker 地址 ★★★
var QUEST_WORKER_URL='https://difu-quest.2629885225.workers.dev';

var CONFIG_KEY='gzd_ai_config';
var AI_QUEST_KEY='gzd_ai_quests';        // AI 生成的任务存档
var AI_QUEST_LOG_KEY='gzd_ai_quest_log';  // 外勤日志
var AI_QUEST_RECEIPT_KEY='gzd_ai_quest_receipt';  // 给模拟页的回执摘要
var AI_QUEST_REFRESH_KEY='gzd_ai_quest_refresh';  // 每日刷新次数

var MAX_DAILY_REFRESH=3;
var MAX_LOG_ENTRIES=6;  // 外勤日志最多保留 6 条

// 各服务商配置(直连模式用)
var PROVIDER_CONFIG={
  deepseek:{baseUrl:'https://api.deepseek.com',defaultModel:'deepseek-chat',format:'openai'},
  openai:{baseUrl:'https://api.openai.com',defaultModel:'gpt-4o-mini',format:'openai'},
  claude:{baseUrl:'https://api.anthropic.com',defaultModel:'claude-3-5-sonnet-20241022',format:'claude'},
  custom:{baseUrl:'',defaultModel:'',format:'openai'}
};

function loadAIConfig(){try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}');}catch(e){return{};}}

// ===== 存档读写 =====
function loadAIQuests(profile){
  try{
    var all=JSON.parse(localStorage.getItem(AI_QUEST_KEY)||'{}');
    return all[profile]||[];
  }catch(e){return[];}
}
function saveAIQuests(profile, quests){
  try{
    var all=JSON.parse(localStorage.getItem(AI_QUEST_KEY)||'{}');
    all[profile]=quests;
    localStorage.setItem(AI_QUEST_KEY,JSON.stringify(all));
  }catch(e){}
}
function loadQuestLog(profile){
  try{
    var all=JSON.parse(localStorage.getItem(AI_QUEST_LOG_KEY)||'{}');
    return all[profile]||[];
  }catch(e){return[];}
}
function saveQuestLog(profile, log){
  try{
    // 超过上限的,删掉最旧的(数组开头)
    if(log.length>MAX_LOG_ENTRIES){
      log=log.slice(log.length-MAX_LOG_ENTRIES);
    }
    var all=JSON.parse(localStorage.getItem(AI_QUEST_LOG_KEY)||'{}');
    all[profile]=log;
    localStorage.setItem(AI_QUEST_LOG_KEY,JSON.stringify(all));
  }catch(e){}
}
function loadReceipt(profile){
  try{
    var all=JSON.parse(localStorage.getItem(AI_QUEST_RECEIPT_KEY)||'{}');
    return all[profile]||null;
  }catch(e){return null;}
}
function saveReceipt(profile, receipt){
  try{
    var all=JSON.parse(localStorage.getItem(AI_QUEST_RECEIPT_KEY)||'{}');
    all[profile]=receipt;
    localStorage.setItem(AI_QUEST_RECEIPT_KEY,JSON.stringify(all));
  }catch(e){}
}
function getRefreshCount(){
  try{
    var data=JSON.parse(localStorage.getItem(AI_QUEST_REFRESH_KEY)||'{}');
    var today=new Date().toDateString();
    if(data.date!==today) return 0;
    return data.count||0;
  }catch(e){return 0;}
}
function incRefreshCount(){
  try{
    var today=new Date().toDateString();
    var data=JSON.parse(localStorage.getItem(AI_QUEST_REFRESH_KEY)||'{}');
    if(data.date!==today){data={date:today,count:0};}
    data.count=(data.count||0)+1;
    localStorage.setItem(AI_QUEST_REFRESH_KEY,JSON.stringify(data));
  }catch(e){}
}

// ===== 当前角色 =====
function getProfile(){
  try{return localStorage.getItem('activeProfile')||'linxiwu';}catch(e){return'linxiwu';}
}

// ===== 调用 AI(双模式:直连 或 Worker) =====
function callQuestAI(action, params){
  var cfg=loadAIConfig();
  if(cfg.apiKey && cfg.provider){
    return callDirect(action, params, cfg);
  } else {
    return callWorker(action, params);
  }
}

// 模式 1:Worker 兜底
function callWorker(action, params){
  var body={action:action, profile:getProfile()};
  Object.assign(body, params||{});
  return fetch(QUEST_WORKER_URL,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)
  }).then(function(resp){return resp.json();}).then(function(data){
    if(data.error) throw new Error(data.error);
    return data.data;
  });
}
function callDirect(action, params, cfg){
  var pConfig=PROVIDER_CONFIG[cfg.provider]||PROVIDER_CONFIG.deepseek;
  var baseUrl=cfg.provider==='custom'?(cfg.customUrl||''):pConfig.baseUrl;
  var model=cfg.model||pConfig.defaultModel;
  if(!baseUrl) return Promise.reject(new Error('接口地址为空,请前往设置页填写'));

  // 根据 action 构造 prompt
  var systemPrompt='', userMessage='';
  if(action==='generate'){
    systemPrompt=buildGeneratePrompt(getProfile());
    // 如果有排除列表,告诉 AI 避开
    var excludeStr='';
    if(params.excludeTitles && params.excludeTitles.length>0){
      excludeStr='\n\n【已生成过的任务,请避开以下主题,不要重复】\n'+params.excludeTitles.join('、');
    }
    userMessage='请生成 3 个适合当前玩家角色的外勤任务,严格按照 JSON 格式输出。'+excludeStr;
  } else if(action==='execute'){
    systemPrompt=buildExecutePrompt(getProfile());
    userMessage='任务信息:\n任务名:'+(params.questName||'')+'\n委托人:'+(params.client||'')+'\n地点:'+(params.location||'')+'\n难度:'+(params.difficulty||'')+'\n描述:'+(params.description||'')+'\n\n请生成玩家执行这个任务的剧情,200-400字,以第二人称"你"叙述。只输出剧情文字,不要输出 JSON。';
  } else if(action==='complete'){
    systemPrompt=buildCompletePrompt(getProfile());
    userMessage='任务信息:\n任务名:'+(params.questName||'')+'\n委托人:'+(params.client||'')+'\n地点:'+(params.location||'')+'\n难度:'+(params.difficulty||'')+'\n描述:'+(params.description||'')+'\n执行剧情:'+(params.narrative||'')+'\n\n请生成任务结果和回执单,严格按照 JSON 格式输出。';
  }

  var messages=[
    {role:'system',content:systemPrompt},
    {role:'user',content:userMessage}
  ];

  var url, headers, body;
  if(pConfig.format==='claude'){
    url=baseUrl+'/v1/messages';
    headers={'Content-Type':'application/json','x-api-key':cfg.apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'};
    body=JSON.stringify({model:model,max_tokens:2000,system:systemPrompt,messages:messages.filter(function(m){return m.role!=='system';})});
  } else {
    url=baseUrl+'/v1/chat/completions';
    headers={'Content-Type':'application/json','Authorization':'Bearer '+cfg.apiKey};
    body=JSON.stringify({model:model,messages:messages,max_tokens:2000,temperature:0.85});
  }

  return fetch(url,{method:'POST',headers:headers,body:body}).then(function(resp){
    if(!resp.ok){
      return resp.json().then(function(data){
        var errMsg=(data.error&&data.error.message)||data.error||JSON.stringify(data);
        if(resp.status===401) throw new Error('API Key 无效或已失效,请前往设置页检查');
        if(resp.status===402) throw new Error('AI 服务商余额不足,请前往充值');
        if(resp.status===429) throw new Error('请求过于频繁,请稍后再试');
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
    if(!reply) throw new Error('AI 返回了空内容,请重试');

    // 解析返回
    if(action==='generate'){
      return parseQuestList(reply);
    } else if(action==='execute'){
      return {narrative:reply.trim()};
    } else if(action==='complete'){
      return parseCompleteResult(reply);
    }
  });
}

// ===== Prompt 构造(直连模式用,与后端一致) =====
function buildGeneratePrompt(profile){
  var playerName=profile==='luojin'?'罗烬':'林栖梧';
  var playerDesc=profile==='luojin'
    ?'罗烬:讲武堂弟子,承刀法一脉,罗修与魏元璟之子。性情刚直果决咋咋呼呼。当前层级:统修期。'
    :'林栖梧:符修院助教,身负浮生树血脉,林淮与栾方棋之女。性情内敛重情,擅符箓与感知。当前层级:统修期,评级甲等下品。';
  return '你是「引渡人模拟器·归终殿」的外勤任务生成 AI。\n\n【当前玩家角色】\n'+playerDesc+'\n\n【世界观】\n苍珩四百三十五年,地府归终殿执掌亡魂引渡与功过裁定。殿辖符修院、讲武堂、音律坊与忘川东段。归终殿由阎罗十殿正式册立,为地府第十殿。殿内引渡人行走阴阳,引渡亡魂。如今已有弟子两千余人。\n\n【主要地点】\n\n首席：罗修\n第二席：林淮\n第三、第四席：未公开（暂未设定，不代表没有）\n第五席：栾方棋\n第六席：暂未公开\n第七席：魏元璟\n第八、第九、第十：未公开（暂未设定，不代表没有）\n退役：程木栖（前二席）、蔡可（前十席）\n主要地点】归终殿中枢——正殿、试炼司、殿务司所在。\n符修院——栾方棋坐镇,以符箓之术传授弟子,院内女弟子居多。\n讲武堂——罗修执教,主修刀法，魂术，其余武功杂学皆在此修习,弟子对罗修又敬又怕。\n点苍阁——林淮执掌,主修枪法，体术指导。弟子多是想成为林淮那样的人的。\n音律坊——程木栖主理,主修琴音破阵之术，魏元璟副理，主修笛渡魂之术,由于程木栖忙于栖梧馆，如今音律课多由魏元璟代上。\n砺峰阁——魏元璟主掌，是归终殿魂力与冥想的核心院阁，同时也负责每个新入门的统修期弟子的体能训练。\n忘川东段——魂流汇聚之地,弟子常在此处实习引渡。\n人间——引渡人的实战场地，常面临穷凶极恶的恶鬼、妖邪等。\n栖梧馆——程木栖开设的医馆,弟子受伤后首选之地。\n浮生巨树（正式命：灵枢轮回木）——栾方棋与林淮血脉滋养的神树,本为天庭神器，后认主栾方棋与林淮，现在是归终殿的镇殿之宝,树下是弟子休憩聊天独处的常去之地。\n浑天鉴——位于人间皇室、重要中枢、各大地区皆有设定。是人间用于联系地府的地方，遇到涉及阴阳的棘手事会直接联系到归终殿。\n阵法堂——由第三席执掌，专攻阵法与符阵的实战应用。\n工造司——由第四席执掌，负责归终殿兵器锻造与维修。\n澄心堂——第六席执掌，专攻剑修与剑法传承。\n百草堂——第八席执掌，专攻用毒与药理，与栖梧馆深度合作\n\n【主要NPC】\n栾方棋——符修院执教,第一符修,林栖梧生父之一。温和好说话但内心吐槽役。\n林淮——第二席,第一枪修,林栖梧生父之一。冷面寡言但极护短,深度路痴。\n罗修——首席引渡人,讲武堂执教,罗烬之父。玩世不恭但最护短,刀修。\n魏元璟——第七席,罗烬之母。砺峰阁主理,擅魂术与体术。\n程木栖——栖梧馆主事,前第二席。温和端方但偷懒看话本,十指尽废转修医道。\n\n【战力与晋升体系】\n弟子分六层:杂役→统修期→入门期→内门期→准十席级→十席。\n统修期弟子六科:符法、刀法、阵法、枪法、引渡实务、魂力控制/医药基础。\n统修期→入门期:六科考核均≥60分。\n\n【殿规】\n不可轻视杂役;不可对十席不敬;晋升须经正规测试。\n\n【你的任务】\n为当前玩家('+playerName+')生成 3 个适合其等级(统修期)的外勤任务。\n\n任务类型可以包括:\n- 日常差事(如:清理、整理、值守、教学辅助)\n- 外勤任务(如:巡逻、引渡、押运、勘查)\n- 特殊委托(如:NPC 个人委托、紧急任务)\n\n任务难度分:简单、中等、偏难(统修期弟子不宜超过"偏难")。\n\n【输出格式】\n必须严格输出以下 JSON 格式,不要输出任何其他文字(不要输出 markdown 代码块标记):\n\n{\n  "quests": [\n    {\n      "id": "quest_1",\n      "title": "任务名称",\n      "dept": "所属部门",\n      "issuer": "委托人姓名",\n      "location": "任务地点",\n      "difficulty": "简单/中等/偏难",\n      "reward": "奖励内容",\n      "description": "任务描述(30-60字)"\n    },\n    ... 共3个\n  ]\n}\n\n【重要约束】\n1. 必须输出纯 JSON,不要用代码块包裹\n2. 3 个任务的类型要有差异\n3. 奖励要合理,符合统修期弟子的水平\n4. 委托人如果是 NPC,要符合该 NPC 的身份和性格\n5. 任务描述要简洁有力,有地府古风氛围';
}

function buildExecutePrompt(profile){
  var playerDesc=profile==='luojin'
    ?'罗烬:讲武堂弟子,承刀法一脉,罗修与魏元璟之子。性情刚直果决咋咋呼呼。当前层级:统修期。'
    :'林栖梧:符修院助教,身负浮生树血脉,林淮与栾方棋之女。性情内敛重情,擅符箓与感知。当前层级:统修期,评级甲等下品。';
  return '你是「引渡人模拟器·归终殿」的外勤执行剧情 AI。\n\n【当前玩家角色】\n'+playerDesc+'\n\n【世界观】\n苍珩四百三十五年,地府归终殿执掌亡魂引渡与功过裁定。殿辖符修院、讲武堂、音律坊与忘川东段。\n\n【风格要求】\n古风地府基调,第二人称"你"叙述。200-400字。善用细节与氛围,不要直白抒情。\n描写玩家执行任务的过程:到达地点、遇到的情况、采取的行动。\n不要替玩家做重大决定,只描述过程。结尾留白,不要写任务结果。\n\n【重要约束】\n1. 永远用第二人称"你"来叙述\n2. 不要替玩家做决定,只描述环境和过程\n3. 如果任务有战斗元素,用文字描述战斗过程\n4. 只输出剧情文字,不要输出 JSON 或其他格式';
}

function buildCompletePrompt(profile){
  var playerName=profile==='luojin'?'罗烬':'林栖梧';
  var playerDesc=profile==='luojin'
    ?'罗烬:讲武堂弟子,承刀法一脉,罗修与魏元璟之子。性情刚直果决咋咋呼呼。当前层级:统修期。'
    :'林栖梧:符修院助教,身负浮生树血脉,林淮与栾方棋之女。性情内敛重情,擅符箓与感知。当前层级:统修期,评级甲等下品。';
  return '你是「引渡人模拟器·归终殿」的外勤任务结果 AI。\n\n【当前玩家角色】\n'+playerDesc+'\n\n【世界观】\n苍珩四百三十五年,地府归终殿执掌亡魂引渡与功过裁定。\n\n【风格要求】\n古风地府基调,200字以内的结果描述。\n\n【你的任务】\n根据任务信息和执行剧情,生成任务结果和回执单。\n\n结果判定规则:\n- 简单任务:大概率成功(90%)\n- 中等任务:大概率成功(70%),小概率部分成功\n- 偏难任务:成功/部分成功/失败都有可能\n- 结果要符合剧情逻辑\n\n【输出格式】\n必须严格输出以下 JSON 格式,不要输出任何其他文字:\n\n{\n  "result": "成功" 或 "部分成功" 或 "失败",\n  "resultNarrative": "结果剧情描述(100-200字)",\n  "rewards": "实际获得的奖励",\n  "receipt": "回执单文字(50-100字)",\n  "receiptForSim": "给模拟页AI的简短摘要(30-50字)"\n}\n\n【重要约束】\n1. 必须输出纯 JSON,不要用代码块包裹\n2. result 必须是"成功""部分成功""失败"三者之一\n3. receipt 是正式回执,格式工整\n4. receiptForSim 是给模拟页AI看的简短摘要';
}

// ===== JSON 解析(容错) =====
function parseQuestList(text){
  var jsonStr=text.replace(/```json\s*/g,'').replace(/```\s*/g,'');
  var first=jsonStr.indexOf('{'), last=jsonStr.lastIndexOf('}');
  if(first!==-1&&last!==-1) jsonStr=jsonStr.substring(first,last+1);
  try{
    var data=JSON.parse(jsonStr);
    if(data.quests&&Array.isArray(data.quests)) return {quests:data.quests};
    return {quests:[],raw:text};
  }catch(e){
    return {quests:[],raw:text,error:'JSON解析失败: '+e.message};
  }
}

function parseCompleteResult(text){
  var jsonStr=text.replace(/```json\s*/g,'').replace(/```\s*/g,'');
  var first=jsonStr.indexOf('{'), last=jsonStr.lastIndexOf('}');
  if(first!==-1&&last!==-1) jsonStr=jsonStr.substring(first,last+1);
  try{
    var data=JSON.parse(jsonStr);
    return {
      result:data.result||'成功',
      resultNarrative:data.resultNarrative||'',
      rewards:data.rewards||'',
      receipt:data.receipt||'',
      receiptForSim:data.receiptForSim||''
    };
  }catch(e){
    return {
      result:'成功',
      resultNarrative:text,
      rewards:'',
      receipt:'',
      receiptForSim:'',
      error:'JSON解析失败: '+e.message
    };
  }
}

// ===== HTML 转义 =====
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ===== 注入 CSS =====
function injectStyles(){
  if(document.getElementById('aiQuestStyles')) return;
  var s=document.createElement('style');
  s.id='aiQuestStyles';
  s.textContent=
    '/* AI 任务区块样式 */'+
    '.ai-quest-section{margin-bottom:20px}'+
    '.ai-quest-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px}'+
    '.ai-quest-header .title{font-size:.85rem;color:var(--text-muted);letter-spacing:2px;font-family:var(--font-mono);display:flex;align-items:center;gap:6px}'+
    '.ai-quest-header .title .sym{color:var(--profile-accent,var(--accent));font-size:1rem}'+
    '.ai-quest-refresh-btn{padding:6px 14px;border:1.5px solid var(--accent);border-radius:18px;background:transparent;color:var(--accent);font-family:var(--font-mono);font-size:.75rem;cursor:pointer;transition:all .2s;white-space:nowrap}'+
    '.ai-quest-refresh-btn:hover:not(:disabled){background:var(--accent);color:var(--bg-card)}'+
    '.ai-quest-refresh-btn:disabled{opacity:.5;cursor:wait}'+
    '.ai-quest-refresh-count{font-size:.65rem;color:var(--text-muted);font-family:var(--font-mono);margin-left:4px}'+

    // 任务卡片列表
    '.ai-quest-list{display:flex;flex-direction:column;gap:10px}'+
    '.ai-quest-card{padding:14px 16px;border:1px solid var(--border-card);border-radius:10px;background:var(--bg-card);transition:all .2s;cursor:pointer;position:relative}'+
    '.ai-quest-card:hover{border-color:var(--profile-accent,var(--accent));box-shadow:0 2px 8px rgba(0,0,0,.06)}'+
    '.ai-quest-card.accepted{border-color:var(--profile-accent,var(--accent));background:var(--bg-hover)}'+
    '.ai-quest-card.completed{opacity:.5;pointer-events:none}'+
    '.ai-quest-card .q-title{font-size:.95rem;font-weight:600;color:var(--text-primary);margin-bottom:6px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}'+
    '.ai-quest-card .q-diff{font-size:.65rem;padding:1px 8px;border-radius:8px;font-family:var(--font-mono);letter-spacing:.5px}'+
    '.ai-quest-card .q-diff.简单{background:rgba(80,140,80,.12);color:#5a8a5a}'+
    '.ai-quest-card .q-diff.中等{background:rgba(200,160,60,.12);color:#9a7a2a}'+
    '.ai-quest-card .q-diff.偏难{background:rgba(160,64,64,.12);color:#a04040}'+
    '.ai-quest-card .q-meta{font-size:.72rem;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:6px;line-height:1.6}'+
    '.ai-quest-card .q-desc{font-size:.85rem;color:var(--text-secondary);line-height:1.6;margin-bottom:8px}'+
    '.ai-quest-card .q-reward{font-size:.75rem;color:var(--profile-accent,var(--accent));font-family:var(--font-mono)}'+
    '.ai-quest-card .q-status{font-size:.65rem;color:var(--text-muted);font-style:italic}'+

    // 任务详情/执行区
    '.ai-quest-detail{padding:16px;border:1px solid var(--border-card);border-radius:10px;background:var(--bg-card);margin-bottom:12px}'+
    '.ai-quest-detail .d-title{font-size:1rem;font-weight:600;color:var(--text-primary);margin-bottom:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}'+
    '.ai-quest-detail .d-meta{font-size:.75rem;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:12px;line-height:1.7}'+
    '.ai-quest-detail .d-narrative{font-size:.9rem;color:var(--text-primary);line-height:1.8;white-space:pre-wrap;margin-bottom:14px;padding:12px;background:var(--bg-hover);border-radius:8px}'+
    '.ai-quest-detail .d-result{font-size:.85rem;color:var(--text-secondary);line-height:1.7;margin-bottom:10px}'+
    '.ai-quest-detail .d-result .result-tag{display:inline-block;padding:2px 10px;border-radius:8px;font-family:var(--font-mono);font-size:.7rem;margin-right:6px}'+
    '.ai-quest-detail .d-result .result-tag.成功{background:rgba(80,140,80,.12);color:#5a8a5a}'+
    '.ai-quest-detail .d-result .result-tag.部分成功{background:rgba(200,160,60,.12);color:#9a7a2a}'+
    '.ai-quest-detail .d-result .result-tag.失败{background:rgba(160,64,64,.12);color:#a04040}'+

    // 按钮
    '.ai-quest-btn-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}'+
    '.ai-quest-btn{padding:8px 18px;border-radius:18px;cursor:pointer;font-family:var(--font-serif);font-size:.85rem;transition:all .2s;border:1.5px solid var(--border-card);background:transparent;color:var(--text-secondary)}'+
    '.ai-quest-btn:hover:not(:disabled){border-color:var(--profile-accent,var(--accent));color:var(--profile-accent,var(--accent))}'+
    '.ai-quest-btn.primary{border-color:var(--accent);color:var(--accent)}'+
    '.ai-quest-btn.primary:hover:not(:disabled){background:var(--accent);color:var(--bg-card)}'+
    '.ai-quest-btn:disabled{opacity:.5;cursor:wait}'+

    // 回执单
    '.ai-receipt-box{padding:12px 14px;border:1px dashed var(--border-card);border-radius:8px;background:var(--bg-hover);margin-top:10px}'+
    '.ai-receipt-box .r-title{font-size:.7rem;color:var(--text-muted);letter-spacing:1px;font-family:var(--font-mono);margin-bottom:6px}'+
    '.ai-receipt-box .r-text{font-size:.85rem;color:var(--text-primary);line-height:1.7;white-space:pre-wrap}'+

    // loading
    '.ai-quest-loading{padding:20px;text-align:center;color:var(--text-muted);font-size:.85rem;font-style:italic}'+
    '.ai-quest-loading .dots{display:inline-flex;gap:4px;margin-left:6px}'+
    '.ai-quest-loading .dots span{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--profile-accent,var(--accent));animation:aiQDot 1.2s infinite ease-in-out}'+
    '.ai-quest-loading .dots span:nth-child(2){animation-delay:.2s}'+
    '.ai-quest-loading .dots span:nth-child(3){animation-delay:.4s}'+
    '@keyframes aiQDot{0%,80%,100%{opacity:.3;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}'+

    // 日志
    '.ai-quest-log-list{display:flex;flex-direction:column;gap:6px}'+
    '.ai-quest-log-item{padding:8px 12px;border-left:3px solid var(--profile-accent,var(--accent));background:var(--bg-hover);border-radius:0 6px 6px 0;font-size:.8rem;line-height:1.6}'+
    '.ai-quest-log-item .log-date{font-size:.65rem;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:2px}'+
    '.ai-quest-log-item .log-title{color:var(--text-primary);font-weight:500}'+
    '.ai-quest-log-item .log-result{font-size:.7rem;font-family:var(--font-mono);margin-left:4px}'+
    '.ai-quest-log-item .log-result.成功{color:#5a8a5a}'+
    '.ai-quest-log-item .log-result.部分成功{color:#9a7a2a}'+
    '.ai-quest-log-item .log-result.失败{color:#a04040}'+

    // 配置提示
    '.ai-quest-banner{padding:6px 12px;border-radius:6px;background:var(--bg-accent-soft,rgba(138,58,42,.04));font-size:.72rem;color:var(--text-muted);margin-bottom:10px;text-align:center}'+
    '.ai-quest-banner.configured{background:rgba(80,140,80,.06)}'+

    // 响应式
    '@media(max-width:600px){'+
      '.ai-quest-card{padding:12px}'+
      '.ai-quest-card .q-title{font-size:.9rem}'+
      '.ai-quest-detail{padding:14px}'+
      '.ai-quest-detail .d-narrative{font-size:.88rem;padding:10px}'+
      '.ai-quest-btn{padding:7px 14px;font-size:.8rem}'+
    '}';
  document.head.appendChild(s);
}

// ===== 渲染整个 AI 外勤区 =====
function renderAIQuestSection(){
  injectStyles();
  var profile=getProfile();
  var container=document.getElementById('aiQuestSection');
  if(!container) return;

  var quests=loadAIQuests(profile);
  var log=loadQuestLog(profile);
  var refreshLeft=MAX_DAILY_REFRESH-getRefreshCount();

  var html='';

  // 标题栏 + 刷新按钮
  html+='<div class="ai-quest-header">';
  html+='<div class="title"><span class="sym">◈</span> AI 外勤布告</div>';
  html+='<div>';
  html+='<button class="ai-quest-refresh-btn" id="aiQuestRefreshBtn" '+(refreshLeft<=0?'disabled':'')+'>🔍 刷新任务</button>';
  html+='<span class="ai-quest-refresh-count">今日剩 '+refreshLeft+'/'+MAX_DAILY_REFRESH+' 次</span>';
  html+='</div>';
  html+='</div>';

  // 任务列表
  if(quests.length===0){
    html+='<div class="ai-quest-loading" style="font-style:normal">暂无任务,点击「刷新任务」生成新任务</div>';
  } else {
    html+='<div class="ai-quest-list">';
    quests.forEach(function(q, idx){
      var status=q.status||'available';
      var cardClass='ai-quest-card'+(status==='accepted'?' accepted':'')+(status==='completed'?' completed':'');
      html+='<div class="'+cardClass+'" data-idx="'+idx+'">';
      html+='<div class="q-title">'+esc(q.title)+'<span class="q-diff '+esc(q.difficulty||'简单')+'">'+esc(q.difficulty||'简单')+'</span></div>';
      html+='<div class="q-meta">委托人:'+esc(q.issuer||'')+' · 地点:'+esc(q.location||'')+' · 部门:'+esc(q.dept||'')+'</div>';
      html+='<div class="q-desc">'+esc(q.description||'')+'</div>';
      html+='<div class="q-reward">奖励:'+esc(q.reward||'')+'</div>';
      if(status==='accepted'){
        html+='<div class="q-status">已接受,点击查看执行进度</div>';
      } else if(status==='completed'){
        html+='<div class="q-status">已完成</div>';
      } else {
        html+='<div class="q-status">点击接受任务</div>';
      }
      html+='</div>';
    });
    html+='</div>';
  }

  // 任务详情区(有接受的任务时显示)
  var acceptedQuest=quests.find(function(q){return q.status==='accepted';});
  if(acceptedQuest){
    html+=renderQuestDetail(acceptedQuest, profile);
  }

  // 外勤日志
  html+='<div class="ai-quest-header" style="margin-top:20px">';
  html+='<div class="title"><span class="sym">◈</span> AI 外勤日志</div>';
  html+='</div>';
  if(log.length===0){
    html+='<div class="ai-quest-loading" style="font-style:normal">暂无外勤记录</div>';
  } else {
    html+='<div class="ai-quest-log-list">';
    log.slice().reverse().forEach(function(item){
      html+='<div class="ai-quest-log-item">';
      html+='<div class="log-date">'+esc(item.date)+'</div>';
      html+='<div><span class="log-title">'+esc(item.title)+'</span><span class="log-result '+esc(item.result||'成功')+'">'+esc(item.result||'成功')+'</span></div>';
      html+='</div>';
    });
    html+='</div>';
  }

  container.innerHTML=html;

  // 绑定事件
  bindEvents(profile);
}

function renderQuestDetail(q, profile){
  var html='<div class="ai-quest-detail" id="aiQuestDetail">';
  html+='<div class="d-title">◆ '+esc(q.title)+'<span class="q-diff '+esc(q.difficulty||'简单')+'">'+esc(q.difficulty||'简单')+'</span></div>';
  html+='<div class="d-meta">委托人:'+esc(q.issuer||'')+' · 地点:'+esc(q.location||'')+' · 部门:'+esc(q.dept||'')+' · 奖励:'+esc(q.reward||'')+'</div>';
  html+='<div class="d-meta">'+esc(q.description||'')+'</div>';

  // 执行剧情
  if(q.narrative){
    html+='<div class="d-narrative" id="aiQuestNarrative">'+esc(q.narrative)+'</div>';
  }

  // 结果
  if(q.result){
    html+='<div class="d-result"><span class="result-tag '+esc(q.result)+'">'+esc(q.result)+'</span>'+esc(q.resultNarrative||'')+'</div>';
    html+='<div class="d-result" style="margin-top:4px"><strong>实际奖励:</strong>'+esc(q.rewards||'')+'</div>';
  }

  // 回执单
  if(q.receipt){
    html+='<div class="ai-receipt-box">';
    html+='<div class="r-title">◈ 任务回执单</div>';
    html+='<div class="r-text" id="aiReceiptText">'+esc(q.receipt)+'</div>';
    html+='<div class="ai-quest-btn-row">';
    html+='<button class="ai-quest-btn" id="aiCopyReceiptBtn">📋 复制回执</button>';
    html+='<button class="ai-quest-btn" id="aiSendToSimBtn">📤 已同步到模拟页</button>';
    html+='</div>';
    html+='</div>';
  }

  // 操作按钮
  html+='<div class="ai-quest-btn-row">';
  if(!q.narrative){
    // 还没执行,显示"执行任务"
    html+='<button class="ai-quest-btn primary" id="aiExecuteBtn">执行任务</button>';
    html+='<button class="ai-quest-btn" id="aiAbandonBtn">放弃任务</button>';
  } else if(!q.result){
    // 已执行,没结果,显示"完成任务"
    html+='<button class="ai-quest-btn primary" id="aiCompleteBtn">提交任务结果</button>';
    html+='<button class="ai-quest-btn" id="aiAbandonBtn">放弃任务</button>';
  } else {
    // 已完成,显示"返回"
    html+='<button class="ai-quest-btn" id="aiCloseDetailBtn">收起</button>';
  }
  html+='</div>';

  html+='</div>';
  return html;
}

// ===== 绑定事件 =====
function bindEvents(profile){
  // 刷新任务
  var refreshBtn=document.getElementById('aiQuestRefreshBtn');
  if(refreshBtn){
    refreshBtn.addEventListener('click', function(){refreshQuests(profile);});
  }

  // 点击任务卡片
  document.querySelectorAll('.ai-quest-card').forEach(function(card){
    card.addEventListener('click', function(){
      var idx=parseInt(this.dataset.idx, 10);
      var quests=loadAIQuests(profile);
      var q=quests[idx];
      if(!q) return;
      if(q.status==='completed') return;
      // 如果已有接受的任务,先放弃
      var existing=quests.find(function(x){return x.status==='accepted';});
      if(existing && existing!==q){
        if(!confirm('你已有一个进行中的任务,接受新任务将放弃当前任务。继续?')) return;
        existing.status='available';
        delete existing.narrative;
        delete existing.result;
        delete existing.resultNarrative;
        delete existing.receipt;
      }
      q.status='accepted';
      saveAIQuests(profile, quests);
      renderAIQuestSection();
    });
  });

  // 执行任务
  var execBtn=document.getElementById('aiExecuteBtn');
  if(execBtn){
    execBtn.addEventListener('click', function(){executeQuest(profile);});
  }

  // 完成任务
  var completeBtn=document.getElementById('aiCompleteBtn');
  if(completeBtn){
    completeBtn.addEventListener('click', function(){completeQuest(profile);});
  }

  // 放弃任务
  var abandonBtn=document.getElementById('aiAbandonBtn');
  if(abandonBtn){
    abandonBtn.addEventListener('click', function(){
      if(!confirm('确定放弃这个任务吗?\n放弃后该任务将消失,无法再次接取。')) return;
      var quests=loadAIQuests(profile);
      var idx=quests.findIndex(function(x){return x.status==='accepted';});
      if(idx!==-1){
        quests.splice(idx,1);  // 直接从列表删除
        saveAIQuests(profile, quests);
        renderAIQuestSection();
      }
    });
  }

  // 收起详情
  var closeBtn=document.getElementById('aiCloseDetailBtn');
  if(closeBtn){
    closeBtn.addEventListener('click', function(){
      var quests=loadAIQuests(profile);
      var q=quests.find(function(x){return x.status==='accepted';});
      if(q){q.status='completed'; saveAIQuests(profile, quests); renderAIQuestSection();}
    });
  }

  // 复制回执
  var copyBtn=document.getElementById('aiCopyReceiptBtn');
  if(copyBtn){
    copyBtn.addEventListener('click', function(){
      var textEl=document.getElementById('aiReceiptText');
      if(textEl){
        var text=textEl.textContent;
        if(navigator.clipboard){
          navigator.clipboard.writeText(text).then(function(){
            copyBtn.textContent='✅ 已复制';
            setTimeout(function(){copyBtn.textContent='📋 复制回执';},2000);
          }).catch(function(){
            fallbackCopy(text, copyBtn);
          });
        } else {
          fallbackCopy(text, copyBtn);
        }
      }
    });
  }

  // 同步到模拟页
  var simBtn=document.getElementById('aiSendToSimBtn');
  if(simBtn){
    simBtn.addEventListener('click', function(){
      var quests=loadAIQuests(profile);
      var q=quests.find(function(x){return x.status==='accepted' && x.receiptForSim;});
      if(q){
        saveReceipt(profile, {
          quest:q.title,
          result:q.result,
          rewards:q.rewards,
          receiptForSim:q.receiptForSim,
          date:new Date().toLocaleDateString('zh-CN')
        });
        simBtn.textContent='✅ 已同步';
        setTimeout(function(){simBtn.textContent='📤 已同步到模拟页';},2000);
      }
    });
  }
}

function fallbackCopy(text, btn){
  var ta=document.createElement('textarea');
  ta.value=text;
  ta.style.position='fixed';
  ta.style.left='-9999px';
  document.body.appendChild(ta);
  ta.select();
  try{document.execCommand('copy'); btn.textContent='✅ 已复制'; setTimeout(function(){btn.textContent='📋 复制回执';},2000);}catch(e){}
  document.body.removeChild(ta);
}

// ===== 刷新任务 =====
async function refreshQuests(profile){
  var refreshLeft=MAX_DAILY_REFRESH-getRefreshCount();
  if(refreshLeft<=0){
    alert('今日刷新次数已用完,明天再来吧。');
    return;
  }

  var btn=document.getElementById('aiQuestRefreshBtn');
  if(btn){btn.disabled=true;btn.textContent='生成中...';}

  try{
    // 收集之前生成过的任务标题,让 AI 避开重复
    var oldQuests=loadAIQuests(profile);
    var log=loadQuestLog(profile);
    var excludeTitles=[];
    oldQuests.forEach(function(q){if(q.title) excludeTitles.push(q.title);});
    log.forEach(function(l){if(l.title) excludeTitles.push(l.title);});

    var result=await callQuestAI('generate', {excludeTitles:excludeTitles});
    if(result.quests && result.quests.length>0){
      // 给每个任务加 status
      result.quests.forEach(function(q){
        q.status='available';
        q.id=q.id||('quest_'+Date.now()+'_'+Math.random().toString(36).substr(2,5));
      });
      saveAIQuests(profile, result.quests);
      incRefreshCount();
      renderAIQuestSection();
    } else {
      alert('AI 生成任务失败,请重试。\n\n返回内容:\n'+(result.raw||JSON.stringify(result)));
    }
  }catch(e){
    alert('生成任务出错:'+e.message);
  }finally{
    if(btn){btn.disabled=false;btn.textContent='🔍 刷新任务';}
  }
}

// ===== 执行任务 =====
async function executeQuest(profile){
  var quests=loadAIQuests(profile);
  var q=quests.find(function(x){return x.status==='accepted';});
  if(!q) return;

  var btn=document.getElementById('aiExecuteBtn');
  if(btn){btn.disabled=true;btn.textContent='执行中...';}

  // 显示 loading
  var detail=document.getElementById('aiQuestDetail');
  if(detail){
    var narrEl=document.getElementById('aiQuestNarrative');
    if(!narrEl){
      narrEl=document.createElement('div');
      narrEl.className='d-narrative ai-quest-loading';
      narrEl.id='aiQuestNarrative';
      narrEl.innerHTML='浮生树低语中<span class="dots"><span></span><span></span><span></span></span>';
      detail.insertBefore(narrEl, detail.querySelector('.ai-quest-btn-row'));
    } else {
      narrEl.innerHTML='浮生树低语中<span class="dots"><span></span><span></span><span></span></span>';
      narrEl.className='d-narrative ai-quest-loading';
    }
  }

  try{
    var result=await callQuestAI('execute', {
      questName:q.title,
      client:q.issuer,
      location:q.location,
      difficulty:q.difficulty,
      description:q.description
    });
    q.narrative=result.narrative;
    saveAIQuests(profile, quests);
    renderAIQuestSection();
  }catch(e){
    alert('执行任务出错:'+e.message);
    renderAIQuestSection();
  }
}

// ===== 完成任务 =====
async function completeQuest(profile){
  var quests=loadAIQuests(profile);
  var q=quests.find(function(x){return x.status==='accepted';});
  if(!q || !q.narrative) return;

  var btn=document.getElementById('aiCompleteBtn');
  if(btn){btn.disabled=true;btn.textContent='提交中...';}

  try{
    var result=await callQuestAI('complete', {
      questName:q.title,
      client:q.issuer,
      location:q.location,
      difficulty:q.difficulty,
      description:q.description,
      narrative:q.narrative
    });
    q.result=result.result;
    q.resultNarrative=result.resultNarrative;
    q.rewards=result.rewards;
    q.receipt=result.receipt;
    q.receiptForSim=result.receiptForSim;
    saveAIQuests(profile, quests);

    // 自动同步到模拟页
    if(result.receiptForSim){
      saveReceipt(profile, {
        quest:q.title,
        result:q.result,
        rewards:q.rewards,
        receiptForSim:result.receiptForSim,
        date:new Date().toLocaleDateString('zh-CN')
      });
    }

    // 加到日志
    var log=loadQuestLog(profile);
    log.push({
      date:new Date().toLocaleDateString('zh-CN'),
      title:q.title,
      result:q.result,
      rewards:q.rewards
    });
    saveQuestLog(profile, log);

    renderAIQuestSection();
  }catch(e){
    alert('完成任务出错:'+e.message);
    renderAIQuestSection();
  }
}

// ===== 启动 =====
function boot(){
  var profile=getProfile();
  renderAIQuestSection();
  console.log('◆ 外勤AI.js 已加载,角色:',profile);
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// 角色切换时刷新
window.addEventListener('profilechange', function(e){
  renderAIQuestSection();
});
// 从设置页返回时刷新
window.addEventListener('pageshow', function(){
  renderAIQuestSection();
});
})();
