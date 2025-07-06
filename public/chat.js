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

// Auto-resize textarea as user types
userInput.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
});

// Send message on Enter (without Shift)
userInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Send button click handler - This is where the function is correctly assigned without 'await'
sendButton.addEventListener("click", sendMessage);

/**
 * Sends a message to the chat API and processes the response.
 * This function is correctly declared as 'async' so 'await' can be used inside it.
 */
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
    const assistantMessageEl = document.createElement("div");
    assistantMessageEl.className = "message assistant-message";
    assistantMessageEl.innerHTML = "<p></p>";
    chatMessages.appendChild(assistantMessageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory }),
    });

    if (!response.ok) { throw new Error("Failed to get response"); }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let responseText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n\n");

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
            // Ignore parsing errors for non-JSON parts of the stream
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

/**
 * Helper function to add message to chat
 */
function addMessageToChat(role, content) {
  const messageEl = document.createElement("div");
  messageEl.className = `message ${role}-message`;
  const p = document.createElement("p");
  p.textContent = content;
  messageEl.appendChild(p);
  
  chatMessages.appendChild(messageEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
