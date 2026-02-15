// @ts-nocheck

import "../mock-server-only";

import { rootLogger } from "@/lib/logging";
import { AnalystPodcastExtra } from "@/prisma/client";
import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { loadEnvConfig } from "@next/env";
import { parseBuffer } from "music-metadata";

const logger = rootLogger.child({ script: "fix-podcast-metadata" });

interface PodcastMetadata {
  size: number;
  duration?: number;
}

async function getS3Client(objectUrl: string): Promise<{
  client: S3Client;
  bucket: string;
  key: string;
}> {
  // Import after env is loaded
  const { AWS_S3_CONFIG } = await import("@/lib/attachments/s3");

  // Parse objectUrl to get origin and key
  const objectUrlWithoutQuery = objectUrl.split("?")[0];
  const urlObject = new URL(objectUrlWithoutQuery);
  let origin = urlObject.origin;
  if (!origin.endsWith("/")) {
    origin = origin + "/";
  }
  let key = urlObject.pathname;
  if (key.startsWith("/")) {
    key = key.substring(1);
  }

  // Find matching S3 config
  const s3Config = AWS_S3_CONFIG.find((config) => config.origin === origin);
  if (!s3Config) {
    throw new Error(`S3 not configured for origin ${origin}`);
  }

  const client = new S3Client({
    region: s3Config.region,
    credentials: {
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
    },
  });

  return {
    client,
    bucket: s3Config.bucketName,
    key,
  };
}

async function fetchPodcastMetadata(objectUrl: string): Promise<PodcastMetadata> {
  const { client, bucket, key } = await getS3Client(objectUrl);

  // Step 1: Get file size using HeadObjectCommand
  const headCommand = new HeadObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  const headResponse = await client.send(headCommand);
  const size = headResponse.ContentLength || 0;

  // Step 2: Download and parse audio to get duration
  let duration: number | undefined;
  try {
    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const getResponse = await client.send(getCommand);

    if (getResponse.Body) {
      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of getResponse.Body as any) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      // Parse audio metadata
      const metadata = await parseBuffer(buffer, { mimeType: "audio/mpeg" });
      duration = metadata.format.duration; // in seconds
    }
  } catch (error) {
    logger.warn({
      msg: "Failed to parse audio duration",
      objectUrl,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return { size, duration };
}

async function fixMetadataForPodcast(podcastId: number): Promise<{
  success: boolean;
  podcastId: number;
  size?: number;
  duration?: number;
}> {
  // Import after env is loaded
  const { prisma } = await import("@/prisma/prisma");
  const { mergeExtra } = await import("@/prisma/utils");

  const podcast = await prisma.analystPodcast.findUnique({
    where: { id: podcastId },
  });

  if (!podcast?.objectUrl) {
    logger.warn({ msg: "Podcast has no objectUrl", podcastId });
    return { success: false, podcastId };
  }

  const extra = podcast.extra || {};
  const existingMetadata = extra.metadata || {};

  // Skip if both size and duration already exist
  if (existingMetadata.size && existingMetadata.duration) {
    logger.info({ msg: "Metadata already exists, skipping", podcastId });
    return {
      success: true,
      podcastId,
      size: existingMetadata.size,
      duration: existingMetadata.duration,
    };
  }

  try {
    logger.info({ msg: "Fetching metadata from S3", podcastId, objectUrl: podcast.objectUrl });
    const metadata = await fetchPodcastMetadata(podcast.objectUrl);

    // Merge with existing metadata
    await mergeExtra({
      tableName: "AnalystPodcast",
      id: podcastId,
      extra: {
        metadata: {
          ...existingMetadata,
          size: metadata.size,
          ...(metadata.duration ? { duration: metadata.duration } : {}),
        },
      } satisfies Partial<AnalystPodcastExtra>,
    });

    logger.info({
      msg: "Updated metadata",
      podcastId,
      size: metadata.size,
      duration: metadata.duration,
    });

    return {
      success: true,
      podcastId,
      size: metadata.size,
      duration: metadata.duration,
    };
  } catch (error) {
    logger.error({
      msg: "Failed to fetch metadata",
      podcastId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, podcastId };
  }
}

async function main() {
  loadEnvConfig(process.cwd());
  // Import after env is loaded
  const { prisma } = await import("@/prisma/prisma");

  // Find podcasts without complete metadata
  const podcasts = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id
    FROM "AnalystPodcast"
    WHERE "generatedAt" IS NOT NULL
      AND "objectUrl" IS NOT NULL
      AND (
        "extra"::jsonb->'metadata'->>'size' IS NULL
        OR "extra"::jsonb->'metadata'->>'duration' IS NULL
      )
    ORDER BY "createdAt" DESC
  `;

  logger.info({ msg: "Found podcasts needing metadata fix", count: podcasts.length });

  if (podcasts.length === 0) return;

  // Process in batches of 10
  const results = [];
  for (let i = 0; i < podcasts.length; i += 10) {
    const batch = podcasts.slice(i, i + 10);
    logger.info({ msg: `Processing batch ${Math.floor(i / 10) + 1}`, batchSize: batch.length });
    const batchResults = await Promise.all(batch.map((p) => fixMetadataForPodcast(p.id)));
    results.push(...batchResults);
  }

  const successful = results.filter((r) => r.success).length;
  const withDuration = results.filter((r) => r.success && r.duration).length;
  logger.info({
    msg: "Done",
    total: results.length,
    successful,
    withDuration,
    failed: results.length - successful,
  });
}

main()
  .catch((error) => {
    logger.error({ msg: "Script failed", error: error.message, stack: error.stack });
    process.exit(1);
  })
  .finally(() => process.exit());
