import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { plaidClient } from "@/lib/plaid/client";
import { db } from "@/lib/db";
import { plaidItems, accounts } from "@/lib/db/schema";

export async function POST(request: Request) {
  try {
    const { public_token, institution } = await request.json();

    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const { access_token, item_id } = exchangeResponse.data;

    await db.insert(plaidItems).values({
      itemId: item_id,
      accessToken: access_token,
      institutionId: institution?.institution_id || null,
      institutionName: institution?.name || null,
    });

    const accountsResponse = await plaidClient.accountsGet({ access_token });

    const [item] = await db.select().from(plaidItems).where(eq(plaidItems.itemId, item_id));

    for (const acct of accountsResponse.data.accounts) {

      await db.insert(accounts).values({
        plaidItemId: item.id,
        plaidAccountId: acct.account_id,
        name: acct.name,
        officialName: acct.official_name || null,
        type: mapAccountType(acct.type),
        subtype: acct.subtype || null,
        mask: acct.mask || null,
        balanceCurrent: acct.balances.current ? String(acct.balances.current) : null,
        balanceAvailable: acct.balances.available ? String(acct.balances.available) : null,
        institution: institution?.name || null,
      });
    }

    return NextResponse.json({ success: true, item_id });
  } catch (error) {
    console.error("Exchange token error:", error);
    return NextResponse.json({ error: "Failed to exchange token" }, { status: 500 });
  }
}

function mapAccountType(type: string): "depository" | "credit" | "investment" | "loan" | "other" {
  if (["depository", "credit", "investment", "loan"].includes(type)) {
    return type as "depository" | "credit" | "investment" | "loan";
  }
  return "other";
}
