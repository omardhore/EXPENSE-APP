import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator } from "react-native";
import { View } from "@/components/Themed";
import { BudgetForm } from "@/components/BudgetForm";
import { supabase } from "@/lib/supabase";
import type { BudgetWithCategory, BudgetInput } from "@/hooks/useBudgets";

export default function EditBudgetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [budget, setBudget] = useState<BudgetWithCategory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("budgets")
        .select("*, categories(name, icon, color)")
        .eq("id", id)
        .single();
      setBudget(data as unknown as BudgetWithCategory);
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

  if (!budget) return null;

  async function handleSubmit(input: BudgetInput) {
    const { data, error } = await supabase
      .from("budgets")
      .update(input)
      .eq("id", id)
      .select("*, categories(name, icon, color)")
      .single();
    if (error) throw new Error(error.message);
    router.back();
    return data;
  }

  async function handleDelete() {
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (error) throw new Error(error.message);
    router.back();
  }

  return (
    <BudgetForm
      initial={budget}
      submitLabel="Save Changes"
      onSubmit={handleSubmit}
      onDelete={handleDelete}
    />
  );
}
