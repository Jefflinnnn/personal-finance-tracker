"use client";

import { useEffect, useState, useCallback } from "react";
import { usePlaidLink, PlaidLinkOnSuccessMetadata } from "react-plaid-link";

interface Account {
  id: string;
  name: string;
  officialName: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  balanceCurrent: string | null;
  institution: string | null;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [linkToken, setLinkToken] = useState<string | null>(null);

  const loadAccounts = () => {
    fetch("/api/analytics?period=month")
      .then((r) => r.json())
      .then(() => {
        fetch("/api/transactions?limit=0").then(() => {});
      });
  };

  useEffect(() => {
    fetch("/api/plaid/create-link-token", { method: "POST" })
      .then((r) => r.json())
      .then((data) => setLinkToken(data.link_token))
      .catch(console.error);

    loadAccounts();
  }, []);

  const onSuccess = useCallback(async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
    await fetch("/api/plaid/exchange-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        public_token: publicToken,
        institution: metadata.institution,
      }),
    });
    window.location.reload();
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Linked Accounts</h2>

      <button
        onClick={() => open()}
        disabled={!ready}
        className="mb-8 bg-gray-900 text-white rounded-lg px-6 py-3 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
      >
        Link New Account
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
                  ${parseFloat(acct.balanceCurrent).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <p className="text-gray-400">No accounts linked yet. Click &quot;Link New Account&quot; to connect Chase or Fidelity.</p>
        )}
      </div>
    </div>
  );
}
