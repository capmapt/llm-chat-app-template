// src/index.ts

import { Env, ChatMessage } from "./types";

// 我们现在需要重新引入您的角色设定和要使用的基础模型
const MODEL_ID = "@cf/meta/llama-3-8b-instruct"; // 您可以选用 Llama 3 或其他强大模型

// SVTR 专属的、详细的系统提示
const SYSTEM_PROMPT = `你是由【SVTR 硅谷科技评论】打造的AI创投助手。

关于我们: 硅谷科技评论（SVTR，Silicon Valley Technology Review）是一家领先的科技媒体和创投服务平台，专注于人工智能（AI）领域的投资分析、行业研究和资源对接。我们的使命是通过深度洞察和专业服务，连接全球顶级的AI创业者、投资人和行业专家。

你的职责:
1.  **专业回答**: 严格基于我提供给你的【参考信息】，以SVTR的专业、自信、友好的视角，回答用户的【原始问题】。
2.  **身份一致**: 在所有回答中，都以“SVTR的AI助手”身份进行交流。当提到“我们”时，指的是“SVTR 硅谷科技评论”。
3.  **数据驱动**: 如果【参考信息】为空或与问题无关，请诚实地告诉用户：“根据我们的知识库，我暂时无法回答这个问题，但我可以提供一些相关的通用信息。” 然后可以谨慎使用你的通用知识进行补充。
4.  **引用来源**: 如果你使用了【参考信息】作答，请在回答的末尾，以友好、自然的方式提及信息来源，例如：“以上信息部分参考了我们的内部文档[文件名]”。
5.  **引导用户**: 在适当的时候，向用户介绍SVTR的相关服务，例如，当用户问及寻找投资机会时，可以引导他们关注我们的【AI创投榜】和【AI创投库】。`;


export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    if (url.pathname === "/api/chat") {
      if (request.method === "POST") {
        return handleChatRequest(request, env);
      }
      return new Response("Method not allowed", { status: 405 });
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;


async function handleChatRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const { messages = [] } = (await request.json()) as {
      messages: ChatMessage[];
    };

    const lastUserMessage = messages.findLast(msg => msg.role === 'user');
    if (!lastUserMessage || !lastUserMessage.content) {
      return new Response(JSON.stringify({ error: "未找到有效的用户消息" }), { status: 400 });
    }
    const userQuery = lastUserMessage.content;

    // ================= 步骤一：使用 AutoRAG 从知识库获取事实和基础答案 =================
    const ragResponse = await env.AI.autorag("svtr-knowledge-base-ai").aiSearch({
      query: userQuery
    });

    const context = ragResponse.response; // 这是 RAG 系统生成的基础回答
    const sourceFile = ragResponse.data?.[0]?.filename; // 尝试获取第一个参考文件名

    // ================= 步骤二：将 RAG 的答案和您的角色设定结合，进行第二次 AI 调用 =================
    
    // 构建发送给最终模型的指令
    const finalMessages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { 
        role: "user", 
        content: `
          【参考信息】:
          ${context}
          ${sourceFile ? `\n(参考文件名: ${sourceFile})` : ''}

          【用户的原始问题】:
          ${userQuery}`
      }
    ];

    // 调用一个强大的语言模型来应用角色并生成最终回答
    // 注意：这里我们重新使用 env.AI.run，并开启流式响应以获得打字机效果
    const finalResponseStream = await env.AI.run(MODEL_ID, {
      messages: finalMessages,
      stream: true, // 开启流式响应
    });

    // 将流式响应直接返回给前端
    return new Response(finalResponseStream, {
      headers: { "content-type": "text/event-stream" },
    });

  } catch (error: any) {
    console.error("处理聊天请求时出错:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
