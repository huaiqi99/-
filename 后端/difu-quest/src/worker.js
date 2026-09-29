// ===== 引渡人模拟器 · 外勤任务 Worker v1 =====
// 专门负责外勤页面的 AI 调用
// 与 difu-ai(剧情)、difu-chat(传讯符)独立,互不影响
//
// 接收前端发来的 JSON:
// {
//   action: "generate" | "execute" | "complete",
//   profile: "linxiwu" 或 "luojin",
//   ...其他参数
// }
//
// 返回:
// { success: true, data: {...} }  或  { error: "..." }

export default {
    async fetch(request, env) {
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };
  
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }
  
      if (request.method !== 'POST') {
        return new Response(
          JSON.stringify({ error: '外勤 Worker 已启动 ✓ 但只接受 POST 请求(这是正常的)' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
  
      try {
        const body = await request.json();
        const action = body.action || '';
        const profile = body.profile || 'linxiwu';
  
        let systemPrompt = '';
        let userMessage = '';
  
        // ===== 根据不同 action 构造不同的 prompt =====
        if (action === 'generate') {
          // 生成 3 个任务
          systemPrompt = buildGeneratePrompt(profile);
          // 如果有排除列表,告诉 AI 避开
          var excludeStr = '';
          if (body.excludeTitles && body.excludeTitles.length > 0) {
            excludeStr = '\n\n【已生成过的任务,请避开以下主题,不要重复】\n' + body.excludeTitles.join('、');
          }
          userMessage = '请生成 3 个适合当前玩家角色的外勤任务,严格按照 JSON 格式输出。' + excludeStr;
        } else if (action === 'execute') {
          // 生成执行剧情(第一轮,带选项)
          systemPrompt = buildExecutePrompt(profile);
          userMessage = `任务信息:
  任务名:${body.questName || ''}
  委托人:${body.client || ''}
  地点:${body.location || ''}
  难度:${body.difficulty || ''}
  描述:${body.description || ''}
  
  这是任务执行的第一轮。请生成第一段剧情(100-200字,第二人称"你"叙述),然后给出2-3个选项让玩家选择下一步行动。
  
  严格按以下 JSON 格式输出,不要输出任何其他文字:
  {
    "narrative": "第一段剧情文字",
    "options": [
      {"id": "A", "text": "选项A的简短描述"},
      {"id": "B", "text": "选项B的简短描述"}
    ],
    "isLast": false
  }`;
        } else if (action === 'continue') {
          // 续写剧情(玩家选了某个选项后)
          systemPrompt = buildExecutePrompt(profile);
          var historyStr = '';
          if (body.execHistory && body.execHistory.length > 0) {
            historyStr = '\n\n【之前发生的剧情】\n';
            body.execHistory.forEach(function(h){
              historyStr += '剧情:' + h.narrative + '\n';
              if(h.choice) historyStr += '玩家选择了:' + h.choice + '\n\n';
            });
          }
          var round = body.round || 2;
          var isLastRound = (round >= 3);  // 第3轮是最后一轮
  
          userMessage = `任务信息:
  任务名:${body.questName || ''}
  委托人:${body.client || ''}
  地点:${body.location || ''}
  难度:${body.difficulty || ''}
  描述:${body.description || ''}${historyStr}
  
  玩家刚才选择了:${body.choice || ''}
  
  这是第${round}轮(共3轮)。${isLastRound ? '这是最后一轮,请生成最终剧情(100-200字),不要给选项,isLast设为true。' : '请生成下一段剧情(100-200字),然后给出2-3个新选项。'}
  
  严格按以下 JSON 格式输出:
  {
    "narrative": "剧情文字",
    "options": [${isLastRound ? '' : '{"id":"A","text":"..."},{"id":"B","text":"..."}'}],
    "isLast": ${isLastRound}
  }`;
        } else if (action === 'complete') {
          // 生成结果 + 回执单
          systemPrompt = buildCompletePrompt(profile);
          userMessage = `任务信息:
  任务名:${body.questName || ''}
  委托人:${body.client || ''}
  地点:${body.location || ''}
  难度:${body.difficulty || ''}
  描述:${body.description || ''}
  执行剧情:${body.narrative || ''}
  
  请生成任务结果和回执单,严格按照 JSON 格式输出。`;
        } else {
          return new Response(
            JSON.stringify({ error: '未知的 action: ' + action + '。支持:generate, execute, complete' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
  
        // ===== 调用 DeepSeek API =====
        const aiResponse = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage }
            ],
            max_tokens: 2000,
            temperature: 0.85
          })
        });
  
        const aiData = await aiResponse.json();
  
        if (!aiData.choices || !aiData.choices[0]) {
          return new Response(
            JSON.stringify({ error: 'AI 返回异常: ' + JSON.stringify(aiData) }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
  
        const reply = aiData.choices[0].message.content;
  
        // ===== 根据不同 action 解析返回 =====
        let result = {};
        if (action === 'generate') {
          // 解析 JSON,提取 3 个任务
          result = parseQuestList(reply);
        } else if (action === 'execute' || action === 'continue') {
          // 解析 JSON,提取剧情 + 选项
          result = parseExecuteResult(reply);
        } else if (action === 'complete') {
          // 解析 JSON,提取结果和回执单
          result = parseCompleteResult(reply);
        }
  
        return new Response(
          JSON.stringify({ success: true, data: result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
  
      } catch (error) {
        return new Response(
          JSON.stringify({ error: '服务器出错: ' + error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
  };
  
  // ====================================================================
  // ===== Prompt 构造函数 =====
  // ====================================================================
  
  function buildGeneratePrompt(profile){
    const playerName = profile === 'luojin' ? '罗烬' : '林栖梧';
    const playerDesc = profile === 'luojin'
      ? '罗烬:讲武堂弟子,承刀法一脉,罗修与魏元璟之子。性情刚直果决咋咋呼呼。当前层级:统修期。'
      : '林栖梧:符修院助教,身负浮生树血脉,林淮与栾方棋之女。性情内敛重情,擅符箓与感知。当前层级:统修期,评级甲等下品。';
  
    return `你是「引渡人模拟器·归终殿」的外勤任务生成 AI。
  
  【当前玩家角色】
  ${playerDesc}
  
  【世界观】
  苍珩四百三十五年,地府归终殿执掌亡魂引渡与功过裁定。殿辖符修院、讲武堂、音律坊与忘川东段。归终殿由阎罗十殿正式册立,为地府第十殿。殿内引渡人行走阴阳,引渡亡魂。如今已有弟子两千余人。
  
  【主要地点】
  归终殿中枢——正殿、试炼司、殿务司所在。
  符修院——栾方棋坐镇,以符箓之术传授弟子,院内女弟子居多。
  讲武堂——罗修执教,主修刀法，魂术，其余武功杂学皆在此修习,弟子对罗修又敬又怕。
  点苍阁——林淮执掌,主修枪法，体术指导。弟子多是想成为林淮那样的人的。
  音律坊——程木栖主理,主修琴音破阵之术，魏元璟副理，主修笛渡魂之术,由于程木栖忙于栖梧馆，如今音律课多由魏元璟代上。
  砺峰阁——魏元璟主掌，是归终殿魂力与冥想的核心院阁，同时也负责每个新入门的统修期弟子的体能训练。
  忘川东段——魂流汇聚之地,弟子常在此处实习引渡。
  人间——引渡人的实战场地，常面临穷凶极恶的恶鬼、妖邪等。
  栖梧馆——程木栖开设的医馆,弟子受伤后首选之地。
  浮生巨树（正式命：灵枢轮回木）——栾方棋与林淮血脉滋养的神树,本为天庭神器，后认主栾方棋与林淮，现在是归终殿的镇殿之宝,树下是弟子休憩聊天独处的常去之地。
  浑天鉴——位于人间皇室、重要中枢、各大地区皆有设定。是人间用于联系地府的地方，遇到涉及阴阳的棘手事会直接联系到归终殿。
  阵法堂——由第三席执掌，专攻阵法与符阵的实战应用。
  工造司——由第四席执掌，负责归终殿兵器锻造与维修。
  澄心堂——第六席执掌，专攻剑修与剑法传承。
  百草堂——第八席执掌，专攻用毒与药理，与栖梧馆深度合作。
  
  【主要NPC】
  栾方棋——符修院执教,第一符修,林栖梧生父之一。温和好说话但内心吐槽役。
  林淮——第二席,第一枪修,林栖梧生父之一。冷面寡言但极护短,深度路痴。
  罗修——首席引渡人,讲武堂执教,罗烬之父。玩世不恭但最护短,刀修。
  魏元璟——第十席,罗烬之母。傲娇刀子嘴豆腐心,擅魂术与体术。
  程木栖——栖梧馆主事,前第二席。温和端方但偷懒看话本,十指尽废转修医道。
  
  【战力与晋升体系】
  弟子分六层:杂役→统修期→入门期→内门期→准十席级→十席。
  统修期弟子六科:符法、刀法、阵法、枪法、引渡实务、魂力控制/医药基础。
  统修期→入门期:六科考核均≥60分。
  
  【殿规】
  不可轻视杂役;不可对十席不敬;晋升须经正规测试。
  
  【你的任务】
  为当前玩家(${playerName})生成 3 个适合其等级(统修期)的外勤任务。
  
  任务类型可以包括:
  - 日常差事(如:清理、整理、值守、教学辅助)
  - 外勤任务(如:巡逻、引渡、押运、勘查)
  - 特殊委托(如:NPC 个人委托、紧急任务)
  
  任务难度分:简单、中等、偏难(统修期弟子不宜超过"偏难")。
  
  【输出格式】
  必须严格输出以下 JSON 格式,不要输出任何其他文字(不要输出 markdown 代码块标记):
  
  {
    "quests": [
      {
        "id": "quest_1",
        "title": "任务名称",
        "dept": "所属部门(符修院/讲武堂/外勤/栖梧馆/砺峰阁/点苍阁/工造司/殿务司)",
        "issuer": "委托人姓名(NPC名或机构名)",
        "location": "任务地点",
        "difficulty": "简单/中等/偏难",
        "reward": "奖励内容(如:魂力+8,战力+3,贡献度+5)",
        "description": "任务描述(30-60字,说明任务内容和背景)"
      },
      {
        "id": "quest_2",
        ... 第二个任务
      },
      {
        "id": "quest_3",
        ... 第三个任务
      }
    ]
  }
  
  【重要约束】
  1. 必须输出纯 JSON,不要用 \`\`\`json 代码块包裹
  2. 3 个任务的类型要有差异(不要全是日常差事)
  3. 奖励要合理,符合统修期弟子的水平
  4. 委托人如果是 NPC,要符合该 NPC 的身份和性格
  5. 任务描述要简洁有力,有地府古风氛围`;
  }
  
  function buildExecutePrompt(profile){
    const playerName = profile === 'luojin' ? '罗烬' : '林栖梧';
    const playerDesc = profile === 'luojin'
      ? '罗烬:讲武堂弟子,承刀法一脉,罗修与魏元璟之子。性情刚直果决咋咋呼呼。当前层级:统修期。'
      : '林栖梧:符修院助教,身负浮生树血脉,林淮与栾方棋之女。性情内敛重情,擅符箓与感知。当前层级:统修期,评级甲等下品。';
  
    return `你是「引渡人模拟器·归终殿」的外勤执行剧情 AI。
  
  【当前玩家角色】
  ${playerDesc}
  
  【世界观】
  苍珩四百三十五年,地府归终殿执掌亡魂引渡与功过裁定。殿辖符修院、讲武堂、音律坊与忘川东段。
  
  【风格要求】
  古风地府基调,第二人称"你"叙述。200-400字。善用细节与氛围,不要直白抒情。
  描写玩家执行任务的过程:到达地点、遇到的情况、采取的行动。
  不要替玩家做重大决定,只描述过程。结尾留白,不要写任务结果(结果在 complete 阶段生成)。
  
  【重要约束】
  1. 永远用第二人称"你"来叙述
  2. 不要替玩家做决定,只描述环境和过程
  3. 如果任务有战斗元素,用文字描述战斗过程(文游风格,不需要画面)
  4. 只输出剧情文字,不要输出 JSON 或其他格式`;
  }
  
  function buildCompletePrompt(profile){
    const playerName = profile === 'luojin' ? '罗烬' : '林栖梧';
    const playerDesc = profile === 'luojin'
      ? '罗烬:讲武堂弟子,承刀法一脉,罗修与魏元璟之子。性情刚直果决咋咋呼呼。当前层级:统修期。'
      : '林栖梧:符修院助教,身负浮生树血脉,林淮与栾方棋之女。性情内敛重情,擅符箓与感知。当前层级:统修期,评级甲等下品。';
  
    return `你是「引渡人模拟器·归终殿」的外勤任务结果 AI。
  
  【当前玩家角色】
  ${playerDesc}
  
  【世界观】
  苍珩四百三十五年,地府归终殿执掌亡魂引渡与功过裁定。
  
  【风格要求】
  古风地府基调,200字以内的结果描述。
  
  【你的任务】
  根据任务信息和执行剧情,生成任务结果和回执单。
  
  结果判定规则:
  - 简单任务:大概率成功(90%)
  - 中等任务:大概率成功(70%),小概率部分成功
  - 偏难任务:成功/部分成功/失败都有可能
  - 结果要符合剧情逻辑
  
  【输出格式】
  必须严格输出以下 JSON 格式,不要输出任何其他文字:
  
  {
    "result": "成功" 或 "部分成功" 或 "失败",
    "resultNarrative": "结果剧情描述(100-200字,描述任务最终结果,第二人称)",
    "rewards": "实际获得的奖励(根据结果调整,失败可能扣减)",
    "receipt": "回执单文字(50-100字,格式:'苍珩四百三十五年X月X日,${playerName}于[地点]完成[任务名],结果:[结果],[奖励说明]。委托人:[委托人]已确认。')",
    "receiptForSim": "给模拟页AI的简短摘要(30-50字,格式:'刚完成外勤:[任务名],结果:[结果],[奖励]。')"
  }
  
  【重要约束】
  1. 必须输出纯 JSON,不要用代码块包裹
  2. result 必须是"成功""部分成功""失败"三者之一
  3. receipt 是正式回执,格式工整
  4. receiptForSim 是给模拟页AI看的简短摘要,让模拟页AI能理解玩家刚完成了什么外勤`;
  }
  
  // ====================================================================
  // ===== JSON 解析函数(容错) =====
  // ====================================================================
  
  function parseQuestList(text){
    // 尝试提取 JSON
    let jsonStr = text;
    // 去掉可能的 markdown 代码块
    jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    // 找到第一个 { 和最后一个 }
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if(firstBrace !== -1 && lastBrace !== -1){
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }
    try {
      const data = JSON.parse(jsonStr);
      if(data.quests && Array.isArray(data.quests)){
        return { quests: data.quests };
      }
      return { quests: [], raw: text };
    } catch(e) {
      return { quests: [], raw: text, error: 'JSON解析失败: ' + e.message };
    }
  }
  
  function parseExecuteResult(text){
    let jsonStr = text;
    jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if(firstBrace !== -1 && lastBrace !== -1){
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }
    try {
      const data = JSON.parse(jsonStr);
      return {
        narrative: data.narrative || '',
        options: Array.isArray(data.options) ? data.options : [],
        isLast: data.isLast === true
      };
    } catch(e) {
      // JSON 解析失败,把整个文本当成纯剧情返回
      return {
        narrative: text.trim(),
        options: [],
        isLast: true,
        error: 'JSON解析失败,已按纯文本处理'
      };
    }
  }
  
  function parseCompleteResult(text){
    let jsonStr = text;
    jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if(firstBrace !== -1 && lastBrace !== -1){
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }
    try {
      const data = JSON.parse(jsonStr);
      return {
        result: data.result || '成功',
        resultNarrative: data.resultNarrative || '',
        rewards: data.rewards || '',
        receipt: data.receipt || '',
        receiptForSim: data.receiptForSim || ''
      };
    } catch(e) {
      return {
        result: '成功',
        resultNarrative: text,
        rewards: '',
        receipt: '',
        receiptForSim: '',
        error: 'JSON解析失败: ' + e.message
      };
    }
  }
  