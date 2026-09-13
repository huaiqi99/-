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

// ===== 落花特效(保留原版) =====
var PETAL_CHARS=['❀','◈','✽'],petalContainer=document.getElementById('petal-container');
if(petalContainer){for(var i=0;i<14;i++){var el=document.createElement('div');el.className='petal-char';el.textContent=PETAL_CHARS[Math.floor(Math.random()*PETAL_CHARS.length)];el.style.left=Math.random()*100+'%';el.style.fontSize=(14+Math.random()*12)+'px';el.style.animationDuration=(10+Math.random()*10)+'s';el.style.animationDelay=(Math.random()*12)+'s';petalContainer.appendChild(el);}}

// ===== 音效(保留原版) =====
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
document.addEventListener('click',function(){
 try{
  if(sndEl){sndEl.muted=true;var p=sndEl.play();if(p&&p.then)p.then(function(){sndEl.pause();sndEl.currentTime=0;sndEl.muted=false;}).catch(function(){sndEl.muted=false;});}
  if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();
 }catch(e){}
},{once:true});

// ====================================================================
// ===== AI 配置(双模式:玩家自带 Key 优先,无 Key 走 Worker 兜底) =====
// ====================================================================
var CHAT_WORKER_URL='https://difu-chat.2629885225.workers.dev';  // ★ 传讯符专用 Worker
var CONFIG_KEY='gzd_ai_config';
var PROVIDER_CONFIG={
  deepseek:{baseUrl:'https://api.deepseek.com',defaultModel:'deepseek-chat',format:'openai'},
  openai:{baseUrl:'https://api.openai.com',defaultModel:'gpt-4o-mini',format:'openai'},
  claude:{baseUrl:'https://api.anthropic.com',defaultModel:'claude-3-5-sonnet-20241022',format:'claude'},
  custom:{baseUrl:'',defaultModel:'',format:'openai'}
};
function loadAIConfig(){try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}');}catch(e){return{};}}

// 联系人 id → 后端 npcId 映射
// 原版联系人 id(luan, huai, jing, luo, luo2, jing2, luan2, cheng, luojin, linxiwu)
// 后端 npcId(luanfangqi, linhuai, luoxiu, weiyuanjing, chengmuqi, luojin, linxiwu)
var NPC_ID_MAP={
  luan:'luanfangqi',  luan2:'luanfangqi',
  huai:'linhuai',
  jing:'weiyuanjing', jing2:'weiyuanjing',
  luo:'luoxiu',       luo2:'luoxiu',
  cheng:'chengmuqi',
  luojin:'luojin',    // 玩家是林栖梧时,罗烬作为 NPC
  linxiwu:'linxiwu'   // 玩家是罗烬时,林栖梧作为 NPC
};

// NPC 头像点击时显示的简介卡片数据
var NPC_PROFILE_CARDS={
  luanfangqi:{name:'栾方棋',avatar:'❀',sym:'符修院助教 · 第五席',color:'#D49A9A',
    sign:'"凑合过吧,还能离咋的"',
    desc:'归终殿第一符修,身负浮生树血脉。面容清俊温和,笑起来眼角微弯。被罗修调侃了几十年,嘴上嫌弃实际默契十足。林栖梧的生父之一,对女儿极其满意。'},
  linhuai:{name:'林淮',avatar:'✦',sym:'归终殿枪修 · 第二席',color:'#4E5A64',
    sign:'"嗯。"',
    desc:'面容冷峻,常年面无表情,被罗修形容为"棺材脸配死鱼眼"。话少得可怜,但偶尔语出惊人。深度路痴,住了几百年的归终殿都能迷路。林栖梧的生父之一,极护短但从不说出口。'},
  luoxiu:{name:'罗修',avatar:'◈',sym:'首席引渡人 · 第一席',color:'#7a4a4a',
    sign:'"关我什么事。"',
    desc:'归终殿首席,刀修兼讲武堂执教。玩世不恭、大大咧咧、毒舌刻薄,跟谁都能勾肩搭背。嘴上不饶人,但归终殿第一护短。罗烬的生父之一,对魏元璟是最大的软肋。'},
  weiyuanjing:{name:'魏元璟',avatar:'❖',sym:'引渡人 · 第七席',color:'#7a6a3a',
    sign:'"关我什么事。"',
    desc:'生前为苍珩王朝太子后登基为帝。面容极其俊美,生气瞪圆像炸毛的猫,委屈时眼眶泛红强忍不掉泪。傲娇刀子嘴豆腐心,被叫"娘"会炸毛"谁是你娘!叫爹!"。罗烬的生父之一。'},
  chengmuqi:{name:'程木栖',avatar:'◉',sym:'栖梧馆主事 · 原第二席',color:'#3a6a5a',
    sign:'"乖,喝药。"',
    desc:'归终殿第二席,京城决战中十指尽废后退出排名,开设栖梧馆医馆。面容温婉素净,十指指节微微变形。表面温和端方,实则偷懒翘班躲起来看话本。归终殿的定海神针。'},
  luojin:{name:'罗烬',avatar:'◈',sym:'讲武堂弟子 · 统修期',color:'#4a4642',
    sign:'"我、我不是故意的……"',
    desc:'罗修与魏元璟之子,承刀法一脉。咋咋呼呼精力旺盛,但面对林栖梧会结巴磕巴。小时候抓虫子吓她,长大了偷偷喜欢她却不敢说。练功刻苦到自虐,出任务时默默护着林栖梧。'},
  linxiwu:{name:'林栖梧',avatar:'❀',sym:'符修院助教 · 统修期',color:'#D49A9A',
    sign:'"哦。"',
    desc:'林淮与栾方棋之女,身负浮生树血脉。温润端方,学东西快,符箓剑法魂术样样精通。对罗烬从"讨厌"变成"头疼",可能隐约察觉到他的心思但选择装作不知。'}
};

// ===== 调用 AI(双模式) =====
function callChatAI(message, npcId, profile, history, onChunk){
  var cfg=loadAIConfig();
  if(cfg.apiKey && cfg.provider){
    return callDirect(message, npcId, profile, history, cfg, onChunk);
  } else {
    return callWorker(message, npcId, profile, history, onChunk);
  }
}

// 模式 1:玩家填了 Key,直连 AI 服务商
function callDirect(message, npcId, profile, history, cfg, onChunk){
  var pConfig=PROVIDER_CONFIG[cfg.provider]||PROVIDER_CONFIG.deepseek;
  var baseUrl=cfg.provider==='custom'?(cfg.customUrl||''):pConfig.baseUrl;
  var model=cfg.model||pConfig.defaultModel;
  if(!baseUrl) return Promise.reject(new Error('接口地址为空,请前往设置页填写'));

  var messages=[
    ...history.slice(-10),
    {role:'user',content:message}
  ];
  var url, headers, body;
  if(pConfig.format==='claude'){
    url=baseUrl+'/v1/messages';
    headers={'Content-Type':'application/json','x-api-key':cfg.apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'};
    body=JSON.stringify({model:model,max_tokens:400,messages:messages});
  } else {
    url=baseUrl+'/v1/chat/completions';
    headers={'Content-Type':'application/json','Authorization':'Bearer '+cfg.apiKey};
    body=JSON.stringify({model:model,messages:messages,max_tokens:400,temperature:0.85,stream:true});
  }
  return fetch(url,{method:'POST',headers:headers,body:body}).then(function(resp){
    if(!resp.ok){
      return resp.json().then(function(data){
        var errMsg=data.error?.message||data.error||JSON.stringify(data);
        if(resp.status===401) throw new Error('API Key 无效或已失效,请前往设置页检查');
        if(resp.status===402) throw new Error('AI 服务商余额不足,请前往充值');
        if(resp.status===429) throw new Error('请求过于频繁,请稍后再试');
        throw new Error('AI 返回错误('+resp.status+'):'+errMsg);
      });
    }
    // 流式读取
    var reader=resp.body.getReader();
    var decoder=new TextDecoder('utf-8');
    var buffer='';
    var fullText='';
    function read(){
      return reader.read().then(function(result){
        if(result.done) return fullText;
        buffer+=decoder.decode(result.value,{stream:true});
        var lines=buffer.split('\n');
        buffer=lines.pop();
        for(var i=0;i<lines.length;i++){
          var line=lines[i].trim();
          if(!line) continue;
          if(pConfig.format==='claude'){
            if(line.startsWith('data:')){
              try{
                var d=JSON.parse(line.slice(5));
                if(d.type==='content_block_delta' && d.delta && d.delta.text){
                  fullText+=d.delta.text;
                  if(onChunk) onChunk(d.delta.text);
                }
              }catch(e){}
            }
          } else {
            if(line.startsWith('data:')){
              var dataStr=line.slice(5);
              if(dataStr==='[DONE]') continue;
              try{
                var d=JSON.parse(dataStr);
                if(d.choices && d.choices[0] && d.choices[0].delta && d.choices[0].delta.content){
                  fullText+=d.choices[0].delta.content;
                  if(onChunk) onChunk(d.choices[0].delta.content);
                }
              }catch(e){}
            }
          }
        }
        return read();
      });
    }
    return read();
  });
}

// 模式 2:走 Worker 兜底(非流式,简单)
function callWorker(message, npcId, profile, history){
  return fetch(CHAT_WORKER_URL,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({message:message,npcId:npcId,profile:profile,history:history})
  }).then(function(resp){return resp.json();}).then(function(data){
    if(data.error) throw new Error(data.error);
    return data.reply;
  });
}

// ====================================================================
// ===== 原版联系人 / 消息数据(写死的开场对话,保留) =====
// ====================================================================
var contactsData={
linxiwu:[
{id:'luan',name:'栾方棋',note:'娘亲',avatar:'❀',status:'在修习中',online:true,color:'luan',lastMsg:'晚上回来吃饭吗？'},
{id:'huai',name:'林淮',note:'父亲',avatar:'✦',status:'离线',online:false,color:'huai',lastMsg:'嗯。'},
{id:'jing',name:'魏元璟',note:'璟先生',avatar:'❖',status:'在线中',online:true,color:'jing',lastMsg:'改天来砺峰阁,我教你一套凝神手诀。'},
{id:'luo',name:'罗修',note:'首席',avatar:'◈',status:'离线',online:false,color:'luo',lastMsg:'嗯。比上次有进步。'},
{id:'su',name:'苏晚',note:'',avatar:'✿',status:'在线中',online:true,color:'su',lastMsg:'糊了！那是炭火味！'},
{id:'zhouqing',name:'慕晚棠',note:'',avatar:'✧',status:'离线',online:false,color:'zhouqing',lastMsg:'没什么,就是闻到了一些酸臭的气息。'},
{id:'luojin',name:'罗烬',note:'',avatar:'◈',status:'在线中',online:true,color:'luo',lastMsg:'那……下次出外勤一起吗？'}
],
luojin:[
{id:'luo2',name:'罗修',note:'父亲',avatar:'◈',status:'离线',online:false,color:'luo',lastMsg:'钱在书房第三个抽屉,自己拿。'},
{id:'jing2',name:'魏元璟',note:'娘亲',avatar:'❖',status:'在线中',online:true,color:'jing',lastMsg:'刀法练得不错,继续保持。'},
{id:'luan2',name:'栾方棋',note:'棋大人',avatar:'❀',status:'在线中',online:true,color:'luan',lastMsg:'符法补考在下月初,我已经帮你报名了。'},
{id:'cheng',name:'程木栖',note:'栖大人',avatar:'◉',status:'离线',online:false,color:'cheng',lastMsg:'下次出外勤注意就行。'},
{id:'zhao4',name:'何照野',note:'',avatar:'✿',status:'在线中',online:true,color:'zhao4',lastMsg:'重色轻友！跟人家出外勤！'},
{id:'linxiwu',name:'林栖梧',note:'',avatar:'❀',status:'离线',online:false,color:'luan',lastMsg:'嗯。'}
]
};

var messagesData={
linxiwu:{
luan:[
{side:'left',sender:'luan',name:'栾方棋',text:'期末考核成绩出来了。符法85,阵法78,魂力控制82,综合评定甲等。做得不错。'},
{side:'right',sender:'self',text:'谢谢娘。符法比上次高了3分,阵法还是有点拖后腿。'},
{side:'left',sender:'luan',name:'栾方棋',text:'阵法不急,我当年阵法也不怎么样。先把你精血催符的脱力问题解决了比较重要。'},
{side:'right',sender:'self',text:'嗯,最近在试程师姐给的方子,喝了三天了。'},
{side:'left',sender:'luan',name:'栾方棋',text:'药按时吃,别为了画符熬夜,林淮看到又要和我念叨了。'},
{side:'right',sender:'self',text:'知道了娘。'},
{side:'left',sender:'luan',name:'栾方棋',text:'对了,下月初符修院有个试讲课,你来替我上一节?就当是磨砺了。'},
{side:'right',sender:'self',text:'……好,我准备一下。'},
{side:'left',sender:'luan',name:'栾方棋',text:'晚上回来吃饭吗?我让厨房炖了汤。'},
{side:'right',sender:'self',text:'回。酉时到。'}
],
huai:[
{side:'left',sender:'huai',name:'林淮',text:'统修考核。符法85,阵法78,魂力82,实战65。综合甲等。'},
{side:'left',sender:'huai',name:'林淮',text:'实战低了,下次注意。'},
{side:'right',sender:'self',text:'知道了爹。'},
{side:'left',sender:'huai',name:'林淮',text:'记得加强体术训练。'},
{side:'right',sender:'self',text:'嗯,每日都有做。'},
{side:'left',sender:'huai',name:'林淮',text:'过几天有个外勤,京城周边,你和方棋一起去。'},
{side:'right',sender:'self',text:'好。'},
{side:'left',sender:'huai',name:'林淮',text:'注意安全。'},
{side:'right',sender:'self',text:'谢谢父亲。'},
{side:'left',sender:'huai',name:'林淮',text:'嗯。'}
],
jing:[
{side:'left',sender:'jing',name:'魏元璟',text:'统修考核看了。符法可以,但魂力控制那个分,明显是状态没稳住。'},
{side:'right',sender:'self',text:'嗯,那天有点紧张。'},
{side:'left',sender:'jing',name:'魏元璟',text:'紧张不是理由。下次模拟战时,先做魂力调节再起手。'},
{side:'right',sender:'self',text:'记住了。下次试试。'},
{side:'left',sender:'jing',name:'魏元璟',text:'你那个阵法,你爹说是你短板。改天来砺峰阁,我教你一套凝神手诀。'},
{side:'right',sender:'self',text:'好,麻烦璟大人了。'},
{side:'left',sender:'jing',name:'魏元璟',text:'不用叫得那么客气。你娘是我同僚,你爹是我……算了。这么叫也没问题。'},
{side:'right',sender:'self',text:'好的璟大人。'}
],
luo:[
{side:'left',sender:'luo',name:'罗修',text:'期末成绩。符法85,阵法78,魂力82,实战65。'},
{side:'left',sender:'luo',name:'罗修',text:'实战太弱。下次来演武场,我让元璟陪你练几轮。'},
{side:'right',sender:'self',text:'谢谢首席。'},
{side:'left',sender:'luo',name:'罗修',text:'嗯。比上次有进步。'},
{side:'right',sender:'self',text:'考核大事,弟子定当竭尽全力。'}
],
su:[
{side:'left',sender:'su',name:'苏晚',text:'睡了吗睡了吗睡了吗！！！'},
{side:'right',sender:'self',text:'……没有,怎么了。'},
{side:'left',sender:'su',name:'苏晚',text:'给你做了烤红薯,刚出炉的,香得我睡不着！'},
{side:'right',sender:'self',text:'我不饿。'},
{side:'left',sender:'su',name:'苏晚',text:'别这么冷漠嘛,放你寝殿窗台上了,记得吃。'},
{side:'right',sender:'self',text:'……收到了。'},
{side:'right',sender:'self',text:'……'},
{side:'right',sender:'self',text:'糊了。'},
{side:'left',sender:'su',name:'苏晚',text:'哈哈哈哈哈哈那是炭火味,精髓懂不懂！'},
{side:'right',sender:'self',text:'下次别弄了。'}
],
zhouqing:[
{side:'left',sender:'zhouqing',name:'慕晚棠',text:'你最近出外勤吗?京城周边那个任务,我也想去。'},
{side:'right',sender:'self',text:'罗烬已经找我了,这次和他一起。下次吧。'},
{side:'left',sender:'zhouqing',name:'慕晚棠',text:'哦~~~~'},
{side:'right',sender:'self',text:'……有话直说。'},
{side:'left',sender:'zhouqing',name:'慕晚棠',text:'没什么,就是闻到了一些酸臭的气息。'},
{side:'right',sender:'self',text:'你再说一遍。'},
{side:'left',sender:'zhouqing',name:'慕晚棠',text:'当我没说,当我没说。'}
],
luojin:[
{side:'left',sender:'luo',name:'罗烬',text:'你上次受伤那个地方,好了吗?'},
{side:'right',sender:'self',text:'好了,谢谢。'},
{side:'left',sender:'luo',name:'罗烬',text:'那……下次出外勤一起吗?京城北郊那个。'},
{side:'right',sender:'self',text:'好。'},
{side:'left',sender:'luo',name:'罗烬',text:'好！那我来找你！到时候提前传讯！'},
{side:'right',sender:'self',text:'……嗯。'},
{side:'left',sender:'luo',name:'罗烬',text:'对了,你那个符法笔记……能借我看看吗?补考要用。'},
{side:'right',sender:'self',text:'行,明天带给你。'}
]
},
luojin:{
luo2:[
{side:'left',sender:'luo',name:'罗修',text:'统修。刀法90。'},
{side:'left',sender:'luo',name:'罗修',text:'少惹你娘生气。'},
{side:'right',sender:'self',text:'哦。'},
{side:'left',sender:'luo',name:'罗修',text:'昨天打碎你娘花瓶那个事,自己去他房里道歉。不要让我说第二遍。'},
{side:'right',sender:'self',text:'知道了爹。'},
{side:'left',sender:'luo',name:'罗修',text:'我跟你娘出去几天。钱在书房第三个抽屉,自己拿。'},
{side:'right',sender:'self',text:'好。'}
],
jing2:[
{side:'left',sender:'jing',name:'魏元璟',text:'统修考核成绩。刀法90。'},
{side:'left',sender:'jing',name:'魏元璟',text:'刀法第一,算你有点天赋。但其他科目一塌糊涂,你这样偏科,以后遇上强敌如何应对?还有,以后在外面少给栾方棋他们添麻烦！'},
{side:'right',sender:'self',text:'知道了娘。'},
{side:'left',sender:'jing',name:'魏元璟',text:'不许叫我娘！！！你要叫叫罗修去！'},
{side:'right',sender:'self',text:'哦。'},
{side:'left',sender:'jing',name:'魏元璟',text:'过几天出外勤,自己注意安全。别像上次一样莽莽撞撞的。'},
{side:'right',sender:'self',text:'……知道了。'},
{side:'left',sender:'jing',name:'魏元璟',text:'刀法练得不错,继续保持。'},
{side:'right',sender:'self',text:'嘿嘿,谢谢娘亲夸奖。'},
{side:'left',sender:'jing',name:'魏元璟',text:'油嘴滑舌,你都在哪学的?'},
{side:'right',sender:'self',text:'这不是爹经常在我面前夸您嘛,言传身教。'},
{side:'left',sender:'jing',name:'魏元璟',text:'……你爹经常夸我?'},
{side:'right',sender:'self',text:'那是当然,咱爹这么爱娘亲你。'},
{side:'left',sender:'jing',name:'魏元璟',text:'……哼。'}
],
luan2:[
{side:'left',sender:'luan',name:'栾方棋',text:'统修考核成绩。刀法90,符法53,阵法48,魂力62。'},
{side:'left',sender:'luan',name:'栾方棋',text:'符法和阵法,擦线没过。虽然不是你的主修科目,但也需要多注意。'},
{side:'right',sender:'self',text:'嘿嘿,知道了棋大人！下次一定努力！'},
{side:'left',sender:'luan',name:'栾方棋',text:'……你这孩子还真是乐观。'},
{side:'left',sender:'luan',name:'栾方棋',text:'符法补考在下月初,我已经帮你报名了。'},
{side:'right',sender:'self',text:'行！补考我肯定过！'},
{side:'left',sender:'luan',name:'栾方棋',text:'好好好。'}
],
cheng:[
{side:'left',sender:'cheng',name:'程木栖',text:'罗烬,你上次外勤肩膀的伤,复查了吗?'},
{side:'right',sender:'self',text:'还没来得及……'},
{side:'left',sender:'cheng',name:'程木栖',text:'今天过来一趟。药我给你配好了,放柜台上,自己拿。'},
{side:'right',sender:'self',text:'知道了栖大人。这几天麻烦你了。'},
{side:'left',sender:'cheng',name:'程木栖',text:'下次出外勤注意就行,不用每次都把自己搞成那样。'}
],
zhao4:[
{side:'left',sender:'zhao4',name:'何照野',text:'你那个刀法练得怎么样了?什么时候切磋一下?'},
{side:'right',sender:'self',text:'随时来,演武场见。'},
{side:'left',sender:'zhao4',name:'何照野',text:'对了,明天符法补考,你作业写了吗?给我抄抄。'},
{side:'right',sender:'self',text:'我写了一半,你要不嫌弃就拿去。'},
{side:'left',sender:'zhao4',name:'何照野',text:'不嫌弃不嫌弃！兄弟救我狗命！'},
{side:'left',sender:'zhao4',name:'何照野',text:'周末要不要去人间鬼市逛逛?听说新来了个摊子卖符纸,便宜得很。'},
{side:'right',sender:'self',text:'周末不行。我跟林栖梧约了去京城北郊。'},
{side:'left',sender:'zhao4',name:'何照野',text:'哦~~~~重色轻友,跟人家出外勤。'},
{side:'right',sender:'self',text:'……滚。'}
],
linxiwu:[
{side:'right',sender:'self',text:'你上次受伤那个地方,好了吗?'},
{side:'left',sender:'luan',name:'林栖梧',text:'好了。谢谢。'},
{side:'right',sender:'self',text:'那……下次出外勤一起吗?京城北郊那个。'},
{side:'left',sender:'luan',name:'林栖梧',text:'好。'},
{side:'right',sender:'self',text:'好！那我来找你,到时候提前传讯！'},
{side:'left',sender:'luan',name:'林栖梧',text:'……嗯。'},
{side:'right',sender:'self',text:'对了,你那个符法笔记……能借我看看吗?补考要用。'},
{side:'left',sender:'luan',name:'林栖梧',text:'行。明天带给你。'}
]
}
};

// ===== AI 聊天存档(每个角色 × 每个 NPC 独立) =====
var AI_STORAGE_KEY='gzd_chat_history';
function loadAIChat(profile, npcId){
  try{
    var all=JSON.parse(localStorage.getItem(AI_STORAGE_KEY)||'{}');
    return (all[profile]&&all[profile][npcId])||[];
  }catch(e){return[];}
}
function saveAIChat(profile, npcId, arr){
  try{
    var all=JSON.parse(localStorage.getItem(AI_STORAGE_KEY)||'{}');
    if(!all[profile])all[profile]={};
    all[profile][npcId]=arr;
    localStorage.setItem(AI_STORAGE_KEY,JSON.stringify(all));
  }catch(e){console.warn('AI 存档失败:',e);}
}

// ====================================================================
// ===== 主逻辑(保留原版 + 加 AI 调用) =====
// ====================================================================
var currentProfile='linxiwu';
var currentContact='luan';
var msgStates={};
var aiSending=false;  // 防止重复发送

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
var cNameEl=document.getElementById('cName');
if(cNameEl)cNameEl.innerHTML=esc(contact.name)+(contact.note?'<span class="c-note">（'+esc(contact.note)+'）</span>':'');
var cStatusEl=document.getElementById('cStatus');
if(cStatusEl)cStatusEl.textContent=contact.status||'离线';
var cAvatarEl=document.getElementById('cAvatar');
if(cAvatarEl){
  cAvatarEl.textContent=contact.avatar||'◈';
  cAvatarEl.style.cursor='pointer';
  cAvatarEl.title='点击查看资料';
  // 绑定头像点击(只绑一次)
  if(!cAvatarEl.dataset.bound){
    cAvatarEl.dataset.bound='1';
    cAvatarEl.addEventListener('click',function(e){
      e.stopPropagation();
      var npcId=NPC_ID_MAP[currentContact];
      if(npcId) showNPCCard(npcId);
    });
  }
}
var msgs=getMessages(p,cid);

// 如果该 NPC 有 AI 聊天历史,追加显示
var npcId=NPC_ID_MAP[cid];
var aiHistory=npcId?loadAIChat(p,npcId):[];

if(!msgs.length && !aiHistory.length){
  container.innerHTML='<div class="empty-state"><span class="empty-icon">✉&#xFE0E;</span>暂无消息<br><span style="font-size:.7rem;opacity:.7;">在下方输入框开始对话</span></div>';
  return;
}

container.innerHTML='';
// 先渲染写死的开场对话
msgs.forEach(function(m,idx){
  var unit=createMsgUnit(m);
  container.appendChild(unit);
});
// 再渲染 AI 历史对话
aiHistory.forEach(function(m){
  var unit=createMsgUnit(m);
  unit.classList.add('show');  // AI 历史直接显示
  container.appendChild(unit);
});

var key=p+'_'+cid;
msgStates[key]={idx:0,done:false};
var units=container.querySelectorAll('.msg-unit');
// 已经显示的(写死的)跳过
var shownCount=container.querySelectorAll('.msg-unit.show').length;
if(units.length>0){
  // 如果有写死对话,从第一条开始按动画显示;如果全是 AI 历史,直接全显示
  if(msgs.length>0){
    units[0].classList.add('show');playMsgSound();msgStates[key].idx=1;
  } else {
    // 全是 AI 历史,不需要逐条动画
    msgStates[key].idx=units.length;
    msgStates[key].done=true;
  }
}
// 滚到底部(显示 AI 历史时)
if(aiHistory.length>0){
  container.scrollTop=container.scrollHeight;
} else {
  container.scrollTop=0;
}
}

function createMsgUnit(m){
  var unit=document.createElement('div');
  unit.className='msg-unit '+m.side+' sender-'+m.sender;
  if(m.sender!=='self'&&m.name){
    var nameDiv=document.createElement('div');nameDiv.className='msg-name';nameDiv.textContent=m.name;unit.appendChild(nameDiv);
  }
  var bubble=document.createElement('div');bubble.className='msg-bubble';bubble.textContent=m.text;unit.appendChild(bubble);
  return unit;
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

// ===== 发送消息(改造:支持 AI 回复) =====
function sendMessage(){
  if(aiSending)return;  // 防止重复发送
  var input=document.getElementById('msgInput');if(!input)return;
  var text=input.value.trim();if(!text)return;
  var container=document.getElementById('chatMessages');if(!container)return;
  var empty=container.querySelector('.empty-state');if(empty)empty.remove();

  // 1. 立即显示玩家消息
  var unit=document.createElement('div');unit.className='msg-unit right sender-self';
  var bubble=document.createElement('div');bubble.className='msg-bubble';bubble.textContent=text;unit.appendChild(bubble);container.appendChild(unit);
  requestAnimationFrame(function(){unit.classList.add('show');playMsgSound();container.scrollTop=container.scrollHeight;});

  // 更新原版联系人列表预览
  var contacts=getContacts(currentProfile);
  contacts.forEach(function(c){if(c.id===currentContact)c.lastMsg=text.length>20?text.slice(0,20)+'…':text;});
  renderContacts(currentProfile);
  input.value='';

  // 标记写死对话已全部显示
  var key=currentProfile+'_'+currentContact;if(msgStates[key]){var units=container.querySelectorAll('.msg-unit');msgStates[key].idx=units.length;msgStates[key].done=true;}

  // 2. 调 AI
  var npcId=NPC_ID_MAP[currentContact];
  if(!npcId){
    // 没有对应 NPC(比如苏晚、慕晚棠、何照野暂未做 AI),显示提示
    var tipUnit=document.createElement('div');tipUnit.className='msg-unit left sender-self';
    var tipBubble=document.createElement('div');tipBubble.className='msg-bubble';
    tipBubble.style.background='var(--bg-hover)';tipBubble.style.color='var(--text-muted)';
    tipBubble.style.fontStyle='italic';tipBubble.style.fontSize='.85rem';
    tipBubble.textContent='(此角色暂未接入 AI,无法回复)';
    tipUnit.appendChild(tipBubble);container.appendChild(tipUnit);
    requestAnimationFrame(function(){tipUnit.classList.add('show');container.scrollTop=container.scrollHeight;});
    return;
  }

  // 构造 AI 历史(从存档读取)
  var aiHistory=loadAIChat(currentProfile,npcId);

  // 显示 NPC "正在输入..." 占位
  var loadingUnit=document.createElement('div');loadingUnit.className='msg-unit left sender-'+(contacts.find(function(c){return c.id===currentContact;})||{}).color;
  var loadingName=document.createElement('div');loadingName.className='msg-name';
  loadingName.textContent=(contacts.find(function(c){return c.id===currentContact;})||{}).name||'';
  var loadingBubble=document.createElement('div');loadingBubble.className='msg-bubble';
  loadingBubble.innerHTML='<span class="chat-loading-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>';
  loadingUnit.appendChild(loadingName);loadingUnit.appendChild(loadingBubble);
  container.appendChild(loadingUnit);
  requestAnimationFrame(function(){loadingUnit.classList.add('show');container.scrollTop=container.scrollHeight;});

  aiSending=true;
  var sendBtn=document.getElementById('sendBtn');
  if(sendBtn){sendBtn.disabled=true;sendBtn.textContent='...';}

  // 调用 AI(双模式)
  callChatAI(text, npcId, currentProfile, aiHistory).then(function(reply){
    // 移除 loading
    if(loadingUnit.parentNode)loadingUnit.parentNode.removeChild(loadingUnit);

    // 流式 / 非流式 统一处理:reply 是完整字符串
    // 显示 NPC 回复
    var npcName=(contacts.find(function(c){return c.id===currentContact;})||{}).name||'';
    var npcColor=(contacts.find(function(c){return c.id===currentContact;})||{}).color||'ke';
    var replyUnit=document.createElement('div');
    replyUnit.className='msg-unit left sender-'+npcColor;
    var replyName=document.createElement('div');replyName.className='msg-name';replyName.textContent=npcName;
    var replyBubble=document.createElement('div');replyBubble.className='msg-bubble';replyBubble.textContent=reply;
    replyUnit.appendChild(replyName);replyUnit.appendChild(replyBubble);
    container.appendChild(replyUnit);
    requestAnimationFrame(function(){replyUnit.classList.add('show');playMsgSound();container.scrollTop=container.scrollHeight;});

    // 存档(玩家输入 + AI 回应)
    aiHistory.push({side:'right',sender:'self',text:text});
    aiHistory.push({side:'left',sender:npcColor,name:npcName,text:reply});
    saveAIChat(currentProfile,npcId,aiHistory);

    // 更新联系人预览
    contacts.forEach(function(c){if(c.id===currentContact)c.lastMsg=reply.length>20?reply.slice(0,20)+'…':reply;});
    renderContacts(currentProfile);
  }).catch(function(err){
    // 移除 loading
    if(loadingUnit.parentNode)loadingUnit.parentNode.removeChild(loadingUnit);
    // 显示错误
    var errUnit=document.createElement('div');errUnit.className='msg-unit left sender-self';
    var errBubble=document.createElement('div');errBubble.className='msg-bubble';
    errBubble.style.background='rgba(160,64,64,0.1)';errBubble.style.color='#a04040';
    errBubble.textContent='【出错】'+err.message;
    errUnit.appendChild(errBubble);container.appendChild(errUnit);
    requestAnimationFrame(function(){errUnit.classList.add('show');container.scrollTop=container.scrollHeight;});
  }).finally(function(){
    aiSending=false;
    if(sendBtn){sendBtn.disabled=false;sendBtn.textContent='发送';}
  });
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

// ====================================================================
// ===== NPC 资料卡片(点击头像弹出) =====
// ====================================================================
function showNPCCard(npcId){
  var data=NPC_PROFILE_CARDS[npcId];
  if(!data)return;
  // 移除已存在的卡片
  var existing=document.getElementById('npcCardOverlay');
  if(existing)existing.remove();

  var overlay=document.createElement('div');
  overlay.id='npcCardOverlay';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity 0.2s;';

  var card=document.createElement('div');
  card.style.cssText='background:var(--bg-card);border:1px solid var(--border-card);border-radius:14px;padding:24px 22px;max-width:340px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,0.3);transform:translateY(10px);transition:transform 0.25s;font-family:var(--font-serif);position:relative;';

  card.innerHTML=
    '<div style="text-align:center;margin-bottom:14px;">'+
      '<div style="width:64px;height:64px;border-radius:50%;background:'+data.color+'22;border:2px solid '+data.color+';display:flex;align-items:center;justify-content:center;font-size:1.8rem;color:'+data.color+';margin:0 auto 10px auto;font-weight:600;">'+data.avatar+'</div>'+
      '<div style="font-size:1.15rem;font-weight:600;color:var(--text-primary);letter-spacing:1px;">'+esc(data.name)+'</div>'+
      '<div style="font-size:0.72rem;color:var(--text-muted);font-family:var(--font-mono);letter-spacing:0.5px;margin-top:4px;">'+esc(data.sym)+'</div>'+
    '</div>'+
    '<div style="text-align:center;font-style:italic;color:var(--text-secondary);font-size:0.88rem;padding:8px 12px;background:var(--bg-hover);border-radius:8px;margin-bottom:14px;">'+
      esc(data.sign)+
    '</div>'+
    '<div style="font-size:0.85rem;line-height:1.7;color:var(--text-secondary);">'+
      esc(data.desc)+
    '</div>'+
    '<button id="npcCardClose" style="position:absolute;top:8px;right:10px;background:none;border:none;font-size:1.1rem;color:var(--text-muted);cursor:pointer;padding:4px 8px;">✕</button>';

  overlay.appendChild(card);
  document.body.appendChild(overlay);
  // 触发动画
  requestAnimationFrame(function(){
    overlay.style.opacity='1';
    card.style.transform='translateY(0)';
  });
  // 点关闭按钮
  card.querySelector('#npcCardClose').addEventListener('click',function(e){
    e.stopPropagation();
    closeNPCCard();
  });
  // 点遮罩关闭
  overlay.addEventListener('click',function(e){
    if(e.target===overlay)closeNPCCard();
  });
  // ESC 关闭
  document.addEventListener('keydown',npcCardEscHandler);
}
function npcCardEscHandler(e){
  if(e.key==='Escape')closeNPCCard();
}
function closeNPCCard(){
  var overlay=document.getElementById('npcCardOverlay');
  if(!overlay)return;
  var card=overlay.firstChild;
  overlay.style.opacity='0';
  if(card)card.style.transform='translateY(10px)';
  setTimeout(function(){
    if(overlay.parentNode)overlay.parentNode.removeChild(overlay);
  },200);
  document.removeEventListener('keydown',npcCardEscHandler);
}

// 注入 loading dots 样式
if(!document.getElementById('chatLoadingDotsStyle')){
  var s=document.createElement('style');
  s.id='chatLoadingDotsStyle';
  s.textContent=
    '.chat-loading-dots{display:inline-flex;gap:4px;align-items:center;padding:2px 0}'+
    '.chat-loading-dots .dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--text-muted);animation:chatDotPulse 1.2s infinite ease-in-out}'+
    '.chat-loading-dots .dot:nth-child(2){animation-delay:0.2s}'+
    '.chat-loading-dots .dot:nth-child(3){animation-delay:0.4s}'+
    '@keyframes chatDotPulse{0%,80%,100%{opacity:0.3;transform:scale(0.8)}40%{opacity:1;transform:scale(1)}}';
  document.head.appendChild(s);
}

function init(){
try{var saved=localStorage.getItem('activeProfile');if(saved&&(saved==='linxiwu'||saved==='luojin'))currentProfile=saved;}catch(e){}
var contacts=getContacts(currentProfile);currentContact=contacts.length?contacts[0].id:'';
document.body.setAttribute('data-profile',currentProfile);
document.getElementById('currentProfileName').textContent=currentProfile==='linxiwu'?'林栖梧':'罗烬';
document.getElementById('profileSwitchBtn').textContent='切换到 '+(currentProfile==='linxiwu'?'罗烬':'林栖梧');
renderContacts(currentProfile);if(currentContact)renderChat(currentProfile,currentContact);
console.log('✉ 传讯符 AI 版已加载');
}
document.addEventListener('DOMContentLoaded',init);
window.switchProfile=switchProfile;

// ===== 手机端视口自适应补丁(保留原版) =====
(function(){
if(!window.visualViewport)return;
var vv=window.visualViewport;
var apply=function(){if(document.body){document.body.style.height=vv.height+'px';document.body.style.minHeight=vv.height+'px';}};
apply();
vv.addEventListener('resize',apply);
})();
})();
