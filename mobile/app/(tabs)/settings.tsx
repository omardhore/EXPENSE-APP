import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { Text, View, useThemeColor } from "@/components/Themed";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { callAccountApi } from "@/lib/api";

const currencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "INR"];

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { name: initialName, currency: initialCurrency, loading, save } = useProfile();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const card = useThemeColor({}, "card");
  const border = useThemeColor({}, "border");
  const muted = useThemeColor({}, "muted");
  const danger = useThemeColor({}, "danger");

  useEffect(() => {
    setName(initialName);
    setCurrency(initialCurrency);
  }, [initialName, initialCurrency]);

  async function handleSave() {
    setSaving(true);
    try {
      await save(name, currency);
      Alert.alert("Saved", "Settings saved successfully");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function handleClearData() {
    Alert.alert(
      "Clear workspace data",
      "Delete ALL your expenses, budgets, and categories? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            setClearing(true);
            try {
              await callAccountApi("/api/v1/data");
              Alert.alert("Done", "All data has been cleared.");
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "Failed to clear data");
            } finally {
              setClearing(false);
            }
          },
        },
      ],
    );
  }

  function handleDeleteAccount() {
    Alert.alert("Delete account", "Delete your account FOREVER? This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await callAccountApi("/api/v1/account");
            await signOut();
          } catch (err) {
            Alert.alert("Error", err instanceof Error ? err.message : "Failed to delete account");
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }

  if (loading) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <Field label="Email" value={user?.email ?? ""} editable={false} />
        <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. John Doe" />

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: muted }]}>Currency</Text>
          <View style={[styles.pickerWrap, { borderColor: border }]}>
            <Picker selectedValue={currency} onValueChange={setCurrency}>
              {currencies.map((c) => (
                <Picker.Item key={c} label={c} value={c} />
              ))}
            </Picker>
          </View>
        </View>

        <Button
          title={saving ? "Saving..." : "Save Changes"}
          onPress={handleSave}
          loading={saving}
        />
      </View>

      <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <Text style={styles.sectionTitle}>Reports</Text>
        <Text style={[styles.label, { color: muted }]}>
          Export your expenses or income as CSV, PDF, or JSON.
        </Text>
        <Button title="Export Data" onPress={() => router.push("/export")} />
      </View>

      <Button title="Sign out" variant="ghost" onPress={signOut} />

      <View
        style={[styles.card, styles.dangerCard, { backgroundColor: card, borderColor: danger }]}
      >
        <Text style={[styles.sectionTitle, { color: danger }]}>Danger Zone</Text>
        <Button
          title={clearing ? "Clearing..." : "Clear Workspace Data"}
          variant="outline"
          onPress={handleClearData}
          loading={clearing}
        />
        <Button
          title={deleting ? "Deleting..." : "Delete Account"}
          variant="destructive"
          onPress={handleDeleteAccount}
          loading={deleting}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  title: { fontSize: 26, fontWeight: "700" },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  dangerCard: { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "600" },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: "500" },
  pickerWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
  },
});
