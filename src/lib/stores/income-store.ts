import { create } from "zustand";
import type { Income } from "@/lib/types/database";
import type { UpdateIncomeInput } from "@/lib/schemas/income";

interface IncomeState {
  income: Income[];
  loading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  page: number;
  filters: {
    startDate?: string;
    endDate?: string;
    source?: string;
    minAmount?: number;
    maxAmount?: number;
    search?: string;
  };
  setFilters: (filters: IncomeState["filters"]) => void;
  fetchIncome: (page?: number) => Promise<void>;
  addIncome: (data: Record<string, unknown>) => Promise<Income>;
  updateIncome: (id: string, data: UpdateIncomeInput) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
}

export const useIncomeStore = create<IncomeState>((set, get) => ({
  income: [],
  loading: false,
  error: null,
  total: 0,
  hasMore: false,
  page: 1,
  filters: {},

  setFilters: (filters) => {
    set({ filters, page: 1 });
    get().fetchIncome(1);
  },

  fetchIncome: async (page = 1) => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.source) params.set("source", filters.source);
      if (filters.minAmount !== undefined)
        params.set("minAmount", String(filters.minAmount));
      if (filters.maxAmount !== undefined)
        params.set("maxAmount", String(filters.maxAmount));
      if (filters.search) params.set("search", filters.search);

      const res = await fetch(`/api/v1/income?${params}`);
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json?.error?.message ?? "Request failed");

      const pagination = json.meta?.pagination ?? {};
      set({
        income: page === 1 ? json.data : [...get().income, ...json.data],
        total: pagination.total ?? 0,
        hasMore: pagination.hasMore ?? false,
        page,
        loading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch income",
        loading: false,
      });
    }
  },

  addIncome: async (data) => {
    set({ error: null });
    try {
      const res = await fetch("/api/v1/income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json?.error?.message ?? "Request failed");
      set({
        income: [json.data, ...get().income],
        total: get().total + 1,
      });
      return json.data as Income;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to add income",
      });
      throw err;
    }
  },

  updateIncome: async (id, data) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/v1/income/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json?.error?.message ?? "Request failed");
      set({
        income: get().income.map((e) => (e.id === id ? json.data : e)),
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to update income",
      });
      throw err;
    }
  },

  deleteIncome: async (id) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/v1/income/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json?.error?.message ?? "Request failed");
      set({
        income: get().income.filter((e) => e.id !== id),
        total: get().total - 1,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to delete income",
      });
      throw err;
    }
  },
}));
