import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/api/response";
import {
  createExpenseSchema,
  expenseQuerySchema,
} from "@/lib/schemas/expense";

export async function GET(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const queryResult = expenseQuerySchema.safeParse(searchParams);

  if (!queryResult.success) {
    const details = queryResult.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return validationErrorResponse(details);
  }

  const { startDate, endDate, category, page, limit } = queryResult.data;
  const offset = (page - 1) * limit;

  const supabase = await createClient();

  let query = supabase
    .from("expenses")
    .select("*, categories(name, icon, color)", { count: "exact" })
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (startDate) {
    query = query.gte("date", startDate);
  }
  if (endDate) {
    query = query.lte("date", endDate);
  }
  if (category) {
    query = query.eq("category_id", category);
  }

  const { data, error: dbError, count } = await query;

  if (dbError) {
    return errorResponse("DATABASE_ERROR", dbError.message, 500);
  }

  const total = count ?? 0;
  const expenses = data as unknown as Array<{ id: string }>;
  return successResponse(data, 200, {
    cursor: expenses && expenses.length > 0 ? expenses[expenses.length - 1].id : null,
    hasMore: offset + limit < total,
    total,
  });
}

export async function POST(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const body = await request.json();
  const result = createExpenseSchema.safeParse(body);

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
    .insert({ ...result.data, user_id: user.id })
    .select("*, categories(name, icon, color)")
    .single();

  if (dbError) {
    return errorResponse("DATABASE_ERROR", dbError.message, 500);
  }

  return successResponse(data, 201);
}
