export {};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const API_KEY = process.env.FINANCE_API_KEY;

async function main() {
  console.log(`[${new Date().toISOString()}] Running weekly analysis...`);

  const syncRes = await fetch(`${BASE_URL}/api/plaid/sync-transactions`, {
    method: "POST",
    headers: { "x-api-key": API_KEY! },
  });
  if (!syncRes.ok) console.error("Transaction sync failed:", await syncRes.text());

  const investRes = await fetch(`${BASE_URL}/api/plaid/sync-investments`, {
    method: "POST",
    headers: { "x-api-key": API_KEY! },
  });
  if (!investRes.ok) console.error("Investment sync failed:", await investRes.text());

  const res = await fetch(`${BASE_URL}/api/cron/weekly-analysis`, {
    method: "POST",
    headers: { "x-api-key": API_KEY! },
  });

  if (!res.ok) {
    console.error("Weekly analysis failed:", await res.text());
    process.exit(1);
  }

  const result = await res.json();
  console.log("Weekly analysis sent to Discord");
  console.log("Verdict:", result.verdict);
  console.log("Analysis:", result.analysis);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
