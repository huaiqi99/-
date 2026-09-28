// ===== 背景.js · 全局背景图开关 =====
// 被 核心.js 和 非 核心.js 页面共同加载
// 在侧边栏动态插入开关按钮,不需要改任何 HTML

(function(){
'use strict';

var BG_KEY='gzd_bg_on';
var BG_URL='首页图.jpg'; // ★ 改这里换背景图

function isBgOn(){
  try{return localStorage.getItem(BG_KEY)==='true';}catch(e){return false;}
}

function applyBg(on){
  var existing=document.getElementById('gzd-bg-style');
  if(on){
    if(!existing){
      var s=document.createElement('style');
      s.id='gzd-bg-style';
      s.textContent=
        'body{background:url("'+BG_URL+'") center/cover no-repeat fixed var(--bg-body) !important;}'+
        // 夜间模式:在背景图上加一层暗色遮罩,不挡卡片
        'body::after{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;'+
        'background:rgba(0,0,0,0.45);}'+
        '[data-theme="light"] body::after{background:rgba(255,255,255,0.15);}'+
        // 卡片和侧边栏保持实色,在遮罩之上
        '.card,.sidebar-panel,.sidebar-tab,.float-btn,.modal-content{position:relative;z-index:1;}';
      document.head.appendChild(s);
    }
  }else{
    if(existing) existing.remove();
  }
}

function updateBtn(){
  var btn=document.getElementById('bgToggleBtn');
  if(!btn) return;
  var on=isBgOn();
  btn.textContent=(on?'🖼 背景图: 开':'🖼 背景图: 关');
}

function toggleBg(){
  var newOn=!isBgOn();
  try{localStorage.setItem(BG_KEY,newOn?'true':'false');}catch(e){}
  applyBg(newOn);
  updateBtn();
}

// 插入侧边栏按钮
function insertBtn(){
  var sidebar=document.getElementById('sidebarPanel');
  if(!sidebar) return;
  if(document.getElementById('bgToggleBtn')) return; // 已插入
  var btn=document.createElement('button');
  btn.id='bgToggleBtn';
  btn.className='profile-switch-btn';
  btn.style.marginTop='6px';
  btn.addEventListener('click',toggleBg);
  var switchBtn=document.getElementById('profileSwitchBtn');
  if(switchBtn){
    sidebar.insertBefore(btn,switchBtn);
  }else{
    var footer=sidebar.querySelector('.panel-footer');
    if(footer){
      sidebar.insertBefore(btn,footer);
    }else{
      sidebar.appendChild(btn);
    }
  }
  updateBtn();
}

// 启动
function init(){
  applyBg(isBgOn());
  // 等侧边栏渲染完再插按钮
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',insertBtn);
  }else{
    insertBtn();
  }
  // 从其他页面返回时刷新
  window.addEventListener('pageshow',function(){
    applyBg(isBgOn());
    updateBtn();
  });
  // localStorage 跨页面同步
  window.addEventListener('storage',function(e){
    if(e.key===BG_KEY){
      applyBg(isBgOn());
      updateBtn();
    }
  });
}

init();
})();
