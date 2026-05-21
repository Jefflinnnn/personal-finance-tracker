"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: { date: string; netWorth: string }[];
}

export function NetWorthHistory({ data }: Props) {
  const chartData = data.map((d) => ({
    date: d.date,
    value: parseFloat(d.netWorth),
  }));

  return (
    <div className="bg-white border rounded-xl p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-4">Net Worth</h3>
      {chartData.length > 1 ? (
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, "Net Worth"]} />
            <Area type="monotone" dataKey="value" stroke="#111827" fill="#f3f4f6" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-gray-400">Not enough data yet. Net worth will be tracked daily.</p>
      )}
    </div>
  );
}
