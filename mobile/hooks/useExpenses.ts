import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Expense, PaymentMethod, RecurringFrequency } from "@/lib/database.types";

export interface ExpenseWithCategory extends Expense {
  categories: { name: string; icon: string | null; color: string | null } | null;
}

export interface ExpenseFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
}

const PAGE_SIZE = 20;

export interface ExpenseInput {
  amount: number;
  category_id: string | null;
  description: string;
  date: string;
  payment_method: PaymentMethod;
  tags: string[];
  notes: string | null;
  is_recurring: boolean;
  recurring_frequency: RecurringFrequency | null;
}

export function useExpenses(filters: ExpenseFilters = {}) {
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Guards against overlapping append fetches (the `loading` flag is only
  // set for "replace", so it can't gate appends) and lets us discard
  // responses whose filter set is no longer current.
  const appendingRef = useRef(false);
  const filterSig = `${filters.startDate ?? ""}|${filters.endDate ?? ""}|${filters.category ?? ""}`;
  const filterSigRef = useRef(filterSig);
  // Keep the ref in sync via an effect (never mutate a ref during render).
  // Declared before the fetch effect below so the signature is already current
  // when a filter change triggers a new fetch.
  useEffect(() => {
    filterSigRef.current = filterSig;
  }, [filterSig]);

  const fetchExpenses = useCallback(
    async (targetPage: number, mode: "replace" | "append") => {
      if (mode === "append") {
        if (appendingRef.current) return;
        appendingRef.current = true;
      } else {
        setLoading(true);
      }
      setError(null);

      // Capture the filter signature at request time so a response that
      // arrives after the filters changed can be discarded.
      const requestSig = filterSigRef.current;
      const offset = (targetPage - 1) * PAGE_SIZE;
      let query = supabase
        .from("expenses")
        .select("*, categories(name, icon, color)", { count: "exact" })
        .is("deleted_at", null)
        .order("date", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (filters.startDate) query = query.gte("date", filters.startDate);
      if (filters.endDate) query = query.lte("date", filters.endDate);
      if (filters.category) query = query.eq("category_id", filters.category);

      const { data, error, count } = await query;

      if (mode === "append") appendingRef.current = false;

      // Stale response for a filter set that's no longer active — drop it.
      if (requestSig !== filterSigRef.current) {
        return;
      }

      if (error) {
        setError(error.message);
      } else {
        const rows = (data ?? []) as unknown as ExpenseWithCategory[];
        setExpenses((prev) => (mode === "replace" ? rows : [...prev, ...rows]));
        setTotal(count ?? 0);
        setHasMore(offset + PAGE_SIZE < (count ?? 0));
        setPage(targetPage);
      }
      setLoading(false);
      setRefreshing(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters.startDate, filters.endDate, filters.category],
  );

  useEffect(() => {
    fetchExpenses(1, "replace");
  }, [fetchExpenses]);

  function refresh() {
    setRefreshing(true);
    fetchExpenses(1, "replace");
  }

  function loadMore() {
    if (!loading && !appendingRef.current && hasMore) {
      fetchExpenses(page + 1, "append");
    }
  }

  async function createExpense(input: ExpenseInput) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("expenses")
      .insert({ ...input, user_id: user.id })
      .select("*, categories(name, icon, color)")
      .single();
    if (error) throw new Error(error.message);
    const row = data as unknown as ExpenseWithCategory;
    setExpenses((prev) => [row, ...prev]);
    setTotal((prev) => prev + 1);
    return row;
  }

  async function updateExpense(id: string, input: Partial<ExpenseInput>) {
    const { data, error } = await supabase
      .from("expenses")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*, categories(name, icon, color)")
      .single();
    if (error) throw new Error(error.message);
    const row = data as unknown as ExpenseWithCategory;
    setExpenses((prev) => prev.map((e) => (e.id === id ? row : e)));
    return row;
  }

  async function deleteExpense(id: string) {
    const { error } = await supabase
      .from("expenses")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    setTotal((prev) => prev - 1);
  }

  return {
    expenses,
    loading,
    refreshing,
    error,
    total,
    hasMore,
    refresh,
    loadMore,
    createExpense,
    updateExpense,
    deleteExpense,
  };
}
