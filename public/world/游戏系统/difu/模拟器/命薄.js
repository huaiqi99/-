(function(){'use strict';

// 保险：若核心.js未初始化，手动补
var profile=localStorage.getItem('activeProfile')||'linxiwu';
document.body.setAttribute('data-profile',profile);
var blocks=document.querySelectorAll('.content-block');
for(var i=0;i<blocks.length;i++)blocks[i].classList.remove('active');
var activeBlock=document.getElementById('content-'+profile);
if(activeBlock)activeBlock.classList.add('active');

// 1. 地府时辰
var earthlyHours=[{name:'子时',start:23,end:1,desc:'万籁俱寂，忘川水静。引渡人交班时分，归终殿广场上浮生树泛着幽微的银白光芒。',yinqi:'96%',weather:'浓雾',tree:'花叶低垂'},{name:'丑时',start:1,end:3,desc:'地府灯火阑珊，阴差换岗。偶有迷途亡魂在奈何桥畔徘徊，需引渡人前往安抚。',yinqi:'94%',weather:'阴风',tree:'静默'},{name:'寅时',start:3,end:5,desc:'夜将尽而未尽，阴气仍重。三生石前常有执念深重的魂魄驻足，不宜惊扰。',yinqi:'88%',weather:'薄霜',tree:'微光'},{name:'卯时',start:5,end:7,desc:'地府假天明，阴气渐收。弟子陆续起身前往砺峰阁晨训，脚步声在石板路上回响。',yinqi:'72%',weather:'薄雾',tree:'苏醒'},{name:'辰时',start:7,end:9,desc:'假日高升，各院阁开课。符修院传来符纸燃烧的气息，讲武堂响起兵器碰撞声。',yinqi:'60%',weather:'晴朗',tree:'摇曳'},{name:'巳时',start:9,end:11,desc:'阳气混入地府，部分敏感弟子略感不适。此时不宜进行高强度阴气修炼。',yinqi:'55%',weather:'晴朗',tree:'盛放'},{name:'午时',start:11,end:13,desc:'地府日中，阴气最弱。弟子多在此刻用膳、休整，或于栖梧馆疗伤。',yinqi:'45%',weather:'燥热',tree:'收敛'},{name:'未时',start:13,end:15,desc:'午后慵懒，藏经阁内弟子翻阅古籍的沙沙声与远处演武广场的呼喝交织。',yinqi:'50%',weather:'多云',tree:'低语'},{name:'申时',start:15,end:17,desc:'外勤引渡人陆续回殿，带回人间消息。殿前广场渐渐热闹，浮生树影拉长。',yinqi:'58%',weather:'微风',tree:'舒展'},{name:'酉时',start:17,end:19,desc:'假日落，地府入暮。各院阁陆续闭课，弟子或结伴前往忘川观落日余晖。',yinqi:'70%',weather:'霞光',tree:'泛光'},{name:'戌时',start:19,end:21,desc:'夜课开始，音律坊传出琴笛之声。部分弟子于浮生树下进行夜间冥想。',yinqi:'82%',weather:'薄雾',tree:'轻颤'},{name:'亥时',start:21,end:23,desc:'地府入夜，灯火次第亮起。归终殿弟子陆续归寝，只剩巡逻队在殿外游走。',yinqi:'90%',weather:'浓雾',tree:'沉睡'}];
function getCurrentHour(){var h=new Date().getHours();for(var i=0;i<earthlyHours.length;i++){var e=earthlyHours[i];if(e.start>e.end){if(h>=e.start||h<e.end)return e;}else{if(h>=e.start&&h<e.end)return e;}}return earthlyHours[0];}
function updateChrono(){var e=getCurrentHour(),idx=earthlyHours.indexOf(e);var el=document.getElementById('hourName');if(el)el.textContent=e.name;el=document.getElementById('hourSub');if(el)el.textContent=e.name+' · '+e.yinqi+'阴气 · 地府第'+(idx+1)+'更';el=document.getElementById('hourDesc');if(el)el.textContent=e.desc;el=document.getElementById('yinqi');if(el)el.textContent=e.yinqi;el=document.getElementById('weather');if(el)el.textContent=e.weather;el=document.getElementById('treeStatus');if(el)el.textContent=e.tree;}
updateChrono();setInterval(updateChrono,60000);

// 2. 打字机
function typewriter(el,text,speed,callback){if(!el)return;el.textContent='';var i=0;var c=document.createElement('span');c.className='cursor-blink';el.appendChild(c);function type(){if(i<text.length){var ch=text.charAt(i);var node=document.createTextNode(ch);el.insertBefore(node,c);i++;setTimeout(type,(ch==='，'||ch==='。')?speed*2:speed);}else{if(c.parentNode)c.remove();if(callback)callback();}}setTimeout(type,400);}
var hourDescEl=document.getElementById('hourDesc');if(hourDescEl){var raw=hourDescEl.textContent.trim();hourDescEl.textContent='';typewriter(hourDescEl,raw,48);}

// 3. 低语轮播
var whispers=['每一段走过的黄泉路，每一次艰难的引渡，都将铸就独一无二的你。','浮生花会谢，但树根记得每一朵花的重量。','引渡人不是神，只是愿意在阴阳之间多站一会儿的人。','刀会断，枪会折，符会燃尽——但归终殿还在。','你若在忘川边遇到一个不肯渡河的魂，别催他。他只是在等一句告别。','林淮等了二百年，罗修烧了五百年。时间在地府，不过是一场漫长的修行。','浮生树从不挑选落在谁肩上的花瓣。它只负责开花。','忘川河底沉着的，不是白骨，是没说完的话。','归终殿的钟声，活人听不见，亡魂却会驻足。','每一片浮生花瓣飘落时，都有一声叹息被风带走。'];
var whisperIdx=Math.floor(Math.random()*whispers.length);var whisperEl=document.getElementById('whisperText');
function rotateWhisper(){var next=(whisperIdx+1)%whispers.length;if(whisperEl){whisperEl.classList.add('fade-out');setTimeout(function(){whisperEl.textContent='"'+whispers[next]+'"';whisperEl.classList.remove('fade-out');whisperIdx=next;},500);}}
setInterval(rotateWhisper,12000);

// 4. 任务系统
var STATUS_CYCLE={'未接':'进行中','进行中':'已完成','已完成':'未接'};
function renderQuests(){var quests=window.GZD&&window.GZD.Storage?window.GZD.Storage.getQuests():{};var items=document.querySelectorAll('.quest-item');for(var i=0;i<items.length;i++){var qid=items[i].dataset.questId;if(!qid)continue;var saved=quests[qid];if(saved&&saved.status){var s=items[i].querySelector('.status');if(s){s.textContent=saved.status;s.className='status '+(saved.status==='进行中'?'doing':saved.status==='已完成'?'done':'');}}}updateStoryProgress();}
function updateStoryProgress(){var quests=window.GZD&&window.GZD.Storage?window.GZD.Storage.getQuests():{};var linDone=0,luoDone=0;for(var i=1;i<=5;i++){if(quests['lin-q'+i]&&quests['lin-q'+i].status==='已完成')linDone++;if(quests['luo-q'+i]&&quests['luo-q'+i].status==='已完成')luoDone++;}var linPct=Math.round((linDone/5)*100),luoPct=Math.round((luoDone/5)*100);var el=document.getElementById('storyPct-lin');if(el)el.textContent=linPct+'%';el=document.getElementById('storyBar-lin');if(el)el.style.width=linPct+'%';el=document.getElementById('storyPct-luo');if(el)el.textContent=luoPct+'%';el=document.getElementById('storyBar-luo');if(el)el.style.width=luoPct+'%';}
var CELEBRATION_EMOJIS=['🌸','✨','🕯️','🌙','💮','✧'];
function showCelebration(x,y){var el=document.createElement('div');el.textContent=CELEBRATION_EMOJIS[Math.floor(Math.random()*CELEBRATION_EMOJIS.length)];el.style.cssText='position:fixed;pointer-events:none;z-index:200;font-size:1.8rem;left:'+(x-16)+'px;top:'+(y-16)+'px;animation:celebFloat 1.2s ease-out forwards;transform-style:flat;-webkit-transform-style:flat;';document.body.appendChild(el);setTimeout(function(){el.remove();},1300);}
if(!document.getElementById('celebStyle')){var s=document.createElement('style');s.id='celebStyle';s.textContent='@keyframes celebFloat{0%{opacity:1;transform:translateY(0) scale(0.5) rotate(0deg);}100%{opacity:0;transform:translateY(-80px) scale(1.4) rotate(40deg);}}';document.head.appendChild(s);}
var qItems=document.querySelectorAll('.quest-item');
for(var i=0;i<qItems.length;i++){(function(item){item.addEventListener('click',function(e){var qid=this.dataset.questId;if(!qid)return;var statusEl=this.querySelector('.status');var current=statusEl.textContent.trim();var next=STATUS_CYCLE[current]||'未接';var prev=current;statusEl.textContent=next;statusEl.className='status '+(next==='进行中'?'doing':next==='已完成'?'done':'');if(window.GZD&&window.GZD.Storage)window.GZD.Storage.updateQuestStatus(qid,next);updateStoryProgress();if(next==='已完成'&&prev!=='已完成'){var r=this.getBoundingClientRect();showCelebration(r.left+r.width/2,r.top+r.height/2);this.style.transition='background 0.2s';this.style.background='rgba(212,154,154,0.15)';setTimeout(function(){item.style.background='';},400);}});})(qItems[i]);}
renderQuests();

// 5. 新闻弹窗
var modal=document.getElementById('newsModal'),modalTag=document.getElementById('modalTag'),modalTitle=document.getElementById('modalTitle'),modalBody=document.getElementById('modalBody'),modalTime=document.getElementById('modalTime'),modalClose=document.getElementById('modalClose');
function openNewsModal(tag,title,body,time){if(modalTag)modalTag.textContent=tag||'资讯';if(modalTitle)modalTitle.textContent=title||'无标题';if(modalBody)modalBody.textContent=body.replace(/\\n/g,'\n')||'暂无详细内容。';if(modalTime)modalTime.textContent=time||'';if(modal)modal.classList.add('active');document.body.style.overflow='hidden';}
function closeNewsModal(){if(modal)modal.classList.remove('active');document.body.style.overflow='';}
var nCards=document.querySelectorAll('.news-card');
for(var i=0;i<nCards.length;i++){(function(card){card.addEventListener('click',function(){var tag=this.dataset.tag||'资讯',title=this.dataset.title||'',body=this.dataset.body||'',time=this.dataset.time||'';var tEl=this.querySelector('.title'),eEl=this.querySelector('.excerpt'),tmEl=this.querySelector('.time');if(tEl)title=title||tEl.textContent;if(eEl)body=body||eEl.textContent;if(tmEl)time=time||tmEl.textContent;openNewsModal(tag,title,body,time);var nid=this.dataset.newsId;if(nid){if(window.GZD&&window.GZD.Storage)window.GZD.Storage.markNewsRead(nid);this.classList.add('is-read');}});})(nCards[i]);}
if(modalClose)modalClose.addEventListener('click',closeNewsModal);
if(modal)modal.addEventListener('click',function(e){if(e.target===this)closeNewsModal();});
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeNewsModal();});
(function(){if(!window.GZD||!window.GZD.Storage)return;var read=window.GZD.Storage.getNewsRead()||[];var cards=document.querySelectorAll('.news-card');for(var i=0;i<cards.length;i++){var nid=cards[i].dataset.newsId;if(nid&&read.indexOf(nid)!==-1)cards[i].classList.add('is-read');}})();

// 6. 花瓣特效 - 固定12个，infinite循环
var PETAL_CHARS=['❀','✿','✽'],petalContainer=document.getElementById('petal-container');
if(petalContainer){for(var i=0;i<12;i++){var el=document.createElement('div');el.className='petal-char';el.textContent=PETAL_CHARS[Math.floor(Math.random()*PETAL_CHARS.length)];el.style.left=Math.random()*100+'%';el.style.fontSize=(14+Math.random()*12)+'px';el.style.animationDuration=(10+Math.random()*10)+'s';el.style.animationDelay=(Math.random()*12)+'s';petalContainer.appendChild(el);}}

// 7. 时间轴渐入
function revealTimelineItems(){var items=document.querySelectorAll('.timeline-item:not(.visible)');for(var i=0;i<items.length;i++){if(items[i].getBoundingClientRect().top<window.innerHeight*0.85)items[i].classList.add('visible');}}
setTimeout(revealTimelineItems,500);window.addEventListener('scroll',revealTimelineItems);

// 8. 角色切换UI更新
function updateProfileUI(profile){var nameMap={'linxiwu':'林栖梧','luojin':'罗烬'};var nameEl=document.getElementById('currentProfileName');if(nameEl)nameEl.textContent=nameMap[profile]||'林栖梧';var switchBtn=document.getElementById('profileSwitchBtn');if(switchBtn)switchBtn.textContent='切换到 '+(profile==='linxiwu'?'罗烬':'林栖梧');}

// 侧边栏切换按钮 - 事件委托绑定到document，确保一定能捕获
document.addEventListener('click',function(e){var btn=e.target.closest&&e.target.closest('#profileSwitchBtn');if(!btn)return;var current=document.body.getAttribute('data-profile')||'linxiwu';var target=current==='linxiwu'?'luojin':'linxiwu';if(window.GZD&&window.GZD.ProfileManager&&window.GZD.ProfileManager.switch){window.GZD.ProfileManager.switch(target);}else{document.body.setAttribute('data-profile',target);var blocks=document.querySelectorAll('.content-block');for(var i=0;i<blocks.length;i++)blocks[i].classList.remove('active');var t=document.getElementById('content-'+target);if(t)t.classList.add('active');updateProfileUI(target);window.dispatchEvent(new CustomEvent('profilechange',{detail:{profile:target}}));try{localStorage.setItem('activeProfile',target);}catch(_){}}});

// 初始化UI
updateProfileUI(profile);setTimeout(updateStoryProgress,200);setTimeout(revealTimelineItems,300);

// 监听核心.js触发的角色切换事件
window.addEventListener('profilechange',function(e){updateProfileUI(e.detail.profile);updateStoryProgress();setTimeout(revealTimelineItems,300);});

// 9. 主题切换
function toggleTheme(){var html=document.documentElement,isLight=html.getAttribute('data-theme')==='light';html.setAttribute('data-theme',isLight?'dark':'light');localStorage.setItem('theme',JSON.stringify({value:isLight?'dark':'light'}));updateThemeBtn();}
function updateThemeBtn(){var icon=document.getElementById('themeIcon'),label=document.getElementById('themeLabel');if(!icon||!label)return;var isLight=document.documentElement.getAttribute('data-theme')==='light';icon.textContent=isLight?'🌙':'☀️';label.textContent=isLight?'夜间':'日间';}
window.toggleTheme=toggleTheme;
(function(){var stored=localStorage.getItem('theme');if(stored){try{var data=JSON.parse(stored);document.documentElement.setAttribute('data-theme',data.value==='dark'?'dark':'light');}catch(e){}}else{document.documentElement.setAttribute('data-theme','light');}updateThemeBtn();})();

// 10. 侧边栏兼容（如果核心.js没加载成功）
if(!window.GZD||!window.GZD.Sidebar){window.GZD=window.GZD||{};window.GZD.Sidebar={_open:false,toggle:function(){this._open=!this._open;var p=document.getElementById('sidebarPanel'),o=document.getElementById('sidebarOverlay');if(p)p.classList.toggle('open',this._open);if(o)o.classList.toggle('show',this._open);document.body.classList.toggle('no-scroll',this._open);},close:function(){if(this._open)this.toggle();}};}

// 11. Storage兼容（如果核心.js没加载成功）
if(!window.GZD||!window.GZD.Storage){window.GZD=window.GZD||{};window.GZD.Storage={_data:{quests:{},news:[]},getQuests:function(){return this._data.quests;},updateQuestStatus:function(qid,status){this._data.quests[qid]={status:status};},getNewsRead:function(){return this._data.news||[];},markNewsRead:function(nid){if(this._data.news.indexOf(nid)===-1)this._data.news.push(nid);}};}

console.log('🌙 归终殿 · 命簿纪事 已加载');})();