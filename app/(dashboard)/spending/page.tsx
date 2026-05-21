"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface CategorySpend {
  category: string;
  total: string;
  count: string;
}

interface Transaction {
  id: string;
  amount: string;
  date: string;
  name: string;
  merchantName: string | null;
  category: string | null;
  userCategory: string | null;
  accountType: string;
  accountName: string;
}

const COLORS = [
  "#111827", "#374151", "#6B7280", "#9CA3AF", "#D1D5DB",
  "#2563EB", "#7C3AED", "#DB2777", "#DC2626", "#EA580C",
  "#16A34A", "#0891B2", "#4F46E5", "#CA8A04", "#65A30D",
];

export default function SpendingPage() {
  const [categories, setCategories] = useState<CategorySpend[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    fetch(`/api/analytics?period=month`).then((r) => r.json()).then((data) => {
      setCategories(data.spendingByCategory);
    });
  }, [month]);

  useEffect(() => {
    if (!selectedCategory) {
      setTransactions([]);
      return;
    }
    const params = new URLSearchParams({ category: selectedCategory, limit: "50" });
    fetch(`/api/transactions?${params}`).then((r) => r.json()).then(setTransactions);
  }, [selectedCategory]);

  const sorted = [...categories].sort((a, b) => parseFloat(b.total) - parseFloat(a.total));
  const total = sorted.reduce((s, c) => s + parseFloat(c.total), 0);

  const pieData = sorted.map((c) => ({
    name: c.category || "uncategorized",
    value: parseFloat(c.total),
  }));

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Spending Breakdown</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white border rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">By Category</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-center text-sm text-gray-500 mt-2">
            Total: <span className="font-bold text-gray-900">{formatCurrency(total)}</span>
          </p>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white border rounded-xl p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4">
              Categories {selectedCategory && <span className="text-gray-900">→ {selectedCategory}</span>}
            </h3>
            <div className="space-y-2">
              {sorted.map((cat, i) => {
                const amount = parseFloat(cat.total);
                const pct = total > 0 ? (amount / total) * 100 : 0;
                const isSelected = selectedCategory === (cat.category || "uncategorized");

                return (
                  <button
                    key={cat.category || "uncategorized"}
                    onClick={() => setSelectedCategory(isSelected ? null : (cat.category || "uncategorized"))}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      isSelected ? "bg-gray-100 ring-1 ring-gray-300" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-sm font-medium text-gray-900">{cat.category || "uncategorized"}</span>
                        <span className="text-xs text-gray-400">{cat.count} txns</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(amount)}</span>
                        <span className="text-xs text-gray-400 ml-2">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {selectedCategory && transactions.length > 0 && (
        <div className="mt-6 bg-white border rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">
            {selectedCategory} — transactions
          </h3>
          <div className="space-y-2">
            {transactions.map((txn) => {
              const isExpense = txn.accountType === "credit"
                ? parseFloat(txn.amount) > 0
                : parseFloat(txn.amount) < 0;
              const displayAmount = Math.abs(parseFloat(txn.amount));

              return (
                <div key={txn.id} className="flex justify-between items-center py-2 border-b border-gray-50">
                  <div>
                    <p className="text-sm text-gray-900">{txn.merchantName || txn.name}</p>
                    <p className="text-xs text-gray-400">{txn.date} — {txn.accountName}</p>
                  </div>
                  <span className={`text-sm font-medium ${isExpense ? "text-red-600" : "text-green-600"}`}>
                    {isExpense ? "-" : "+"}{formatCurrency(displayAmount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
