import { useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { format } from "date-fns";
import { Text, View, useThemeColor } from "@/components/Themed";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { useCategories } from "@/hooks/useCategories";
import { createExpenseSchema, firstZodMessage } from "@/lib/schemas";
import type { PaymentMethod } from "@/lib/database.types";
import type { ExpenseInput, ExpenseWithCategory } from "@/hooks/useExpenses";

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "evc", label: "EVC" },
  { value: "bank", label: "Bank" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

interface Props {
  initial?: ExpenseWithCategory;
  submitLabel: string;
  onSubmit: (input: ExpenseInput) => Promise<{ id: string } | void>;
  onDelete?: () => Promise<void>;
}

export function ExpenseForm({ initial, submitLabel, onSubmit, onDelete }: Props) {
  const { categories } = useCategories();
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [date, setDate] = useState(initial?.date ?? format(new Date(), "yyyy-MM-dd"));
  const [categoryId, setCategoryId] = useState<string>(initial?.category_id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initial?.payment_method ?? "evc",
  );
  const [saving, setSaving] = useState(false);

  const border = useThemeColor({}, "border");
  const muted = useThemeColor({}, "muted");

  async function handleSubmit() {
    // Description is optional in the form; when left blank, fall back to the
    // chosen category name (or "Expense") so the required column is filled.
    const categoryName = categories.find((c) => c.id === categoryId)?.name;
    const finalDescription = description.trim() || categoryName || "Expense";

    const parsed = createExpenseSchema.safeParse({
      description: finalDescription,
      amount: Number(amount),
      date,
      category_id: categoryId || null,
      payment_method: paymentMethod,
      tags: [],
      notes: null,
      is_recurring: false,
      recurring_frequency: null,
    });
    if (!parsed.success) {
      Alert.alert("Invalid input", firstZodMessage(parsed.error));
      return;
    }

    const input: ExpenseInput = {
      description: parsed.data.description,
      amount: parsed.data.amount,
      date: parsed.data.date,
      category_id: parsed.data.category_id ?? null,
      payment_method: parsed.data.payment_method,
      tags: parsed.data.tags,
      notes: parsed.data.notes ?? null,
      is_recurring: parsed.data.is_recurring,
      recurring_frequency: parsed.data.recurring_frequency ?? null,
    };

    setSaving(true);
    try {
      await onSubmit(input);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!onDelete) return;
    Alert.alert("Delete expense", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete().catch((e) => Alert.alert("Error", e.message)),
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Field
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        placeholder="e.g. Groceries"
      />
      <Field
        label="Amount"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />
      <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: muted }]}>Category</Text>
        <View style={[styles.pickerWrap, { borderColor: border }]}>
          <Picker selectedValue={categoryId} onValueChange={setCategoryId}>
            <Picker.Item label="None" value="" />
            {categories.map((c) => (
              <Picker.Item key={c.id} label={c.name} value={c.id} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: muted }]}>Payment method</Text>
        <View style={[styles.pickerWrap, { borderColor: border }]}>
          <Picker
            selectedValue={paymentMethod}
            onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
          >
            {paymentMethods.map((m) => (
              <Picker.Item key={m.value} label={m.label} value={m.value} />
            ))}
          </Picker>
        </View>
      </View>

      <Button title={saving ? "Saving..." : submitLabel} onPress={handleSubmit} loading={saving} />

      {onDelete && <Button title="Delete expense" variant="outline" onPress={handleDelete} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
  },
  pickerWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
  },
});
