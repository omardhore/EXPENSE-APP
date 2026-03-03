import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/api/response";
import { createBudgetSchema } from "@/lib/schemas/budget";

export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const supabase = await createClient();
  const { data, error: dbError } = await supabase
    .from("budgets")
    .select("*, categories(name, icon, color)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (dbError) {
    return errorResponse("DATABASE_ERROR", dbError.message, 500);
  }

  return successResponse(data);
}

export async function POST(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const body = await request.json();
  const result = createBudgetSchema.safeParse(body);

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
    .insert({ ...result.data, user_id: user.id })
    .select("*, categories(name, icon, color)")
    .single();

  if (dbError) {
    return errorResponse("DATABASE_ERROR", dbError.message, 500);
  }

  return successResponse(data, 201);
}
