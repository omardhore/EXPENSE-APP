import { z } from "zod";

export const budgetPeriods = ["monthly", "quarterly", "yearly"] as const;

export const createBudgetSchema = z.object({
  category_id: z.string().uuid().nullable().optional(),
  period: z.enum(budgetPeriods),
  limit_amount: z.number().positive("Budget limit must be greater than zero"),
  alert_threshold: z.number().int().min(1).max(100).default(80),
  start_date: z.string().date("Invalid date format"),
  end_date: z.string().date().nullable().optional(),
});

export const updateBudgetSchema = createBudgetSchema.partial();

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
