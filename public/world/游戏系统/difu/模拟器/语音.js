// ===== 语音.js · 归终殿 TTS 语音模块 v2 =====
// 引擎: MiniMax 语音合成 T2A v2(同步 HTTP 接口, 国内直连, 无需梯子)
// 接口: POST https://{host}/v1/t2a_v2?GroupId={gid}
// 模式: BYOK —— 玩家在设置页填自己的密钥, 仅存 localStorage, 按字计费记玩家头上
// 变更记录: v1 为火山引擎(其 CORS 不放行自定义头, 浏览器无法直连, 已弃用)
//           v2 切换 MiniMax, CORS 实测放行 Authorization(2026-10-02)
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
 
  // 三个域名 CORS 均实测放行; 默认国内新版控制台对应域名, 报网络错可在设置页切换
  var HOSTS = ['api.minimax.cn', 'api.minimaxi.com', 'api.minimax.chat'];
 
  var CFG_KEY = 'gzd_tts_config';   // { key:'API密钥', gid:'GroupID', host:'域名', model:'模型', on:true }
 
  // ===== 角色音色映射表 =====
  // 值为 MiniMax voice_id; 换音色只改这里, 不动其他代码
  // ★ 待站长在 www.minimaxi.com 语音体验中心选定后替换(当前为临时占位音色)
  var VOICE_MAP = {
    '李怀渊': 'male-qn-qingse',   // 临时: 青涩青年, 待替换
    '桑回燕': 'ttv-voice-2026100201490426-EM7j6MD5',    // 临时: 少女, 待替换
    '旁白':   'ttv-voice-2026100201590526-IZuGcELZ'                  // 留空则用 DEFAULT_VOICE
  };
  var DEFAULT_VOICE = 'presenter_male'; // 兜底音色(演讲男), 可自行替换
 
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
    return !!(c.on && c.key && c.gid);
  }
 
  // ===== 音色解析 =====
  function resolveVoice(roleName){
    if(roleName && VOICE_MAP[roleName]) return VOICE_MAP[roleName];
    var narration = VOICE_MAP['旁白'];
    return narration || DEFAULT_VOICE;
  }
 
  // ===== 核心: 调 MiniMax 同步接口, 返回 mp3 Blob =====
  // 响应为 JSON, data.audio 是十六进制编码的 mp3
  function synthesize(text, roleName){
    var cfg = getCfg();
    if(!cfg.key || !cfg.gid){
      return Promise.reject(new Error('未配置语音密钥,请到设置页填写'));
    }
    text = (text || '').trim();
    if(!text) return Promise.reject(new Error('没有可朗读的文本'));
    // 防超额: 单次朗读截断到 500 字(单条气泡远小于此)
    if(text.length > 500) text = text.slice(0, 500);
 
    var host = cfg.host || HOSTS[0];
    var model = cfg.model || 'speech-02-hd';
    var speaker = resolveVoice(roleName);
 
    var body = {
      model: model,
      stream: false,
      text: text,
      voice_setting: {
        voice_id: speaker,
        speed: 1.0,
        vol: 1.0,
        pitch: 0
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: 'mp3',
        channel: 1
      }
    };
 
    return fetch('https://' + host + '/v1/t2a_v2?GroupId=' + encodeURIComponent(cfg.gid), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + cfg.key
      },
      body: JSON.stringify(body)
    })
    .then(function(resp){
      return resp.json().then(function(j){
        var br = j.base_resp || {};
        if(br.status_code && br.status_code !== 0){
          var msg = 'HTTP ' + resp.status + ' · 错误码 ' + br.status_code + ' · ' + (br.status_msg || '');
          if(br.status_code === 1004) msg += '(密钥无效或与GroupID不配)';
          else if(br.status_code === 1039) msg += '(额度不足/未开通)';
          else if(br.status_code === 2049 || br.status_code === 1008) msg += '(模型或参数问题)';
          throw new Error(msg);
        }
        var audio = j.data && j.data.audio;
        if(!audio) throw new Error('接口未返回音频(检查音色代码)');
        // 十六进制 -> 字节 -> mp3 Blob
        var bytes = new Uint8Array(audio.length / 2);
        for(var i = 0; i < bytes.length; i++){
          bytes[i] = parseInt(audio.substr(i * 2, 2), 16);
        }
        return new Blob([bytes], { type: 'audio/mpeg' });
      });
    });
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
    HOSTS: HOSTS
  };
})();