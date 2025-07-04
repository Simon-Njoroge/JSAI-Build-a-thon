import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ModelClient from "@azure-rest/ai-inference";
import { AzureChatOpenAI } from "@langchain/openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { BufferMemory } from "langchain/memory";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";

dotenv.config();

const sessionMemories = {};

// Ensure the environment variables are set
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
// Use disease PDFs for medical assistant
const diseasePdfDir = path.join(projectRoot, "assistance/data");
const diseasePdfs = [
  "covid.pdf",
  "chickenpox.pdf",
  "Strep Throat.pdf",
  "pneumonia.pdf",
  "Measles.pdf",
  "malaria.pdf",
  "hbp.pdf",
  "flu.pdf",
  "diabetes.pdf"
].map(f => path.join(diseasePdfDir, f));

const app = express();
app.use(cors());
app.use(express.json());

const chatModel = new AzureChatOpenAI({
  azureOpenAIApiKey: process.env.AZURE_INFERENCE_SDK_KEY,
  azureOpenAIApiInstanceName: process.env.INSTANCE_NAME, // In target url: https://<INSTANCE_NAME>.services...
  azureOpenAIApiDeploymentName: process.env.DEPLOYMENT_NAME, // i.e "gpt-4o"
  azureOpenAIApiVersion: "2024-08-01-preview", // In target url: ...<VERSION>
  temperature: 1,
  maxTokens: 4096,
});

// Load and parse the PDF file
let pdfTexts = {};
let pdfChunks = {};
const CHUNK_SIZE = 800;

async function loadPDFs() {
  for (const pdfPath of diseasePdfs) {
    if (pdfTexts[pdfPath]) continue;
    if (!fs.existsSync(pdfPath)) continue;
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);
    pdfTexts[pdfPath] = data.text;
    let currentChunk = "";
    const words = data.text.split(/\s+/);
    pdfChunks[pdfPath] = [];
    for (const word of words) {
      if ((currentChunk + " " + word).length <= CHUNK_SIZE) {
        currentChunk += (currentChunk ? " " : "") + word;
      } else {
        pdfChunks[pdfPath].push(currentChunk);
        currentChunk = word;
      }
    }
    if (currentChunk) pdfChunks[pdfPath].push(currentChunk);
  }
}

function getSessionMemory(sessionId) {
  if (!sessionMemories[sessionId]) {
    const history = new ChatMessageHistory();
    sessionMemories[sessionId] = new BufferMemory({
      chatHistory: history,
      returnMessages: true,
      memoryKey: "chat_history",
    });
  }
  return sessionMemories[sessionId];
}

function retrieveRelevantContent(query) {
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 3)
    .map((term) => term.replace(/[.,?!;:()"']/g, ""));

  if (queryTerms.length === 0) return [];
  let allScored = [];
  for (const [pdfPath, chunks] of Object.entries(pdfChunks)) {
    const scoredChunks = chunks.map((chunk) => {
      const chunkLower = chunk.toLowerCase();
      let score = 0;
      for (const term of queryTerms) {
        const regex = new RegExp(term, "gi");
        const matches = chunkLower.match(regex);
        if (matches) score += matches.length;
      }
      return { chunk, score, source: path.basename(pdfPath) };
    });
    allScored = allScored.concat(scoredChunks);
  }
  return allScored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => `[${item.source}]: ${item.chunk}`);
}


app.post("/medical-chat", async (req, res) => {
  const userMessage = req.body.message;
  const useRAG = req.body.useRAG === undefined ? true : req.body.useRAG;
  const sessionId = req.body.sessionId || "default";

  let sources = [];

  const memory = getSessionMemory(sessionId);
  const memoryVars = await memory.loadMemoryVariables({});

  if (useRAG) {
    await loadPDFs();
    sources = retrieveRelevantContent(userMessage);
  }

  // Prepare system prompt
  const systemMessage = useRAG
    ? {
        role: "system",
        content: sources.length > 0
          ? `You are a medical assistant. You help users understand possible causes of their symptoms and provide general information about diseases and common treatments. Always remind users that this is not medical advice and to consult a healthcare professional for diagnosis and treatment.\n\n--- DISEASE INFORMATION EXCERPTS ---\n${sources.join('\n\n')}\n--- END OF EXCERPTS ---`
          : `You are a medical assistant. The excerpts do not contain relevant information for this question. Reply politely: \"I'm sorry, I don't know. The disease information does not contain information about that.\"`,
      }
    : {
        role: "system",
        content: "You are a medical assistant. Answer the user's questions concisely and informatively. Always remind users this is not medical advice.",
      };

  try {
    // Build final messages array
    const messages = [
      systemMessage,
      ...(memoryVars.chat_history || []),
      { role: "user", content: userMessage },
    ];

    const response = await chatModel.invoke(messages);

    await memory.saveContext({ input: userMessage }, { output: response.content });

    res.json({ reply: response.content, sources });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Model call failed",
      message: err.message,
      reply: "Sorry, I encountered an error. Please try again."
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AI API server running on port ${PORT}`);
});
