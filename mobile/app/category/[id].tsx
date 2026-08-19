import { router } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { CategoryForm } from "@/components/CategoryForm";
import { useCategories } from "@/hooks/useCategories";

export default function EditCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { categories, updateCategory, deleteCategory } = useCategories();
  const category = categories.find((c) => c.id === id);

  if (!category) return null;

  return (
    <CategoryForm
      initial={category}
      submitLabel="Save Changes"
      onSubmit={async (input) => {
        const updated = await updateCategory(id, input);
        router.back();
        return updated;
      }}
      onDelete={async () => {
        await deleteCategory(id);
        router.back();
      }}
    />
  );
}
