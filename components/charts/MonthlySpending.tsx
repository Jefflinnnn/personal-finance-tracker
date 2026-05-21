"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface Props {
  data: { month: string; total: string }[];
}

export function MonthlySpending({ data }: Props) {
  const chartData = data.map((d) => ({
    month: format(new Date(d.month), "MMM yyyy"),
    total: parseFloat(d.total),
  }));

  return (
    <div className="bg-white border rounded-xl p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-4">Monthly Spending</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
          <Tooltip formatter={(v) => [`$${Number(v).toFixed(0)}`, "Spent"]} />
          <Bar dataKey="total" fill="#111827" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
