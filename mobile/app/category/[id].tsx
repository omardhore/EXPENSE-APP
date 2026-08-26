import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet } from "react-native";
import { Text, View } from "@/components/Themed";
import { CategoryForm } from "@/components/CategoryForm";
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/lib/supabase";
import type { Category } from "@/lib/database.types";

export default function EditCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { updateCategory, deleteCategory } = useCategories();
  // Fetch the single category by id (instead of relying on the list hook's
  // in-memory cache) so deep-links and cold loads render correctly.
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      const { data, error: dbError } = await supabase
        .from("categories")
        .select("*")
        .eq("id", id)
        .single();
      if (ignore) return;
      if (dbError) {
        setError(dbError.message);
      } else {
        setCategory(data);
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

  if (error || !category) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>
          {error ? "Couldn't load this category." : "Category not found."}
        </Text>
      </View>
    );
  }

  return (
    <CategoryForm
      initial={category}
      submitLabel="Save Changes"
      onSubmit={async (input) => {
        const updated = await updateCategory(id, input);
        router.back();
        return updated;
      }}
      onDelete={async () => {
        await deleteCategory(id);
        router.back();
      }}
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
