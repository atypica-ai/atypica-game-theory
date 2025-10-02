import { generateToken } from "@/lib/utils";
import z from "zod/v3";

export const scoutSocialTrendsInputSchema = z.object({
  scoutUserChatToken: z
    .string()
    .optional()
    .describe(
      "Unique identifier for the search task used to create the task. You don't need to provide this - the system will automatically generate it.",
    )
    .transform(() => generateToken()),
  // 始终生成一个新的 token，并且这个会直接覆盖 message 里面 toolInvocation.args 上的参数
  description: z
    .string()
    .describe(
      "Tell your detailed Research objective to this research agent. Use descriptive phrases like 'Help me find users who...', 'Research people interested in...', '帮我寻找...', or similar research requests.",
    ),
});

export const scoutSocialTrendsOutputSchema = z.object({
  stats: z.record(z.string(), z.number()).optional().describe("Platform usage statistics"),
  summary: z.string(),
  plainText: z.string(),
});

export type ScoutSocialTrendsResult = z.infer<typeof scoutSocialTrendsOutputSchema>;
