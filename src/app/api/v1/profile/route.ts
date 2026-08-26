import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/api/response";
import { updateProfileSchema } from "@/lib/schemas/profile";

export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const supabase = await createClient();
  const { data, error: dbError } = await supabase
    .from("users")
    .select("currency")
    .eq("id", user.id)
    .single();

  if (dbError) {
    console.error("[profile:GET] database error:", dbError);
    return errorResponse("DATABASE_ERROR", "A database error occurred", 500);
  }

  return successResponse({
    email: user.email,
    name: user.user_metadata?.name ?? "",
    currency: data.currency,
  });
}

export async function PUT(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error) return error;

  const body = await request.json();
  const result = updateProfileSchema.safeParse(body);

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return validationErrorResponse(details);
  }

  const { name, currency } = result.data;
  const supabase = await createClient();

  const { error: authUpdateError } = await supabase.auth.updateUser({
    data: { name },
  });
  if (authUpdateError) {
    console.error("[profile:PUT] auth update error:", authUpdateError);
    return errorResponse("AUTH_ERROR", "An error occurred", 500);
  }

  const { error: dbError } = await supabase
    .from("users")
    .update({ currency, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (dbError) {
    console.error("[profile:PUT] database error:", dbError);
    return errorResponse("DATABASE_ERROR", "A database error occurred", 500);
  }

  return successResponse({ name, currency });
}
