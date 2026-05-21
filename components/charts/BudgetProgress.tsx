"use client";

import { cn } from "@/lib/utils";

interface BudgetItem {
  category: string;
  monthlyLimit: string;
  spent: number;
  percentage: number;
}

interface Props {
  budgets: BudgetItem[];
}

export function BudgetProgress({ budgets }: Props) {
  return (
    <div className="bg-white border rounded-xl p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-4">Budget Progress</h3>
      <div className="space-y-4">
        {budgets.map((budget) => (
          <div key={budget.category}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-gray-700">{budget.category}</span>
              <span className="text-gray-500">
                ${budget.spent.toFixed(0)} / ${parseFloat(budget.monthlyLimit).toFixed(0)}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  budget.percentage > 100 ? "bg-red-500" :
                  budget.percentage > 80 ? "bg-orange-400" :
                  "bg-green-500"
                )}
                style={{ width: `${Math.min(budget.percentage, 100)}%` }}
              />
            </div>
          </div>
        ))}
        {budgets.length === 0 && (
          <p className="text-sm text-gray-400">No budgets set. Add one in the Budget page.</p>
        )}
      </div>
    </div>
  );
}
