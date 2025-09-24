import { createVolcanoClient } from "@/lib/volcano/client";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { detectInputLanguage } from "@/lib/textUtils";
import { AWS_S3_CONFIG } from "@/lib/attachments/s3";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { NextRequest } from "next/server";

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

async function generatePodcastAudioBackground({
  podcastId,
  podcastToken,
  script,
  locale,
}: {
  podcastId: number;
  podcastToken: string;
  script: string;
  locale: string;
}) {
  const logger = rootLogger.child({
    podcastId,
    podcastToken,
    method: "generatePodcastAudioBackground",
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

    // Mark as failed by updating the record (could add error field in future)
    try {
      await prisma.analystPodcast.update({
        where: { id: podcastId },
        data: {
          // For now we just leave generatedAt as null to indicate failure
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

export async function POST(request: NextRequest) {
  try {
    const { podcastToken } = await request.json();

    if (!podcastToken) {
      return Response.json(
        { success: false, error: "Missing podcastToken" },
        { status: 400 }
      );
    }

    return await withAuth(async (user, userType, team) => {
      // Fetch podcast and validate ownership
      const podcast = await prisma.analystPodcast.findUnique({
        where: { token: podcastToken },
        include: {
          analyst: true,
        },
      });

      if (!podcast) {
        return Response.json(
          { success: false, error: "Podcast not found" },
          { status: 404 }
        );
      }

      if (podcast.analyst.userId !== user.id) {
        return Response.json(
          { success: false, error: "Unauthorized" },
          { status: 403 }
        );
      }

      // Check if already generated
      if (podcast.generatedAt && podcast.podcastUrl) {
        return Response.json({
          success: true,
          message: "Audio already generated",
          podcastUrl: podcast.podcastUrl,
        });
      }

      // Check if script exists
      if (!podcast.script || podcast.script.trim().length === 0) {
        return Response.json(
          { success: false, error: "No script available for audio generation" },
          { status: 400 }
        );
      }

      // Detect locale
      const locale =
        podcast.analyst.locale === "zh-CN" || podcast.analyst.locale === "en-US"
          ? podcast.analyst.locale
          : await detectInputLanguage({ text: podcast.script });

      // Start background audio generation
      waitUntil(
        generatePodcastAudioBackground({
          podcastId: podcast.id,
          podcastToken: podcast.token,
          script: podcast.script,
          locale,
        })
      );

      return Response.json({
        success: true,
        message: "Audio generation started",
        podcastToken: podcast.token,
      });

         });

  } catch (error) {
    rootLogger.error("Podcast generation API error", {
      error: error instanceof Error ? error.message : String(error),
    });

    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
} 