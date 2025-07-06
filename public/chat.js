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
      "Hello! I'm an LLM chat app powered by Cloudflare Workers AI. How can I help you today?",
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

// Send button click handler
sendButton.addEventListener("click", sendMessage);

/**
 * Sends a message to the chat API and processes the response
 */
async function sendMessage() {
  const message = userInput.value.trim();

  // Don't send empty messages
  if (message === "" || isProcessing) return;

  // Disable input while processing
  isProcessing = true;
  userInput.disabled = true;
  sendButton.disabled = true;

  // Add user message to chat
  addMessageToChat("user", message);

  // Clear input
  userInput.value = "";
  userInput.style.height = "auto";

  // Show typing indicator
  typingIndicator.classList.add("visible");

  // Add message to history
  chatHistory.push({ role: "user", content: message });

  try {
    // ======================= 核心变更开始 =======================
    // The streaming logic has been replaced with JSON handling.

    // Send request to API
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: chatHistory,
      }),
    });

    // Handle errors
    if (!response.ok) {
      // Try to get error message from response body
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to get response from server.");
    }

    // Process the complete JSON response instead of a stream
    const responseData = await response.json();

    // Extract the AI's message from the JSON response.
    // Cloudflare AutoRAG's response is typically in `result.response`.
    const aiMessage = responseData.result?.response;

    if (!aiMessage) {
      throw new Error("Invalid response format from AI.");
    }
    
    // Add the AI's complete message to the chat
    addMessageToChat("assistant", aiMessage);

    // Add completed response to chat history
    chatHistory.push({ role: "assistant", content: aiMessage });
    
    // ======================= 核心变更结束 =======================

  } catch (error) {
    console.error("Error:", error);
    addMessageToChat(
      "assistant",
      `Sorry, there was an error: ${error.message}`,
    );
  } finally {
    // Hide typing indicator
    typingIndicator.classList.remove("visible");

    // Re-enable input
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
  // Create a <p> tag to safely insert text content, preventing HTML injection
  const p = document.createElement("p");
  p.textContent = content;
  messageEl.appendChild(p);
  
  chatMessages.appendChild(messageEl);

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
