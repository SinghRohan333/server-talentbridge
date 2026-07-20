import { z } from "zod";

export const adminUserQuerySchema = z.object({
  search: z.string().trim().optional(),
  role: z.enum(["seeker", "employer", "admin"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

export const adminJobQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(["active", "closed", "draft", "flagged"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export type AdminUserQueryInput = z.infer<typeof adminUserQuerySchema>;
export type AdminJobQueryInput = z.infer<typeof adminJobQuerySchema>;
