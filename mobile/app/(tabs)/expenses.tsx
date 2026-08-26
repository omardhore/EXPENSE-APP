import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Alert, FlatList, Pressable, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { format, parseISO } from "date-fns";
import { Text, View, useThemeColor } from "@/components/Themed";
import { useExpenses, type ExpenseWithCategory } from "@/hooks/useExpenses";
import { useCategories } from "@/hooks/useCategories";
import { useProfile } from "@/hooks/useProfile";

export default function ExpensesScreen() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { categories } = useCategories();
  const { currency } = useProfile();
  const { expenses, loading, refreshing, error, hasMore, refresh, loadMore, deleteExpense } =
    useExpenses({
      category: categoryFilter === "all" ? undefined : categoryFilter,
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
    }, [categoryFilter]),
  );

  function confirmDelete(expense: ExpenseWithCategory) {
    Alert.alert("Delete expense", `Delete "${expense.description}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteExpense(expense.id).catch((e) => Alert.alert("Error", e.message)),
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.filterBar, { borderColor: border }]}>
        <Picker
          selectedValue={categoryFilter}
          onValueChange={setCategoryFilter}
          style={{ flex: 1 }}
        >
          <Picker.Item label="All categories" value="all" />
          {categories.map((c) => (
            <Picker.Item key={c.id} label={c.name} value={c.id} />
          ))}
        </Picker>
      </View>

      <FlatList
        data={expenses}
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
                ? "Couldn't load expenses. Pull to refresh."
                : "No expenses yet. Tap + to add one."}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/expense/${item.id}`)}
            onLongPress={() => confirmDelete(item)}
            style={[styles.row, { backgroundColor: card, borderColor: border }]}
          >
            <View style={styles.rowMain}>
              <Text style={styles.description}>{item.description}</Text>
              <Text style={{ color: muted, fontSize: 12 }}>
                {format(parseISO(item.date), "MMM d, yyyy")}
                {item.categories ? ` · ${item.categories.name}` : ""}
              </Text>
            </View>
            <Text style={styles.amount}>
              {currency} {Number(item.amount).toFixed(2)}
            </Text>
          </Pressable>
        )}
      />

      <Pressable
        onPress={() => router.push("/expense/new")}
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
