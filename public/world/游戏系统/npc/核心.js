/* ============================================================
   千律州 · https://sfile.chatglm.cn/workspace/file/8d/8d96650769.js（精简版 v1）
   职责：内页与壳之间的翻译官。
   - 在壳内：手势/切歌/主题/站内导航 转告壳，音乐播放权归壳；
   - 单独打开：自立门户，内建播放器照常接续；
   - 站内 .html 链接自动拦截走壳内换页（BGM 不断）。
   用法（内页底部引入）：
     <script src="./https://sfile.chatglm.cn/workspace/file/8d/8d96650769.js" data-bgm="音乐1.mp3"></script>
   内页可控接口：
     QLZ_Music.play(url,name) / pause() / resume() / stop() / toggle()
   ============================================================ */
   (function(){
    'use strict';
    var script=(function(){var ss=document.getElementsByTagName('script');return ss[ss.length-1];})();
    var DATA_BGM=script&&script.getAttribute('data-bgm')||'';
    var IN_SHELL=false;
    try{IN_SHELL=(window.parent!==window)&&!!window.parent.QLZ_SHELL;}catch(e){IN_SHELL=false;}
    function tell(msg){try{window.parent.postMessage(msg,'*');}catch(e){}}
   
    /* ===== 音乐接口：壳模式转告 / 独立模式自管 ===== */
    var localAudio=null,localOn=false,localCur={url:'',name:''};
    function localPlay(url,name){
      if(!localAudio){localAudio=new Audio();localAudio.volume=.7;}
      if(localCur.url!==url){localAudio.src=url;localCur={url:url,name:name};}
      var p=localAudio.play();if(p&&p.catch)p.catch(function(){});
      localOn=true;
      if(DATA_BGM){try{localStorage.setItem('qlz_bgm',JSON.stringify({on:true,index:0,url:url,name:name}));}catch(e){}}
    }
    function localPause(){if(localAudio)localAudio.pause();localOn=false;}
    window.QLZ_Music={
      inShell:function(){return IN_SHELL;},
      play:function(url,name){
        if(!url)return;
        if(IN_SHELL)tell({type:'qlz:track',url:url,name:name});
        else localPlay(url,name);
      },
      pause:function(){if(IN_SHELL)tell({type:'qlz:pause'});else localPause();},
      resume:function(){if(IN_SHELL)tell({type:'qlz:resume'});else if(localAudio){var p=localAudio.play();if(p&&p.catch)p.catch(function(){});localOn=true;}},
      stop:function(){if(IN_SHELL)tell({type:'qlz:stop'});else localPause();},
      toggle:function(){if(IN_SHELL)tell({type:'qlz:toggle'});else{localOn?localPause():localPlay(localCur.url||DATA_BGM,localCur.name||'音乐');}}
    };
   
    /* ===== 手势转告：移动端自动播放策略的通行证 ===== */
    function gesture(){
      if(IN_SHELL)tell({type:'qlz:gesture'});
      else if(DATA_BGM&&!localOn)localPlay(DATA_BGM,'音乐');
    }
    document.addEventListener('touchend',gesture,{once:true,passive:true});
    document.addEventListener('click',gesture,{once:true,passive:true});
   
    /* ===== 主题转告：观察 body.night ===== */
    function notifyTheme(){
      if(IN_SHELL)tell({type:'qlz:theme',night:document.body.classList.contains('night')});
    }
    if(window.MutationObserver){
      new MutationObserver(notifyTheme).observe(document.body,{attributes:true,attributeFilter:['class']});
    }else{
      document.body.addEventListener('click',function(){setTimeout(notifyTheme,0);});
    }
   
    /* ===== 站内导航拦截：.html 链接走壳内换页（BGM 不断） ===== */
    document.addEventListener('click',function(e){
      var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;
      if(!a)return;
      var href=a.getAttribute('href')||'';
      if(!/\.html(\?|#|$)/.test(href)||/^https?:/i.test(href)&&href.indexOf(location.host)===-1&&/^https?:/i.test(href))return;
      if(/^(https?:)?\/\//.test(href)&&href.indexOf(location.host)===-1)return;
      if(href.charAt(0)==='#')return;
      e.preventDefault();
      if(IN_SHELL)tell({type:'qlz:nav',href:href});
      else location.href=href;
    },true);
  })();