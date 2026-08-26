import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet } from "react-native";
import { Text, View } from "@/components/Themed";
import { BudgetForm } from "@/components/BudgetForm";
import { supabase } from "@/lib/supabase";
import type { BudgetWithCategory, BudgetInput } from "@/hooks/useBudgets";

export default function EditBudgetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [budget, setBudget] = useState<BudgetWithCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      const { data, error: dbError } = await supabase
        .from("budgets")
        .select("*, categories(name, icon, color)")
        .eq("id", id)
        .single();
      if (ignore) return;
      if (dbError) {
        setError(dbError.message);
      } else {
        setBudget(data as unknown as BudgetWithCategory);
      }
      setLoading(false);
    }
    load();
    return () => {
      ignore = true;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !budget) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>
          {error ? "Couldn't load this budget." : "Budget not found."}
        </Text>
      </View>
    );
  }

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

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  message: {
    textAlign: "center",
    opacity: 0.7,
  },
});
