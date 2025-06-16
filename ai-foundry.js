import ModelClient from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import dotenv from "dotenv";
dotenv.config();
// This code snippet demonstrates how to use the Azure AI Inference SDK to send a chat completion request
// to a model hosted on Azure. It sets up the client, prepares the request with messages, and sends it.
// Make sure to replace YOUR_KEY_HERE with your actual Azure Inference SDK key.
  const client = new ModelClient(
  process.env.AZURE_INFERENCE_SDK_ENDPOINT ?? "https://aistudioaiservices583071873776.services.ai.azure.com/models", new AzureKeyCredential(process.env.AZURE_INFERENCE_SDK_KEY ?? "YOUR_KEY_HERE"));


var messages = [
  { role: "system", content: "You are an helpful assistant" },
  { role: "user", content: "What are 3 things to see in Seattle?" },
];

var response = await client.path("chat/completions").post({
  body: {
    messages: messages,
    max_tokens: 2048,
      temperature: 0.8,
      top_p: 0.1,
      presence_penalty: 0,
      frequency_penalty: 0,
      model: "Llama-4-Maverick-17B-128E-Instruct-FP8",
  },
});

console.log(JSON.stringify(response));
