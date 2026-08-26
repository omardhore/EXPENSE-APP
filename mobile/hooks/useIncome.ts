import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { requireUserId } from "@/lib/session";
import type { Income, IncomeSource, RecurringFrequency } from "@/lib/database.types";

export interface IncomeFilters {
  startDate?: string;
  endDate?: string;
  source?: string;
}

const PAGE_SIZE = 20;

export interface IncomeInput {
  amount: number;
  description: string;
  date: string;
  source: IncomeSource;
  notes: string | null;
  is_recurring: boolean;
  recurring_frequency: RecurringFrequency | null;
}

export function useIncome(filters: IncomeFilters = {}) {
  const [income, setIncome] = useState<Income[]>([]);
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
  const filterSig = `${filters.startDate ?? ""}|${filters.endDate ?? ""}|${filters.source ?? ""}`;
  const filterSigRef = useRef(filterSig);
  // Keep the ref in sync via an effect (never mutate a ref during render).
  useEffect(() => {
    filterSigRef.current = filterSig;
  }, [filterSig]);

  const fetchIncome = useCallback(
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
        .from("income")
        .select("*", { count: "exact" })
        .is("deleted_at", null)
        .order("date", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (filters.startDate) query = query.gte("date", filters.startDate);
      if (filters.endDate) query = query.lte("date", filters.endDate);
      if (filters.source) query = query.eq("source", filters.source as IncomeSource);

      const { data, error, count } = await query;

      if (mode === "append") appendingRef.current = false;

      // Stale response for a filter set that's no longer active — drop it.
      if (requestSig !== filterSigRef.current) {
        return;
      }

      if (error) {
        setError(error.message);
      } else {
        const rows = (data ?? []) as unknown as Income[];
        setIncome((prev) => (mode === "replace" ? rows : [...prev, ...rows]));
        setTotal(count ?? 0);
        setHasMore(offset + PAGE_SIZE < (count ?? 0));
        setPage(targetPage);
      }
      setLoading(false);
      setRefreshing(false);
    },

    [filters.startDate, filters.endDate, filters.source],
  );

  useEffect(() => {
    fetchIncome(1, "replace");
  }, [fetchIncome]);

  function refresh() {
    setRefreshing(true);
    fetchIncome(1, "replace");
  }

  function loadMore() {
    if (!loading && !appendingRef.current && hasMore) {
      fetchIncome(page + 1, "append");
    }
  }

  async function createIncome(input: IncomeInput) {
    const userId = await requireUserId();

    const { data, error } = await supabase
      .from("income")
      .insert({ ...input, user_id: userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const row = data as unknown as Income;
    setIncome((prev) => [row, ...prev]);
    setTotal((prev) => prev + 1);
    return row;
  }

  async function updateIncome(id: string, input: Partial<IncomeInput>) {
    const { data, error } = await supabase
      .from("income")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const row = data as unknown as Income;
    setIncome((prev) => prev.map((e) => (e.id === id ? row : e)));
    return row;
  }

  async function deleteIncome(id: string) {
    const { error } = await supabase
      .from("income")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    setIncome((prev) => prev.filter((e) => e.id !== id));
    setTotal((prev) => prev - 1);
  }

  return {
    income,
    loading,
    refreshing,
    error,
    total,
    hasMore,
    refresh,
    loadMore,
    createIncome,
    updateIncome,
    deleteIncome,
  };
}
