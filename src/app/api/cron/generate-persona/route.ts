import { generatePersonaFromProfile, generateRandomCharacterProfile } from "@/app/(persona)/profile";
import { rootLogger } from "@/lib/logging";
import { generateToken } from "@/lib/utils";
import { prisma } from "@/prisma/prisma";
import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";

const CRON_COUNT = 20;
const CRON_LOCALE = "zh-CN" as const;

function validateCronAuth(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

async function generateOnePersona(
  locale: "zh-CN" | "en-US",
  index: number,
  jobId: string,
  logger: ReturnType<typeof rootLogger.child>,
) {
  const { age, title, tags, ...profile } = generateRandomCharacterProfile();

  const { prompt, name, quote } = await generatePersonaFromProfile(profile, age, title, locale);

  const persona = await prisma.persona.create({
    data: {
      token: generateToken(16),
      name,
      source: "game-theory-seed",
      tags,
      samples: [],
      prompt,
      locale,
      tier: 2,
      extra: {
        characterProfile: profile,
        age,
        title,
        quote,
        role: "consumer",
      },
    },
    select: { id: true, token: true, name: true },
  });

  logger.info({ msg: "Persona created", personaId: persona.id, name: persona.name, index, jobId });
  return persona;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const logger = rootLogger.child({ api: "cron/generate-persona" });

  if (!validateCronAuth(request)) {
    logger.warn({ msg: "Unauthorized cron request to generate-persona" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = generateToken(8);
  logger.info({ msg: "Cron generate-persona queued", count: CRON_COUNT, locale: CRON_LOCALE, jobId });

  after(async () => {
    logger.info({ msg: "Cron generate-persona started", count: CRON_COUNT, locale: CRON_LOCALE, jobId });
    let succeeded = 0;
    let failed = 0;

    await Promise.all(
      Array.from({ length: CRON_COUNT }, async (_, i) => {
        try {
          await generateOnePersona(CRON_LOCALE, i, jobId, logger);
          succeeded++;
        } catch (error) {
          failed++;
          const message = error instanceof Error ? error.message : "Unknown error";
          logger.error({ msg: "Failed to generate persona", index: i, jobId, error: message });
        }
      }),
    );

    logger.info({ msg: "Cron generate-persona completed", jobId, succeeded, failed });
  });

  return NextResponse.json(
    {
      success: true,
      jobId,
      status: "processing",
      count: CRON_COUNT,
      locale: CRON_LOCALE,
      message: `Generating ${CRON_COUNT} personas in background (jobId: ${jobId}).`,
      timestamp: new Date().toISOString(),
    },
    { status: 202 },
  );
}
