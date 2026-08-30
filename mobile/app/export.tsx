import { useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, format } from "date-fns";
import { Text, View, useThemeColor } from "@/components/Themed";
import { Button } from "@/components/Button";
import { useProfile } from "@/hooks/useProfile";
import { exportData, type ExportType, type ExportFormat } from "@/lib/export";

const fmt = (d: Date) => format(d, "yyyy-MM-dd");

function rangeFor(preset: string): { from?: string; to?: string; label: string } {
  const now = new Date();
  switch (preset) {
    case "month":
      return { from: fmt(startOfMonth(now)), to: fmt(endOfMonth(now)), label: "This month" };
    case "30d":
      return { from: fmt(subDays(now, 30)), to: fmt(now), label: "Last 30 days" };
    case "year":
      return { from: fmt(startOfYear(now)), to: fmt(endOfYear(now)), label: "This year" };
    default:
      return { from: undefined, to: undefined, label: "All time" };
  }
}

export default function ExportScreen() {
  const { currency } = useProfile();
  const [type, setType] = useState<ExportType>("expenses");
  const [preset, setPreset] = useState("month");
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  const card = useThemeColor({}, "card");
  const border = useThemeColor({}, "border");
  const muted = useThemeColor({}, "muted");

  async function run(fmtType: ExportFormat) {
    setBusy(fmtType);
    try {
      const r = rangeFor(preset);
      const count = await exportData({
        type,
        format: fmtType,
        from: r.from,
        to: r.to,
        currency,
        label: r.label,
      });
      // The OS share sheet has opened; nothing more to do on success.
      void count;
    } catch (e) {
      Alert.alert("Export failed", e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={[styles.subtitle, { color: muted }]}>
        Pick what to export and a date range, then choose a format. The file opens in your share
        sheet to save or send.
      </Text>

      <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: muted }]}>Data</Text>
          <View style={[styles.pickerWrap, { borderColor: border }]}>
            <Picker selectedValue={type} onValueChange={(v) => setType(v as ExportType)}>
              <Picker.Item label="Expenses" value="expenses" />
              <Picker.Item label="Income" value="income" />
            </Picker>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: muted }]}>Date range</Text>
          <View style={[styles.pickerWrap, { borderColor: border }]}>
            <Picker selectedValue={preset} onValueChange={setPreset}>
              <Picker.Item label="This month" value="month" />
              <Picker.Item label="Last 30 days" value="30d" />
              <Picker.Item label="This year" value="year" />
              <Picker.Item label="All time" value="all" />
            </Picker>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <Button
          title={busy === "csv" ? "Exporting..." : "Export CSV"}
          onPress={() => run("csv")}
          loading={busy === "csv"}
          disabled={busy !== null}
        />
        <Button
          title={busy === "pdf" ? "Exporting..." : "Export PDF"}
          onPress={() => run("pdf")}
          loading={busy === "pdf"}
          disabled={busy !== null}
        />
        <Button
          title={busy === "json" ? "Exporting..." : "Export JSON"}
          variant="ghost"
          onPress={() => run("json")}
          loading={busy === "json"}
          disabled={busy !== null}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: "500" },
  pickerWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
  },
});
