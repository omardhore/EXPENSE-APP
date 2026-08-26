import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/api/response";
import { createIncomeSchema, incomeQuerySchema } from "@/lib/schemas/income";

export async function GET(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error) return error;

  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const queryResult = incomeQuerySchema.safeParse(searchParams);

  if (!queryResult.success) {
    const details = queryResult.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return validationErrorResponse(details);
  }

  const {
    startDate,
    endDate,
    source,
    minAmount,
    maxAmount,
    search,
    page,
    limit,
  } = queryResult.data;
  const offset = (page - 1) * limit;

  const supabase = await createClient();

  let query = supabase
    .from("income")
    .select("*", { count: "exact" })
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
  if (source) {
    query = query.eq("source", source);
  }
  if (minAmount !== undefined) {
    query = query.gte("amount", minAmount);
  }
  if (maxAmount !== undefined) {
    query = query.lte("amount", maxAmount);
  }
  if (search) {
    // PostgREST's `.or()` filter string treats , . ( ) as structural, so
    // the value must be double-quoted (per PostgREST's syntax) with any
    // embedded double quotes escaped.
    const quoted = search.replace(/"/g, '\\"');
    query = query.or(
      `description.ilike."%${quoted}%",notes.ilike."%${quoted}%"`,
    );
  }

  const { data, error: dbError, count } = await query;

  if (dbError) {
    console.error("[income:GET] database error:", dbError);
    return errorResponse("DATABASE_ERROR", "A database error occurred", 500);
  }

  const total = count ?? 0;
  const rows = data as unknown as Array<{ id: string }>;
  return successResponse(data, 200, {
    cursor: rows && rows.length > 0 ? rows[rows.length - 1].id : null,
    hasMore: offset + limit < total,
    total,
  });
}

export async function POST(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error) return error;

  const body = await request.json();
  const result = createIncomeSchema.safeParse(body);

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return validationErrorResponse(details);
  }

  const supabase = await createClient();
  const { data, error: dbError } = await supabase
    .from("income")
    .insert({ ...result.data, user_id: user.id })
    .select("*")
    .single();

  if (dbError) {
    console.error("[income:POST] database error:", dbError);
    return errorResponse("DATABASE_ERROR", "A database error occurred", 500);
  }

  return successResponse(data, 201);
}
