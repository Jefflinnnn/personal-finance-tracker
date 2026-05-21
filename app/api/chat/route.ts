import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, budgets, accounts, investmentHoldings, netWorthSnapshots } from "@/lib/db/schema";
import { sql, desc, gte, lte, and } from "drizzle-orm";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { chatWithClaude } from "@/lib/claude/client";

async function getFinancialContext() {
  const now = new Date();
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");
  const weekStart = format(subDays(now, 7), "yyyy-MM-dd");

  const allAccounts = await db.select().from(accounts);

  const monthlySpending = await db
    .select({
      category: transactions.category,
      total: sql<string>`sum(${transactions.amount})`,
      count: sql<string>`count(*)`,
    })
    .from(transactions)
    .where(and(gte(transactions.date, monthStart), lte(transactions.date, monthEnd)))
    .groupBy(transactions.category);

  const weeklySpending = await db
    .select({
      category: transactions.category,
      total: sql<string>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .where(and(gte(transactions.date, weekStart), lte(transactions.date, format(now, "yyyy-MM-dd"))))
    .groupBy(transactions.category);

  const recentTransactions = await db
    .select()
    .from(transactions)
    .orderBy(desc(transactions.date))
    .limit(20);

  const allBudgets = await db.select().from(budgets);
  const holdings = await db.select().from(investmentHoldings);

  const recentSnapshots = await db
    .select()
    .from(netWorthSnapshots)
    .orderBy(desc(netWorthSnapshots.date))
    .limit(7);

  const totalBalance = allAccounts.reduce((sum, a) => sum + (a.balanceCurrent ? parseFloat(a.balanceCurrent) : 0), 0);
  const portfolioValue = holdings.reduce((sum, h) => sum + parseFloat(h.currentValue), 0);

  return `
FINANCIAL CONTEXT (as of ${format(now, "MMM d, yyyy")}):

ACCOUNTS:
${allAccounts.map(a => `- ${a.institution} ${a.name} (${a.type}): $${a.balanceCurrent || "0"}`).join("\n")}
Total cash/bank balance: $${totalBalance.toFixed(2)}

MONTHLY SPENDING (${format(startOfMonth(now), "MMM yyyy")}):
${monthlySpending.map(s => `- ${s.category || "uncategorized"}: $${parseFloat(s.total).toFixed(2)} (${s.count} txns)`).join("\n")}
Total this month: $${monthlySpending.reduce((s, c) => s + parseFloat(c.total), 0).toFixed(2)}

LAST 7 DAYS:
${weeklySpending.map(s => `- ${s.category || "uncategorized"}: $${parseFloat(s.total).toFixed(2)}`).join("\n")}

RECENT TRANSACTIONS (last 20):
${recentTransactions.map(t => `- ${t.date} | ${t.merchantName || t.name} | $${t.amount} | ${t.category || "uncategorized"}`).join("\n")}

BUDGETS:
${allBudgets.length > 0 ? allBudgets.map(b => {
  const spent = monthlySpending.find(s => s.category === b.category);
  const spentAmt = spent ? parseFloat(spent.total) : 0;
  return `- ${b.category}: $${spentAmt.toFixed(2)} / $${b.monthlyLimit} (${((spentAmt / parseFloat(b.monthlyLimit)) * 100).toFixed(0)}%)`;
}).join("\n") : "No budgets set."}

INVESTMENTS:
${holdings.length > 0 ? holdings.map(h => `- ${h.ticker || h.name}: ${h.quantity} shares @ $${h.currentValue}${h.costBasis ? ` (cost: $${h.costBasis})` : ""}`).join("\n") : "No investment holdings imported."}
Portfolio value: $${portfolioValue.toFixed(2)}

NET WORTH HISTORY:
${recentSnapshots.length > 0 ? recentSnapshots.map(s => `- ${s.date}: $${s.netWorth}`).join("\n") : "No snapshots yet."}
`.trim();
}

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    const context = await getFinancialContext();

    const systemPrompt = `You are a helpful personal finance assistant. You have access to the user's real financial data below. Answer questions about their spending, budget, investments, and financial health. Be concise and conversational. Use specific numbers from their data. If they ask about trends or patterns, reference actual transactions and amounts.

${context}`;

    const reply = await chatWithClaude(
      systemPrompt,
      messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }))
    );

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
