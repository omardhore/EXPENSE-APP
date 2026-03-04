"use client";

import { useEffect, useState, useCallback } from "react";
import { useBudgetStore } from "@/lib/stores/budget-store";
import { useCategoryStore } from "@/lib/stores/category-store";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function BudgetWarnings() {
  const { budgets, fetchBudgets } = useBudgetStore();
  const [spending, setSpending] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchSpending = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/budgets/spending");
      const json = await res.json();
      if (json.success) {
        setSpending(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  useEffect(() => {
    if (budgets.length > 0) {
      const timerId = setTimeout(() => {
        void fetchSpending();
      }, 0);
      return () => clearTimeout(timerId);
    } else {
      setLoading(false);
    }
  }, [budgets.length, fetchSpending]);

  if (loading) return null;

  const warningBudgets = budgets
    .map((budget) => {
      const amountSpent = spending[budget.id] || 0;
      const percentage = (amountSpent / budget.limit_amount) * 100;
      return { ...budget, amountSpent, percentage };
    })
    .filter((b) => b.percentage >= b.alert_threshold)
    .sort((a, b) => b.percentage - a.percentage); // highest percent first

  if (warningBudgets.length === 0) {
    return null; // Don't render anything if everything is fine
  }

  return (
    <div className="flex flex-col gap-3">
      {warningBudgets.map((b) => {
        const isCritical = b.percentage >= 100;
        const categoryName = b.categories?.name || "General";
        const Icon = isCritical ? AlertCircle : AlertTriangle;

        return (
          <Alert
            key={b.id}
            variant={isCritical ? "destructive" : "default"}
            className={
              isCritical
                ? "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-500"
                : "border-yellow-500/50 bg-yellow-500/10 text-yellow-600"
            }
          >
            <Icon className={`h-4 w-4 ${isCritical ? "text-red-500" : "text-yellow-600"}`} />
            <AlertTitle className="flex items-center gap-2">
              {isCritical ? "Budget Exceeded!" : "Budget Warning"}
            </AlertTitle>
            <AlertDescription>
              You have spent <strong>${b.amountSpent.toFixed(2)}</strong> of your ${b.limit_amount.toFixed(2)} limit for <strong>{categoryName}</strong> ({b.percentage.toFixed(0)}%).
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
