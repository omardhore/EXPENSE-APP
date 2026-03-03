import { create } from "zustand";
import type { Budget } from "@/lib/types/database";
import type { CreateBudgetInput, UpdateBudgetInput } from "@/lib/schemas/budget";

interface BudgetWithCategory extends Budget {
  categories: { name: string; icon: string | null; color: string | null } | null;
}

interface BudgetState {
  budgets: BudgetWithCategory[];
  loading: boolean;
  error: string | null;
  fetchBudgets: () => Promise<void>;
  addBudget: (data: CreateBudgetInput) => Promise<void>;
  updateBudget: (id: string, data: UpdateBudgetInput) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  loading: false,
  error: null,

  fetchBudgets: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/v1/budgets");
      const json = await res.json();
      if (!json.success) throw new Error(json.error.message);
      set({ budgets: json.data, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch budgets",
        loading: false,
      });
    }
  },

  addBudget: async (data) => {
    set({ error: null });
    try {
      const res = await fetch("/api/v1/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error.message);
      set({ budgets: [...get().budgets, json.data] });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to add budget",
      });
      throw err;
    }
  },

  updateBudget: async (id, data) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/v1/budgets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error.message);
      set({
        budgets: get().budgets.map((b) => (b.id === id ? json.data : b)),
      });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Failed to update budget",
      });
      throw err;
    }
  },

  deleteBudget: async (id) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/v1/budgets/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error.message);
      set({ budgets: get().budgets.filter((b) => b.id !== id) });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Failed to delete budget",
      });
    }
  },
}));
