import { NextResponse } from "next/server";
import { syncTransactions } from "@/lib/plaid/sync";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { webhook_type, webhook_code, item_id } = body;

    if (webhook_type === "TRANSACTIONS") {
      if (["SYNC_UPDATES_AVAILABLE", "INITIAL_UPDATE", "DEFAULT_UPDATE"].includes(webhook_code)) {
        await syncTransactions(item_id);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
