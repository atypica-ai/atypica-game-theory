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
  sessionId: z.number(),
  sessionToken: z.string(),
});

export const CollectSessionBodySchema = z.object({
  message: z.object({
    id: z.string(),
    role: z.enum(["user", "assistant", "system", "data"]),
    content: z.string(),
    parts: z.custom<NonNullable<Message["parts"]>>().optional(),
  }),
  id: z.number().optional(), // User chat ID (may be null for first message)
  sessionId: z.number(),
  sessionToken: z.string(),
});
