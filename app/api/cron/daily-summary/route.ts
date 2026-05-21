import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, budgets } from "@/lib/db/schema";
import { and, gte, lte, sql } from "drizzle-orm";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { analyzeFinances } from "@/lib/claude/client";
import { DAILY_SUMMARY_PROMPT } from "@/lib/claude/prompts";
import { sendDiscordMessage, buildDailyEmbed } from "@/lib/discord/webhook";
import { validateApiKey } from "@/lib/utils";

export async function POST(request: Request) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

    const yesterdayTxns = await db
      .select()
      .from(transactions)
      .where(and(gte(transactions.date, yesterday), lte(transactions.date, yesterday)));

    const monthlySpending = await db
      .select({
        category: transactions.category,
        total: sql<string>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .where(and(gte(transactions.date, monthStart), lte(transactions.date, monthEnd)))
      .groupBy(transactions.category);

    const allBudgets = await db.select().from(budgets);

    const budgetStatus = allBudgets.map((b) => {
      const spent = monthlySpending.find((s) => s.category === b.category);
      return {
        category: b.category,
        limit: parseFloat(b.monthlyLimit),
        spent: spent ? parseFloat(spent.total) : 0,
      };
    });

    const data = JSON.stringify({
      yesterday_transactions: yesterdayTxns,
      budget_status: budgetStatus,
      date: yesterday,
    }, null, 2);

    const summary = await analyzeFinances(DAILY_SUMMARY_PROMPT, data);

    const totalSpent = yesterdayTxns.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const embed = buildDailyEmbed(summary, totalSpent);
    await sendDiscordMessage("", [embed]);

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error("Daily summary error:", error);
    return NextResponse.json({ error: "Daily summary failed" }, { status: 500 });
  }
}
