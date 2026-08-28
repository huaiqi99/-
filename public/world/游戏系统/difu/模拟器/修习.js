(function(){'use strict';

// ===== 保底：如果核心.js没加载 =====
if(!window.GZD){window.GZD={};
GZD.Storage={get(k,d){try{const r=localStorage.getItem(k);return r?JSON.parse(r):d;}catch(e){return d;}},set(k,v){localStorage.setItem(k,JSON.stringify(v));},getTheme(){const r=this.get('theme',null);return r&&r.value?r.value:'dark';},getProfile(){try{return localStorage.getItem('activeProfile')||'linxiwu';}catch(e){return'linxiwu';}},getQuests(){return this.get('gzd_quests',{});}};
GZD.ThemeManager={init(){const t=GZD.Storage.getTheme();const h=document.documentElement;if(t==='light')h.setAttribute('data-theme','light');else h.removeAttribute('data-theme');},toggle(){const isLight=document.documentElement.getAttribute('data-theme')==='light';const h=document.documentElement;if(isLight)h.removeAttribute('data-theme');else h.setAttribute('data-theme','light');GZD.Storage.set('theme',{value:isLight?'dark':'light'});}};
GZD.ProfileManager={init(){const id=GZD.Storage.getProfile();document.body.setAttribute('data-profile',id);document.querySelectorAll('.content-block').forEach(b=>b.classList.toggle('active',b.id==='content-'+id));},switch(id){document.body.setAttribute('data-profile',id);document.querySelectorAll('.content-block').forEach(b=>{b.classList.remove('active');if(b.id==='content-'+id)b.classList.add('active');});localStorage.setItem('activeProfile',id);window.dispatchEvent(new CustomEvent('profilechange',{detail:{profile:id}}));}};
GZD.Sidebar={open:false,toggle(){this.open=!this.open;const p=document.getElementById('sidebarPanel'),o=document.getElementById('sidebarOverlay');if(p)p.classList.toggle('open',this.open);if(o)o.classList.toggle('show',this.open);document.body.classList.toggle('no-scroll',this.open);},close(){if(this.open){this.open=false;const p=document.getElementById('sidebarPanel'),o=document.getElementById('sidebarOverlay');if(p)p.classList.remove('open');if(o)o.classList.remove('show');document.body.classList.remove('no-scroll');}}};
GZD.init=function(){this.ThemeManager.init();this.ProfileManager.init();};GZD.init();
}

// ===== 1. 侧边栏与主题按钮 =====
document.addEventListener('click',function(e){
  const target=e.target;
  if(target.closest('.sidebar-tab')){e.preventDefault();GZD.Sidebar.toggle();return;}
  if(target.id==='sidebarOverlay'){GZD.Sidebar.close();return;}
  if(target.closest('.sidebar-panel .close-btn')){GZD.Sidebar.close();return;}
  const switchBtn=target.closest('#profileSwitchBtn');
  if(switchBtn){e.preventDefault();e.stopPropagation();const current=document.body.getAttribute('data-profile')||'linxiwu';GZD.ProfileManager.switch(current==='linxiwu'?'luojin':'linxiwu');return;}
});
document.getElementById('themeBtn').addEventListener('click',function(){GZD.ThemeManager.toggle();updateThemeBtn();});
function updateThemeBtn(){const b=document.getElementById('themeBtn'),isLight=document.documentElement.getAttribute('data-theme')==='light';if(b)b.innerHTML='<span id="themeIcon">'+(isLight?'🌙':'☀️')+'</span> <span id="themeLabel">'+(isLight?'夜间':'日间')+'</span>';}
updateThemeBtn();

// ===== 2. 角色切换UI =====
function updateProfileUI(profile){const nameMap={'linxiwu':'林栖梧','luojin':'罗烬'};const nameEl=document.getElementById('currentProfileName');if(nameEl)nameEl.textContent=nameMap[profile]||'林栖梧';const switchBtn=document.getElementById('profileSwitchBtn');if(switchBtn)switchBtn.textContent='切换到 '+(profile==='linxiwu'?'罗烬':'林栖梧');}
(function(){const saved=GZD.Storage.getProfile();updateProfileUI(saved);})();
window.addEventListener('profilechange',function(e){updateProfileUI(e.detail.profile);});

// ===== 3. 花瓣特效 =====
const PETAL_CHARS=['❀','✿','✽'],petalContainer=document.getElementById('petal-container');
if(petalContainer){for(let i=0;i<12;i++){const el=document.createElement('div');el.className='petal-char';el.textContent=PETAL_CHARS[Math.floor(Math.random()*PETAL_CHARS.length)];el.style.left=Math.random()*100+'%';el.style.fontSize=(14+Math.random()*12)+'px';el.style.animationDuration=(10+Math.random()*10)+'s';el.style.animationDelay=(Math.random()*12)+'s';petalContainer.appendChild(el);}}

// ===== 4. 数据 =====

// 成绩数据
const SCORE_DATA = {
  linxiwu: {
    subjects: [
      { name: '符法基础', score: 88, rank: 1, tag: '法术', comment: '符法天赋突出，精血催符的火候还需打磨。统修期期末符箓实操表现优秀，但理论题审题偶有疏漏。', from: '栾方棋 · 第五席' },
      { name: '阵法与暗器', score: 75, rank: 4, tag: '法术', comment: '阵法理论掌握较快，实战布阵速度仍需提升。暗器课表现中规中矩，建议多练手稳。', from: '第三席' },
      { name: '兵器使用', score: 68, rank: 15, tag: '体术', comment: '兵器基础勉强及格，近战经验不足。建议多往演武场走动，别老蹲在符修院画符。', from: '林淮 · 第二席' },
      { name: '体术与实战', score: 60, rank: 18, tag: '体术', comment: '体术是明显短板，遇近战不宜硬扛。统修期未出现严重失误，但亦未见突破。', from: '罗修 · 首席' },
      { name: '引渡实务', score: 92, rank: 1, tag: '通用', comment: '引渡实务表现优异，亡魂沟通能力强。建议后续多参与实地引渡任务积累经验。', from: '程木栖 · 前第二席' },
      { name: '魂力运转与音律', score: 80, rank: 6, tag: '通用', comment: '魂力控制稳定，音律感知尚可。建议多听洛兰郡主的笛声，对魂力运转有帮助。', from: '魏元璟 · 第七席' }
    ],
    totalRank: 2,
    totalLabel: '乙上'
  },
  luojin: {
    subjects: [
      { name: '符法基础', score: 62, rank: 20, tag: '法术', comment: '符法理论能背，实操一塌糊涂。建议远离朱砂和符纸，放过自己也放过符修院。', from: '栾方棋 · 第五席' },
      { name: '阵法与暗器', score: 58, rank: 18, tag: '法术', comment: '阵法基础薄弱，勉强不挂科。暗器准头尚可，但布阵速度太慢，不建议选阵法方向。', from: '第三席' },
      { name: '兵器使用', score: 85, rank: 3, tag: '体术', comment: '兵器使用天赋突出，双刀架势已有雏形。继续保持，讲武堂需要你这样的苗子。', from: '罗修 · 首席' },
      { name: '体术与实战', score: 90, rank: 1, tag: '体术', comment: '体术在同辈中拔尖，实战反应快。但偶尔因莽撞陷入被动，建议多观察再出手。', from: '魏元璟 · 第七席' },
      { name: '引渡实务', score: 78, rank: 8, tag: '通用', comment: '引渡实务表现尚可，但缺乏耐心。建议多跟老引渡人出外勤，磨磨性子。', from: '程木栖 · 前第二席' },
      { name: '魂力运转与音律', score: 55, rank: 22, tag: '通用', comment: '魂力控制不稳定，音律感知偏弱。建议多上砺峰阁的冥想课，别总想着砍人。', from: '魏元璟 · 第七席' }
    ],
    totalRank: 7,
    totalLabel: '乙中'
  }
};

// 课程进度数据
const PROGRESS_DATA = {
  linxiwu: [
    { name: '高阶符箓', current: 6, total: 20, checked: false },
    { name: '符阵实战', current: 4, total: 16, checked: false },
    { name: '体术自保', current: 3, total: 12, checked: false },
    { name: '魂力冥想', current: 5, total: 16, checked: false }
  ],
  luojin: [
    { name: '双刀进阶', current: 4, total: 16, checked: false },
    { name: '体术特训', current: 3, total: 12, checked: false },
    { name: '魂力控制', current: 5, total: 16, checked: false },
    { name: '抗压冥想', current: 3, total: 12, checked: false }
  ]
};

// 课表数据
// 注意：每天 5 个时间段（卯时、辰时、巳时、午时、未时），部分格子为空
// 7 列：周一 ~ 周日
const SCHEDULE_DATA = {
  linxiwu: {
    timeLabels: ['卯时', '辰时', '巳时', '午时', '未时'],
    days: ['一', '二', '三', '四', '五', '六', '日'],
    courses: [
      // 周一
      [{ name: '体术自保', type: 'required', teacher: '林淮', location: '演武场', desc: '基础体术与近战自保', exam: '对抗演练' }, null, null, null, null],
      // 周二
      [{ name: '符箓理论', type: 'elective', teacher: '栾方棋', location: '符修院·乙字堂', desc: '高阶符箓理论精讲', exam: '理论笔试' }, null, null, null, null],
      // 周三
      [{ name: '符阵实战', type: 'required', teacher: '第三席', location: '阵法堂', desc: '符阵实战应用与布阵', exam: '阵纹绘制' }, null, null, null, null],
      // 周四
      [{ name: '药理辨识', type: 'elective', teacher: '程木栖', location: '栖梧馆', desc: '常用药材辨识与应用', exam: '药材辨认' }, null, null, null, null],
      // 周五
      [{ name: '音律基础', type: 'elective', teacher: '魏元璟', location: '音律坊', desc: '音律与魂力共鸣基础', exam: '曲谱演奏' }, null, null, null, null],
      // 周六
      [null, null, null, null, null],
      // 周日
      [null, null, null, null, null]
    ],
    // 实际填充：每个时间段的具体课程
    // 这里用更完整的结构
    fullSchedule: [
      // 周一
      [
        { name: '体术自保', type: 'required', teacher: '林淮', location: '演武场', desc: '基础体术与近战自保', exam: '对抗演练' },
        { name: '高阶符箓', type: 'required', teacher: '栾方棋', location: '符修院·丙字堂', desc: '高阶符箓绘制与实战', exam: '符箓实操' },
        { name: '符箓理论', type: 'elective', teacher: '栾方棋', location: '符修院·乙字堂', desc: '高阶符箓理论精讲', exam: '理论笔试' },
        { name: '引渡实务', type: 'elective', teacher: '程木栖', location: '栖梧馆', desc: '引渡流程与亡魂沟通', exam: '实地引渡' },
        null
      ],
      // 周二
      [
        null,
        { name: '符阵实战', type: 'required', teacher: '第三席', location: '阵法堂', desc: '符阵实战应用与布阵', exam: '阵纹绘制' },
        { name: '药理辨识', type: 'elective', teacher: '程木栖', location: '栖梧馆', desc: '常用药材辨识与应用', exam: '药材辨认' },
        { name: '魂力冥想', type: 'elective', teacher: '魏元璟', location: '砺峰阁', desc: '魂力稳定与深度冥想', exam: '冥想记录' },
        { name: '音律基础', type: 'elective', teacher: '魏元璟', location: '音律坊', desc: '音律与魂力共鸣基础', exam: '曲谱演奏' }
      ],
      // 周三
      [
        { name: '体术自保', type: 'required', teacher: '林淮', location: '演武场', desc: '基础体术与近战自保', exam: '对抗演练' },
        { name: '高阶符箓', type: 'required', teacher: '栾方棋', location: '符修院·丙字堂', desc: '高阶符箓绘制与实战', exam: '符箓实操' },
        { name: '符箓理论', type: 'elective', teacher: '栾方棋', location: '符修院·乙字堂', desc: '高阶符箓理论精讲', exam: '理论笔试' },
        { name: '引渡实务', type: 'elective', teacher: '程木栖', location: '栖梧馆', desc: '引渡流程与亡魂沟通', exam: '实地引渡' },
        null
      ],
      // 周四
      [
        null,
        { name: '符阵实战', type: 'required', teacher: '第三席', location: '阵法堂', desc: '符阵实战应用与布阵', exam: '阵纹绘制' },
        { name: '药理辨识', type: 'elective', teacher: '程木栖', location: '栖梧馆', desc: '常用药材辨识与应用', exam: '药材辨认' },
        { name: '魂力冥想', type: 'elective', teacher: '魏元璟', location: '砺峰阁', desc: '魂力稳定与深度冥想', exam: '冥想记录' },
        null
      ],
      // 周五
      [
        { name: '体术自保', type: 'required', teacher: '林淮', location: '演武场', desc: '基础体术与近战自保', exam: '对抗演练' },
        { name: '高阶符箓', type: 'required', teacher: '栾方棋', location: '符修院·丙字堂', desc: '高阶符箓绘制与实战', exam: '符箓实操' },
        { name: '符箓理论', type: 'elective', teacher: '栾方棋', location: '符修院·乙字堂', desc: '高阶符箓理论精讲', exam: '理论笔试' },
        null,
        { name: '音律基础', type: 'elective', teacher: '魏元璟', location: '音律坊', desc: '音律与魂力共鸣基础', exam: '曲谱演奏' }
      ],
      // 周六
      [null, null, null, null, null],
      // 周日
      [null, null, null, null, null]
    ]
  },
  luojin: {
    timeLabels: ['卯时', '辰时', '巳时', '午时', '未时'],
    days: ['一', '二', '三', '四', '五', '六', '日'],
    fullSchedule: [
      // 周一
      [
        { name: '体术特训', type: 'required', teacher: '罗修', location: '讲武堂', desc: '高强度体能与力量训练', exam: '体能测试' },
        { name: '双刀进阶', type: 'required', teacher: '罗修', location: '讲武堂', desc: '双刀技法进阶与实战', exam: '刀法演示' },
        null,
        null,
        null
      ],
      // 周二
      [
        null,
        { name: '魂力控制', type: 'elective', teacher: '魏元璟', location: '砺峰阁', desc: '魂力精准控制与引导', exam: '魂力测试' },
        null,
        { name: '抗压冥想', type: 'elective', teacher: '魏元璟', location: '砺峰阁', desc: '抗压与专注力训练', exam: '冥想记录' },
        null
      ],
      // 周三
      [
        { name: '体术特训', type: 'required', teacher: '罗修', location: '讲武堂', desc: '高强度体能与力量训练', exam: '体能测试' },
        { name: '双刀进阶', type: 'required', teacher: '罗修', location: '讲武堂', desc: '双刀技法进阶与实战', exam: '刀法演示' },
        null,
        null,
        null
      ],
      // 周四
      [
        null,
        { name: '魂力控制', type: 'elective', teacher: '魏元璟', location: '砺峰阁', desc: '魂力精准控制与引导', exam: '魂力测试' },
        null,
        { name: '抗压冥想', type: 'elective', teacher: '魏元璟', location: '砺峰阁', desc: '抗压与专注力训练', exam: '冥想记录' },
        null
      ],
      // 周五
      [
        { name: '体术特训', type: 'required', teacher: '罗修', location: '讲武堂', desc: '高强度体能与力量训练', exam: '体能测试' },
        { name: '双刀进阶', type: 'required', teacher: '罗修', location: '讲武堂', desc: '双刀技法进阶与实战', exam: '刀法演示' },
        null,
        null,
        null
      ],
      // 周六
      [null, null, null, null, null],
      // 周日
      [null, null, null, null, null]
    ]
  }
};

// 修习日志数据
const TIMELINE_DATA = {
  linxiwu: [
    { date: '霜月初一 · 辰时', title: '高阶符箓课出勤', desc: '首次进入高阶符阵课堂，独立完成基础纹路辨识。' },
    { date: '霜月初三 · 未时', title: '体术自保课迟到', desc: '因魂力亏空未愈，迟到一刻钟。林淮未置评，但多留了一刻钟。' },
    { date: '霜月初七 · 戌时', title: '浮生树冥想缺课', desc: '精血催符后遗症发作，栖梧馆建议静养。程木栖代为请假。' }
  ],
  luojin: [
    { date: '霜月初一 · 辰时', title: '双刀进阶课出勤', desc: 'Chief未出刀，先让跑了十圈。跑完Chief说：「还行，没吐。」' },
    { date: '霜月初三 · 未时', title: '魂力控制课走神', desc: '冥想时睡着，被魏元璟用笛子敲醒。未记过，但多留了一刻钟。' },
    { date: '霜月初五 · 辰时', title: '演武广场损坏公物', desc: '训练中一刀劈裂石靶，工造司已记录。Chief收刀时顿了一下，没骂人。' }
  ]
};

// ===== 5. 渲染成绩卡片 =====
function renderScores(profile) {
  const data = SCORE_DATA[profile];
  const container = document.getElementById('score-grid-' + (profile === 'linxiwu' ? 'lin' : 'luo'));
  if (!container) return;
  container.innerHTML = '';
  data.subjects.forEach(function(s) {
    const div = document.createElement('div');
    div.className = 'score-card-item';
    const rankText = s.rank === 1 ? '第 1 名' : '第 ' + s.rank + ' 名';
    const rankClass = s.rank <= 3 ? 'top' : '';
    const isHigh = s.score >= 80;
    div.innerHTML = '<div class="top"><span class="subject">' + s.name + '</span><span class="score' + (isHigh ? '' : '') + '">' + s.score + '</span></div>' +
      '<div class="rank ' + rankClass + '">' + rankText + '</div>' +
      '<div class="tooltip">' + s.comment + '<span class="from">—— ' + s.from + '</span></div>';
    container.appendChild(div);
  });
  // 总排名行
  const total = document.createElement('div');
  total.className = 'score-total-row';
  total.innerHTML = '<span>综合评定</span><span class="rank">第 ' + data.totalRank + ' 名 · ' + data.totalLabel + '</span>';
  container.appendChild(total);
}

// ===== 6. 渲染课程进度 =====
function renderProgress(profile) {
  const data = PROGRESS_DATA[profile];
  const container = document.getElementById('progress-' + (profile === 'linxiwu' ? 'lin' : 'luo'));
  if (!container) return;
  container.innerHTML = '';
  data.forEach(function(item) {
    const pct = Math.round((item.current / item.total) * 100);
    const div = document.createElement('div');
    div.className = 'progress-item';
    div.innerHTML = '<div class="p-info"><div class="p-top"><span class="name">' + item.name + '</span><span class="info">' + item.current + ' / ' + item.total + ' 课时</span></div><div class="p-bar"><div class="fill" style="width:' + pct + '%;"></div></div></div>' +
      '<div class="p-check" data-checked="' + (item.checked ? 'true' : 'false') + '"><i class="ti ti-check"></i> 预习</div>';
    container.appendChild(div);
    // 点击切换状态
    const checkEl = div.querySelector('.p-check');
    checkEl.addEventListener('click', function(e) {
      e.stopPropagation();
      const isChecked = this.dataset.checked === 'true';
      this.dataset.checked = isChecked ? 'false' : 'true';
      this.classList.toggle('done');
      // 存储状态
      item.checked = !isChecked;
    });
    if (item.checked) {
      checkEl.classList.add('done');
    }
  });
}

// ===== 7. 渲染课表 =====
function renderSchedule(profile) {
  const data = SCHEDULE_DATA[profile];
  const container = document.getElementById('schedule-grid-' + (profile === 'linxiwu' ? 'lin' : 'luo'));
  if (!container) return;
  container.innerHTML = '';
  const full = data.fullSchedule;
  const timeLabels = data.timeLabels;
  const days = data.days;

  // 表头：空 + 周一~周日
  const headRow = document.createElement('div');
  headRow.className = 'cell head';
  headRow.textContent = '时间';
  container.appendChild(headRow);
  days.forEach(function(d) {
    const cell = document.createElement('div');
    cell.className = 'cell head';
    cell.textContent = d;
    container.appendChild(cell);
  });

  // 每个时间段一行
  timeLabels.forEach(function(tlabel, rowIdx) {
    // 时间标签
    const timeCell = document.createElement('div');
    timeCell.className = 'cell time-label';
    timeCell.innerHTML = tlabel;
    container.appendChild(timeCell);

    // 7 天
    for (var dayIdx = 0; dayIdx < 7; dayIdx++) {
      const cell = document.createElement('div');
      const course = full[dayIdx] && full[dayIdx][rowIdx] ? full[dayIdx][rowIdx] : null;
      if (course) {
        cell.className = 'cell ' + course.type + ' clickable';
        cell.innerHTML = course.name + '<span class="sub">' + course.teacher + '</span>';
        // 存储课程数据用于弹窗
        cell.dataset.course = JSON.stringify(course);
        cell.addEventListener('click', function(e) {
          const c = JSON.parse(this.dataset.course);
          openCoursePopup(c);
        });
      } else {
        // 空课
        cell.className = 'cell free';
        cell.textContent = '—';
      }
      container.appendChild(cell);
    }
  });
}

// ===== 8. 课程详情弹窗 =====
function openCoursePopup(course) {
  const overlay = document.getElementById('coursePopup');
  if (!overlay) return;
  document.getElementById('popTitle').textContent = course.name;
  document.getElementById('popTeacher').textContent = course.teacher;
  document.getElementById('popLocation').textContent = '📍 ' + (course.location || '未定');
  document.getElementById('popDesc').textContent = course.desc || '暂无简介';
  document.getElementById('popMeta').textContent = '📋 考核：' + (course.exam || '待定');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCoursePopup() {
  const overlay = document.getElementById('coursePopup');
  if (!overlay) return;
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

// 弹窗关闭事件
document.getElementById('popupClose').addEventListener('click', closeCoursePopup);
document.getElementById('coursePopup').addEventListener('click', function(e) {
  if (e.target === this) closeCoursePopup();
});

// ===== 9. 渲染修习日志 =====
function renderTimeline(profile) {
  const data = TIMELINE_DATA[profile];
  const container = document.getElementById('timeline-' + (profile === 'linxiwu' ? 'lin' : 'luo'));
  if (!container) return;
  container.innerHTML = '';
  data.forEach(function(item) {
    const div = document.createElement('div');
    div.className = 'timeline-item';
    div.innerHTML = '<div class="date">' + item.date + '</div><div class="title">' + item.title + '</div><div class="desc">' + item.desc + '</div>';
    container.appendChild(div);
  });
  // 触发渐入
  setTimeout(function() {
    container.querySelectorAll('.timeline-item').forEach(function(el) {
      el.classList.add('visible');
    });
  }, 300);
}

// ===== 10. 初始化所有 =====
function initAll() {
  const profile = document.body.getAttribute('data-profile') || 'linxiwu';
  renderScores(profile);
  renderProgress(profile);
  renderSchedule(profile);
  renderTimeline(profile);
}

// 监听角色切换
window.addEventListener('profilechange', function() {
  setTimeout(initAll, 100);
});

// 初始加载
setTimeout(initAll, 200);

console.log('🌙 归终殿 · 院阁修习表 v2.0 已加载');
})();