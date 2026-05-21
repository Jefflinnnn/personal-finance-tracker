export {};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const API_KEY = process.env.FINANCE_API_KEY;

async function main() {
  console.log(`[${new Date().toISOString()}] Running daily summary...`);

  const syncRes = await fetch(`${BASE_URL}/api/plaid/sync-transactions`, {
    method: "POST",
    headers: { "x-api-key": API_KEY! },
  });

  if (!syncRes.ok) {
    console.error("Transaction sync failed:", await syncRes.text());
  } else {
    console.log("Transactions synced:", await syncRes.json());
  }

  const res = await fetch(`${BASE_URL}/api/cron/daily-summary`, {
    method: "POST",
    headers: { "x-api-key": API_KEY! },
  });

  if (!res.ok) {
    console.error("Daily summary failed:", await res.text());
    process.exit(1);
  }

  const result = await res.json();
  console.log("Daily summary sent to Discord");
  console.log("Summary:", result.summary);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
