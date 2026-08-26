import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { requireUserId } from "@/lib/session";
import type { Category } from "@/lib/database.types";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    if (error) {
      setError(error.message);
    } else {
      setCategories(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  async function createCategory(input: {
    name: string;
    icon?: string | null;
    color?: string | null;
  }) {
    const userId = await requireUserId();

    const { data, error } = await supabase
      .from("categories")
      .insert({ ...input, user_id: userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    setCategories((prev) =>
      [...prev, data].sort((a, b) => a.name.localeCompare(b.name)),
    );
    return data;
  }

  async function updateCategory(
    id: string,
    input: { name?: string; icon?: string | null; color?: string | null },
  ) {
    const { data, error } = await supabase
      .from("categories")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    setCategories((prev) => prev.map((c) => (c.id === id ? data : c)));
    return data;
  }

  async function deleteCategory(id: string) {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw new Error(error.message);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
