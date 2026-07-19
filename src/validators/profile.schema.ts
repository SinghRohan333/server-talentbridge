import { z } from "zod";

const experienceSchema = z.object({
  title: z.string().trim().min(1),
  company: z.string().trim().min(1),
  startDate: z.string().trim().min(1),
  endDate: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
  description: z
    .string()
    .trim()
    .optional()
    .transform((v) => v ?? ""),
});

const educationSchema = z.object({
  degree: z.string().trim().min(1),
  institution: z.string().trim().min(1),
  year: z.coerce.number().int().min(1900).max(2100),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: z.string().trim().optional(),
  location: z.string().trim().optional(),
  bio: z.string().trim().max(500).optional(),
  skills: z.array(z.string().trim().min(1)).optional(),
  experience: z.array(experienceSchema).optional(),
  education: z.array(educationSchema).optional(),
  preferredJobTypes: z.array(z.string()).optional(),
  preferredLocations: z.array(z.string()).optional(),
  preferredCategories: z.array(z.string()).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
