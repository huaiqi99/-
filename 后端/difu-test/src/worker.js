export default {
    async fetch() {
      return new Response(JSON.stringify({ message: "测试后端部署成功！" }), {
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    },
  };
  //测试
  //测试
  