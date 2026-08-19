import { getAuthenticatedUser } from "@/lib/api/auth";
import { successResponse, errorResponse } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { deleteUserData } from "@/lib/api/deleteUserData";

// Wipes the user's expenses, budgets, and categories, but keeps the
// account itself. For full account + auth removal, see /api/v1/account.
export async function DELETE() {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const supabase = await createClient();
  const dbError = await deleteUserData(supabase, user.id);
  if (dbError) {
    return errorResponse("DATABASE_ERROR", dbError.message, 500);
  }

  return successResponse({ cleared: true });
}
