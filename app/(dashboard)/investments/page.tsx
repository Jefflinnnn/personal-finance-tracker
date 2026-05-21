"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    fetch("/api/analytics?period=month").then((r) => r.json()).then((data) => {
      setHoldings(data.holdings);
      setPortfolio(data.portfolio);
    });
  }, []);

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
              <p className="text-sm text-gray-400">No holdings. Link a Fidelity account to see investments.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
