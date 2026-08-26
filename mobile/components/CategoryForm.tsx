import { useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { createCategorySchema, firstZodMessage } from "@/lib/schemas";
import type { Category } from "@/lib/database.types";

interface Props {
  initial?: Category;
  submitLabel: string;
  onSubmit: (input: {
    name: string;
    icon: string | null;
    color: string | null;
  }) => Promise<unknown>;
  onDelete?: () => Promise<void>;
}

export function CategoryForm({ initial, submitLabel, onSubmit, onDelete }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const [color, setColor] = useState(initial?.color ?? "#2f6fed");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const parsed = createCategorySchema.safeParse({
      name: name.trim(),
      icon: icon.trim() || null,
      color: color || null,
    });
    if (!parsed.success) {
      Alert.alert("Invalid input", firstZodMessage(parsed.error));
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        name: parsed.data.name,
        icon: parsed.data.icon ?? null,
        color: parsed.data.color ?? null,
      });
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!onDelete) return;
    Alert.alert(
      "Delete category",
      "Expenses in this category will keep their history but lose the category link.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete().catch((e) => Alert.alert("Error", e.message)),
        },
      ],
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Groceries" />
      <Field label="Icon (optional)" value={icon} onChangeText={setIcon} placeholder="e.g. cart" />
      <Field
        label="Color (hex)"
        value={color}
        onChangeText={setColor}
        placeholder="#2f6fed"
        autoCapitalize="none"
      />

      <Button title={saving ? "Saving..." : submitLabel} onPress={handleSubmit} loading={saving} />

      {onDelete && <Button title="Delete category" variant="outline" onPress={handleDelete} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14 },
});
