import { generateToken } from "@/lib/utils";
import z from "zod/v3";

export const generatePodcastInputSchema = z.object({
  podcastToken: z
    .string()
    .optional()
    .describe(
      "Podcast token used to create records. You don't need to provide this - the system will automatically generate it",
    )
    // 始终生成一个新的 token，并且这个会直接覆盖 message 里面 toolInvocation.args 上的参数
    .transform(() => generateToken()),
});

export type GeneratePodcastToolInput = z.infer<typeof generatePodcastInputSchema>;

export const generatePodcastOutputSchema = z.object({
  podcastToken: z.string().describe("The token identifier for the generated podcast"),
  plainText: z.string(),
});

export type GeneratePodcastResult = z.infer<typeof generatePodcastOutputSchema>;
