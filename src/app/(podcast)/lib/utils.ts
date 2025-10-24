import "server-only";

import { s3SignedUrl } from "@/lib/attachments/s3";
import type { AnalystPodcast, AnalystPodcastExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";

// Helper function to convert podcast objectUrl to signed HTTP URL
export async function podcastObjectUrlToHttpUrl(
  podcast: Pick<AnalystPodcast, "id" | "objectUrl" | "extra">,
): Promise<{
  signedObjectUrl: string;
  mimeType: string;
} | null> {
  if (!podcast.objectUrl) {
    return null;
  }

  const { id, objectUrl } = podcast;
  const extra = (podcast.extra || {}) as AnalystPodcastExtra;
  const mimeType = extra.mimeType ?? "audio/mpeg";
  let signedObjectUrl: string;

  if (
    extra.s3SignedUrl &&
    extra.s3SignedUrlExpiresAt &&
    extra.s3SignedUrlExpiresAt > Date.now() + 60 * 60 * 1000
  ) {
    // s3SignedUrl exists and expires in the next hour
    signedObjectUrl = extra.s3SignedUrl;
  } else {
    const signingDate = new Date();
    const expiresIn = 7 * 24 * 3600; // in seconds
    signedObjectUrl = await s3SignedUrl(objectUrl, { signingDate, expiresIn });
    waitUntil(
      new Promise((resolve) => {
        prisma.$executeRaw`
          UPDATE "AnalystPodcast"
          SET "extra" = COALESCE("extra", '{}') || ${JSON.stringify({
            s3SignedUrl: signedObjectUrl,
            s3SignedUrlExpiresAt: signingDate.valueOf() + expiresIn * 1000,
          })}::jsonb,
              "updatedAt" = NOW()
          WHERE "id" = ${id}
        `.finally(() => resolve(null));
      }),
    );
  }

  return { signedObjectUrl, mimeType };
}
