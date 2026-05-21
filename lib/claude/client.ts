import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function analyzeFinances(prompt: string, data: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `${prompt}\n\nData:\n${data}`,
      },
    ],
  });

  const block = message.content[0];
  if (block.type === "text") return block.text;
  return "Unable to generate analysis.";
}
