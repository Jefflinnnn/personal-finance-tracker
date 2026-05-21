import { db } from "@/lib/db";
import { accounts, transactions, syncLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAccounts, getAccountBalances, getTransactions, TellerAccount } from "./client";

export async function syncTellerAccounts(accessToken: string, enrollmentId: string) {
  const tellerAccounts = await getAccounts(accessToken);
  let synced = 0;

  for (const acct of tellerAccounts) {
    const balance = await getAccountBalances(accessToken, acct.id);

    await db.insert(accounts).values({
      tellerAccountId: acct.id,
      enrollmentId,
      name: acct.name,
      type: acct.type === "depository" ? "depository" : "credit",
      subtype: acct.subtype,
      mask: acct.last_four,
      balanceCurrent: balance.ledger,
      balanceAvailable: balance.available,
      institution: acct.institution.name,
    }).onConflictDoUpdate({
      target: accounts.tellerAccountId,
      set: {
        balanceCurrent: balance.ledger,
        balanceAvailable: balance.available,
        updatedAt: new Date(),
      },
    });
    synced++;
  }

  return { synced };
}

export async function syncTellerTransactions(accessToken: string) {
  const tellerAccounts = await getAccounts(accessToken);
  let added = 0;

  for (const acct of tellerAccounts) {
    const [dbAccount] = await db.select().from(accounts).where(eq(accounts.tellerAccountId, acct.id));
    if (!dbAccount) continue;

    const tellerTxns = await getTransactions(accessToken, acct.id);

    for (const txn of tellerTxns) {
      await db.insert(transactions).values({
        accountId: dbAccount.id,
        tellerTransactionId: txn.id,
        amount: txn.amount,
        date: txn.date,
        name: txn.description,
        merchantName: txn.details.counterparty?.name || null,
        category: txn.details.category || null,
        pending: txn.status === "pending",
      }).onConflictDoNothing();
      added++;
    }
  }

  await db.insert(syncLogs).values({
    type: "transactions",
    status: "success",
    itemsSynced: added,
  });

  return { added };
}
