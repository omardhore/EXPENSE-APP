import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { successResponse, errorResponse } from "@/lib/api/response";
import {
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subMonths,
  format,
} from "date-fns";

export async function GET(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const period = request.nextUrl.searchParams.get("period") ?? "month";
  const now = new Date();

  let start: Date;
  let end: Date;
  let prevStart: Date;
  let prevEnd: Date;

  switch (period) {
    case "quarter":
      start = startOfQuarter(now);
      end = endOfQuarter(now);
      prevStart = startOfQuarter(subMonths(now, 3));
      prevEnd = endOfQuarter(subMonths(now, 3));
      break;
    case "year":
      start = startOfYear(now);
      end = endOfYear(now);
      prevStart = startOfYear(subMonths(now, 12));
      prevEnd = endOfYear(subMonths(now, 12));
      break;
    default:
      start = startOfMonth(now);
      end = endOfMonth(now);
      prevStart = startOfMonth(subMonths(now, 1));
      prevEnd = endOfMonth(subMonths(now, 1));
  }

  const supabase = await createClient();

  const [currentResult, previousResult, categoryResult] = await Promise.all([
    supabase
      .from("expenses")
      .select("amount")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("date", format(start, "yyyy-MM-dd"))
      .lte("date", format(end, "yyyy-MM-dd")),
    supabase
      .from("expenses")
      .select("amount")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("date", format(prevStart, "yyyy-MM-dd"))
      .lte("date", format(prevEnd, "yyyy-MM-dd")),
    supabase
      .from("expenses")
      .select("amount, categories(name, color)")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("date", format(start, "yyyy-MM-dd"))
      .lte("date", format(end, "yyyy-MM-dd")),
  ]);

  if (currentResult.error || previousResult.error || categoryResult.error) {
    return errorResponse(
      "DATABASE_ERROR",
      "Failed to fetch analytics",
      500,
    );
  }

  const currentTotal = currentResult.data.reduce(
    (sum, e) => sum + Number(e.amount),
    0,
  );
  const previousTotal = previousResult.data.reduce(
    (sum, e) => sum + Number(e.amount),
    0,
  );
  const changePercent =
    previousTotal > 0
      ? ((currentTotal - previousTotal) / previousTotal) * 100
      : 0;

  // Group by category
  const categoryMap = new Map<
    string,
    { name: string; color: string | null; total: number; count: number }
  >();
  for (const expense of categoryResult.data) {
    const cat = expense.categories as { name: string; color: string | null } | null;
    const key = cat?.name ?? "Uncategorized";
    const existing = categoryMap.get(key);
    if (existing) {
      existing.total += Number(expense.amount);
      existing.count += 1;
    } else {
      categoryMap.set(key, {
        name: key,
        color: cat?.color ?? null,
        total: Number(expense.amount),
        count: 1,
      });
    }
  }

  return successResponse({
    period,
    currentTotal,
    previousTotal,
    changePercent: Math.round(changePercent * 100) / 100,
    expenseCount: currentResult.data.length,
    byCategory: Array.from(categoryMap.values()).sort(
      (a, b) => b.total - a.total,
    ),
  });
}
