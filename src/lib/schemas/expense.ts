import { z } from "zod/v4";

export const paymentMethods = ["cash", "credit", "debit", "other"] as const;
export const recurringFrequencies = ["weekly", "monthly", "yearly"] as const;

export const createExpenseSchema = z.object({
  amount: z.number().positive("Amount must be greater than zero"),
  category_id: z.string().uuid().nullable().optional(),
  description: z
    .string()
    .min(1, "Description is required")
    .max(255, "Description must be 255 characters or less"),
  date: z.string().date("Invalid date format"),
  payment_method: z.enum(paymentMethods).default("other"),
  tags: z.array(z.string()).default([]),
  notes: z.string().max(1000).nullable().optional(),
  is_recurring: z.boolean().default(false),
  recurring_frequency: z.enum(recurringFrequencies).nullable().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const expenseQuerySchema = z.object({
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  category: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ExpenseQuery = z.infer<typeof expenseQuerySchema>;
