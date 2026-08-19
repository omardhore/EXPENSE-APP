import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator } from "react-native";
import { View } from "@/components/Themed";
import { ExpenseForm } from "@/components/ExpenseForm";
import { supabase } from "@/lib/supabase";
import type { ExpenseWithCategory, ExpenseInput } from "@/hooks/useExpenses";

export default function EditExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [expense, setExpense] = useState<ExpenseWithCategory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("expenses")
        .select("*, categories(name, icon, color)")
        .eq("id", id)
        .single();
      setExpense(data as unknown as ExpenseWithCategory);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!expense) return null;

  async function handleSubmit(input: ExpenseInput) {
    const { data, error } = await supabase
      .from("expenses")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*, categories(name, icon, color)")
      .single();
    if (error) throw new Error(error.message);
    router.back();
    return data as unknown as ExpenseWithCategory;
  }

  async function handleDelete() {
    const { error } = await supabase
      .from("expenses")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    router.back();
  }

  return (
    <ExpenseForm
      initial={expense}
      submitLabel="Save Changes"
      onSubmit={handleSubmit}
      onDelete={handleDelete}
    />
  );
}
