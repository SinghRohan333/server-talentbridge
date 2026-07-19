import { z } from "zod";

export const applyToJobSchema = z.object({
  coverLetter: z
    .string()
    .trim()
    .max(2000, "Keep cover letter under 2000 characters")
    .optional(),
});

export type ApplyToJobInput = z.infer<typeof applyToJobSchema>;
