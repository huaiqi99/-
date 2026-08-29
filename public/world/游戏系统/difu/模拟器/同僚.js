(function(){'use strict';

// ===== 保底 =====
if(!window.GZD){window.GZD={};
GZD.Storage={get(k,d){try{const r=localStorage.getItem(k);return r?JSON.parse(r):d;}catch(e){return d;}},set(k,v){localStorage.setItem(k,JSON.stringify(v));},getTheme(){const r=this.get('theme',null);return r&&r.value?r.value:'dark';},getProfile(){try{return localStorage.getItem('activeProfile')||'linxiwu';}catch(e){return'linxiwu';}},getQuests(){return this.get('gzd_quests',{});}};
GZD.ThemeManager={init(){const t=GZD.Storage.getTheme();const h=document.documentElement;if(t==='light')h.setAttribute('data-theme','light');else h.removeAttribute('data-theme');},toggle(){const isLight=document.documentElement.getAttribute('data-theme')==='light';const h=document.documentElement;if(isLight)h.removeAttribute('data-theme');else h.setAttribute('data-theme','light');GZD.Storage.set('theme',{value:isLight?'dark':'light'});}};
GZD.ProfileManager={init(){const id=GZD.Storage.getProfile();document.body.setAttribute('data-profile',id);document.querySelectorAll('.content-block').forEach(b=>b.classList.toggle('active',b.id==='content-'+id));},switch(id){document.body.setAttribute('data-profile',id);document.querySelectorAll('.content-block').forEach(b=>{b.classList.remove('active');if(b.id==='content-'+id)b.classList.add('active');});localStorage.setItem('activeProfile',id);window.dispatchEvent(new CustomEvent('profilechange',{detail:{profile:id}}));}};
GZD.Sidebar={open:false,toggle(){this.open=!this.open;const p=document.getElementById('sidebarPanel'),o=document.getElementById('sidebarOverlay');if(p)p.classList.toggle('open',this.open);if(o)o.classList.toggle('show',this.open);document.body.classList.toggle('no-scroll',this.open);},close(){if(this.open){this.open=false;const p=document.getElementById('sidebarPanel'),o=document.getElementById('sidebarOverlay');if(p)p.classList.remove('open');if(o)o.classList.remove('show');document.body.classList.remove('no-scroll');}}};
GZD.init=function(){this.ThemeManager.init();this.ProfileManager.init();};GZD.init();
}

// ===== 1. 侧边栏与主题按钮 =====
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

// ===== 2. 角色切换UI =====
function updateProfileUI(profile){var nameMap={'linxiwu':'林栖梧','luojin':'罗烬'};var nameEl=document.getElementById('currentProfileName');if(nameEl)nameEl.textContent=nameMap[profile]||'林栖梧';var switchBtn=document.getElementById('profileSwitchBtn');if(switchBtn)switchBtn.textContent='切换到 '+(profile==='linxiwu'?'罗烬':'林栖梧');}
(function(){var saved=GZD.Storage.getProfile();updateProfileUI(saved);})();
window.addEventListener('profilechange',function(e){updateProfileUI(e.detail.profile);});

// ===== 3. 花瓣特效 =====
var PETAL_CHARS=['❀','✿','✽'],petalContainer=document.getElementById('petal-container');
if(petalContainer){for(var i=0;i<12;i++){var el=document.createElement('div');el.className='petal-char';el.textContent=PETAL_CHARS[Math.floor(Math.random()*PETAL_CHARS.length)];el.style.left=Math.random()*100+'%';el.style.fontSize=(14+Math.random()*12)+'px';el.style.animationDuration=(10+Math.random()*10)+'s';el.style.animationDelay=(Math.random()*12)+'s';petalContainer.appendChild(el);}}

// ===== 4. 数据 =====

// 十席数据
var RANK_DATA = [
  { rank: 1, name: '罗修', title: '修', weapon: '九幽焚天焰', divine: '—', hall: '讲武堂', link: '罗修.html' },
  { rank: 2, name: '林淮', title: '淮', weapon: '惊鸿', divine: '灵枢轮回木（共有）', hall: '枪阁', link: '林淮.html' },
  { rank: 3, name: '—', title: '—', weapon: '—', divine: '—', hall: '阵法堂', link: null },
  { rank: 4, name: '—', title: '—', weapon: '—', divine: '—', hall: '工造司', link: null },
  { rank: 5, name: '栾方棋', title: '棋', weapon: '灵枢轮回木', divine: '—', hall: '符修院', link: '栾方棋.html' },
  { rank: 6, name: '—', title: '—', weapon: '—', divine: '—', hall: '澄心堂', link: null },
  { rank: 7, name: '魏元璟', title: '璟', weapon: '对影', divine: '摧城笛', hall: '砺峰阁', link: '魏元璟.html' },
  { rank: 8, name: '—', title: '—', weapon: '—', divine: '—', hall: '百草堂', link: null },
  { rank: 9, name: '顾行舟', title: '舟', weapon: '千机·缠丝', divine: '—', hall: '织云阁', link: null },
  { rank: 10, name: '沈栖云', title: '云', weapon: '听风·双刃', divine: '—', hall: '栖云阁', link: null }
];

// 院阁数据（按展示顺序）
var HALL_DATA = [
  {
    id: 'fuxiu',
    name: '符修院',
    icon: 'ti-books',
    master: '栾方棋（第五席）',
    masterLink: '栾方棋.html',
    desc: '符箓专精 · 法术理论 · 符阵基础',
    students: '林栖梧（统修期符法第一）',
    dynamics: ['栾方棋带领弟子完成青州锁龙井加固任务', '符修院新增《符箓变体十二式》课程'],
    status: '正常',
    statusDot: 'normal'
  },
  {
    id: 'jiangwu',
    name: '讲武堂',
    icon: 'ti-swords',
    master: '罗修（首席）',
    masterLink: '罗修.html',
    desc: '双刀 · 体术 · 实战对抗',
    students: '罗烬（讲武堂新晋弟子）',
    dynamics: ['首席特别课程「双刀进阶」已开课', '演武广场石靶维修完成，恢复使用'],
    status: '繁忙',
    statusDot: 'busy'
  },
  {
    id: 'qiangge',
    name: '枪阁',
    icon: 'ti-spear',
    master: '林淮（第二席）',
    masterLink: '林淮.html',
    desc: '枪法专精 · 近战武器 · 单点爆发',
    students: '暂无',
    dynamics: ['林淮带队完成忘川河畔巡逻任务', '枪阁新弟子报名通道开启'],
    status: '正常',
    statusDot: 'normal'
  },
  {
    id: 'lifeng',
    name: '砺峰阁',
    icon: 'ti-mountain',
    master: '魏元璟（第七席）',
    masterLink: '魏元璟.html',
    desc: '魂力控制 · 冥想 · 抗压训练',
    students: '罗烬（兼修·抗压课程）',
    dynamics: ['魏元璟于音律坊试奏新曲《忘川渡》', '砺峰阁抗压课程升级，新增魂力冲击模拟'],
    status: '正常',
    statusDot: 'normal'
  },
  {
    id: 'yinlv',
    name: '音律坊',
    icon: 'ti-music',
    master: '魏元璟 · 程木栖',
    masterLink: null,
    desc: '音律 · 魂力共鸣 · 笛琴合奏',
    students: '暂无',
    dynamics: ['魏元璟与程木栖合奏新曲《忘川渡》获得好评', '音律坊计划招收新弟子'],
    status: '正常',
    statusDot: 'normal'
  },
  {
    id: 'qiwu',
    name: '栖梧馆',
    icon: 'ti-medical-cross',
    master: '程木栖（退役）',
    masterLink: null,
    desc: '医药 · 伤患治疗 · 药理',
    students: '林栖梧（兼修·药理辨识）',
    dynamics: ['程木栖完成新药方试制', '栖梧馆药材储备充足，已开放外借'],
    status: '正常',
    statusDot: 'normal'
  },
  {
    id: 'zhenfa',
    name: '阵法堂',
    icon: 'ti-layout-grid',
    master: '第三席（未知）',
    masterLink: null,
    desc: '阵法 · 符阵 · 暗器',
    students: '暂无',
    dynamics: ['阵法课程调整，部分课程延期', '第三席行踪不定，暂由符修院代管'],
    status: '维护中',
    statusDot: 'maintenance'
  },
  {
    id: 'gongzao',
    name: '工造司',
    icon: 'ti-tools',
    master: '第四席（未知）',
    masterLink: null,
    desc: '兵器锻造 · 维修 · 定制',
    students: '不适用',
    dynamics: ['引魂刀批量交付讲武堂', '工造司新增定制武器服务'],
    status: '正常',
    statusDot: 'normal'
  },
  {
    id: 'chengxin',
    name: '澄心堂',
    icon: 'ti-blade',
    master: '第六席（未知）',
    masterLink: null,
    desc: '剑修 · 剑法传授',
    students: '暂无',
    dynamics: ['澄心堂剑法课程筹备中', '第六席近期于人间行走未归'],
    status: '正常',
    statusDot: 'normal'
  },
  {
    id: 'baicao',
    name: '百草堂',
    icon: 'ti-leaf',
    master: '第八席（未知）',
    masterLink: null,
    desc: '用毒 · 药理（与栖梧馆合作）',
    students: '暂无',
    dynamics: ['百草堂与栖梧馆联合研制新药', '用毒课程选修人数较少，暂不开放'],
    status: '正常',
    statusDot: 'normal'
  },
  {
    id: 'zhiyun',
    name: '织云阁',
    icon: 'ti-cloud',
    master: '顾行舟（第九席）',
    masterLink: null,
    desc: '追迹 · 软兵器 · 侦查',
    students: '暂无',
    dynamics: ['织云阁追踪术课程筹备中', '顾行舟近期于人间执行外勤'],
    status: '正常',
    statusDot: 'normal'
  },
  {
    id: 'qiyun',
    name: '栖云阁',
    icon: 'ti-wind',
    master: '沈栖云（第十席）',
    masterLink: null,
    desc: '速度 · 双刃 · 突袭',
    students: '暂无',
    dynamics: ['沈栖云加入归终殿，初任第十席', '栖云阁课程规划中'],
    status: '正常',
    statusDot: 'normal'
  }
];

// 人物索引
var INDEX_DATA = [
  { name: '林栖梧', link: '档案.html#linxiwu' },
  { name: '罗烬', link: '档案.html#luojin' },
  { name: '栾方棋', link: '栾方棋.html' },
  { name: '林淮', link: '林淮.html' },
  { name: '罗修', link: '罗修.html' },
  { name: '魏元璟', link: '魏元璟.html' },
  { name: '程木栖', link: null },
  { name: '蔡可', link: null },
  { name: '第三席', link: null },
  { name: '第四席', link: null },
  { name: '第六席', link: null },
  { name: '第八席', link: null },
  { name: '顾行舟', link: null },
  { name: '沈栖云', link: null }
];

// ===== 5. 渲染十席排名 =====
function renderRank(containerId) {
  var tbody = document.getElementById(containerId);
  if (!tbody) return;
  tbody.innerHTML = '';
  RANK_DATA.forEach(function(item) {
    var tr = document.createElement('tr');
    var nameHtml = item.name;
    if (item.name !== '—' && item.link) {
      nameHtml = '<a href="' + item.link + '">' + item.name + '</a>';
    }
    var titleDisplay = item.title !== '—' ? item.title : '—';
    var weaponDisplay = item.weapon !== '—' ? item.weapon : '—';
    var divineDisplay = item.divine !== '—' ? item.divine : '—';
    var hallDisplay = item.hall || '—';
    tr.innerHTML = '<td class="rank-num">' + item.rank + '</td>' +
      '<td class="name">' + nameHtml + '</td>' +
      '<td>' + titleDisplay + '</td>' +
      '<td class="weapon">' + weaponDisplay + '</td>' +
      '<td class="weapon">' + divineDisplay + '</td>' +
      '<td>' + hallDisplay + '</td>';
    tbody.appendChild(tr);
  });
}

// ===== 6. 渲染院阁切换按钮 =====
function renderHallTabs(tabContainerId, detailContainerId) {
  var tabContainer = document.getElementById(tabContainerId);
  var detailContainer = document.getElementById(detailContainerId);
  if (!tabContainer || !detailContainer) return;
  tabContainer.innerHTML = '';
  HALL_DATA.forEach(function(hall, idx) {
    var btn = document.createElement('button');
    btn.className = 'tab-btn' + (idx === 0 ? ' active' : '');
    btn.dataset.index = idx;
    btn.innerHTML = '<i class="ti ' + hall.icon + '" style="font-size:0.8rem;vertical-align:middle;margin-right:4px;"></i> ' + hall.name;
    btn.addEventListener('click', function() {
      var parent = this.parentElement;
      parent.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      renderHallDetail(detailContainerId, parseInt(this.dataset.index));
    });
    tabContainer.appendChild(btn);
  });
  // 默认显示第一个
  renderHallDetail(detailContainerId, 0);
}

// ===== 7. 渲染单个院阁详情 =====
function renderHallDetail(containerId, index) {
  var container = document.getElementById(containerId);
  if (!container) return;
  var hall = HALL_DATA[index];
  if (!hall) return;
  var statusMap = {
    '正常': '● 正常运转',
    '繁忙': '● 繁忙',
    '维护中': '● 维护中'
  };
  var dotMap = {
    'normal': 'normal',
    'busy': 'busy',
    'maintenance': 'maintenance'
  };
  var masterHtml = hall.master;
  if (hall.masterLink) {
    masterHtml = '<a href="' + hall.masterLink + '">' + hall.master + '</a>';
  }
  var studentsHtml = hall.students || '暂无';
  var dynHtml = hall.dynamics && hall.dynamics.length > 0
    ? hall.dynamics.map(function(d) { return '<div class="item"><span class="dot">·</span> ' + d + '</div>'; }).join('')
    : '<div class="item"><span class="dot">·</span> 暂无近期动态</div>';

  container.innerHTML = '<div class="hall-detail active">' +
    '<div class="hall-name"><i class="ti ' + hall.icon + '"></i> ' + hall.name + '</div>' +
    '<div class="hall-divider"></div>' +
    '<div class="info-line"><span class="label">负责人</span><span class="value">' + masterHtml + '</span></div>' +
    '<div class="info-line"><span class="label">职能</span><span class="value">' + hall.desc + '</span></div>' +
    '<div class="info-line"><span class="label">优秀学生</span><span class="value">' + studentsHtml + '</span></div>' +
    '<div class="info-line" style="margin-top:6px;"><span class="label">近期动态</span></div>' +
    '<div class="hall-dyn">' + dynHtml + '</div>' +
    '<div class="status-tag"><span class="dot ' + dotMap[hall.statusDot] + '"></span> ' + (statusMap[hall.status] || hall.status) + '</div>' +
    '</div>';
}

// ===== 8. 渲染人物索引 =====
function renderIndex(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  var items = [];
  INDEX_DATA.forEach(function(person) {
    var html = '';
    if (person.link) {
      html = '<a href="' + person.link + '">' + person.name + '</a>';
    } else {
      html = '<span style="color:var(--text-muted);">' + person.name + '</span>';
    }
    items.push('<span class="index-item">' + html + '</span>');
  });
  container.innerHTML = items.join('');
}

// ===== 9. 初始化所有 =====
function initAll() {
  var profile = document.body.getAttribute('data-profile') || 'linxiwu';
  var prefix = profile === 'linxiwu' ? 'lin' : 'luo';
  renderRank('rank-body-' + prefix);
  renderHallTabs('hall-tabs-' + prefix, 'hall-detail-' + prefix);
  renderIndex('index-' + prefix);
}

// 监听角色切换
window.addEventListener('profilechange', function() {
  setTimeout(initAll, 100);
});

setTimeout(initAll, 200);

console.log('🌙 归终殿 · 同僚与十席 v1.0 已加载');
})();