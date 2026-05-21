import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { plaidItems } from "@/lib/db/schema";
import { syncTransactions } from "@/lib/plaid/sync";
import { validateApiKey } from "@/lib/utils";

export async function POST(request: Request) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await db.select().from(plaidItems);
    const results = [];

    for (const item of items) {
      const result = await syncTransactions(item.itemId);
      results.push({ itemId: item.itemId, ...result });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Sync transactions error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
