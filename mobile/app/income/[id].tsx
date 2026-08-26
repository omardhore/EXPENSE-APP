import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet } from "react-native";
import { Text, View } from "@/components/Themed";
import { IncomeForm } from "@/components/IncomeForm";
import { supabase } from "@/lib/supabase";
import type { Income } from "@/lib/database.types";
import type { IncomeInput } from "@/hooks/useIncome";

export default function EditIncomeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [income, setIncome] = useState<Income | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      const { data, error: dbError } = await supabase
        .from("income")
        .select("*")
        .eq("id", id)
        .single();
      if (ignore) return;
      if (dbError) {
        setError(dbError.message);
      } else {
        setIncome(data as unknown as Income);
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

  if (error || !income) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>
          {error ? "Couldn't load this income entry." : "Income not found."}
        </Text>
      </View>
    );
  }

  async function handleSubmit(input: IncomeInput) {
    const { data, error } = await supabase
      .from("income")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    router.back();
    return data as unknown as Income;
  }

  async function handleDelete() {
    const { error } = await supabase
      .from("income")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    router.back();
  }

  return (
    <IncomeForm
      initial={income}
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
