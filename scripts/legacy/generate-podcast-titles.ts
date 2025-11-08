import "./mock-server-only";

import { rootLogger } from "@/lib/logging";
import { AnalystPodcastExtra } from "@/prisma/client";
import { loadEnvConfig } from "@next/env";
import { Locale } from "next-intl";

const logger = rootLogger.child({ script: "generate-podcast-titles" });

async function generateTitleForPodcast(podcastId: number) {
  // import after env is loaded，因为上面 import 是没顺序的，只能在函数里 import
  const { generatePodcastMetadataTitle } = await import("@/app/(podcast)/lib/generation");
  const { detectInputLanguage } = await import("@/lib/textUtils");
  const { prisma } = await import("@/prisma/prisma");
  const { mergeExtra } = await import("@/prisma/utils");
  const podcast = await prisma.analystPodcast.findUnique({
    where: { id: podcastId },
  });

  if (!podcast?.script) return { success: false, podcastId };

  const locale = (await detectInputLanguage({ text: podcast.script })) as Locale;
  const title = await generatePodcastMetadataTitle({
    script: podcast.script,
    locale,
    abortSignal: new AbortController().signal,
    statReport: async () => {},
    logger: logger.child({ podcastId }),
  });

  await mergeExtra({
    tableName: "AnalystPodcast",
    id: podcastId,
    extra: {
      metadata: {
        ...((podcast.extra as AnalystPodcastExtra)?.metadata || {}),
        title,
      },
    } satisfies Partial<AnalystPodcastExtra>,
  });

  logger.info({ msg: "Generated", podcastId, title });
  return { success: true, podcastId, title };
}

async function main() {
  loadEnvConfig(process.cwd());
  // import after env is loaded
  const { prisma } = await import("@/prisma/prisma");

  // Find podcasts without titles
  const podcasts = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id
    FROM "AnalystPodcast"
    WHERE "generatedAt" IS NOT NULL
      AND "script" IS NOT NULL
      AND (
        "extra"::jsonb->'metadata'->>'title' IS NULL
        OR "extra"::jsonb->'metadata'->>'title' = ''
      )
    ORDER BY "createdAt" DESC
  `;

  logger.info({ msg: "Found podcasts", count: podcasts.length });

  if (podcasts.length === 0) return;

  // Process in batches of 10
  const results = [];
  for (let i = 0; i < podcasts.length; i += 10) {
    const batch = podcasts.slice(i, i + 10);
    const batchResults = await Promise.all(batch.map((p) => generateTitleForPodcast(p.id)));
    results.push(...batchResults);
  }

  const successful = results.filter((r) => r.success).length;
  logger.info({ msg: "Done", total: results.length, successful });
}

main()
  .catch((error) => {
    logger.error({ msg: "Failed", error: error.message });
    process.exit(1);
  })
  .finally(process.exit);
