import { generatePersonaFromProfile, generateRandomCharacterProfile } from "@/app/(persona)/profile";
import { rootLogger } from "@/lib/logging";
import { generateToken } from "@/lib/utils";
import { prisma } from "@/prisma/prisma";
import type { BaseLogger } from "pino";
import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

function validateInternalAuth(request: NextRequest): boolean {
  return request.headers.get("x-internal-secret") === process.env.INTERNAL_API_SECRET;
}

const bodySchema = z.object({
  count: z.number().int().min(1).max(100).default(1),
  locale: z.enum(["zh-CN", "en-US"]).default("en-US"),
  concurrency: z.number().int().min(1).max(10).default(5),
});

async function runConcurrent<T>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<void>,
): Promise<void> {
  const queue = items.map((item, i) => ({ item, i }));
  async function worker() {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) break;
      await fn(next.item, next.i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

async function generateOnePersona(
  locale: "zh-CN" | "en-US",
  index: number,
  jobId: string,
  logger: BaseLogger,
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

export async function POST(request: NextRequest) {
  const logger = rootLogger.child({ api: "generate-persona" });

  if (!validateInternalAuth(request)) {
    logger.warn({ msg: "Unauthorized access attempt to generate-persona API" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { count, locale, concurrency } = parsed.data;
  const jobId = generateToken(8);

  logger.info({ msg: "Persona generation job queued", count, locale, concurrency, jobId });

  after(async () => {
    logger.info({ msg: "Persona generation job started", count, locale, concurrency, jobId });
    let succeeded = 0;
    let failed = 0;

    await runConcurrent(Array.from({ length: count }, (_, i) => i), concurrency, async (_, i) => {
      try {
        await generateOnePersona(locale, i, jobId, logger);
        succeeded++;
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : "Unknown error";
        logger.error({ msg: "Failed to generate persona", index: i, jobId, error: message });
      }
    });

    logger.info({ msg: "Persona generation job completed", jobId, succeeded, failed });
  });

  return NextResponse.json(
    {
      success: true,
      jobId,
      status: "processing",
      count,
      locale,
      concurrency,
      message: `Generating ${count} persona(s) in background (concurrency=${concurrency}). jobId: ${jobId}`,
      timestamp: new Date().toISOString(),
    },
    { status: 202 },
  );
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
