import type { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { successResponse, errorResponse } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteUserData } from "@/lib/api/deleteUserData";

// Wipes the user's expenses, budgets, and categories, but keeps the
// account itself. For full account + auth removal, see /api/v1/account.
// Callable from the web app (cookie session) and the mobile app (Bearer
// token) — see lib/api/auth.ts.
export async function DELETE(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error) return error;

  const admin = createAdminClient();
  const dbError = await deleteUserData(admin, user.id);
  if (dbError) {
    return errorResponse("DATABASE_ERROR", dbError.message, 500);
  }

  return successResponse({ cleared: true });
}
