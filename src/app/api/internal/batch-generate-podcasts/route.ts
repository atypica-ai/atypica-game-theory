import { evaluateAndGeneratePodcast } from "@/app/(podcast)/lib/evaluate";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { NextRequest } from "next/server";

// Internal auth validation helper
function validateInternalAuth(request: NextRequest): boolean {
  const internalSecret = request.headers.get("x-internal-secret");
  return internalSecret === process.env.INTERNAL_API_SECRET;
}

export async function POST(request: NextRequest) {
  return Response.json(
    { success: false, message: "Batch generate podcasts is stopped" },
    { status: 400 },
  );

  const logger = rootLogger.child({ api: "batch-generate-podcasts" });

  // Validate internal authentication
  if (!validateInternalAuth(request)) {
    logger.warn("Unauthorized access to batch podcast generate API");
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Parse optional parameters
  const body = await request.json().catch(() => ({}));

  const limit = typeof body.limit === "number" ? body.limit : 20;
  const scoreThreshold = typeof body.scoreThreshold === "number" ? body.scoreThreshold : 0.625;
  const dryRun = body.dryRun === true;

  if (limit < 1 || limit > 100) {
    return Response.json(
      { success: false, error: "limit must be between 1 and 100" },
      { status: 400 },
    );
  }

  if (scoreThreshold < 0 || scoreThreshold > 1) {
    return Response.json(
      { success: false, error: "scoreThreshold must be between 0 and 1" },
      { status: 400 },
    );
  }

  logger.info({
    msg: "batch evaluate-and-generate podcasts request received",
    limit,
    scoreThreshold,
    dryRun,
  });

  const analysts = await prisma.$queryRaw<Array<{ id: number; extra: unknown }>>`
    SELECT a.id, a.extra
    FROM "Analyst" AS a
    WHERE NOT (a.extra ? 'podcastEvaluation')
      AND EXISTS (
        SELECT 1
        FROM "AnalystReport" r
        WHERE r."analystId" = a.id
      )
    ORDER BY a.id DESC
    LIMIT ${limit}
  `;

  const promises: Promise<void>[] = [];
  for (let i = 0; i < analysts.length; i++) {
    const analyst = analysts[i];
    if (!dryRun) {
      await prisma.$executeRaw`
        UPDATE "Analyst"
        SET "extra" = jsonb_set(COALESCE("extra", '{}'::jsonb), '{podcastEvaluation}', '{}'::jsonb, true)
        WHERE "id" = ${analyst.id}
      `;
    }
    promises.push(
      (async (delaySeconds, analystId) => {
        await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
        await evaluateAndGeneratePodcast({ analystId, scoreThreshold, dryRun });
      })(i * 1, analyst.id),
    );
  }

  waitUntil(Promise.all(promises));

  logger.info({
    msg: "batch evaluate-and-generate podcasts jobs scheduled",
    found: analysts.length,
    scoreThreshold,
    dryRun,
  });

  return Response.json({
    success: true,
    message: `Found ${analysts.length} analysts with reports. evaluateAndGenerate podcasting...`,
    params: {
      limit,
      scoreThreshold,
      dryRun,
    },
  });
}
