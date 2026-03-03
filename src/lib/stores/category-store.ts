import { create } from "zustand";
import type { Category } from "@/lib/types/database";

interface CategoryState {
  categories: Category[];
  loading: boolean;
  error: string | null;
  fetchCategories: () => Promise<void>;
  addCategory: (
    data: Pick<Category, "name" | "icon" | "color">,
  ) => Promise<void>;
  updateCategory: (
    id: string,
    data: Partial<Pick<Category, "name" | "icon" | "color">>,
  ) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  loading: false,
  error: null,

  fetchCategories: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/v1/categories");
      const json = await res.json();
      if (!json.success) throw new Error(json.error.message);
      set({ categories: json.data, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch categories",
        loading: false,
      });
    }
  },

  addCategory: async (data) => {
    set({ error: null });
    try {
      const res = await fetch("/api/v1/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error.message);
      set({ categories: [...get().categories, json.data] });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to add category",
      });
    }
  },

  updateCategory: async (id, data) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/v1/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error.message);
      set({
        categories: get().categories.map((c) =>
          c.id === id ? json.data : c,
        ),
      });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Failed to update category",
      });
    }
  },

  deleteCategory: async (id) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/v1/categories/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error.message);
      set({ categories: get().categories.filter((c) => c.id !== id) });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Failed to delete category",
      });
    }
  },
}));
