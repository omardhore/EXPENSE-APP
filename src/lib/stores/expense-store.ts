import { create } from "zustand";
import type { Expense } from "@/lib/types/database";
import type { UpdateExpenseInput } from "@/lib/schemas/expense";

interface ExpenseWithCategory extends Expense {
  categories: { name: string; icon: string | null; color: string | null } | null;
}

interface ExpenseState {
  expenses: ExpenseWithCategory[];
  loading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  page: number;
  filters: {
    startDate?: string;
    endDate?: string;
    category?: string;
  };
  setFilters: (filters: ExpenseState["filters"]) => void;
  fetchExpenses: (page?: number) => Promise<void>;
  addExpense: (data: Record<string, unknown>) => Promise<void>;
  updateExpense: (id: string, data: UpdateExpenseInput) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  loading: false,
  error: null,
  total: 0,
  hasMore: false,
  page: 1,
  filters: {},

  setFilters: (filters) => {
    set({ filters, page: 1 });
    get().fetchExpenses(1);
  },

  fetchExpenses: async (page = 1) => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.category) params.set("category", filters.category);

      const res = await fetch(`/api/v1/expenses?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error.message);

      set({
        expenses: page === 1 ? json.data : [...get().expenses, ...json.data],
        total: json.meta.pagination.total,
        hasMore: json.meta.pagination.hasMore,
        page,
        loading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch expenses",
        loading: false,
      });
    }
  },

  addExpense: async (data) => {
    set({ error: null });
    try {
      const res = await fetch("/api/v1/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error.message);
      set({
        expenses: [json.data, ...get().expenses],
        total: get().total + 1,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to add expense",
      });
      throw err;
    }
  },

  updateExpense: async (id, data) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/v1/expenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error.message);
      set({
        expenses: get().expenses.map((e) =>
          e.id === id ? json.data : e,
        ),
      });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Failed to update expense",
      });
      throw err;
    }
  },

  deleteExpense: async (id) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/v1/expenses/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error.message);
      set({
        expenses: get().expenses.filter((e) => e.id !== id),
        total: get().total - 1,
      });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Failed to delete expense",
      });
    }
  },
}));
