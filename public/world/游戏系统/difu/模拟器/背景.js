// ===== 背景.js · 全局背景图开关 v2 =====
// 修复:用 linear-gradient 叠加遮罩,不用 body::after,避免遮挡内容

(function(){
'use strict';

var BG_KEY='gzd_bg_on';
var BG_URL='首页图.jpg'; // ★ 改这里换背景图

function isBgOn(){
  try{return localStorage.getItem(BG_KEY)==='true';}catch(e){return false;}
}

function applyBg(on){
  var existing=document.getElementById('gzd-bg-style');
  if(existing) existing.remove();
  if(!on) return;

  var s=document.createElement('style');
  s.id='gzd-bg-style';
  // ★ 关键:用 linear-gradient 叠加在背景图上,暗色遮罩直接和图片合在一起
  // 不需要 body::after,不会遮挡内容
  s.textContent=
    // 夜间模式:暗色遮罩 0.5
    'body{'+
      'background:' +
        'linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.5)),' +
        'url("'+BG_URL+'") center/cover no-repeat fixed ' +
      '!important;'+
    '}'+
    // 日间模式:浅色遮罩 0.15
    '[data-theme="light"] body{'+
      'background:' +
        'linear-gradient(rgba(255,255,255,0.15),rgba(255,255,255,0.15)),' +
        'url("'+BG_URL+'") center/cover no-repeat fixed ' +
      '!important;'+
    '}';
  document.head.appendChild(s);
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
  if(document.getElementById('bgToggleBtn')) return;
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
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',insertBtn);
  }else{
    insertBtn();
  }
  window.addEventListener('pageshow',function(){
    applyBg(isBgOn());
    updateBtn();
  });
  window.addEventListener('storage',function(e){
    if(e.key===BG_KEY){
      applyBg(isBgOn());
      updateBtn();
    }
  });
}

init();
})();
