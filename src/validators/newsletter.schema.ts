import { z } from "zod";

export const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;
