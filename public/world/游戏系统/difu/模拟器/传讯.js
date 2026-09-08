(function(){
'use strict';

if(!window.GZD){window.GZD={};
GZD.Storage={get:function(k,d){try{var r=localStorage.getItem(k);return r?JSON.parse(r):d;}catch(e){return d;}},set:function(k,v){localStorage.setItem(k,JSON.stringify(v));},getTheme:function(){var r=this.get('theme',null);return r&&r.value?r.value:'dark';},getProfile:function(){try{return localStorage.getItem('activeProfile')||'linxiwu';}catch(e){return'linxiwu';}}};
GZD.ThemeManager={init:function(){var t=GZD.Storage.getTheme(),h=document.documentElement;if(t==='light')h.setAttribute('data-theme','light');else h.removeAttribute('data-theme');},toggle:function(){var isLight=document.documentElement.getAttribute('data-theme')==='light',h=document.documentElement;if(isLight)h.removeAttribute('data-theme');else h.setAttribute('data-theme','light');GZD.Storage.set('theme',{value:isLight?'dark':'light'});}};
GZD.ProfileManager={init:function(){var id=GZD.Storage.getProfile();document.body.setAttribute('data-profile',id);},switch:function(id){document.body.setAttribute('data-profile',id);localStorage.setItem('activeProfile',id);window.dispatchEvent(new CustomEvent('profilechange',{detail:{profile:id}}));}};
GZD.Sidebar={open:false,toggle:function(){this.open=!this.open;var p=document.getElementById('sidebarPanel'),o=document.getElementById('sidebarOverlay');if(p)p.classList.toggle('open',this.open);if(o)o.classList.toggle('show',this.open);document.body.classList.toggle('no-scroll',this.open);},close:function(){if(this.open){this.open=false;var p=document.getElementById('sidebarPanel'),o=document.getElementById('sidebarOverlay');if(p)p.classList.remove('open');if(o)o.classList.remove('show');document.body.classList.remove('no-scroll');}}};
GZD.init=function(){this.ThemeManager.init();this.ProfileManager.init();};GZD.init();}

document.addEventListener('click',function(e){var t=e.target;if(t.closest('.sidebar-tab')){e.preventDefault();GZD.Sidebar.toggle();return;}if(t.id==='sidebarOverlay'){GZD.Sidebar.close();return;}if(t.closest('.sidebar-panel .close-btn')){GZD.Sidebar.close();return;}var sb=t.closest('#profileSwitchBtn');if(sb){e.preventDefault();e.stopPropagation();var c=document.body.getAttribute('data-profile')||'linxiwu';switchProfile(c==='linxiwu'?'luojin':'linxiwu');return;}});
document.getElementById('themeBtn').addEventListener('click',function(){GZD.ThemeManager.toggle();updateThemeBtn();});
function updateThemeBtn(){var b=document.getElementById('themeBtn'),isLight=document.documentElement.getAttribute('data-theme')==='light';if(b)b.innerHTML='<span id="themeIcon">'+(isLight?'🌙':'☀️')+'</span> <span id="themeLabel">'+(isLight?'夜间':'日间')+'</span>';}updateThemeBtn();

function updateProfileUI(profile){var nameMap={linxiwu:'林栖梧',luojin:'罗烬'};var nameEl=document.getElementById('currentProfileName');if(nameEl)nameEl.textContent=nameMap[profile]||'林栖梧';var switchBtn=document.getElementById('profileSwitchBtn');if(switchBtn)switchBtn.textContent='切换到 '+(profile==='linxiwu'?'罗烬':'林栖梧');}
(function(){var saved=GZD.Storage.getProfile();updateProfileUI(saved);})();
window.addEventListener('profilechange',function(e){updateProfileUI(e.detail.profile);var p=e.detail.profile;switchProfile(p);});

// ===== 落花特效 =====
var PETAL_CHARS=['❀','◈','✽'],petalContainer=document.getElementById('petal-container');
if(petalContainer){for(var i=0;i<14;i++){var el=document.createElement('div');el.className='petal-char';el.textContent=PETAL_CHARS[Math.floor(Math.random()*PETAL_CHARS.length)];el.style.left=Math.random()*100+'%';el.style.fontSize=(14+Math.random()*12)+'px';el.style.animationDuration=(10+Math.random()*10)+'s';el.style.animationDelay=(Math.random()*12)+'s';petalContainer.appendChild(el);}}

// ===== 音效（优先播放 音效.WAV 文件，加载失败自动尝试其他文件名，最后退回合成提示音） =====
var audioCtx=null;
var sndCandidates=['./音效.mp3'];
var sndEl=null;
(function(){
var i=0;
function tryNext(){
 if(i>=sndCandidates.length){sndEl=null;return;}
 try{
  var a=new Audio();a.preload='auto';
  a.addEventListener('canplaythrough',function(){sndEl=a;},{once:true});
  a.addEventListener('error',function(){i++;tryNext();},{once:true});
  a.src=sndCandidates[i];
 }catch(e){sndEl=null;}
}
tryNext();
})();
function beep(){try{if(!audioCtx){audioCtx=new(window.AudioContext||window.webkitAudioContext)();}var osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.connect(gain);gain.connect(audioCtx.destination);osc.frequency.value=880;osc.type='sine';gain.gain.setValueAtTime(0.05,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.07);osc.start(audioCtx.currentTime);osc.stop(audioCtx.currentTime+0.07);}catch(e){}}
function playMsgSound(){
try{
 if(sndEl){sndEl.currentTime=0;var p=sndEl.play();if(p&&p.catch)p.catch(function(){beep();});return;}
 beep();
}catch(e){beep();}
}
// 首次用户点击时预解锁音频（移动端自动播放策略要求在用户手势内首次播放）
document.addEventListener('click',function(){
 try{
  if(sndEl){sndEl.muted=true;var p=sndEl.play();if(p&&p.then)p.then(function(){sndEl.pause();sndEl.currentTime=0;sndEl.muted=false;}).catch(function(){sndEl.muted=false;});}
  if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();
 }catch(e){}
},{once:true});

// ===== 数据 =====
var contactsData={
linxiwu:[
{id:'luan',name:'栾方棋',note:'娘亲',avatar:'❀',status:'在修习中',online:true,color:'luan',lastMsg:'晚上回来吃饭吗？'},
{id:'huai',name:'林淮',note:'父亲',avatar:'✦',status:'离线',online:false,color:'huai',lastMsg:'嗯。'},
{id:'jing',name:'魏元璟',note:'璟先生',avatar:'❖',status:'在线中',online:true,color:'jing',lastMsg:'改天来砺峰阁，我教你一套凝神手诀。'},
{id:'luo',name:'罗修',note:'首席',avatar:'◈',status:'离线',online:false,color:'luo',lastMsg:'嗯。比上次有进步。'},
{id:'su',name:'苏晚',note:'',avatar:'✿',status:'在线中',online:true,color:'su',lastMsg:'糊了！那是炭火味！'},
{id:'zhouqing',name:'慕晚棠',note:'',avatar:'✧',status:'离线',online:false,color:'zhouqing',lastMsg:'没什么，就是闻到了一些酸臭的气息。'},
{id:'luojin',name:'罗烬',note:'',avatar:'◈',status:'在线中',online:true,color:'luo',lastMsg:'那……下次出外勤一起吗？'}
],
luojin:[
{id:'luo2',name:'罗修',note:'父亲',avatar:'◈',status:'离线',online:false,color:'luo',lastMsg:'钱在书房第三个抽屉，自己拿。'},
{id:'jing2',name:'魏元璟',note:'娘亲',avatar:'❖',status:'在线中',online:true,color:'jing',lastMsg:'刀法练得不错，继续保持。'},
{id:'luan2',name:'栾方棋',note:'棋大人',avatar:'❀',status:'在线中',online:true,color:'luan',lastMsg:'符法补考在下月初，我已经帮你报名了。'},
{id:'cheng',name:'程木栖',note:'栖大人',avatar:'◉',status:'离线',online:false,color:'cheng',lastMsg:'下次出外勤注意就行。'},
{id:'zhao4',name:'何照野',note:'',avatar:'✿',status:'在线中',online:true,color:'zhao4',lastMsg:'重色轻友！跟人家出外勤！'},
{id:'linxiwu',name:'林栖梧',note:'',avatar:'❀',status:'离线',online:false,color:'luan',lastMsg:'嗯。'}
]
};

var messagesData={
linxiwu:{
luan:[
{side:'left',sender:'luan',name:'栾方棋',text:'期末考核成绩出来了。符法85，阵法78，魂力控制82，综合评定甲等。做得不错。'},
{side:'right',sender:'self',text:'谢谢娘。符法比上次高了3分，阵法还是有点拖后腿。'},
{side:'left',sender:'luan',name:'栾方棋',text:'阵法不急，我当年阵法也不怎么样。先把你精血催符的脱力问题解决了比较重要。'},
{side:'right',sender:'self',text:'嗯，最近在试程师姐给的方子，喝了三天了。'},
{side:'left',sender:'luan',name:'栾方棋',text:'药按时吃，别为了画符熬夜，林淮看到又要和我念叨了。'},
{side:'right',sender:'self',text:'知道了娘。'},
{side:'left',sender:'luan',name:'栾方棋',text:'对了，下月初符修院有个试讲课，你来替我上一节？就当是磨砺了。'},
{side:'right',sender:'self',text:'……好，我准备一下。'},
{side:'left',sender:'luan',name:'栾方棋',text:'晚上回来吃饭吗？我让厨房炖了汤。'},
{side:'right',sender:'self',text:'回。酉时到。'}
],
huai:[
{side:'left',sender:'huai',name:'林淮',text:'统修考核。符法85，阵法78，魂力82，实战65。综合甲等。'},
{side:'left',sender:'huai',name:'林淮',text:'实战低了，下次注意。'},
{side:'right',sender:'self',text:'知道了爹。'},
{side:'left',sender:'huai',name:'林淮',text:'记得加强体术训练。'},
{side:'right',sender:'self',text:'嗯，每日都有做。'},
{side:'left',sender:'huai',name:'林淮',text:'过几天有个外勤，京城周边，你和方棋一起去。'},
{side:'right',sender:'self',text:'好。'},
{side:'left',sender:'huai',name:'林淮',text:'注意安全。'},
{side:'right',sender:'self',text:'谢谢父亲。'},
{side:'left',sender:'huai',name:'林淮',text:'嗯。'}
],
jing:[
{side:'left',sender:'jing',name:'魏元璟',text:'统修考核看了。符法可以，但魂力控制那个分，明显是状态没稳住。'},
{side:'right',sender:'self',text:'嗯，那天有点紧张。'},
{side:'left',sender:'jing',name:'魏元璟',text:'紧张不是理由。下次模拟战时，先做魂力调节再起手。'},
{side:'right',sender:'self',text:'记住了。下次试试。'},
{side:'left',sender:'jing',name:'魏元璟',text:'你那个阵法，你爹说是你短板。改天来砺峰阁，我教你一套凝神手诀。'},
{side:'right',sender:'self',text:'好，麻烦璟大人了。'},
{side:'left',sender:'jing',name:'魏元璟',text:'不用叫得那么客气。你娘是我同僚，你爹是我……算了。这么叫也没问题。'},
{side:'right',sender:'self',text:'好的璟大人。'}
],
luo:[
{side:'left',sender:'luo',name:'罗修',text:'期末成绩。符法85，阵法78，魂力82，实战65。'},
{side:'left',sender:'luo',name:'罗修',text:'实战太弱。下次来演武场，我让元璟陪你练几轮。'},
{side:'right',sender:'self',text:'谢谢首席。'},
{side:'left',sender:'luo',name:'罗修',text:'嗯。比上次有进步。'},
{side:'right',sender:'self',text:'考核大事，弟子定当竭尽全力。'}
],
su:[
{side:'left',sender:'su',name:'苏晚',text:'睡了吗睡了吗睡了吗！！！'},
{side:'right',sender:'self',text:'……没有，怎么了。'},
{side:'left',sender:'su',name:'苏晚',text:'给你做了烤红薯，刚出炉的，香得我睡不着！'},
{side:'right',sender:'self',text:'我不饿。'},
{side:'left',sender:'su',name:'苏晚',text:'别这么冷漠嘛，放你寝殿窗台上了，记得吃。'},
{side:'right',sender:'self',text:'……收到了。'},
{side:'right',sender:'self',text:'……'},
{side:'right',sender:'self',text:'糊了。'},
{side:'left',sender:'su',name:'苏晚',text:'哈哈哈哈哈哈那是炭火味，精髓懂不懂！'},
{side:'right',sender:'self',text:'下次别弄了。'}
],
zhouqing:[
{side:'left',sender:'zhouqing',name:'慕晚棠',text:'你最近出外勤吗？京城周边那个任务，我也想去。'},
{side:'right',sender:'self',text:'罗烬已经找我了，这次和他一起。下次吧。'},
{side:'left',sender:'zhouqing',name:'慕晚棠',text:'哦~~~~'},
{side:'right',sender:'self',text:'……有话直说。'},
{side:'left',sender:'zhouqing',name:'慕晚棠',text:'没什么，就是闻到了一些酸臭的气息。'},
{side:'right',sender:'self',text:'你再说一遍。'},
{side:'left',sender:'zhouqing',name:'慕晚棠',text:'当我没说，当我没说。'}
],
luojin:[
{side:'left',sender:'luo',name:'罗烬',text:'你上次受伤那个地方，好了吗？'},
{side:'right',sender:'self',text:'好了，谢谢。'},
{side:'left',sender:'luo',name:'罗烬',text:'那……下次出外勤一起吗？京城北郊那个。'},
{side:'right',sender:'self',text:'好。'},
{side:'left',sender:'luo',name:'罗烬',text:'好！那我来找你！到时候提前传讯！'},
{side:'right',sender:'self',text:'……嗯。'},
{side:'left',sender:'luo',name:'罗烬',text:'对了，你那个符法笔记……能借我看看吗？补考要用。'},
{side:'right',sender:'self',text:'行，明天带给你。'}
]
},
luojin:{
luo2:[
{side:'left',sender:'luo',name:'罗修',text:'统修。刀法90。'},
{side:'left',sender:'luo',name:'罗修',text:'少惹你娘生气。'},
{side:'right',sender:'self',text:'哦。'},
{side:'left',sender:'luo',name:'罗修',text:'昨天打碎你娘花瓶那个事，自己去他房里道歉。不要让我说第二遍。'},
{side:'right',sender:'self',text:'知道了爹。'},
{side:'left',sender:'luo',name:'罗修',text:'我跟你娘出去几天。钱在书房第三个抽屉，自己拿。'},
{side:'right',sender:'self',text:'好。'}
],
jing2:[
{side:'left',sender:'jing',name:'魏元璟',text:'统修考核成绩。刀法90。'},
{side:'left',sender:'jing',name:'魏元璟',text:'刀法第一，算你有点天赋。但其他科目一塌糊涂，你这样偏科，以后遇上强敌如何应对？还有，以后在外面少给栾方棋他们添麻烦！'},
{side:'right',sender:'self',text:'知道了娘。'},
{side:'left',sender:'jing',name:'魏元璟',text:'不许叫我娘！！！你要叫叫罗修去！'},
{side:'right',sender:'self',text:'哦。'},
{side:'left',sender:'jing',name:'魏元璟',text:'过几天出外勤，自己注意安全。别像上次一样莽莽撞撞的。'},
{side:'right',sender:'self',text:'……知道了。'},
{side:'left',sender:'jing',name:'魏元璟',text:'刀法练得不错，继续保持。'},
{side:'right',sender:'self',text:'嘿嘿，谢谢娘亲夸奖。'},
{side:'left',sender:'jing',name:'魏元璟',text:'油嘴滑舌，你都在哪学的？'},
{side:'right',sender:'self',text:'这不是爹经常在我面前夸您嘛，言传身教。'},
{side:'left',sender:'jing',name:'魏元璟',text:'……你爹经常夸我？'},
{side:'right',sender:'self',text:'那是当然，咱爹这么爱娘亲你。'},
{side:'left',sender:'jing',name:'魏元璟',text:'……哼。'}
],
luan2:[
{side:'left',sender:'luan',name:'栾方棋',text:'统修考核成绩。刀法90，符法53，阵法48，魂力62。'},
{side:'left',sender:'luan',name:'栾方棋',text:'符法和阵法，擦线没过。虽然不是你的主修科目，但也需要多注意。'},
{side:'right',sender:'self',text:'嘿嘿，知道了棋大人！下次一定努力！'},
{side:'left',sender:'luan',name:'栾方棋',text:'……你这孩子还真是乐观。'},
{side:'left',sender:'luan',name:'栾方棋',text:'符法补考在下月初，我已经帮你报名了。'},
{side:'right',sender:'self',text:'行！补考我肯定过！'},
{side:'left',sender:'luan',name:'栾方棋',text:'好好好。'}
],
cheng:[
{side:'left',sender:'cheng',name:'程木栖',text:'罗烬，你上次外勤肩膀的伤，复查了吗？'},
{side:'right',sender:'self',text:'还没来得及……'},
{side:'left',sender:'cheng',name:'程木栖',text:'今天过来一趟。药我给你配好了，放柜台上，自己拿。'},
{side:'right',sender:'self',text:'知道了栖大人。这几天麻烦你了。'},
{side:'left',sender:'cheng',name:'程木栖',text:'下次出外勤注意就行，不用每次都把自己搞成那样。'}
],
zhao4:[
{side:'left',sender:'zhao4',name:'何照野',text:'你那个刀法练得怎么样了？什么时候切磋一下？'},
{side:'right',sender:'self',text:'随时来，演武场见。'},
{side:'left',sender:'zhao4',name:'何照野',text:'对了，明天符法补考，你作业写了吗？给我抄抄。'},
{side:'right',sender:'self',text:'我写了一半，你要不嫌弃就拿去。'},
{side:'left',sender:'zhao4',name:'何照野',text:'不嫌弃不嫌弃！兄弟救我狗命！'},
{side:'left',sender:'zhao4',name:'何照野',text:'周末要不要去人间鬼市逛逛？听说新来了个摊子卖符纸，便宜得很。'},
{side:'right',sender:'self',text:'周末不行。我跟林栖梧约了去京城北郊。'},
{side:'left',sender:'zhao4',name:'何照野',text:'哦~~~~重色轻友，跟人家出外勤。'},
{side:'right',sender:'self',text:'……滚。'}
],
linxiwu:[
{side:'right',sender:'self',text:'你上次受伤那个地方，好了吗？'},
{side:'left',sender:'luan',name:'林栖梧',text:'好了。谢谢。'},
{side:'right',sender:'self',text:'那……下次出外勤一起吗？京城北郊那个。'},
{side:'left',sender:'luan',name:'林栖梧',text:'好。'},
{side:'right',sender:'self',text:'好！那我来找你，到时候提前传讯！'},
{side:'left',sender:'luan',name:'林栖梧',text:'……嗯。'},
{side:'right',sender:'self',text:'对了，你那个符法笔记……能借我看看吗？补考要用。'},
{side:'left',sender:'luan',name:'林栖梧',text:'行。明天带给你。'}
]
}
};

var currentProfile='linxiwu';
var currentContact='luan';
var msgStates={};

function getContacts(p){return contactsData[p]||[];}
function getMessages(p,c){return (messagesData[p]||{})[c]||[];}

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function renderContacts(p){
var list=document.getElementById('contactList');if(!list)return;
var contacts=getContacts(p);if(!contacts.length){list.innerHTML='<div style="padding:12px;color:var(--text-muted);font-size:.8rem;">暂无联系人</div>';return;}
var html='';
contacts.forEach(function(c){
var activeClass=c.id===currentContact?' active':'';
var unreadDot=c.unread?'<span class="unread"></span>':'';
var onlineDot=c.online?'<span class="online"></span>':'<span class="offline"></span>';
var noteHtml=c.note?'<span class="note">（'+esc(c.note)+'）</span>':'';
var preview=c.lastMsg||'暂无消息';
html+='<div class="contact-item'+activeClass+'" data-id="'+c.id+'" data-profile="'+p+'">';
html+='<div class="avatar">'+c.avatar+'</div>';
html+='<div class="info">';
html+='<div class="name">'+esc(c.name)+noteHtml+onlineDot+'</div>';
html+='<div class="preview">'+esc(preview)+unreadDot+'</div>';
html+='</div></div>';
});
list.innerHTML=html;
list.querySelectorAll('.contact-item').forEach(function(el){
el.addEventListener('click',function(){switchContact(this.dataset.id);});
});
}

function switchContact(cid){
if(cid===currentContact)return;
currentContact=cid;
var contacts=getContacts(currentProfile);
contacts.forEach(function(c){if(c.id===cid)c.unread=false;});
renderContacts(currentProfile);
renderChat(currentProfile,cid);
}

function renderChat(p,cid){
var container=document.getElementById('chatMessages');if(!container)return;
var contacts=getContacts(p);var contact=contacts.find(function(c){return c.id===cid;});
if(!contact){container.innerHTML='<div class="empty-state"><span class="empty-icon">✉&#xFE0E;</span>联系人不存在</div>';return;}
// 【关键修复】原代码 cName.textContent=... 会把嵌在 cName 内部的 #cNote span 一并销毁，
// 随后 getElementById('cNote') 返回 null 直接 TypeError，导致整个聊天渲染链瘫痪
// （消息永远不渲染、点联系人/切视角/点空白全部无响应）。现在整体重建 cName 内容，不再依赖静态子节点。
var cNameEl=document.getElementById('cName');
if(cNameEl)cNameEl.innerHTML=esc(contact.name)+(contact.note?'<span class="c-note">（'+esc(contact.note)+'）</span>':'');
var cStatusEl=document.getElementById('cStatus');
if(cStatusEl)cStatusEl.textContent=contact.status||'离线';
var cAvatarEl=document.getElementById('cAvatar');
if(cAvatarEl)cAvatarEl.textContent=contact.avatar||'◈';
var msgs=getMessages(p,cid);
if(!msgs.length){container.innerHTML='<div class="empty-state"><span class="empty-icon">✉&#xFE0E;</span>暂无消息</div>';return;}
container.innerHTML='';
msgs.forEach(function(m,idx){
var unit=document.createElement('div');
unit.className='msg-unit '+m.side+' sender-'+m.sender;
if(m.sender!=='self'&&m.name){
var nameDiv=document.createElement('div');nameDiv.className='msg-name';nameDiv.textContent=m.name;unit.appendChild(nameDiv);
}
var bubble=document.createElement('div');bubble.className='msg-bubble';bubble.textContent=m.text;unit.appendChild(bubble);
unit.dataset.idx=idx;
container.appendChild(unit);
});
var key=p+'_'+cid;
msgStates[key]={idx:0,done:false};
var units=container.querySelectorAll('.msg-unit');
if(units.length>0){units[0].classList.add('show');playMsgSound();msgStates[key].idx=1;}
container.scrollTop=0;
}

function loadNext(){
var container=document.getElementById('chatMessages');if(!container)return;
var key=currentProfile+'_'+currentContact;var state=msgStates[key];if(!state||state.done)return;
var units=container.querySelectorAll('.msg-unit');
if(state.idx>=units.length){state.done=true;return;}
var newUnit=units[state.idx];newUnit.classList.add('show');playMsgSound();state.idx++;
var cr=container.getBoundingClientRect(),ur=newUnit.getBoundingClientRect();
if(ur.bottom>cr.bottom-10)container.scrollTo({top:container.scrollHeight,behavior:'smooth'});
}
var _chatBox=document.getElementById('chatMessages');
if(_chatBox)_chatBox.addEventListener('click',loadNext);

function sendMessage(){
var input=document.getElementById('msgInput');if(!input)return;
var text=input.value.trim();if(!text)return;
var container=document.getElementById('chatMessages');if(!container)return;
var empty=container.querySelector('.empty-state');if(empty)empty.remove();
var unit=document.createElement('div');unit.className='msg-unit right sender-self';
var bubble=document.createElement('div');bubble.className='msg-bubble';bubble.textContent=text;unit.appendChild(bubble);container.appendChild(unit);
requestAnimationFrame(function(){unit.classList.add('show');playMsgSound();container.scrollTop=container.scrollHeight;});
var msgs=messagesData[currentProfile];if(!msgs)msgs={};if(!msgs[currentContact])msgs[currentContact]=[];
msgs[currentContact].push({side:'right',sender:'self',text:text});messagesData[currentProfile]=msgs;
var contacts=getContacts(currentProfile);
contacts.forEach(function(c){if(c.id===currentContact)c.lastMsg=text.length>20?text.slice(0,20)+'…':text;});
renderContacts(currentProfile);input.value='';
var key=currentProfile+'_'+currentContact;if(msgStates[key]){var units=container.querySelectorAll('.msg-unit');msgStates[key].idx=units.length;msgStates[key].done=true;}
}
var _sendBtn=document.getElementById('sendBtn');
if(_sendBtn)_sendBtn.addEventListener('click',sendMessage);
var _msgInput=document.getElementById('msgInput');
if(_msgInput)_msgInput.addEventListener('keydown',function(e){if(e.key==='Enter')sendMessage();});

function switchProfile(p){
if(p===currentProfile)return;
currentProfile=p;var contacts=getContacts(p);currentContact=contacts.length?contacts[0].id:'';
document.body.setAttribute('data-profile',p);
document.getElementById('currentProfileName').textContent=p==='linxiwu'?'林栖梧':'罗烬';
document.getElementById('profileSwitchBtn').textContent='切换到 '+(p==='linxiwu'?'罗烬':'林栖梧');
renderContacts(p);if(currentContact)renderChat(p,currentContact);
try{localStorage.setItem('activeProfile',p);}catch(e){}
}

function init(){
try{var saved=localStorage.getItem('activeProfile');if(saved&&(saved==='linxiwu'||saved==='luojin'))currentProfile=saved;}catch(e){}
var contacts=getContacts(currentProfile);currentContact=contacts.length?contacts[0].id:'';
document.body.setAttribute('data-profile',currentProfile);
document.getElementById('currentProfileName').textContent=currentProfile==='linxiwu'?'林栖梧':'罗烬';
document.getElementById('profileSwitchBtn').textContent='切换到 '+(currentProfile==='linxiwu'?'罗烬':'林栖梧');
renderContacts(currentProfile);if(currentContact)renderChat(currentProfile,currentContact);
console.log('✉ 传讯符已加载');
}
document.addEventListener('DOMContentLoaded',init);
window.switchProfile=switchProfile;

// ===== 手机端视口自适应补丁：visualViewport 实时同步可见高度 =====
// 解决老内核回退 100vh（按最大视口计算）导致底部输入框被浏览器工具栏/软键盘顶出屏幕的问题
(function(){
if(!window.visualViewport)return;
var vv=window.visualViewport;
var apply=function(){if(document.body){document.body.style.height=vv.height+'px';document.body.style.minHeight=vv.height+'px';}};
apply();
vv.addEventListener('resize',apply);
})();
})();