"use client";

import { useEffect, useState, useRef } from "react";
import { PortfolioAllocation } from "@/components/charts/PortfolioAllocation";
import { formatCurrency } from "@/lib/utils";

interface Holding {
  id: string;
  ticker: string | null;
  name: string;
  quantity: string;
  costBasis: string | null;
  currentValue: string;
  closePrice: string | null;
}

interface Portfolio {
  value: number;
  costBasis: number;
  gainLoss: number;
  gainLossPercent: number;
}

export default function InvestmentsPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    fetch("/api/analytics?period=month").then((r) => r.json()).then((data) => {
      setHoldings(data.holdings);
      setPortfolio(data.portfolio);
    });
  };

  useEffect(loadData, []);

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportMessage("");

    try {
      const text = await file.text();
      const parsed = parseFidelityCsv(text);

      const res = await fetch("/api/investments/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdings: parsed }),
      });

      const result = await res.json();
      if (res.ok) {
        setImportMessage(`Imported ${result.imported} positions successfully.`);
        loadData();
      } else {
        setImportMessage(`Import failed: ${result.error}`);
      }
    } catch (err) {
      setImportMessage(`Error reading file: ${err}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Investments</h2>

      {portfolio && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border rounded-xl p-5">
            <p className="text-sm text-gray-500">Portfolio Value</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(portfolio.value)}</p>
          </div>
          <div className="bg-white border rounded-xl p-5">
            <p className="text-sm text-gray-500">Total Gain/Loss</p>
            <p className={`text-2xl font-bold mt-1 ${portfolio.gainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(portfolio.gainLoss)}
            </p>
          </div>
          <div className="bg-white border rounded-xl p-5">
            <p className="text-sm text-gray-500">Return</p>
            <p className={`text-2xl font-bold mt-1 ${portfolio.gainLossPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
              {portfolio.gainLossPercent >= 0 ? "+" : ""}{portfolio.gainLossPercent.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PortfolioAllocation holdings={holdings} />

        <div className="bg-white border rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Holdings</h3>
          <div className="space-y-3">
            {holdings.map((h) => {
              const gain = h.costBasis
                ? parseFloat(h.currentValue) - parseFloat(h.costBasis)
                : null;
              return (
                <div key={h.id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="font-medium text-gray-900">{h.ticker || h.name}</p>
                    <p className="text-xs text-gray-500">{parseFloat(h.quantity).toFixed(2)} shares</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(parseFloat(h.currentValue))}</p>
                    {gain !== null && (
                      <p className={`text-xs ${gain >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {gain >= 0 ? "+" : ""}{formatCurrency(gain)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            {holdings.length === 0 && (
              <p className="text-sm text-gray-400">No holdings. Import from Fidelity below.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white border rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Import from Fidelity</h3>
        <p className="text-xs text-gray-400 mb-4">
          Export your positions from Fidelity (Positions page → Download) and upload the CSV here.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleCsvImport}
          disabled={importing}
          className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-900 file:text-white hover:file:bg-gray-800 disabled:opacity-50"
        />
        {importMessage && (
          <p className={`mt-2 text-sm ${importMessage.includes("failed") || importMessage.includes("Error") ? "text-red-600" : "text-green-600"}`}>
            {importMessage}
          </p>
        )}
      </div>
    </div>
  );
}

function parseFidelityCsv(text: string) {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = headerLine.split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

  const tickerIdx = headers.findIndex((h) => h === "symbol" || h === "ticker");
  const nameIdx = headers.findIndex((h) => h === "description" || h === "security name" || h === "name");
  const qtyIdx = headers.findIndex((h) => h === "quantity" || h === "shares");
  const costIdx = headers.findIndex((h) => h.includes("cost basis") || h === "cost basis total");
  const valueIdx = headers.findIndex((h) => h.includes("current value") || h === "market value");
  const priceIdx = headers.findIndex((h) => h.includes("last price") || h === "price");
  const accountIdx = headers.findIndex((h) => h.includes("account"));

  const holdings = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 3) continue;

    const ticker = tickerIdx >= 0 ? cols[tickerIdx]?.trim() : null;
    const name = nameIdx >= 0 ? cols[nameIdx]?.trim() : ticker || "Unknown";
    const quantity = qtyIdx >= 0 ? parseNumber(cols[qtyIdx]) : 0;
    const costBasis = costIdx >= 0 ? parseNumber(cols[costIdx]) : null;
    const currentValue = valueIdx >= 0 ? parseNumber(cols[valueIdx]) : 0;
    const closePrice = priceIdx >= 0 ? parseNumber(cols[priceIdx]) : null;
    const accountName = accountIdx >= 0 ? cols[accountIdx]?.trim() : null;

    if (!name || quantity === 0) continue;
    if (ticker === "Pending Activity" || name.toLowerCase().includes("pending")) continue;

    holdings.push({ ticker, name, quantity, costBasis, currentValue, closePrice, accountName });
  }

  return holdings;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseNumber(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[$,%'"]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
