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

// 主题按钮
document.getElementById('themeBtn').addEventListener('click',function(){GZD.ThemeManager.toggle();updateThemeBtn();});
function updateThemeBtn(){const b=document.getElementById('themeBtn'),isLight=document.documentElement.getAttribute('data-theme')==='light';if(b)b.innerHTML='<span id="themeIcon">'+(isLight?'🌙':'☀️')+'</span> <span id="themeLabel">'+(isLight?'夜间':'日间')+'</span>';}
updateThemeBtn();

// ===== 2. 角色切换UI =====
function updateProfileUI(profile){const nameMap={'linxiwu':'林栖梧','luojin':'罗烬'};const nameEl=document.getElementById('currentProfileName');if(nameEl)nameEl.textContent=nameMap[profile]||'林栖梧';const switchBtn=document.getElementById('profileSwitchBtn');if(switchBtn)switchBtn.textContent='切换到 '+(profile==='linxiwu'?'罗烬':'林栖梧');}
(function(){const saved=GZD.Storage.getProfile();updateProfileUI(saved);})();
window.addEventListener('profilechange',function(e){updateProfileUI(e.detail.profile);});

// ===== 3. 雷达图绘制 =====
function drawRadar(svgId,stats,labels,accentColor){
  const svg=document.getElementById(svgId);if(!svg)return;
  while(svg.firstChild)svg.removeChild(svg.firstChild);
  const cx=150,cy=150,maxR=110,angles=[0,60,120,180,240,300].map(d=>d*Math.PI/180);
  const accent=accentColor||'var(--profile-accent)';
  const soft='var(--profile-accent)'; // 用CSS变量，浏览器会自动处理透明度
  // 网格层
  [0.3,0.5,0.7,1.0].forEach(function(ratio){const r=maxR*ratio;const pts=angles.map(a=>(cx+r*Math.sin(a))+','+(cy-r*Math.cos(a))).join(' ');const poly=document.createElementNS('http://www.w3.org/2000/svg','polygon');poly.setAttribute('points',pts);poly.setAttribute('fill','none');poly.setAttribute('stroke','var(--border-light)');poly.setAttribute('stroke-width',ratio===1.0?'0.8':'0.5');if(ratio!==1.0)poly.setAttribute('stroke-dasharray','4,4');svg.appendChild(poly);});
  // 轴线
  angles.forEach(function(a){const x=cx+maxR*Math.sin(a),y=cy-maxR*Math.cos(a);const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1',cx);line.setAttribute('y1',cy);line.setAttribute('x2',x);line.setAttribute('y2',y);line.setAttribute('stroke','var(--border-light)');line.setAttribute('stroke-width','0.4');line.setAttribute('stroke-dasharray','2,3');svg.appendChild(line);});
  // 数据多边形
  const vertices=stats.map(function(val,i){const r=(val/100)*maxR;const a=angles[i];return{x:cx+r*Math.sin(a),y:cy-r*Math.cos(a)};});
  const centerPts=angles.map(function(){return cx+','+cy;}).join(' ');
  const targetPts=vertices.map(function(v){return v.x+','+v.y;}).join(' ');
  const poly=document.createElementNS('http://www.w3.org/2000/svg','polygon');
  poly.setAttribute('points',centerPts);
  poly.setAttribute('fill',accent);
  poly.setAttribute('fill-opacity','0.12');
  poly.setAttribute('stroke',accent);
  poly.setAttribute('stroke-width','2');
  poly.setAttribute('stroke-linejoin','round');
  const anim=document.createElementNS('http://www.w3.org/2000/svg','animate');
  anim.setAttribute('attributeName','points');anim.setAttribute('from',centerPts);anim.setAttribute('to',targetPts);anim.setAttribute('dur','1s');anim.setAttribute('fill','freeze');anim.setAttribute('calcMode','spline');anim.setAttribute('keySplines','0.25 0.1 0.25 1');
  poly.appendChild(anim);svg.appendChild(poly);
  // 顶点
  vertices.forEach(function(v){const c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('cx',v.x);c.setAttribute('cy',v.y);c.setAttribute('r','3');c.setAttribute('fill',accent);c.setAttribute('opacity','0');const fade=document.createElementNS('http://www.w3.org/2000/svg','animate');fade.setAttribute('attributeName','opacity');fade.setAttribute('from','0');fade.setAttribute('to','1');fade.setAttribute('dur','0.3s');fade.setAttribute('begin','0.8s');fade.setAttribute('fill','freeze');c.appendChild(fade);svg.appendChild(c);});
  // 标签
  const labelPositions=[{x:150,y:18,text:'魂力',anchor:'middle'},{x:268,y:110,text:'体术',anchor:'start'},{x:252,y:210,text:'学识',anchor:'start'},{x:150,y:290,text:'意志',anchor:'middle'},{x:50,y:214,text:'敏捷',anchor:'end'},{x:34,y:106,text:'符法/刀法',anchor:'end'}];
  labelPositions.forEach(function(lp){const t=document.createElementNS('http://www.w3.org/2000/svg','text');t.setAttribute('x',lp.x);t.setAttribute('y',lp.y);t.setAttribute('fill','var(--text-muted)');t.setAttribute('font-size','8');t.setAttribute('font-weight','400');t.setAttribute('text-anchor',lp.anchor);t.setAttribute('dominant-baseline','central');t.textContent=lp.text;svg.appendChild(t);});
}

// 林栖梧六维 [魂力,体术,学识,意志,敏捷,符法]
drawRadar('radar-svg-lin',[55,35,75,70,50,80],['魂力','体术','学识','意志','敏捷','符法']);
// 罗烬六维 [魂力,体术,学识,意志,敏捷,刀法]
drawRadar('radar-svg-luo',[60,85,40,55,80,75],['魂力','体术','学识','意志','敏捷','刀法']);

// ===== 4. 六维进度条 =====
function renderAttrList(containerId,attrs){
  const container=document.getElementById(containerId);if(!container)return;
  const levelText=function(v){if(v>=90)return'约九成';if(v>=80)return'约八成';if(v>=70)return'约七成';if(v>=60)return'约六成';if(v>=50)return'约五成';if(v>=40)return'约四成';if(v>=30)return'约三成';if(v>=20)return'约二成';return'约一成';};
  attrs.forEach(function(item){const div=document.createElement('div');div.className='attr-item';div.innerHTML='<span class="label">'+item.label+'</span><div class="bar-wrap"><div class="bar-fill" style="width:0%"></div></div><span class="val">'+levelText(item.value)+'</span>';container.appendChild(div);setTimeout(function(){div.querySelector('.bar-fill').style.width=item.value+'%';},100);});
}
renderAttrList('attr-list-lin',[
  {label:'魂力',value:55},{label:'体术',value:35},{label:'学识',value:75},
  {label:'意志',value:70},{label:'敏捷',value:50},{label:'符法',value:80}
]);
renderAttrList('attr-list-luo',[
  {label:'魂力',value:60},{label:'体术',value:85},{label:'学识',value:40},
  {label:'意志',value:55},{label:'敏捷',value:80},{label:'刀法',value:75}
]);

// ===== 5. 时间轴渐入 =====
function revealTimelineItems(){document.querySelectorAll('.timeline-item:not(.visible)').forEach(function(item){if(item.getBoundingClientRect().top<window.innerHeight*0.85)item.classList.add('visible');});}
setTimeout(revealTimelineItems,500);window.addEventListener('scroll',revealTimelineItems);

// ===== 6. Quest联动读取 =====
function renderQuestLinks(){const quests=GZD.Storage.getQuests();const linIds=['lin-q1','lin-q2','lin-q3','lin-q4','lin-q5'];const luoIds=['luo-q1','luo-q2','luo-q3','luo-q4','luo-q5'];function countDoing(ids){let c=0;ids.forEach(function(id){if(quests[id]&&quests[id].status==='进行中')c++;});return c;}const linDoing=countDoing(linIds),luoDoing=countDoing(luoIds);const linEl=document.getElementById('lin-quest-link'),luoEl=document.getElementById('luo-quest-link');if(linEl){if(linDoing>0){linEl.innerHTML='<a href="./命薄.html">前往命簿纪事查看 '+linDoing+' 项进行中委托 →</a>';}else{linEl.innerHTML='<span style="color:var(--text-muted)">暂无进行中委托</span> · <a href="./命薄.html">前往命簿纪事</a>';}}if(luoEl){if(luoDoing>0){luoEl.innerHTML='<a href="./命薄.html">前往命簿纪事查看 '+luoDoing+' 项进行中委托 →</a>';}else{luoEl.innerHTML='<span style="color:var(--text-muted)">暂无进行中委托</span> · <a href="./命薄.html">前往命簿纪事</a>';}}}
renderQuestLinks();
window.addEventListener('profilechange',function(){setTimeout(renderQuestLinks,100);});

console.log('🌙 归终殿 · 引渡人档案 v1.0 已加载');})();