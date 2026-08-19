import { useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { FlatList, Pressable, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View, useThemeColor } from "@/components/Themed";
import { useBudgets } from "@/hooks/useBudgets";
import { useProfile } from "@/hooks/useProfile";

export default function BudgetsScreen() {
  const { budgets, spending, loading, refetch } = useBudgets();
  const { currency } = useProfile();
  const card = useThemeColor({}, "card");
  const border = useThemeColor({}, "border");
  const muted = useThemeColor({}, "muted");
  const tint = useThemeColor({}, "tint");
  const danger = useThemeColor({}, "danger");

  useFocusEffect(
    useCallback(() => {
      refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={budgets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={refetch}
        ListEmptyComponent={
          !loading ? (
            <Text style={{ color: muted, textAlign: "center", marginTop: 40 }}>
              No budgets yet. Tap + to add one.
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          const spent = spending[item.id] ?? 0;
          const limit = Number(item.limit_amount);
          const pct = Math.min(100, (spent / limit) * 100);
          const over = spent > limit;
          return (
            <Pressable
              onPress={() => router.push(`/budget/${item.id}`)}
              style={[styles.card, { backgroundColor: card, borderColor: border }]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.name}>{item.categories?.name ?? "Overall"}</Text>
                <Text style={{ color: muted, fontSize: 12 }}>{item.period}</Text>
              </View>
              <Text style={{ color: over ? danger : muted }}>
                {currency} {spent.toFixed(2)} of {currency} {limit.toFixed(2)}
              </Text>
              <View style={[styles.barTrack, { backgroundColor: border }]}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${pct}%`, backgroundColor: over ? danger : tint },
                  ]}
                />
              </View>
            </Pressable>
          );
        }}
      />

      <Pressable
        onPress={() => router.push("/budget/new")}
        style={[styles.fab, { backgroundColor: tint }]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { padding: 16, gap: 10 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
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
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
});
