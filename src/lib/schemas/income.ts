import { z } from "zod";

export const incomeSources = [
  "salary",
  "freelance",
  "investment",
  "gift",
  "refund",
  "other",
] as const;
export const recurringFrequencies = ["weekly", "monthly", "yearly"] as const;

export const createIncomeSchema = z.object({
  amount: z.number().positive("Amount must be greater than zero"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(255, "Description must be 255 characters or less"),
  date: z.string().date("Invalid date format"),
  source: z.enum(incomeSources).default("other"),
  notes: z.string().max(1000).nullable().optional(),
  is_recurring: z.boolean().default(false),
  recurring_frequency: z.enum(recurringFrequencies).nullable().optional(),
});

export const updateIncomeSchema = createIncomeSchema.partial();

export const incomeQuerySchema = z.object({
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  source: z.enum(incomeSources).optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  search: z.string().min(1).max(255).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
export type UpdateIncomeInput = z.infer<typeof updateIncomeSchema>;
export type IncomeQuery = z.infer<typeof incomeQuerySchema>;
