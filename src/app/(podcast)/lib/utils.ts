import "server-only";

import { s3SignedUrl } from "@/lib/attachments/s3";
import { detectInputLanguage } from "@/lib/textUtils";
import type { Analyst, AnalystPodcast, AnalystPodcastExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";

// Helper function to convert podcast objectUrl to signed HTTP URL
export async function podcastObjectUrlToHttpUrl(podcast: AnalystPodcast): Promise<string | null> {
  if (!podcast.objectUrl) {
    return null;
  }

  const { id, objectUrl } = podcast;
  let extra = (podcast.extra || {}) as AnalystPodcastExtra;
  let url: string;

  if (
    extra.s3SignedUrl &&
    extra.s3SignedUrlExpiresAt &&
    extra.s3SignedUrlExpiresAt > Date.now() + 60 * 60 * 1000
  ) {
    // s3SignedUrl exists and expires in the next hour
    url = extra.s3SignedUrl;
  } else {
    const signingDate = new Date();
    const expiresIn = 7 * 24 * 3600; // in seconds
    url = await s3SignedUrl(objectUrl, { signingDate, expiresIn });
    extra = {
      ...extra,
      s3SignedUrl: url,
      s3SignedUrlExpiresAt: signingDate.valueOf() + expiresIn * 1000,
    };
    waitUntil(
      new Promise((resolve) => {
        prisma.analystPodcast
          .update({ where: { id }, data: { extra } })
          .finally(() => resolve(null));
      }),
    );
  }

  return url;
}

// Script preprocessing for audio generation
export function preprocessScriptForAudio(script: string): string {
  return (
    script
      // Remove speaker labels like 【A】【B】
      .replace(/【[^】]*】/g, "")
      // Remove excessive newlines (keep single \n, remove multiple)
      .replace(/\n{2,}/g, "\n")
      // Trim whitespace from beginning and end
      .trim()
  );
}

// Validation helper for API routes (no auth, just validation)
export async function validatePodcastRequest(
  podcastToken: string,
  userId: number,
): Promise<{
  podcast: AnalystPodcast & { analyst: Analyst };
  locale: string;
}> {
  // Fetch podcast and validate ownership
  const podcast = await prisma.analystPodcast.findUnique({
    where: { token: podcastToken },
    include: {
      analyst: true,
    },
  });

  if (!podcast) {
    throw new Error("Podcast not found");
  }

  if (podcast.analyst.userId !== userId) {
    throw new Error("Unauthorized");
  }

  // Check if script exists
  if (!podcast.script || podcast.script.trim().length === 0) {
    throw new Error("No script available for audio generation");
  }

  // Detect locale
  const locale =
    podcast.analyst.locale === "zh-CN" || podcast.analyst.locale === "en-US"
      ? podcast.analyst.locale
      : await detectInputLanguage({ text: podcast.script });

  return { podcast, locale };
}

// Utility function to chunk array into batches
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
