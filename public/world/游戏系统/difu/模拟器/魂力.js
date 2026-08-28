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

// ===== 3. 雷达图绘制 =====
function drawRadar(svgId,stats){
  const svg=document.getElementById(svgId);if(!svg)return;
  while(svg.firstChild)svg.removeChild(svg.firstChild);
  const cx=150,cy=150,maxR=110,angles=[0,60,120,180,240,300].map(d=>d*Math.PI/180);
  const accent='var(--profile-accent)';
  [0.3,0.5,0.7,1.0].forEach(function(ratio){const r=maxR*ratio;const pts=angles.map(a=>(cx+r*Math.sin(a))+','+(cy-r*Math.cos(a))).join(' ');const poly=document.createElementNS('http://www.w3.org/2000/svg','polygon');poly.setAttribute('points',pts);poly.setAttribute('fill','none');poly.setAttribute('stroke','var(--border-light)');poly.setAttribute('stroke-width',ratio===1.0?'0.8':'0.5');if(ratio!==1.0)poly.setAttribute('stroke-dasharray','4,4');svg.appendChild(poly);});
  angles.forEach(function(a){const x=cx+maxR*Math.sin(a),y=cy-maxR*Math.cos(a);const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1',cx);line.setAttribute('y1',cy);line.setAttribute('x2',x);line.setAttribute('y2',y);line.setAttribute('stroke','var(--border-light)');line.setAttribute('stroke-width','0.4');line.setAttribute('stroke-dasharray','2,3');svg.appendChild(line);});
  const vertices=stats.map(function(val,i){const r=(val/100)*maxR;const a=angles[i];return{x:cx+r*Math.sin(a),y:cy-r*Math.cos(a)};});
  const centerPts=angles.map(function(){return cx+','+cy;}).join(' ');
  const targetPts=vertices.map(function(v){return v.x+','+v.y;}).join(' ');
  const poly=document.createElementNS('http://www.w3.org/2000/svg','polygon');
  poly.setAttribute('points',centerPts);poly.setAttribute('fill',accent);poly.setAttribute('fill-opacity','0.12');poly.setAttribute('stroke',accent);poly.setAttribute('stroke-width','2');poly.setAttribute('stroke-linejoin','round');
  const anim=document.createElementNS('http://www.w3.org/2000/svg','animate');
  anim.setAttribute('attributeName','points');anim.setAttribute('from',centerPts);anim.setAttribute('to',targetPts);anim.setAttribute('dur','1.2s');anim.setAttribute('fill','freeze');anim.setAttribute('calcMode','spline');anim.setAttribute('keySplines','0.25 0.1 0.25 1');
  poly.appendChild(anim);svg.appendChild(poly);
  vertices.forEach(function(v){const c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('cx',v.x);c.setAttribute('cy',v.y);c.setAttribute('r','3');c.setAttribute('fill',accent);c.setAttribute('opacity','0');const fade=document.createElementNS('http://www.w3.org/2000/svg','animate');fade.setAttribute('attributeName','opacity');fade.setAttribute('from','0');fade.setAttribute('to','1');fade.setAttribute('dur','0.3s');fade.setAttribute('begin','0.8s');fade.setAttribute('fill','freeze');c.appendChild(fade);svg.appendChild(c);});
  const labels=['魂力','体术','法术','学识','意志','敏捷'];
  const labelPositions=[{x:150,y:18,anchor:'middle'},{x:268,y:110,anchor:'start'},{x:252,y:210,anchor:'start'},{x:150,y:290,anchor:'middle'},{x:50,y:214,anchor:'end'},{x:34,y:106,anchor:'end'}];
  labelPositions.forEach(function(lp,i){const t=document.createElementNS('http://www.w3.org/2000/svg','text');t.setAttribute('x',lp.x);t.setAttribute('y',lp.y);t.setAttribute('fill','var(--text-muted)');t.setAttribute('font-size','8');t.setAttribute('text-anchor',lp.anchor);t.setAttribute('dominant-baseline','central');t.textContent=labels[i];svg.appendChild(t);});
}
drawRadar('radar-svg-lin',[55,35,80,75,70,50]);
drawRadar('radar-svg-luo',[60,85,75,40,55,80]);

// ===== 4. 状态条波动 =====
function initStatusBars(){
  document.querySelectorAll('.status-item').forEach(function(item){
    const base=parseInt(item.dataset.base,10);
    const fill=item.querySelector('.st-bar-fill');
    const valEl=item.querySelector('.st-value');
    const badge=item.querySelector('.st-badge');
    const type=item.dataset.type;
    function update(){
      const diff=Math.floor(Math.random()*5)-2;
      let cur=base+diff;cur=Math.max(0,Math.min(100,cur));
      fill.style.width=cur+'%';valEl.textContent=cur+'%';
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
    update();setInterval(update,2500);
  });
}
initStatusBars();

// ===== 5. 综合能力滚动触发 =====
const abilityObserver=new IntersectionObserver(function(entries){
  entries.forEach(function(entry){
    if(entry.isIntersecting){
      const item=entry.target;
      const fill=item.querySelector('.ability-bar-fill');
      const val=item.dataset.value;
      if(fill&&val)fill.style.width=val+'%';
      item.classList.add('visible');
      abilityObserver.unobserve(item);
    }
  });
},{threshold:0.5});
document.querySelectorAll('.ability-item').forEach(function(item){abilityObserver.observe(item);});

// ===== 6. 委托统计联动 =====
function renderQuestStats(){
  const quests=GZD.Storage.getQuests();
  const linIds=['lin-q1','lin-q2','lin-q3','lin-q4','lin-q5'];
  const luoIds=['luo-q1','luo-q2','luo-q3','luo-q4','luo-q5'];
  function calc(ids){
    let done=0,doing=0,total=ids.length;
    ids.forEach(function(id){const s=quests[id]?.status;if(s==='已完成')done++;else if(s==='进行中')doing++;});
    return{done,doing,total,pending:total-done-doing,rate:Math.round(done/total*100)};
  }
  const lin=calc(linIds),luo=calc(luoIds);
  function update(prefix,data){
    const dEl=document.getElementById(prefix+'-q-done'),doEl=document.getElementById(prefix+'-q-doing'),pEl=document.getElementById(prefix+'-q-pending'),rEl=document.getElementById(prefix+'-q-rate'),bEl=document.getElementById(prefix+'-q-bar'),tEl=document.getElementById(prefix+'-task-rate');
    if(dEl)dEl.textContent=data.done;if(doEl)doEl.textContent=data.doing;if(pEl)pEl.textContent=data.pending;if(rEl)rEl.textContent=data.rate+'%';
    if(bEl)setTimeout(function(){bEl.style.width=data.rate+'%';},300);
    if(tEl){const txt=tEl.querySelector('.ab-text');if(txt)txt.textContent=data.rate>=80?'约八成':data.rate>=60?'约六成':data.rate>=40?'约四成':'约二成';const note=tEl.querySelector('.ability-note');if(note)note.textContent=data.done===0?'暂无完成记录，前往命簿纪事领取委托。':data.rate>=80?'委托处理及时，未出现逾期记录。':'委托处理速度尚可，偶有逾期。';}
  }
  update('lin',lin);update('luo',luo);
}
renderQuestStats();
window.addEventListener('profilechange',function(){setTimeout(renderQuestStats,100);});

console.log('🌙 归终殿 · 魂力与状态 v1.0 已加载');})();