import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enrollments } from "@/lib/db/schema";
import { syncTellerAccounts, syncTellerTransactions } from "@/lib/teller/sync";
import { validateApiKey } from "@/lib/utils";

export async function POST(request: Request) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const allEnrollments = await db.select().from(enrollments);
    const results = [];

    for (const enrollment of allEnrollments) {
      await syncTellerAccounts(enrollment.accessToken, enrollment.enrollmentId);
      const txnResult = await syncTellerTransactions(enrollment.accessToken);
      results.push({ enrollment: enrollment.enrollmentId, ...txnResult });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Teller sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
