const TELLER_BASE_URL = "https://api.teller.io";

interface TellerRequestOptions {
  method?: string;
  body?: unknown;
}

export async function tellerFetch<T>(path: string, accessToken: string, options: TellerRequestOptions = {}): Promise<T> {
  const { method = "GET", body } = options;

  const headers: Record<string, string> = {
    "Authorization": `Basic ${Buffer.from(`${accessToken}:`).toString("base64")}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(`${TELLER_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Teller API error (${response.status}): ${error}`);
  }

  return response.json();
}

export interface TellerAccount {
  id: string;
  enrollment_id: string;
  name: string;
  type: "depository" | "credit";
  subtype: string;
  currency: string;
  last_four: string;
  status: "open" | "closed";
  institution: { id: string; name: string };
  links: { balances: string; transactions: string };
}

export interface TellerBalance {
  account_id: string;
  available: string;
  ledger: string;
}

export interface TellerTransaction {
  id: string;
  account_id: string;
  amount: string;
  date: string;
  description: string;
  details: { category: string; counterparty: { name: string } | null; processing_status: string };
  status: "pending" | "posted";
  type: string;
}

export async function getAccounts(accessToken: string): Promise<TellerAccount[]> {
  return tellerFetch("/accounts", accessToken);
}

export async function getAccountBalances(accessToken: string, accountId: string): Promise<TellerBalance> {
  return tellerFetch(`/accounts/${accountId}/balances`, accessToken);
}

export async function getTransactions(accessToken: string, accountId: string): Promise<TellerTransaction[]> {
  return tellerFetch(`/accounts/${accountId}/transactions`, accessToken);
}
