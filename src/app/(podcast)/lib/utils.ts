import "server-only";

import { s3SignedUrl } from "@/lib/attachments/s3";
import { generateToken } from "@/lib/utils";
import type { AnalystPodcast, AnalystPodcastExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";

// Helper function to convert podcast objectUrl to signed HTTP URL
export async function podcastObjectUrlToHttpUrl(
  podcast: Pick<AnalystPodcast, "id" | "objectUrl" | "extra">,
): Promise<string | null> {
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

// Core podcast record creation
export async function createPodcastRecord(
  analystId: number,
  instruction: string,
  token: string = generateToken(),
): Promise<Omit<AnalystPodcast, "extra"> & { extra: AnalystPodcastExtra }> {
  const { extra, ...podcast } = await prisma.analystPodcast.create({
    data: {
      analystId,
      instruction,
      token,
      script: "",
    },
  });
  return {
    ...podcast,
    extra: (extra || {}) as AnalystPodcastExtra,
  };
}
