import { z } from "zod/v4";

export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(50, "Category name must be 50 characters or less"),
  icon: z.string().max(50).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color")
    .nullable()
    .optional(),
  is_default: z.boolean().default(false),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
