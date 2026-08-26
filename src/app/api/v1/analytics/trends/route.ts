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

  const [expenseResults, incomeResults] = await Promise.all([
    Promise.all(
      months.map(({ start, end }) =>
        supabase
          .from("expenses")
          .select("amount")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .gte("date", start)
          .lte("date", end),
      ),
    ),
    Promise.all(
      months.map(({ start, end }) =>
        supabase
          .from("income")
          .select("amount")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .gte("date", start)
          .lte("date", end),
      ),
    ),
  ]);

  const firstError =
    expenseResults.find((r) => r.error)?.error ??
    incomeResults.find((r) => r.error)?.error;
  if (firstError) {
    console.error("[analytics/trends:GET] database error:", firstError);
    return errorResponse("DATABASE_ERROR", "Failed to fetch trends", 500);
  }

  const sum = (rows: { amount: number }[]) =>
    rows.reduce((acc, r) => acc + Number(r.amount), 0);

  const trends = months.map((month, i) => {
    const total = sum(expenseResults[i].data!);
    const income = sum(incomeResults[i].data!);
    return {
      month: month.label,
      total,
      count: expenseResults[i].data!.length,
      income,
      net: income - total,
    };
  });

  return successResponse(trends);
}
