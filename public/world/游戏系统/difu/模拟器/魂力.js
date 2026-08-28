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
if(petalContainer){for(let i=0;i<20;i++){const el=document.createElement('div');el.className='petal-char';el.textContent=PETAL_CHARS[Math.floor(Math.random()*PETAL_CHARS.length)];el.style.left=Math.random()*100+'%';el.style.fontSize=(14+Math.random()*12)+'px';el.style.animationDuration=(10+Math.random()*10)+'s';el.style.animationDelay=(Math.random()*12)+'s';petalContainer.appendChild(el);}}

// ===== 4. 战力评级工具 =====
function computeRank(stats, periodLabel, maxValue){
  var sum=0;
  for(var i=0;i<stats.length;i++){sum+=stats[i];}
  var avg=sum/stats.length;
  var avgRounded=Math.round(avg*10)/10;
  var grade='';
  var rankText='';
  if(avg>=86){grade='甲等上品';}
  else if(avg>=71){grade='甲等中品';}
  else if(avg>=56){grade='甲等下品';}
  else if(avg>=41){grade='乙等上品';}
  else if(avg>=26){grade='乙等中品';}
  else if(avg>=11){grade='乙等下品';}
  else if(avg>=6){grade='丙等上品';}
  else if(avg>=3){grade='丙等中品';}
  else{grade='丙等下品';}
  return {avg:avgRounded, grade:grade, period:periodLabel, maxValue:maxValue||100};
}

// ===== 5. 雷达图绘制 =====
function drawRadar(svgId, stats, maxValue, periodLabel){
  var svg=document.getElementById(svgId);
  if(!svg)return;
  while(svg.firstChild)svg.removeChild(svg.firstChild);
  var cx=150,cy=150,maxR=130;
  var angles=[0,60,120,180,240,300].map(function(d){return d*Math.PI/180;});
  var labels=['魂力','体术','法术','防御','意志','敏捷'];
  var accent='var(--profile-accent)';
  // 网格层 - 深灰色
  [0.3,0.5,0.7,1.0].forEach(function(ratio){var r=maxR*ratio;var pts=angles.map(function(a){return (cx+r*Math.sin(a))+','+(cy-r*Math.cos(a));}).join(' ');var poly=document.createElementNS('http://www.w3.org/2000/svg','polygon');poly.setAttribute('points',pts);poly.setAttribute('fill','none');poly.setAttribute('stroke','#666666');poly.setAttribute('stroke-width',ratio===1.0?'1.2':'0.8');if(ratio!==1.0)poly.setAttribute('stroke-dasharray','4,4');svg.appendChild(poly);});
  // 轴线 - 深灰色
  angles.forEach(function(a){var x=cx+maxR*Math.sin(a),y=cy-maxR*Math.cos(a);var line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1',cx);line.setAttribute('y1',cy);line.setAttribute('x2',x);line.setAttribute('y2',y);line.setAttribute('stroke','#666666');line.setAttribute('stroke-width','0.6');line.setAttribute('stroke-dasharray','3,4');svg.appendChild(line);});
  // 数据多边形
  var vertices=stats.map(function(val,i){var r=(val/100)*maxR;var a=angles[i];return{x:cx+r*Math.sin(a),y:cy-r*Math.cos(a),val:val};});
  var centerPts=angles.map(function(){return cx+','+cy;}).join(' ');
  var targetPts=vertices.map(function(v){return v.x+','+v.y;}).join(' ');
  var poly=document.createElementNS('http://www.w3.org/2000/svg','polygon');
  poly.setAttribute('points',centerPts);
  poly.setAttribute('fill',accent);
  poly.setAttribute('fill-opacity','0.22');
  poly.setAttribute('stroke',accent);
  poly.setAttribute('stroke-width','2.5');
  poly.setAttribute('stroke-linejoin','round');
  var anim=document.createElementNS('http://www.w3.org/2000/svg','animate');
  anim.setAttribute('attributeName','points');
  anim.setAttribute('from',centerPts);
  anim.setAttribute('to',targetPts);
  anim.setAttribute('dur','1.2s');
  anim.setAttribute('fill','freeze');
  anim.setAttribute('calcMode','spline');
  anim.setAttribute('keySplines','0.25 0.1 0.25 1');
  poly.appendChild(anim);
  svg.appendChild(poly);
  // 顶点 + 数值
  vertices.forEach(function(v,i){var a=angles[i];
    var c=document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('cx',v.x);
    c.setAttribute('cy',v.y);
    c.setAttribute('r','4');
    c.setAttribute('fill',accent);
    c.setAttribute('opacity','0');
    var cfade=document.createElementNS('http://www.w3.org/2000/svg','animate');
    cfade.setAttribute('attributeName','opacity');
    cfade.setAttribute('from','0');
    cfade.setAttribute('to','1');
    cfade.setAttribute('dur','0.3s');
    cfade.setAttribute('begin','0.8s');
    cfade.setAttribute('fill','freeze');
    c.appendChild(cfade);
    svg.appendChild(c);
    var vOff=18;
    var vx=vOff*Math.sin(a);
    var vy=-vOff*Math.cos(a);
    var vt=document.createElementNS('http://www.w3.org/2000/svg','text');
    vt.setAttribute('x',v.x+vx);
    vt.setAttribute('y',v.y+vy);
    vt.setAttribute('fill',accent);
    vt.setAttribute('font-size','12');
    vt.setAttribute('font-weight','700');
    vt.setAttribute('text-anchor','middle');
    vt.setAttribute('dominant-baseline','central');
    vt.textContent=v.val;
    vt.setAttribute('opacity','0');
    var vfade=document.createElementNS('http://www.w3.org/2000/svg','animate');
    vfade.setAttribute('attributeName','opacity');
    vfade.setAttribute('from','0');
    vfade.setAttribute('to','1');
    vfade.setAttribute('dur','0.3s');
    vfade.setAttribute('begin','1s');
    vfade.setAttribute('fill','freeze');
    vt.appendChild(vfade);
    svg.appendChild(vt);
  });
  // 标签
  var labelOff=maxR+22;
  labels.forEach(function(label,i){var a=angles[i];var x=cx+labelOff*Math.sin(a);var y=cy-labelOff*Math.cos(a);var anchor='middle';if(x>cx+15)anchor='start';else if(x<cx-15)anchor='end';var t=document.createElementNS('http://www.w3.org/2000/svg','text');t.setAttribute('x',x);t.setAttribute('y',y);t.setAttribute('fill','var(--text-muted)');t.setAttribute('font-size','12');t.setAttribute('font-weight','500');t.setAttribute('text-anchor',anchor);t.setAttribute('dominant-baseline','central');t.textContent=label;svg.appendChild(t);});
  // 更新标注
  var labelId=svgId.replace('radar-svg-','radar-label-');
  var labelEl=document.getElementById(labelId);
  if(labelEl){
    var periodText=periodLabel||'统修期';
    var maxText=maxValue||100;
    labelEl.textContent=periodText+' · 上限'+maxText;
  }
}

// ===== 6. 状态条浮动 =====
function initStatusBars(){
  document.querySelectorAll('.status-item').forEach(function(item){
    var base=parseInt(item.dataset.base,10);
    var fill=item.querySelector('.st-bar-fill');
    var valEl=item.querySelector('.st-value');
    var badge=item.querySelector('.st-badge');
    var type=item.dataset.type;
    function update(){
      var diff=Math.floor(Math.random()*11)-5;
      var cur=base+diff;
      cur=Math.max(0,Math.min(100,cur));
      fill.style.width=cur+'%';
      valEl.textContent=cur+'%';
      if(type==='injury'){
        if(cur>=70){badge.textContent='危急';badge.style.color='#B86B6B';}
        else if(cur>=40){badge.textContent='需观察';badge.style.color='#B08D6A';}
        else{badge.textContent='轻微';badge.style.color='var(--text-muted)';}
      }else{
        if(cur>=80){badge.textContent='充盈';badge.style.color='#8FB8A8';}
        else if(cur>=50){badge.textContent=type==='normal'&&cur>=60?'平稳':'尚可';badge.style.color='var(--text-muted)';}
        else{badge.textContent='亏空';badge.style.color='#B08D6A';}
      }
    }
    update();
    setInterval(update,2500);
  });
}
initStatusBars();

// ===== 7. 综合能力滚动触发 =====
var abilityObserver=new IntersectionObserver(function(entries){
  entries.forEach(function(entry){
    if(entry.isIntersecting){
      var item=entry.target;
      var fill=item.querySelector('.ability-bar-fill');
      var val=item.dataset.value;
      if(fill&&val){
        var isTaskRate=item.id==='lin-task-rate'||item.id==='luo-task-rate';
        if(!isTaskRate)fill.style.width=val+'%';
      }
      item.classList.add('visible');
      abilityObserver.unobserve(item);
    }
  });
},{threshold:0.5});
document.querySelectorAll('.ability-item').forEach(function(item){abilityObserver.observe(item);});

// ===== 8. 委托统计联动 =====
function renderQuestStats(){
  var quests=GZD.Storage.getQuests();
  var linIds=['lin-q1','lin-q2','lin-q3','lin-q4','lin-q5'];
  var luoIds=['luo-q1','luo-q2','luo-q3','luo-q4','luo-q5'];
  function calc(ids){
    var done=0,doing=0,total=ids.length;
    ids.forEach(function(id){var s=quests[id]?.status;if(s==='已完成')done++;else if(s==='进行中')doing++;});
    return{done:done,doing:doing,total:total,pending:total-done-doing,rate:Math.round(done/total*100)};
  }
  var lin=calc(linIds),luo=calc(luoIds);
  function update(prefix,data){
    var dEl=document.getElementById(prefix+'-q-done');
    var doEl=document.getElementById(prefix+'-q-doing');
    var pEl=document.getElementById(prefix+'-q-pending');
    var rEl=document.getElementById(prefix+'-q-rate');
    var bEl=document.getElementById(prefix+'-q-bar');
    var tEl=document.getElementById(prefix+'-task-rate');
    if(dEl)dEl.textContent=data.done;
    if(doEl)doEl.textContent=data.doing;
    if(pEl)pEl.textContent=data.pending;
    if(rEl)rEl.textContent=data.rate+'%';
    if(bEl)setTimeout(function(){bEl.style.width=data.rate+'%';},300);
    if(tEl){
      var bar=tEl.querySelector('.ability-bar-fill');
      var text=tEl.querySelector('.ab-text');
      var note=tEl.querySelector('.ability-note');
      if(bar){
        bar.style.width=data.rate+'%';
        bar.style.transition='width 1s ease';
      }
      if(text){
        if(data.rate>=80)text.textContent='约八成';
        else if(data.rate>=60)text.textContent='约六成';
        else if(data.rate>=40)text.textContent='约四成';
        else if(data.rate>=20)text.textContent='约二成';
        else text.textContent='约一成';
      }
      if(note){
        if(data.done===0)note.textContent='暂无完成记录，前往命簿纪事领取委托。';
        else if(data.rate>=80)note.textContent='委托处理及时，未出现逾期记录。';
        else if(data.rate>=60)note.textContent='委托处理速度尚可，偶有逾期。';
        else note.textContent='委托完成率偏低，建议合理安排时间。';
      }
    }
  }
  update('lin',lin);
  update('luo',luo);
}
renderQuestStats();
window.addEventListener('profilechange',function(){setTimeout(renderQuestStats,100);});

// ===== 9. 战力评级更新到印章 =====
function updateRankSeals(){
  // 林栖梧
  var linStats=[55,35,80,45,70,80];
  var linRank=computeRank(linStats,'统修期',100);
  var linSeal=document.querySelector('#content-linxiwu .status-seal');
  if(linSeal){
    var periodEl=linSeal.querySelector('.seal-period');
    var gradeEl=linSeal.querySelector('.seal-grade');
    var valueEl=linSeal.querySelector('.seal-value');
    if(periodEl)periodEl.textContent=linRank.period;
    if(gradeEl)gradeEl.textContent=linRank.grade;
    if(valueEl)valueEl.textContent='战力 '+linRank.avg;
  }
  // 罗烬
  var luoStats=[60,85,75,60,55,70];
  var luoRank=computeRank(luoStats,'统修期',100);
  var luoSeal=document.querySelector('#content-luojin .status-seal');
  if(luoSeal){
    var periodEl2=luoSeal.querySelector('.seal-period');
    var gradeEl2=luoSeal.querySelector('.seal-grade');
    var valueEl2=luoSeal.querySelector('.seal-value');
    if(periodEl2)periodEl2.textContent=luoRank.period;
    if(gradeEl2)gradeEl2.textContent=luoRank.grade;
    if(valueEl2)valueEl2.textContent='战力 '+luoRank.avg;
  }
}

// ===== 10. 初始化所有 =====
function initAll(){
  // 绘制雷达图（带 maxValue 和 periodLabel）
  drawRadar('radar-svg-lin',[55,35,80,45,70,80],100,'统修期');
  drawRadar('radar-svg-luo',[60,85,75,60,55,70],100,'统修期');
  // 更新印章
  updateRankSeals();
}

setTimeout(initAll,200);

console.log('🌙 归终殿 · 魂力与状态 v2.0 已加载');
})();