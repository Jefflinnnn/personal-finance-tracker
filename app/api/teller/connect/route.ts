import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enrollments } from "@/lib/db/schema";
import { syncTellerAccounts } from "@/lib/teller/sync";

export async function POST(request: Request) {
  try {
    const { accessToken, enrollment } = await request.json();

    await db.insert(enrollments).values({
      enrollmentId: enrollment.id,
      accessToken,
      institutionName: enrollment.institution?.name || null,
    }).onConflictDoNothing();

    await syncTellerAccounts(accessToken, enrollment.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Teller connect error:", error);
    return NextResponse.json({ error: "Failed to connect account" }, { status: 500 });
  }
}
