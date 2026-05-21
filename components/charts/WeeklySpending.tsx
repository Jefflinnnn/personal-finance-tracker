"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface Props {
  data: { week: string; total: string }[];
}

export function WeeklySpending({ data }: Props) {
  const chartData = data.map((d) => ({
    week: format(new Date(d.week), "MMM d"),
    total: parseFloat(d.total),
  }));

  const avg = chartData.length > 0
    ? chartData.reduce((s, d) => s + d.total, 0) / chartData.length
    : 0;

  return (
    <div className="bg-white border rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-gray-500">Weekly Spending</h3>
        <span className="text-xs text-gray-400">Avg: ${avg.toFixed(0)}/wk</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="week" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
          <Tooltip formatter={(v) => [`$${Number(v).toFixed(0)}`, "Spent"]} />
          <Bar dataKey="total" fill="#374151" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
