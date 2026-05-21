import { plaidClient } from "./client";
import { db } from "@/lib/db";
import { accounts, transactions, investmentHoldings, plaidItems, syncLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function syncTransactions(itemId: string) {
  const [item] = await db.select().from(plaidItems).where(eq(plaidItems.itemId, itemId));
  if (!item) throw new Error(`Plaid item not found: ${itemId}`);

  let cursor = item.cursor;
  let hasMore = true;
  let added = 0;
  let modified = 0;
  let removed = 0;

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: item.accessToken,
      cursor: cursor || undefined,
    });

    const data = response.data;

    for (const txn of data.added) {
      const [acct] = await db.select().from(accounts).where(eq(accounts.plaidAccountId, txn.account_id));
      if (!acct) continue;

      await db.insert(transactions).values({
        accountId: acct.id,
        plaidTransactionId: txn.transaction_id,
        amount: String(txn.amount),
        date: txn.date,
        name: txn.name,
        merchantName: txn.merchant_name || null,
        category: txn.personal_finance_category?.primary || null,
        subcategory: txn.personal_finance_category?.detailed || null,
        pending: txn.pending,
      }).onConflictDoNothing();
      added++;
    }

    for (const txn of data.modified) {
      await db.update(transactions)
        .set({
          amount: String(txn.amount),
          name: txn.name,
          merchantName: txn.merchant_name || null,
          category: txn.personal_finance_category?.primary || null,
          pending: txn.pending,
        })
        .where(eq(transactions.plaidTransactionId, txn.transaction_id));
      modified++;
    }

    for (const txn of data.removed) {
      if (txn.transaction_id) {
        await db.delete(transactions).where(eq(transactions.plaidTransactionId, txn.transaction_id));
        removed++;
      }
    }

    cursor = data.next_cursor;
    hasMore = data.has_more;
  }

  await db.update(plaidItems).set({ cursor, updatedAt: new Date() }).where(eq(plaidItems.id, item.id));

  await db.insert(syncLogs).values({
    type: "transactions",
    status: "success",
    itemsSynced: added + modified + removed,
  });

  return { added, modified, removed };
}

export async function syncInvestments(itemId: string) {
  const [item] = await db.select().from(plaidItems).where(eq(plaidItems.itemId, itemId));
  if (!item) throw new Error(`Plaid item not found: ${itemId}`);

  const response = await plaidClient.investmentsHoldingsGet({
    access_token: item.accessToken,
  });

  const holdings = response.data.holdings;
  const securities = response.data.securities;
  let synced = 0;

  for (const holding of holdings) {
    const [acct] = await db.select().from(accounts).where(eq(accounts.plaidAccountId, holding.account_id));
    if (!acct) continue;

    const security = securities.find(s => s.security_id === holding.security_id);

    await db.insert(investmentHoldings).values({
      accountId: acct.id,
      plaidSecurityId: holding.security_id,
      ticker: security?.ticker_symbol || null,
      name: security?.name || "Unknown",
      quantity: String(holding.quantity),
      costBasis: holding.cost_basis ? String(holding.cost_basis) : null,
      currentValue: String(holding.institution_value),
      closePrice: security?.close_price ? String(security.close_price) : null,
    }).onConflictDoNothing();
    synced++;
  }

  await db.insert(syncLogs).values({
    type: "investments",
    status: "success",
    itemsSynced: synced,
  });

  return { synced };
}
