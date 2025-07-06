// public/chat.js -> sendMessage 函数

async function sendMessage() {
  const message = userInput.value.trim();
  if (message === "" || isProcessing) return;

  isProcessing = true;
  userInput.disabled = true;
  sendButton.disabled = true;
  addMessageToChat("user", message);
  userInput.value = "";
  userInput.style.height = "auto";
  typingIndicator.classList.add("visible");
  chatHistory.push({ role: "user", content: message });

  try {
    // 创建一个新的、空的助手消息元素
    const assistantMessageEl = document.createElement("div");
    assistantMessageEl.className = "message assistant-message";
    assistantMessageEl.innerHTML = "<p></p>";
    chatMessages.appendChild(assistantMessageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // 发送请求
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory }),
    });

    if (!response.ok) { throw new Error("Failed to get response"); }

    // --- 改回流式处理逻辑 ---
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let responseText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n\n"); // SSE 事件由两个换行符分隔

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const dataChunk = line.substring(6);
            if (dataChunk.trim() === "[DONE]") {
                break;
            }
            const jsonData = JSON.parse(dataChunk);
            if (jsonData.response) {
              responseText += jsonData.response;
              assistantMessageEl.querySelector("p").textContent = responseText;
              chatMessages.scrollTop = chatMessages.scrollHeight;
            }
          } catch (e) {
            // 忽略JSON解析错误，因为最后一块可能是 [DONE]
          }
        }
      }
    }

    chatHistory.push({ role: "assistant", content: responseText });

  } catch (error) {
    console.error("Error:", error);
    addMessageToChat("assistant", "Sorry, there was an error processing your request.");
  } finally {
    typingIndicator.classList.remove("visible");
    isProcessing = false;
    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.focus();
  }
}
