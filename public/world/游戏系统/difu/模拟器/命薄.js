// ==================== 命薄纪事 · 专属模块 ====================

(function() {

  // ===== 地府时辰 =====
  const earthlyHours = [
    {name:'子时',start:23,end:1,desc:'万籁俱寂，忘川水静。引渡人交班时分，归终殿广场上浮生树泛着幽微的银白光芒。',yinqi:'96%',weather:'浓雾',tree:'花叶低垂'},
    {name:'丑时',start:1,end:3,desc:'地府灯火阑珊，阴差换岗。偶有迷途亡魂在奈何桥畔徘徊，需引渡人前往安抚。',yinqi:'94%',weather:'阴风',tree:'静默'},
    {name:'寅时',start:3,end:5,desc:'夜将尽而未尽，阴气仍重。三生石前常有执念深重的魂魄驻足，不宜惊扰。',yinqi:'88%',weather:'薄霜',tree:'微光'},
    {name:'卯时',start:5,end:7,desc:'地府假天明，阴气渐收。弟子陆续起身前往砺峰阁晨训，脚步声在石板路上回响。',yinqi:'72%',weather:'薄雾',tree:'苏醒'},
    {name:'辰时',start:7,end:9,desc:'假日高升，各院阁开课。符修院传来符纸燃烧的气息，讲武堂响起兵器碰撞声。',yinqi:'60%',weather:'晴朗',tree:'摇曳'},
    {name:'巳时',start:9,end:11,desc:'阳气混入地府，部分敏感弟子略感不适。此时不宜进行高强度阴气修炼。',yinqi:'55%',weather:'晴朗',tree:'盛放'},
    {name:'午时',start:11,end:13,desc:'地府日中，阴气最弱。弟子多在此刻用膳、休整，或于栖梧馆疗伤。',yinqi:'45%',weather:'燥热',tree:'收敛'},
    {name:'未时',start:13,end:15,desc:'午后慵懒，藏经阁内弟子翻阅古籍的沙沙声与远处演武广场的呼喝交织。',yinqi:'50%',weather:'多云',tree:'低语'},
    {name:'申时',start:15,end:17,desc:'外勤引渡人陆续回殿，带回人间消息。殿前广场渐渐热闹，浮生树影拉长。',yinqi:'58%',weather:'微风',tree:'舒展'},
    {name:'酉时',start:17,end:19,desc:'假日落，地府入暮。各院阁陆续闭课，弟子或结伴前往忘川观落日余晖。',yinqi:'70%',weather:'霞光',tree:'泛光'},
    {name:'戌时',start:19,end:21,desc:'夜课开始，音律坊传出琴笛之声。部分弟子于浮生树下进行夜间冥想。',yinqi:'82%',weather:'薄雾',tree:'轻颤'},
    {name:'亥时',start:21,end:23,desc:'地府入夜，灯火次第亮起。归终殿弟子陆续归寝，只剩巡逻队在殿外游走。',yinqi:'90%',weather:'浓雾',tree:'沉睡'}
  ];

  function getCurrentHour() {
    const h = new Date().getHours();
    for (let i = 0; i < earthlyHours.length; i++) {
      const e = earthlyHours[i];
      if (e.start > e.end) { if (h >= e.start || h < e.end) return e; }
      else { if (h >= e.start && h < e.end) return e; }
    }
    return earthlyHours[0];
  }

  function updateChrono() {
    const e = getCurrentHour();
    const idx = earthlyHours.indexOf(e);
    document.getElementById('hourName').textContent = e.name;
    document.getElementById('hourSub').textContent = e.name + ' · ' + e.yinqi + '阴气 · 地府第' + (idx + 1) + '更';
    document.getElementById('hourDesc').textContent = e.desc;
    document.getElementById('yinqi').textContent = e.yinqi;
    document.getElementById('weather').textContent = e.weather;
    document.getElementById('treeStatus').textContent = e.tree;
  }
  updateChrono();
  setInterval(updateChrono, 60000); // 每分钟刷新

  // ===== 浮生树低语 =====
  const whispers = [
    "每一段走过的黄泉路，每一次艰难的引渡，都将铸就独一无二的你。",
    "浮生花会谢，但树根记得每一朵花的重量。",
    "引渡人不是神，只是愿意在阴阳之间多站一会儿的人。",
    "刀会断，枪会折，符会燃尽——但归终殿还在。",
    "你若在忘川边遇到一个不肯渡河的魂，别催他。他只是在等一句告别。",
    "林淮等了二百年，罗修烧了五百年。时间在地府，不过是一场漫长的修行。",
    "浮生树从不挑选落在谁肩上的花瓣。它只负责开花。"
  ];
  const idx = Math.floor(Math.random() * whispers.length);
  document.getElementById('whisperText').textContent = '"' + whispers[idx] + '"';

  // ===== 任务系统（可点击切换状态） =====
  const STATUS_CYCLE = { '未接': '进行中', '进行中': '已完成', '已完成': '未接' };

  function renderQuests() {
    const quests = GZD.Storage.getQuests();
    document.querySelectorAll('.quest-item').forEach(item => {
      const qid = item.dataset.questId;
      if (!qid) return;
      const saved = quests[qid];
      if (saved && saved.status) {
        const statusEl = item.querySelector('.status');
        if (statusEl) {
          statusEl.textContent = saved.status;
          statusEl.className = 'status ' + (saved.status === '进行中' ? 'doing' : saved.status === '已完成' ? 'done' : '');
        }
      }
    });
    updateStoryProgress();
  }

  function updateStoryProgress() {
    const quests = GZD.Storage.getQuests();
    const linTotal = 5, luoTotal = 5;
    let linDone = 0, luoDone = 0;
    for (let i = 1; i <= 5; i++) {
      if (quests['lin-q' + i]?.status === '已完成') linDone++;
      if (quests['luo-q' + i]?.status === '已完成') luoDone++;
    }
    const linPct = Math.round((linDone / linTotal) * 100);
    const luoPct = Math.round((luoDone / luoTotal) * 100);
    document.getElementById('storyPct-lin').textContent = linPct + '%';
    document.getElementById('storyBar-lin').style.width = linPct + '%';
    document.getElementById('storyPct-luo').textContent = luoPct + '%';
    document.getElementById('storyBar-luo').style.width = luoPct + '%';
  }

  document.querySelectorAll('.quest-item').forEach(item => {
    item.addEventListener('click', function() {
      const qid = this.dataset.questId;
      if (!qid) return;
      const statusEl = this.querySelector('.status');
      const current = statusEl.textContent.trim();
      const next = STATUS_CYCLE[current] || '未接';
      statusEl.textContent = next;
      statusEl.className = 'status ' + (next === '进行中' ? 'doing' : next === '已完成' ? 'done' : '');
      GZD.Storage.updateQuestStatus(qid, next);
      updateStoryProgress();
    });
  });

  // 页面加载时恢复状态
  renderQuests();

  // ===== 新闻已读标记 =====
  document.querySelectorAll('.news-card').forEach(card => {
    card.addEventListener('click', function() {
      const nid = this.dataset.newsId;
      if (nid) GZD.Storage.markNewsRead(nid);
      this.style.opacity = '0.7';
    });
  });

  // 恢复已读状态
  (function() {
    const read = GZD.Storage.getNewsRead();
    document.querySelectorAll('.news-card').forEach(card => {
      if (read.includes(card.dataset.newsId)) card.style.opacity = '0.7';
    });
  })();

  // ===== 监听角色切换，更新侧边栏高亮 =====
  window.addEventListener('profilechange', function(e) {
    console.log('命薄纪事：角色切换为', e.detail.profile);
  });

})();