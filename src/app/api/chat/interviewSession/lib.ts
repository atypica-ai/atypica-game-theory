import { Message } from "ai";
import { z } from "zod";

export const ClarifySessionBodySchema = z.object({
  message: z.object({
    id: z.string(),
    role: z.enum(["user", "assistant", "system", "data"]),
    content: z.string(),
    parts: z.custom<NonNullable<Message["parts"]>>().optional(),
  }),
  sessionToken: z.string(),
});

export const CollectSessionBodySchema = z.object({
  message: z.object({
    id: z.string(),
    role: z.enum(["user", "assistant", "system", "data"]),
    content: z.string(),
    parts: z.custom<NonNullable<Message["parts"]>>().optional(),
  }),
  sessionToken: z.string(),
});
