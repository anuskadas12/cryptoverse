const {
  GoogleGenerativeAI,
} = require("@google/generative-ai");
  
const generationConfig = {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 2048,
  responseMimeType: "text/plain",
};
  
let model;

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const error = new Error("Missing GEMINI_API_KEY. Put it in a .env file or set it in your environment.");
    error.status = 503;
    throw error;
  }

  if (!model) {
    const genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
      systemInstruction: "You are CryptoVerse AI, a clear and practical assistant for Web3, blockchain, smart contracts, security, and crypto education. Give concise, safe, and accurate answers. Do not provide financial guarantees.",
    });
  }

  return model;
}

async function getAi(prompt) {
  const cleanPrompt = typeof prompt === "string" ? prompt.trim() : "";

  if (!cleanPrompt) {
    const error = new Error("Prompt is required.");
    error.status = 400;
    throw error;
  }

  const chatSession = getModel().startChat({
    generationConfig,
    history: [],
  });
  
  const result = await chatSession.sendMessage(cleanPrompt);
  return result.response.text();
}
  
module.exports = getAi;
