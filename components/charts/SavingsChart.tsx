"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

interface SavingsData {
  month: string;
  income: number;
  expenses: number;
  saved: number;
  savingsRate: number;
}

interface Props {
  data: SavingsData[];
}

export function SavingsChart({ data }: Props) {
  const chartData = data.map((d) => ({
    month: format(new Date(d.month), "MMM"),
    income: d.income,
    expenses: d.expenses,
    saved: d.saved,
    savingsRate: d.savingsRate,
  }));

  const avgRate = data.length > 0
    ? data.reduce((s, d) => s + d.savingsRate, 0) / data.length
    : 0;

  const totalSaved = data.reduce((s, d) => s + d.saved, 0);

  return (
    <div className="bg-white border rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-gray-500">Savings</h3>
        <div className="text-right">
          <span className="text-xs text-gray-400">Avg rate: {avgRate.toFixed(0)}%</span>
          <span className="text-xs text-gray-400 ml-3">Total saved: {formatCurrency(totalSaved)}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-white border rounded-lg shadow-sm p-3 text-xs">
                  <p className="font-medium text-gray-900 mb-1">{d.month}</p>
                  <p className="text-green-600">Income: {formatCurrency(d.income)}</p>
                  <p className="text-red-600">Expenses: {formatCurrency(d.expenses)}</p>
                  <p className={`font-medium ${d.saved >= 0 ? "text-blue-600" : "text-red-600"}`}>
                    Saved: {formatCurrency(d.saved)} ({d.savingsRate.toFixed(0)}%)
                  </p>
                </div>
              );
            }}
          />
          <ReferenceLine y={0} stroke="#9CA3AF" />
          <Bar dataKey="income" fill="#86EFAC" radius={[4, 4, 0, 0]} name="Income" />
          <Bar dataKey="expenses" fill="#FCA5A5" radius={[4, 4, 0, 0]} name="Expenses" />
        </BarChart>
      </ResponsiveContainer>

      <div className="flex gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-300 rounded" /> Income</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-300 rounded" /> Expenses</span>
      </div>
    </div>
  );
}
