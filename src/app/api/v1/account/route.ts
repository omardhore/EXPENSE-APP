import type { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { successResponse, errorResponse } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteUserData } from "@/lib/api/deleteUserData";

// Callable from the web app (cookie session) and the mobile app (Bearer
// token) — see lib/api/auth.ts. Uses the service-role admin client
// throughout, since removing the auth user itself requires it anyway.
export async function DELETE(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error) return error;

  const admin = createAdminClient();
  const dataError = await deleteUserData(admin, user.id);
  if (dataError) {
    return errorResponse("DATABASE_ERROR", dataError.message, 500);
  }

  const { error: profileError } = await admin
    .from("users")
    .delete()
    .eq("id", user.id);
  if (profileError) {
    return errorResponse("DATABASE_ERROR", profileError.message, 500);
  }

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(
    user.id,
  );
  if (authDeleteError) {
    return errorResponse("DATABASE_ERROR", authDeleteError.message, 500);
  }

  return successResponse({ deleted: true });
}
