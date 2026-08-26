import { useCallback, useEffect, useState } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/lib/supabase";

export interface CategoryTotal {
  categoryId: string | null;
  name: string;
  color: string | null;
  total: number;
}

export function useDashboard() {
  const [monthTotal, setMonthTotal] = useState(0);
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    const now = new Date();
    const from = startOfMonth(now).toISOString().split("T")[0];
    const to = endOfMonth(now).toISOString().split("T")[0];

    const { data, error: dbError } = await supabase
      .from("expenses")
      .select("amount, category_id, categories(name, color)")
      .is("deleted_at", null)
      .gte("date", from)
      .lte("date", to);

    if (dbError) {
      // Distinguish a failed query from a genuinely empty month so the UI
      // doesn't misreport $0.00 spending on a transient error.
      setError(dbError.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as unknown as Array<{
      amount: number;
      category_id: string | null;
      categories: { name: string; color: string | null } | null;
    }>;

    let total = 0;
    const byCategory = new Map<string, CategoryTotal>();
    for (const row of rows) {
      const amount = Number(row.amount);
      total += amount;
      const key = row.category_id ?? "uncategorized";
      const existing = byCategory.get(key);
      if (existing) {
        existing.total += amount;
      } else {
        byCategory.set(key, {
          categoryId: row.category_id,
          name: row.categories?.name ?? "Uncategorized",
          color: row.categories?.color ?? null,
          total: amount,
        });
      }
    }

    setMonthTotal(total);
    setCategoryTotals(Array.from(byCategory.values()).sort((a, b) => b.total - a.total));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { monthTotal, categoryTotals, loading, error, refetch: fetchSummary };
}
