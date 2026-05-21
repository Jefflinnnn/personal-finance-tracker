import { getAccounts, getAccountBalances, getTransactions } from "../lib/teller/client";

const TOKEN = process.env.TELLER_ACCESS_TOKEN || "token_zbtfccl4u5a4odcbxtn3zyw4vi";

async function main() {
  console.log("Testing Teller connection...\n");

  const accounts = await getAccounts(TOKEN);
  console.log(`Found ${accounts.length} account(s):\n`);

  for (const acct of accounts) {
    console.log(`  ${acct.institution.name} - ${acct.name} (${acct.type}/${acct.subtype}) ••••${acct.last_four}`);

    try {
      const balance = await getAccountBalances(TOKEN, acct.id);
      console.log(`    Balance: $${balance.ledger} (available: $${balance.available})`);
    } catch (e) {
      console.log(`    Balance: unavailable`);
    }

    try {
      const txns = await getTransactions(TOKEN, acct.id);
      console.log(`    Transactions: ${txns.length} recent`);
      if (txns.length > 0) {
        console.log(`    Latest: ${txns[0].date} - ${txns[0].description} - $${txns[0].amount}`);
      }
    } catch (e) {
      console.log(`    Transactions: unavailable`);
    }

    console.log();
  }
}

main().catch((err) => {
  console.error("Connection failed:", err.message);
  process.exit(1);
});
