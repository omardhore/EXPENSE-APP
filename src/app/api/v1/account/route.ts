import type { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { successResponse, errorResponse } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteUserData } from "@/lib/api/deleteUserData";

// Callable from the web app (cookie session) and the mobile app (Bearer
// token) — see lib/api/auth.ts. Uses the service-role admin client
// throughout, since removing the auth user itself requires it anyway.
export async function DELETE(request: NextRequest) {
  // TODO(security): rate-limit + require recent re-auth. This handler runs
  // through the service-role admin client and permanently deletes the auth
  // user, all rows, and receipt files. Deferred: needs infra (rate limiter +
  // step-up auth) not available in this environment.
  const { user, error } = await getAuthenticatedUser(request);
  if (error) return error;

  const admin = createAdminClient();
  const dataError = await deleteUserData(admin, user.id);
  if (dataError) {
    console.error("[account:DELETE] data deletion error:", dataError);
    return errorResponse("DATABASE_ERROR", "A database error occurred", 500);
  }

  const { error: profileError } = await admin
    .from("users")
    .delete()
    .eq("id", user.id);
  if (profileError) {
    console.error("[account:DELETE] profile deletion error:", profileError);
    return errorResponse("DATABASE_ERROR", "A database error occurred", 500);
  }

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(
    user.id,
  );
  if (authDeleteError) {
    console.error("[account:DELETE] auth deletion error:", authDeleteError);
    return errorResponse("DATABASE_ERROR", "A database error occurred", 500);
  }

  return successResponse({ deleted: true });
}
