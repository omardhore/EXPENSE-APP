import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Alert, FlatList, Pressable, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { format, parseISO } from "date-fns";
import { Text, View, useThemeColor } from "@/components/Themed";
import { useIncome } from "@/hooks/useIncome";
import { useProfile } from "@/hooks/useProfile";
import type { Income, IncomeSource } from "@/lib/database.types";

const sources: IncomeSource[] = ["salary", "freelance", "investment", "gift", "refund", "other"];

export default function IncomeScreen() {
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const { currency } = useProfile();
  const { income, loading, refreshing, error, hasMore, refresh, loadMore, deleteIncome } =
    useIncome({
      source: sourceFilter === "all" ? undefined : sourceFilter,
    });
  const card = useThemeColor({}, "card");
  const border = useThemeColor({}, "border");
  const muted = useThemeColor({}, "muted");
  const tint = useThemeColor({}, "tint");
  const danger = useThemeColor({}, "danger");

  useFocusEffect(
    useCallback(() => {
      refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sourceFilter]),
  );

  function confirmDelete(entry: Income) {
    Alert.alert("Delete income", `Delete "${entry.description}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteIncome(entry.id).catch((e) => Alert.alert("Error", e.message)),
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.filterBar, { borderColor: border }]}>
        <Picker selectedValue={sourceFilter} onValueChange={setSourceFilter} style={{ flex: 1 }}>
          <Picker.Item label="All sources" value="all" />
          {sources.map((s) => (
            <Picker.Item key={s} label={s} value={s} />
          ))}
        </Picker>
      </View>

      <FlatList
        data={income}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={refresh}
        onEndReached={hasMore ? loadMore : undefined}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          !loading ? (
            <Text
              style={{
                color: error ? danger : muted,
                textAlign: "center",
                marginTop: 40,
              }}
            >
              {error
                ? "Couldn't load income. Pull to refresh."
                : "No income yet. Tap + to add one."}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/income/${item.id}`)}
            onLongPress={() => confirmDelete(item)}
            style={[styles.row, { backgroundColor: card, borderColor: border }]}
          >
            <View style={styles.rowMain}>
              <Text style={styles.description}>{item.description}</Text>
              <Text style={{ color: muted, fontSize: 12 }}>
                {format(parseISO(item.date), "MMM d, yyyy")} · {item.source}
              </Text>
            </View>
            <Text style={[styles.amount, { color: "#059669" }]}>
              +{currency} {Number(item.amount).toFixed(2)}
            </Text>
          </Pressable>
        )}
      />

      <Pressable
        onPress={() => router.push("/income/new")}
        style={[styles.fab, { backgroundColor: tint }]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  filterBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowMain: {
    gap: 2,
    flexShrink: 1,
  },
  description: {
    fontSize: 15,
    fontWeight: "500",
  },
  amount: {
    fontSize: 15,
    fontWeight: "600",
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
