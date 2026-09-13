// ===== 命薄AI.js · 引渡人模拟器 AI 剧情流引擎 =====
// 这个文件独立运行,不修改原 命薄.js 的任何功能
// 只负责:命簿主线区块的 AI 剧情生成、历史保存、重新生成
//
// 部署步骤:
// 1. 把这个文件上传到 模拟器/ 目录(和 命薄.js 同级)
// 2. 在 命薄.html 底部 <script src="./命薄.js"></script> 之后加一行:
//    <script src="./命薄AI.js"></script>
// 3. 把 命薄.html 里的"命簿主线"卡片改成新版(见我给的 HTML 替换代码)

(function(){
  'use strict';

  // ===== 配置区 =====
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  // ★ 重要!把下面这行的地址换成你自己的 Cloudflare Worker 地址!
  // ★ 就是 ai-demo.html 里用的那个地址
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  const WORKER_URL = 'https://difu-ai.2629885225.workers.dev';

  // 每个角色最多保留多少条历史(超出自动挤掉最旧的)
  const MAX_HISTORY = 10;

  // localStorage 的存储键(每个角色独立)
  const STORAGE_KEY = 'gzd_ai_story';

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

  // ===== 调用后端 =====
  async function callAI(message, profile, history){
    const resp = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, profile, history })
    });
    const data = await resp.json();
    if(data.error) throw new Error(data.error);
    return data.reply;
  }

  // ===== 渲染单条剧情卡片 =====
  // type: 'opening'(开场,预设) / 'user'(玩家输入) / 'ai'(AI 回应)
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

  // ===== HTML 转义(防止 XSS) =====
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
    // 滚到底部
    listEl.scrollTop = listEl.scrollHeight;
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

    // 锁定 UI
    btnEl.disabled = true;
    btnEl.textContent = '浮生树低语中...';
    inputEl.value = '';

    // 先把玩家输入插进列表(立即反馈)
    const arr = loadStory(profile);
    const userItem = { id: 'u_' + Date.now(), type: 'user', text: text };
    arr.push(userItem);
    if(arr.length > MAX_HISTORY * 2 + 1) arr.shift();  // 控制总长度
    saveStory(profile, arr);
    renderStoryList(profile);

    // 构造给 AI 的历史(只取 type=user 和 type=ai 的)
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
      // 失败了也存一条错误提示,方便玩家看到
      const errItem = { id: 'e_' + Date.now(), type: 'ai', text: '【出错】' + e.message };
      arr.push(errItem);
      saveStory(profile, arr);
      renderStoryList(profile);
    }finally{
      btnEl.disabled = false;
      btnEl.textContent = '发送行动';
    }
  }

  // ===== 重新生成某条 AI 回应 =====
  async function regenerate(profile, cardId){
    const arr = loadStory(profile);
    const idx = arr.findIndex(x => x.id === cardId && x.type === 'ai');
    if(idx === -1) return;

    // 找到对应的玩家输入(前一条)
    if(idx === 0 || arr[idx-1].type !== 'user'){
      alert('找不到对应的玩家输入,无法重新生成');
      return;
    }
    const userText = arr[idx-1].text;

    // 找到重新生成按钮,显示加载状态
    const cardEl = document.querySelector(`.ai-story-card[data-id="${cardId}"] .ai-action-btn`);
    if(cardEl){
      cardEl.disabled = true;
      cardEl.textContent = '重新生成中...';
    }

    // 构造历史(只取这条之前的)
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
        ? '你踏入归终殿的第一天就闯了个小祸——太兴奋,跑得太快,一头撞翻了符修院门口晾晒的符纸。栾方棋蹲下来帮你一起捡,笑着说:"不急,慢慢来。"你不好意思地挠了挠头,心想归终殿好像没传说中那么可怕。然后罗修的声音从身后冷冷地传过来:"统修期三个月,符法刀法阵法枪法都要学。"'
        : '你踏入归终殿的那天,浮生树正落着花。酒红色的花瓣擦过你的肩头,像某种无声的招呼。你听见身后有人低声说:"那就是林淮和栾方棋的女儿?"你没回头,因为站在殿前石阶上的罗修已经开了口。他抱着刀,目光在你脸上停了一息,然后说:"归终殿统修期三个月,什么都学,三个月后选专精。别指望有人偏心你。"';
      arr = [{ id: 'opening', type: 'opening', text: openingText }];
      saveStory(profile, arr);
    }
  }

  // ===== 注入 CSS 样式(动态加,不动 命薄.html 的 <style>) =====
  function injectStyles(){
    if(document.getElementById('aiStoryStyles')) return;
    const style = document.createElement('style');
    style.id = 'aiStoryStyles';
    style.textContent = `
      /* ===== AI 剧情流样式(命薄AI.js 注入,不修改原 CSS) ===== */
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
    `;
    document.head.appendChild(style);
  }

  // ===== 初始化 =====
  function initProfile(profile){
    ensureOpening(profile);
    renderStoryList(profile);

    // 绑定输入框和按钮(避免重复绑定)
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

  // ===== 全局事件委托(处理"重新生成"按钮) =====
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

  // ===== 页面加载完成后初始化当前角色 =====
  function boot(){
    injectStyles();
    const profile = (window.GZD && GZD.Storage && GZD.Storage.getProfile) ? GZD.Storage.getProfile() : 'linxiwu';
    initProfile(profile);
    console.log('◈ 命薄AI.js 已加载,当前角色:', profile);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();