import { z } from "zod/v3";

// Podcast kind enum - centralized definition
export enum PodcastKind {
  deepDive = "deepDive",
  opinionOriented = "opinionOriented",
  fastInsight = "fastInsight",
  debate = "debate", // May be used in the future
}

// LLM determination schema - includes all kinds except fastInsight (which is determined by analyst.kind)
// fastInsight is excluded because it's determined by analyst.kind, not by LLM
// Using enum values ensures type safety and maintainability
export const podcastKindDeterminationSchema = z.object({
  kind: z.enum([PodcastKind.deepDive, PodcastKind.opinionOriented] as const),
  reason: z.string(),
});

export type PodcastKindDetermination = z.infer<typeof podcastKindDeterminationSchema>;

/**
 * Maps podcast type to host count for audio generation
 * This ensures consistent audio generation based on podcast type, not script content
 */
export function getHostCountForPodcastType(
  podcastKind: PodcastKind | "deepDive" | "opinionOriented" | "fastInsight" | "debate",
): 1 | 2 {
  switch (podcastKind) {
    case PodcastKind.fastInsight:
    case "fastInsight":
    case PodcastKind.opinionOriented:
    case "opinionOriented":
      return 1; // Solo cast
    case PodcastKind.deepDive:
    case "deepDive":
    case PodcastKind.debate:
    case "debate":
      return 2; // Duo cast
    default:
      // Default to solo for unknown types
      return 1;
  }
}
