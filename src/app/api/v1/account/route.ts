import { getAuthenticatedUser } from "@/lib/api/auth";
import { successResponse, errorResponse } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteUserData } from "@/lib/api/deleteUserData";

export async function DELETE() {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const supabase = await createClient();
  const dataError = await deleteUserData(supabase, user.id);
  if (dataError) {
    return errorResponse("DATABASE_ERROR", dataError.message, 500);
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
