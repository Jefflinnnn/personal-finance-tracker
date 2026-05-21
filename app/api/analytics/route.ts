import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, accounts, investmentHoldings, netWorthSnapshots } from "@/lib/db/schema";
import { sql, gte, lte, and, desc, eq } from "drizzle-orm";
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

  // Normalize spending: credit card positives are expenses, checking negatives are expenses
  // Exclude internal transfers (credit card payments, Fidelity transfers, etc.)
  // Use user_category if set, otherwise fall back to Teller's category
  const spendingByCategory = await db
    .select({
      category: sql<string>`coalesce(${transactions.userCategory}, ${transactions.category})`,
      total: sql<string>`sum(CASE
        WHEN ${accounts.type} = 'credit' THEN ${transactions.amount}::numeric
        ELSE -${transactions.amount}::numeric
      END)`,
      count: sql<string>`count(*)`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(
      gte(transactions.date, startDate),
      lte(transactions.date, endDate),
      sql`${transactions.isTransfer} = false`,
      sql`CASE
        WHEN ${accounts.type} = 'credit' THEN ${transactions.amount}::numeric > 0
        ELSE ${transactions.amount}::numeric < 0
      END`
    ))
    .groupBy(sql`coalesce(${transactions.userCategory}, ${transactions.category})`);

  const dailySpending = await db
    .select({
      date: transactions.date,
      total: sql<string>`sum(CASE
        WHEN ${accounts.type} = 'credit' THEN ${transactions.amount}::numeric
        ELSE -${transactions.amount}::numeric
      END)`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(
      gte(transactions.date, startDate),
      lte(transactions.date, endDate),
      sql`${transactions.isTransfer} = false`,
      sql`CASE
        WHEN ${accounts.type} = 'credit' THEN ${transactions.amount}::numeric > 0
        ELSE ${transactions.amount}::numeric < 0
      END`
    ))
    .groupBy(transactions.date)
    .orderBy(transactions.date);

  const income = await db
    .select({
      total: sql<string>`sum(${transactions.amount}::numeric)`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(
      gte(transactions.date, startDate),
      lte(transactions.date, endDate),
      sql`${accounts.type} != 'credit' AND ${transactions.amount}::numeric > 0 AND ${transactions.isTransfer} = false`
    ));

  const balances = await db
    .select({
      cash: sql<string>`coalesce(sum(CASE WHEN ${accounts.type} != 'credit' THEN ${accounts.balanceCurrent}::numeric END), 0)`,
      debt: sql<string>`coalesce(sum(CASE WHEN ${accounts.type} = 'credit' THEN ${accounts.balanceCurrent}::numeric END), 0)`,
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

  const cash = parseFloat(balances[0]?.cash || "0");
  const debt = parseFloat(balances[0]?.debt || "0");

  return NextResponse.json({
    spendingByCategory,
    dailySpending,
    income: parseFloat(income[0]?.total || "0"),
    balances: {
      cash,
      debt,
      net: cash - debt,
    },
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
