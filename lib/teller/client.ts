import https from "node:https";
import fs from "node:fs";
import path from "node:path";

const TELLER_BASE_URL = "https://api.teller.io";

const CERT_PATH = process.env.TELLER_CERT_PATH || path.join(process.cwd(), "teller", "certificate.pem");
const KEY_PATH = process.env.TELLER_KEY_PATH || path.join(process.cwd(), "teller", "private_key.pem");

function getTlsOptions() {
  if (!fs.existsSync(CERT_PATH) || !fs.existsSync(KEY_PATH)) {
    return null;
  }
  return {
    cert: fs.readFileSync(CERT_PATH),
    key: fs.readFileSync(KEY_PATH),
  };
}

interface TellerRequestOptions {
  method?: string;
  body?: unknown;
}

export async function tellerFetch<T>(urlPath: string, accessToken: string, options: TellerRequestOptions = {}): Promise<T> {
  const { method = "GET", body } = options;
  const tls = getTlsOptions();

  const url = new URL(urlPath, TELLER_BASE_URL);

  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method,
        headers: {
          "Authorization": `Basic ${Buffer.from(`${accessToken}:`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        ...(tls && { cert: tls.cert, key: tls.key }),
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Teller API error (${res.statusCode}): ${data}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`Teller API: invalid JSON response: ${data}`));
          }
        });
      }
    );

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
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
