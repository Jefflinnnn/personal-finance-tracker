import { db } from "../lib/db";
import { enrollments } from "../lib/db/schema";
import { syncTellerAccounts, syncTellerTransactions } from "../lib/teller/sync";

const TOKEN = process.env.TELLER_ACCESS_TOKEN || "token_zbtfccl4u5a4odcbxtn3zyw4vi";
const ENROLLMENT_ID = "enr_placeholder";

async function main() {
  console.log("Seeding database from Teller...\n");

  await db.insert(enrollments).values({
    enrollmentId: ENROLLMENT_ID,
    accessToken: TOKEN,
    institutionName: "Chase",
  }).onConflictDoNothing();

  console.log("Syncing accounts...");
  const acctResult = await syncTellerAccounts(TOKEN, ENROLLMENT_ID);
  console.log(`  Synced ${acctResult.synced} accounts`);

  console.log("Syncing transactions...");
  const txnResult = await syncTellerTransactions(TOKEN);
  console.log(`  Added ${txnResult.added} transactions`);

  console.log("\nDone! Your dashboard should now show data.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
