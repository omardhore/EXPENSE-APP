// Mirrors the web app's validation rules (src/lib/schemas/*.ts) so the
// mobile client validates inputs identically before writing to Supabase.
// The mobile app talks to Supabase directly (RLS is the enforcement
// boundary), so this client-side parity is what keeps mobile-created rows
// consistent with what the web API would accept. Keep these rules in sync
// with src/lib/schemas until the two apps share a schema package.
import { z } from "zod";

export const paymentMethods = ["evc", "bank", "card", "other"] as const;
export const incomeSources = [
  "salary",
  "freelance",
  "investment",
  "gift",
  "refund",
  "other",
] as const;
export const recurringFrequencies = ["weekly", "monthly", "yearly"] as const;
export const budgetPeriods = ["monthly", "quarterly", "yearly"] as const;
export const currencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "INR"] as const;

// --- Expense (mirrors src/lib/schemas/expense.ts) ---
export const createExpenseSchema = z.object({
  amount: z.number().positive("Amount must be greater than zero"),
  category_id: z.string().uuid().nullable().optional(),
  description: z
    .string()
    .min(1, "Description is required")
    .max(255, "Description must be 255 characters or less"),
  date: z.string().date("Invalid date format"),
  payment_method: z.enum(paymentMethods).default("evc"),
  tags: z.array(z.string()).default([]),
  notes: z.string().max(1000, "Notes must be 1000 characters or less").nullable().optional(),
  is_recurring: z.boolean().default(false),
  recurring_frequency: z.enum(recurringFrequencies).nullable().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

// --- Income (mirrors src/lib/schemas/income.ts) ---
export const createIncomeSchema = z.object({
  amount: z.number().positive("Amount must be greater than zero"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(255, "Description must be 255 characters or less"),
  date: z.string().date("Invalid date format"),
  source: z.enum(incomeSources).default("other"),
  notes: z.string().max(1000, "Notes must be 1000 characters or less").nullable().optional(),
  is_recurring: z.boolean().default(false),
  recurring_frequency: z.enum(recurringFrequencies).nullable().optional(),
});

export const updateIncomeSchema = createIncomeSchema.partial();

// --- Budget (mirrors src/lib/schemas/budget.ts) ---
export const createBudgetSchema = z.object({
  category_id: z.string().uuid().nullable().optional(),
  period: z.enum(budgetPeriods),
  limit_amount: z.number().positive("Budget limit must be greater than zero"),
  alert_threshold: z
    .number()
    .int("Alert threshold must be a whole number")
    .min(1, "Alert threshold must be between 1 and 100")
    .max(100, "Alert threshold must be between 1 and 100")
    .default(80),
  start_date: z.string().date("Invalid date format"),
  end_date: z.string().date().nullable().optional(),
});

export const updateBudgetSchema = createBudgetSchema.partial();

// --- Category (mirrors src/lib/schemas/category.ts) ---
export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(50, "Category name must be 50 characters or less"),
  icon: z.string().max(50, "Icon must be 50 characters or less").nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color")
    .nullable()
    .optional(),
  is_default: z.boolean().default(false),
});

export const updateCategorySchema = createCategorySchema.partial();

// --- Profile (mirrors src/lib/schemas/profile.ts) ---
export const updateProfileSchema = z.object({
  name: z.string().max(100, "Name must be 100 characters or less").default(""),
  currency: z.enum(currencies),
});

// Flattens a ZodError into a single human-readable message for Alert dialogs.
export function firstZodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}
