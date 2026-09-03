(function(){'use strict';

if(!window.GZD){window.GZD={};
GZD.Storage={get(k,d){try{const r=localStorage.getItem(k);return r?JSON.parse(r):d;}catch(e){return d;}},set(k,v){localStorage.setItem(k,JSON.stringify(v));},getTheme(){const r=this.get('theme',null);return r&&r.value?r.value:'dark';},getProfile(){try{return localStorage.getItem('activeProfile')||'linxiwu';}catch(e){return'linxiwu';}},getQuests(){return this.get('gzd_quests',{});}};
GZD.ThemeManager={init(){const t=GZD.Storage.getTheme();const h=document.documentElement;if(t==='light')h.setAttribute('data-theme','light');else h.removeAttribute('data-theme');},toggle(){const isLight=document.documentElement.getAttribute('data-theme')==='light';const h=document.documentElement;if(isLight)h.removeAttribute('data-theme');else h.setAttribute('data-theme','light');GZD.Storage.set('theme',{value:isLight?'dark':'light'});}};
GZD.ProfileManager={init(){const id=GZD.Storage.getProfile();document.body.setAttribute('data-profile',id);document.querySelectorAll('.content-block').forEach(b=>b.classList.toggle('active',b.id==='content-'+id));},switch(id){document.body.setAttribute('data-profile',id);document.querySelectorAll('.content-block').forEach(b=>{b.classList.remove('active');if(b.id==='content-'+id)b.classList.add('active');});localStorage.setItem('activeProfile',id);window.dispatchEvent(new CustomEvent('profilechange',{detail:{profile:id}}));}};
GZD.Sidebar={open:false,toggle(){this.open=!this.open;const p=document.getElementById('sidebarPanel'),o=document.getElementById('sidebarOverlay');if(p)p.classList.toggle('open',this.open);if(o)o.classList.toggle('show',this.open);document.body.classList.toggle('no-scroll',this.open);},close(){if(this.open){this.open=false;const p=document.getElementById('sidebarPanel'),o=document.getElementById('sidebarOverlay');if(p)p.classList.remove('open');if(o)o.classList.remove('show');document.body.classList.remove('no-scroll');}}};
GZD.init=function(){this.ThemeManager.init();this.ProfileManager.init();};GZD.init();
}

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

function updateProfileUI(profile){const nameMap={'linxiwu':'林栖梧','luojin':'罗烬'};const nameEl=document.getElementById('currentProfileName');if(nameEl)nameEl.textContent=nameMap[profile]||'林栖梧';const switchBtn=document.getElementById('profileSwitchBtn');if(switchBtn)switchBtn.textContent='切换到 '+(profile==='linxiwu'?'罗烬':'林栖梧');}
(function(){const saved=GZD.Storage.getProfile();updateProfileUI(saved);})();
window.addEventListener('profilechange',function(e){updateProfileUI(e.detail.profile);});

const PETAL_CHARS=['❀','✿','✽'],petalContainer=document.getElementById('petal-container');
if(petalContainer){for(let i=0;i<12;i++){const el=document.createElement('div');el.className='petal-char';el.textContent=PETAL_CHARS[Math.floor(Math.random()*PETAL_CHARS.length)];el.style.left=Math.random()*100+'%';el.style.fontSize=(14+Math.random()*12)+'px';el.style.animationDuration=(10+Math.random()*10)+'s';el.style.animationDelay=(Math.random()*12)+'s';petalContainer.appendChild(el);}}

var SCORE_DATA = {
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

var PROGRESS_DATA = {
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

var SCHEDULE_DATA = {
  linxiwu: {
    timeLabels: ['卯时', '辰时', '巳时', '午时', '未时'],
    days: ['一', '二', '三', '四', '五', '六', '日'],
    fullSchedule: [
      [
        { name: '体术自保', type: 'required', teacher: '林淮', location: '演武场', desc: '基础体术与近战自保课程，重点训练闪避与格挡意识。', exam: '对抗演练：需在模拟战中保持三回合不倒地。' },
        { name: '高阶符箓', type: 'required', teacher: '栾方棋', location: '符修院·丙字堂', desc: '高阶符箓绘制与实战应用，本周开始学习聚灵符的变体画法。', exam: '符箓实操：独立完成三道聚灵符变体。' },
        null,
        null,
        null
      ],
      [
        null,
        { name: '符阵实战', type: 'required', teacher: '第三席', location: '阵法堂', desc: '符阵实战应用与布阵技巧，重点训练快速布阵与阵眼识别。', exam: '阵纹绘制：限时完成一个基础防御阵。' },
        null,
        { name: '魂力冥想', type: 'elective', teacher: '魏元璟', location: '砺峰阁', desc: '魂力稳定与深度冥想训练，本周主题是"魂力归位"。', exam: '冥想记录：提交一份冥想心得。' },
        null
      ],
      [
        { name: '体术自保', type: 'required', teacher: '林淮', location: '演武场', desc: '基础体术与近战自保课程，本周加练短距离冲刺与急停。', exam: '对抗演练：需在模拟战中保持三回合不倒地。' },
        { name: '高阶符箓', type: 'required', teacher: '栾方棋', location: '符修院·丙字堂', desc: '高阶符箓绘制与实战应用，重点讲解符箓的灵力注入技巧。', exam: '符箓实操：独立完成三道聚灵符变体。' },
        null,
        null,
        null
      ],
      [
        null,
        { name: '符阵实战', type: 'required', teacher: '第三席', location: '阵法堂', desc: '符阵实战应用与布阵技巧，本周开始学习双阵联动。', exam: '阵纹绘制：限时完成一个基础防御阵。' },
        null,
        { name: '魂力冥想', type: 'elective', teacher: '魏元璟', location: '砺峰阁', desc: '魂力稳定与深度冥想训练，本周主题是"魂力归位"。', exam: '冥想记录：提交一份冥想心得。' },
        null
      ],
      [
        null,
        { name: '高阶符箓', type: 'required', teacher: '栾方棋', location: '符修院·丙字堂', desc: '高阶符箓绘制与实战应用，本周进行随堂小测。', exam: '符箓实操：独立完成三道聚灵符变体。' },
        null,
        null,
        null
      ],
      [null, null, null, null, null],
      [null, null, null, null, null]
    ]
  },
  luojin: {
    timeLabels: ['卯时', '辰时', '巳时', '午时', '未时'],
    days: ['一', '二', '三', '四', '五', '六', '日'],
    fullSchedule: [
      [
        { name: '体术特训', type: 'required', teacher: '罗修', location: '讲武堂', desc: '高强度体能与力量训练，本周重点训练下肢爆发力。', exam: '体能测试：折返跑与深蹲负重。' },
        { name: '双刀进阶', type: 'required', teacher: '罗修', location: '讲武堂', desc: '双刀技法进阶与实战，本周开始学习双刀连招的衔接。', exam: '刀法演示：完整展示一套双刀连招。' },
        null,
        null,
        null
      ],
      [
        null,
        { name: '魂力控制', type: 'elective', teacher: '魏元璟', location: '砺峰阁', desc: '魂力精准控制与引导，本周重点是魂力外放与回收。', exam: '魂力测试：在冥想中稳定魂力波动三刻钟。' },
        null,
        { name: '抗压冥想', type: 'elective', teacher: '魏元璟', location: '砺峰阁', desc: '抗压与专注力训练，本周引入"魂力冲击"模拟对抗。', exam: '冥想记录：提交一份抗压体验报告。' },
        null
      ],
      [
        { name: '体术特训', type: 'required', teacher: '罗修', location: '讲武堂', desc: '高强度体能与力量训练，本周加练负重冲刺。', exam: '体能测试：折返跑与深蹲负重。' },
        { name: '双刀进阶', type: 'required', teacher: '罗修', location: '讲武堂', desc: '双刀技法进阶与实战，本周进行双刀对抗模拟。', exam: '刀法演示：完整展示一套双刀连招。' },
        null,
        null,
        null
      ],
      [
        null,
        { name: '魂力控制', type: 'elective', teacher: '魏元璟', location: '砺峰阁', desc: '魂力精准控制与引导，本周重点是魂力外放与回收。', exam: '魂力测试：在冥想中稳定魂力波动三刻钟。' },
        null,
        { name: '抗压冥想', type: 'elective', teacher: '魏元璟', location: '砺峰阁', desc: '抗压与专注力训练，本周引入"魂力冲击"模拟对抗。', exam: '冥想记录：提交一份抗压体验报告。' },
        null
      ],
      [
        { name: '体术特训', type: 'required', teacher: '罗修', location: '讲武堂', desc: '高强度体能与力量训练，本周进行本周体能综合测试。', exam: '体能测试：折返跑与深蹲负重。' },
        { name: '双刀进阶', type: 'required', teacher: '罗修', location: '讲武堂', desc: '双刀技法进阶与实战，本周进行双刀对抗模拟。', exam: '刀法演示：完整展示一套双刀连招。' },
        null,
        null,
        null
      ],
      [null, null, null, null, null],
      [null, null, null, null, null]
    ]
  }
};

var TIMELINE_DATA = {
  linxiwu: [
    { date: '霜月初一 · 辰时', title: '高阶符箓课出勤', desc: '首次进入高阶符阵课堂，独立完成基础纹路辨识。', status: 'ok' },
    { date: '霜月初三 · 未时', title: '体术自保课迟到', desc: '因魂力亏空未愈，迟到一刻钟。林淮未置评，但多留了一刻钟。', status: 'warn' },
    { date: '霜月初七 · 戌时', title: '浮生树冥想缺课', desc: '精血催符后遗症发作，栖梧馆建议静养。程木栖代为请假。', status: 'fail' }
  ],
  luojin: [
    { date: '霜月初一 · 辰时', title: '双刀进阶课出勤', desc: 'Chief未出刀，先让跑了十圈。跑完Chief说：「还行，没吐。」', status: 'ok' },
    { date: '霜月初三 · 未时', title: '魂力控制课走神', desc: '冥想时睡着，被魏元璟用笛子敲醒。未记过，但多留了一刻钟。', status: 'warn' },
    { date: '霜月初五 · 辰时', title: '演武广场损坏公物', desc: '训练中一刀劈裂石靶，工造司已记录。Chief收刀时顿了一下，没骂人。', status: 'fail' }
  ]
};

function renderScores(profile) {
  var data = SCORE_DATA[profile];
  var container = document.getElementById('score-grid-' + (profile === 'linxiwu' ? 'lin' : 'luo'));
  if (!container) return;
  container.innerHTML = '';
  data.subjects.forEach(function(s) {
    var div = document.createElement('div');
    div.className = 'score-card-item';
    var rankText = s.rank === 1 ? '第 1 名' : '第 ' + s.rank + ' 名';
    var rankClass = s.rank <= 3 ? 'top' : '';
    div.innerHTML = '<div class="top"><span class="subject">' + s.name + '</span><span class="score">' + s.score + '</span></div>' +
      '<div class="rank ' + rankClass + '">' + rankText + '</div>' +
      '<div class="tooltip">' + s.comment + '<span class="from">—— ' + s.from + '</span></div>';
    container.appendChild(div);
  });
  var total = document.createElement('div');
  total.className = 'score-total-row';
  total.innerHTML = '<span>综合评定</span><span class="rank">第 ' + data.totalRank + ' 名 · ' + data.totalLabel + '</span>';
  container.appendChild(total);
}

function renderProgress(profile) {
  var data = PROGRESS_DATA[profile];
  var container = document.getElementById('progress-' + (profile === 'linxiwu' ? 'lin' : 'luo'));
  if (!container) return;
  container.innerHTML = '';
  data.forEach(function(item) {
    var pct = Math.round((item.current / item.total) * 100);
    var div = document.createElement('div');
    div.className = 'progress-item';
    div.innerHTML = '<div class="p-info"><div class="p-top"><span class="name">' + item.name + '</span><span class="info">' + item.current + ' / ' + item.total + ' 课时</span></div><div class="p-bar"><div class="fill" style="width:' + pct + '%;"></div></div></div>' +
      '<div class="p-check" data-checked="' + (item.checked ? 'true' : 'false') + '"><i class="ti ti-check"></i> 预习</div>';
    container.appendChild(div);
    var checkEl = div.querySelector('.p-check');
    checkEl.addEventListener('click', function(e) {
      e.stopPropagation();
      var isChecked = this.dataset.checked === 'true';
      this.dataset.checked = isChecked ? 'false' : 'true';
      this.classList.toggle('done');
      item.checked = !isChecked;
    });
    if (item.checked) {
      checkEl.classList.add('done');
    }
  });
}

function renderSchedule(profile) {
  var data = SCHEDULE_DATA[profile];
  var container = document.getElementById('schedule-grid-' + (profile === 'linxiwu' ? 'lin' : 'luo'));
  if (!container) return;
  container.innerHTML = '';
  var full = data.fullSchedule;
  var timeLabels = data.timeLabels;
  var days = data.days;

  var headRow = document.createElement('div');
  headRow.className = 'cell head';
  headRow.textContent = '时间';
  container.appendChild(headRow);
  days.forEach(function(d) {
    var cell = document.createElement('div');
    cell.className = 'cell head';
    cell.textContent = d;
    container.appendChild(cell);
  });

  timeLabels.forEach(function(tlabel, rowIdx) {
    var timeCell = document.createElement('div');
    timeCell.className = 'cell time-label';
    timeCell.innerHTML = tlabel;
    container.appendChild(timeCell);

    for (var dayIdx = 0; dayIdx < 7; dayIdx++) {
      var cell = document.createElement('div');
      var course = full[dayIdx] && full[dayIdx][rowIdx] ? full[dayIdx][rowIdx] : null;
      if (course) {
        cell.className = 'cell ' + course.type + ' clickable';
        cell.innerHTML = course.name + '<span class="sub">' + course.teacher + '</span>';
        cell.dataset.course = JSON.stringify(course);
        cell.addEventListener('click', function(e) {
          var c = JSON.parse(this.dataset.course);
          openCoursePopup(c);
        });
      } else {
        cell.className = 'cell free';
        cell.textContent = '—';
      }
      container.appendChild(cell);
    }
  });
}

function openCoursePopup(course) {
  var overlay = document.getElementById('coursePopup');
  if (!overlay) return;
  document.getElementById('popTitle').textContent = course.name;
  document.getElementById('popTeacher').textContent = '授课师长：' + course.teacher;
  document.getElementById('popLocation').textContent = '上课地点：' + (course.location || '未定');
  document.getElementById('popDesc').textContent = course.desc || '暂无课程简介。';
  document.getElementById('popMeta').innerHTML = '考核方式：' + (course.exam || '待定');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCoursePopup() {
  var overlay = document.getElementById('coursePopup');
  if (!overlay) return;
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

document.getElementById('popupClose').addEventListener('click', closeCoursePopup);
document.getElementById('coursePopup').addEventListener('click', function(e) {
  if (e.target === this) closeCoursePopup();
});

function renderTimeline(profile) {
  var data = TIMELINE_DATA[profile];
  var container = document.getElementById('timeline-' + (profile === 'linxiwu' ? 'lin' : 'luo'));
  if (!container) return;
  container.innerHTML = '';
  data.forEach(function(item) {
    var div = document.createElement('div');
    div.className = 'timeline-item';
    var statusMap = {
      'ok': '<span class="status-icon ok">[✓]</span>',
      'warn': '<span class="status-icon warn">[!]</span>',
      'fail': '<span class="status-icon fail">[✗]</span>'
    };
    var icon = statusMap[item.status] || '';
    div.innerHTML = '<div class="date">' + item.date + '</div><div class="title">' + item.title + '</div><div class="desc">' + item.desc + ' ' + icon + '</div>';
    container.appendChild(div);
  });
  setTimeout(function() {
    container.querySelectorAll('.timeline-item').forEach(function(el) {
      el.classList.add('visible');
    });
  }, 300);
}

function initAll() {
  var profile = document.body.getAttribute('data-profile') || 'linxiwu';
  renderScores(profile);
  renderProgress(profile);
  renderSchedule(profile);
  renderTimeline(profile);
}

window.addEventListener('profilechange', function() {
  setTimeout(initAll, 100);
});

setTimeout(initAll, 200);

console.log('🌙 归终殿 · 院阁修习表 v2.1 已加载');
})();