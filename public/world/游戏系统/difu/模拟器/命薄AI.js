// ===== 命薄AI.js · 引渡人模拟器 AI 剧情流引擎 v2 =====
// v2 新增:
// 1. 双模式 AI 调用(玩家自带 Key 优先直连,无 Key 走 Worker 兜底)
// 2. 未填 Key 时显示「前往设置」快速跳转提示
// 3. 动态加载文案(避免用户以为卡死)
//
// 部署步骤:
// 直接用这个文件覆盖原来的 命薄AI.js 即可,不需要改 命薄.html

(function(){
  'use strict';

  // ===== 配置区 =====
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  // ★ 重要!把下面这行的地址换成你自己的 Cloudflare Worker 地址!
  // ★ 这个是「兜底后端」,玩家没填 Key 时会走这里(较慢)
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  const WORKER_URL = 'https://difu-ai.2629885225.workers.dev';

  // 每个角色最多保留多少条历史(超出自动挤掉最旧的)
  const MAX_HISTORY = 10;

  // localStorage 存储键
  const STORAGE_KEY = 'gzd_ai_story';        // 剧情历史
  const CONFIG_KEY = 'gzd_ai_config';        // 设置页保存的 AI 配置

  // 各服务商的接口配置
  const PROVIDER_CONFIG = {
    deepseek: { baseUrl: 'https://api.deepseek.com', defaultModel: 'deepseek-chat', format: 'openai' },
    openai:   { baseUrl: 'https://api.openai.com',    defaultModel: 'gpt-4o-mini',  format: 'openai' },
    claude:   { baseUrl: 'https://api.anthropic.com', defaultModel: 'claude-3-5-sonnet-20241022', format: 'claude' },
    custom:   { baseUrl: '',                          defaultModel: '',             format: 'openai' }
  };

  // 动态加载文案(每 3 秒切换一句,让用户知道在动)
  const LOADING_PHRASES = [
    '浮生树正在低语...',
    '花瓣正在飘落...',
    '归终殿的钟声敲响...',
    '忘川水缓缓流过...',
    '阴气正在汇聚...',
    '魂力正在流转...'
  ];

  // ===== 读取存档 =====
  function loadStory(profile){
    try{
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return all[profile] || [];
    }catch(e){ return []; }
  }

  // ===== 保存存档 =====
  function saveStory(profile, arr){
    try{
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      all[profile] = arr;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }catch(e){ console.warn('存档失败:', e); }
  }

  // ===== 读取玩家在设置页保存的 AI 配置 =====
  function loadAIConfig(){
    try{
      return JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
    }catch(e){ return {}; }
  }

  // ===== 判断玩家是否配置了自己的 Key =====
  function hasUserKey(){
    const cfg = loadAIConfig();
    return !!(cfg.apiKey && cfg.provider);
  }

  // ===== 核心:调用 AI(双模式) =====
  // 模式 1:玩家填了 Key → 直连 AI 服务商(快)
  // 模式 2:没填 Key → 走 Worker 兜底(慢,但能用)
  async function callAI(message, profile, history){
    const cfg = loadAIConfig();

    if(cfg.apiKey && cfg.provider){
      // 模式 1:直连
      return await callDirect(message, profile, history, cfg);
    } else {
      // 模式 2:Worker 兜底
      return await callWorker(message, profile, history);
    }
  }

  // ===== 模式 1:玩家填了 Key,直连 AI 服务商 =====
  async function callDirect(message, profile, history, cfg){
    const provider = cfg.provider;
    const pConfig = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.deepseek;
    const baseUrl = provider === 'custom' ? (cfg.customUrl || '') : pConfig.baseUrl;
    const model = cfg.model || pConfig.defaultModel;
    const apiKey = cfg.apiKey;

    if(!baseUrl){
      throw new Error('接口地址为空,请前往设置页填写');
    }

    // 拼装 system prompt(和 Worker 后端一致)
    const systemPrompt = buildSystemPrompt(profile);

    // 构造 messages
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-MAX_HISTORY),
      { role: 'user', content: message }
    ];

    // 根据服务商格式发请求
    let url, headers, body;
    if(pConfig.format === 'claude'){
      // Anthropic 格式
      url = baseUrl + '/v1/messages';
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      };
      // Claude 的 system 是顶层字段,不在 messages 里
      const claudeMessages = messages.filter(m => m.role !== 'system');
      body = JSON.stringify({
        model: model,
        max_tokens: 500,
        system: systemPrompt,
        messages: claudeMessages
      });
    } else {
      // OpenAI / DeepSeek / 自定义(都是 OpenAI 兼容格式)
      url = baseUrl + '/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      };
      body = JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: 500,
        temperature: 0.8
      });
    }

    const resp = await fetch(url, { method: 'POST', headers, body });
    const data = await resp.json();

    if(!resp.ok){
      // 常见错误友好提示
      const errMsg = data.error?.message || data.error || JSON.stringify(data);
      if(resp.status === 401) throw new Error('API Key 无效或已失效,请前往设置页检查');
      if(resp.status === 402) throw new Error('AI 服务商余额不足,请前往充值');
      if(resp.status === 429) throw new Error('请求过于频繁,请稍后再试');
      throw new Error(`AI 返回错误(${resp.status}):${errMsg}`);
    }

    // 提取回复文本
    let reply = '';
    if(pConfig.format === 'claude'){
      reply = data.content?.[0]?.text || '';
    } else {
      reply = data.choices?.[0]?.message?.content || '';
    }

    if(!reply){
      throw new Error('AI 返回了空内容,请重试');
    }
    return reply;
  }

  // ===== 模式 2:走 Worker 兜底 =====
  async function callWorker(message, profile, history){
    const resp = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, profile, history })
    });
    const data = await resp.json();
    if(data.error) throw new Error(data.error);
    return data.reply;
  }

  // ===== System Prompt 构造(直连模式用,和 Worker 后端保持一致) =====
  function buildSystemPrompt(profile){
    return `你是「引渡人模拟器·归终殿」的剧情生成 AI。

【当前玩家角色】
${profile === 'luojin' ? '罗烬:讲武堂弟子,承刀法一脉,性情刚直果决,与林栖梧有同门之谊。当前层级:统修期。' : '林栖梧:符修院助教,身负浮生树血脉,双亲为林淮与栾方棋。性情内敛重情,擅符箓与感知。当前层级:统修期,评级甲等下品。'}

请始终以"当前玩家角色"的视角生成剧情,不要混淆两个主角。

【世界观】
苍珩四百三十五年,地府归终殿执掌亡魂引渡与功过裁定。殿辖符修院、讲武堂、音律坊与忘川东段。符修院以符箓通幽,讲武堂以刀法镇魂,音律坊以琴笛渡灵,忘川东段为魂流汇聚之地。三脉同源,共维归终殿秩序。

【主角档案】
林栖梧:符修院助教,身负浮生树血脉,双亲为林淮与栾方棋。性情内敛重情,擅符箓与感知。当前层级:统修期,评级甲等下品。
罗烬:讲武堂弟子,承刀法一脉,性情刚直果决,与林栖梧有同门之谊。当前层级:统修期。

【主要地点】
归终殿(中枢)、符修院、讲武堂、忘川东段、音律坊、归终正殿(试炼司/殿务司所在)。

【NPC】
栾方棋:符修院助教,林栖梧生父之一,温和严谨。
罗修:讲武堂执教,刀法严苛,罗烬师长。
程木栖:古琴师,音律坊核心,通以音渡魂之术。
魏元璟:摧城笛传人,笛声可破阵镇魂,身份存疑。

【战力与晋升体系】
弟子六项属性:魂力、体术、法术、防御、意志、敏捷。综合计算得战力值,并给出评级(如甲等下品、乙等上品等)。

归终殿弟子约2000余人,分六层:
杂役(5%,~100人)→ 统修期(15%,~300人)→ 入门期(60%,~1200人)→ 内门期(15%,~300人)→ 准十席级(4.5%,~90人)→ 十席(0.5%,10人)

晋升规则:
- 每月初一至初五,可前往归终正殿「试炼司」预约战力测试。战力达标后向「殿务司」提出晋升申请。
- 统修期→入门期:六科统修考核均≥60分(六科:符法、刀法、阵法、枪法、引渡实务、魂力控制/医药基础)。
- 入门期→内门期:战力值>500。
- 内门期→准十席级:战力值>800。
- 准十席级→十席:战力值>800,且挑战现十席成功。十席按战力排名,击败现任十席即可取而代之,原十席顺延一位,第十席被挤出前十。

统修期说明:新入殿弟子第一阶段,为期三个月。未通过者可补考,三次未过转为杂役。每月可预约一次战力测试。

【殿规】
1. 不可轻视杂役:轻慢杂役者罚抄殿规百遍;欺凌杂役者逐出归终殿。
2. 不可对十席不敬:轻则罚俸三月,重则逐出归终殿。
3. 晋升须经正规测试:私自挑战或冒充层级者,视同欺师灭祖,废除修为,逐出归终殿。

【风格要求】
古风地府基调,师徒与亲情羁绊交织,含蓄隽永,善用留白。单段剧情控制在200字以内,避免直白抒情,以细节与氛围传递情绪。剧情需与角色当前层级、战力水平、殿规相呼应。

【重要约束】
1. 永远用第二人称"你"来叙述玩家角色的行动
2. 不要替玩家做重大决定(比如不要写"你答应了他"),只描述环境和他人反应
3. 如果玩家输入的行动不合理(比如"瞬间成神"),要用地府规则委婉拒绝或转化
4. 自然延续之前的剧情,引用前文出现过的细节、NPC、地点`;
  }

  // ===== 渲染单条剧情卡片 =====
  function renderCard(item, profile){
    const card = document.createElement('div');
    card.className = 'ai-story-card ai-story-' + item.type;
    card.dataset.id = item.id;

    if(item.type === 'opening'){
      card.innerHTML = `
        <div class="ai-story-label">❀ 开场 · 归终殿的新叶</div>
        <div class="ai-story-text">${escapeHtml(item.text)}</div>
      `;
    } else if(item.type === 'user'){
      card.innerHTML = `
        <div class="ai-story-label">✦ 你的行动</div>
        <div class="ai-story-text">${escapeHtml(item.text)}</div>
      `;
    } else if(item.type === 'ai'){
      card.innerHTML = `
        <div class="ai-story-label">◈ 浮生树回应</div>
        <div class="ai-story-text">${escapeHtml(item.text)}</div>
        <div class="ai-story-actions">
          <button class="ai-action-btn" data-action="regenerate" data-id="${item.id}" title="重新生成这段剧情">⟲ 重新生成</button>
        </div>
      `;
    }
    return card;
  }

  // ===== HTML 转义 =====
  function escapeHtml(t){
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML.replace(/\n/g, '<br>');
  }

  // ===== 渲染整个剧情流 =====
  function renderStoryList(profile){
    const listEl = document.getElementById('aiStoryList-' + profile);
    if(!listEl) return;
    const arr = loadStory(profile);
    listEl.innerHTML = '';
    arr.forEach(item => listEl.appendChild(renderCard(item, profile)));
    listEl.scrollTop = listEl.scrollHeight;
  }

  // ===== 动态加载文案 =====
  let loadingTimer = null;
  function startLoadingAnimation(btnEl){
    let i = 0;
    btnEl.textContent = LOADING_PHRASES[0];
    loadingTimer = setInterval(() => {
      i = (i + 1) % LOADING_PHRASES.length;
      btnEl.textContent = LOADING_PHRASES[i];
    }, 3000);
  }
  function stopLoadingAnimation(btnEl){
    if(loadingTimer){
      clearInterval(loadingTimer);
      loadingTimer = null;
    }
    btnEl.textContent = '发送行动';
  }

  // ===== 提交玩家行动 =====
  async function submitAction(profile){
    const inputEl = document.getElementById('aiStoryInput-' + profile);
    const btnEl = document.getElementById('aiStorySubmit-' + profile);
    if(!inputEl || !btnEl) return;

    const text = inputEl.value.trim();
    if(!text){
      inputEl.style.borderColor = '#8a3a2a';
      setTimeout(() => { inputEl.style.borderColor = ''; }, 800);
      return;
    }

    // 锁定 UI + 动态文案
    btnEl.disabled = true;
    startLoadingAnimation(btnEl);
    inputEl.value = '';

    // 先把玩家输入插进列表(立即反馈)
    const arr = loadStory(profile);
    const userItem = { id: 'u_' + Date.now(), type: 'user', text: text };
    arr.push(userItem);
    if(arr.length > MAX_HISTORY * 2 + 1) arr.shift();
    saveStory(profile, arr);
    renderStoryList(profile);

    // 构造给 AI 的历史
    const aiHistory = arr
      .filter(x => x.type === 'user' || x.type === 'ai')
      .map(x => ({
        role: x.type === 'user' ? 'user' : 'assistant',
        content: x.text
      }));

    try{
      const reply = await callAI(text, profile, aiHistory);

      const aiItem = { id: 'a_' + Date.now(), type: 'ai', text: reply };
      arr.push(aiItem);
      if(arr.length > MAX_HISTORY * 2 + 1) arr.shift();
      saveStory(profile, arr);
      renderStoryList(profile);
    }catch(e){
      const errItem = { id: 'e_' + Date.now(), type: 'ai', text: '【出错】' + e.message };
      arr.push(errItem);
      saveStory(profile, arr);
      renderStoryList(profile);
    }finally{
      stopLoadingAnimation(btnEl);
    }
  }

  // ===== 重新生成某条 AI 回应 =====
  async function regenerate(profile, cardId){
    const arr = loadStory(profile);
    const idx = arr.findIndex(x => x.id === cardId && x.type === 'ai');
    if(idx === -1) return;

    if(idx === 0 || arr[idx-1].type !== 'user'){
      alert('找不到对应的玩家输入,无法重新生成');
      return;
    }
    const userText = arr[idx-1].text;

    const cardEl = document.querySelector(`.ai-story-card[data-id="${cardId}"] .ai-action-btn`);
    if(cardEl){
      cardEl.disabled = true;
      cardEl.textContent = '重新生成中...';
    }

    const aiHistory = arr.slice(0, idx-1)
      .filter(x => x.type === 'user' || x.type === 'ai')
      .map(x => ({
        role: x.type === 'user' ? 'user' : 'assistant',
        content: x.text
      }));

    try{
      const reply = await callAI(userText, profile, aiHistory);
      arr[idx].text = reply;
      saveStory(profile, arr);
      renderStoryList(profile);
    }catch(e){
      alert('重新生成失败:' + e.message);
      if(cardEl){
        cardEl.disabled = false;
        cardEl.textContent = '⟲ 重新生成';
      }
    }
  }

  // ===== 初始化某个角色的剧情流(第一次进入时插入开场白) =====
  function ensureOpening(profile){
    let arr = loadStory(profile);
    if(arr.length === 0 || arr[0].type !== 'opening'){
      const openingText = profile === 'luojin'
        ? '你踏入归终殿的第一天就闯了个小祸——太兴奋,跑得太快,一头撞翻了符修院门口晾晒的符纸。\n\n见满地狼藉，栾方棋一愣，只好蹲下来和你一起捡:"你这孩子怎么咋咋呼呼的，走路也不看着点。"\n\n这位温和的符修大人没有责罚你，你不好意思地挠了挠头,心想归终殿好像没传说中那么可怕。\n\n"统修期三个月，符法刀法阵法枪法都要学。"一道冷冷的声音从身后传来，罗修不知何时站在了你身后，面无表情道，"你撞翻的是符纸，下回再撞翻什么，我可不管捡。"\n\n你吓了一跳，赶紧站直了身子，嘴快道："知道了爹，我会注意的。"\n\n"出门在外，称职务。"\n\n你点点头："哦……哦，首席大人。"\n\n你话音刚落，廊柱后便传来一声轻叹。魏元璟抱臂缓步走出来，眉头微蹙，目光在你和满地符纸之间转了转，显然已经看了一会儿了。\n\n"刚来第一天就砸场子？"魏元璟偏头看向罗修，"罗修，你这儿子，到底是随了谁？"\n\n罗修挑了挑眉："当然是随你。"\n\n"我小时候可没这么莽。"魏元璟白了他一眼，又看向你，在你脑门上不轻不重地敲了一记，"下次再这样，罚你抄《殿规》一百遍。去吧。"\n\n你捂着脑门点点头，心想，这归终殿，果然还是有点可怕的。'
        : '踏入符修院的第一天，你心里揣着几分忐忑。见案上摆着栾方棋常用的紫竹符笔，你想帮忙整理，却不慎手一抖，碰翻了旁边的墨碟。\n\n浓墨泼洒，不仅弄脏了桌上的符纸，还溅了刚进门的栾方棋一身。\n\n你僵在原地，手足无措。栾方棋却未恼你，只弯腰用袖角替你擦去脸颊的墨点："没事，符笔没断就好。"\n\n你暗暗松了口气，此时，门外传来极轻的脚步声。你抬头，见林淮悄无声息地站在廊下，什么都没说，只将一块素帕递了过来。他目光淡淡扫过你，你下意识站直了身子，把脱口而出的"爹"咽了回去，小声道："……淮大人。"\n\n林淮微微颔首，替栾方棋拂去肩头的墨渍，转身走了。\n\n栾方棋拍了拍你的肩膀，笑着说："既然来了，就按规矩从头学起，不可骄躁。"\n\n你郑重地点点头。\n\n这时，空中传来一声闷响——是罗修拎着罗烬的衣领，把人扔到了讲武堂的训练场里。你偷偷瞥了一眼，心想，在这归终殿的三年，想必不会太无聊。';
      arr = [{ id: 'opening', type: 'opening', text: openingText }];
      saveStory(profile, arr);
    }
  }

  // ===== 注入 CSS 样式 =====
  function injectStyles(){
    if(document.getElementById('aiStoryStyles')) return;
    const style = document.createElement('style');
    style.id = 'aiStoryStyles';
    style.textContent = `
      /* ===== AI 剧情流样式 ===== */
      .ai-story-container{
        display:flex; flex-direction:column; gap:10px;
        max-height: 500px; overflow-y: auto;
        padding-right: 4px;
        margin-bottom: 12px;
      }
      .ai-story-container::-webkit-scrollbar{width:4px;}
      .ai-story-container::-webkit-scrollbar-thumb{background:var(--border-card);border-radius:2px;}
      .ai-story-card{
        padding:12px 14px; border-radius:8px;
        border:1px solid var(--border-light);
        background: var(--bg-accent-soft);
        animation: aiStoryFadeIn 0.4s ease;
      }
      @keyframes aiStoryFadeIn{
        from{opacity:0; transform:translateY(8px);}
        to{opacity:1; transform:translateY(0);}
      }
      .ai-story-label{
        font-size:0.7rem; color:var(--text-muted);
        letter-spacing:1.5px; margin-bottom:6px;
        font-family:var(--font-mono);
      }
      .ai-story-text{
        font-size:0.92rem; color:var(--text-primary);
        line-height:1.8;
      }
      .ai-story-opening{
        border-left: 3px solid var(--profile-accent, var(--accent));
        background: rgba(138,58,42,0.03);
      }
      .ai-story-user{
        border-left: 3px solid var(--text-muted);
        background: var(--bg-accent-soft);
      }
      .ai-story-ai{
        border-left: 3px solid var(--profile-accent, var(--accent));
        background: var(--bg-card);
      }
      .ai-story-actions{
        margin-top:8px; text-align:right;
      }
      .ai-action-btn{
        background:transparent; border:1px solid var(--border-card);
        color:var(--text-muted); padding:3px 10px;
        font-size:0.7rem; border-radius:12px; cursor:pointer;
        font-family:var(--font-mono); transition:all 0.2s;
      }
      .ai-action-btn:hover:not(:disabled){
        border-color:var(--accent); color:var(--accent);
      }
      .ai-action-btn:disabled{opacity:0.5;cursor:wait;}

      .ai-story-input-row{
        display:flex; gap:8px; margin-top:12px;
      }
      .ai-story-input{
        flex:1; padding:10px 12px;
        background:var(--bg-card); color:var(--text-primary);
        border:1px solid var(--border-card); border-radius:8px;
        font-family:inherit; font-size:0.92rem;
        transition:border-color 0.2s;
      }
      .ai-story-input:focus{
        outline:none; border-color:var(--accent);
      }
      .ai-story-submit{
        padding:10px 18px; background:transparent;
        border:1.5px solid var(--accent); color:var(--accent);
        border-radius:8px; cursor:pointer;
        font-family:inherit; font-size:0.92rem;
        letter-spacing:1px; transition:all 0.2s;
        white-space:nowrap;
      }
      .ai-story-submit:hover:not(:disabled){
        background:var(--accent); color:var(--bg-card);
      }
      .ai-story-submit:disabled{opacity:0.5;cursor:wait;}

      /* ===== 快速跳转设置提示条 ===== */
      .ai-config-banner{
        margin-bottom: 10px;
        padding: 8px 12px;
        background: var(--bg-accent-soft);
        border: 1px dashed var(--border-card);
        border-radius: 6px;
        font-size: 0.78rem;
        color: var(--text-secondary);
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .ai-config-banner.configured{
        border-style: solid;
        border-color: rgba(80,140,80,0.3);
        background: rgba(80,140,80,0.06);
        color: var(--text-muted);
      }
      .ai-config-banner .banner-icon{
        font-size: 0.9rem;
      }
      .ai-config-banner .banner-text{
        flex: 1;
        min-width: 0;
        line-height: 1.5;
      }
      .ai-config-banner .banner-link{
        color: var(--accent);
        text-decoration: none;
        border-bottom: 1px dotted var(--accent);
        padding-bottom: 1px;
        font-family: var(--font-mono);
        font-size: 0.75rem;
        white-space: nowrap;
      }
      .ai-config-banner .banner-link:hover{
        opacity: 0.7;
      }
      .ai-config-banner .provider-tag{
        display: inline-block;
        padding: 1px 8px;
        background: rgba(80,140,80,0.15);
        color: #5a8a5a;
        border-radius: 8px;
        font-size: 0.7rem;
        font-family: var(--font-mono);
        letter-spacing: 0.5px;
      }
      [data-theme="dark"] .ai-config-banner .provider-tag{
        background: rgba(120,180,120,0.12);
        color: #8ab88a;
      }
    `;
    document.head.appendChild(style);
  }

  // ===== 渲染配置提示条 =====
  function renderConfigBanner(profile){
    const bannerEl = document.getElementById('aiConfigBanner-' + profile);
    if(!bannerEl) return;

    const cfg = loadAIConfig();
    if(cfg.apiKey && cfg.provider){
      const providerName = {
        deepseek: 'DeepSeek',
        openai: 'OpenAI',
        claude: 'Anthropic',
        custom: '自定义接口'
      }[cfg.provider] || cfg.provider;
      bannerEl.className = 'ai-config-banner configured';
      bannerEl.innerHTML = `
        <span class="banner-icon">✅</span>
        <span class="banner-text">已配置 <span class="provider-tag">${providerName}</span> 直连模式,速度更快</span>
        <a class="banner-link" href="./设置.html">管理 →</a>
      `;
    } else {
      bannerEl.className = 'ai-config-banner';
      bannerEl.innerHTML = `
        <span class="banner-icon">⚡</span>
        <span class="banner-text">当前使用公共后端,国内访问较慢。填写自己的 API Key 可大幅提速</span>
        <a class="banner-link" href="./设置.html">前往设置 →</a>
      `;
    }
  }

  // ===== 初始化某个角色 =====
  function initProfile(profile){
    ensureOpening(profile);
    renderStoryList(profile);
    renderConfigBanner(profile);

    const btn = document.getElementById('aiStorySubmit-' + profile);
    const input = document.getElementById('aiStoryInput-' + profile);
    if(btn && !btn.dataset.bound){
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => submitAction(profile));
    }
    if(input && !input.dataset.bound){
      input.dataset.bound = '1';
      input.addEventListener('keydown', function(e){
        if(e.key === 'Enter' && !e.shiftKey){
          e.preventDefault();
          submitAction(profile);
        }
      });
    }
  }

  // ===== 全局事件委托(重新生成按钮) =====
  document.addEventListener('click', function(e){
    const btn = e.target.closest('.ai-action-btn');
    if(!btn) return;
    const action = btn.dataset.action;
    const cardId = btn.dataset.id;
    if(action === 'regenerate'){
      const profile = document.body.getAttribute('data-profile') || 'linxiwu';
      regenerate(profile, cardId);
    }
  });

  // ===== 角色切换时重新渲染 =====
  window.addEventListener('profilechange', function(e){
    initProfile(e.detail.profile);
  });

  // ===== 每次从设置页返回时刷新提示条 =====
  // 监听 localStorage 变化(同页面跨标签页有效;同标签页用 pageshow)
  window.addEventListener('pageshow', function(){
    const profile = (window.GZD && GZD.Storage && GZD.Storage.getProfile) ? GZD.Storage.getProfile() : 'linxiwu';
    renderConfigBanner(profile);
  });
  window.addEventListener('storage', function(e){
    if(e.key === CONFIG_KEY){
      const profile = (window.GZD && GZD.Storage && GZD.Storage.getProfile) ? GZD.Storage.getProfile() : 'linxiwu';
      renderConfigBanner(profile);
    }
  });

  // ===== 启动 =====
  function boot(){
    injectStyles();
    const profile = (window.GZD && GZD.Storage && GZD.Storage.getProfile) ? GZD.Storage.getProfile() : 'linxiwu';
    initProfile(profile);
    console.log('◈ 命薄AI.js v2 已加载,当前角色:', profile, hasUserKey() ? '[直连模式]' : '[兜底模式]');
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();