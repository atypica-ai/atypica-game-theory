"use server";
import { generatePodcastAudio } from "@/app/(podcast)/lib/generation";
import { getHostCountForPodcastType, PodcastKind } from "@/app/(podcast)/types";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import { detectInputLanguage } from "@/lib/textUtils";
import { createUserChat } from "@/lib/userChat/lib";
import { generateToken } from "@/lib/utils";
import { AnalystPodcastExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { Locale } from "next-intl";

/**
 * Generate podcast audio from script input (testing only)
 * Creates a test podcast record and generates audio without script generation
 */
export async function generatePodcastAudioFromScriptAction({
  script,
  locale,
  podcastKind = PodcastKind.opinionOriented,
}: {
  script: string;
  locale?: "zh-CN" | "en-US" | "auto";
  podcastKind?: PodcastKind;
}): Promise<
  ServerActionResult<{
    podcastId: number;
    token: string;
    objectUrl: string;
    mimeType: string;
  }>
> {
  const logger = rootLogger.child({
    method: "generatePodcastAudioFromScriptAction",
  });

  try {
    await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);
  } catch (error) {
    logger.error({
      msg: "Admin auth check failed",
      error: error instanceof Error ? error.message : String(error),
    });
    // checkAdminAuth throws forbidden() which is handled by Next.js
    throw error;
  }

  if (!script || !script.trim()) {
    return {
      success: false,
      message: "Script is required",
      code: "internal_server_error",
    };
  }

  try {
    // Determine locale
    let finalLocale: Locale;
    if (locale === "auto" || !locale) {
      finalLocale = (await detectInputLanguage({ text: script })) as Locale;
    } else {
      finalLocale = locale;
    }

    logger.info({
      msg: "Generating podcast audio from script",
      locale: finalLocale,
      scriptLength: script.length,
      podcastKind,
    });

    // Get or create a test analyst for testing purposes
    // We'll use a system test analyst to satisfy the database constraint
    let testAnalyst = await prisma.analyst.findFirst({
      where: {
        topic: "[TEST] Podcast Audio Test Analyst",
        kind: "testing",
      },
    });

    if (!testAnalyst) {
      // Find any admin user to use as owner
      const adminUser = await prisma.user.findFirst({
        where: {
          adminUser: {
            isNot: null,
          },
        },
      });

      if (!adminUser) {
        return {
          success: false,
          message: "No admin user found to create test analyst",
          code: "internal_server_error",
        };
      }

      // Create a test UserChat for the analyst (required for share page)
      const testUserChat = await createUserChat({
        userId: adminUser.id,
        kind: "study",
        title: "[TEST] Podcast Audio Test Study",
      });

      // Create the test analyst with the UserChat linked
      testAnalyst = await prisma.analyst.create({
        data: {
          userId: adminUser.id,
          studyUserChatId: testUserChat.id,
          topic: "[TEST] Podcast Audio Test Analyst",
          brief: "Test analyst for podcast audio generation testing",
          role: "Test Analyst",
          studySummary: "Test analyst for podcast audio generation testing",
          kind: "testing",
          locale: finalLocale,
        },
      });
    } else if (!testAnalyst.studyUserChatId) {
      // If analyst exists but doesn't have a studyUserChat, create one
      const adminUser = await prisma.user.findUnique({
        where: { id: testAnalyst.userId },
      });

      if (adminUser) {
        const testUserChat = await createUserChat({
          userId: adminUser.id,
          kind: "study",
          title: "[TEST] Podcast Audio Test Study",
        });

        testAnalyst = await prisma.analyst.update({
          where: { id: testAnalyst.id },
          data: { studyUserChatId: testUserChat.id },
        });
      }
    }

    // Create podcast record with the provided script
    const podcastToken = generateToken();
    const podcast = await prisma.analystPodcast
      .create({
        data: {
          analystId: testAnalyst.id,
          token: podcastToken,
          instruction: "[TEST] Script-based audio generation",
          script: script.trim(),
          extra: {
            kindDetermination: {
              kind: podcastKind,
              reason: "Test podcast audio generation",
            },
            processing: {
              startsAt: Date.now(),
              scriptGeneration: true, // Script already provided
              audioGeneration: false,
            },
          } as AnalystPodcastExtra,
        },
      })
      .then(({ extra, ...podcast }) => ({
        ...podcast,
        extra: extra as AnalystPodcastExtra,
      }));

    logger.info({
      msg: "Test podcast record created",
      podcastId: podcast.id,
      token: podcastToken,
    });

    // Determine hostCount based on podcastType
    const hostCount = getHostCountForPodcastType(podcastKind);

    // Generate audio using existing function
    const statReport = async () => {
      // No-op for testing
    };
    const abortSignal = new AbortController().signal;

    const { objectUrl, mimeType } = await generatePodcastAudio({
      podcastId: podcast.id,
      podcastToken: podcast.token,
      script: podcast.script,
      locale: finalLocale,
      hostCount: hostCount,
      abortSignal,
      statReport,
      logger: logger.child({ podcastId: podcast.id }),
    });

    // Update podcast with generated audio
    await prisma.analystPodcast.update({
      where: { id: podcast.id },
      data: { objectUrl, generatedAt: new Date() },
    });

    await mergeExtra({
      tableName: "AnalystPodcast",
      id: podcast.id,
      extra: {
        processing: {
          startsAt:
            typeof podcast.extra.processing === "object" &&
            podcast.extra.processing !== null &&
            "startsAt" in podcast.extra.processing
              ? podcast.extra.processing.startsAt
              : Date.now(),
          scriptGeneration: true,
          audioGeneration: true,
        },
        metadata: {
          mimeType,
        },
      } satisfies Partial<AnalystPodcastExtra>,
    });

    logger.info({
      msg: "Podcast audio generation completed",
      podcastId: podcast.id,
      objectUrl,
    });

    return {
      success: true,
      data: {
        podcastId: podcast.id,
        token: podcast.token,
        objectUrl,
        mimeType,
      },
    };
  } catch (error) {
    logger.error({
      msg: "Failed to generate podcast audio from script",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to generate podcast audio",
      code: "internal_server_error",
    };
  }
}
