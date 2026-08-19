import { router } from "expo-router";
import { CategoryForm } from "@/components/CategoryForm";
import { useCategories } from "@/hooks/useCategories";

export default function NewCategoryScreen() {
  const { createCategory } = useCategories();

  return (
    <CategoryForm
      submitLabel="Add Category"
      onSubmit={async (input) => {
        const category = await createCategory(input);
        router.back();
        return category;
      }}
    />
  );
}
