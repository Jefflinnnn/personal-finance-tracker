import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, budgets, investmentHoldings, netWorthSnapshots, accounts } from "@/lib/db/schema";
import { and, gte, lte, sql, desc } from "drizzle-orm";
import { format, subDays } from "date-fns";
import { analyzeFinances } from "@/lib/claude/client";
import { WEEKLY_ANALYSIS_PROMPT } from "@/lib/claude/prompts";
import { sendDiscordMessage, buildWeeklyEmbed } from "@/lib/discord/webhook";
import { validateApiKey } from "@/lib/utils";

export async function POST(request: Request) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const weekStart = format(subDays(now, 7), "yyyy-MM-dd");
    const weekEnd = format(now, "yyyy-MM-dd");
    const priorWeekStart = format(subDays(now, 14), "yyyy-MM-dd");

    const weekTxns = await db
      .select()
      .from(transactions)
      .where(and(gte(transactions.date, weekStart), lte(transactions.date, weekEnd)));

    const priorWeekTxns = await db
      .select()
      .from(transactions)
      .where(and(gte(transactions.date, priorWeekStart), lte(transactions.date, weekStart)));

    const allBudgets = await db.select().from(budgets);
    const holdings = await db.select().from(investmentHoldings);

    const recentSnapshots = await db
      .select()
      .from(netWorthSnapshots)
      .orderBy(desc(netWorthSnapshots.date))
      .limit(2);

    const totalBalance = await db
      .select({ total: sql<string>`sum(${accounts.balanceCurrent}::numeric)` })
      .from(accounts);

    const totalSpent = weekTxns.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const priorWeekSpent = priorWeekTxns.reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const portfolioValue = holdings.reduce((sum, h) => sum + parseFloat(h.currentValue), 0);
    const portfolioCost = holdings.reduce((sum, h) => sum + (h.costBasis ? parseFloat(h.costBasis) : 0), 0);

    const netWorthChange = recentSnapshots.length >= 2
      ? parseFloat(recentSnapshots[0].netWorth) - parseFloat(recentSnapshots[1].netWorth)
      : 0;

    const weeklyBudgetPortion = allBudgets.reduce((sum, b) => sum + parseFloat(b.monthlyLimit) / 4, 0);
    const savingsRate = weeklyBudgetPortion > 0 ? ((weeklyBudgetPortion - totalSpent) / weeklyBudgetPortion) * 100 : 0;

    let verdict = "ON TRACK";
    if (savingsRate < 10) verdict = "OVERSPENDING";
    else if (savingsRate > 60) verdict = "OVERSAVING";

    const data = JSON.stringify({
      this_week_transactions: weekTxns,
      prior_week_transactions: priorWeekTxns,
      budgets: allBudgets,
      holdings,
      portfolio: { value: portfolioValue, costBasis: portfolioCost, gainLoss: portfolioValue - portfolioCost },
      net_worth_change: netWorthChange,
      total_balance: totalBalance[0]?.total || "0",
      stats: { totalSpent, priorWeekSpent, savingsRate, verdict },
    }, null, 2);

    const analysis = await analyzeFinances(WEEKLY_ANALYSIS_PROMPT, data);

    const embed = buildWeeklyEmbed(analysis, {
      totalSpent,
      netWorthChange,
      savingsRate,
      verdict,
    });
    await sendDiscordMessage("", [embed]);

    return NextResponse.json({ success: true, analysis, verdict });
  } catch (error) {
    console.error("Weekly analysis error:", error);
    return NextResponse.json({ error: "Weekly analysis failed" }, { status: 500 });
  }
}
