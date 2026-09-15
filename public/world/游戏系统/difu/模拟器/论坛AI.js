// ===== 论坛AI.js · 发帖+存储+AI回复 v1 =====
// 复用 difu-chat Worker 的 NPC 性格设定
// 部署:上传到 模拟器/ 目录,在 帖子.html 和 论坛页面引用

(function(){
'use strict';

var POST_STORAGE_KEY='gzd_forum_posts';
var CONFIG_KEY='gzd_ai_config';
var CHAT_WORKER_URL='https://difu-chat.2629885225.workers.dev';
var MAX_REPLIES=50;

var PROVIDER_CONFIG={
  deepseek:{baseUrl:'https://api.deepseek.com',defaultModel:'deepseek-chat',format:'openai'},
  openai:{baseUrl:'https://api.openai.com',defaultModel:'gpt-4o-mini',format:'openai'},
  claude:{baseUrl:'https://api.anthropic.com',defaultModel:'claude-3-5-sonnet-20241022',format:'claude'},
  custom:{baseUrl:'',defaultModel:'',format:'openai'}
};

// ===== 简化版NPC设定(论坛回复用) =====
var NPC_LIST=[
  {id:'luanfangqi',name:'栾方棋',desc:'温和好说话,佛系咸鱼,内心吐槽役。说话带笑意,偶尔叹气。',style:'温和、带笑意、偶尔叹气'},
  {id:'linhuai',name:'林淮',desc:'冷面寡言,话少得可怜。偶尔语出惊人,冷脸萌。',style:'极简,基本只有"嗯""好""行"几个字'},
  {id:'luoxiu',name:'罗修',desc:'玩世不恭,大大咧咧,毒舌刻薄,自来熟。嘴上不饶人但护短。',style:'大大咧咧,嘴上不饶人'},
  {id:'weiyuanjing',name:'魏元璟',desc:'傲娇,刀子嘴豆腐心,小野猫。嘴上嫌弃实则关心。',style:'嘴上不饶人,阴阳怪气'},
  {id:'chengmuqi',name:'程木栖',desc:'温和端方,实际偷懒翘班看话本。偶尔促狭。',style:'温和,偶尔促狭'},
  {id:'caike',name:'蔡可',desc:'活泼开朗,嘴巴甜,爱撒娇。可爱小姑娘,在栖梧馆帮配药。',style:'活泼,带"哦""呢""嘛"语气词'},
  {id:'luojin',name:'罗烬',desc:'咋咋呼呼,精力旺盛,嘴皮子利索。面对林栖梧会结巴。',style:'咋呼,嘴利'},
  {id:'linxiwu',name:'林栖梧',desc:'温润端方,识大体。话不多但每句都有分量。',style:'温和有礼,话不多'},
  {id:'suwan',name:'苏晚',desc:'热情,做烤红薯总是糊。',style:'热情,话多'},
  {id:'mutang',name:'慕晚棠',desc:'八卦,爱调侃。',style:'八卦,调侃'},
  {id:'hezhao',name:'何照野',desc:'大大咧咧,爱切磋。',style:'随意,自来熟'},
];

function getRandomNpc(excludeProfile){
  var pool=NPC_LIST.filter(function(n){return n.id!==excludeProfile;});
  return pool[Math.floor(Math.random()*pool.length)];
}

function loadAIConfig(){try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}');}catch(e){return{};}}
function getProfile(){try{return localStorage.getItem('activeProfile')||'linxiwu';}catch(e){return'linxiwu';}}

// ===== 帖子存档 =====
function loadPosts(profile){
  try{
    var all=JSON.parse(localStorage.getItem(POST_STORAGE_KEY)||'{}');
    return all[profile]||[];
  }catch(e){return[];}
}
function savePosts(profile, posts){
  try{
    var all=JSON.parse(localStorage.getItem(POST_STORAGE_KEY)||'{}');
    all[profile]=posts;
    localStorage.setItem(POST_STORAGE_KEY,JSON.stringify(all));
  }catch(e){}
}
function getPost(profile, postId){
  var posts=loadPosts(profile);
  return posts.find(function(p){return p.id===postId;});
}
function createPost(profile, title, content, category){
  var posts=loadPosts(profile);
  var playerName=profile==='luojin'?'罗烬':'林栖梧';
  var post={
    id:'post_'+Date.now(),
    title:title,
    content:content,
    author:playerName,
    date:new Date().toLocaleDateString('zh-CN'),
    category:category||'闲聊',
    replies:[]
  };
  posts.unshift(post);
  savePosts(profile, posts);
  return post;
}
function addReply(profile, postId, author, text, isAI){
  var posts=loadPosts(profile);
  var post=posts.find(function(p){return p.id===postId;});
  if(!post) return false;
  if(post.replies.length>=MAX_REPLIES) return false;
  post.replies.push({author:author, text:text, isAI:isAI});
  savePosts(profile, posts);
  return true;
}

// ===== AI 回复(双模式) =====
async function callForumAI(postTitle, postContent, replies, npc, profile){
  var cfg=loadAIConfig();
  if(cfg.apiKey && cfg.provider){
    return await callDirect(postTitle, postContent, replies, npc, profile, cfg);
  } else {
    return await callWorker(postTitle, postContent, replies, npc, profile);
  }
}

function buildForumPrompt(npc, profile){
  var playerName=profile==='luojin'?'罗烬':'林栖梧';
  return '你是「引渡人模拟器·归终殿」的论坛回复 AI。\n\n【世界观】\n苍珩四百三十五年,地府归终殿执掌亡魂引渡与功过裁定。殿辖符修院、讲武堂、音律坊与忘川东段。\n\n【你要扮演的角色】\n'+npc.name+':'+npc.desc+'\n说话风格:'+npc.style+'\n\n【当前玩家】'+playerName+'\n\n【你的任务】\n你要以'+npc.name+'的身份,在归终殿弟子讨论区回复一篇帖子。\n\n【要求】\n1. 用'+npc.name+'的语气和性格回复\n2. 回复控制在150字以内\n3. 自然、有生活气息、符合角色性格\n4. 可以引用世界观中的地点、人物、事件\n5. 不要替玩家说话\n6. 只输出回复内容,不要输出其他格式';
}

function buildUserMessage(postTitle, postContent, replies){
  var msg='帖子标题:'+postTitle+'\n\n帖子内容:'+postContent;
  if(replies && replies.length>0){
    msg+='\n\n之前的回复:\n';
    replies.slice(-5).forEach(function(r){
      msg+=r.author+': '+r.text+'\n';
    });
    msg+='\n请基于帖子内容和之前的回复,继续以你的角色身份发表看法。';
  } else {
    msg+='\n请对这篇帖子发表你的看法。';
  }
  return msg;
}

async function callDirect(postTitle, postContent, replies, npc, profile, cfg){
  var pConfig=PROVIDER_CONFIG[cfg.provider]||PROVIDER_CONFIG.deepseek;
  var baseUrl=cfg.provider==='custom'?(cfg.customUrl||''):pConfig.baseUrl;
  var model=cfg.model||pConfig.defaultModel;
  if(!baseUrl) throw new Error('接口地址为空');

  var systemPrompt=buildForumPrompt(npc, profile);
  var userMessage=buildUserMessage(postTitle, postContent, replies);

  // 构造历史(把之前的回复转成 messages 格式)
  var history=[];
  if(replies && replies.length>0){
    replies.slice(-5).forEach(function(r){
      history.push({role:'assistant',content:r.author+': '+r.text});
    });
  }

  var messages=[
    {role:'system',content:systemPrompt},
    ...history,
    {role:'user',content:userMessage}
  ];

  var url, headers, body;
  if(pConfig.format==='claude'){
    url=baseUrl+'/v1/messages';
    headers={'Content-Type':'application/json','x-api-key':cfg.apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'};
    body=JSON.stringify({model:model,max_tokens:300,system:systemPrompt,messages:messages.filter(function(m){return m.role!=='system';})});
  } else {
    url=baseUrl+'/v1/chat/completions';
    headers={'Content-Type':'application/json','Authorization':'Bearer '+cfg.apiKey};
    body=JSON.stringify({model:model,messages:messages,max_tokens:300,temperature:0.85});
  }
  var resp=await fetch(url,{method:'POST',headers:headers,body:body});
  var data=await resp.json();
  if(!resp.ok){
    var errMsg=(data.error&&data.error.message)||data.error||JSON.stringify(data);
    if(resp.status===401) throw new Error('API Key 无效');
    if(resp.status===402) throw new Error('余额不足');
    throw new Error('AI 返回错误('+resp.status+'):'+errMsg);
  }
  var reply='';
  if(pConfig.format==='claude') reply=data.content?.[0]?.text||'';
  else reply=data.choices?.[0]?.message?.content||'';
  if(!reply) throw new Error('AI 返回空内容');
  return reply;
}

async function callWorker(postTitle, postContent, replies, npc, profile){
  var history=replies?replies.slice(-5).map(function(r){
    return {side:r.isAI?'left':'right',sender:'self',text:r.author+': '+r.text};
  }):[];

  var resp=await fetch(CHAT_WORKER_URL,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      message:buildUserMessage(postTitle, postContent, replies),
      npcId:npc.id,
      profile:profile,
      history:history
    })
  });
  var data=await resp.json();
  if(data.error) throw new Error(data.error);
  return data.reply;
}

// ===== HTML 转义 =====
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ===== 暴露到全局 =====
window.ForumAI={
  loadPosts:loadPosts,
  savePosts:savePosts,
  getPost:getPost,
  createPost:createPost,
  addReply:addReply,
  callForumAI:callForumAI,
  getRandomNpc:getRandomNpc,
  NPC_LIST:NPC_LIST,
  MAX_REPLIES:MAX_REPLIES,
  esc:esc
};

console.log('▣ 论坛AI.js 已加载');
})();
