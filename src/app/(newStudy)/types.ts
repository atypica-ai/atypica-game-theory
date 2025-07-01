import { z } from "zod";

export const NewStudyBodySchema = z.object({
  message: z.object({
    id: z.string().optional(),
    role: z.enum(["user", "assistant", "system", "data"]),
    content: z.string(),
  }),
  userChatId: z.number(),
});
