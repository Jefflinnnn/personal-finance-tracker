"use client";

import { useEffect, useState } from "react";
import { SpendingTrend } from "@/components/charts/SpendingTrend";
import { BudgetProgress } from "@/components/charts/BudgetProgress";
import { PortfolioAllocation } from "@/components/charts/PortfolioAllocation";
import { NetWorthHistory } from "@/components/charts/NetWorthHistory";
import { formatCurrency } from "@/lib/utils";

interface Analytics {
  spendingByCategory: { category: string; total: string; count: string }[];
  dailySpending: { date: string; total: string }[];
  totalBalance: string;
  portfolio: { value: number; costBasis: number; gainLoss: number; gainLossPercent: number };
  holdings: { ticker: string | null; name: string; currentValue: string }[];
  netWorthHistory: { date: string; netWorth: string }[];
}

interface BudgetItem {
  category: string;
  monthlyLimit: string;
  spent: number;
  percentage: number;
}

export default function OverviewPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);

  useEffect(() => {
    fetch("/api/analytics?period=month").then((r) => r.json()).then(setAnalytics);
    fetch("/api/budget").then((r) => r.json()).then(setBudgets);
  }, []);

  if (!analytics) {
    return <div className="text-gray-400">Loading...</div>;
  }

  const dailyData = analytics.dailySpending.map((d) => ({
    date: d.date,
    total: parseFloat(d.total),
  }));

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Total Balance"
          value={formatCurrency(parseFloat(analytics.totalBalance))}
        />
        <StatCard
          label="Portfolio Value"
          value={formatCurrency(analytics.portfolio.value)}
          change={`${analytics.portfolio.gainLossPercent >= 0 ? "+" : ""}${analytics.portfolio.gainLossPercent.toFixed(1)}%`}
          positive={analytics.portfolio.gainLossPercent >= 0}
        />
        <StatCard
          label="This Month Spent"
          value={formatCurrency(dailyData.reduce((s, d) => s + d.total, 0))}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendingTrend data={dailyData} />
        <BudgetProgress budgets={budgets} />
        <PortfolioAllocation holdings={analytics.holdings} />
        <NetWorthHistory data={analytics.netWorthHistory} />
      </div>
    </div>
  );
}

function StatCard({ label, value, change, positive }: {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-white border rounded-xl p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {change && (
        <p className={`text-sm mt-1 ${positive ? "text-green-600" : "text-red-600"}`}>
          {change}
        </p>
      )}
    </div>
  );
}
