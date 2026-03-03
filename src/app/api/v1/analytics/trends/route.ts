import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { successResponse, errorResponse } from "@/lib/api/response";
import { subMonths, format, startOfMonth, endOfMonth } from "date-fns";

export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const supabase = await createClient();
  const now = new Date();
  const months = [];

  // Get last 6 months of data
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(now, i);
    const start = format(startOfMonth(date), "yyyy-MM-dd");
    const end = format(endOfMonth(date), "yyyy-MM-dd");
    months.push({
      label: format(date, "MMM yyyy"),
      start,
      end,
    });
  }

  const results = await Promise.all(
    months.map(({ start, end }) =>
      supabase
        .from("expenses")
        .select("amount")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .gte("date", start)
        .lte("date", end),
    ),
  );

  const hasError = results.some((r) => r.error);
  if (hasError) {
    return errorResponse("DATABASE_ERROR", "Failed to fetch trends", 500);
  }

  const trends = months.map((month, i) => ({
    month: month.label,
    total: results[i].data!.reduce((sum, e) => sum + Number(e.amount), 0),
    count: results[i].data!.length,
  }));

  return successResponse(trends);
}
