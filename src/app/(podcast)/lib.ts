import "server-only";

import { createVolcanoClient } from "@/lib/volcano/client";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { detectInputLanguage } from "@/lib/textUtils";
import { generateToken } from "@/lib/utils";
import { AWS_S3_CONFIG } from "@/lib/attachments/s3";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Analyst, AnalystPodcast } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { Logger } from "pino";

// Import AI tools and prompts from the new structure
import { generatePodcastScript } from "./tools";

// Types
export interface PodcastGenerationParams {
  analystId: number;
  instruction?: string;
  systemPrompt?: string;
}

export interface PodcastAudioGenerationParams {
  podcastId: number;
  podcastToken: string;
  script: string;
  locale: string;
}

export interface PodcastCreationParams {
  analystId: number;
  instruction: string;
  token?: string;
}

// Core data fetching functions
export async function fetchPodcastsForAnalyst(analystId: number): Promise<
  ServerActionResult<
    (Pick<
      AnalystPodcast,
      "id" | "token" | "analystId" | "script" | "podcastUrl" | "generatedAt" | "createdAt" | "updatedAt"
    > & { analyst: Analyst })[]
  >
> {
  return withAuth(async (user) => {
    const analyst = await prisma.analyst.findUnique({
      where: { id: analystId },
    });
    if (analyst?.userId !== user.id) {
      return {
        success: false,
        code: "forbidden",
        message: "You are not authorized to access this resource.",
      };
    }
    const podcasts = await prisma.analystPodcast.findMany({
      where: {
        analystId: analyst.id,
      },
      select: {
        id: true,
        token: true,
        analystId: true,
        analyst: true,
        script: true,
        podcastUrl: true,
        generatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return {
      success: true,
      data: podcasts,
    };
  });
}

// Core podcast record creation
export async function createPodcastRecord(params: PodcastCreationParams): Promise<AnalystPodcast> {
  const { analystId, instruction, token = generateToken() } = params;
  
  return await prisma.analystPodcast.create({
    data: {
      analystId,
      instruction,
      token,
      script: "",
    },
  });
}

// S3 upload helper (moved from API route)
async function syncToS3MultipleRegions({
  fileBody,
  mimeType,
  key,
}: {
  fileBody: Buffer;
  mimeType: string;
  key: string;
}) {
  for (const s3Config of AWS_S3_CONFIG) {
    const s3Client = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
    });
    const s3Bucket = s3Config.bucketName;
    const putObjectCommand = new PutObjectCommand({
      Bucket: s3Bucket,
      Key: key,
      Body: fileBody,
      ContentType: mimeType,
      ACL: "public-read",
      CacheControl: "public, max-age=31536000, immutable",
    });
    await s3Client.send(putObjectCommand);
  }
}

// Core podcast script generation logic
export async function backgroundGeneratePodcastScript(params: PodcastGenerationParams): Promise<void> {
  return withAuth(async (user) => {
    const { analystId, instruction = "", systemPrompt } = params;
    
    const analyst = await prisma.analyst.findUnique({
      where: { id: analystId },
      include: {
        interviews: {
          select: {
            conclusion: true,
          },
        },
      },
    });
    
    if (!analyst || analyst.userId !== user.id) {
      throw new Error("Analyst not found or unauthorized");
    }

    const podcastToken = generateToken();
    const podcast = await createPodcastRecord({
      analystId,
      instruction,
      token: podcastToken,
    });

    const abortController = new AbortController();
    const abortSignal = abortController.signal;

    const podcastLog = rootLogger.child({
      analystId,
      podcastToken,
      method: "backgroundGeneratePodcastScript",
    });
    
    const statReport = async (dimension: string, value: number, extra?: any) => {
      podcastLog.info(`statReport: ${dimension}=${value} ${JSON.stringify(extra)}`);
    };
    
    const locale =
      analyst.locale === "zh-CN" || analyst.locale === "en-US"
        ? analyst.locale
        : await detectInputLanguage({ text: analyst.brief });

    // Background wait implementation (copied from original actions.ts)
    const backgroundWait = (promise: Promise<any>, logger: Logger) => {
      waitUntil(
        new Promise(async (resolve, reject) => {
          let stop = false;
          const start = Date.now();
          const tick = () => {
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - start) / 1000);
            if (elapsedSeconds > 1200) {
              // 20 mins
              logger.warn("timeout");
              stop = true;
              reject(new Error("podcast generation timeout"));
            }
            if (stop) {
              logger.info("stopped");
            } else {
              logger.info(`ongoing, ${elapsedSeconds} seconds`);
              setTimeout(() => tick(), 5000);
            }
          };
          tick();

          promise
            .then(() => {
              stop = true;
              resolve(null);
            })
            .catch((error) => {
              stop = true;
              reject(error);
            });
        }),
      );
    };

    backgroundWait(
      (async () => {
        await generatePodcastScript({
          analyst,
          podcast,
          instruction,
          locale,
          abortSignal,
          statReport,
          logger: podcastLog,
          systemPrompt,
        });
      })(),
      podcastLog,
    );
  });
}

// Core podcast audio generation logic
export async function backgroundGeneratePodcastAudio(params: PodcastAudioGenerationParams): Promise<void> {
  const { podcastId, podcastToken, script, locale } = params;
  
  const logger = rootLogger.child({
    podcastId,
    podcastToken,
    method: "backgroundGeneratePodcastAudio",
  });

  try {
    logger.info("Starting background podcast audio generation");

    // Create Volcano TTS client
    const volcanoClient = createVolcanoClient(logger);

    // Generate audio
    const result = await volcanoClient.generatePodcastAudio({
      script,
      podcastToken,
      locale,
      logger,
    });

    if (!result.audioUrl) {
      throw new Error("No audio URL returned from Volcano TTS");
    }

    logger.info("Audio generated successfully, downloading from Volcano");

    // Download audio from Volcano URL with size limit
    const audioResponse = await fetch(result.audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.statusText}`);
    }

    // Check content length if available
    const contentLength = audioResponse.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      throw new Error(`Audio file too large: ${contentLength} bytes (max 10MB)`);
    }

    // Stream download with size checking
    const maxSize = 10 * 1024 * 1024; // 10MB
    let downloadedSize = 0;
    const chunks: Uint8Array[] = [];

    const reader = audioResponse.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get audio response reader");
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        downloadedSize += value.length;
        if (downloadedSize > maxSize) {
          throw new Error(`Audio file too large: ${downloadedSize} bytes (max 10MB)`);
        }

        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    // Combine chunks into single buffer
    const audioBuffer = new Uint8Array(downloadedSize);
    let offset = 0;
    for (const chunk of chunks) {
      audioBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    logger.info("Audio downloaded, uploading to S3", { size: audioBuffer.byteLength });

    // Upload to S3
    const s3Key = `atypica/podcasts/${podcastToken}.mp3`;
    await syncToS3MultipleRegions({
      fileBody: Buffer.from(audioBuffer),
      mimeType: "audio/mpeg",
      key: s3Key,
    });

    // Get the appropriate S3 config for final URL
    const s3Region = getDeployRegion() === "mainland" ? "cn-north-1" : "us-east-1";
    const s3Config = AWS_S3_CONFIG.find((item) => item.region === s3Region);
    if (!s3Config) {
      throw new Error(`No S3 config found for region ${s3Region}`);
    }

    const finalUrl = `${s3Config.origin}${s3Key}`;

    // Update database with final URL
    await prisma.analystPodcast.update({
      where: { id: podcastId },
      data: {
        podcastUrl: finalUrl,
        generatedAt: new Date(),
      },
    });

    logger.info("Podcast audio generation completed successfully", {
      finalUrl: "[REDACTED]",
      duration: result.duration,
    });

  } catch (error) {
    logger.error("Podcast audio generation failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    // Mark as failed by updating the record
    try {
      await prisma.analystPodcast.update({
        where: { id: podcastId },
        data: {
          extra: {
            error: error instanceof Error ? error.message : String(error),
            failedAt: new Date().toISOString(),
          }
        },
      });
    } catch (dbError) {
      logger.error("Failed to update podcast record with error", { dbError });
    }

    throw error;
  }
}

// Validation and auth helper for API routes
export async function validatePodcastRequest(podcastToken: string, userId: number): Promise<{
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