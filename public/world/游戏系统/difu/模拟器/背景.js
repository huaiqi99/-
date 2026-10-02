// ===== 背景.js · 全局背景图开关 v5 =====
// v3: 支持手机端/电脑端不同图片 + 自定义上传 + 字体清晰度
// v4: 修复移动端/平板背景图被放大且跟随滚动的问题
//     原因: 之前把背景直接铺在 body 上并用了 background-attachment:fixed,
//           移动端浏览器(尤其 iframe 内)不支持该属性,背景会按整个文档高度
//           撑大并跟随内容滚动。
//     方案: 改为注入一个 position:fixed 的独立背景层 #gzd-bg-layer,
//           背景始终铺满视口且固定不动,电脑端视觉效果与 v3 一致。
// v5: 新增卡片透明度(gzd_bg_card_alpha,设置页滑块控制)。
//     通过覆盖 --bg-card 变量让所有内页卡片变半透明,透出背景图;
//     值未设置时保持各页默认外观,滑块拉满(100)即恢复默认。
 
(function(){
  'use strict';
  
  var BG_KEY='gzd_bg_on';
  var CUSTOM_BG_KEY='gzd_custom_bg';       // 自定义背景(电脑端,base64)
  var CUSTOM_BG_MOBILE_KEY='gzd_custom_bg_mobile'; // 自定义背景(手机端,base64)
  var ALPHA_KEY='gzd_bg_card_alpha';       // 卡片透明度(0.3~1,空=默认不透明)
  
  // 默认背景图路径(没有自定义时用这个)
  var BG_URL_DESKTOP='首页图.jpg';
  var BG_URL_MOBILE='手机图.jpg'; // ★ 改成手机端图片
  
  function isBgOn(){
    try{return localStorage.getItem(BG_KEY)==='true';}catch(e){return false;}
  }
  
  function getDesktopBg(){
    try{
      var custom=localStorage.getItem(CUSTOM_BG_KEY);
      if(custom) return custom;
    }catch(e){}
    return BG_URL_DESKTOP;
  }
  
  function getMobileBg(){
    try{
      var custom=localStorage.getItem(CUSTOM_BG_MOBILE_KEY);
      if(custom) return custom;
    }catch(e){}
    return BG_URL_MOBILE;
  }
  
  function getLayer(){
    var el=document.getElementById('gzd-bg-layer');
    if(!el){
      el=document.createElement('div');
      el.id='gzd-bg-layer';
      document.body.appendChild(el);
    }
    return el;
  }
  
  // ===== v5 卡片透明度 =====
  // 卡片底色:暗色 rgb(36,32,28) / 亮色 rgb(255,255,255),与各页 --bg-card 原值一致,
  // 仅把不透明度替换为滑块值,保证颜色观感不变
  function getAlpha(){
    try{
      var v=parseFloat(localStorage.getItem(ALPHA_KEY));
      if(!isNaN(v)&&v>=0.3&&v<1) return v;
    }catch(e){}
    return null; // 未设置或拉满=用各页默认
  }
  
  function applyAlpha(){
    var old=document.getElementById('gzd-bg-alpha-style');
    if(old) old.remove();
    var a=getAlpha();
    if(a===null) return;
    var s=document.createElement('style');
    s.id='gzd-bg-alpha-style';
    s.textContent=
      ':root{--bg-card:rgba(36,32,28,'+a+')!important}'+
      'html[data-theme="light"]{--bg-card:rgba(255,255,255,'+a+')!important}'+
      // 白名单:侧栏导航面板/拉手保持严格不透明(面板滑出后叠在正文上,
      // 半透明会让面板文字和底下内容混在一起)
      '.sidebar-panel,.sidebar-tab{--bg-card:#24201c!important}'+
      'html[data-theme="light"] .sidebar-panel,html[data-theme="light"] .sidebar-tab{--bg-card:#ffffff!important}';
    document.head.appendChild(s);
  }
  // 供设置页滑块拖动时本页即时刷新(同页不触发 storage 事件)
  window.gzdRefreshCardAlpha=applyAlpha;
  
  function applyBg(on){
    // 背景.js 由核心.js 加载在 body 末尾,body 必然存在;保险起见兜底一次
    if(!document.body){
      document.addEventListener('DOMContentLoaded',function(){applyBg(on);},{once:true});
      return;
    }
    var existing=document.getElementById('gzd-bg-style');
    if(existing) existing.remove();
    var oldLayer=document.getElementById('gzd-bg-layer');
    if(oldLayer) oldLayer.remove();
    if(!on) return;
  
    var desktopBg=getDesktopBg();
    var mobileBg=getMobileBg();
  
    getLayer();
  
    var s=document.createElement('style');
    s.id='gzd-bg-style';
    s.textContent=
      // 独立固定背景层:铺满视口、不随内容滚动、不拦截点击
      '#gzd-bg-layer{position:fixed;inset:0;z-index:-1;pointer-events:none}'+
      // 横屏(电脑/平板横屏):暗色遮罩 0.6 + 电脑端图
      '@media (orientation:landscape){'+
        '#gzd-bg-layer{'+
          'background:' +
            'linear-gradient(rgba(0,0,0,0.6),rgba(0,0,0,0.6)),' +
            'url("'+desktopBg+'") center/cover no-repeat'+
          ';'+
        '}'+
        '[data-theme="light"] #gzd-bg-layer{'+
          'background:' +
            'linear-gradient(rgba(255,255,255,0.25),rgba(255,255,255,0.25)),' +
            'url("'+desktopBg+'") center/cover no-repeat'+
          ';'+
        '}'+
      '}'+
      // 竖屏(手机/平板竖屏):暗色遮罩 0.6 + 手机端图
      '@media (orientation:portrait){'+
        '#gzd-bg-layer{'+
          'background:' +
            'linear-gradient(rgba(0,0,0,0.6),rgba(0,0,0,0.6)),' +
            'url("'+mobileBg+'") center/cover no-repeat'+
          ';'+
        '}'+
        '[data-theme="light"] #gzd-bg-layer{'+
          'background:' +
            'linear-gradient(rgba(255,255,255,0.25),rgba(255,255,255,0.25)),' +
            'url("'+mobileBg+'") center/cover no-repeat'+
          ';'+
        '}'+
      '}'+
      // ★ 字体清晰度:给非卡片的文字加阴影
      '.top-header,.page-title,.profile-name,.panel-title,.panel-footer,'+
      '.float-group,.float-btn,.sidebar-tab{'+
        'text-shadow:0 1px 4px rgba(0,0,0,0.5)!important;'+
      '}'+
      '[data-theme="light"] .top-header,[data-theme="light"] .page-title,'+
      '[data-theme="light"] .profile-name,[data-theme="light"] .panel-footer,'+
      '[data-theme="light"] .float-group,[data-theme="light"] .float-btn,'+
      '[data-theme="light"] .sidebar-tab{'+
        'text-shadow:0 1px 4px rgba(255,255,255,0.5)!important;'+
      '}';
    document.head.appendChild(s);
  }
  
  function updateBtn(){
    var btn=document.getElementById('bgToggleBtn');
    if(!btn) return;
    btn.textContent=(isBgOn()?'背景图: 开':'背景图: 关');
  }
  
  function toggleBg(){
    var newOn=!isBgOn();
    try{localStorage.setItem(BG_KEY,newOn?'true':'false');}catch(e){}
    applyBg(newOn);
    updateBtn();
  }
  
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
      if(footer) sidebar.insertBefore(btn,footer);
      else sidebar.appendChild(btn);
    }
    updateBtn();
  }
  
  function init(){
    applyBg(isBgOn());
    applyAlpha();
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded',insertBtn);
    }else{
      insertBtn();
    }
    window.addEventListener('pageshow',function(){
      applyBg(isBgOn());
      applyAlpha();
      updateBtn();
    });
    window.addEventListener('storage',function(e){
      if(e.key===BG_KEY||e.key===CUSTOM_BG_KEY||e.key===CUSTOM_BG_MOBILE_KEY){
        applyBg(isBgOn());
        updateBtn();
      }
      if(e.key===ALPHA_KEY||e.key===null){
        applyAlpha();
      }
    });
  }
  
  init();
  })();
  
  