"use server";

import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { generatePodcastAudio } from "@/app/(podcast)/lib/generation";
import { rootLogger } from "@/lib/logging";
import { generateToken } from "@/lib/utils";
import { AnalystPodcastExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { StatReporter } from "@/ai/tools/types";

export async function testGeneratePodcastAudioAction({
  script,
  locale,
}: {
  script: string;
  locale: string;
}): Promise<{
  success: boolean;
  podcastToken?: string;
  error?: string;
}> {
  // Check admin authorization
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  if (!script || script.trim().length === 0) {
    return { success: false, error: "Script cannot be empty" };
  }

  if (!locale || locale.trim().length === 0) {
    return { success: false, error: "Locale must be specified" };
  }

  try {
    const logger = rootLogger.child({
      method: "testGeneratePodcastAudioAction",
      locale,
    });

    // Generate a unique podcast token
    const podcastToken = generateToken();

    // Create a podcast record for testing
    const podcast = await prisma.analystPodcast.create({
      data: {
        // For testing, we create a fake analyst if needed, or use a test analyst
        // For now, we'll use analystId 0 which will be a test record
        analystId: 8, // Placeholder - this is just for testing the audio generation
        token: podcastToken,
        instruction: "Admin test podcast audio generation",
        script: script,
        extra: {
          isAdminTest: true,
          testGeneratedAt: new Date().toISOString(),
        } as AnalystPodcastExtra,
      },
    });

    logger.info({
      msg: "Starting admin podcast audio test",
      podcastId: podcast.id,
      podcastToken,
    });

    // Mock stat reporter since this is a test
    const statReport: StatReporter = async (dimension, value, extra) => {
      logger.info({
        msg: "[ADMIN TEST] statReport",
        dimension,
        value,
        extra,
      });
    };

    // Use abort signal with a timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 5 * 60 * 1000); // 5 minute timeout

    try {
      // Call the exact generatePodcastAudio function
      const { objectUrl, mimeType } = await generatePodcastAudio({
        podcastId: podcast.id,
        podcastToken,
        script,
        locale,
        abortSignal: abortController.signal,
        statReport,
        logger,
      });

      logger.info({
        msg: "Admin podcast audio test completed",
        podcastToken,
        objectUrl: "[REDACTED]",
        mimeType,
      });

      await prisma.analystPodcast.update({
        where: { id: podcast.id },
        data: { objectUrl, generatedAt: new Date() },
      });
      await prisma.$executeRaw`
        UPDATE "AnalystPodcast"
        SET "extra" = COALESCE("extra", '{}') || ${JSON.stringify({
          processing: false,
          mimeType,
        })}::jsonb,
            "updatedAt" = NOW()
        WHERE "id" = ${podcast.id}
      `;
      
      return {
        success: true,
        podcastToken,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    rootLogger.error({
      msg: "Admin podcast audio test failed",
      error: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

