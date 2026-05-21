import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { investmentHoldings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { holdings } = await request.json();

    if (!Array.isArray(holdings)) {
      return NextResponse.json({ error: "holdings must be an array" }, { status: 400 });
    }

    await db.delete(investmentHoldings).where(eq(investmentHoldings.source, "csv"));

    let imported = 0;
    for (const holding of holdings) {
      await db.insert(investmentHoldings).values({
        accountName: holding.accountName || null,
        ticker: holding.ticker || null,
        name: holding.name,
        quantity: String(holding.quantity),
        costBasis: holding.costBasis ? String(holding.costBasis) : null,
        currentValue: String(holding.currentValue),
        closePrice: holding.closePrice ? String(holding.closePrice) : null,
        source: "csv",
      });
      imported++;
    }

    return NextResponse.json({ success: true, imported });
  } catch (error) {
    console.error("Investment import error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
