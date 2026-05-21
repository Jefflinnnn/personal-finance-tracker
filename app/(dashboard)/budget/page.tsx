"use client";

import { useEffect, useState } from "react";
import { BudgetProgress } from "@/components/charts/BudgetProgress";
import { formatCurrency } from "@/lib/utils";

interface BudgetItem {
  id: string;
  category: string;
  monthlyLimit: string;
  spent: number;
  remaining: number;
  percentage: number;
}

export default function BudgetPage() {
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newLimit, setNewLimit] = useState("");

  const loadBudgets = () => {
    fetch("/api/budget").then((r) => r.json()).then(setBudgets);
  };

  useEffect(loadBudgets, []);

  const addBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory || !newLimit) return;

    await fetch("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: newCategory, monthlyLimit: parseFloat(newLimit) }),
    });

    setNewCategory("");
    setNewLimit("");
    loadBudgets();
  };

  const deleteBudget = async (id: string) => {
    await fetch(`/api/budget?id=${id}`, { method: "DELETE" });
    loadBudgets();
  };

  const totalBudget = budgets.reduce((s, b) => s + parseFloat(b.monthlyLimit), 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Budget</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border rounded-xl p-5">
          <p className="text-sm text-gray-500">Total Budget</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalBudget)}</p>
        </div>
        <div className="bg-white border rounded-xl p-5">
          <p className="text-sm text-gray-500">Total Spent</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="bg-white border rounded-xl p-5">
          <p className="text-sm text-gray-500">Remaining</p>
          <p className={`text-2xl font-bold mt-1 ${totalBudget - totalSpent >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(totalBudget - totalSpent)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetProgress budgets={budgets} />

        <div className="bg-white border rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Add Budget Category</h3>
          <form onSubmit={addBudget} className="space-y-3">
            <input
              type="text"
              placeholder="Category (e.g., Groceries)"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Monthly limit ($)"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="w-full bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-800"
            >
              Add Budget
            </button>
          </form>

          <div className="mt-6 space-y-2">
            {budgets.map((b) => (
              <div key={b.id} className="flex justify-between items-center text-sm">
                <span>{b.category} — {formatCurrency(parseFloat(b.monthlyLimit))}/mo</span>
                <button
                  onClick={() => deleteBudget(b.id)}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
