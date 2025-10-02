import { z } from "zod/v3";

export const CONTINUE_ASSISTANT_STEPS = "[CONTINUE ASSISTANT STEPS]";

export const clientMessagePayloadSchema = z.object({
  message: z.object({
    id: z.string().optional(),
    role: z.enum(["user", "assistant", "system", "data"]),
    content: z.string(),
    parts: z.array(z.any()).optional(),
  }),
  userChatToken: z.string(),
});

export type ClientMessagePayload = z.infer<typeof clientMessagePayloadSchema>;
