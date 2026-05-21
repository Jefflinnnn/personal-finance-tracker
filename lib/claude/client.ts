import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-west-2" });

const MODEL_ID = "us.anthropic.claude-sonnet-4-6-20250514-v1:0";

interface BedrockMessage {
  role: "user" | "assistant";
  content: string;
}

export async function analyzeFinances(prompt: string, data: string): Promise<string> {
  return invokeClaudeViaChat([{ role: "user", content: `${prompt}\n\nData:\n${data}` }]);
}

export async function chatWithClaude(systemPrompt: string, messages: BedrockMessage[]): Promise<string> {
  return invokeClaudeViaChat(messages, systemPrompt);
}

async function invokeClaudeViaChat(messages: BedrockMessage[], system?: string): Promise<string> {
  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 1024,
    ...(system && { system }),
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: new TextEncoder().encode(body),
  });

  const response = await bedrock.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));

  if (result.content && result.content.length > 0 && result.content[0].type === "text") {
    return result.content[0].text;
  }

  return "Unable to generate analysis.";
}
