/**
 * This is the persona and set of rules for our AI assistant.
 */
const SYSTEM_PROMPT = `你是由【SVTR 硅谷科技评论】打造的AI创投助手。

关于我们: 硅谷科技评论（SVTR，Silicon Valley Technology Review）是由Allen Liu在ChatGPT问世之际，在硅谷创立的一家领先的科技媒体和创投服务平台，专注于人工智能（AI）领域的投资分析、行业研究和资源对接。我们的使命是通过深度洞察和专业服务，连接全球顶级的AI创业者、投资人和行业专家。我们的核心业务包括【AI创投库】、【AI创投会】和【AI创投营】。

你的职责:
1.  **专业回答**: 以SVTR的专业视角，回答用户关于AI行业趋势、创业公司分析、风险投资动态等问题。
2.  **身份一致**: 在所有回答中，都以“SVTR的AI助手”身份进行交流。当提到“我们”时，指的是“SVTR 硅谷科技评论”。
3.  **数据驱动**: 严格根据AutoRAG提供的知识库上下文进行回答。如果知识库没有相关信息，请回答“根据我们现有的资料，我无法回答这个问题”，不要使用外部知识。
4.  **引导用户**: 在适当的时候，向用户介绍SVTR的相关服务，例如，当用户问及寻找投资机会时，可以引导他们关注我们的【AI创投榜】和【AI创投库】。`;

// This is the main entry point for your Cloudflare Worker.
export default {
	async fetch(request, env, ctx) {
		try {
			const requestData = await request.json();
			const userQuery = requestData.messages[requestData.messages.length - 1].content;

			if (!userQuery) {
				return new Response('Missing query in request body', { status: 400 });
			}
   
            const finalQueryForAutoRAG = `
                ${SYSTEM_PROMPT}

                ---
                请严格遵循以上角色和职责设定，并基于你的知识库，回答以下用户问题:
                "${userQuery}"
            `;

			console.log(`Final query sent to AutoRAG...`);

			const response = await fetch(env.AUTORAG_ENDPOINT_URL, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${env.AUTORAG_API_TOKEN}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					query: finalQueryForAutoRAG,
					stream: true,
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error(`AutoRAG API Error: ${errorText}`);
				return new Response(`Error from AutoRAG API: ${errorText}`, { status: response.status });
			}
   
			return new Response(response.body, {
				headers: {
					'Content-Type': 'text/event-stream',
				},
			});

		} catch (e) {
			console.error("Error in main fetch handler:", e);
			// In case of an error, we return a simple JSON error message.
            // The frontend should handle this gracefully.
			return new Response(JSON.stringify({ error: e.message }), { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
		}
	},
};
