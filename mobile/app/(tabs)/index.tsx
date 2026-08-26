import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Text, View, useThemeColor } from "@/components/Themed";
import { useDashboard } from "@/hooks/useDashboard";
import { useBudgets } from "@/hooks/useBudgets";
import { useProfile } from "@/hooks/useProfile";

export default function DashboardScreen() {
  const { monthTotal, incomeTotal, netTotal, categoryTotals, loading, error, refetch } =
    useDashboard();
  const { budgets, spending, refetch: refetchBudgets } = useBudgets();
  const { currency } = useProfile();
  const [refreshing, setRefreshing] = useState(false);
  const card = useThemeColor({}, "card");
  const border = useThemeColor({}, "border");
  const muted = useThemeColor({}, "muted");
  const tint = useThemeColor({}, "tint");
  const danger = useThemeColor({}, "danger");
  const dangerBg = useThemeColor({}, "dangerBg");

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchBudgets();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetch(), refetchBudgets()]);
    setRefreshing(false);
  }

  const warnings = budgets.filter((b) => {
    const spent = spending[b.id] ?? 0;
    // alert_threshold is stored as an integer percent (1-100), matching the
    // web schema, so compare against the spent/limit ratio scaled to 0-1.
    return spent / Number(b.limit_amount) >= Number(b.alert_threshold) / 100;
  });

  const maxCategoryTotal = Math.max(1, ...categoryTotals.map((c) => c.total));

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Dashboard</Text>

      {error && (
        <View style={[styles.card, { backgroundColor: dangerBg, borderColor: danger }]}>
          <Text style={{ color: danger }}>
            Couldn&apos;t load this month&apos;s summary. Pull to refresh.
          </Text>
        </View>
      )}

      <View style={styles.summaryRow}>
        <View
          style={[styles.card, styles.summaryCard, { backgroundColor: card, borderColor: border }]}
        >
          <Text style={[styles.label, { color: muted }]}>Income</Text>
          <Text style={[styles.mediumNumber, { color: "#059669" }]}>
            {currency} {incomeTotal.toFixed(2)}
          </Text>
        </View>
        <View
          style={[styles.card, styles.summaryCard, { backgroundColor: card, borderColor: border }]}
        >
          <Text style={[styles.label, { color: muted }]}>Spending</Text>
          <Text style={styles.mediumNumber}>
            {currency} {monthTotal.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <Text style={[styles.label, { color: muted }]}>Net this month</Text>
        <Text style={[styles.bigNumber, { color: netTotal >= 0 ? "#059669" : danger }]}>
          {netTotal < 0 ? "-" : ""}
          {currency} {Math.abs(netTotal).toFixed(2)}
        </Text>
      </View>

      {warnings.length > 0 && (
        <View style={[styles.card, { backgroundColor: dangerBg, borderColor: danger }]}>
          <Text style={[styles.sectionTitle, { color: danger }]}>Budget warnings</Text>
          {warnings.map((b) => {
            const spent = spending[b.id] ?? 0;
            return (
              <Text key={b.id} style={{ color: danger }}>
                {b.categories?.name ?? "Overall"}: {currency} {spent.toFixed(2)} of {currency}{" "}
                {Number(b.limit_amount).toFixed(2)}
              </Text>
            );
          })}
        </View>
      )}

      <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <Text style={styles.sectionTitle}>By category</Text>
        {!loading && categoryTotals.length === 0 && (
          <Text style={{ color: muted }}>No expenses this month yet.</Text>
        )}
        {categoryTotals.map((c) => (
          <View key={c.categoryId ?? "uncategorized"} style={styles.categoryRow}>
            <View style={styles.categoryHeader}>
              <Text>{c.name}</Text>
              <Text style={{ color: muted }}>
                {currency} {c.total.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.barTrack, { backgroundColor: border }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${(c.total / maxCategoryTotal) * 100}%`,
                    backgroundColor: c.color ?? tint,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  label: {
    fontSize: 13,
  },
  bigNumber: {
    fontSize: 32,
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 14,
  },
  summaryCard: {
    flex: 1,
  },
  mediumNumber: {
    fontSize: 22,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  categoryRow: {
    gap: 4,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
});
