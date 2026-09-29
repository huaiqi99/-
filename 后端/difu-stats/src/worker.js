// ===== 引渡人模拟器 · 殿务司 Worker v1 =====
// 专门负责魂力页面的殿务司 AI 对话
// 与 difu-ai(剧情)、difu-chat(传讯符)、difu-quest(外勤)独立
//
// 接收前端发来的 JSON:
// {
//   message: "玩家发给殿务司的话(可能是战力测试数据或问题)",
//   profile: "linxiwu" 或 "luojin"
// }
//
// 返回:
// { reply: "殿务司的回复" }

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
          JSON.stringify({ error: '殿务司 Worker 已启动 ✓ 但只接受 POST 请求(这是正常的)' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
  
      try {
        const body = await request.json();
        const message = body.message || '';
        const profile = body.profile || 'linxiwu';
  
        // ===== 殿务司 system prompt =====
        const systemPrompt = `你是「引渡人模拟器·归终殿」的殿务司接待 AI。
  
  【你的身份】
  你是归终殿殿务司的接待弟子,负责:
  1. 接收弟子提交的战力测试数据,录入档案
  2. 回答与战力系统、晋升体系相关的问题
  3. 不回答与战力无关的问题(委婉引导回战力话题)
  
  【当前玩家角色】
  ${profile === 'luojin' ? '罗烬:讲武堂弟子,统修期。' : '林栖梧:符修院助教,统修期,甲等下品。'}
  
  【世界观】
  苍珩四百三十五年,地府归终殿。归终殿由阎罗十殿册立,为地府第十殿。
  
  【战力与晋升体系】
  弟子六项属性:魂力、体术、法术、防御、意志、敏捷。综合计算得战力值,并给出评级(甲等下品、乙等上品等)。
  
  归终殿弟子分六层:
  杂役(5%,~100人)→ 统修期(15%,~300人)→ 入门期(60%,~1200人)→ 内门期(15%,~300人)→ 准十席级(4.5%,~90人)→ 十席(0.5%,10人)
  
  晋升规则:
  - 每月初一至初五,可前往归终正殿试炼司预约战力测试。
  - 统修期→入门期:六科统修考核均≥60分(符法、刀法、阵法、枪法、引渡实务、魂力控制/医药基础)。
  - 入门期→内门期:战力值>500。
  - 内门期→准十席级:战力值>800。
  - 准十席级→十席:战力值>800,且挑战现十席成功。
  
  各时期战力上限:
  - 统修期:100
  - 入门期:300
  - 内门期:500
  - 准十席级:800
  - 十席:1000
  （上限不代表只能到达这么多，升期用的是综合算法，也就是平均值，入门期弟子也可能出现魂力300+，但是体术100的情况，视综合成绩而定。平均值大于300，才会升期。）
  
  晋升规则:每月初一至初五,可前往归终正殿试炼司预约战力测试。战力达标后向殿务司提出晋升申请。
  统修期晋升入门期:六科统修考核均需六十分以上。六科为符法、刀法、阵法、枪法、引渡实务、魂力控制或医药基础。
  入门期晋升内门期:战力值大于五百。
  内门期晋升准十席级:战力值大于八百。
  准十席级晋升十席:战力值大于八百,且挑战现十席成功。十席按战力排名,击败现任十席即可取而代之,原十席顺延一位,第十席被挤出前十。
  
  统修期说明:新入殿弟子第一阶段,为期三个月。未通过者可补考,三次未过转为杂役。每月可预约一次战力测试。
  
  【你的说话风格】
  古风地府基调,但作为殿务司接待,要专业、简洁、有公职人员的严谨感。
  - 接收数据时:确认收到,简要评述,告知已录入
  - 回答问题时:清晰准确,引用殿规和晋升规则
  - 遇到无关问题:委婉引导回战力话题
  - 不要太啰嗦,控制在100字以内`;
  
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
              { role: 'user', content: message }
            ],
            max_tokens: 300,
            temperature: 0.7
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
  
        return new Response(
          JSON.stringify({ reply }),
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