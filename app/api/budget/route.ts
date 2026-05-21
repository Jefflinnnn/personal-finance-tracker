import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { budgets, transactions } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { format, startOfMonth, endOfMonth } from "date-fns";

export async function GET() {
  const now = new Date();
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

  const allBudgets = await db.select().from(budgets);

  const spending = await db
    .select({
      category: transactions.category,
      total: sql<string>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .where(and(gte(transactions.date, monthStart), lte(transactions.date, monthEnd)))
    .groupBy(transactions.category);

  const budgetStatus = allBudgets.map((budget) => {
    const spent = spending.find((s) => s.category === budget.category);
    const spentAmount = spent ? parseFloat(spent.total) : 0;
    const limit = parseFloat(budget.monthlyLimit);
    return {
      ...budget,
      spent: spentAmount,
      remaining: limit - spentAmount,
      percentage: (spentAmount / limit) * 100,
    };
  });

  return NextResponse.json(budgetStatus);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { category, monthlyLimit } = body;

  if (!category || !monthlyLimit) {
    return NextResponse.json({ error: "category and monthlyLimit required" }, { status: 400 });
  }

  const [budget] = await db.insert(budgets).values({
    category,
    monthlyLimit: String(monthlyLimit),
    effectiveFrom: format(new Date(), "yyyy-MM-dd"),
  }).returning();

  return NextResponse.json(budget);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.delete(budgets).where(eq(budgets.id, id));
  return NextResponse.json({ success: true });
}
