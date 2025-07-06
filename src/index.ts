// src/index.ts

import { Env, ChatMessage } from "./types";

// 变更：MODEL_ID 和 SYSTEM_PROMPT 不再需要，可以安全删除
// const MODEL_ID = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
// const SYSTEM_PROMPT = `...`;

export default {
  /**
   * Worker 的主请求处理器
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // 静态资源（前端页面）的处理逻辑保持不变
    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // API 路由逻辑保持不变
    if (url.pathname === "/api/chat") {
      if (request.method === "POST") {
        // 我们将修改 handleChatRequest 函数来使用 AutoRAG
        return handleChatRequest(request, env);
      }
      return new Response("Method not allowed", { status: 405 });
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;


/**
 * 处理聊天 API 请求 (已更新为使用 AutoRAG)
 */
async function handleChatRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    // 从请求体中解析消息数组
    const { messages = [] } = (await request.json()) as {
      messages: ChatMessage[];
    };

    // --- 变更 1: 从消息历史中提取最后一个用户问题作为查询 ---
    // AutoRAG 只需要用户的当前问题，而不是整个对话历史
    const lastUserMessage = messages.findLast(msg => msg.role === 'user');

    if (!lastUserMessage || !lastUserMessage.content) {
      return new Response(
        JSON.stringify({ error: "未找到有效的用户消息" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }
    const query = lastUserMessage.content;

    // --- 变更 2: 不再需要手动添加系统提示 ---
    // AutoRAG 会在后台根据您的知识库自动构建上下文


    // --- 变更 3: 将 AI 调用从 .run() 切换为 .autorag().aiSearch() ---
    const response = await env.AI.autorag("svtr-knowledge-base-ai").aiSearch({
      query: query
    });


    // --- 变更 4: 直接返回 AutoRAG 生成的 JSON 响应 ---
    // AutoRAG 返回的是一个完整的JSON对象，而不是流
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  } catch (error) {
    console.error("处理聊天请求时出错:", error);
    return new Response(
      JSON.stringify({ error: "处理请求失败" }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
}
