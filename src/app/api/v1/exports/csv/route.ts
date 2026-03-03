import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { errorResponse } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser();
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
    return errorResponse("DATABASE_ERROR", dbError.message, 500);
  }

  // Build CSV
  const headers = [
    "Date",
    "Description",
    "Amount",
    "Category",
    "Payment Method",
    "Notes",
    "Tags",
  ];
  type ExpenseRow = {
    date: string;
    description: string;
    amount: number;
    categories: { name: string } | null;
    payment_method: string;
    notes: string | null;
    tags: string[] | null;
  };
  const expenses = (data ?? []) as unknown as ExpenseRow[];
  const rows = expenses.map((e) => [
    e.date,
    `"${e.description.replace(/"/g, '""')}"`,
    e.amount,
    e.categories?.name ?? "",
    e.payment_method,
    `"${(e.notes ?? "").replace(/"/g, '""')}"`,
    `"${(e.tags ?? []).join(", ")}"`,
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="expenses.csv"`,
    },
  });
}
