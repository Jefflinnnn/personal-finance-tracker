interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
}

export async function sendDiscordMessage(content: string, embeds?: DiscordEmbed[]) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) throw new Error("DISCORD_WEBHOOK_URL not configured");

  const body: Record<string, unknown> = {};
  if (content) body.content = content;
  if (embeds) body.embeds = embeds;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook failed: ${response.status} ${await response.text()}`);
  }
}

export function buildDailyEmbed(summary: string, totalSpent: number): DiscordEmbed {
  return {
    title: "Daily Finance Summary",
    description: summary,
    color: totalSpent > 200 ? 0xFFA500 : 0x2E8B57,
    footer: { text: "Personal Finance Tracker" },
    timestamp: new Date().toISOString(),
  };
}

export function buildWeeklyEmbed(
  analysis: string,
  stats: { totalSpent: number; netWorthChange: number; savingsRate: number; verdict: string }
): DiscordEmbed {
  const color = stats.verdict === "OVERSPENDING" ? 0xFF4444
    : stats.verdict === "OVERSAVING" ? 0xFFA500
    : 0x2E8B57;

  return {
    title: "Weekly Finance Analysis",
    color,
    fields: [
      { name: "Total Spent", value: `$${stats.totalSpent.toFixed(2)}`, inline: true },
      { name: "Net Worth Change", value: `${stats.netWorthChange >= 0 ? "+" : ""}$${stats.netWorthChange.toFixed(2)}`, inline: true },
      { name: "Savings Rate", value: `${stats.savingsRate.toFixed(1)}%`, inline: true },
      { name: "Verdict", value: stats.verdict, inline: true },
      { name: "Analysis", value: analysis.slice(0, 1024) },
    ],
    footer: { text: "Personal Finance Tracker" },
    timestamp: new Date().toISOString(),
  };
}
