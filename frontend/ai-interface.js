const CHAT_HISTORY_KEY = "chatHistory";
const MAX_HISTORY_ITEMS = 25;

document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.getItem("visitedIndex")) {
        window.location.href = "index.html";
        return;
    }

    initWallet();

    const welcomeSection = document.querySelector(".ai-welcome");
    const conversation = document.querySelector(".ai-conversation");
    const aiInput = document.querySelector(".ai-input");
    const sendButton = document.querySelector(".ai-send-btn");
    const suggestionCards = document.querySelectorAll(".ai-suggestion-card");
    const historyContainer = document.querySelector(".ai-history");
    const newChatButton = document.querySelector(".ai-new-chat");

    if (!welcomeSection || !conversation || !aiInput || !sendButton || !historyContainer) {
        console.error("AI interface is missing required elements.");
        return;
    }

    showWelcome();
    loadConversationHistory();

    document.querySelectorAll('a[href="index.html"]').forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            window.location.href = "index.html";
        });
    });

    sendButton.addEventListener("click", () => submitMessage());
    aiInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submitMessage();
        }
    });

    suggestionCards.forEach((card) => {
        card.addEventListener("click", () => {
            const question = card.querySelector("p")?.textContent?.replace(/"/g, "") || "";
            aiInput.value = question;
            aiInput.focus();
        });
    });

    newChatButton?.addEventListener("click", showWelcome);

    async function submitMessage() {
        const message = aiInput.value.trim();
        if (!message) return;

        aiInput.value = "";
        await sendMessage(message);
    }

    async function sendMessage(message) {
        showConversation();
        appendMessage("user", message);
        const conversationId = saveToHistory(message);
        const thinkingIndicator = appendThinkingIndicator();

        try {
            const response = await fetch("/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: message }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || "Failed to get response.");
            }

            thinkingIndicator.remove();
            appendMessage("ai", data.response || "No response returned.");
            saveResponseToHistory(conversationId, data.response || "");
        } catch (error) {
            console.error("AI request failed:", error);
            thinkingIndicator.remove();
            appendMessage("ai", error.message || "Failed to get response. Please try again.");
        }
    }

    function showWelcome() {
        conversation.innerHTML = "";
        welcomeSection.style.display = "flex";
        conversation.style.display = "none";
        document.querySelectorAll(".ai-history-item").forEach((item) => item.classList.remove("active"));
    }

    function showConversation() {
        welcomeSection.style.display = "none";
        conversation.style.display = "flex";
    }

    function appendMessage(sender, message) {
        const isUser = sender === "user";
        const messageEl = document.createElement("div");
        messageEl.className = `ai-message ${isUser ? "user-message" : "ai-response"}`;

        const avatar = document.createElement("div");
        avatar.className = "ai-message-avatar";

        const avatarImg = document.createElement("img");
        avatarImg.src = `https://api.dicebear.com/6.x/bottts/svg?seed=${isUser ? "user" : "crypto"}`;
        avatarImg.alt = isUser ? "User" : "AI";
        avatar.appendChild(avatarImg);

        const content = document.createElement("div");
        content.className = "ai-message-content";

        const paragraph = document.createElement("p");
        paragraph.textContent = message;
        content.appendChild(paragraph);

        if (!isUser) {
            content.appendChild(createMessageActions(message));
        }

        messageEl.append(avatar, content);
        conversation.appendChild(messageEl);
        scrollConversationToBottom();
    }

    function appendThinkingIndicator() {
        const indicator = document.createElement("div");
        indicator.className = "ai-message thinking-indicator";
        indicator.innerHTML = `
            <div class="ai-message-avatar">
                <img src="https://api.dicebear.com/6.x/bottts/svg?seed=crypto" alt="AI">
            </div>
            <div class="ai-message-content">
                <div class="ai-thinking"><span></span><span></span><span></span></div>
            </div>
        `;
        conversation.appendChild(indicator);
        scrollConversationToBottom();
        return indicator;
    }

    function createMessageActions(message) {
        const actions = document.createElement("div");
        actions.className = "ai-message-actions";

        ["thumbs-up", "thumbs-down"].forEach((icon) => {
            const button = document.createElement("button");
            button.className = "ai-action-btn";
            button.type = "button";
            button.innerHTML = `<i class="fas fa-${icon}"></i>`;
            actions.appendChild(button);
        });

        const copyButton = document.createElement("button");
        copyButton.className = "ai-action-btn";
        copyButton.type = "button";
        copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy';
        copyButton.addEventListener("click", async () => {
            await navigator.clipboard?.writeText(message);
            showNotification("success", "Copied response.");
        });
        actions.appendChild(copyButton);

        return actions;
    }

    function saveToHistory(message) {
        const timestamp = Date.now();
        const conversationId = `conv_${timestamp}`;
        const history = getHistory();
        const historyItem = {
            id: conversationId,
            timestamp,
            question: message,
            responses: [],
        };

        history.unshift(historyItem);
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS)));
        loadConversationHistory();
        setActiveHistoryItem(conversationId);
        return conversationId;
    }

    function saveResponseToHistory(conversationId, response) {
        const history = getHistory();
        const item = history.find((entry) => entry.id === conversationId);
        if (!item) return;

        item.responses = item.responses || [];
        item.responses.push(response);
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
    }

    function loadConversationHistory() {
        historyContainer.innerHTML = "";

        const heading = document.createElement("h3");
        heading.textContent = "Recent Conversations";
        historyContainer.appendChild(heading);

        getHistory().forEach((item) => {
            if (!item?.id || !item?.question) return;

            const historyItem = document.createElement("button");
            historyItem.className = "ai-history-item";
            historyItem.type = "button";
            historyItem.dataset.conversationId = item.id;

            const icon = document.createElement("i");
            icon.className = "fas fa-comments";

            const text = document.createElement("span");
            text.textContent = item.question.length > 30 ? `${item.question.substring(0, 30)}...` : item.question;

            historyItem.append(icon, text);
            historyItem.addEventListener("click", () => loadConversation(item.id));
            historyContainer.appendChild(historyItem);
        });
    }

    function loadConversation(conversationId) {
        const conversationData = getHistory().find((item) => item.id === conversationId);
        if (!conversationData) return;

        conversation.innerHTML = "";
        showConversation();
        appendMessage("user", conversationData.question);
        (conversationData.responses || []).forEach((response) => appendMessage("ai", response));
        setActiveHistoryItem(conversationId);
    }

    function setActiveHistoryItem(conversationId) {
        document.querySelectorAll(".ai-history-item").forEach((item) => {
            item.classList.toggle("active", item.dataset.conversationId === conversationId);
        });
    }

    function getHistory() {
        try {
            const history = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY));
            return Array.isArray(history) ? history : [];
        } catch {
            return [];
        }
    }

    function scrollConversationToBottom() {
        conversation.scrollTop = conversation.scrollHeight;
    }
});
