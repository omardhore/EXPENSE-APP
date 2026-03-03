import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
} from "@/lib/api/response";
import { updateExpenseSchema } from "@/lib/schemas/expense";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const result = updateExpenseSchema.safeParse(body);

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return validationErrorResponse(details);
  }

  const supabase = await createClient();
  const { data, error: dbError } = await supabase
    .from("expenses")
    .update({ ...result.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select("*, categories(name, icon, color)")
    .single();

  if (dbError) {
    if (dbError.code === "PGRST116") {
      return notFoundResponse("Expense");
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

  // Soft delete
  const { error: dbError } = await supabase
    .from("expenses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (dbError) {
    return errorResponse("DATABASE_ERROR", dbError.message, 500);
  }

  return successResponse({ deleted: true });
}
