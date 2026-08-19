import { z } from "zod";

export const currencies = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "JPY",
  "INR",
] as const;

export const updateProfileSchema = z.object({
  name: z.string().max(100).default(""),
  currency: z.enum(currencies),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
