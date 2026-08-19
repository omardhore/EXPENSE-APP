import { getAuthenticatedUser } from "@/lib/api/auth";
import { successResponse, errorResponse } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE() {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const supabase = await createClient();

  // Delete in FK-safe order: rows that reference categories first.
  const { error: expensesError } = await supabase
    .from("expenses")
    .delete()
    .eq("user_id", user.id);
  if (expensesError) {
    return errorResponse("DATABASE_ERROR", expensesError.message, 500);
  }

  const { error: budgetsError } = await supabase
    .from("budgets")
    .delete()
    .eq("user_id", user.id);
  if (budgetsError) {
    return errorResponse("DATABASE_ERROR", budgetsError.message, 500);
  }

  const { error: categoriesError } = await supabase
    .from("categories")
    .delete()
    .eq("user_id", user.id);
  if (categoriesError) {
    return errorResponse("DATABASE_ERROR", categoriesError.message, 500);
  }

  const { data: files } = await supabase.storage
    .from("receipts")
    .list(user.id);
  if (files && files.length > 0) {
    await supabase.storage
      .from("receipts")
      .remove(files.map((f) => `${user.id}/${f.name}`));
  }

  const { error: profileError } = await supabase
    .from("users")
    .delete()
    .eq("id", user.id);
  if (profileError) {
    return errorResponse("DATABASE_ERROR", profileError.message, 500);
  }

  const admin = createAdminClient();
  const { error: authDeleteError } = await admin.auth.admin.deleteUser(
    user.id,
  );
  if (authDeleteError) {
    return errorResponse("DATABASE_ERROR", authDeleteError.message, 500);
  }

  return successResponse({ deleted: true });
}
