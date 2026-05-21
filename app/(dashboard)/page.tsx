"use client";

import { useEffect, useState } from "react";
import { SpendingTrend } from "@/components/charts/SpendingTrend";
import { SpendingHeatmap } from "@/components/charts/SpendingHeatmap";
import { WeeklySpending } from "@/components/charts/WeeklySpending";
import { MonthlySpending } from "@/components/charts/MonthlySpending";
import { SavingsChart } from "@/components/charts/SavingsChart";
import { BudgetProgress } from "@/components/charts/BudgetProgress";
import { PortfolioAllocation } from "@/components/charts/PortfolioAllocation";
import { NetWorthHistory } from "@/components/charts/NetWorthHistory";
import { formatCurrency } from "@/lib/utils";

interface Analytics {
  spendingByCategory: { category: string; total: string; count: string }[];
  dailySpending: { date: string; total: string }[];
  weeklySpending: { week: string; total: string }[];
  monthlySpending: { month: string; total: string }[];
  savingsHistory: { month: string; income: number; expenses: number; saved: number; savingsRate: number }[];
  income: number;
  balances: { cash: number; debt: number; net: number };
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
  const [heatmapData, setHeatmapData] = useState<{ date: string; total: number }[]>([]);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);

  useEffect(() => {
    fetch("/api/analytics?period=month").then((r) => r.json()).then(setAnalytics);
    fetch("/api/analytics?period=quarter").then((r) => r.json()).then((data) => {
      setHeatmapData(data.dailySpending.map((d: { date: string; total: string }) => ({
        date: d.date,
        total: parseFloat(d.total),
      })));
    });
    fetch("/api/budget").then((r) => r.json()).then(setBudgets);
  }, []);

  if (!analytics) {
    return <div className="text-gray-400">Loading...</div>;
  }

  const dailyData = analytics.dailySpending.map((d) => ({
    date: d.date,
    total: parseFloat(d.total),
  }));

  const totalSpent = dailyData.reduce((s, d) => s + d.total, 0);
  const savingsRate = analytics.income > 0
    ? ((analytics.income - totalSpent) / analytics.income) * 100
    : 0;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <StatCard label="Cash" value={formatCurrency(analytics.balances.cash)} />
        <StatCard label="Credit Owed" value={formatCurrency(analytics.balances.debt)} positive={false} />
        <StatCard label="Net Balance" value={formatCurrency(analytics.balances.net)} positive={analytics.balances.net >= 0} />
        <StatCard
          label="Spent This Month"
          value={formatCurrency(totalSpent)}
        />
        <StatCard
          label="Savings Rate"
          value={`${savingsRate.toFixed(0)}%`}
          change={formatCurrency(analytics.income - totalSpent) + " saved"}
          positive={savingsRate > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SpendingTrend data={dailyData} />
        <SpendingHeatmap data={heatmapData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <WeeklySpending data={analytics.weeklySpending} />
        <MonthlySpending data={analytics.monthlySpending} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SavingsChart data={analytics.savingsHistory} />
        <BudgetProgress budgets={budgets} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
