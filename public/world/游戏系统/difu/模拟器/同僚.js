(function(){'use strict';

// ===== 保底 =====
if(!window.GZD){window.GZD={};
GZD.Storage={get(k,d){try{const r=localStorage.getItem(k);return r?JSON.parse(r):d;}catch(e){return d;}},set(k,v){localStorage.setItem(k,JSON.stringify(v));},getTheme(){const r=this.get('theme',null);return r&&r.value?r.value:'dark';},getProfile(){try{return localStorage.getItem('activeProfile')||'linxiwu';}catch(e){return'linxiwu';}},getQuests(){return this.get('gzd_quests',{});}};
GZD.ThemeManager={init(){const t=GZD.Storage.getTheme();const h=document.documentElement;if(t==='light')h.setAttribute('data-theme','light');else h.removeAttribute('data-theme');},toggle(){const isLight=document.documentElement.getAttribute('data-theme')==='light';const h=document.documentElement;if(isLight)h.removeAttribute('data-theme');else h.setAttribute('data-theme','light');GZD.Storage.set('theme',{value:isLight?'dark':'light'});}};
GZD.ProfileManager={init(){const id=GZD.Storage.getProfile();document.body.setAttribute('data-profile',id);document.querySelectorAll('.content-block').forEach(b=>b.classList.toggle('active',b.id==='content-'+id));},switch(id){document.body.setAttribute('data-profile',id);document.querySelectorAll('.content-block').forEach(b=>{b.classList.remove('active');if(b.id==='content-'+id)b.classList.add('active');});localStorage.setItem('activeProfile',id);window.dispatchEvent(new CustomEvent('profilechange',{detail:{profile:id}}));}};
GZD.Sidebar={open:false,toggle(){this.open=!this.open;const p=document.getElementById('sidebarPanel'),o=document.getElementById('sidebarOverlay');if(p)p.classList.toggle('open',this.open);if(o)o.classList.toggle('show',this.open);document.body.classList.toggle('no-scroll',this.open);},close(){if(this.open){this.open=false;const p=document.getElementById('sidebarPanel'),o=document.getElementById('sidebarOverlay');if(p)p.classList.remove('open');if(o)o.classList.remove('show');document.body.classList.remove('no-scroll');}}};
GZD.init=function(){this.ThemeManager.init();this.ProfileManager.init();};GZD.init();
}

// ===== 侧边栏与主题按钮 =====
document.addEventListener('click',function(e){
  var target=e.target;
  if(target.closest('.sidebar-tab')){e.preventDefault();GZD.Sidebar.toggle();return;}
  if(target.id==='sidebarOverlay'){GZD.Sidebar.close();return;}
  if(target.closest('.sidebar-panel .close-btn')){GZD.Sidebar.close();return;}
  var switchBtn=target.closest('#profileSwitchBtn');
  if(switchBtn){e.preventDefault();e.stopPropagation();var current=document.body.getAttribute('data-profile')||'linxiwu';GZD.ProfileManager.switch(current==='linxiwu'?'luojin':'linxiwu');return;}
});
document.getElementById('themeBtn').addEventListener('click',function(){GZD.ThemeManager.toggle();updateThemeBtn();});
function updateThemeBtn(){var b=document.getElementById('themeBtn'),isLight=document.documentElement.getAttribute('data-theme')==='light';if(b)b.innerHTML='<span id="themeIcon">'+(isLight?'🌙':'☀️')+'</span> <span id="themeLabel">'+(isLight?'夜间':'日间')+'</span>';}
updateThemeBtn();

// ===== 角色切换UI =====
function updateProfileUI(profile){var nameMap={'linxiwu':'林栖梧','luojin':'罗烬'};var nameEl=document.getElementById('currentProfileName');if(nameEl)nameEl.textContent=nameMap[profile]||'林栖梧';var switchBtn=document.getElementById('profileSwitchBtn');if(switchBtn)switchBtn.textContent='切换到 '+(profile==='linxiwu'?'罗烬':'林栖梧');}
(function(){var saved=GZD.Storage.getProfile();updateProfileUI(saved);})();
window.addEventListener('profilechange',function(e){updateProfileUI(e.detail.profile);});

// ===== 花瓣特效 =====
var PETAL_CHARS=['❀','✿','✽'],petalContainer=document.getElementById('petal-container');
if(petalContainer){for(var i=0;i<12;i++){var el=document.createElement('div');el.className='petal-char';el.textContent=PETAL_CHARS[Math.floor(Math.random()*PETAL_CHARS.length)];el.style.left=Math.random()*100+'%';el.style.fontSize=(14+Math.random()*12)+'px';el.style.animationDuration=(10+Math.random()*10)+'s';el.style.animationDelay=(Math.random()*12)+'s';petalContainer.appendChild(el);}}

// ===== 数据 =====

// 十席数据（颜色已修正）
var RANK_DATA = [
  { rank: 1, label: '首席', name: '罗修', title: '修', weapon: '九幽焚天焰', divine: '九幽焚天焰', hall: '讲武堂', link: '罗修.html', color: '#b07cc6' },
  { rank: 2, label: '第二席', name: '林淮', title: '淮', weapon: '惊鸿', divine: '灵枢轮回木（与栾方棋共有）', hall: '点苍阁', link: '林淮.html', color: '#4a8baa' },
  { rank: 3, label: '第三席', name: '未公开', title: '—', weapon: '—', divine: '—', hall: '阵法堂', link: null, color: '#8a8a8a' },
  { rank: 4, label: '第四席', name: '未公开', title: '—', weapon: '—', divine: '—', hall: '工造司', link: null, color: '#8a8a8a' },
  { rank: 5, label: '第五席', name: '栾方棋', title: '棋', weapon: '灵枢轮回木', divine: '灵枢轮回木', hall: '符修院', link: '栾方棋.html', color: '#c0392b' },
  { rank: 6, label: '第六席', name: '未公开', title: '—', weapon: '—', divine: '—', hall: '澄心堂', link: null, color: '#8a8a8a' },
  { rank: 7, label: '第七席', name: '魏元璟', title: '璟', weapon: '对影', divine: '镇魂破虚引', hall: '砺峰阁', link: '魏元璟.html', color: '#c9a84c' },
  { rank: 8, label: '第八席', name: '未公开', title: '—', weapon: '—', divine: '—', hall: '百草堂', link: null, color: '#8a8a8a' },
  { rank: 9, label: '第九席', name: '未公开', title: '—', weapon: '—', divine: '—', hall: '—', link: null, color: '#8a8a8a' },
  { rank: 10, label: '第十席', name: '未公开', title: '—', weapon: '—', divine: '—', hall: '—', link: null, color: '#8a8a8a' }
];

// 特殊角色
var SPECIAL_DATA = [
  { label: '退役', name: '程木栖', title: '栖', weapon: '归江', divine: '无', hall: '栖梧馆', link: '程木栖.html', color: '#2e8b57' },
  { label: '退役', name: '蔡可', title: '可', weapon: '玄铁弓', divine: '无', hall: '栖梧馆', link: '蔡可.html', color: '#c94c7a' }
];

// 院阁数据（省略，与你原来一致，此处保留完整）
var HALL_DATA = [
  {id:'fuxiu',name:'符修院',icon:'ti-books',master:'栾方棋',masterLink:'栾方棋.html',desc:'符箓专精 · 法术理论 · 符阵基础',detail:'符修院是归终殿符箓与法术理论的核心院阁，由第五席栾方棋执掌。',students:'林栖梧（统修期符法第一）',dynamics:['栾方棋带领弟子完成青州锁龙井加固任务','符修院新增《符箓变体十二式》课程'],status:'正常',statusDot:'normal'},
  {id:'jiangwu',name:'讲武堂',icon:'ti-swords',master:'罗修',masterLink:'罗修.html',desc:'双刀 · 体术 · 实战对抗',detail:'讲武堂是归终殿体术与双刀的核心院阁，由首席罗修执掌。',students:'罗烬（讲武堂新晋弟子）',dynamics:['首席特别课程「双刀进阶」已开课','演武广场石靶维修完成，恢复使用'],status:'繁忙',statusDot:'busy'},
  {id:'diangcang',name:'点苍阁',icon:'ti-crosshair',master:'林淮',masterLink:'林淮.html',desc:'枪法专精 · 近战武器 · 单点爆发',detail:'点苍阁是归终殿枪法专精院阁，由第二席林淮执掌。',students:'暂无',dynamics:['林淮带队完成忘川河畔巡逻任务','点苍阁新弟子报名通道开启'],status:'正常',statusDot:'normal'},
  {id:'lifeng',name:'砺峰阁',icon:'ti-mountain',master:'魏元璟',masterLink:'魏元璟.html',desc:'魂力控制 · 冥想 · 抗压训练',detail:'砺峰阁是归终殿魂力与冥想的核心院阁，由第七席魏元璟执掌。',students:'罗烬（兼修·抗压课程）',dynamics:['魏元璟于音律坊试奏新曲《忘川渡》','砺峰阁抗压课程升级，新增魂力冲击模拟'],status:'正常',statusDot:'normal'},
  {id:'yinlv',name:'音律坊',icon:'ti-music',master:'魏元璟 · 程木栖',masterLink:null,desc:'音律 · 魂力共鸣 · 笛琴合奏',detail:'音律坊由魏元璟与程木栖共同创办，以笛琴合奏引导魂力共鸣。',students:'暂无',dynamics:['魏元璟与程木栖合奏新曲《忘川渡》获得好评','音律坊计划招收新弟子'],status:'正常',statusDot:'normal'},
  {id:'qiwu',name:'栖梧馆',icon:'ti-medical-cross',master:'程木栖',masterLink:null,desc:'医药 · 伤患治疗 · 药理',detail:'栖梧馆是归终殿医药与伤患治疗的核心院阁，由程木栖执掌。',students:'林栖梧（兼修·药理辨识）',dynamics:['程木栖完成新药方试制','栖梧馆药材储备充足，已开放外借'],status:'正常',statusDot:'normal'},
  {id:'zhenfa',name:'阵法堂',icon:'ti-layout-grid',master:'第三席',masterLink:null,desc:'阵法 · 符阵 · 暗器',detail:'阵法堂由第三席执掌，专攻阵法与符阵的实战应用。',students:'暂无',dynamics:['阵法课程调整，部分课程延期','第三席行踪不定，暂由符修院代管'],status:'维护中',statusDot:'maintenance'},
  {id:'gongzao',name:'工造司',icon:'ti-tools',master:'第四席',masterLink:null,desc:'兵器锻造 · 维修 · 定制',detail:'工造司由第四席执掌，负责归终殿兵器锻造与维修。',students:'不适用',dynamics:['引魂刀批量交付讲武堂','工造司新增定制武器服务'],status:'正常',statusDot:'normal'},
  {id:'chengxin',name:'澄心堂',icon:'ti-blade',master:'第六席',masterLink:null,desc:'剑修 · 剑法传授',detail:'澄心堂由第六席执掌，专攻剑修与剑法传承。',students:'暂无',dynamics:['澄心堂剑法课程筹备中','第六席近期于人间行走未归'],status:'正常',statusDot:'normal'},
  {id:'baicao',name:'百草堂',icon:'ti-leaf',master:'第八席',masterLink:null,desc:'用毒 · 药理（与栖梧馆合作）',detail:'百草堂由第八席执掌，专攻用毒与药理，与栖梧馆深度合作。',students:'暂无',dynamics:['百草堂与栖梧馆联合研制新药','用毒课程选修人数较少，暂不开放'],status:'正常',statusDot:'normal'}
];

// 搜索数据
var SEARCH_DATA = [
  {name:'栾方棋',tags:['第五席','符修院','符箓'],desc:'符修院掌门，灵枢轮回木共主。',link:'栾方棋.html'},
  {name:'林淮',tags:['第二席','点苍阁','枪法'],desc:'点苍阁掌门，银枪惊鸿。',link:'林淮.html'},
  {name:'罗修',tags:['首席','讲武堂','双刀'],desc:'讲武堂掌门，九幽焚天焰共主。',link:'罗修.html'},
  {name:'魏元璟',tags:['第七席','砺峰阁','音律'],desc:'砺峰阁掌门，对影双刀，镇魂破虚引持有者。',link:'魏元璟.html'},
  {name:'程木栖',tags:['栖梧馆','音律坊','医药'],desc:'栖梧馆掌门，音律坊共创者。',link:'程木栖.html'},
  {name:'蔡可',tags:['栖梧馆','弓术'],desc:'栖梧馆弓术教官，玄铁弓持有者。',link:'蔡可.html'},
  {name:'林栖梧',tags:['符修院','弟子','符箓'],desc:'符修院弟子，栾方棋之女。',link:'档案.html#linxiwu'},
  {name:'罗烬',tags:['讲武堂','弟子','双刀'],desc:'讲武堂弟子，罗修之子。',link:'档案.html#luojin'},
  {name:'第三席',tags:['阵法堂','阵法','符阵'],desc:'阵法堂执掌者，行踪不定。',link:null},
  {name:'第四席',tags:['工造司','锻造','维修'],desc:'工造司执掌者，兵器大师。',link:null},
  {name:'第六席',tags:['澄心堂','剑修','剑法'],desc:'澄心堂执掌者，剑法宗师。',link:null},
  {name:'第八席',tags:['百草堂','用毒','药理'],desc:'百草堂执掌者，与栖梧馆合作。',link:null},
  {name:'点苍阁',tags:['地点','枪阁','林淮'],desc:'归终殿枪法专精院阁，林淮执掌。',link:null},
  {name:'符修院',tags:['地点','栾方棋','符箓'],desc:'归终殿符箓与法术理论核心院阁。',link:null},
  {name:'讲武堂',tags:['地点','罗修','双刀'],desc:'归终殿体术与双刀核心院阁。',link:null}
];

// 好友数据
var FRIEND_DATA = {
  linxiwu:[
    {name:'谢听澜',tag:'符修院 · 画搭子',desc:'沉默专注，画符时能一坐三个时辰不抬头。',exp:'统修期期末一起熬夜补完符箓变体课作业。'},
    {name:'陆沉舟',tag:'点苍阁 · 安静枪修',desc:'讲武堂里最安静的枪修，话少但靠谱。',exp:'良月十五一起跟林淮出忘川巡逻任务，替她挡了一记阴风。'},
    {name:'慕晚棠',tag:'音律坊 · 听曲人',desc:'音律坊常客，每次魏元璟试奏新曲必到。',exp:'霜月初七在音律坊听《忘川渡》时，两人同时听走了神。'}
  ],
  luojin:[
    {name:'楚宴',tag:'讲武堂 · 练刀搭子',desc:'和罗烬同期进讲武堂，两人经常一起加练到深夜。',exp:'被罗修罚跑十圈时互相拽着跑完最后一圈，瘫在地上笑了半天。'},
    {name:'江未晞',tag:'砺峰阁 · 冥想不睡者',desc:'魂力冥想课唯一能和罗烬一起清醒到下课的人。',exp:'魏元璟试奏《忘川渡》时，两人同时走神被笛子敲醒。'},
    {name:'何照野',tag:'符修院 · 符纸供货商',desc:'符修院弟子，专门给罗烬提供画废的符纸当草稿。',exp:'罗烬符法课挂科那天，何照野悄悄塞了一摞符纸说“下次我帮你画”。'}
  ]
};

// ===== 渲染手风琴 =====
function renderRank(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  // 构建显示顺序
  var displayItems = [];

  // 1. 先加首席、第二席
  displayItems.push(RANK_DATA[0]); // 罗修
  displayItems.push(RANK_DATA[1]); // 林淮

  // 2. 三~四席合并
  displayItems.push({
    type: 'merged',
    label: '三~四席',
    name: '未公开',
    children: [
      { label: '第三席', hall: RANK_DATA[2].hall },
      { label: '第四席', hall: RANK_DATA[3].hall }
    ],
    color: '#8a8a8a',
    link: null
  });

  // 3. 第五席（栾方棋）
  displayItems.push(RANK_DATA[4]);

  // 4. 第六席（单独未公开）
  displayItems.push({
    type: 'single_vacant',
    label: '第六席',
    name: '未公开',
    hall: RANK_DATA[5].hall,
    color: '#8a8a8a',
    link: null
  });

  // 5. 第七席（魏元璟）
  displayItems.push(RANK_DATA[6]);

  // 6. 八~十席合并
  displayItems.push({
    type: 'merged',
    label: '八~十席',
    name: '未公开',
    children: [
      { label: '第八席', hall: RANK_DATA[7].hall },
      { label: '第九席', hall: RANK_DATA[8].hall },
      { label: '第十席', hall: RANK_DATA[9].hall }
    ],
    color: '#8a8a8a',
    link: null
  });

  // 7. 特殊角色（退役）
  SPECIAL_DATA.forEach(function(item) {
    displayItems.push(item);
  });

  // 渲染
  displayItems.forEach(function(item) {
    var isMerged = (item.type === 'merged');
    var isSingle = (item.type === 'single_vacant');
    var isSpecial = (item.label === '退役');
    var isNormal = !isMerged && !isSingle && !isSpecial;

    var itemDiv = document.createElement('div');
    itemDiv.className = 'accordion-item';
    if (isMerged) itemDiv.classList.add('vacant-merged');
    if (isSpecial) itemDiv.classList.add('special');

    // 边框颜色
    var color = item.color || '#8a8a8a';
    itemDiv.style.borderColor = color;

    // 头部
    var header = document.createElement('div');
    header.className = 'accordion-header';

    var leftDiv = document.createElement('div');
    leftDiv.className = 'left';

    var rankSpan = document.createElement('span');
    rankSpan.className = 'rank-label';
    rankSpan.textContent = item.label;
    rankSpan.style.color = color;
    leftDiv.appendChild(rankSpan);

    var nameSpan = document.createElement('span');
    nameSpan.className = 'name';
    if (isMerged || isSingle) {
      nameSpan.textContent = '未公开';
      nameSpan.style.color = '#8a8a8a';
    } else {
      nameSpan.textContent = item.name;
      nameSpan.style.color = color;
    }
    leftDiv.appendChild(nameSpan);

    var subSpan = document.createElement('span');
    subSpan.className = 'sub-info';
    if (isMerged) {
      subSpan.textContent = '引渡人繁忙中';
      subSpan.style.color = '#8a8a8a';
    } else if (isSingle) {
      subSpan.textContent = '引渡人繁忙中';
      subSpan.style.color = '#8a8a8a';
    } else if (isSpecial) {
      subSpan.textContent = '封号 ' + item.title + ' · ' + item.hall;
    } else {
      if (item.title && item.title !== '—') {
        subSpan.textContent = '封号 ' + item.title;
      } else if (item.hall && item.hall !== '—') {
        subSpan.textContent = '院阁 ' + item.hall;
      } else {
        subSpan.textContent = '—';
      }
    }
    leftDiv.appendChild(subSpan);

    var iconSpan = document.createElement('span');
    iconSpan.className = 'toggle-icon';
    iconSpan.textContent = '+';

    header.appendChild(leftDiv);
    header.appendChild(iconSpan);

    // 主体
    var body = document.createElement('div');
    body.className = 'accordion-body';
    var detailsHtml = '';

    if (isMerged) {
      var childrenHtml = '';
      item.children.forEach(function(child) {
        var hallDisplay = (child.hall && child.hall !== '—') ? child.hall : '—';
        childrenHtml += '<div class="vacant-sub">' + child.label + ' · 归属 ' + hallDisplay + '</div>';
      });
      detailsHtml = '<div class="vacant-note">该席引渡人因外勤繁忙，暂未公开具体信息。</div>' + childrenHtml;
    } else if (isSingle) {
      var hallDisplay = (item.hall && item.hall !== '—') ? item.hall : '—';
      detailsHtml = '<div class="vacant-note">该席引渡人因外勤繁忙，暂未公开具体信息。</div>';
      detailsHtml += '<div class="vacant-sub">归属 ' + hallDisplay + '</div>';
    } else if (isSpecial) {
      var lines = [];
      if (item.title && item.title !== '—') lines.push({label:'封号', value:item.title});
      if (item.weapon && item.weapon !== '—') lines.push({label:'本命武器', value:item.weapon});
      if (item.divine && item.divine !== '—') lines.push({label:'专属神器', value:item.divine});
      if (item.hall && item.hall !== '—') lines.push({label:'归属院阁', value:item.hall});
      if (lines.length > 0) {
        var grid = '<div class="detail-grid">';
        lines.forEach(function(l){ grid += '<span class="label">'+l.label+'</span><span class="value">'+l.value+'</span>'; });
        grid += '</div>';
        detailsHtml = grid;
      } else {
        detailsHtml = '<div class="unavailable">暂无详细信息</div>';
      }
      if (item.link) {
        detailsHtml += '<a class="detail-btn" href="'+item.link+'">查看档案 →</a>';
      } else {
        detailsHtml += '<span style="font-size:0.75rem;color:var(--text-muted);font-family:var(--font-mono);">档案暂未开放</span>';
      }
    } else {
      var lines = [];
      if (item.title && item.title !== '—') lines.push({label:'封号', value:item.title});
      if (item.weapon && item.weapon !== '—') lines.push({label:'本命武器', value:item.weapon});
      if (item.divine && item.divine !== '—') lines.push({label:'专属神器', value:item.divine});
      if (item.hall && item.hall !== '—') lines.push({label:'归属院阁', value:item.hall});
      if (lines.length > 0) {
        var grid = '<div class="detail-grid">';
        lines.forEach(function(l){ grid += '<span class="label">'+l.label+'</span><span class="value">'+l.value+'</span>'; });
        grid += '</div>';
        detailsHtml = grid;
      } else {
        detailsHtml = '<div class="unavailable">暂无详细信息</div>';
      }
      if (item.link) {
        detailsHtml += '<a class="detail-btn" href="'+item.link+'">查看档案 →</a>';
      } else {
        detailsHtml += '<span style="font-size:0.75rem;color:var(--text-muted);font-family:var(--font-mono);">档案暂未开放</span>';
      }
    }

    body.innerHTML = detailsHtml;
    itemDiv.appendChild(header);
    itemDiv.appendChild(body);
    container.appendChild(itemDiv);

    header.addEventListener('click', function(e) {
      var isOpen = itemDiv.classList.contains('open');
      itemDiv.classList.toggle('open');
      var icon = header.querySelector('.toggle-icon');
      icon.textContent = isOpen ? '+' : '−';
    });
  });
}

// ===== 院阁、好友、搜索 =====
function renderHallTabs(tabContainerId, detailContainerId) {
  var tabContainer = document.getElementById(tabContainerId);
  var detailContainer = document.getElementById(detailContainerId);
  if (!tabContainer || !detailContainer) return;
  tabContainer.innerHTML = '';
  HALL_DATA.forEach(function(hall, idx) {
    var btn = document.createElement('button');
    btn.className = 'tab-btn' + (idx === 0 ? ' active' : '');
    btn.dataset.index = idx;
    btn.innerHTML = '<i class="ti ' + hall.icon + '"></i> ' + hall.name;
    btn.addEventListener('click', function() {
      var parent = this.parentElement;
      parent.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      renderHallDetail(detailContainerId, parseInt(this.dataset.index));
    });
    tabContainer.appendChild(btn);
  });
  renderHallDetail(detailContainerId, 0);
}

function renderHallDetail(containerId, index) {
  var container = document.getElementById(containerId);
  if (!container) return;
  var hall = HALL_DATA[index];
  if (!hall) return;
  var statusMap = {'正常':'● 正常运转','繁忙':'● 繁忙','维护中':'● 维护中'};
  var dotMap = {'normal':'normal','busy':'busy','maintenance':'maintenance'};
  var masterHtml = hall.master;
  if (hall.masterLink) masterHtml = '<a href="'+hall.masterLink+'">'+hall.master+'</a>';
  var studentsHtml = hall.students || '暂无';
  var dynHtml = hall.dynamics && hall.dynamics.length > 0
    ? hall.dynamics.map(function(d){ return '<div class="item"><span class="dot">·</span> '+d+'</div>'; }).join('')
    : '<div class="item"><span class="dot">·</span> 暂无近期动态</div>';
  var detailHtml = hall.detail || '暂无详细资料。';
  var btnHtml = hall.masterLink
    ? '<a class="detail-btn" href="'+hall.masterLink+'">查看完整资料 →</a>'
    : '<span style="font-size:0.75rem;color:var(--text-muted);font-family:var(--font-mono);">档案暂未开放</span>';
  container.innerHTML = '<div class="hall-detail active">' +
    '<div class="hall-name"><i class="ti '+hall.icon+'"></i> '+hall.name+'</div>' +
    '<div class="hall-divider"></div>' +
    '<div class="info-line"><span class="label">负责人</span><span class="value">'+masterHtml+'</span></div>' +
    '<div class="info-line"><span class="label">职能</span><span class="value">'+hall.desc+'</span></div>' +
    '<div class="info-line"><span class="label">详细资料</span><span class="value" style="font-weight:400;font-size:0.88rem;">'+detailHtml+'</span></div>' +
    '<div style="margin:2px 0 6px 0;">'+btnHtml+'</div>' +
    '<div class="info-line" style="margin-top:4px;"><span class="label">优秀学生</span><span class="value">'+studentsHtml+'</span></div>' +
    '<div class="info-line" style="margin-top:4px;"><span class="label">近期动态</span></div>' +
    '<div class="hall-dyn">'+dynHtml+'</div>' +
    '<div class="status-tag"><span class="dot '+dotMap[hall.statusDot]+'"></span> '+(statusMap[hall.status]||hall.status)+'</div>' +
    '</div>';
}

function renderFriends(containerId, profile) {
  var container = document.getElementById(containerId);
  if (!container) return;
  var friends = FRIEND_DATA[profile] || FRIEND_DATA.linxiwu;
  container.innerHTML = '';
  friends.forEach(function(f) {
    var div = document.createElement('div');
    div.className = 'friend-card';
    div.innerHTML = '<div class="f-name">'+f.name+'</div><div class="f-tag">'+f.tag+'</div><div class="f-desc">'+f.desc+'</div><div class="f-exp">'+f.exp+'</div>';
    container.appendChild(div);
  });
}

function setupSearch(inputId, btnId, resultsId) {
  var input = document.getElementById(inputId);
  var btn = document.getElementById(btnId);
  var results = document.getElementById(resultsId);
  if (!input || !btn || !results) return;
  function doSearch() {
    var q = input.value.trim().toLowerCase();
    if (!q) { results.innerHTML = '<div class="search-empty">输入人名或地名开始搜索</div>'; return; }
    var matched = SEARCH_DATA.filter(function(item) {
      var name = item.name.toLowerCase();
      var tagMatch = item.tags.some(function(t){ return t.toLowerCase().includes(q); });
      return name.includes(q) || tagMatch;
    });
    if (matched.length === 0) { results.innerHTML = '<div class="search-empty">未找到匹配结果。试试：栾方棋、点苍阁</div>'; return; }
    results.innerHTML = '';
    matched.forEach(function(item) {
      var div = document.createElement('div');
      div.className = 'search-result-card';
      var tagHtml = item.tags.map(function(t){ return '<span class="tag">'+t+'</span>'; }).join('');
      var linkHtml = item.link ? '<a class="link-btn" href="'+item.link+'">查看档案 →</a>' : '<span style="font-size:0.7rem;color:var(--text-muted);font-family:var(--font-mono);">档案暂未开放</span>';
      div.innerHTML = '<div class="info"><div class="name">'+item.name+'</div><div class="desc">'+item.desc+'</div><div class="tags">'+tagHtml+'</div></div>'+linkHtml;
      results.appendChild(div);
    });
  }
  btn.addEventListener('click', doSearch);
  input.addEventListener('keydown', function(e){ if (e.key === 'Enter') doSearch(); });
}

function initAll() {
  var profile = document.body.getAttribute('data-profile') || 'linxiwu';
  var prefix = profile === 'linxiwu' ? 'lin' : 'luo';
  renderRank('rank-list-' + prefix);
  renderHallTabs('hall-tabs-' + prefix, 'hall-detail-' + prefix);
  renderFriends('friends-' + prefix, profile);
  setupSearch('search-input-' + prefix, 'search-btn-' + prefix, 'search-results-' + prefix);
}

window.addEventListener('profilechange', function(){ setTimeout(initAll, 100); });
setTimeout(initAll, 200);

console.log('🌙 归终殿 · 同僚与十席 v5.0 已加载');
})();