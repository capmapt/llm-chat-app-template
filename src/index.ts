/**
 * LLM Chat Application Template
 *
 * A simple chat application using Cloudflare Workers AI.
 * This template demonstrates how to implement an LLM-powered chat interface with
 * streaming responses using Server-Sent Events (SSE).
 *
 * @license MIT
 */
import { Env, ChatMessage } from "./types";

// Model ID for Workers AI model
// https://developers.cloudflare.com/workers-ai/models/
const MODEL_ID = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

// SVTR 专属的、详细的系统提示
const SYSTEM_PROMPT = `你是由【SVTR 硅谷科技评论】打造的AI创投助手。

关于我们: SVTR 硅谷科技评论是一家领先的科技媒体和创投服务平台，专注于人工智能（AI）领域的投资分析、行业研究和资源对接。我们的使命是通过深度洞察和专业服务，连接全球顶级的AI创业者、投资人和行业专家。我们的核心业务包括【AI创投库】、【AI创投会】和【AI创投营】。

你的职责:
1.  **专业回答**: 以SVTR的专业视角，回答用户关于AI行业趋势、创业公司分析、风险投资动态等问题。
2.  **身份一致**: 在所有回答中，都以“SVTR的AI助手”身份进行交流。当提到“我们”时，指的是“SVTR 硅谷科技评论”。
3.  **数据驱动**: 优先使用我们知识库（通过RAG系统提供）中的信息进行回答。如果知识库没有相关信息，可以谨慎使用你的通用知识，但需声明该信息非SVTR官方数据。
4.  **引导用户**: 在适当的时候，向用户介绍SVTR的相关服务，例如，当用户问及寻找投资机会时，可以引导他们关注我们的【AI创投榜】和【AI创投库】。`;

export default {
  /**
   * Main request handler for the Worker
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // Handle static assets (frontend)
    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // API Routes
    if (url.pathname === "/api/chat") {
      // Handle POST requests for chat
      if (request.method === "POST") {
        return handleChatRequest(request, env);
      }

      // Method not allowed for other request types
      return new Response("Method not allowed", { status: 405 });
    }

    // Handle 404 for unmatched routes
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

/**
 * Handles chat API requests
 */
async function handleChatRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    // Parse JSON request body
    const { messages = [] } = (await request.json()) as {
      messages: ChatMessage[];
    };

    // Add system prompt if not present
    if (!messages.some((msg) => msg.role === "system")) {
      messages.unshift({ role: "system", content: SYSTEM_PROMPT });
    }

    const response = await env.AI.run(
      MODEL_ID,
      {
        messages,
        max_tokens: 1024,
      },
      {
        returnRawResponse: true,
        // Uncomment to use AI Gateway
        // gateway: {
        //   id: "YOUR_GATEWAY_ID", // Replace with your AI Gateway ID
        //   skipCache: false,      // Set to true to bypass cache
        //   cacheTtl: 3600,        // Cache time-to-live in seconds
        // },
      },
    );

    // Return streaming response
    return response;
  } catch (error) {
    console.error("Error processing chat request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
}
