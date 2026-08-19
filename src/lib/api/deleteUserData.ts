import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

// Deletes a user's expenses, budgets, categories, and receipt files.
// FK-safe order: rows that reference categories are removed first.
export async function deleteUserData(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { error: expensesError } = await supabase
    .from("expenses")
    .delete()
    .eq("user_id", userId);
  if (expensesError) return expensesError;

  const { error: budgetsError } = await supabase
    .from("budgets")
    .delete()
    .eq("user_id", userId);
  if (budgetsError) return budgetsError;

  const { error: categoriesError } = await supabase
    .from("categories")
    .delete()
    .eq("user_id", userId);
  if (categoriesError) return categoriesError;

  const { data: files } = await supabase.storage
    .from("receipts")
    .list(userId);
  if (files && files.length > 0) {
    await supabase.storage
      .from("receipts")
      .remove(files.map((f) => `${userId}/${f.name}`));
  }

  return null;
}
