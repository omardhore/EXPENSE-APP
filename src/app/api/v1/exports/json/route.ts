import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { errorResponse } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser(request);
  if (error) return error;

  const startDate = request.nextUrl.searchParams.get("startDate");
  const endDate = request.nextUrl.searchParams.get("endDate");

  const supabase = await createClient();
  let query = supabase
    .from("expenses")
    .select("*, categories(name)")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("date", { ascending: false });

  if (startDate) query = query.gte("date", startDate);
  if (endDate) query = query.lte("date", endDate);

  const { data, error: dbError } = await query;

  if (dbError) {
    console.error("[exports/json:GET] database error:", dbError);
    return errorResponse("DATABASE_ERROR", "A database error occurred", 500);
  }

  // Build JSON
  return NextResponse.json(
    { success: true, data },
    {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="expenses.json"`,
      },
    },
  );
}
