"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { PortfolioAllocation } from "@/components/charts/PortfolioAllocation";
import { formatCurrency } from "@/lib/utils";
import { Upload } from "lucide-react";

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
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    fetch("/api/analytics?period=month").then((r) => r.json()).then((data) => {
      setHoldings(data.holdings);
      setPortfolio(data.portfolio);
    });
  };

  useEffect(loadData, []);

  const importFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setImportMessage("Please upload a CSV file.");
      return;
    }

    setImporting(true);
    setImportMessage("");

    try {
      const text = await file.text();
      const parsed = parseFidelityCsv(text);

      if (parsed.length === 0) {
        setImportMessage("No valid positions found in the CSV. Make sure it's a Fidelity positions export.");
        setImporting(false);
        return;
      }

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
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) importFile(file);
  }, [importFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importFile(file);
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

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`mb-8 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragActive
            ? "border-gray-900 bg-gray-50"
            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
        } ${importing ? "opacity-50 pointer-events-none" : ""}`}
      >
        <Upload className="h-8 w-8 mx-auto mb-3 text-gray-400" />
        <p className="text-sm font-medium text-gray-700">
          {importing ? "Importing..." : "Drag & drop your Fidelity CSV here"}
        </p>
        <p className="text-xs text-gray-400 mt-1">or click to browse</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <a
          href="https://digital.fidelity.com/ftgw/digital/portfolio/positions"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-block mt-4 text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Download positions CSV from Fidelity →
        </a>
      </div>

      {importMessage && (
        <div className={`mb-6 p-3 rounded-lg text-sm ${
          importMessage.includes("failed") || importMessage.includes("Error") || importMessage.includes("No valid")
            ? "bg-red-50 text-red-700"
            : "bg-green-50 text-green-700"
        }`}>
          {importMessage}
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
              <p className="text-sm text-gray-400">No holdings yet. Drop a Fidelity CSV above to import.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-xl border">
        <h4 className="text-sm font-medium text-gray-700 mb-2">How to export from Fidelity</h4>
        <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
          <li>Go to <a href="https://digital.fidelity.com/ftgw/digital/portfolio/positions" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Fidelity Positions</a></li>
          <li>Click the &quot;Download&quot; icon (top-right of the positions table)</li>
          <li>Select &quot;Download All&quot; to get a CSV of all your holdings</li>
          <li>Drag the downloaded file into the drop zone above</li>
        </ol>
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
