(function(){'use strict';

if(!window.GZD){window.GZD={};
GZD.Storage={get(k,d){try{const r=localStorage.getItem(k);return r?JSON.parse(r):d;}catch(e){return d;}},set(k,v){localStorage.setItem(k,JSON.stringify(v));},getTheme(){const r=this.get('theme',null);return r&&r.value?r.value:'dark';},getProfile(){try{return localStorage.getItem('activeProfile')||'linxiwu';}catch(e){return'linxiwu';}},getQuests(){return this.get('gzd_quests',{});},updateQuestStatus(qid,status){const q=this.getQuests();q[qid]={status,updatedAt:Date.now()};this.set('gzd_quests',q);},getNewsRead(){return this.get('gzd_newsRead',[]);},markNewsRead(nid){const r=this.getNewsRead();if(!r.includes(nid)){r.push(nid);this.set('gzd_newsRead',r);}}};
GZD.ThemeManager={init(){const t=GZD.Storage.getTheme();const h=document.documentElement;if(t==='light')h.setAttribute('data-theme','light');else h.removeAttribute('data-theme');},toggle(){const isLight=document.documentElement.getAttribute('data-theme')==='light';const h=document.documentElement;if(isLight)h.removeAttribute('data-theme');else h.setAttribute('data-theme','light');GZD.Storage.set('theme',{value:isLight?'dark':'light'});}};
GZD.ProfileManager={init(){const id=GZD.Storage.getProfile();document.body.setAttribute('data-profile',id);document.querySelectorAll('.content-block').forEach(b=>b.classList.toggle('active',b.id==='content-'+id));},switch(id){document.body.setAttribute('data-profile',id);document.querySelectorAll('.content-block').forEach(b=>{b.classList.remove('active');if(b.id==='content-'+id)b.classList.add('active');});localStorage.setItem('activeProfile',id);window.dispatchEvent(new CustomEvent('profilechange',{detail:{profile:id}}));}};
GZD.Sidebar={open:false,toggle(){this.open=!this.open;const p=document.getElementById('sidebarPanel'),o=document.getElementById('sidebarOverlay');if(p)p.classList.toggle('open',this.open);if(o)o.classList.toggle('show',this.open);document.body.classList.toggle('no-scroll',this.open);},close(){if(this.open){this.open=false;const p=document.getElementById('sidebarPanel'),o=document.getElementById('sidebarOverlay');if(p)p.classList.remove('open');if(o)o.classList.remove('show');document.body.classList.remove('no-scroll');}}};
GZD.init=function(){this.ThemeManager.init();this.ProfileManager.init();};GZD.init();
}

// ===== 侧边栏 =====
document.addEventListener('click',function(e){
  const t=e.target;
  if(t.closest('.sidebar-tab')){e.preventDefault();GZD.Sidebar.toggle();return;}
  if(t.id==='sidebarOverlay'){GZD.Sidebar.close();return;}
  if(t.closest('.sidebar-panel .close-btn')){GZD.Sidebar.close();return;}
  const sb=t.closest('#profileSwitchBtn');
  if(sb){e.preventDefault();e.stopPropagation();const c=document.body.getAttribute('data-profile')||'linxiwu';GZD.ProfileManager.switch(c==='linxiwu'?'luojin':'linxiwu');return;}
});

// ===== 地府时辰 =====
const earthlyHours=[{name:'子时',start:23,end:1,desc:'万籁俱寂，忘川水静。引渡人交班时分，归终殿广场上浮生树泛着幽微的银白光芒。',yinqi:'96%',weather:'浓雾',tree:'花叶低垂'},{name:'丑时',start:1,end:3,desc:'地府灯火阑珊，阴差换岗。偶有迷途亡魂在奈何桥畔徘徊，需引渡人前往安抚。',yinqi:'94%',weather:'阴风',tree:'静默'},{name:'寅时',start:3,end:5,desc:'夜将尽而未尽，阴气仍重。三生石前常有执念深重的魂魄驻足，不宜惊扰。',yinqi:'88%',weather:'薄霜',tree:'微光'},{name:'卯时',start:5,end:7,desc:'地府假天明，阴气渐收。弟子陆续起身前往砺峰阁晨训，脚步声在石板路上回响。',yinqi:'72%',weather:'薄雾',tree:'苏醒'},{name:'辰时',start:7,end:9,desc:'假日高升，各院阁开课。符修院传来符纸燃烧的气息，讲武堂响起兵器碰撞声。',yinqi:'60%',weather:'晴朗',tree:'摇曳'},{name:'巳时',start:9,end:11,desc:'阳气混入地府，部分敏感弟子略感不适。此时不宜进行高强度阴气修炼。',yinqi:'55%',weather:'晴朗',tree:'盛放'},{name:'午时',start:11,end:13,desc:'地府日中，阴气最弱。弟子多在此刻用膳、休整，或于栖梧馆疗伤。',yinqi:'45%',weather:'燥热',tree:'收敛'},{name:'未时',start:13,end:15,desc:'午后慵懒，藏经阁内弟子翻阅古籍的沙沙声与远处演武广场的呼喝交织。',yinqi:'50%',weather:'多云',tree:'低语'},{name:'申时',start:15,end:17,desc:'外勤引渡人陆续回殿，带回人间消息。殿前广场渐渐热闹，浮生树影拉长。',yinqi:'58%',weather:'微风',tree:'舒展'},{name:'酉时',start:17,end:19,desc:'假日落，地府入暮。各院阁陆续闭课，弟子或结伴前往忘川观落日余晖。',yinqi:'70%',weather:'霞光',tree:'泛光'},{name:'戌时',start:19,end:21,desc:'夜课开始，音律坊传出琴笛之声。部分弟子于浮生树下进行夜间冥想。',yinqi:'82%',weather:'薄雾',tree:'轻颤'},{name:'亥时',start:21,end:23,desc:'地府入夜，灯火次第亮起。归终殿弟子陆续归寝，只剩巡逻队在殿外游走。',yinqi:'90%',weather:'浓雾',tree:'沉睡'}];
function getCurrentHour(){const h=new Date().getHours();for(let i=0;i<earthlyHours.length;i++){const e=earthlyHours[i];if(e.start>e.end){if(h>=e.start||h<e.end)return e;}else{if(h>=e.start&&h<e.end)return e;}}return earthlyHours[0];}
function updateChrono(){const e=getCurrentHour(),idx=earthlyHours.indexOf(e);const elHour=document.getElementById('hourName'),elSub=document.getElementById('hourSub'),elDesc=document.getElementById('hourDesc'),elYin=document.getElementById('yinqi'),elWea=document.getElementById('weather'),elTree=document.getElementById('treeStatus');if(elHour)elHour.textContent=e.name;if(elSub)elSub.textContent=e.name+' · '+e.yinqi+'阴气 · 地府第'+(idx+1)+'更';if(elDesc)elDesc.textContent=e.desc;if(elYin)elYin.textContent=e.yinqi;if(elWea)elWea.textContent=e.weather;if(elTree)elTree.textContent=e.tree;}
updateChrono();setInterval(updateChrono,60000);

// ===== 打字机效果 =====
function typewriter(el,text,speed,callback){if(!el)return;el.textContent='';let i=0;const c=document.createElement('span');c.className='cursor-blink';el.appendChild(c);function type(){if(i<text.length){const ch=text.charAt(i),node=document.createTextNode(ch);el.insertBefore(node,c);i++;setTimeout(type,(ch==='，'||ch==='。')?speed*2:speed);}else{if(c.parentNode)c.remove();if(callback)callback();}}setTimeout(type,400);}
const hourDescEl=document.getElementById('hourDesc');if(hourDescEl){const raw=hourDescEl.textContent.trim();hourDescEl.textContent='';typewriter(hourDescEl,raw,48);}

// ===== 低语轮播 =====
const whispers=['每一段走过的黄泉路，每一次艰难的引渡，都将铸就独一无二的你。','浮生花会谢，但树根记得每一朵花的重量。','引渡人不是神，只是愿意在阴阳之间多站一会儿的人。','刀会断，枪会折，符会燃尽——但归终殿还在。','你若在忘川边遇到一个不肯渡河的魂，别催他。他只是在等一句告别。','林淮等了二百年，罗修烧了五百年。时间在地府，不过是一场漫长的修行。','浮生树从不挑选落在谁肩上的花瓣。它只负责开花。','忘川河底沉着的，不是白骨，是没说完的话。','归终殿的钟声，活人听不见，亡魂却会驻足。','每一片浮生花瓣飘落时，都有一声叹息被风带走。'];
let whisperIdx=Math.floor(Math.random()*whispers.length);const whisperEl=document.getElementById('whisperText');
function rotateWhisper(){const next=(whisperIdx+1)%whispers.length;if(whisperEl){whisperEl.classList.add('fade-out');setTimeout(()=>{whisperEl.textContent='"'+whispers[next]+'"';whisperEl.classList.remove('fade-out');whisperIdx=next;},500);}}
setInterval(rotateWhisper,12000);

// ===== 任务系统 =====
const STATUS_CYCLE={'未接':'进行中','进行中':'已完成','已完成':'未接'};
function renderQuests(){const quests=GZD.Storage.getQuests();document.querySelectorAll('.quest-item').forEach(item=>{const qid=item.dataset.questId;if(!qid)return;const saved=quests[qid];if(saved&&saved.status){const s=item.querySelector('.status');if(s){s.textContent=saved.status;s.className='status '+(saved.status==='进行中'?'doing':saved.status==='已完成'?'done':'');}}});updateStoryProgress();}
function updateStoryProgress(){const quests=GZD.Storage.getQuests();let linDone=0,luoDone=0;for(let i=1;i<=5;i++){if(quests['lin-q'+i]?.status==='已完成')linDone++;if(quests['luo-q'+i]?.status==='已完成')luoDone++;}const linPct=Math.round((linDone/5)*100),luoPct=Math.round((luoDone/5)*100);const pl=document.getElementById('storyPct-lin'),bl=document.getElementById('storyBar-lin'),pu=document.getElementById('storyPct-luo'),bu=document.getElementById('storyBar-luo');if(pl)pl.textContent=Math.max(linPct,20)+'%';if(bl)bl.style.width=Math.max(linPct,20)+'%';if(pu)pu.textContent=Math.max(luoPct,10)+'%';if(bu)bu.style.width=Math.max(luoPct,10)+'%';}
const CELEBRATION_EMOJIS=['🌸','✨','🕯️','🌙','💮','✧'];
function showCelebration(x,y){const el=document.createElement('div');el.textContent=CELEBRATION_EMOJIS[Math.floor(Math.random()*CELEBRATION_EMOJIS.length)];el.style.cssText='position:fixed;pointer-events:none;z-index:200;font-size:1.8rem;left:'+(x-16)+'px;top:'+(y-16)+'px;animation:celebFloat 1.2s ease-out forwards;transform-style:flat;-webkit-transform-style:flat;';document.body.appendChild(el);setTimeout(()=>el.remove(),1300);}
if(!document.getElementById('celebStyle')){const s=document.createElement('style');s.id='celebStyle';s.textContent='@keyframes celebFloat{0%{opacity:1;transform:translateY(0) scale(0.5) rotate(0deg);}100%{opacity:0;transform:translateY(-80px) scale(1.4) rotate(40deg);}}';document.head.appendChild(s);}
document.querySelectorAll('.quest-item').forEach(item=>{item.addEventListener('click',function(){const qid=this.dataset.questId;if(!qid)return;const statusEl=this.querySelector('.status'),current=statusEl.textContent.trim(),next=STATUS_CYCLE[current]||'未接',prev=current;statusEl.textContent=next;statusEl.className='status '+(next==='进行中'?'doing':next==='已完成'?'done':'');GZD.Storage.updateQuestStatus(qid,next);updateStoryProgress();if(next==='已完成'&&prev!=='已完成'){const r=this.getBoundingClientRect();showCelebration(r.left+r.width/2,r.top+r.height/2);this.style.transition='background 0.2s';this.style.background='rgba(212,154,154,0.15)';setTimeout(()=>{this.style.background='';},400);}});});
renderQuests();

// ===== 新闻弹窗 =====
const modal=document.getElementById('newsModal'),modalTag=document.getElementById('modalTag'),modalTitle=document.getElementById('modalTitle'),modalBody=document.getElementById('modalBody'),modalTime=document.getElementById('modalTime'),modalClose=document.getElementById('modalClose');
function openNewsModal(tag,title,body,time){if(modalTag)modalTag.textContent=tag||'资讯';if(modalTitle)modalTitle.textContent=title||'无标题';if(modalBody)modalBody.textContent=body.replace(/\\n/g,'\n')||'暂无详细内容。';if(modalTime)modalTime.textContent=time||'';if(modal){modal.classList.add('active');document.body.style.overflow='hidden';}}
function closeNewsModal(){if(modal)modal.classList.remove('active');document.body.style.overflow='';}
if(modalClose)modalClose.addEventListener('click',closeNewsModal);
if(modal)modal.addEventListener('click',function(e){if(e.target===this)closeNewsModal();});
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeNewsModal();});
document.querySelectorAll('.news-card').forEach(card=>{card.addEventListener('click',function(){const tag=this.dataset.tag||'资讯',title=this.dataset.title||this.querySelector('.title')?.textContent||'标题',body=this.dataset.body||this.querySelector('.excerpt')?.textContent||'暂无详情。',time=this.dataset.time||this.querySelector('.time')?.textContent||'';openNewsModal(tag,title,body,time);const nid=this.dataset.newsId;if(nid){GZD.Storage.markNewsRead(nid);this.classList.add('is-read');}});});
(function(){const read=GZD.Storage.getNewsRead();document.querySelectorAll('.news-card').forEach(card=>{const nid=card.dataset.newsId;if(nid&&read.includes(nid))card.classList.add('is-read');});})();

// ===== 命簿主线展开弹窗 =====
const storyModal=document.getElementById('storyModal');
const storyModalClose=document.getElementById('storyModalClose');
const storyModalTag=document.getElementById('storyModalTag');
const storyModalTitle=document.getElementById('storyModalTitle');
const storyModalBody=document.getElementById('storyModalBody');
const storyModalTime=document.getElementById('storyModalTime');

const STORY_FULL = {
  linxiwu: {
    title: '第一章 · 归终殿的新叶',
    body: '你踏入归终殿的那天，浮生树正落着花。酒红色的花瓣擦过你的肩头，像某种无声的招呼。你听见身后有人低声说："那就是林淮和栾方棋的女儿？"你没回头，因为站在殿前石阶上的罗修已经开了口。他抱着刀，目光在你脸上停了一息，然后说："归终殿统修期三个月，什么都学，三个月后选专精。别指望有人偏心你。"你点了点头，心想：我本来也没打算靠谁偏心。\n\n三个月的统修期，你确实没让人失望。符法、刀法、阵法、枪法、引渡基础、魂力控制——每科成绩都排在同期前列，连讲武堂的教习都忍不住多看了你几眼。你爹林淮在演武场边远远看过你一次，面无表情地站了半刻钟就走了，后来你娘栾方棋告诉你："你爹说还行。"你知道"还行"是他说出口的最高评价。\n\n统修考核结束那天，你交了志愿表：符修院。栾方棋给你发了一份薄薄的预习资料，上面只有三个字："慢慢看。"但你翻开之后发现，上面全是重点——你娘对所有志愿符修院的弟子都是一视同仁的，资料内容都一样。只不过你这份是原版，其他的是拓印。\n\n现在你正在预习符法，为一个月后的入门试做准备。浮生树的影子落在书页上，你偶尔抬头，会看到远处讲武堂方向有刀光一闪而过。',
    time: '苍珩四百三十五年 · 霜月廿二 · 预习中'
  },
  luojin: {
    title: '第一章 · 刀与火',
    body: '你踏入归终殿的第一天就闯了个小祸——太兴奋，跑得太快，一头撞翻了符修院门口晾晒的符纸。栾方棋蹲下来帮你一起捡，笑着说："不急，慢慢来。"你不好意思地挠了挠头，心想归终殿好像没传说中那么可怕。然后罗修的声音从身后冷冷地传过来："统修期三个月，符法刀法阵法枪法都要学。你撞翻的是符纸，下回再撞翻什么，我可不管捡。"\n\n三个月的统修期，你过得相当……真实。刀法课，你次次前几；枪法课，勉强能看；阵法课，你差点把自己困在阵里出不来；符法课，你把朱砂弄得满袖子都是。魏元璟有一次路过讲武堂，看到你练刀的背影，对旁边的罗修说："这孩子怎么这样？咋咋呼呼的，跟炮仗似的。"罗修没应声，但你后来发现罗修教你的那两招，比讲武堂其他弟子多用了三分心思。\n\n统修考核你低空飞过几科，但刀法是第一名。志愿表你毫不犹豫交了讲武堂——你爹罗修的双刀，你爹（你更习惯叫"父亲"）魏元璟的双刀，你全家人都是双刀，你觉得自己不学双刀说不过去。魏元璟知道后沉默了很久，说："行吧，总比去符修院把纸烧了强。"\n\n现在你正在预习刀法，为一个月后的入门试做准备。你爹偶尔会路过讲武堂，远远看你一眼，什么也不说就走了。但你总觉得他看你那一眼，比看别人多了半个呼吸。',
    time: '苍珩四百三十五年 · 霜月廿二 · 预习中'
  }
};

function openStoryModal(target){
  const data=STORY_FULL[target];
  if(!data)return;
  if(storyModalTag)storyModalTag.textContent='命簿 · 第一章';
  if(storyModalTitle)storyModalTitle.textContent=data.title;
  if(storyModalBody)storyModalBody.textContent=data.body;
  if(storyModalTime)storyModalTime.textContent=data.time;
  if(storyModal)storyModal.classList.add('active');
  document.body.style.overflow='hidden';
}

function closeStoryModal(){
  if(storyModal)storyModal.classList.remove('active');
  document.body.style.overflow='';
}

if(storyModalClose)storyModalClose.addEventListener('click',closeStoryModal);
if(storyModal)storyModal.addEventListener('click',function(e){if(e.target===this)closeStoryModal();});

document.querySelectorAll('.story-expand').forEach(el=>{
  el.addEventListener('click',function(e){
    e.stopPropagation();
    const target=this.dataset.expandTarget;
    if(target)openStoryModal(target);
  });
});

// ===== 花瓣特效 =====
const PETAL_CHARS=['❀','✿','✽'],petalContainer=document.getElementById('petal-container');
if(petalContainer){for(let i=0;i<12;i++){const el=document.createElement('div');el.className='petal-char';el.textContent=PETAL_CHARS[Math.floor(Math.random()*PETAL_CHARS.length)];el.style.left=Math.random()*100+'%';el.style.fontSize=(14+Math.random()*12)+'px';el.style.animationDuration=(10+Math.random()*10)+'s';el.style.animationDelay=(Math.random()*12)+'s';petalContainer.appendChild(el);}}

// ===== 时间轴渐入 =====
function revealTimelineItems(){document.querySelectorAll('.timeline-item:not(.visible)').forEach(item=>{if(item.getBoundingClientRect().top<window.innerHeight*0.85)item.classList.add('visible');});}
setTimeout(revealTimelineItems,500);window.addEventListener('scroll',revealTimelineItems);

// ===== 角色切换UI更新 =====
function updateProfileUI(profile){const nameMap={'linxiwu':'林栖梧','luojin':'罗烬'};const nameEl=document.getElementById('currentProfileName');if(nameEl)nameEl.textContent=nameMap[profile]||'林栖梧';const switchBtn=document.getElementById('profileSwitchBtn');if(switchBtn)switchBtn.textContent='切换到 '+(profile==='linxiwu'?'罗烬':'林栖梧');}

(function(){const saved=GZD.Storage.getProfile();updateProfileUI(saved);setTimeout(updateStoryProgress,200);setTimeout(revealTimelineItems,300);})();
window.addEventListener('profilechange',function(e){updateProfileUI(e.detail.profile);updateStoryProgress();setTimeout(revealTimelineItems,300);});

// ===== 主题按钮 =====
function updateThemeBtn(){const b=document.getElementById('themeBtn'),isLight=document.documentElement.getAttribute('data-theme')==='light';if(b)b.innerHTML='<span id="themeIcon">'+(isLight?'🌙':'☀️')+'</span> <span id="themeLabel">'+(isLight?'夜间':'日间')+'</span>';}
document.getElementById('themeBtn').addEventListener('click',function(){GZD.ThemeManager.toggle();});
updateThemeBtn();

console.log('🌙 归终殿 · 命簿纪事 v2.0 已加载');
})();