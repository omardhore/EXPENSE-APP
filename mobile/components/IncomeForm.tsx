import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { format } from "date-fns";
import { Text, View, useThemeColor } from "@/components/Themed";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { createIncomeSchema, firstZodMessage } from "@/lib/schemas";
import type { Income, IncomeSource, RecurringFrequency } from "@/lib/database.types";
import type { IncomeInput } from "@/hooks/useIncome";

const sources: IncomeSource[] = ["salary", "freelance", "investment", "gift", "refund", "other"];
const frequencies: RecurringFrequency[] = ["weekly", "monthly", "yearly"];

interface Props {
  initial?: Income;
  submitLabel: string;
  onSubmit: (input: IncomeInput) => Promise<{ id: string } | void>;
  onDelete?: () => Promise<void>;
}

export function IncomeForm({ initial, submitLabel, onSubmit, onDelete }: Props) {
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [date, setDate] = useState(initial?.date ?? format(new Date(), "yyyy-MM-dd"));
  const [source, setSource] = useState<IncomeSource>(initial?.source ?? "salary");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [isRecurring, setIsRecurring] = useState(initial?.is_recurring ?? false);
  const [frequency, setFrequency] = useState<RecurringFrequency>(
    initial?.recurring_frequency ?? "monthly",
  );
  const [saving, setSaving] = useState(false);

  const border = useThemeColor({}, "border");
  const muted = useThemeColor({}, "muted");

  async function handleSubmit() {
    const parsed = createIncomeSchema.safeParse({
      description: description.trim(),
      amount: Number(amount),
      date,
      source,
      notes: notes.trim() || null,
      is_recurring: isRecurring,
      recurring_frequency: isRecurring ? frequency : null,
    });
    if (!parsed.success) {
      Alert.alert("Invalid input", firstZodMessage(parsed.error));
      return;
    }

    const input: IncomeInput = {
      description: parsed.data.description,
      amount: parsed.data.amount,
      date: parsed.data.date,
      source: parsed.data.source,
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
    Alert.alert("Delete income", "This cannot be undone.", [
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
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="e.g. August salary"
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
        <Text style={[styles.label, { color: muted }]}>Source</Text>
        <View style={[styles.pickerWrap, { borderColor: border }]}>
          <Picker selectedValue={source} onValueChange={(v) => setSource(v as IncomeSource)}>
            {sources.map((s) => (
              <Picker.Item key={s} label={s} value={s} />
            ))}
          </Picker>
        </View>
      </View>

      <Field label="Notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

      <View style={styles.switchRow}>
        <Text>Recurring income</Text>
        <Switch value={isRecurring} onValueChange={setIsRecurring} />
      </View>
      <Text style={{ color: muted, fontSize: 12, marginTop: -8 }}>
        Tags this income for your own tracking. Future occurrences aren&apos;t added automatically
        yet.
      </Text>

      {isRecurring && (
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: muted }]}>Frequency</Text>
          <View style={[styles.pickerWrap, { borderColor: border }]}>
            <Picker
              selectedValue={frequency}
              onValueChange={(v) => setFrequency(v as RecurringFrequency)}
            >
              {frequencies.map((f) => (
                <Picker.Item key={f} label={f} value={f} />
              ))}
            </Picker>
          </View>
        </View>
      )}

      <Button title={saving ? "Saving..." : submitLabel} onPress={handleSubmit} loading={saving} />

      {onDelete && <Button title="Delete income" variant="outline" onPress={handleDelete} />}
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
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
