import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, accounts, investmentHoldings, netWorthSnapshots } from "@/lib/db/schema";
import { sql, gte, lte, and, desc } from "drizzle-orm";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "month";

  const now = new Date();
  let startDate: string;

  if (period === "week") {
    startDate = format(subDays(now, 7), "yyyy-MM-dd");
  } else if (period === "month") {
    startDate = format(startOfMonth(now), "yyyy-MM-dd");
  } else {
    startDate = format(subDays(now, 90), "yyyy-MM-dd");
  }

  const endDate = format(now, "yyyy-MM-dd");

  const spendingByCategory = await db
    .select({
      category: transactions.category,
      total: sql<string>`sum(${transactions.amount})`,
      count: sql<string>`count(*)`,
    })
    .from(transactions)
    .where(and(gte(transactions.date, startDate), lte(transactions.date, endDate)))
    .groupBy(transactions.category);

  const dailySpending = await db
    .select({
      date: transactions.date,
      total: sql<string>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .where(and(gte(transactions.date, startDate), lte(transactions.date, endDate)))
    .groupBy(transactions.date)
    .orderBy(transactions.date);

  const totalBalance = await db
    .select({
      total: sql<string>`sum(${accounts.balanceCurrent}::numeric)`,
    })
    .from(accounts);

  const holdings = await db.select().from(investmentHoldings);

  const portfolioValue = holdings.reduce((sum, h) => sum + parseFloat(h.currentValue), 0);
  const portfolioCost = holdings.reduce((sum, h) => sum + (h.costBasis ? parseFloat(h.costBasis) : 0), 0);

  const recentSnapshots = await db
    .select()
    .from(netWorthSnapshots)
    .orderBy(desc(netWorthSnapshots.date))
    .limit(30);

  return NextResponse.json({
    spendingByCategory,
    dailySpending,
    totalBalance: totalBalance[0]?.total || "0",
    portfolio: {
      value: portfolioValue,
      costBasis: portfolioCost,
      gainLoss: portfolioValue - portfolioCost,
      gainLossPercent: portfolioCost > 0 ? ((portfolioValue - portfolioCost) / portfolioCost) * 100 : 0,
    },
    holdings,
    netWorthHistory: recentSnapshots.reverse(),
  });
}
