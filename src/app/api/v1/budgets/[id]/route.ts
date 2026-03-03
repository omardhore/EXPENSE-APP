import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
} from "@/lib/api/response";
import { updateBudgetSchema } from "@/lib/schemas/budget";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const result = updateBudgetSchema.safeParse(body);

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return validationErrorResponse(details);
  }

  const supabase = await createClient();
  const { data, error: dbError } = await supabase
    .from("budgets")
    .update(result.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*, categories(name, icon, color)")
    .single();

  if (dbError) {
    if (dbError.code === "PGRST116") {
      return notFoundResponse("Budget");
    }
    return errorResponse("DATABASE_ERROR", dbError.message, 500);
  }

  return successResponse(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const { id } = await params;
  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("budgets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (dbError) {
    return errorResponse("DATABASE_ERROR", dbError.message, 500);
  }

  return successResponse({ deleted: true });
}
