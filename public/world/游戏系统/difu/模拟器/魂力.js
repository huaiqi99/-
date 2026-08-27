(function() {
'use strict';

// ===== 侧边栏与主题按钮 =====
document.addEventListener('click', function(e) {
  var target = e.target;
  if (target.closest('.sidebar-tab')) { e.preventDefault(); GZD.Sidebar.toggle(); return; }
  if (target.id === 'sidebarOverlay') { GZD.Sidebar.close(); return; }
  if (target.closest('.sidebar-panel .close-btn')) { GZD.Sidebar.close(); return; }
  var switchBtn = target.closest('#profileSwitchBtn');
  if (switchBtn) {
    e.preventDefault();
    e.stopPropagation();
    var current = document.body.getAttribute('data-profile') || 'linxiwu';
    GZD.ProfileManager.switch(current === 'linxiwu' ? 'luojin' : 'linxiwu');
    setTimeout(function() { renderAll(); }, 100);
    return;
  }
});

document.getElementById('themeBtn').addEventListener('click', function() {
  GZD.ThemeManager.toggle();
  updateThemeBtn();
  setTimeout(function() { renderAll(); }, 200);
});

function updateThemeBtn() {
  var b = document.getElementById('themeBtn');
  var isLight = document.documentElement.getAttribute('data-theme') === 'light';
  if (b) b.innerHTML = '<span id="themeIcon">' + (isLight ? '🌙' : '☀️') + '</span> <span id="themeLabel">' + (isLight ? '夜间' : '日间') + '</span>';
}
updateThemeBtn();

// ===== 角色切换UI =====
function updateProfileUI(profile) {
  var nameMap = { linxiwu: '林栖梧', luojin: '罗烬' };
  var nameEl = document.getElementById('currentProfileName');
  if (nameEl) nameEl.textContent = nameMap[profile] || '林栖梧';
  var switchBtn = document.getElementById('profileSwitchBtn');
  if (switchBtn) switchBtn.textContent = '切换到 ' + (profile === 'linxiwu' ? '罗烬' : '林栖梧');
}
(function() { var saved = GZD.Storage.getProfile(); updateProfileUI(saved); })();
window.addEventListener('profilechange', function(e) { updateProfileUI(e.detail.profile); });

// ===== 数据 =====
var DATA = {
  linxiwu: {
    purity: 78,
    stability: 82,
    radar: [75, 35, 80, 70, 65, 50], // 魂力,体术,法术,学识,意志,敏捷
    radarLabels: ['魂力', '体术', '法术', '学识', '意志', '敏捷'],
    theory: 85,
    practice: 70,
    initiative: 80,
    team: 75,
    obey: 85,
    comm: 70
  },
  luojin: {
    purity: 65,
    stability: 55,
    radar: [60, 85, 30, 40, 55, 80], // 魂力,体术,刀法,学识,意志,敏捷
    radarLabels: ['魂力', '体术', '刀法', '学识', '意志', '敏捷'],
    theory: 50,
    practice: 75,
    initiative: 65,
    team: 60,
    obey: 50,
    comm: 65
  }
};

// ===== 获取当前角色 =====
function getCurrentProfile() {
  return document.body.getAttribute('data-profile') || 'linxiwu';
}

// ===== 绘制雷达图 =====
function drawRadar(svgId, stats, labels, accentColor) {
  var svg = document.getElementById(svgId);
  if (!svg) return;
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  var cx = 150, cy = 150, maxR = 120;
  var angles = [0, 60, 120, 180, 240, 300].map(function(d) { return d * Math.PI / 180; });
  var accent = accentColor || 'var(--profile-accent)';

  // 网格层
  [0.3, 0.5, 0.7, 1.0].forEach(function(ratio) {
    var r = maxR * ratio;
    var pts = angles.map(function(a) { return (cx + r * Math.sin(a)) + ',' + (cy - r * Math.cos(a)); }).join(' ');
    var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', pts);
    poly.setAttribute('fill', 'none');
    poly.setAttribute('stroke', 'var(--border-light)');
    poly.setAttribute('stroke-width', ratio === 1.0 ? '0.8' : '0.5');
    if (ratio !== 1.0) poly.setAttribute('stroke-dasharray', '4,4');
    svg.appendChild(poly);
  });

  // 轴线
  angles.forEach(function(a) {
    var x = cx + maxR * Math.sin(a);
    var y = cy - maxR * Math.cos(a);
    var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', cx);
    line.setAttribute('y1', cy);
    line.setAttribute('x2', x);
    line.setAttribute('y2', y);
    line.setAttribute('stroke', 'var(--border-light)');
    line.setAttribute('stroke-width', '0.4');
    line.setAttribute('stroke-dasharray', '2,3');
    svg.appendChild(line);
  });

  var vertices = stats.map(function(val, i) {
    var r = (val / 100) * maxR;
    var a = angles[i];
    return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a), val: val };
  });

  var centerPts = angles.map(function() { return cx + ',' + cy; }).join(' ');
  var targetPts = vertices.map(function(v) { return v.x + ',' + v.y; }).join(' ');

  var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  poly.setAttribute('points', centerPts);
  poly.setAttribute('fill', accent);
  poly.setAttribute('fill-opacity', '0.12');
  poly.setAttribute('stroke', accent);
  poly.setAttribute('stroke-width', '2.5');
  poly.setAttribute('stroke-linejoin', 'round');

  var anim = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
  anim.setAttribute('attributeName', 'points');
  anim.setAttribute('from', centerPts);
  anim.setAttribute('to', targetPts);
  anim.setAttribute('dur', '1.2s');
  anim.setAttribute('fill', 'freeze');
  anim.setAttribute('calcMode', 'spline');
  anim.setAttribute('keySplines', '0.25 0.1 0.25 1');
  poly.appendChild(anim);
  svg.appendChild(poly);

  // 顶点圆圈
  vertices.forEach(function(v) {
    var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', v.x);
    circle.setAttribute('cy', v.y);
    circle.setAttribute('r', '3');
    circle.setAttribute('fill', accent);
    circle.setAttribute('opacity', '0');
    var fade = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
    fade.setAttribute('attributeName', 'opacity');
    fade.setAttribute('from', '0');
    fade.setAttribute('to', '1');
    fade.setAttribute('dur', '0.3s');
    fade.setAttribute('begin', '1s');
    fade.setAttribute('fill', 'freeze');
    circle.appendChild(fade);
    svg.appendChild(circle);
  });

  // 标签
  var labelPositions = [
    { x: 150, y: 10, text: labels[0], anchor: 'middle' },
    { x: 266, y: 112, text: labels[1], anchor: 'start' },
    { x: 250, y: 206, text: labels[2], anchor: 'start' },
    { x: 150, y: 286, text: labels[3], anchor: 'middle' },
    { x: 52, y: 210, text: labels[4], anchor: 'end' },
    { x: 34, y: 106, text: labels[5], anchor: 'end' }
  ];
  labelPositions.forEach(function(lp) {
    var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', lp.x);
    text.setAttribute('y', lp.y);
    text.setAttribute('fill', 'var(--text-muted)');
    text.setAttribute('font-size', '8');
    text.setAttribute('font-weight', '400');
    text.setAttribute('text-anchor', lp.anchor);
    text.setAttribute('dominant-baseline', 'central');
    text.textContent = lp.text;
    svg.appendChild(text);
  });

  // 数值标注
  var anchorMap = ['middle', 'start', 'start', 'middle', 'end', 'end'];
  vertices.forEach(function(v, i) {
    var offset = 12;
    var a = angles[i];
    var dx = offset * Math.sin(a);
    var dy = -offset * Math.cos(a);
    var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    if (i === 0) {
      text.setAttribute('x', v.x + 14);
      text.setAttribute('y', v.y);
      text.setAttribute('text-anchor', 'start');
    } else {
      text.setAttribute('x', v.x + dx);
      text.setAttribute('y', v.y + dy);
      text.setAttribute('text-anchor', anchorMap[i]);
    }
    text.setAttribute('fill', accent);
    text.setAttribute('font-size', '9');
    text.setAttribute('font-weight', '600');
    text.setAttribute('dominant-baseline', 'central');
    text.textContent = v.val;
    text.setAttribute('opacity', '0');
    var fade = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
    fade.setAttribute('attributeName', 'opacity');
    fade.setAttribute('from', '0');
    fade.setAttribute('to', '1');
    fade.setAttribute('dur', '0.3s');
    fade.setAttribute('begin', '1.2s');
    fade.setAttribute('fill', 'freeze');
    text.appendChild(fade);
    svg.appendChild(text);
  });
}

// ===== 渲染进度条列表 =====
function renderAttrList(containerId, stats, labels) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  stats.forEach(function(val, i) {
    var div = document.createElement('div');
    div.className = 'attr-item';
    div.innerHTML = '<span class="label">' + labels[i] + '</span><div class="bar-wrap"><div class="bar-fill" data-val="' + val + '" style="width:0%;"></div></div><span class="val">' + val + '</span>';
    container.appendChild(div);
  });
  // 延迟触发动画
  setTimeout(function() {
    var bars = container.querySelectorAll('.bar-fill');
    bars.forEach(function(bar, idx) {
      var val = parseFloat(bar.getAttribute('data-val')) || 0;
      setTimeout(function() {
        bar.style.width = val + '%';
      }, 150 + idx * 80);
    });
  }, 200);
}

// ===== 渲染基础状态进度条 =====
function renderStatusBars(profile) {
  var data = DATA[profile];
  if (!data) return;
  var prefix = profile === 'linxiwu' ? 'lin' : 'luo';
  var purityBar = document.getElementById(prefix + '-purity-bar');
  var stabilityBar = document.getElementById(prefix + '-stability-bar');
  if (purityBar) { purityBar.style.width = '0%'; setTimeout(function() { purityBar.style.width = data.purity + '%'; }, 300); }
  if (stabilityBar) { stabilityBar.style.width = '0%'; setTimeout(function() { stabilityBar.style.width = data.stability + '%'; }, 400); }
}

// ===== 渲染学习/社交进度条 =====
function renderSubBars(profile) {
  var data = DATA[profile];
  if (!data) return;
  var prefix = profile === 'linxiwu' ? 'lin' : 'luo';
  var map = {
    theory: 'theory', practice: 'practice', initiative: 'initiative',
    team: 'team', obey: 'obey', comm: 'comm'
  };
  Object.keys(map).forEach(function(key) {
    var bar = document.getElementById(prefix + '-' + key + '-bar');
    var valEl = document.getElementById(prefix + '-' + key + '-val');
    if (bar) {
      bar.style.width = '0%';
      setTimeout(function() {
        bar.style.width = data[key] + '%';
      }, 300 + Math.random() * 200);
    }
    if (valEl) {
      valEl.textContent = data[key] + '%';
    }
  });
}

// ===== 主渲染函数 =====
function renderAll() {
  var profile = getCurrentProfile();
  var data = DATA[profile];
  if (!data) return;

  // 更新雷达图
  var svgId = profile === 'linxiwu' ? 'radar-svg-lin' : 'radar-svg-luo';
  var containerId = profile === 'linxiwu' ? 'radar-lin' : 'radar-luo';
  var accent = profile === 'linxiwu' ? 'var(--profile-lin)' : 'var(--profile-luo)';
  drawRadar(svgId, data.radar, data.radarLabels, accent);

  // 更新右侧进度条
  var attrContainerId = profile === 'linxiwu' ? 'attr-lin' : 'attr-luo';
  renderAttrList(attrContainerId, data.radar, data.radarLabels);

  // 更新基础状态
  renderStatusBars(profile);

  // 更新学习/社交进度条
  renderSubBars(profile);
}

// ===== 监听角色切换 =====
window.addEventListener('profilechange', function() {
  setTimeout(renderAll, 150);
});

// ===== 初始化 =====
setTimeout(renderAll, 300);

// ===== 主题切换后重新渲染 =====
var origToggle = GZD.ThemeManager.toggle;
GZD.ThemeManager.toggle = function() {
  origToggle.call(GZD.ThemeManager);
  setTimeout(renderAll, 300);
};

console.log('🌙 归终殿 · 魂力与状态 v1.0 已加载');
})();