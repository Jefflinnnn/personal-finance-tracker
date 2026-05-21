"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Holding {
  ticker: string | null;
  name: string;
  currentValue: string;
}

interface Props {
  holdings: Holding[];
}

const COLORS = ["#111827", "#374151", "#6B7280", "#9CA3AF", "#D1D5DB", "#E5E7EB"];

export function PortfolioAllocation({ holdings }: Props) {
  const data = holdings
    .map((h) => ({ name: h.ticker || h.name, value: parseFloat(h.currentValue) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <div className="bg-white border rounded-xl p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-4">Portfolio Allocation</h3>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-gray-400">No investment holdings yet.</p>
      )}
    </div>
  );
}
