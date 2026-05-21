import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, accounts } from "@/lib/db/schema";
import { desc, gte, lte, eq, and, sql, ilike } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("start");
  const endDate = searchParams.get("end");
  const category = searchParams.get("category");
  const showTransfers = searchParams.get("transfers") === "true";
  const limit = parseInt(searchParams.get("limit") || "100");

  const conditions = [];
  if (startDate) conditions.push(gte(transactions.date, startDate));
  if (endDate) conditions.push(lte(transactions.date, endDate));
  if (category) conditions.push(
    sql`coalesce(${transactions.userCategory}, ${transactions.category}) = ${category}`
  );
  if (!showTransfers) conditions.push(eq(transactions.isTransfer, false));

  const results = await db
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      amount: transactions.amount,
      date: transactions.date,
      name: transactions.name,
      merchantName: transactions.merchantName,
      category: transactions.category,
      userCategory: transactions.userCategory,
      isTransfer: transactions.isTransfer,
      pending: transactions.pending,
      accountType: accounts.type,
      accountName: accounts.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(transactions.date))
    .limit(limit);

  return NextResponse.json(results);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, ids, userCategory, isTransfer } = body;

  if (!id && !ids) {
    return NextResponse.json({ error: "id or ids required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (userCategory !== undefined) updates.userCategory = userCategory;
  if (isTransfer !== undefined) updates.isTransfer = isTransfer;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  if (ids && Array.isArray(ids)) {
    for (const txnId of ids) {
      await db.update(transactions).set(updates).where(eq(transactions.id, txnId));
    }
    return NextResponse.json({ success: true, updated: ids.length });
  }

  await db.update(transactions).set(updates).where(eq(transactions.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.delete(transactions).where(eq(transactions.id, id));
  return NextResponse.json({ success: true });
}
