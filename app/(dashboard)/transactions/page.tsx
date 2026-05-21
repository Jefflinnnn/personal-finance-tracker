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
  userCategory: string | null;
  isTransfer: boolean;
  pending: boolean;
  accountType: string;
  accountName: string;
}

const CATEGORIES = [
  "rent", "groceries", "dining", "transportation", "shopping",
  "utilities", "health", "entertainment", "subscriptions", "insurance",
  "phone", "home", "office", "education", "income", "general",
];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showTransfers, setShowTransfers] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadTransactions = () => {
    const params = new URLSearchParams();
    if (categoryFilter) params.set("category", categoryFilter);
    if (showTransfers) params.set("transfers", "true");
    params.set("limit", "200");
    fetch(`/api/transactions?${params}`).then((r) => r.json()).then(setTransactions);
  };

  useEffect(loadTransactions, [categoryFilter, showTransfers]);

  const updateCategory = async (id: string, userCategory: string) => {
    await fetch("/api/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, userCategory }),
    });
    setEditingId(null);
    loadTransactions();
  };

  const toggleTransfer = async (id: string, isTransfer: boolean) => {
    await fetch("/api/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isTransfer }),
    });
    loadTransactions();
  };

  const displayCategory = (t: Transaction) => t.userCategory || t.category || "uncategorized";

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Transactions</h2>

      <div className="flex gap-3 mb-4 items-center">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showTransfers}
            onChange={(e) => setShowTransfers(e.target.checked)}
            className="rounded"
          />
          Show transfers
        </label>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Account</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.map((txn) => {
              const isExpense = txn.accountType === "credit"
                ? parseFloat(txn.amount) > 0
                : parseFloat(txn.amount) < 0;
              const displayAmount = Math.abs(parseFloat(txn.amount));

              return (
                <tr key={txn.id} className={`hover:bg-gray-50 ${txn.isTransfer ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(txn.date)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {txn.merchantName || txn.name}
                    {txn.pending && <span className="ml-2 text-xs text-orange-500">pending</span>}
                    {txn.isTransfer && <span className="ml-2 text-xs text-blue-500">transfer</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{txn.accountName}</td>
                  <td className="px-4 py-3 text-sm">
                    {editingId === txn.id ? (
                      <select
                        autoFocus
                        defaultValue={displayCategory(txn)}
                        onChange={(e) => updateCategory(txn.id, e.target.value)}
                        onBlur={() => setEditingId(null)}
                        className="border rounded px-2 py-1 text-xs"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingId(txn.id)}
                        className="text-gray-500 hover:text-gray-900 hover:underline text-sm"
                      >
                        {displayCategory(txn)}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    <span className={isExpense ? "text-red-600" : "text-green-600"}>
                      {isExpense ? "-" : "+"}{formatCurrency(displayAmount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleTransfer(txn.id, !txn.isTransfer)}
                      className={`text-xs px-2 py-1 rounded ${
                        txn.isTransfer
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                      title={txn.isTransfer ? "Unmark as transfer" : "Mark as transfer"}
                    >
                      {txn.isTransfer ? "Undo" : "Transfer"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
