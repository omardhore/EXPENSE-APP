import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch } from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { format } from "date-fns";
import { Text, View, useThemeColor } from "@/components/Themed";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { useCategories } from "@/hooks/useCategories";
import { uploadReceipt, getReceiptSignedUrl } from "@/lib/receipts";
import { createExpenseSchema, firstZodMessage } from "@/lib/schemas";
import type { PaymentMethod, RecurringFrequency } from "@/lib/database.types";
import type { ExpenseInput } from "@/hooks/useExpenses";
import type { ExpenseWithCategory } from "@/hooks/useExpenses";

const paymentMethods: PaymentMethod[] = ["cash", "credit", "debit", "other"];
const frequencies: RecurringFrequency[] = ["weekly", "monthly", "yearly"];

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
    initial?.payment_method ?? "other",
  );
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [isRecurring, setIsRecurring] = useState(initial?.is_recurring ?? false);
  const [frequency, setFrequency] = useState<RecurringFrequency>(
    initial?.recurring_frequency ?? "monthly",
  );
  const [saving, setSaving] = useState(false);
  const [pickedImage, setPickedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const border = useThemeColor({}, "border");
  const muted = useThemeColor({}, "muted");

  async function pickReceipt() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to attach a receipt.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPickedImage(result.assets[0]);
    }
  }

  async function viewReceipt() {
    if (!initial?.receipt_url) return;
    try {
      const url = await getReceiptSignedUrl(initial.receipt_url);
      const { Linking } = await import("react-native");
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Could not load receipt");
    }
  }

  async function handleSubmit() {
    const parsed = createExpenseSchema.safeParse({
      description: description.trim(),
      amount: Number(amount),
      date,
      category_id: categoryId || null,
      payment_method: paymentMethod,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      notes: notes.trim() || null,
      is_recurring: isRecurring,
      recurring_frequency: isRecurring ? frequency : null,
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
      const result = await onSubmit(input);

      const expenseId = result && "id" in result ? result.id : initial?.id;
      if (pickedImage && expenseId) {
        setUploadingReceipt(true);
        await uploadReceipt(expenseId, pickedImage.uri, pickedImage.mimeType ?? "image/jpeg");
      }
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
      setUploadingReceipt(false);
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
        label="Description"
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
              <Picker.Item key={m} label={m} value={m} />
            ))}
          </Picker>
        </View>
      </View>

      <Field
        label="Tags (comma separated)"
        value={tags}
        onChangeText={setTags}
        placeholder="e.g. work, travel"
      />
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

      <View style={styles.switchRow}>
        <Text>Recurring expense</Text>
        <Switch value={isRecurring} onValueChange={setIsRecurring} />
      </View>
      <Text style={{ color: muted, fontSize: 12, marginTop: -8 }}>
        Tags this expense for your own tracking. Future occurrences aren&apos;t added automatically
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

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: muted }]}>Receipt</Text>
        <Button
          title={pickedImage ? "Receipt selected ✓" : "Choose from library"}
          variant="ghost"
          onPress={pickReceipt}
        />
        {initial?.receipt_url && !pickedImage && (
          <Button title="View current receipt" variant="ghost" onPress={viewReceipt} />
        )}
      </View>

      <Button
        title={saving ? (uploadingReceipt ? "Uploading receipt..." : "Saving...") : submitLabel}
        onPress={handleSubmit}
        loading={saving}
      />

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
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
