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
} from "date-fns";

function getPeriodRange(period: string) {
  const now = new Date();

  // Use the current period that contains "now" based on budget's start alignment
  switch (period) {
    case "monthly":
      return {
        from: startOfMonth(now).toISOString().split("T")[0],
        to: endOfMonth(now).toISOString().split("T")[0],
      };
    case "quarterly":
      return {
        from: startOfQuarter(now).toISOString().split("T")[0],
        to: endOfQuarter(now).toISOString().split("T")[0],
      };
    case "yearly":
      return {
        from: startOfYear(now).toISOString().split("T")[0],
        to: endOfYear(now).toISOString().split("T")[0],
      };
    default:
      return {
        from: startOfMonth(now).toISOString().split("T")[0],
        to: endOfMonth(now).toISOString().split("T")[0],
      };
  }
}

export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const supabase = await createClient();

  // Fetch all budgets for user
  const { data: budgets, error: budgetError } = await supabase
    .from("budgets")
    .select("id, category_id, period, start_date")
    .eq("user_id", user.id);

  if (budgetError) {
    return errorResponse("DATABASE_ERROR", budgetError.message, 500);
  }

  // Calculate spending for each budget
  const spending: Record<string, number> = {};

  for (const budget of budgets ?? []) {
    const { from, to } = getPeriodRange(budget.period);

    let query = supabase
      .from("expenses")
      .select("amount")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("date", from)
      .lte("date", to);

    if (budget.category_id) {
      query = query.eq("category_id", budget.category_id);
    }

    const { data: expenses } = await query;

    spending[budget.id] = (expenses ?? []).reduce(
      (sum, e) => sum + Number(e.amount),
      0,
    );
  }

  return successResponse(spending);
}
