import { Message } from "ai";
import { z } from "zod";

export const ClarifySessionBodySchema = z.object({
  message: z.object({
    id: z.string(),
    role: z.enum(["user", "assistant", "system", "data"]),
    content: z.string(),
    parts: z.custom<NonNullable<Message["parts"]>>().optional(),
  }),
  id: z.number(), // User chat ID
  sessionToken: z.string(),
});

export const CollectSessionBodySchema = z.object({
  message: z.object({
    id: z.string(),
    role: z.enum(["user", "assistant", "system", "data"]),
    content: z.string(),
    parts: z.custom<NonNullable<Message["parts"]>>().optional(),
  }),
  id: z.number().nullable(), // User chat ID (may be null for first message)
  sessionToken: z.string(),
});
