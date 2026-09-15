// ===== 模拟AI.js · 引渡人模拟器 AI 剧情流引擎 v4 =====
// v4 新增:章节管理系统
// 1. 每章 MAX_ROUNDS 轮(15轮=30条消息),自动触发章节转换
// 2. AI 自动生成上一章总结 + 下一章标题和开场
// 3. 侧边栏显示章节列表,可切换查看(归档章节可编辑)
// 4. 前情提要:AI 调用时注入之前章节的摘要
// 5. 向后兼容:旧存档自动转换为章节结构
//
// 部署步骤:
// 直接用这个文件覆盖原来的 模拟AI.js

(function(){
  'use strict';

  // ===== 配置区 =====
  const WORKER_URL = 'https://difu-ai.2629885225.workers.dev';
  const MAX_HISTORY = 10;
  const MAX_ROUNDS = 15;  // ★ 每章15轮(15条玩家行动+15条AI回应=30条),测试用,后面改30
  const STORAGE_KEY = 'gzd_ai_story';
  const CONFIG_KEY = 'gzd_ai_config';

  const PROVIDER_CONFIG = {
    deepseek: { baseUrl: 'https://api.deepseek.com', defaultModel: 'deepseek-chat', format: 'openai' },
    openai:   { baseUrl: 'https://api.openai.com',    defaultModel: 'gpt-4o-mini',  format: 'openai' },
    claude:   { baseUrl: 'https://api.anthropic.com', defaultModel: 'claude-3-5-sonnet-20241022', format: 'claude' },
    custom:   { baseUrl: '',                          defaultModel: '',             format: 'openai' }
  };

  const LOADING_PHRASES = [
    '浮生树正在低语', '花瓣正在飘落', '归终殿的钟声敲响',
    '忘川水缓缓流过', '阴气正在汇聚', '魂力正在流转'
  ];

  // ===== 存档读写(章节结构) =====
  // 新结构: gzd_ai_story[profile] = { currentChapter: 1, chapters: { 1: { title, summary, stories: [...] } } }
  // 旧结构: gzd_ai_story[profile] = [...]  (扁平数组,自动转换)

  function loadProfileData(profile){
    try{
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      let data = all[profile];
      if(!data) return null;
      // 向后兼容:如果是旧格式(数组),自动转换
      if(Array.isArray(data)){
        data = { currentChapter: 1, chapters: { 1: { title: profile==='luojin'?'第一章 · 刀与火':'第一章 · 归终殿的新叶', summary: '', stories: data } } };
      }
      return data;
    }catch(e){ return null; }
  }

  function saveProfileData(profile, data){
    try{
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      all[profile] = data;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }catch(e){ console.warn('存档失败:', e); }
  }

  function loadStory(profile){
    const data = loadProfileData(profile);
    if(!data || !data.chapters) return [];
    const ch = data.chapters[data.currentChapter];
    return ch ? (ch.stories || []) : [];
  }

  function saveStory(profile, arr){
    const data = loadProfileData(profile) || { currentChapter: 1, chapters: {} };
    if(!data.chapters) data.chapters = {};
    if(!data.chapters[data.currentChapter]) data.chapters[data.currentChapter] = { title: '', summary: '', stories: [] };
    data.chapters[data.currentChapter].stories = arr;
    saveProfileData(profile, data);
  }

  function getCurrentChapter(profile){
    const data = loadProfileData(profile);
    return data ? data.currentChapter : 1;
  }

  function getChapterData(profile, chapterNum){
    const data = loadProfileData(profile);
    if(!data || !data.chapters) return null;
    return data.chapters[chapterNum] || null;
  }

  function getChapterTitle(profile, chapterNum){
    const ch = getChapterData(profile, chapterNum);
    return ch ? ch.title : '';
  }

  function getPrevSummaries(profile){
    const data = loadProfileData(profile);
    if(!data || !data.chapters) return '';
    let summaries = '';
    for(let i = 1; i < data.currentChapter; i++){
      const ch = data.chapters[i];
      if(ch && ch.summary){
        summaries += `第${i}章「${ch.title}」:${ch.summary}\n`;
      }
    }
    return summaries;
  }

  // 计算当前章节的轮数(1轮 = 1条user + 1条ai)
  function getCurrentRounds(profile){
    const arr = loadStory(profile);
    let userCount = arr.filter(x => x.type === 'user').length;
    let aiCount = arr.filter(x => x.type === 'ai').length;
    return Math.min(userCount, aiCount);
  }

  function loadAIConfig(){
    try{ return JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}'); }
    catch(e){ return {}; }
  }
  function hasUserKey(){
    const cfg = loadAIConfig();
    return !!(cfg.apiKey && cfg.provider);
  }
  function getProfile(){
    let p = 'linxiwu';
    try{ p = localStorage.getItem('activeProfile') || 'linxiwu'; }catch(e){}
    return p;
  }

  // ===== AI 调用(双模式) =====
  async function callAI(message, profile, history){
    const cfg = loadAIConfig();
    if(cfg.apiKey && cfg.provider){
      return await callDirect(message, profile, history, cfg);
    } else {
      return await callWorker(message, profile, history);
    }
  }

  async function callDirect(message, profile, history, cfg){
    const pConfig = PROVIDER_CONFIG[cfg.provider] || PROVIDER_CONFIG.deepseek;
    const baseUrl = cfg.provider === 'custom' ? (cfg.customUrl || '') : pConfig.baseUrl;
    const model = cfg.model || pConfig.defaultModel;
    if(!baseUrl) throw new Error('接口地址为空,请前往设置页填写');

    const systemPrompt = buildSystemPrompt(profile);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-MAX_HISTORY),
      { role: 'user', content: message }
    ];

    let url, headers, body;
    if(pConfig.format === 'claude'){
      url = baseUrl + '/v1/messages';
      headers = { 'Content-Type':'application/json', 'x-api-key':cfg.apiKey, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' };
      const claudeMsgs = messages.filter(m => m.role !== 'system');
      body = JSON.stringify({ model, max_tokens: 1200, system: systemPrompt, messages: claudeMsgs });
    } else {
      url = baseUrl + '/v1/chat/completions';
      headers = { 'Content-Type':'application/json', 'Authorization':'Bearer ' + cfg.apiKey };
      body = JSON.stringify({ model, messages, max_tokens: 1200, temperature: 0.8 });
    }
    const resp = await fetch(url, { method:'POST', headers, body });
    const data = await resp.json();
    if(!resp.ok){
      const errMsg = data.error?.message || data.error || JSON.stringify(data);
      if(resp.status === 401) throw new Error('API Key 无效或已失效');
      if(resp.status === 402) throw new Error('余额不足');
      if(resp.status === 429) throw new Error('请求过频');
      throw new Error(`AI 返回错误(${resp.status}):${errMsg}`);
    }
    let reply = '';
    if(pConfig.format === 'claude'){
      reply = data.content?.[0]?.text || '';
    } else {
      reply = data.choices?.[0]?.message?.content || '';
    }
    if(!reply) throw new Error('AI 返回了空内容');
    return reply;
  }

  async function callWorker(message, profile, history){
    const resp = await fetch(WORKER_URL, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ message, profile, history })
    });
    const data = await resp.json();
    if(data.error) throw new Error(data.error);
    return data.reply;
  }

  // ===== 章节转换 AI 调用 =====
  async function callChapterTransition(profile, chapterNum, chapterTitle){
    const cfg = loadAIConfig();
    const prevSummaries = getPrevSummaries(profile);
    const chapterContent = loadStory(profile);  // ★ 当前章节的剧情内容

    if(cfg.apiKey && cfg.provider){
      // 直连模式
      const pConfig = PROVIDER_CONFIG[cfg.provider] || PROVIDER_CONFIG.deepseek;
      const baseUrl = cfg.provider === 'custom' ? (cfg.customUrl || '') : pConfig.baseUrl;
      const model = cfg.model || pConfig.defaultModel;
      if(!baseUrl) throw new Error('接口地址为空');

      const prompt = buildTransitionPrompt(profile, chapterNum, chapterTitle, prevSummaries, chapterContent);
      const messages = [
        { role:'system', content: prompt },
        { role:'user', content:'请生成章节转换内容。' }
      ];

      let url, headers, body;
      if(pConfig.format === 'claude'){
        url = baseUrl + '/v1/messages';
        headers = { 'Content-Type':'application/json', 'x-api-key':cfg.apiKey, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' };
        body = JSON.stringify({ model, max_tokens:800, system:prompt, messages: messages.filter(m=>m.role!=='system') });
      } else {
        url = baseUrl + '/v1/chat/completions';
        headers = { 'Content-Type':'application/json', 'Authorization':'Bearer '+cfg.apiKey };
        body = JSON.stringify({ model, messages, max_tokens:800, temperature:0.8 });
      }
      const resp = await fetch(url, { method:'POST', headers, body });
      const data = await resp.json();
      if(!resp.ok) throw new Error('章节转换失败:'+resp.status);
      let reply = '';
      if(pConfig.format === 'claude') reply = data.content?.[0]?.text || '';
      else reply = data.choices?.[0]?.message?.content || '';
      return parseTransitionResult(reply);
    } else {
      // Worker 兜底
      const resp = await fetch(WORKER_URL, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'chapterTransition', profile, chapterNum, chapterTitle, prevSummaries, chapterContent })
      });
      const data = await resp.json();
      if(data.error) throw new Error(data.error);
      if(data.transition) return data.transition;
      return { summary:'', nextTitle:'', nextOpening: data.reply || '' };
    }
  }

  function buildTransitionPrompt(profile, chapterNum, chapterTitle, prevSummaries, chapterContent){
    // 提取当前章节剧情文本(最多5000字)
    let contentSummary = '';
    if(chapterContent && chapterContent.length > 0){
      let totalText = '';
      chapterContent.forEach(function(msg){
        if(msg.text){
          totalText += (msg.type==='user'?'玩家:':'AI:') + msg.text + '\n';
        }
      });
      if(totalText.length > 5000){
        contentSummary = totalText.substring(totalText.length - 5000);
      } else {
        contentSummary = totalText;
      }
    }

    return `你是「引渡人模拟器·归终殿」的剧情生成 AI。

【当前玩家角色】
${profile === 'luojin' ? '罗烬:讲武堂弟子,统修期。' : '林栖梧:符修院助教,统修期,甲等下品。'}

【世界观】
苍珩四百三十五年,地府归终殿执掌亡魂引渡与功过裁定。殿辖符修院、讲武堂、音律坊与忘川东段。

【你的任务】
第${chapterNum}章「${chapterTitle}」的剧情已经完结。请:

1. 用80-100字总结第${chapterNum}章的关键剧情。必须基于下面的【本章实际剧情内容】来总结,不要编造没有发生过的事。
2. 生成第${chapterNum + 1}章的标题(4-6字,古风)。标题要跟上一章的实际内容有衔接关系。
3. 生成第${chapterNum + 1}章的开场剧情(100-200字,第二人称"你"叙述)。必须自然衔接上一章的最后一幕,不要引入上一章没有出现过的人物和地点。

${prevSummaries ? '【之前章节摘要】\n' + prevSummaries + '\n' : ''}

${contentSummary ? '【本章实际剧情内容(请严格基于此总结,不要编造)】\n' + contentSummary : ''}

【重要约束】
1. 总结必须基于实际剧情内容,不要添加没有发生的事
2. 新章节开场必须衔接上一章结尾,不要引入新角色
3. 如果上一章玩家在跟某个NPC聊天,开场应该是那之后的事,不要突然跳到别的场景

【输出格式】
严格输出以下JSON,不要输出任何其他文字:

{
  "summary": "第${chapterNum}章总结(80-100字,基于实际剧情)",
  "nextTitle": "第${chapterNum + 1}章标题",
  "nextOpening": "第${chapterNum + 1}章开场剧情(100-200字)"
}`;
  }

  function parseTransitionResult(text){
    let jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const first = jsonStr.indexOf('{'), last = jsonStr.lastIndexOf('}');
    if(first !== -1 && last !== -1) jsonStr = jsonStr.substring(first, last+1);
    try{
      const data = JSON.parse(jsonStr);
      return {
        summary: data.summary || '',
        nextTitle: data.nextTitle || '',
        nextOpening: data.nextOpening || ''
      };
    }catch(e){
      return { summary:'', nextTitle:'', nextOpening:text, error:e.message };
    }
  }

  function buildSystemPrompt(profile){
    const prevSummaries = getPrevSummaries(profile);
    const currentChapter = getCurrentChapter(profile);
    const chapterTitle = getChapterTitle(profile, currentChapter) || (profile==='luojin'?'第一章 · 刀与火':'第一章 · 归终殿的新叶');

    return `你是「引渡人模拟器·归终殿」的剧情生成 AI。

【当前玩家角色】
${profile === 'luojin' ? '罗烬:讲武堂弟子,承刀法一脉,性情刚直果决,与林栖梧有同门之谊。当前层级:统修期。' : '林栖梧:符修院助教,身负浮生树血脉,双亲为林淮与栾方棋。性情内敛重情,擅符箓与感知。当前层级:统修期,评级甲等下品。'}

请始终以"当前玩家角色"的视角生成剧情,不要混淆两个主角。

【世界观】
苍珩四百三十五年,地府归终殿执掌亡魂引渡与功过裁定。殿辖符修院、讲武堂、音律坊与忘川东段。符修院以符箓通幽,讲武堂以刀法镇魂,音律坊以琴笛渡灵,忘川东段为魂流汇聚之地。三脉同源,共维归终殿秩序。
归终殿由阎罗十殿正式册立,与阎罗十殿同列,为地府第十殿。殿内引渡人行走阴阳,引渡亡魂,维护人间与地府的秩序。京城决战之后,归终殿规模从最初的二十余人扩充至数百人,后阎王下令开坛收徒,广纳新弟子,如今已有弟子两千余人。十席引渡人各有封号,可开坛收徒,传引渡之法。

【主角档案】
林栖梧:符修院弟子,身负浮生树血脉,双亲为林淮与栾方棋。性情内敛重情,擅符箓与感知。当前层级:统修期,评级甲等下品。
罗烬:讲武堂弟子,承刀法一脉,性情刚直果决,与林栖梧有同门之谊。当前层级:统修期。

【主要地点】
归终殿(中枢)、符修院、讲武堂、忘川东段、音律坊、归终正殿(试炼司/殿务司所在)。

【主要NPC角色档案】

栾方棋（男）——符修院执教,林栖梧生父之一,归终殿第一符修。表面温和好说话,脾气极好,几乎有求必应,内心却是个吐槽役,脑内弹幕刷得飞起。对林淮温柔坦诚,对罗修无奈却敬重,对魏元璟是能一起喝酒吐槽的好友,对程木栖恭敬,对弟子耐心到不可思议。面对罗烬时极其无奈但温柔,会沉默叹气然后帮他擦脸。他的本命武器是浮生花,魂魄与浮生树母体融合,可召唤浮生树根。擅长符箓、战术策略、浮生树操控。称呼:林淮为"林淮",罗修为"罗修",魏元璟为"元璟",程木栖为"程师姐",林栖梧为"栖梧",罗烬为"罗烬"。
林淮（男）——归终殿第二席引渡人,林栖梧生父之一,归终殿第一枪修。表面冷面寡言,公事公办,话少得可怜,实际上只是不爱说话,并非故意冷淡。心直口快,偶尔语出惊人,冷脸萌属性。深度路痴,所有复杂地形都会被他在脑中自动重组。对栾方棋温柔,话会多一些;对林栖梧话少但极护短;对罗烬有点无语但不会说什么,罗烬很怕他;对罗修是好哥们,对魏元璟公事公办但关系不错,对程木栖尊重。本命武器是银枪,能一枪劈开山岳。称呼:栾方棋为"方棋",其他多为"嗯""好"或直接称呼名字。
罗修（男）——归终殿首席引渡人,讲武堂执教,罗烬之父,魏元璟之夫。表面玩世不恭、大大咧咧、毒舌刻薄、自来熟,嘴上从来不积德。实际上重情重义,责任感极强,是归终殿最护短的人。对魏元璟嘴上斗嘴行动宠溺,对罗烬该玩时疯玩该严厉时严厉,对林栖梧欣赏中带着温和,对林淮好哥们,对栾方棋理直气壮地支使,对程木栖是唯一会正经叫"程师姐"的人。本命武器为双刀,修习鬼道,五百年鬼修。称呼:魏元璟为"璟殿下"或"元璟",栾方棋为"栾方棋",林淮为"林淮",程木栖为"程师姐",林栖梧为"栖梧",罗烬为"罗烬"。
魏元璟（男）——归终殿第十席引渡人,罗烬的生父之一。表面傲娇、刀子嘴豆腐心、小野猫属性,骄矜挑剔。实际上极其脆弱爱哭,遇到委屈会忍着不说但可能会掉眼泪,极度重情。对罗修嘴上骂骂咧咧实则最爱,对罗烬头疼又最关心,对林栖梧欣赏满意,对林淮有点小尴尬但关系不紧张,对栾方棋是能一起喝酒吐槽罗修的好友,对程木栖尊敬乖巧。擅长魂术与体术,惯用摧城笛但无法自如驱使。称呼:罗修为"罗修",栾方棋为"方棋"或"栾方棋",林淮为"林淮",程木栖为"程师姐",林栖梧为"栖梧",罗烬为"罗烬"。
程木栖（女）——栖梧馆医馆主事,前第二席引渡人,归终殿最全能的人。表面温和端方靠谱师姐,实际上喜欢偷懒翘班躲起来看话本,音律课经常丢给魏元璟上。对魏元璟欣赏中带着促狭,对栾方棋温和催药但发现倒药会阴恻恻威胁,对林淮像对不爱说话的弟弟,对罗修嫌弃中带着关心,对罗烬无奈温和像对自家调皮孩子,对林栖梧格外欣赏。称呼所有人均为名字。京城决战中十指尽废,本命武器古琴碎裂,此后不再弹琴,转修医道。
蔡可（女）——归终殿内门期弟子,前任第十席，目前已退役（参与京城决战，双手残疾，目前靠义肢活动）。在栖梧馆帮程木栖配药。是林栖梧和罗烬的师姐,虽然看着小但入门比他们早，入门已有百年，实力不容小觑。',

【玩家角色与NPC的关系】
罗烬面对各NPC时的关系:
罗烬是罗修与魏元璟之子,讲武堂弟子,性情咋咋呼呼,天赋高但总把自己搞伤。罗修对他该玩时疯玩该严厉时严厉,最常说的话是"别惹你娘生气"。魏元璟对他极其头疼但最关心,嘴上嫌弃实则溺爱。栾方棋对他极其无奈但温柔,罗烬很喜欢栾方棋,觉得他温柔,经常找他画符,炸了脸栾方棋会沉默叹气然后帮他擦。林淮对他有点无语但不会说什么,罗烬很怕林淮。程木栖对他无奈,已经习惯他受伤来医馆。林栖梧对他而言是喜欢的人,小时候总逗她抓虫子把她弄哭,长大了知道自己做得不对正在努力挽回,见到她会结巴不知道说什么。

林栖梧面对各NPC时的关系:
林栖梧是林淮与栾方棋之女,符修院助教,端方识大体,天赋极高。栾方棋对她极其满意,觉得给自己省事了。林淮话少但极护短。罗修对她欣赏,拿她和罗烬比较。魏元璟对她满意欣赏,偶尔指导她法术体术。程木栖对她格外欣赏,觉得是难得见到的好孩子。罗烬对她而言是小时候讨厌、现在印象还好的同门,觉得他有担当,出任务时会保护她,她似乎不知道罗烬喜欢她,也可能隐约察觉但装作不知。

【主要地点】
归终殿中枢——正殿、试炼司、殿务司所在。
符修院——栾方棋坐镇,以符箓之术传授弟子,院内女弟子居多。
讲武堂——罗修执教,主修刀法，魂术，其余武功杂学皆在此修习,弟子对罗修又敬又怕。
点苍阁——林淮执掌,主修枪法，体术指导。弟子多是想成为林淮那样的人的。
音律坊——程木栖主理,主修琴音破阵之术，魏元璟副理，主修笛渡魂之术,由于程木栖忙于栖梧馆，如今音律课多由魏元璟代上。
砺峰阁——魏元璟主掌，是归终殿魂力与冥想的核心院阁，同时也负责每个新入门的统修期弟子的体能训练。
忘川东段——魂流汇聚之地,弟子常在此处实习引渡。
人间——引渡人的实战场地，常面临穷凶极恶的恶鬼、妖邪等。
栖梧馆——程木栖开设的医馆,弟子受伤后首选之地。
浮生巨树（正式命：灵枢轮回木）——栾方棋与林淮血脉滋养的神树,本为天庭神器，后认主栾方棋与林淮，现在是归终殿的镇殿之宝,树下是弟子休憩聊天独处的常去之地。
浑天鉴——位于人间皇室、重要中枢、各大地区皆有设定。是人间用于联系地府的地方，遇到涉及阴阳的棘手事会直接联系到归终殿。
阵法堂——由第三席执掌，专攻阵法与符阵的实战应用。
工造司——由第四席执掌，负责归终殿兵器锻造与维修。
澄心堂——第六席执掌，专攻剑修与剑法传承。
百草堂——第八席执掌，专攻用毒与药理，与栖梧馆深度合作。

【战力与晋升体系】
弟子六项属性:魂力、体术、法术、防御、意志、敏捷。综合计算得战力值,并给出评级,如甲等下品、乙等上品。

归终殿弟子约两千余人,分六层:
杂役占百分之五,约一百人。
统修期占百分之十五,约三百人。
入门期占百分之六十,约一千二百人。
内门期占百分之十五,约三百人。
准十席级占百分之四点五,约九十人。
十席占百分之零点五,共十人。

晋升规则:每月初一至初五,可前往归终正殿试炼司预约战力测试。战力达标后向殿务司提出晋升申请。
统修期晋升入门期:六科统修考核均需六十分以上。六科为符法、刀法、阵法、枪法、引渡实务、魂力控制或医药基础。
入门期晋升内门期:战力值大于五百。
内门期晋升准十席级:战力值大于八百。
准十席级晋升十席:战力值大于八百,且挑战现十席成功。十席按战力排名,击败现任十席即可取而代之,原十席顺延一位,第十席被挤出前十。
统修期说明:新入殿弟子第一阶段,为期三个月。未通过者可补考,三次未过转为杂役。每月可预约一次战力测试。

【战力测试机制】
当玩家输入"战力测试""试炼司测试""测战力"等关键词时:
1. 生成 2-3 回合的测试剧情(玩家经历考核场景)
2. 最后一回合,在剧情末尾给出测试结果数据
3. 数据格式固定如下:
【战力测试结果】
魂力:XX
体术:XX
法术:XX
防御:XX
意志:XX
敏捷:XX
战力:XX
评级:XX
时期:统修期
4. 数值要符合玩家当前时期(统修期 0-100)
5. 在数据前加一段提示:"以下为战力测试回执,可复制到魂力页面录入"


【殿规】
不可轻视杂役:轻慢杂役者罚抄殿规百遍,欺凌杂役者逐出归终殿。
不可对十席不敬:轻则罚俸三月,重则逐出归终殿。
晋升须经正规测试:私自挑战或冒充层级者,视同欺师灭祖,废除修为,逐出归终殿。

【风格要求】
古风地府基调,师徒与亲情羁绊交织,含蓄隽永,善用留白。单段剧情控制在500字以内,避免直白抒情,以细节与氛围传递情绪。剧情需与角色当前层级、战力水平、殿规相呼应。
如果玩家输入的内容超出了世界观或不符合角色设定,以角色自身的方式委婉拒绝或困惑回应,而非强行解释。

【重要约束】
1. 永远用第二人称"你"来叙述玩家角色的行动
2. 不要替玩家做重大决定(比如不要写"你答应了他"),只描述环境和他人反应
3. 如果玩家输入的行动不合理(比如"瞬间成神"),要用地府规则委婉拒绝或转化
4. 自然延续之前的剧情,引用前文出现过的细节、NPC、地点
5. 对重要npc的称呼要保持一致,不要随意更改，注意各个人物关系，一般称呼职务，如当你扮演罗烬时候，称呼栾方棋称呼棋大人，不可称呼栾叔、也不可直呼大名。面对罗修时可称呼爹，面对魏元璟时可称呼娘。面对林淮时可称呼淮大人。面对程木栖时可称呼程师姐。面对林栖梧时可称呼栖梧。反之，当你扮演林栖梧时，称呼栾方棋为娘亲，称呼林淮为父亲/爹爹，称呼程木栖为程师姐，称呼罗烬为罗烬，称呼罗修为首席大人，称呼魏元璟为璟大人。
${prevSummaries ? '\n\n【前情提要】\n' + prevSummaries + '\n请在剧情中自然引用前几章的事件,但不要每次都提。' : ''}
${getQuestReceiptSection(profile)}`;
  }

  // ===== 读取外勤回执 =====
  function getQuestReceiptSection(profile){
    try{
      var all = JSON.parse(localStorage.getItem('gzd_ai_quest_receipt') || '{}');
      var receipt = all[profile];
      if(receipt && receipt.receiptForSim){
        return '\n\n【近期外勤】\n' + receipt.receiptForSim + '\n请在剧情中自然提及这次外勤经历,但不要每次都提。';
      }
    }catch(e){}
    return '';
  }

  // ===== HTML 转义 =====
  function escapeHtml(t){
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML.replace(/\n/g,'<br>');
  }

  // ===== 渲染单条消息(原版不变) =====
  function renderMessage(item){
    const row = document.createElement('div');
    row.className = 'msg-row';
    row.dataset.id = item.id;

    if(item.type === 'opening'){
      row.className += ' left opening';
      row.innerHTML = `<div class="msg-avatar">❀</div><div class="msg-bubble-wrap"><div class="msg-label">开场</div><div class="msg-bubble">${escapeHtml(item.text)}</div></div>`;
    } else if(item.type === 'user'){
      row.className += ' right';
      row.innerHTML = `<div class="msg-bubble-wrap"><div class="msg-label">你的行动</div><div class="msg-bubble" data-text="${encodeURIComponent(item.text)}">${escapeHtml(item.text)}</div><div class="msg-actions"><button class="msg-action-btn" data-action="edit" data-id="${item.id}">✎ 修改</button></div></div><div class="msg-avatar">✦</div>`;
    } else if(item.type === 'ai'){
      row.className += ' left';
      row.innerHTML = `<div class="msg-avatar">◈</div><div class="msg-bubble-wrap"><div class="msg-label">浮生树回应</div><div class="msg-bubble" data-text="${encodeURIComponent(item.text)}">${escapeHtml(item.text)}</div><div class="msg-actions"><button class="msg-action-btn" data-action="edit" data-id="${item.id}">✎ 修改</button><button class="msg-action-btn" data-action="regenerate" data-id="${item.id}">⟲ 重新生成</button></div></div>`;
    } else if(item.type === 'error'){
      row.className += ' left error';
      row.innerHTML = `<div class="msg-avatar">⚠</div><div class="msg-bubble-wrap"><div class="msg-label">出错</div><div class="msg-bubble">${escapeHtml(item.text)}</div></div>`;
    } else if(item.type === 'loading'){
      row.className += ' left';
      row.innerHTML = `<div class="msg-avatar">◈</div><div class="msg-bubble-wrap"><div class="msg-label" id="loadingLabel">浮生树回应</div><div class="msg-loading"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span style="margin-left:6px" id="loadingText">${LOADING_PHRASES[0]}</span></div></div>`;
    } else if(item.type === 'chapter-end'){
      row.className += ' center';
      row.innerHTML = `<div class="chapter-end-banner"><div class="chapter-end-sym">✦</div><div class="chapter-end-title">${escapeHtml(item.title||'章节完结')}</div><div class="chapter-end-text">${escapeHtml(item.text||'')}</div></div>`;
    } else if(item.type === 'chapter-start'){
      row.className += ' center';
      row.innerHTML = `<div class="chapter-start-banner"><div class="chapter-start-sym">◈</div><div class="chapter-start-title">${escapeHtml(item.title||'新章节')}</div><div class="chapter-start-text">${escapeHtml(item.text||'')}</div></div>`;
    }
    return row;
  }

  // ===== 渲染整个剧情流 =====
  function renderStory(profile){
    const area = document.getElementById('storyArea');
    if(!area) return;
    const arr = loadStory(profile);
    const banner = area.querySelector('.chapter-banner');
    area.innerHTML = '';
    if(banner) area.appendChild(banner);
    arr.forEach(item => area.appendChild(renderMessage(item)));
    area.scrollTop = area.scrollHeight;
    // 更新侧边栏
    renderChapterSidebar(profile);
    // 更新顶部章节标题
    updateChapterTitle(profile);
  }

  function updateChapterTitle(profile){
    const ch = getCurrentChapter(profile);
    const title = getChapterTitle(profile, ch) || '第一章';
    const titleEl = document.getElementById('chapterTitle');
    if(titleEl) titleEl.textContent = title;
    const bannerTitle = document.querySelector('.chapter-banner .chapter-title');
    if(bannerTitle) bannerTitle.textContent = title;
  }

  // ===== 章节侧边栏 =====
  function renderChapterSidebar(profile){
    let sidebar = document.getElementById('chapterSidebar');
    if(!sidebar) return;

    const data = loadProfileData(profile);
    if(!data || !data.chapters){
      sidebar.innerHTML = '<div class="ch-empty">暂无章节</div>';
      return;
    }

    let html = '';
    const currentCh = data.currentChapter;
    // 从最新到最旧
    for(let i = currentCh; i >= 1; i--){
      const ch = data.chapters[i];
      if(!ch) continue;
      const isActive = (i === currentCh);
      const status = isActive ? '进行中' : '已归档';
      html += `<div class="ch-item ${isActive?'active':''}" data-chapter="${i}">
        <div class="ch-num">第${i}章</div>
        <div class="ch-title">${escapeHtml(ch.title || '未命名')}</div>
        <div class="ch-status">${status}</div>
      </div>`;
    }
    sidebar.innerHTML = html;

    // 绑定点击
    sidebar.querySelectorAll('.ch-item').forEach(function(item){
      item.addEventListener('click', function(){
        const ch = parseInt(this.dataset.chapter, 10);
        switchChapter(profile, ch);
      });
    });
  }

  function switchChapter(profile, chapterNum){
    const data = loadProfileData(profile);
    if(!data) return;
    const ch = data.chapters[chapterNum];
    if(!ch) return;

    // 临时显示该章节(不修改 currentChapter)
    const area = document.getElementById('storyArea');
    if(!area) return;
    const banner = area.querySelector('.chapter-banner');
    area.innerHTML = '';
    if(banner){
      // 更新 banner 标题
      const titleEl = banner.querySelector('.chapter-title');
      if(titleEl) titleEl.textContent = ch.title || '第'+chapterNum+'章';
      area.appendChild(banner);
    }
    (ch.stories || []).forEach(item => area.appendChild(renderMessage(item)));
    area.scrollTop = 0;

    // 更新侧边栏高亮(不修改实际 currentChapter)
    document.querySelectorAll('.ch-item').forEach(function(item){
      item.classList.toggle('active', parseInt(item.dataset.chapter,10) === chapterNum);
    });

    // 更新顶部标题
    const titleEl = document.getElementById('chapterTitle');
    if(titleEl) titleEl.textContent = ch.title || '第'+chapterNum+'章';

    // 如果切回当前章节,恢复输入;否则禁用输入
    const isCurrent = (chapterNum === data.currentChapter);
    const inputBar = document.querySelector('.input-bar');
    if(inputBar){
      inputBar.style.display = isCurrent ? '' : 'none';
    }
    // 如果不是当前章节,显示"返回当前章节"提示
    if(!isCurrent){
      const area2 = document.getElementById('storyArea');
      const backBtn = document.createElement('div');
      backBtn.className = 'back-to-current';
      backBtn.innerHTML = '<button class="back-to-current-btn">← 返回第'+data.currentChapter+'章(进行中)</button>';
      backBtn.style.cssText = 'text-align:center;padding:12px;';
      area2.appendChild(backBtn);
      backBtn.querySelector('button').addEventListener('click', function(){
        renderStory(profile);
      });
    }
  }

  // ===== 动态加载文案 =====
  let loadingTimer = null;
  function startLoadingAnimation(){
    let i = 0;
    const textEl = document.getElementById('loadingText');
    if(textEl){
      textEl.textContent = LOADING_PHRASES[0];
      loadingTimer = setInterval(() => {
        i = (i+1) % LOADING_PHRASES.length;
        const el = document.getElementById('loadingText');
        if(el) el.textContent = LOADING_PHRASES[i];
      }, 3000);
    }
  }
  function stopLoadingAnimation(){
    if(loadingTimer){ clearInterval(loadingTimer); loadingTimer = null; }
  }

  // ===== 提交玩家行动 =====
  async function submitAction(){
    const profile = getProfile();
    const inputEl = document.getElementById('inputBox');
    const btnEl = document.getElementById('sendBtn');
    if(!inputEl || !btnEl) return;

    const text = inputEl.value.trim();
    if(!text){
      inputEl.style.borderColor = '#8a3a2a';
      setTimeout(() => { inputEl.style.borderColor = ''; }, 800);
      return;
    }

    btnEl.disabled = true;
    btnEl.textContent = '...';
    inputEl.value = '';
    autoResizeInput(inputEl);

    const arr = loadStory(profile);
    const userItem = { id:'u_'+Date.now(), type:'user', text:text };
    arr.push(userItem);
    saveStory(profile, arr);

    const loadingItem = { id:'loading_'+Date.now(), type:'loading' };
    arr.push(loadingItem);
    renderStory(profile);
    startLoadingAnimation();

    const aiHistory = arr
      .filter(x => x.type === 'user' || x.type === 'ai')
      .map(x => ({ role: x.type==='user'?'user':'assistant', content: x.text }));

    try{
      const reply = await callAI(text, profile, aiHistory);
      const idx = arr.findIndex(x => x.id === loadingItem.id);
      if(idx !== -1){
        arr[idx] = { id:'a_'+Date.now(), type:'ai', text:reply };
      }
      saveStory(profile, arr);
      renderStory(profile);

      // ★ 章节转换检测
      const rounds = getCurrentRounds(profile);
      if(rounds >= MAX_ROUNDS){
        await doChapterTransition(profile);
      }
    }catch(e){
      const idx = arr.findIndex(x => x.id === loadingItem.id);
      if(idx !== -1){
        arr[idx] = { id:'e_'+Date.now(), type:'error', text:'【出错】'+e.message };
      }
      saveStory(profile, arr);
      renderStory(profile);
    }finally{
      stopLoadingAnimation();
      btnEl.disabled = false;
      btnEl.textContent = '发送';
    }
  }

  // ===== 章节转换 =====
  async function doChapterTransition(profile){
    const data = loadProfileData(profile);
    if(!data) return;
    const currentCh = data.currentChapter;
    const chTitle = getChapterTitle(profile, currentCh) || '第一章';

    // 显示"章节完结"过渡
    const arr = loadStory(profile);
    arr.push({ id:'chapter_end_'+Date.now(), type:'chapter-end', title: chTitle, text:'本章节已完结,正在衔接下一章...' });
    saveStory(profile, arr);
    renderStory(profile);

    try{
      const result = await callChapterTransition(profile, currentCh, chTitle);

      // 保存总结到当前章节
      if(data.chapters[currentCh]){
        data.chapters[currentCh].summary = result.summary;
      }

      // 创建新章节
      const nextCh = currentCh + 1;
      const nextChapterTitle = result.nextTitle || ('第'+nextCh+'章');
      data.chapters[nextCh] = {
        title: nextChapterTitle,
        summary: '',
        stories: [
          { id:'chapter_start_'+Date.now(), type:'chapter-start', title: nextChapterTitle, text: result.nextOpening }
        ]
      };
      data.currentChapter = nextCh;
      saveProfileData(profile, data);

      // 更新顶部标题
      const titleEl = document.getElementById('chapterTitle');
      if(titleEl) titleEl.textContent = nextChapterTitle;

      renderStory(profile);
    }catch(e){
      // 转换失败,移除过渡提示
      const idx = arr.findIndex(x => x.type === 'chapter-end');
      if(idx !== -1){
        arr[idx] = { id:'e_'+Date.now(), type:'error', text:'章节转换失败:'+e.message };
        saveStory(profile, arr);
      }
      renderStory(profile);
    }
  }

  // ===== 重新生成 =====
  async function regenerate(cardId){
    const profile = getProfile();
    const arr = loadStory(profile);
    const idx = arr.findIndex(x => x.id === cardId && x.type === 'ai');
    if(idx === -1) return;
    if(idx === 0 || arr[idx-1].type !== 'user'){
      alert('找不到对应的玩家输入,无法重新生成');
      return;
    }
    const userText = arr[idx-1].text;
    const loadingItem = { id:'loading_'+Date.now(), type:'loading' };
    arr[idx] = loadingItem;
    saveStory(profile, arr);
    renderStory(profile);
    startLoadingAnimation();

    const aiHistory = arr.slice(0, idx-1)
      .filter(x => x.type==='user' || x.type==='ai')
      .map(x => ({ role:x.type==='user'?'user':'assistant', content:x.text }));

    try{
      const reply = await callAI(userText, profile, aiHistory);
      const i2 = arr.findIndex(x => x.id === loadingItem.id);
      if(i2 !== -1){ arr[i2] = { id:'a_'+Date.now(), type:'ai', text:reply }; }
      saveStory(profile, arr);
      renderStory(profile);
    }catch(e){
      const i2 = arr.findIndex(x => x.id === loadingItem.id);
      if(i2 !== -1){ arr[i2] = { id:'e_'+Date.now(), type:'error', text:'【出错】'+e.message }; }
      saveStory(profile, arr);
      renderStory(profile);
    }finally{ stopLoadingAnimation(); }
  }

  // ===== 修改文本 =====
  function startEdit(cardId){
    const profile = getProfile();
    const arr = loadStory(profile);
    const idx = arr.findIndex(x => x.id === cardId);
    if(idx === -1) return;
    const item = arr[idx];
    if(item.type !== 'user' && item.type !== 'ai') return;

    const row = document.querySelector(`.msg-row[data-id="${cardId}"]`);
    if(!row) return;
    const bubble = row.querySelector('.msg-bubble');
    const actions = row.querySelector('.msg-actions');
    if(!bubble || !actions) return;

    const oldText = item.text;
    const editArea = document.createElement('div');
    editArea.className = 'msg-edit-area';
    editArea.innerHTML = `<textarea>${escapeHtml(oldText)}</textarea><div class="msg-edit-btns"><button class="cancel">取消</button><button class="save">保存</button></div>`;
    bubble.style.display = 'none';
    actions.style.display = 'none';
    bubble.parentNode.insertBefore(editArea, bubble.nextSibling);
    const textarea = editArea.querySelector('textarea');
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    editArea.querySelector('.cancel').addEventListener('click', () => {
      editArea.remove();
      bubble.style.display = '';
      actions.style.display = '';
    });

    editArea.querySelector('.save').addEventListener('click', async () => {
      const newText = textarea.value.trim();
      if(!newText){ textarea.style.borderColor = '#a04040'; return; }
      if(newText === oldText){ editArea.remove(); bubble.style.display = ''; actions.style.display = ''; return; }

      arr[idx].text = newText;
      saveStory(profile, arr);

      if(item.type === 'ai'){
        renderStory(profile);
      } else {
        const newArr = arr.slice(0, idx+1);
        saveStory(profile, newArr);
        renderStory(profile);
        await regenerateAfterEdit(profile, cardId, newText);
      }
    });
  }

  async function regenerateAfterEdit(profile, userId, userText){
    const arr = loadStory(profile);
    const userIdx = arr.findIndex(x => x.id === userId);
    if(userIdx === -1) return;

    const loadingItem = { id:'loading_'+Date.now(), type:'loading' };
    arr.push(loadingItem);
    saveStory(profile, arr);
    renderStory(profile);
    startLoadingAnimation();

    const aiHistory = arr.slice(0, userIdx)
      .filter(x => x.type==='user' || x.type==='ai')
      .map(x => ({ role:x.type==='user'?'user':'assistant', content:x.text }));

    const btnEl = document.getElementById('sendBtn');
    if(btnEl){ btnEl.disabled = true; btnEl.textContent = '...'; }

    try{
      const reply = await callAI(userText, profile, aiHistory);
      const i2 = arr.findIndex(x => x.id === loadingItem.id);
      if(i2 !== -1){ arr[i2] = { id:'a_'+Date.now(), type:'ai', text:reply }; }
      saveStory(profile, arr);
      renderStory(profile);
    }catch(e){
      const i2 = arr.findIndex(x => x.id === loadingItem.id);
      if(i2 !== -1){ arr[i2] = { id:'e_'+Date.now(), type:'error', text:'【出错】'+e.message }; }
      saveStory(profile, arr);
      renderStory(profile);
    }finally{
      stopLoadingAnimation();
      if(btnEl){ btnEl.disabled = false; btnEl.textContent = '发送'; }
    }
  }

  // ===== 配置提示条 =====
  function renderConfigBanner(){
    const banner = document.getElementById('configBanner');
    const textEl = document.getElementById('bannerText');
    if(!banner || !textEl) return;
    const cfg = loadAIConfig();
    if(cfg.apiKey && cfg.provider){
      const name = {deepseek:'DeepSeek',openai:'OpenAI',claude:'Anthropic',custom:'自定义'}[cfg.provider] || cfg.provider;
      banner.className = 'config-banner configured';
      textEl.innerHTML = `✅ 已配置 <span class="provider-tag">${name}</span> 直连模式`;
    } else {
      banner.className = 'config-banner';
      textEl.innerHTML = `⚡ 当前使用公共后端,国内较慢。填自己的 Key 可大幅提速`;
    }
  }

  // ===== 开场剧情初始化 =====
  function ensureOpening(profile){
    let data = loadProfileData(profile);
    if(!data){
      // 首次:创建章节结构
      data = { currentChapter: 1, chapters: {} };
    }
    if(!data.chapters) data.chapters = {};
    if(!data.chapters[1]){
      const openingText = profile === 'luojin'
        ? '你踏入归终殿的第一天就闯了个小祸——太兴奋,跑得太快,一头撞翻了符修院门口晾晒的符纸。\n\n见满地狼藉,栾方棋一愣,只好蹲下来和你一起捡:"你这孩子怎么咋咋呼呼的,走路也不看着点。"\n\n这位温和的符修大人没有责罚你,你不好意思地挠了挠头,心想归终殿好像没传说中那么可怕。\n\n"统修期三个月,符法刀法阵法枪法都要学。"一道冷冷的声音从身后传来,罗修不知何时站在了你身后,面无表情道,"你撞翻的是符纸,下回再撞翻什么,我可不管捡。"\n\n你吓了一跳,赶紧站直了身子,嘴快道:"知道了爹,我会注意的。"\n\n"出门在外,称职务。"\n\n你点点头:"哦……哦,首席大人。"\n\n你话音刚落,廊柱后便传来一声轻叹。魏元璟抱臂缓步走出来,眉头微蹙,目光在你和满地符纸之间转了转,显然已经看了一会儿了。\n\n"刚来第一天就砸场子?"魏元璟偏头看向罗修,"罗修,你这儿子,到底是随了谁?"\n\n罗修挑了挑眉:"当然是随你。"\n\n"我小时候可没这么莽。"魏元璟白了他一眼,又看向你,在你脑门上不轻不重地敲了一记,"下次再这样,罚你抄《殿规》一百遍。去吧。"\n\n你捂着脑门点点头,心想,这归终殿,果然还是有点可怕的。'
        : '踏入符修院的第一天,你心里揣着几分忐忑。见案上摆着栾方棋常用的紫竹符笔,你想帮忙整理,却不慎手一抖,碰翻了旁边的墨碟。\n\n浓墨泼洒,不仅弄脏了桌上的符纸,还溅了刚进门的栾方棋一身。\n\n你僵在原地,手足无措。栾方棋却未恼你,只弯腰用袖角替你擦去脸颊的墨点:"没事,符笔没断就好。"\n\n你暗暗松了口气,此时,门外传来极轻的脚步声。你抬头,见林淮悄无声息地站在廊下,什么都没说,只将一块素帕递了过来。他目光淡淡扫过你,你下意识站直了身子,把脱口而出的"爹"咽了回去,小声道:"……淮大人。"\n\n林淮微微颔首,替栾方棋拂去肩头的墨渍,转身走了。\n\n栾方棋拍了拍你的肩膀,笑着说:"既然来了,就按规矩从头学起,不可骄躁。"\n\n你郑重地点点头。\n\n这时,空中传来一声闷响——是罗修拎着罗烬的衣领,把人扔到了讲武堂的训练场里。你偷偷瞥了一眼,心想,在这归终殿的三年,想必不会太无聊。';
      data.chapters[1] = {
        title: profile==='luojin' ? '第一章 · 刀与火' : '第一章 · 归终殿的新叶',
        summary: '',
        stories: [{ id:'opening', type:'opening', text:openingText }]
      };
      saveProfileData(profile, data);
    } else if(!data.chapters[1].stories || data.chapters[1].stories.length === 0){
      // 有章节但没剧情
      const openingText = profile === 'luojin' ? '你踏入归终殿的第一天就闯了个小祸...' : '踏入符修院的第一天,你心里揣着几分忐忑...';
      data.chapters[1].stories = [{ id:'opening', type:'opening', text:openingText }];
      saveProfileData(profile, data);
    }
  }

  // ===== 输入框自适应 =====
  function autoResizeInput(el){
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  // ===== 全局事件委托 =====
  document.addEventListener('click', function(e){
    const btn = e.target.closest('.msg-action-btn');
    if(!btn) return;
    const action = btn.dataset.action;
    const cardId = btn.dataset.id;
    if(action === 'regenerate'){ regenerate(cardId); }
    else if(action === 'edit'){ startEdit(cardId); }
  });

  // ===== 输入框事件 =====
  function bindInput(){
    const inputEl = document.getElementById('inputBox');
    const btnEl = document.getElementById('sendBtn');
    if(!inputEl || !btnEl) return;
    if(inputEl.dataset.bound) return;
    inputEl.dataset.bound = '1';
    inputEl.addEventListener('input', () => autoResizeInput(inputEl));
    inputEl.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); submitAction(); }
    });
    btnEl.addEventListener('click', submitAction);
  }

  // ===== 注入章节相关样式 =====
  function injectChapterStyles(){
    if(document.getElementById('chapterStyles')) return;
    const s = document.createElement('style');
    s.id = 'chapterStyles';
    s.textContent = `
      .chapter-end-banner{text-align:center;padding:20px;margin:16px 0;border-top:1px solid var(--border-light);border-bottom:1px solid var(--border-light)}
      .chapter-end-sym{font-size:1.5rem;color:var(--profile-accent,var(--accent));margin-bottom:6px}
      .chapter-end-title{font-size:1rem;font-weight:600;color:var(--text-primary);margin-bottom:4px}
      .chapter-end-text{font-size:.8rem;color:var(--text-muted);font-style:italic}
      .chapter-start-banner{text-align:center;padding:20px;margin:16px 0}
      .chapter-start-sym{font-size:1.5rem;color:var(--profile-accent,var(--accent));margin-bottom:6px}
      .chapter-start-title{font-size:1.1rem;font-weight:600;color:var(--text-primary);margin-bottom:8px;letter-spacing:2px}
      .chapter-start-text{font-size:.95rem;color:var(--text-secondary);line-height:1.8;white-space:pre-wrap}
      .msg-row.center{justify-content:center}
      /* 侧边栏 */
      #chapterSidebar{display:flex;flex-direction:column;gap:4px;overflow-y:auto;max-height:100%}
      .ch-item{padding:8px 10px;border:1px solid var(--border-light);border-radius:6px;cursor:pointer;transition:all .2s;background:var(--bg-card)}
      .ch-item:hover{border-color:var(--profile-accent,var(--accent));background:var(--bg-hover)}
      .ch-item.active{border-color:var(--profile-accent,var(--accent));background:var(--bg-accent-soft,rgba(138,58,42,.04))}
      .ch-num{font-size:.7rem;color:var(--text-muted);font-family:var(--font-mono);letter-spacing:1px}
      .ch-title{font-size:.8rem;color:var(--text-primary);font-weight:500;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ch-status{font-size:.65rem;color:var(--text-muted);margin-top:2px}
      .ch-empty{font-size:.75rem;color:var(--text-muted);text-align:center;padding:20px}
      .back-to-current-btn{padding:8px 20px;border:1.5px solid var(--accent);border-radius:18px;background:transparent;color:var(--accent);font-family:var(--font-serif);font-size:.85rem;cursor:pointer;transition:all .2s}
      .back-to-current-btn:hover{background:var(--accent);color:var(--bg-card)}
    `;
    document.head.appendChild(s);
  }

  // ===== 启动 =====
  function boot(){
    injectChapterStyles();
    const profile = getProfile();
    ensureOpening(profile);
    renderStory(profile);
    renderConfigBanner();
    bindInput();
    console.log('◈ 模拟AI.js v4 已加载,角色:', profile, '当前章节:', getCurrentChapter(profile), hasUserKey()?'[直连]':'[兜底]');
  }

  // 暴露到全局(让章节目录面板能调用)
  window.switchChapter = switchChapter;

  window.addEventListener('pageshow', renderConfigBanner);
  window.addEventListener('storage', function(e){
    if(e.key === CONFIG_KEY) renderConfigBanner();
  });

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
