// ===== 语音.js · 归终殿 TTS 语音模块 v1 =====
// 引擎: 火山引擎 豆包 TTS 2.0(单向流式 HTTP 接口, 国内直连, 无需梯子)
// 接口: POST https://openspeech.bytedance.com/api/v3/tts/unidirectional
// 模式: BYOK —— 玩家在设置页填自己的语音密钥, 仅存 localStorage, 按字计费记玩家头上
// 用法:
//   1. 页面引入: <script src="./语音.js"></script>  (本文件与页面同目录)
//   2. 暴露 window.GZDVoice:
//      GZDVoice.isReady()                 -> 是否已配置密钥且开启
//      GZDVoice.speak(text, roleName)     -> 合成并播放, Promise<Blob>
//      GZDVoice.stop()                    -> 停止当前播放
//      GZDVoice.synthesize(text, roleName)-> 只合成不播放, Promise<Blob>
//   3. 气泡播放按钮调用 speak() 即可; roleName 对不上映射表时自动回退旁白/默认音色
 
(function(){
  'use strict';
 
  var TTS_URL = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional';
  // 豆包 TTS 2.0 单向流式的资源标识
  var RESOURCE_ID = 'volc.service_type.10029';
 
  var CFG_KEY = 'gzd_tts_config';   // { appid:'应用ID', token:'访问密钥', on:true }
 
  // ===== 角色音色映射表 =====
  // 值为火山音色代码; 换音色只改这里, 不动其他代码
  var VOICE_MAP = {
    '李怀渊': 'ICL_uranus_zh_male_fuheigongzi_tob',
    '桑回燕': 'S_lGL1r7Jg2',
    '旁白':   ''   // ★ 待站长在体验中心选定后填入; 留空则用 DEFAULT_VOICE
  };
  var DEFAULT_VOICE = 'zh_male_M392_congwengfuren'; // 兜底音色, 可自行替换
 
  // ===== 配置读写 =====
  function getCfg(){
    try{ return JSON.parse(localStorage.getItem(CFG_KEY) || '{}'); }
    catch(e){ return {}; }
  }
  function setCfg(cfg){
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  }
 
  function isReady(){
    var c = getCfg();
    return !!(c.on && c.token);
  }
 
  // 资源配对(实测验证, 2026-10-01):
  //   ICL_uranus_zh_male_fuheigongzi_tob(李怀渊, 体验中心2.0官方/ICL音色) -> seed-tts-2.0
  //   S_xxx(玩家在复刻控制台的音色, 如桑回燕/旁白)                        -> seed-icl-2.0
  //   zh_xxx(官方音色)                                                   -> seed-tts-2.0
  // 之前把 ICL_ 前缀当复刻音色路由到 seed-icl-2.0 是错的, 会报 55000000
  function resolveResourceId(speaker){
    if(speaker && speaker.indexOf('S_') === 0) return 'seed-icl-2.0';
    return 'seed-tts-2.0';
  }
 
  // ===== 音色解析 =====
  function resolveVoice(roleName){
    if(roleName && VOICE_MAP[roleName]) return VOICE_MAP[roleName];
    var narration = VOICE_MAP['旁白'];
    return narration || DEFAULT_VOICE;
  }
 
  // ===== 核心: 调火山流式接口, 返回 mp3 Blob =====
  // 响应为按行分隔的 JSON(部分行可能带 "data:" 前缀), data 字段是 base64 音频分片
  function synthesize(text, roleName){
    var cfg = getCfg();
    if(!cfg.token){
      return Promise.reject(new Error('未配置语音密钥,请到设置页填写'));
    }
    text = (text || '').trim();
    if(!text) return Promise.reject(new Error('没有可朗读的文本'));
    // 防超额: 单次朗读截断到 500 字(单条气泡远小于此)
    if(text.length > 500) text = text.slice(0, 500);
 
    var speaker = resolveVoice(roleName);
    var resourceId = resolveResourceId(speaker);
    // 请求ID: 随机 UUID(接口要求)
    var reqid = ([1e7]+''+1e3+''+4e3+''+8e3+''+1e11).replace(/1[0-9]/g, function(c){
      var r = Math.random()*16|0; return (c==='8'||c==='9') ? r.toString(16) : (r^(c&3)|8).toString(16);
    });
 
    var headers = {
      'Content-Type': 'application/json',
      'X-Api-Key': cfg.token,
      'X-Api-Resource-Id': resourceId,
      'X-Api-Request-Id': reqid
    };
 
    var body = {
      user: { uid: reqid },
      req_params: {
        text: text,
        speaker: speaker,
        model: 'seed-tts-2.0-standard',   // 复刻/官方音色均必填
        audio_params: {
          format: 'mp3',
          sample_rate: 24000,
          speech_rate: 0,     // 语速, -50~100
          loudness_rate: 0    // 音量, -50~100
        }
      }
    };
 
    // 兜底: 资源配错(55000000 mismatch)时翻转资源ID、音色不变再试一次
    function attempt(idx){
      var rid = idx === 0 ? resourceId : (resourceId === 'seed-icl-2.0' ? 'seed-tts-2.0' : 'seed-icl-2.0');
      return fetch(TTS_URL, { method: 'POST', headers: idx === 0 ? headers : Object.assign({}, headers, {'X-Api-Resource-Id': rid}), body: JSON.stringify(body) })
      .then(function(resp){
        if(!resp.ok){
          return resp.text().then(function(t){
            throw new Error('HTTP ' + resp.status + (t ? ' · ' + t.slice(0, 200) : ''));
          });
        }
        if(!resp.body) throw new Error('浏览器不支持流式响应');
 
        var reader = resp.body.getReader();
        var decoder = new TextDecoder();
        var buf = '';
        var chunks = [];   // base64 音频分片
        var errMsg = '';
 
        function handleLine(line){
          line = line.trim();
          if(!line) return;
          if(line.indexOf('data:') === 0) line = line.slice(5).trim();
          if(!line || line === '[DONE]') return;
          var obj;
          try{ obj = JSON.parse(line); }catch(e){ return; }
          if(obj.code !== undefined && obj.code !== 0){
            errMsg = obj.message || ('错误码 ' + obj.code);
            return;
          }
          if(obj.data) chunks.push(obj.data);
        }
 
        function pump(){
          return reader.read().then(function(r){
            if(r.done){
              if(buf) handleLine(buf);
              if(errMsg) throw new Error(errMsg);
              if(!chunks.length) throw new Error('接口未返回音频(检查密钥与音色代码)');
              var bin = '';
              for(var i = 0; i < chunks.length; i++){
                bin += atob(chunks[i]);
              }
              var bytes = new Uint8Array(bin.length);
              for(var j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
              return new Blob([bytes], { type: 'audio/mpeg' });
            }
            buf += decoder.decode(r.value, { stream: true });
            var idx;
            while((idx = buf.indexOf('\n')) >= 0){
              handleLine(buf.slice(0, idx));
              buf = buf.slice(idx + 1);
            }
            return pump();
          });
        }
        return pump();
      })
      .catch(function(err){
        // 资源/音色配错(55000000) -> 翻转资源ID重试一次
        var msg = (err && err.message) || '';
        if(idx === 0 && msg.indexOf('55000000') >= 0){
          return attempt(1);
        }
        throw err;
      });
    }
 
    return attempt(0);
  }
 
  // ===== 播放控制(同一时间只播一个, 新播放自动打断旧的) =====
  var currentAudio = null;
 
  function stop(){
    if(currentAudio){
      currentAudio.pause();
      currentAudio = null;
    }
  }
 
  function speak(text, roleName){
    stop();
    return synthesize(text, roleName).then(function(blob){
      return new Promise(function(resolve, reject){
        var audio = new Audio(URL.createObjectURL(blob));
        currentAudio = audio;
        audio.onended = function(){ if(currentAudio === audio) currentAudio = null; resolve(blob); };
        audio.onerror = function(){ reject(new Error('音频播放失败')); };
        audio.play().catch(function(){ reject(new Error('浏览器拦截了播放,请再点一次')); });
      });
    });
  }
 
  // ===== 暴露 API =====
  window.GZDVoice = {
    synthesize: synthesize,
    speak: speak,
    stop: stop,
    isReady: isReady,
    getCfg: getCfg,
    setCfg: setCfg,
    VOICE_MAP: VOICE_MAP,
    TTS_URL: TTS_URL
  };
})();