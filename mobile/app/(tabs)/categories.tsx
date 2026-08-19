import { useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { FlatList, Pressable, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View, useThemeColor } from "@/components/Themed";
import { useCategories } from "@/hooks/useCategories";

export default function CategoriesScreen() {
  const { categories, loading, refetch } = useCategories();
  const card = useThemeColor({}, "card");
  const border = useThemeColor({}, "border");
  const muted = useThemeColor({}, "muted");
  const tint = useThemeColor({}, "tint");

  useFocusEffect(
    useCallback(() => {
      refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={refetch}
        ListEmptyComponent={
          !loading ? (
            <Text style={{ color: muted, textAlign: "center", marginTop: 40 }}>
              No categories yet. Tap + to add one.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/category/${item.id}`)}
            style={[styles.row, { backgroundColor: card, borderColor: border }]}
          >
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: item.color ?? tint },
                ]}
              />
              <Text style={styles.name}>{item.name}</Text>
            </View>
            {item.is_default && (
              <Text style={{ color: muted, fontSize: 12 }}>Default</Text>
            )}
          </Pressable>
        )}
      />

      <Pressable
        onPress={() => router.push("/category/new")}
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  name: {
    fontSize: 15,
    fontWeight: "500",
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
