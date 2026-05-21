"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";

interface Account {
  id: string;
  name: string;
  type: string;
  subtype: string | null;
  mask: string | null;
  balanceCurrent: string | null;
  balanceAvailable: string | null;
  institution: string | null;
  source: string;
}

declare global {
  interface Window {
    TellerConnect?: {
      setup: (config: {
        applicationId: string;
        environment: string;
        onSuccess: (enrollment: { accessToken: string; enrollment: { id: string; institution: { name: string } } }) => void;
        onExit: () => void;
      }) => { open: () => void };
    };
  }
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);

  const loadAccounts = () => {
    fetch("/api/analytics?period=month")
      .then((r) => r.json())
      .then(() => {});
  };

  useEffect(() => {
    loadAccounts();

    const script = document.createElement("script");
    script.src = "https://cdn.teller.io/connect/connect.js";
    script.async = true;
    document.body.appendChild(script);

    return () => { document.body.removeChild(script); };
  }, []);

  const connectAccount = useCallback(() => {
    if (!window.TellerConnect) return;

    const teller = window.TellerConnect.setup({
      applicationId: process.env.NEXT_PUBLIC_TELLER_APP_ID || "",
      environment: process.env.NEXT_PUBLIC_TELLER_ENV || "sandbox",
      onSuccess: async (enrollment) => {
        await fetch("/api/teller/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken: enrollment.accessToken,
            enrollment: enrollment.enrollment,
          }),
        });
        window.location.reload();
      },
      onExit: () => {},
    });

    teller.open();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Linked Accounts</h2>

      <button
        onClick={connectAccount}
        className="mb-8 bg-gray-900 text-white rounded-lg px-6 py-3 text-sm font-medium hover:bg-gray-800"
      >
        Link Bank Account (Teller)
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map((acct) => (
          <div key={acct.id} className="bg-white border rounded-xl p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">{acct.name}</p>
                <p className="text-sm text-gray-500">
                  {acct.institution} {acct.mask ? `••••${acct.mask}` : ""}
                </p>
                <p className="text-xs text-gray-400 mt-1 capitalize">{acct.type} — {acct.subtype}</p>
              </div>
              {acct.balanceCurrent && (
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(parseFloat(acct.balanceCurrent))}
                </p>
              )}
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <p className="text-gray-400">No accounts linked yet. Click &quot;Link Bank Account&quot; to connect Chase via Teller.</p>
        )}
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-xl border">
        <p className="text-sm text-gray-600">
          <strong>Fidelity investments:</strong> Teller doesn&apos;t support brokerage accounts.
          Go to the Investments page to import your Fidelity positions via CSV export.
        </p>
      </div>
    </div>
  );
}
