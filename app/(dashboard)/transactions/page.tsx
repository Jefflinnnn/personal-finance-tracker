"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Transaction {
  id: string;
  amount: string;
  date: string;
  name: string;
  merchantName: string | null;
  category: string | null;
  pending: boolean;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (categoryFilter) params.set("category", categoryFilter);
    fetch(`/api/transactions?${params}`).then((r) => r.json()).then(setTransactions);
  }, [categoryFilter]);

  const categories = [...new Set(transactions.map((t) => t.category).filter(Boolean))];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Transactions</h2>

      <div className="mb-4">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat!}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.map((txn) => (
              <tr key={txn.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-600">{formatDate(txn.date)}</td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {txn.merchantName || txn.name}
                  {txn.pending && <span className="ml-2 text-xs text-orange-500">pending</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{txn.category || "Uncategorized"}</td>
                <td className="px-4 py-3 text-sm text-right font-medium">
                  <span className={parseFloat(txn.amount) > 0 ? "text-red-600" : "text-green-600"}>
                    {formatCurrency(parseFloat(txn.amount))}
                  </span>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  No transactions yet. Link an account to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
