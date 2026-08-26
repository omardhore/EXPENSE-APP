import { useCallback, useEffect, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
} from "date-fns";
import { supabase } from "@/lib/supabase";
import { getCurrentUser, requireUserId } from "@/lib/session";
import type { Budget, BudgetPeriod } from "@/lib/database.types";

export interface BudgetWithCategory extends Budget {
  categories: { name: string; icon: string | null; color: string | null } | null;
}

export interface BudgetInput {
  category_id: string | null;
  period: BudgetPeriod;
  limit_amount: number;
  alert_threshold: number;
  start_date: string;
  end_date: string | null;
}

function getPeriodRange(period: BudgetPeriod) {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().split("T")[0];
  switch (period) {
    case "quarterly":
      return { from: iso(startOfQuarter(now)), to: iso(endOfQuarter(now)) };
    case "yearly":
      return { from: iso(startOfYear(now)), to: iso(endOfYear(now)) };
    case "monthly":
    default:
      return { from: iso(startOfMonth(now)), to: iso(endOfMonth(now)) };
  }
}

export function useBudgets() {
  const [budgets, setBudgets] = useState<BudgetWithCategory[]>([]);
  const [spending, setSpending] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);

    const user = await getCurrentUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("budgets")
      .select("*, categories(name, icon, color)")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as unknown as BudgetWithCategory[];
    setBudgets(rows);

    const spendingEntries = await Promise.all(
      rows.map(async (budget) => {
        const { from, to } = getPeriodRange(budget.period);
        let query = supabase
          .from("expenses")
          .select("amount")
          .is("deleted_at", null)
          .gte("date", from)
          .lte("date", to);
        if (budget.category_id) {
          query = query.eq("category_id", budget.category_id);
        }
        const { data: expenses } = await query;
        const total = (expenses ?? []).reduce(
          (sum, e) => sum + Number(e.amount),
          0,
        );
        return [budget.id, total] as const;
      }),
    );
    setSpending(Object.fromEntries(spendingEntries));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  async function createBudget(input: BudgetInput) {
    const userId = await requireUserId();

    const { data, error } = await supabase
      .from("budgets")
      .insert({ ...input, user_id: userId })
      .select("*, categories(name, icon, color)")
      .single();
    if (error) throw new Error(error.message);
    await fetchBudgets();
    return data;
  }

  async function updateBudget(id: string, input: Partial<BudgetInput>) {
    const { data, error } = await supabase
      .from("budgets")
      .update(input)
      .eq("id", id)
      .select("*, categories(name, icon, color)")
      .single();
    if (error) throw new Error(error.message);
    await fetchBudgets();
    return data;
  }

  async function deleteBudget(id: string) {
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (error) throw new Error(error.message);
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  }

  return {
    budgets,
    spending,
    loading,
    error,
    refetch: fetchBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
  };
}
