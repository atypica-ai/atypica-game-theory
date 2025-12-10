import z from "zod/v3";

export const generatePodcastInputSchema = z.object({});

export type GeneratePodcastToolInput = z.infer<typeof generatePodcastInputSchema>;

export const generatePodcastOutputSchema = z.object({
  podcastToken: z.string().describe("The token identifier for the generated podcast"),
  plainText: z.string(),
});

export type GeneratePodcastResult = z.infer<typeof generatePodcastOutputSchema>;
