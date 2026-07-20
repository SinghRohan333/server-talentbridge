import { z } from "zod";

export const chatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(1000, "Keep messages under 1000 characters"),
  conversationId: z.string().trim().optional(),
});
