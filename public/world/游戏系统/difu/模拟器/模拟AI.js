// ===== 模拟AI.js · 引渡人模拟器 AI 剧情流引擎 v3 =====
// v3 改造重点:
// 1. 适配 模拟.html 的左/右气泡布局(借鉴美高模拟器)
// 2. 新增「修改文本」功能(玩家行动 + AI 回应都能改)
// 3. 玩家行动改了之后,从该条开始重新生成所有后续 AI 回应
// 4. AI 回应的「修改文本」是纯本地编辑(不调 AI),「重新生成」才调 AI
// 5. 复用 命薄AI.js 的双模式(直连 + Worker 兜底)和动态加载文案
//
// 部署步骤:
// 直接上传这个文件到 模拟器/ 目录(和 命薄AI.js 同级)

(function(){
  'use strict';

  // ===== 配置区 =====
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  // ★ Worker 兜底地址(玩家没填 Key 时用这个)
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  const WORKER_URL = 'https://difu-ai.2629885225.workers.dev';

  const MAX_HISTORY = 10;
  const STORAGE_KEY = 'gzd_ai_story';   // 和命薄页共享同一份存档
  const CONFIG_KEY = 'gzd_ai_config';

  const PROVIDER_CONFIG = {
    deepseek: { baseUrl: 'https://api.deepseek.com', defaultModel: 'deepseek-chat', format: 'openai' },
    openai:   { baseUrl: 'https://api.openai.com',    defaultModel: 'gpt-4o-mini',  format: 'openai' },
    claude:   { baseUrl: 'https://api.anthropic.com', defaultModel: 'claude-3-5-sonnet-20241022', format: 'claude' },
    custom:   { baseUrl: '',                          defaultModel: '',             format: 'openai' }
  };

  const LOADING_PHRASES = [
    '浮生树正在低语',
    '花瓣正在飘落',
    '归终殿的钟声敲响',
    '忘川水缓缓流过',
    '阴气正在汇聚',
    '魂力正在流转'
  ];

  // ===== 存档读写(和命薄页共享) =====
  function loadStory(profile){
    try{
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return all[profile] || [];
    }catch(e){ return []; }
  }
  function saveStory(profile, arr){
    try{
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      all[profile] = arr;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }catch(e){ console.warn('存档失败:', e); }
  }
  function loadAIConfig(){
    try{ return JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}'); }
    catch(e){ return {}; }
  }
  function hasUserKey(){
    const cfg = loadAIConfig();
    return !!(cfg.apiKey && cfg.provider);
  }

  // ===== 当前角色 =====
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
      headers = {
        'Content-Type':'application/json',
        'x-api-key':cfg.apiKey,
        'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access':'true'
      };
      const claudeMsgs = messages.filter(m => m.role !== 'system');
      body = JSON.stringify({
        model, max_tokens: 500, system: systemPrompt, messages: claudeMsgs
      });
    } else {
      url = baseUrl + '/v1/chat/completions';
      headers = {
        'Content-Type':'application/json',
        'Authorization':'Bearer ' + cfg.apiKey
      };
      body = JSON.stringify({
        model, messages, max_tokens: 500, temperature: 0.8
      });
    }

    const resp = await fetch(url, { method:'POST', headers, body });
    const data = await resp.json();
    if(!resp.ok){
      const errMsg = data.error?.message || data.error || JSON.stringify(data);
      if(resp.status === 401) throw new Error('API Key 无效或已失效,请前往设置页检查');
      if(resp.status === 402) throw new Error('AI 服务商余额不足,请前往充值');
      if(resp.status === 429) throw new Error('请求过于频繁,请稍后再试');
      throw new Error(`AI 返回错误(${resp.status}):${errMsg}`);
    }
    let reply = '';
    if(pConfig.format === 'claude'){
      reply = data.content?.[0]?.text || '';
    } else {
      reply = data.choices?.[0]?.message?.content || '';
    }
    if(!reply) throw new Error('AI 返回了空内容,请重试');
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

  // ===== HTML 转义 =====
  function escapeHtml(t){
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML.replace(/\n/g,'<br>');
  }

  // ===== 渲染单条消息 =====
  function renderMessage(item){
    const row = document.createElement('div');
    row.className = 'msg-row';
    row.dataset.id = item.id;

    if(item.type === 'opening'){
      row.className += ' left opening';
      row.innerHTML = `
        <div class="msg-avatar">❀</div>
        <div class="msg-bubble-wrap">
          <div class="msg-label">开场 · 归终殿的新叶</div>
          <div class="msg-bubble">${escapeHtml(item.text)}</div>
        </div>
      `;
    } else if(item.type === 'user'){
      row.className += ' right';
      row.innerHTML = `
        <div class="msg-bubble-wrap">
          <div class="msg-label">你的行动</div>
          <div class="msg-bubble" data-text="${encodeURIComponent(item.text)}">${escapeHtml(item.text)}</div>
          <div class="msg-actions">
            <button class="msg-action-btn" data-action="edit" data-id="${item.id}">✎ 修改</button>
          </div>
        </div>
        <div class="msg-avatar">✦</div>
      `;
    } else if(item.type === 'ai'){
      row.className += ' left';
      row.innerHTML = `
        <div class="msg-avatar">◈</div>
        <div class="msg-bubble-wrap">
          <div class="msg-label">浮生树回应</div>
          <div class="msg-bubble" data-text="${encodeURIComponent(item.text)}">${escapeHtml(item.text)}</div>
          <div class="msg-actions">
            <button class="msg-action-btn" data-action="edit" data-id="${item.id}">✎ 修改</button>
            <button class="msg-action-btn" data-action="regenerate" data-id="${item.id}">⟲ 重新生成</button>
          </div>
        </div>
      `;
    } else if(item.type === 'error'){
      row.className += ' left error';
      row.innerHTML = `
        <div class="msg-avatar">⚠</div>
        <div class="msg-bubble-wrap">
          <div class="msg-label">出错</div>
          <div class="msg-bubble">${escapeHtml(item.text)}</div>
        </div>
      `;
    } else if(item.type === 'loading'){
      row.className += ' left';
      row.innerHTML = `
        <div class="msg-avatar">◈</div>
        <div class="msg-bubble-wrap">
          <div class="msg-label" id="loadingLabel">浮生树回应</div>
          <div class="msg-loading">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            <span style="margin-left:6px" id="loadingText">${LOADING_PHRASES[0]}</span>
          </div>
        </div>
      `;
    }
    return row;
  }

  // ===== 渲染整个剧情流 =====
  function renderStory(profile){
    const area = document.getElementById('storyArea');
    if(!area) return;
    const arr = loadStory(profile);
    // 保留章节 banner,清空其他
    const banner = area.querySelector('.chapter-banner');
    area.innerHTML = '';
    if(banner) area.appendChild(banner);
    arr.forEach(item => area.appendChild(renderMessage(item)));
    // 滚到底部
    area.scrollTop = area.scrollHeight;
  }

  // ===== 动态加载文案 =====
  let loadingTimer = null;
  let loadingEl = null;
  function startLoadingAnimation(){
    let i = 0;
    const textEl = document.getElementById('loadingText');
    if(textEl){
      loadingEl = textEl;
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

    // 锁定 UI
    btnEl.disabled = true;
    btnEl.textContent = '...';
    inputEl.value = '';
    autoResizeInput(inputEl);

    // 插入玩家输入
    const arr = loadStory(profile);
    const userItem = { id:'u_'+Date.now(), type:'user', text:text };
    arr.push(userItem);
    if(arr.length > MAX_HISTORY*2+1) arr.shift();
    saveStory(profile, arr);

    // 插入加载占位
    const loadingItem = { id:'loading_'+Date.now(), type:'loading' };
    arr.push(loadingItem);
    renderStory(profile);
    startLoadingAnimation();

    // 构造历史
    const aiHistory = arr
      .filter(x => x.type === 'user' || x.type === 'ai')
      .map(x => ({ role: x.type==='user'?'user':'assistant', content: x.text }));

    try{
      const reply = await callAI(text, profile, aiHistory);
      // 替换 loading 为真实回应
      const idx = arr.findIndex(x => x.id === loadingItem.id);
      if(idx !== -1){
        arr[idx] = { id:'a_'+Date.now(), type:'ai', text:reply };
      }
      saveStory(profile, arr);
      renderStory(profile);
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

  // ===== 重新生成某条 AI 回应 =====
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

    // 替换为 loading
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
      if(i2 !== -1){
        arr[i2] = { id:'a_'+Date.now(), type:'ai', text:reply };
      }
      saveStory(profile, arr);
      renderStory(profile);
    }catch(e){
      const i2 = arr.findIndex(x => x.id === loadingItem.id);
      if(i2 !== -1){
        arr[i2] = { id:'e_'+Date.now(), type:'error', text:'【出错】'+e.message };
      }
      saveStory(profile, arr);
      renderStory(profile);
    }finally{
      stopLoadingAnimation();
    }
  }

  // ===== 修改文本(内联编辑) =====
  // type === 'user': 改完后,从这条开始重新生成所有后续 AI 回应(像美高那样)
  // type === 'ai': 纯本地编辑,不调 AI
  function startEdit(cardId){
    const profile = getProfile();
    const arr = loadStory(profile);
    const idx = arr.findIndex(x => x.id === cardId);
    if(idx === -1) return;
    const item = arr[idx];
    if(item.type !== 'user' && item.type !== 'ai') return;

    // 找到对应 DOM
    const row = document.querySelector(`.msg-row[data-id="${cardId}"]`);
    if(!row) return;
    const bubble = row.querySelector('.msg-bubble');
    const actions = row.querySelector('.msg-actions');
    if(!bubble || !actions) return;

    const oldText = item.text;
    // 替换 bubble 为 textarea
    const editArea = document.createElement('div');
    editArea.className = 'msg-edit-area';
    editArea.innerHTML = `
      <textarea>${escapeHtml(oldText)}</textarea>
      <div class="msg-edit-btns">
        <button class="cancel">取消</button>
        <button class="save">保存</button>
      </div>
    `;
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
      if(!newText){
        textarea.style.borderColor = '#a04040';
        return;
      }
      if(newText === oldText){
        editArea.remove();
        bubble.style.display = '';
        actions.style.display = '';
        return;
      }

      // 保存新文本
      arr[idx].text = newText;
      saveStory(profile, arr);

      if(item.type === 'ai'){
        // AI 回应:纯本地编辑,只更新文本
        renderStory(profile);
      } else {
        // 玩家行动:从这条开始重新生成所有后续 AI 回应
        // 删除当前条之后的所有内容(保留开场 + 当前修改后的玩家行动)
        const newArr = arr.slice(0, idx+1);
        saveStory(profile, newArr);
        renderStory(profile);
        // 自动触发后续 AI 生成
        await regenerateAfterEdit(profile, cardId, newText);
      }
    });
  }

  // ===== 玩家行动修改后,自动重新生成后续 AI 回应 =====
  async function regenerateAfterEdit(profile, userId, userText){
    const arr = loadStory(profile);
    const userIdx = arr.findIndex(x => x.id === userId);
    if(userIdx === -1) return;

    // 插入 loading
    const loadingItem = { id:'loading_'+Date.now(), type:'loading' };
    arr.push(loadingItem);
    saveStory(profile, arr);
    renderStory(profile);
    startLoadingAnimation();

    // 历史只取 userIdx 之前
    const aiHistory = arr.slice(0, userIdx)
      .filter(x => x.type==='user' || x.type==='ai')
      .map(x => ({ role:x.type==='user'?'user':'assistant', content:x.text }));

    const btnEl = document.getElementById('sendBtn');
    if(btnEl){ btnEl.disabled = true; btnEl.textContent = '...'; }

    try{
      const reply = await callAI(userText, profile, aiHistory);
      const i2 = arr.findIndex(x => x.id === loadingItem.id);
      if(i2 !== -1){
        arr[i2] = { id:'a_'+Date.now(), type:'ai', text:reply };
      }
      saveStory(profile, arr);
      renderStory(profile);
    }catch(e){
      const i2 = arr.findIndex(x => x.id === loadingItem.id);
      if(i2 !== -1){
        arr[i2] = { id:'e_'+Date.now(), type:'error', text:'【出错】'+e.message };
      }
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
    let arr = loadStory(profile);
    if(arr.length === 0 || arr[0].type !== 'opening'){
      const openingText = profile === 'luojin'
        ? '你踏入归终殿的第一天就闯了个小祸——太兴奋,跑得太快,一头撞翻了符修院门口晾晒的符纸。\n\n见满地狼藉,栾方棋一愣,只好蹲下来和你一起捡:"你这孩子怎么咋咋呼呼的,走路也不看着点。"\n\n这位温和的符修大人没有责罚你,你不好意思地挠了挠头,心想归终殿好像没传说中那么可怕。\n\n"统修期三个月,符法刀法阵法枪法都要学。"一道冷冷的声音从身后传来,罗修不知何时站在了你身后,面无表情道,"你撞翻的是符纸,下回再撞翻什么,我可不管捡。"\n\n你吓了一跳,赶紧站直了身子,嘴快道:"知道了爹,我会注意的。"\n\n"出门在外,称职务。"\n\n你点点头:"哦……哦,首席大人。"\n\n你话音刚落,廊柱后便传来一声轻叹。魏元璟抱臂缓步走出来,眉头微蹙,目光在你和满地符纸之间转了转,显然已经看了一会儿了。\n\n"刚来第一天就砸场子?"魏元璟偏头看向罗修,"罗修,你这儿子,到底是随了谁?"\n\n罗修挑了挑眉:"当然是随你。"\n\n"我小时候可没这么莽。"魏元璟白了他一眼,又看向你,在你脑门上不轻不重地敲了一记,"下次再这样,罚你抄《殿规》一百遍。去吧。"\n\n你捂着脑门点点头,心想,这归终殿,果然还是有点可怕的。'
        : '踏入符修院的第一天,你心里揣着几分忐忑。见案上摆着栾方棋常用的紫竹符笔,你想帮忙整理,却不慎手一抖,碰翻了旁边的墨碟。\n\n浓墨泼洒,不仅弄脏了桌上的符纸,还溅了刚进门的栾方棋一身。\n\n你僵在原地,手足无措。栾方棋却未恼你,只弯腰用袖角替你擦去脸颊的墨点:"没事,符笔没断就好。"\n\n你暗暗松了口气,此时,门外传来极轻的脚步声。你抬头,见林淮悄无声息地站在廊下,什么都没说,只将一块素帕递了过来。他目光淡淡扫过你,你下意识站直了身子,把脱口而出的"爹"咽了回去,小声道:"……淮大人。"\n\n林淮微微颔首,替栾方棋拂去肩头的墨渍,转身走了。\n\n栾方棋拍了拍你的肩膀,笑着说:"既然来了,就按规矩从头学起,不可骄躁。"\n\n你郑重地点点头。\n\n这时,空中传来一声闷响——是罗修拎着罗烬的衣领,把人扔到了讲武堂的训练场里。你偷偷瞥了一眼,心想,在这归终殿的三年,想必不会太无聊。';
      arr = [{ id:'opening', type:'opening', text:openingText }];
      saveStory(profile, arr);
    }
  }

  // ===== 输入框自适应高度 =====
  function autoResizeInput(el){
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  // ===== 全局事件委托(操作按钮) =====
  document.addEventListener('click', function(e){
    const btn = e.target.closest('.msg-action-btn');
    if(!btn) return;
    const action = btn.dataset.action;
    const cardId = btn.dataset.id;
    if(action === 'regenerate'){
      regenerate(cardId);
    } else if(action === 'edit'){
      startEdit(cardId);
    }
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
      if(e.key === 'Enter' && !e.shiftKey){
        e.preventDefault();
        submitAction();
      }
    });
    btnEl.addEventListener('click', submitAction);
  }

  // ===== 启动 =====
  function boot(){
    const profile = getProfile();
    ensureOpening(profile);
    renderStory(profile);
    renderConfigBanner();
    bindInput();
    console.log('◈ 模拟AI.js v3 已加载,角色:', profile, hasUserKey()?'[直连]':'[兜底]');
  }

  // 从设置页返回时刷新提示条
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
