import { useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { format } from "date-fns";
import { Text, View, useThemeColor } from "@/components/Themed";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { useCategories } from "@/hooks/useCategories";
import type { BudgetPeriod } from "@/lib/database.types";
import type { BudgetInput, BudgetWithCategory } from "@/hooks/useBudgets";

const periods: BudgetPeriod[] = ["monthly", "quarterly", "yearly"];

interface Props {
  initial?: BudgetWithCategory;
  submitLabel: string;
  onSubmit: (input: BudgetInput) => Promise<unknown>;
  onDelete?: () => Promise<void>;
}

export function BudgetForm({ initial, submitLabel, onSubmit, onDelete }: Props) {
  const { categories } = useCategories();
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [period, setPeriod] = useState<BudgetPeriod>(initial?.period ?? "monthly");
  const [limitAmount, setLimitAmount] = useState(
    initial ? String(initial.limit_amount) : "",
  );
  const [alertThreshold, setAlertThreshold] = useState(
    initial ? String(Number(initial.alert_threshold) * 100) : "80",
  );
  const [startDate, setStartDate] = useState(
    initial?.start_date ?? format(new Date(), "yyyy-MM-dd"),
  );
  const [saving, setSaving] = useState(false);
  const border = useThemeColor({}, "border");
  const muted = useThemeColor({}, "muted");

  async function handleSubmit() {
    const limit = Number(limitAmount);
    const threshold = Number(alertThreshold) / 100;
    if (!Number.isFinite(limit) || limit <= 0) {
      Alert.alert("Invalid limit", "Enter a positive budget limit.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        category_id: categoryId || null,
        period,
        limit_amount: limit,
        alert_threshold: threshold,
        start_date: startDate,
        end_date: null,
      });
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!onDelete) return;
    Alert.alert("Delete budget", "This cannot be undone.", [
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
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: muted }]}>Category</Text>
        <View style={[styles.pickerWrap, { borderColor: border }]}>
          <Picker selectedValue={categoryId} onValueChange={setCategoryId}>
            <Picker.Item label="Overall (all categories)" value="" />
            {categories.map((c) => (
              <Picker.Item key={c.id} label={c.name} value={c.id} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: muted }]}>Period</Text>
        <View style={[styles.pickerWrap, { borderColor: border }]}>
          <Picker selectedValue={period} onValueChange={(v) => setPeriod(v as BudgetPeriod)}>
            {periods.map((p) => (
              <Picker.Item key={p} label={p} value={p} />
            ))}
          </Picker>
        </View>
      </View>

      <Field
        label="Limit amount"
        value={limitAmount}
        onChangeText={setLimitAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />
      <Field
        label="Alert at (% of limit)"
        value={alertThreshold}
        onChangeText={setAlertThreshold}
        keyboardType="number-pad"
        placeholder="80"
      />
      <Field
        label="Start date"
        value={startDate}
        onChangeText={setStartDate}
        placeholder="YYYY-MM-DD"
      />

      <Button
        title={saving ? "Saving..." : submitLabel}
        onPress={handleSubmit}
        loading={saving}
      />

      {onDelete && (
        <Button title="Delete budget" variant="outline" onPress={handleDelete} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: "500" },
  pickerWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
  },
});
