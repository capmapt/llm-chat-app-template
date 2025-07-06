// public/chat.js (调试版本)

/**
 * LLM Chat App Frontend
 *
 * Handles the chat UI interactions and communication with the backend API.
 */

// DOM elements
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const typingIndicator = document.getElementById("typing-indicator");

// Chat state
let chatHistory = [
  {
    role: "assistant",
    content:
      "Hello! I'm an LLM chat app powered by SVTR AI. How can I help you today?",
  },
];
let isProcessing = false;

// ... (其他事件监听器的代码保持不变) ...
userInput.addEventListener("input", function () { this.style.height = "auto"; this.style.height = this.scrollHeight + "px"; });
userInput.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
sendButton.addEventListener("click", sendMessage);


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
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to get response from server.");
    }

    const responseData = await response.json();

    // ======================= 新的调试代码 =======================
    // 我们在这里将收到的数据打印到控制台，并设置一个断点
    console.log("收到的完整响应数据 (Received Full Response Data):", responseData);
    debugger; // 如果开发者工具打开着，代码会在这里暂停
    // ==========================================================

    const aiMessage = responseData.response;

    if (!aiMessage) {
      throw new Error("Invalid response format from AI.");
    }

    addMessageToChat("assistant", aiMessage);
    chatHistory.push({ role: "assistant", content: aiMessage });

  } catch (error) {
    console.error("Error:", error);
    addMessageToChat("assistant", `Sorry, there was an error: ${error.message}`);
  } finally {
    typingIndicator.classList.remove("visible");
    isProcessing = false;
    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.focus();
  }
}

function addMessageToChat(role, content) {
  const messageEl = document.createElement("div");
  messageEl.className = `message ${role}-message`;
  const p = document.createElement("p");
  p.textContent = content;
  messageEl.appendChild(p);
  chatMessages.appendChild(messageEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
